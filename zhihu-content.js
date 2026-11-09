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
 const sleep=ms=>new Promise(r=>setTimeout(r,ms));
 async function wait(check,valid,ms=3000){
  const end=Date.now()+ms;
  while(valid()){
   const value=check();if(value)return value;
   if(Date.now()>=end)break;
   await sleep(80);
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
 function introGuide(dialog,message,suggestion){
  let guide=dialog.querySelector('#'+introGuideId);
  if(!guide){
   guide=document.createElement('div');guide.id=introGuideId;guide.setAttribute('role','status');
   (dialog.querySelector('.Modal-content')||dialog).prepend(guide);
  }
  guide.textContent=message+(suggestion?'\n建议简介：'+suggestion:'');
 }
 const agreement=()=>one(all(document,'.RewardForm-rewardModal'));
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
  const optionName='包含剧透';
  const success='创作声明已设为「包含剧透」';
  if(text(trigger)===optionName)return success;
  if(trigger.disabled||trigger.getAttribute('aria-disabled')==='true')return '创作声明当前不可修改，请手动核对';
  if(trigger.getAttribute('aria-expanded')!=='true')trigger.click();
  const option=await wait(()=>{
   const current=declaration();
   if(current?.getAttribute('aria-expanded')!=='true')return null;
   const menuId=current.getAttribute('aria-controls')||(current.id.endsWith('-toggle')?current.id.replace(/-toggle$/,'-content'):'');
   const menu=menuId&&document.getElementById(menuId);
   return menu&&named(menu,'[role="option"]',optionName);
  },valid,1800);
  if(!valid())return '';
  if(!option||option.disabled||option.getAttribute('aria-disabled')==='true')return '未找到可选的「包含剧透」，请手动核对创作声明';
  option.click();
  return await wait(()=>text(declaration())===optionName,valid,1800)?success:'未确认创作声明已更改，请手动核对';
 }
 async function fillIntro(value,valid){
  if(agreement())return '请先处理送礼物协议，再点「填写一句话介绍」';
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
  return confirmed?finish('一句话介绍已填写。请核对后点「保存」，再点「完成」回到回答。'):
    finish('未确认简介写入，请核对输入框或手动粘贴建议简介。',value);
 }
 async function settings(draft,valid){
  const messages=[await setDeclaration(valid)];
  if(!valid())return ['问题或编辑器已切换'];
  const gift=giftInput();
  if(gift&&!gift.checked&&!gift.disabled&&!agreement()&&valid())(giftLabel()||gift).click();
  if(!valid())return messages;
  if(gift){
   const opened=await wait(()=>giftInput()?.checked||agreement(),valid,1800);
   if(opened&&giftInput()?.checked)messages.push('送礼物已开启');
   else if(agreement())return [...messages,'请在知乎窗口确认送礼物协议，再点「填写一句话介绍」'];
   else messages.push('送礼物未开启，请核对发布设置');
  }else messages.push('当前未找到送礼物设置，请手动核对');
  if(valid())messages.push(await fillIntro(draft.intro,valid));
  return messages;
 }
 const create=(tag,label)=>{const e=document.createElement(tag);if(label)e.textContent=label;return e;};
 let state;
 function mount(){
  const qid=id(),c=qid&&composer();
  if(state&&(!c||state.id!==qid||!state.panel.isConnected||state.form!==c.form)){state.panel.remove();document.getElementById(introGuideId)?.remove();state=null;}
  if(!c||state)return;
  const panel=create('section');panel.id='comment-ai-zhihu';
  const run=create('button','AI 生成知乎回答'),add=create('button','插入图片'),config=create('button','扩展设置'),intro=create('button','填写一句话介绍'),spoiler=create('button','设为包含剧透');
  for(const b of [run,add,config,intro,spoiler])b.type='button';
  intro.hidden=true;
  const status=create('p');status.setAttribute('role','status');
  const preview=create('details');preview.hidden=true;
  const copy=create('textarea');copy.readOnly=true;copy.rows=7;copy.setAttribute('aria-label','生成的知乎回答草稿');
  preview.append(create('summary','查看生成草稿和配图建议'),copy);
  panel.append(run,add,intro,spoiler,config,status,preview);c.form.before(panel);
  const current={id:qid,panel,form:c.form};state=current;
  const valid=()=>state===current&&qid===id()&&composer()?.form===current.form;
  let latestDraft;
  spoiler.onclick=async()=>{
   if(run.disabled||intro.disabled||spoiler.disabled||!valid())return;
   spoiler.disabled=true;
   try{const result=await setDeclaration(valid);if(valid())status.textContent=result;}
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
   run.disabled=true;preview.hidden=true;
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
    if(!result?.ok||!result.draft)throw Error(result?.error||'未生成回答');
    const {draft}=result;
    latestDraft=draft;intro.hidden=false;
    copy.value=['一句话介绍：'+draft.intro,'回答正文：\n'+draft.body,draft.image?'配图建议：'+draft.image:''].filter(Boolean).join('\n\n');
    preview.hidden=false;
    if(edited||composer()?.editor!==editor||!empty(editor)){status.textContent='原编辑区已变化，生成草稿保留在下方，请手动核对。';return;}
    if(!await fillBody(editor,draft.body,valid,()=>edited)){if(valid())status.textContent='未确认正文填入，请从下方草稿复制并核对编辑器。';return;}
    current.form.removeEventListener('input',onEdit,true);
    const messages=await settings(draft,valid);
    if(valid())status.textContent=['回答正文已填写',...messages,draft.image?'可查看配图建议并插入图片':'','请审核后手动发布'].filter(Boolean).join('；');
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
