(()=>{
  if(globalThis.__toutiaoDraftHelper)return;globalThis.__toutiaoDraftHelper=true;
  // Selectors from public comment-v2.bb6477c4cb56d385624f.js, manage 1.0.0.575.
  let sequence=0;const statuses=new WeakMap();
  const active=()=>/^\/profile_v4\/manage\/comment(?:\/|$)/.test(location.pathname);
  const own=(row,selector)=>[...row.querySelectorAll(selector)].filter(n=>n.closest('.comment-item')===row);
  function snapshot(row){
    const comments=own(row,'.comment-item-content');
    if(comments.length!==1)return null;
    const title=own(row,'.comment-item-header-extra-title')[0];
    const workTitle=(title?.getAttribute('title')||title?.textContent||'').trim();
    const clone=comments[0].cloneNode(true);clone.querySelectorAll('.byte-tag,.up-down-icon,.end-span').forEach(n=>n.remove());
    const comment=clone.textContent.trim();
    const author=(own(row,'.comment-item-title')[0]?.textContent||'').trim();
    return {platform:'今日头条',comment,workTitle,titleTruncated:/…|\.{3}/.test(workTitle),author};
  }
  function signature(item){return item&&JSON.stringify([item.comment,item.workTitle,item.author]);}
  function notice(row,label){
    if(!row.isConnected)return;let el=statuses.get(row);
    if(!el){el=document.createElement('div');el.className='toutiao-ai-draft-status';el.setAttribute('role','status');el.style.cssText='font:12px/1.6 system-ui;color:#24738c;margin:6px 0';el.addEventListener('click',e=>e.stopPropagation());const span=document.createElement('span');const settings=document.createElement('button');settings.type='button';settings.textContent='设置';settings.style.marginLeft='10px';settings.onclick=()=>chrome.runtime.sendMessage({type:'settings'});el.append(span,settings);row.append(el);statuses.set(row,el);}el.firstChild.textContent=label;
  }
  function localEditor(row){
    const editors=own(row,'.comment-item-reply-box-showed textarea.byte-textarea').filter(n=>n.isConnected&&n.getClientRects().length&&!n.disabled&&!n.readOnly);
    return editors.length===1?{editor:editors[0],row}:null;
  }
  function resolve(row,key){
    if(signature(snapshot(row))!==key)return null;
    const local=localEditor(row);if(local)return local;
    // The all-comments list opens the selected comment's editor in the right column.
    if(!row.closest('.all-comment-item-wrap.select'))return null;
    const targets=[...document.querySelectorAll('.sub-comment-col .comment-item')].filter(n=>signature(snapshot(n))===key).map(localEditor).filter(Boolean);
    return targets.length===1?targets[0]:null;
  }
  function waitEditor(row,key,valid){return new Promise(resolvePromise=>{
    let done=false;const finish=value=>{if(done)return;done=true;observer.disconnect();clearTimeout(timer);resolvePromise(value);};
    const check=()=>{if(!valid()||!row.isConnected){finish(null);return;}const hit=resolve(row,key);if(hit)finish(hit);};
    const observer=new MutationObserver(check);observer.observe(document.body,{subtree:true,childList:true,attributes:true});const timer=setTimeout(()=>finish(null),3500);check();
  });}
  document.addEventListener('click',async event=>{
    if(!active())return;
    const button=(event.target instanceof Element?event.target:null)?.closest('.comment-item-actions .comment');
    const row=button?.closest('.comment-item');if(!row||button.closest('.sub-comment-item')||button.classList.contains('ban'))return;
    const ticket=++sequence;const route=location.href;const valid=()=>sequence===ticket&&location.href===route;
    if(button.classList.contains('active'))return; // Cancel reply closes the panel.
    const item=snapshot(row);const key=signature(item);
    if(!item?.comment){notice(row,'未识别到唯一评论正文，未调用 AI');return;}
    try{
      const target=await waitEditor(row,key,valid);if(!target||!valid()){if(valid())notice(row,'未找到这条评论对应的回复框，请先展开回复');return;}
      const {editor}=target;
      if(editor.value.trim()){notice(target.row,'已保留输入框原有内容');return;}
      let edited=false;const track=e=>{if(e.isTrusted)edited=true;};editor.addEventListener('input',track);const initial=editor.value;
      try{
        notice(target.row,'正在结合评论和作品标题生成回复…');
        const result=await chrome.runtime.sendMessage({type:'generate',item});
        if(!valid()||!editor.isConnected||signature(snapshot(row))!==key||resolve(row,key)?.editor!==editor)return;
        if(!result?.ok){notice(target.row,result?.error||'扩展连接中断，请刷新页面');return;}
        if(edited||editor.value!==initial){notice(target.row,'你已编辑输入框，已保留你的内容');return;}
        const max=editor.maxLength>0?editor.maxLength:1000;if(result.text.length>max){notice(target.row,'生成文字超过输入框长度限制，未填写');return;}
        Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(editor,result.text);
        editor.dispatchEvent(new Event('input',{bubbles:true}));editor.dispatchEvent(new Event('change',{bubbles:true}));
        notice(target.row,'AI 回复已填入，请审核后手动发布'+(!item.workTitle?'（未识别到作品标题）':item.titleTruncated?'（作品标题不完整）':''));
      }finally{editor.removeEventListener('input',track);}
    }catch(e){notice(row,'生成未完成，请检查扩展设置或刷新页面');}
  },true);
  window.addEventListener('popstate',()=>{sequence++;});
})();
