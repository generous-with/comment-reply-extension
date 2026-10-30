importScripts('ai-core.js','doubao-prompt.js','doubao-worker.js');
// Keep the API key out of content scripts and B站 page scope.
const ready=chrome.storage.local.setAccessLevel({accessLevel:'TRUSTED_CONTEXTS'});
chrome.action.onClicked.addListener(()=>chrome.runtime.openOptionsPage());
const pending=new Set();
chrome.runtime.onMessage.addListener((m,sender,respond)=>{
  const settings=sender.id===chrome.runtime.id && sender.url===chrome.runtime.getURL('settings.html');
  const page=sender.tab && (sender.url?.startsWith('https://message.bilibili.com/')||sender.url?.startsWith('https://mp.toutiao.com/profile_v4/')||sender.url?.startsWith('https://creator.douyin.com/creator-micro/'));
  if(!settings&&!page) return;
  (async()=>{
    await ready;
    const {aiConfig}=await chrome.storage.local.get('aiConfig');
    if(m.type==='status'&&page) return {ok:true,configured:aiConfig?.provider==='doubao'||!!aiConfig?.baseUrl,enabled:aiConfig?.enabled!==false};
    if(m.type==='settings'&&page){await chrome.runtime.openOptionsPage();return {ok:true};}
    if(m.type!=='generate' && !(m.type==='test'&&settings)) throw Error('不支持的操作');
    if(!aiConfig) throw Error('请先点击扩展图标选择豆包网页版或配置 API');
    if(!settings && !aiConfig.enabled) throw Error('自动填写已关闭');
    if(aiConfig.provider==='doubao')return {ok:true,text:await generateWithDoubao(aiConfig,m.type==='test'?{comment:'请问这个功能如何配置？'}:m.item,sender.tab?.id)};
    const c=ReplyAI.validate(aiConfig);
    const origin=new URL(ReplyAI.endpoint(c.baseUrl)).origin+'/*';
    if(!await chrome.permissions.contains({origins:[origin]})) throw Error('尚未授权访问 API，请重新保存设置');
    const key=settings?'test':sender.tab.id;
    if(pending.has(key)) throw Error('该页面已有回复正在生成，请稍候');
    pending.add(key);
    try{return {ok:true,text:await ReplyAI.generate(c,m.type==='test'?{comment:'请问这个功能如何配置？'}:m.item)};}
    finally{pending.delete(key);}
  })().then(respond,e=>respond({ok:false,error:e.name==='TimeoutError'?'模型响应超时，请稍后重试':(e.message.startsWith('豆包')||e.message.startsWith('API ')||e.message.startsWith('请')||e.message.startsWith('尚未')||e.message.startsWith('自动')||e.message.startsWith('该页面')||e.message.startsWith('回复')||e.message.startsWith('模型')?e.message:'请求未完成，请检查配置和网络')}));
  return true;
});
