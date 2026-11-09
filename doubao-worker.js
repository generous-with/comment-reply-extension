// Worker helper: one owned tab and one job globally, never a random existing user's tab.
let doubaoBusy=false;
async function generateWithDoubao(c,item,sourceTab,job){
 if(doubaoBusy)throw Error('豆包正在处理另一条评论，请完成后再点回复');
 doubaoBusy=true;
 try{
  const url=new URL(c.doubaoUrl?.trim()||'https://www.doubao.com/chat/');
  if(url.origin!=='https://www.doubao.com'||!/^\/chat\/(?:\d+)?$/.test(url.pathname))throw Error('请填写 www.doubao.com/chat/ 的会话地址');
  const token=crypto.randomUUID().replaceAll('-','');const prompt=DoubaoPrompt.build(ReplyAI,c,item,token,job);
  const {doubaoBinding}=await chrome.storage.local.get('doubaoBinding');let tab;
  if(doubaoBinding?.configured===url.href){try{const t=await chrome.tabs.get(doubaoBinding.tabId);if(t.url===doubaoBinding.url)tab=t;}catch(e){}}
  if(!tab){tab=await chrome.tabs.create({url:doubaoBinding?.configured===url.href?doubaoBinding.url:url.href,active:true});await chrome.storage.local.set({doubaoBinding:{configured:url.href,tabId:tab.id,url:tab.url||url.href}});}
  else await chrome.tabs.update(tab.id,{active:true});
  const deadline=Date.now()+30000;let connected=false,lastInject=0;
  const version=chrome.runtime.getManifest().version;
  while(Date.now()<deadline){
   try{const pong=await chrome.tabs.sendMessage(tab.id,{type:'doubaoPing:'+version});connected=pong?.ok&&pong.version===version;if(connected)break;}catch(e){}
   if(Date.now()-lastInject>1500){lastInject=Date.now();try{await chrome.scripting.executeScript({target:{tabId:tab.id},func:()=>{globalThis.__commentDoubaoBridgeVersion=null;}});await chrome.scripting.executeScript({target:{tabId:tab.id},files:['doubao-answer.js','doubao-content.js']});}catch(e){}}
   await new Promise(r=>setTimeout(r,250));
  }
  if(!connected)throw Error('豆包扩展连接失败，请登录豆包并刷新页面');
  // API activity keeps the MV3 worker alive while a page streams its answer.
  const keepAlive=setInterval(()=>chrome.tabs.get(tab.id).catch(()=>{}),15000);
  try{
   const result=await chrome.tabs.sendMessage(tab.id,{type:'doubaoRun:'+version,token,prompt,maxChars:job?.maxChars??c.maxChars});
   if(!result?.ok)throw Error(result?.error||'豆包连接中断，请检查会话后重试');
   if(result.url?.startsWith('https://www.doubao.com/chat/'))await chrome.storage.local.set({doubaoBinding:{configured:url.href,tabId:tab.id,url:result.url}});
   if(sourceTab){const active=await chrome.tabs.query({active:true,currentWindow:true});if(active[0]?.id===tab.id)await chrome.tabs.update(sourceTab,{active:true}).catch(()=>{});}
   return result.text;
  }finally{clearInterval(keepAlive);}
 }finally{doubaoBusy=false;}
}
