importScripts('ai-core.js','doubao-prompt.js','doubao-worker.js','zhihu-answer.js');
// Keep the API key out of content scripts and B站 page scope.
const ready=chrome.storage.local.setAccessLevel({accessLevel:'TRUSTED_CONTEXTS'});
chrome.action.onClicked.addListener(()=>chrome.runtime.openOptionsPage());
const pending=new Set();
chrome.runtime.onMessage.addListener((m,sender,respond)=>{
  const settings=sender.id===chrome.runtime.id && sender.url===chrome.runtime.getURL('settings.html');
  const page=sender.tab && (sender.url?.startsWith('https://message.bilibili.com/')||sender.url?.startsWith('https://mp.toutiao.com/profile_v4/')||sender.url?.startsWith('https://creator.douyin.com/creator-micro/'));
  const zhihuId=sender.id===chrome.runtime.id&&sender.tab&&sender.url?.startsWith('https://www.zhihu.com/')?
    ZhihuAnswer.questionId(new URL(sender.url).pathname):'';
  if(!settings&&!page&&!zhihuId) return;
  (async()=>{
    await ready;
    const {aiConfig}=await chrome.storage.local.get('aiConfig');
    if(m.type==='status'&&page) return {ok:true,configured:aiConfig?.provider==='doubao'||!!aiConfig?.baseUrl,enabled:aiConfig?.enabled!==false};
    if(m.type==='settings'&&(page||zhihuId)){await chrome.runtime.openOptionsPage();return {ok:true};}
    const answer=m.type==='generateZhihu'&&!!zhihuId&&m.item?.questionId===zhihuId;
    if(!answer&&!(m.type==='generate'&&page)&&!(m.type==='test'&&settings)) throw Error('请从对应页面发起生成');
    if(!aiConfig) throw Error('请先点击扩展图标选择豆包网页版或配置 API');
    if(!settings && !aiConfig.enabled) throw Error('自动填写已关闭');
    const item=m.type==='test'?{comment:'请问这个功能如何配置？'}:m.item;
    const job=answer?{messages:ZhihuAnswer.messages(aiConfig,item),maxChars:ZhihuAnswer.maxChars}:undefined;
    const result=text=>{
      if(!answer)return {ok:true,text};
      try{return {ok:true,draft:ZhihuAnswer.parse(text)};}
      catch(e){
        if(!(e instanceof ZhihuAnswer.FormatError))throw e;
        const source=aiConfig.provider==='doubao'?'豆包':'模型 API';
        const rawDraft=typeof text==='string'&&text.length<=ZhihuAnswer.maxChars?text.trim():'';
        return {ok:false,error:source+'已返回内容，但未能识别「回答正文」。'+(rawDraft?'请在下方查看原文。':'请重新生成。'),rawDraft};
      }
    };
    if(aiConfig.provider==='doubao')return result(await generateWithDoubao(aiConfig,item,sender.tab?.id,job));
    const c=ReplyAI.validate(aiConfig);
    const origin=new URL(ReplyAI.endpoint(c.baseUrl)).origin+'/*';
    if(!await chrome.permissions.contains({origins:[origin]})) throw Error('尚未授权访问 API，请重新保存设置');
    const key=settings?'test':sender.tab.id;
    if(pending.has(key)) throw Error('该页面已有回复正在生成，请稍候');
    pending.add(key);
    try{return result(await ReplyAI.generate(c,item,undefined,job));}
    finally{pending.delete(key);}
  })().then(respond,e=>respond({ok:false,error:e.name==='TimeoutError'?'模型响应超时，请稍后重试':(e.message.startsWith('豆包')||e.message.startsWith('API ')||e.message.startsWith('请')||e.message.startsWith('尚未')||e.message.startsWith('自动')||e.message.startsWith('该页面')||e.message.startsWith('回复')||e.message.startsWith('模型')?e.message:'请求未完成，请检查配置和网络')}));
  return true;
});
