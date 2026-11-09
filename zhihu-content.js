(()=>{
 const id=()=>ZhihuAnswer.questionId(location.pathname);
 const tidy=s=>(s||'').replace(/[\u200b\u2060\ufeff]/g,'').trim();
 const text=e=>tidy(e?.innerText||e?.textContent);
 const visible=e=>e?.getClientRects().length&&getComputedStyle(e).visibility!=='hidden';
 const all=(root,selector)=>[...root.querySelectorAll(selector)].filter(visible);
 const one=items=>items.length===1?items[0]:null;
 const named=(root,selector,label)=>one(all(root,selector).filter(e=>text(e)===label||
    [e.title,e.getAttribute('aria-label')].includes(label)));
 const button=(root,label)=>named(root,'button,[role="button"]',label);
 const actionable=e=>e&&visible(e)&&!e.disabled&&e.getAttribute('aria-disabled')!=='true';
 async function publishOptions(){
  try{return await chrome.runtime.sendMessage({type:'zhihuPublishOptions',questionId:id()});}
  catch(e){return null;}
 }
 const sleep=ms=>new Promise(r=>setTimeout(r,ms));
 async function wait(check,valid,ms=3000,interval=80){
  const end=Date.now()+ms;
  while(valid()){
   const value=check();if(value)return value;
   if(Date.now()>=end)break;
   await sleep(interval);
  }
  return null;
 }
 function composer(){
  const form=one(all(document,'main form.AnswerForm'));
  const editor=form&&one(all(form,'.public-DraftEditor-content[contenteditable="true"]'));
  return editor?{form,editor}:null;
 }
 function question(){
  const title=text(document.querySelector('main h1.QuestionHeader-title')||one(all(document,'main h1')));
  const desc=document.querySelector('main .QuestionRichText');
  const content=desc?.querySelector('.RichText')||desc;
  return {questionId:id(),title:title.slice(0,500),description:text(content).slice(0,10000)};
 }
 const empty=e=>!text(e)&&!e.querySelector('img,video,figure,iframe,[data-atomic],[data-block-type="atomic"]');
 const equal=(a,b)=>a.replace(/\s/g,'')===b.replace(/\s/g,'');
 async function fillBody(editor,body,valid,edited){
  editor.focus();
  if(!editor.isConnected||!empty(editor))return false;
  const selection=getSelection();const range=document.createRange();
  range.selectNodeContents(editor);
  selection.removeAllRanges();selection.addRange(range);
  document.dispatchEvent(new Event('selectionchange'));
  await sleep(100);
  if(!valid()||edited()||composer()?.editor!==editor||!empty(editor)||!editor.contains(selection.anchorNode))return false;
  const data=new DataTransfer();data.setData('text/plain',body);
  const fragment=document.createElement('div');
  for(const line of body.split('\n')){const p=document.createElement('p');p.textContent=line;if(!line)p.append(document.createElement('br'));fragment.append(p);}
  data.setData('text/html',fragment.innerHTML);
  editor.dispatchEvent(new ClipboardEvent('paste',{clipboardData:data,bubbles:true,cancelable:true}));
  return !!await wait(()=>composer()?.editor===editor&&equal(text(editor),body),valid,2300);
 }
 const settingRow=label=>{const form=composer()?.form;return form&&named(form,'label',label)?.parentElement;};
 const introRow=()=>settingRow('一句话介绍');
 const declaration=()=>{const row=settingRow('创作声明');return row&&one(all(row,'button[role="combobox"]'));};
 const topicDialog=()=>one(all(document,'.Modal').filter(e=>text(e).includes('编辑话题经验')));
 const introGuideId='comment-ai-zhihu-intro-guide';
 const introInput=dialog=>one(all(dialog,'input[placeholder="一句话介绍"],textarea[placeholder="一句话介绍"]'));
 function introModify(dialog){
  const list=dialog.querySelector('.TopicBioItems');
  const card=list?.firstElementChild;
  const scope=list?(card?.matches('.TopicBioItem')?card:null):dialog;
  return scope&&named(scope,'button.TopicBioItem-modifyButton','修改');
 }
 function introSaved(dialog,value){
  const card=dialog.querySelector('.TopicBioItems > .TopicBioItem:first-child');
  const badge=text(card?.querySelector('.AuthorInfo-badge')).replace(/\s*修改$/,'');
  return !introInput(dialog)&&(text(introRow()?.querySelector('.ztext'))===value||
   text(card?.querySelector('.ztext'))===value||badge===value);
 }
 function introGuide(dialog,message,suggestion){
  let guide=dialog.querySelector('#'+introGuideId);
  if(!guide){
   guide=document.createElement('div');guide.id=introGuideId;guide.setAttribute('role','status');
   (dialog.querySelector('.Modal-content')||dialog).prepend(guide);
  }
  guide.textContent=message+(suggestion?'\n建议简介：'+suggestion:'');
 }
 const agreement=()=>one(all(document,'.RewardForm-rewardModal'));
 const giftGuideId='comment-ai-zhihu-gift-guide';
 const spoilerName='包含剧透';
 function declarationMenus(trigger){
  if(!trigger)return [];
  const ids=[...new Set([...(trigger.getAttribute('aria-controls')||'').split(/\s+/),
   ...(trigger.getAttribute('aria-owns')||'').split(/\s+/),
   trigger.id.endsWith('-toggle')?trigger.id.replace(/-toggle$/,'-content'):''].filter(Boolean))];
  const linked=ids.map(id=>document.getElementById(id)).filter(e=>visible(e)&&(e.matches('[role="listbox"]')||e.querySelector('[role="option"]')));
  if(linked.some(menu=>all(menu,'[role="option"]').some(option=>text(option)===spoilerName)))return linked;
  // A detached portal may have no usable ID; require the unique declaration-specific option set.
  const fallback=one(all(document,'[role="listbox"]').filter(menu=>{
   const names=all(menu,'[role="option"]').map(text);
   return [spoilerName,'虚构创作','无声明'].every(name=>names.includes(name));
  }));
  return fallback?[fallback]:linked;
 }
 const declarationApplied=()=>text(declaration())===spoilerName;
 function declarationOpen(){
  const trigger=declaration();
  return trigger?.getAttribute('aria-expanded')==='true'||declarationMenus(trigger).length>0;
 }
 async function closeDeclaration(valid){
  if(!valid()||!declarationOpen())return;
  const trigger=declaration();
  if(trigger?.getAttribute('aria-expanded')==='true'&&!trigger.disabled)trigger.click();
  if(await wait(()=>!declarationOpen(),valid,550)||!valid())return;
  const target=declaration();
  if(target){
   target.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',code:'Escape',bubbles:true,cancelable:true}));
   await wait(()=>!declarationOpen(),valid,1250);
  }
 }
 const giftLabel=()=>{const form=composer()?.form;return form&&named(form,'label','开启送礼物');};
 const giftInput=()=>{
  const label=giftLabel();
  if(label?.control&&['radio','checkbox'].includes(label.control.type))return label.control;
  const form=composer()?.form;
  const row=form&&named(form,'label','送礼物设置')?.parentElement;
  return row&&one([...row.querySelectorAll('input[type=checkbox]')]);
 };
 function setIntro(field,value,previous=''){
  if(field.value.trim()&&field.value.trim()!==previous)return field.value===value?'一句话介绍已填写':'已保留已有一句话介绍';
  if(field.disabled||field.readOnly||field.maxLength>=0&&value.length>field.maxLength)return '一句话介绍请手动填入';
  const proto=field.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto,'value').set.call(field,value);
  field.dispatchEvent(new Event('input',{bubbles:true}));
  field.dispatchEvent(new Event('change',{bubbles:true}));
  return field.value===value?'一句话介绍已填写':'一句话介绍请手动填入';
 }
 async function openSettings(valid){
  if(declaration()||introRow()||giftInput())return true;
  const scope=composer()?.form.closest('.AnswerAdd')||document;
  const open=button(scope,'发布设置');
  if(open&&!open.disabled&&open.getAttribute('aria-expanded')!=='true')open.click();
  return !!await wait(()=>declaration()||introRow()||giftInput(),valid);
 }
 async function setDeclaration(valid){
  if(!valid())return '';
  if(agreement()||topicDialog())return '请先关闭当前知乎弹窗，再设置创作声明';
  await openSettings(valid);
  const trigger=await wait(declaration,valid);
  if(!valid())return '';
  if(!trigger)return '未找到创作声明，请核对发布设置';
  const success='创作声明已设为「包含剧透」';
  let message=success;
  if(!declarationApplied()){
   if(trigger.disabled||trigger.getAttribute('aria-disabled')==='true')message='创作声明当前不可修改，请手动核对';
   else{
    if(trigger.getAttribute('aria-expanded')!=='true')trigger.click();
    const option=await wait(()=>{
     const menus=declarationMenus(declaration());
     return one([...new Set(menus.flatMap(menu=>all(menu,'[role="option"]').filter(e=>text(e)===spoilerName)))]);
    },valid,1800);
    if(!valid())return '';
    if(!option||option.disabled||option.getAttribute('aria-disabled')==='true')message='未找到可选的「包含剧透」，请手动核对创作声明';
    else{
     option.click();
     if(!await wait(declarationApplied,valid,1800))message='未确认创作声明已更改，请手动核对';
    }
   }
  }
  await closeDeclaration(valid);
  return declarationOpen()?message+'；请先收起创作声明菜单':message;
 }
 async function fillIntro(value,valid){
  if(agreement())return '请先确认或关闭送礼物协议';
  if(declarationOpen())return '请先收起创作声明菜单';
  await openSettings(valid);
  if(!valid())return '问题或编辑器已切换';
  const row=introRow();
  const inline=row&&one(all(row,'input:not([type=radio]):not([type=checkbox]),textarea'));
  if(inline)return setIntro(inline,value);
  const previous=text(row?.querySelector('.ztext'));
  const edit=row&&one(all(row,'div').filter(e=>text(e)==='修改'&&e.querySelector('svg.Zi--Edit')));
  if(!topicDialog()&&edit)edit.click();
  const field=()=>{const dialog=topicDialog();return dialog&&introInput(dialog);};
  const finish=(message,suggestion)=>{
   const dialog=valid()&&topicDialog();
   if(dialog)introGuide(dialog,message,suggestion);
   return message;
  };
  // The modal shell can render before its author card. Wait for a live control.
  const ready=await wait(()=>{
   const dialog=topicDialog();if(!dialog)return null;
   const input=introInput(dialog);if(input)return {input};
   const modify=introModify(dialog);
   return modify&&!modify.disabled&&modify.getAttribute('aria-disabled')!=='true'?{modify}:null;
  },valid,3500);
  if(!valid())return '问题或编辑器已切换';
  if(!ready)return finish('未找到可用的简介编辑按钮。可手动点「修改」并粘贴建议简介，或点「完成」回到回答。',value);
  if(ready.modify)ready.modify.click();
  const input=ready.input||await wait(field,valid,2300);
  if(!valid())return '问题或编辑器已切换';
  if(!input)return finish('未打开简介输入框。请手动点「修改」并粘贴建议简介。',value);
  const status=setIntro(input,value,previous);
  if(status!=='一句话介绍已填写')return finish(status,value);
  const confirmed=await wait(()=>field()?.value===value,valid,1200);
  if(!valid())return '问题或编辑器已切换';
  if(!confirmed)return finish('未确认简介写入，请核对输入框或手动粘贴建议简介。',value);
  const options=await publishOptions();
  if(!valid())return '问题或编辑器已切换';
  if(options?.ok&&options.autoSaveIntro===true){
   const dialog=topicDialog();
   const current=dialog&&introInput(dialog);
   const form=current?.closest('form');
   const save=form&&dialog.contains(form)&&named(form,'button','保存');
   if(current?.value!==value||!actionable(save))return finish('一句话介绍已填写，请核对后手动点「保存 → 完成」。');
   save.click();
   if(!await wait(()=>topicDialog()===dialog&&introSaved(dialog,value),valid,5000)){
    return finish('未能确认简介保存，请在弹窗核对。');
   }
   if(!valid())return '问题或编辑器已切换';
   const done=button(dialog,'完成');
   if(!actionable(done))return finish('简介已保存，请手动点「完成」回到回答。');
   done.click();
   if(await wait(()=>!topicDialog(),valid,1800))return '一句话介绍已保存，已回到回答';
   return finish('简介已保存，请手动点「完成」回到回答。');
  }
  return finish('一句话介绍已填写。请核对后点「保存」，再点「完成」回到回答。');
 }
 async function settings(draft,valid){
  const messages=[await setDeclaration(valid)];
  if(!valid())return ['问题或编辑器已切换'];
  if(declarationOpen()||!declarationApplied())return messages;
  const gift=giftInput();
  const initiated=gift&&!gift.checked&&!gift.disabled&&!agreement()&&valid();
  if(initiated)(giftLabel()||gift).click();
  if(!valid())return messages;
  if(gift){
   await wait(()=>giftInput()?.checked||agreement(),valid,1800);
   const modal=valid()&&agreement();
   if(modal){
    if(initiated&&text(modal).includes('知乎赞赏功能使用协议')){
     const options=await publishOptions();
     if(!valid())return messages;
     const confirm=agreement()===modal&&button(modal,'确定');
     if(options?.ok&&options.autoConfirmGift===true&&actionable(confirm))confirm.click();
    }
   }
   const pendingModal=valid()&&agreement();
   if(pendingModal){
    const guide=document.createElement('p');guide.id=giftGuideId;guide.setAttribute('role','status');
    guide.textContent='如同意知乎协议，请点「确定」；也可以点右上角关闭。弹窗关闭后，扩展会自动继续。';
    (pendingModal.querySelector('.Modal-content')||pendingModal).prepend(guide);
    const closed=await wait(()=>!agreement(),valid,180000,250);
    guide.remove();
    if(!valid())return messages;
    if(!closed)return [...messages,'送礼物协议仍未处理。关闭后可点「填写一句话介绍」继续'];
   }
   if(initiated&&!giftInput()?.checked)await wait(()=>giftInput()?.checked,valid,1500);
   if(!valid())return messages;
   messages.push(giftInput()?.checked?'送礼物已开启':'送礼物未开启');
  }else messages.push('当前未找到送礼物设置，请手动核对');
  if(valid())messages.push(draft.intro?await fillIntro(draft.intro,valid):'本次没有可填写的一句话介绍');
  return messages;
 }
 const create=(tag,label)=>{const e=document.createElement(tag);if(label)e.textContent=label;return e;};
 let state;
 function mount(){
  const qid=id(),c=qid&&composer();
  if(state&&(!c||state.id!==qid||!state.panel.isConnected||state.form!==c.form)){state.panel.remove();document.getElementById(introGuideId)?.remove();document.getElementById(giftGuideId)?.remove();state=null;}
  if(!c||state)return;
  const panel=create('section');panel.id='comment-ai-zhihu';
  const run=create('button','AI 生成知乎回答'),add=create('button','插入图片'),config=create('button','扩展设置'),intro=create('button','填写一句话介绍'),spoiler=create('button','设为包含剧透');
  for(const b of [run,add,config,intro,spoiler])b.type='button';
  intro.hidden=true;
  const status=create('p');status.setAttribute('role','status');
  const preview=create('details');preview.hidden=true;
  const copy=create('textarea');copy.readOnly=true;copy.rows=7;copy.setAttribute('aria-label','生成的知乎回答草稿');
  const previewLabel=create('summary','查看生成草稿和配图建议');
  preview.append(previewLabel,copy);
  panel.append(run,add,intro,spoiler,config,status,preview);c.form.before(panel);
  const current={id:qid,panel,form:c.form};state=current;
  const valid=()=>state===current&&qid===id()&&composer()?.form===current.form;
  let latestDraft,resumeSettings=false;
  const settingsResult=(draft,messages)=>['回答正文已填写',...messages,draft.image?'可查看配图建议并插入图片':'','请审核后手动发布'].filter(Boolean).join('；');
  const updateResume=()=>{
   resumeSettings=!declarationApplied()||declarationOpen();
   spoiler.textContent=resumeSettings?'继续填写发布设置':'设为包含剧透';
  };
  spoiler.onclick=async()=>{
   if(run.disabled||intro.disabled||spoiler.disabled||!valid())return;
   spoiler.disabled=true;
   try{
    if(resumeSettings&&latestDraft){
     const messages=await settings(latestDraft,valid);
     if(valid()){updateResume();status.textContent=settingsResult(latestDraft,messages);}
    }else{
     const result=await setDeclaration(valid);
     if(valid())status.textContent=result;
    }
   }
   finally{spoiler.disabled=false;}
  };
  intro.onclick=async()=>{
   if(!latestDraft||run.disabled||spoiler.disabled||!valid())return;
   intro.disabled=true;
   try{const result=await fillIntro(latestDraft.intro,valid);if(valid())status.textContent=result;}
   finally{intro.disabled=false;}
  };
  add.onclick=()=>{const form=composer()?.form,control=form&&button(form,'图片');if(valid()&&control)control.click();};
  config.onclick=()=>chrome.runtime.sendMessage({type:'settings'}).catch(()=>{status.textContent='请点击扩展图标打开设置';});
  run.onclick=async()=>{
   if(run.disabled||spoiler.disabled||!valid())return;
   const editor=composer().editor;
   if(!empty(editor)){status.textContent='正文已有内容，已保留原草稿。';return;}
   run.disabled=true;preview.hidden=true;preview.open=false;latestDraft=null;intro.hidden=true;
   resumeSettings=false;spoiler.textContent='设为包含剧透';
   let edited=false;const onEdit=e=>{if(editor.contains(e.target))edited=true;};
   current.form.addEventListener('input',onEdit,true);
   try{
    status.textContent='正在读取问题并生成回答…';
    const desc=document.querySelector('main .QuestionRichText');
    const more=desc&&button(desc,'显示全部');
    if(more){more.click();await wait(()=>!visible(more)||text(more)!=='显示全部',valid,1200);}
    if(!valid())return;
    const item=question();
    if(!item.title)throw Error('没读到问题标题，请刷新知乎页面后重试');
    const result=await chrome.runtime.sendMessage({type:'generateZhihu',item});
    if(!valid())return;
    if(!result?.ok||!result.draft){
     if(typeof result?.rawDraft==='string'&&result.rawDraft){
      previewLabel.textContent='查看模型原文（未自动填入）';
      copy.value=result.rawDraft;preview.hidden=false;preview.open=true;
     }
     throw Error(result?.error||'未生成回答');
    }
    const {draft}=result;
    latestDraft=draft;intro.hidden=!draft.intro;
    previewLabel.textContent='查看生成草稿和配图建议';
    copy.value=[draft.intro?'一句话介绍：'+draft.intro:'','回答正文：\n'+draft.body,draft.image?'配图建议：'+draft.image:''].filter(Boolean).join('\n\n');
    preview.hidden=false;
    if(edited||composer()?.editor!==editor||!empty(editor)){status.textContent='原编辑区已变化，生成草稿保留在下方，请手动核对。';return;}
    if(!await fillBody(editor,draft.body,valid,()=>edited)){if(valid())status.textContent='未确认正文填入，请从下方草稿复制并核对编辑器。';return;}
    current.form.removeEventListener('input',onEdit,true);
    const messages=await settings(draft,valid);
    if(valid()){updateResume();status.textContent=settingsResult(draft,messages);}
   }catch(e){if(valid())status.textContent=e.message;}
   finally{current.form.removeEventListener('input',onEdit,true);run.disabled=false;}
  };
 }
 let scheduled=false;
 new MutationObserver(()=>{
  if(scheduled)return;scheduled=true;
  requestAnimationFrame(()=>{scheduled=false;mount();});
 }).observe(document.body,{childList:true,subtree:true});
 window.addEventListener('popstate',mount);
 mount();
})();
