(()=>{
 const version=chrome.runtime.getManifest().version;
 if(globalThis.__commentDoubaoBridgeVersion===version)return;globalThis.__commentDoubaoBridgeVersion=version;let busy=false;
 function stage(text){let panel=document.getElementById('comment-doubao-status');if(!panel){panel=document.createElement('div');panel.id='comment-doubao-status';panel.setAttribute('role','status');panel.style.cssText='position:fixed;bottom:18px;left:18px;z-index:2147483647;max-width:460px;padding:12px 16px;background:#edf7fa;border:1px solid #86afbc;border-radius:8px;color:#204b5c;font:14px/1.6 system-ui;white-space:pre-wrap';document.documentElement.append(panel);}panel.textContent='评论助手 v'+version+'\n'+text;}
 stage('豆包桥接已连接，等待评论任务');
 const visible=e=>e&&e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden';
 const wait=(check,ms,timeout='豆包页面等待超时，请确认登录和会话状态')=>new Promise((resolve,reject)=>{const start=Date.now();const t=setInterval(()=>{try{const result=check();if(result){clearInterval(t);resolve(result);}else if(Date.now()-start>ms){clearInterval(t);reject(Error(timeout));}}catch(e){clearInterval(t);reject(e);}},250);});
 chrome.runtime.onMessage.addListener((m,sender,respond)=>{
  if(sender.id!==chrome.runtime.id)return;
  if(m.type==='doubaoPing:'+version){respond({ok:true,version});return;}
  if(m.type!=='doubaoRun:'+version)return;
  if(busy){respond({ok:false,error:'豆包会话正在处理另一条评论'});return;}
  busy=true;
  (async()=>{
   if(!/^[a-f0-9]{32}$/.test(m.token)||typeof m.prompt!=='string')throw Error('豆包任务格式错误');
   stage('已收到评论任务，正在查找输入框（请确认豆包已登录）');
   const editor=await wait(()=>[...document.querySelectorAll('textarea[data-testid="chat_input_input"],.ProseMirror[contenteditable="true"]')].filter(visible).find(e=>!e.disabled),20000).catch(()=>{throw Error('豆包未找到可编辑输入框，请确认已登录并展开聊天输入区');});
   const value=()=>editor.tagName==='TEXTAREA'?editor.value:editor.textContent;
   if(value().trim())throw Error('豆包输入框已有草稿，请先保留或清空再重试');
   if([...document.querySelectorAll('[data-testid="chat_input_local_break_button"]')].some(visible))throw Error('豆包正在生成其他内容，请结束后重试');
   editor.focus();
   stage('已找到输入框，正在填写提示词');
   if(editor.tagName==='TEXTAREA'){Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(editor,m.prompt);editor.dispatchEvent(new Event('input',{bubbles:true}));}
   else {if(!document.execCommand('insertText',false,m.prompt))throw Error('豆包编辑器无法插入，请保持豆包页在前台');}
   if(value().replace(/\s/g,'')!==m.prompt.replace(/\s/g,''))throw Error('豆包提示词填写不完整，未发送');
   stage('提示词已填写，等待发送按钮可用');
   const send=await wait(()=>[...document.querySelectorAll('[data-testid="chat_input_send_button"]')].find(e=>visible(e)&&!e.disabled&&e.getAttribute('aria-disabled')!=='true'),5000).catch(()=>{throw Error('豆包发送按钮不可用，提示词已保留，请检查页面');});
   if(!editor.isConnected||value().replace(/\s/g,'')!==m.prompt.replace(/\s/g,''))throw Error('豆包草稿已变化，未发送');
   send.click();
   stage('已点击发送，正在确认页面是否接收');
   await wait(()=>!value().trim()||[...document.querySelectorAll('[data-testid="chat_input_local_break_button"]')].some(visible),8000).catch(()=>{throw Error('豆包未确认发送，未重复点击；请检查提示词是否仍在输入框中');});
   stage('豆包页面已接收输入，等待本次完整回答（最长约150秒）');
   let last='',stable=0;
   return await wait(()=>{
    if(!editor.isConnected&& !location.pathname.startsWith('/chat/'))throw Error('豆包页面已离开会话');
    const stop=[...document.querySelectorAll('[data-testid="chat_input_local_break_button"]')].some(visible);
    // The prompt never contains the complete nonce markers. Ignore hidden elements and the composer.
    const candidates=[...document.querySelectorAll('p,div,span')].filter(e=>e.textContent.includes(m.token)&&visible(e)&&!e.closest('.ProseMirror,[data-testid="chat_input"]')).map(e=>e.innerText||'').sort((a,b)=>a.length-b.length);
    const text=candidates.map(s=>DoubaoAnswer.extract(s,m.token)).find(Boolean);
    if(!text||/<think|<analysis/i.test(text)){last='';return false;}
    if(text!==last){last=text;stable=Date.now();return false;}
    // A stable, nonce-matched end marker is stronger evidence than a stale stop button.
    if(Date.now()-stable<(stop?2500:1250))return false;
    if(text.length>m.maxChars)throw Error('豆包回复超过设置的'+m.maxChars+'字，未取回；请调整长度后重试');
    stage('已取回完整回答，正在返回原页面');return {ok:true,text,url:location.href};
   },150000,'豆包等待超时：未找到本次完整回答标记。请检查回答末尾是否有结束标记，或手动复制豆包答案。');
  })().then(respond,e=>{stage('已停止：'+e.message);respond({ok:false,error:e.message});}).finally(()=>{busy=false;});
  return true;
 });
})();
