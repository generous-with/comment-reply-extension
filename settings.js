const $=id=>document.getElementById(id);
function mode(){const web=$('provider').value==='doubao';for(const id of ['baseUrl','model','apiKey']){$(id).disabled=web;$(id).closest('label').hidden=web;}$('doubaoUrl').closest('label').hidden=!web;$('baseUrl').required=$('model').required=!web;$('form').querySelector('button[type="submit"]').textContent=web?'保存豆包设置':'保存并授权 API 域名';}
$('provider').onchange=mode;
$('resetPrompt').onclick=()=>{$('replyPrompt').value=ReplyAI.defaults.replyPrompt;$('status').textContent='已恢复默认提示词，保存后生效。';};
(async()=>{const {aiConfig}=await chrome.storage.local.get('aiConfig');const c={...ReplyAI.defaults,...aiConfig};for(const k of ['baseUrl','model','apiKey','context','styleSamples','maxChars'])$(k).value=c[k];$('replyPrompt').value=c.replyPrompt?.trim()||ReplyAI.defaults.replyPrompt;$('enabled').checked=c.enabled;$('provider').value=aiConfig?(aiConfig.provider||'api'):'doubao';$('doubaoUrl').value=c.doubaoUrl??'';mode();})();
$('form').onsubmit=async e=>{
  e.preventDefault();
  try{
    const c={provider:$('provider').value,doubaoUrl:$('doubaoUrl').value.trim(),baseUrl:$('baseUrl').value.trim(),model:$('model').value.trim(),apiKey:$('apiKey').value.trim(),context:$('context').value,styleSamples:$('styleSamples').value.trim(),replyPrompt:$('replyPrompt').value.trim()||ReplyAI.defaults.replyPrompt,maxChars:Number($('maxChars').value),enabled:$('enabled').checked};
    if(c.replyPrompt.length>12000)throw Error('回复提示词最多 12000 字');
    if(c.styleSamples.length>2000)throw Error('我的表达样本最多 2000 字');
    if(c.provider==='doubao'){
      const url=new URL(c.doubaoUrl||'https://www.doubao.com/chat/');if(url.origin!=='https://www.doubao.com'||!/^\/chat\/(?:\d+)?$/.test(url.pathname))throw Error('请填写豆包会话网址');
      if(c.maxChars<50||c.maxChars>1000||!Number.isInteger(c.maxChars))throw Error('回复长度应为50–1000字');
      await chrome.storage.local.set({aiConfig:c});$('status').textContent='已保存豆包网页版模式，请确认豆包已登录，再刷新评论页。';return;
    }
    ReplyAI.validate(c);
    const origin=new URL(ReplyAI.endpoint(c.baseUrl)).origin+'/*';
    if(!await chrome.permissions.request({origins:[origin]}))throw Error('API 域名授权被取消，设置未保存');
    await chrome.storage.local.set({aiConfig:c});$('status').textContent='已保存。刷新对应站点的评论页后，点击评论的“回复”即可生成。';
  }catch(e){$('status').textContent=e.message;}
};
$('test').onclick=async()=>{const b=$('test');b.disabled=true;$('status').textContent='正在测试已保存的设置…';try{const r=await chrome.runtime.sendMessage({type:'test'});$('status').textContent=r.ok?'连接成功。测试回复：'+r.text:r.error;}catch(e){$('status').textContent='连接失败，请检查设置。';}finally{b.disabled=false;}};
