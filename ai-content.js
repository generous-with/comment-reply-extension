(()=>{
  if(globalThis.__biliDraftHelper) return;globalThis.__biliDraftHelper=true;
  // Current B站 public message-pc bundle: interaction-item + message-reply-box.
  const rowSelector='.interaction-item';
  let sequence=0;
  const status=new WeakMap();
  function notice(row,text){
    let el=status.get(row);
    if(!el){el=document.createElement('div');el.className='bili-ai-draft-status';el.setAttribute('role','status');el.style.cssText='font:12px/1.6 system-ui;color:#24738c;padding:6px 0';el.addEventListener('click',e=>e.stopPropagation());const label=document.createElement('span');el.append(label);const settings=document.createElement('button');settings.type='button';settings.textContent='设置';settings.style.cssText='margin-left:10px;cursor:pointer';settings.onclick=()=>chrome.runtime.sendMessage({type:'settings'});el.append(settings);row.querySelector('.interaction-item__right')?.append(el);status.set(row,el);}
    el.firstChild.textContent=text;
  }
  function text(row,selector){return row.querySelector(selector)?.textContent.trim()||'';}
  function editorFor(row){const nodes=[...row.querySelectorAll('textarea.message-reply-box__input')].filter(e=>e.isConnected&&e.getClientRects().length&&!e.disabled&&!e.readOnly);return nodes.length===1?nodes[0]:null;}
  function waitEditor(row,valid){return new Promise(resolve=>{
    let done=false;const finish=value=>{if(done)return;done=true;observer.disconnect();clearTimeout(timer);resolve(value);};
    const check=()=>{if(!valid()||!row.isConnected){finish(null);return;}const el=editorFor(row);if(el)finish(el);};
    const observer=new MutationObserver(check);observer.observe(row,{subtree:true,childList:true,attributes:true});
    const timer=setTimeout(()=>finish(null),2500);check();
  });}
  document.addEventListener('click',async event=>{
    if(!/^#\/reply(?:[/?]|$)/.test(location.hash)) return;
    const target=event.target instanceof Element?event.target:null;
    const button=target?.closest('.interaction-item__btn.reply');
    const row=button?.closest(rowSelector);if(!row)return;
    const ticket=++sequence;const route=location.href;const valid=()=>sequence===ticket&&location.href===route;
    if(editorFor(row)) return; // This click collapses an already-open reply panel.
    // Capture source before Vue opens or collapses the editor.
    const titleNode=row.querySelector('.interaction-item__cover [title],.interaction-item__cover .bili-ellipsis');
    const workTitle=(titleNode?.getAttribute('title')||titleNode?.textContent||'').trim();
    const item={platform:'B站',comment:text(row,'.interaction-item__msg'),reference:text(row,'.interaction-item__reference'),workTitle,titleTruncated:/…|\.{3}/.test(workTitle)};
    const signature=item.comment;
    try{
      let editor=await waitEditor(row,valid);if(!editor||!valid())return;
      if(editor.value.trim()){notice(row,'已保留输入框原有内容');return;}
      if(!item.comment){notice(row,'未识别到评论正文，未调用 AI');return;}
      let edited=false;const track=e=>{if(e.isTrusted)edited=true;};editor.addEventListener('input',track);
      let initial=editor.value;
      try{
        notice(row,'正在根据这条评论生成回复…');
        const result=await chrome.runtime.sendMessage({type:'generate',item});
        if(!valid()){notice(row,'已停止填写：你已切换评论或页面，请重新点击回复');return;}
        if(!row.isConnected||text(row,'.interaction-item__msg')!==signature){notice(row,'已停止填写：原评论已变化，请重新点击回复');return;}
        if(!result?.ok){notice(row,result?.error||'扩展连接中断，请刷新页面');return;}
        const currentEditor=editorFor(row)||await waitEditor(row,valid);
        if(!valid()||!row.isConnected||text(row,'.interaction-item__msg')!==signature){notice(row,'已停止填写：评论或页面在等待中发生变化');return;}
        if(!currentEditor){notice(row,'回复已生成，但回复框已关闭，请重新展开后再试');return;}
        if(currentEditor!==editor){
          if(edited||currentEditor.value.trim()){notice(row,'回复框已更新，已保留其中的手写内容');return;}
          editor.removeEventListener('input',track);editor=currentEditor;initial=editor.value;
        }
        if(edited||editor.value!==initial){notice(row,'你已编辑输入框，已保留你的内容');return;}
        const max=editor.maxLength>0?editor.maxLength:1000;if(result.text.length>max){notice(row,'生成文字超过输入框长度限制，未填写');return;}
        Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(editor,result.text);
        editor.dispatchEvent(new Event('input',{bubbles:true}));
        editor.dispatchEvent(new Event('change',{bubbles:true}));
        notice(row,'AI 回复已填入，请审核后点击“发表评论”');
      }finally{editor.removeEventListener('input',track);}
    }catch(e){notice(row,'生成未完成，请检查扩展设置或刷新页面');}
  },true);
  window.addEventListener('hashchange',()=>{sequence++;});
})();
