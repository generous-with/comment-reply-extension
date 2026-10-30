(()=>{
  if(globalThis.__douyinDraftHelper)return;globalThis.__douyinDraftHelper=true;
  // Public pc_mono/work-management.90eea16b.js: CSS modules + onInput reading innerHTML.
  const ROW='.comment-item-o85vW5',OPS='.comment-operation-wrap-lc52eY';
  let sequence=0,activeTask=null;const statuses=new WeakMap();
  const workId=()=>location.pathname.match(/^\/creator-micro\/work-management\/work-detail\/(\d+)\/?$/)?.[1]||'';
  const owned=(row,selector)=>[...row.querySelectorAll(selector)].filter(n=>n.closest(ROW)===row);
  function plain(node){
    const clone=node.cloneNode(true);clone.querySelectorAll('img').forEach(img=>img.replaceWith(document.createTextNode(img.getAttribute('alt')||'')));clone.querySelectorAll('br').forEach(br=>br.replaceWith(document.createTextNode('\n')));return clone.textContent.trim();
  }
  function snapshot(row){
    const nodes=owned(row,'.text-uG7vGS');if(nodes.length!==1||nodes[0].querySelector('.folded-OCobYm'))return null;
    const names=owned(row,'.username-AHNP_w');const author=names[0]?plain(names[0]):'';
    const titles=[...document.querySelectorAll('.info-title-text-QsVcuc,.info-title-text-LseDgG')].filter(n=>n.getClientRects().length).map(n=>(n.getAttribute('title')||n.textContent||'').trim()).filter(t=>t&&t!=='无视频描述');
    const unique=[...new Set(titles)];const workTitle=unique.length===1?unique[0]:'';
    return {platform:'抖音',workId:workId(),comment:plain(nodes[0]),workTitle,titleTruncated:/…|\.{3}/.test(workTitle),author,time:owned(row,'.time-qUi7iL')[0]?.textContent.trim()||''};
  }
  const signature=item=>item&&JSON.stringify([item.workId,item.workTitle,item.comment,item.author]);
  function notice(row,text){
    if(!row.isConnected){let fallback=document.getElementById('douyin-ai-global-status');if(!fallback){fallback=document.createElement('div');fallback.id='douyin-ai-global-status';fallback.setAttribute('role','status');fallback.style.cssText='position:fixed;bottom:16px;left:16px;z-index:2147483647;padding:12px;background:#edf7fa;color:#204b5c;font:14px/1.6 system-ui';document.documentElement.append(fallback);}fallback.textContent=text;return;}let el=statuses.get(row);
    if(!el){owned(row,'.douyin-ai-draft-status').forEach(n=>n.remove());el=document.createElement('div');el.className='douyin-ai-draft-status';el.setAttribute('role','status');el.style.cssText='font:12px/1.6 system-ui;color:#24738c;margin:6px 0';el.addEventListener('click',e=>e.stopPropagation());const span=document.createElement('span');const settings=document.createElement('button');settings.type='button';settings.textContent='设置';settings.style.marginLeft='10px';settings.onclick=()=>chrome.runtime.sendMessage({type:'settings'});el.append(span,settings);(owned(row,'.comment-main-YV_lqD')[0]||row).append(el);statuses.set(row,el);}el.firstChild.textContent=text;
  }
  function editorFor(row,operations){
    if(!operations.isConnected||operations.closest(ROW)!==row)return null;
    const nodes=[...operations.querySelectorAll('.editable-input-_mF1vt[contenteditable="true"]')].filter(n=>n.closest(ROW)===row&&n.closest(OPS)===operations&&n.getClientRects().length&&n.getAttribute('aria-disabled')!=='true');return nodes.length===1?nodes[0]:null;
  }
  function waitEditor(row,ops,valid){return new Promise(resolve=>{
    let done=false;const finish=x=>{if(done)return;done=true;observer.disconnect();clearTimeout(timer);resolve(x);};
    const check=()=>{if(!valid()||!row.isConnected){finish(null);return;}const e=editorFor(row,ops);if(e)finish(e);};
    const observer=new MutationObserver(check);observer.observe(row,{subtree:true,childList:true,attributes:true});const timer=setTimeout(()=>finish(null),3000);check();
  });}
  function waitReturnTarget(original,key,valid){return new Promise(resolve=>{
    const deadline=Date.now()+3000;
    const timer=setInterval(()=>{
      if(!valid()){clearInterval(timer);resolve(null);return;}
      let rows=[];
      if(original.isConnected){if(signature(snapshot(original))===key)rows=[original];}
      else rows=[...document.querySelectorAll(ROW)].filter(r=>signature(snapshot(r))===key);
      if(rows.length===1){const row=rows[0],operations=owned(row,OPS);if(operations.length===1){const editor=editorFor(row,operations[0]);if(editor){clearInterval(timer);resolve({row,ops:operations[0],editor});return;}}}
      if(Date.now()>deadline){clearInterval(timer);resolve(null);}
    },100);
  });}
  document.addEventListener('click',async event=>{
    if(!workId())return;
    const button=(event.target instanceof Element?event.target:null)?.closest('button.operation-eC1t7Q');
    if(!button||button.textContent.trim()!=='回复'||button.disabled)return;
    let row=button.closest(ROW),ops=button.closest(OPS);if(!row||!ops||ops.closest(ROW)!==row)return;
    const item=snapshot(row),key=signature(item);if(!item?.comment){notice(row,'未识别到唯一评论正文，未调用 AI');return;}
    if(activeTask&&activeTask.work===workId()&&activeTask.key===key&&(activeTask.row===row||!activeTask.row.isConnected))return;
    const ticket=++sequence,sourceWork=workId(),valid=()=>sequence===ticket&&workId()===sourceWork;
    const stopped=()=>workId()!==sourceWork?'已停止填写：当前作品页面已变化':'已停止填写：你已选择另一条评论';
    if(editorFor(row,ops))return; // A second reply click closes this comment's composer.
    try{
      let editor=await waitEditor(row,ops,valid);if(!editor||!valid())return;
      if(editor.textContent.trim()||editor.querySelector('img')){notice(row,'已保留回复框原有内容');return;}
      let edited=false;const track=e=>{if(e.isTrusted)edited=true;};editor.addEventListener('input',track);let initial=editor.innerHTML;
      try{
        notice(row,'正在结合这条评论和当前作品描述生成回复…');
        activeTask={ticket,work:sourceWork,key,row};
        const result=await chrome.runtime.sendMessage({type:'generate',item});
        if(!valid()){notice(row,stopped());return;}
        if(!result?.ok){notice(row,result?.error||'扩展连接中断，请刷新页面');return;}
        const target=await waitReturnTarget(row,key,valid);
        if(!valid()){notice(row,stopped());return;}
        if(!target){notice(row,'回复已生成，但未找到原评论唯一且已打开的回复框；请重新展开回复');return;}
        if(target.editor!==editor){
          editor.removeEventListener('input',track);
          row=target.row;ops=target.ops;editor=target.editor;
          if(edited||editor.textContent.trim()||editor.querySelector('img')){notice(row,'回复框已更新，已保留其中的手写内容');return;}
          initial=editor.innerHTML;
        }
        if(edited||editor.innerHTML!==initial){notice(row,'你已编辑回复框，已保留你的内容');return;}
        if(result.text.length>500){notice(row,'生成文字超过抖音回复框的500字限制，未填写');return;}
        // textContent prevents HTML injection; the site's onInput synchronizes its send state.
        editor.textContent=result.text;editor.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:result.text}));
        notice(row,'AI 回复已填入，请审核后手动发送'+(!item.workTitle?'（未识别到唯一作品描述）':item.titleTruncated?'（作品描述不完整）':''));
      }finally{editor.removeEventListener('input',track);if(activeTask?.ticket===ticket)activeTask=null;}
    }catch(e){notice(row,'生成未完成，请检查扩展设置或刷新页面');}
  },true);
  window.addEventListener('popstate',()=>{if(activeTask&&workId()!==activeTask.work)sequence++;});
})();
