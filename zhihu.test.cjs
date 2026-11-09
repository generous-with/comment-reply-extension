const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const zhihu=require('./zhihu-answer.js');
const core=require('./ai-core.js');
const id='7000000000000000001';
const answer='【一句话介绍】\n先看边界再讨论可行性。\n【回答正文】\n正文第一段。\n\n正文第二段。\n【配图建议】\n用简图标出模块边界。';
const item={questionId:id,title:'如何理解这个架构？',description:'需要说明模块边界。'};
test('知乎问题绑定发送方；API 和豆包均使用独立长回答提示，解析同一草稿格式',async()=>{
 let listener,request,webJob,provider='api';
 const config={...core.defaults,baseUrl:'https://model.example/v1',model:'fixture',apiKey:'test-only-key',maxChars:50,styleSamples:'我会先看这一步是否可复现。'};
 const chrome={runtime:{id:'fixture',getURL:p=>'chrome-extension://fixture/'+p,onMessage:{addListener:f=>listener=f}},action:{onClicked:{addListener(){}}},storage:{local:{setAccessLevel:async()=>{},get:async()=>({aiConfig:{...config,provider}})}},permissions:{contains:async()=>true}};
 const ctx={chrome,URL,AbortSignal,fetch:async(url,options)=>{request=JSON.parse(options.body);return {ok:true,json:async()=>({choices:[{message:{content:answer}}]})};}};
 vm.createContext(ctx);
 ctx.importScripts=(...files)=>{for(const file of files)vm.runInContext(fs.readFileSync(path.join(__dirname,file),'utf8'),ctx);};
 vm.runInContext(fs.readFileSync(path.join(__dirname,'ai-background.js'),'utf8'),ctx);
 ctx.generateWithDoubao=async(c,i,tab,job)=>{webJob=job;assert.equal(tab,4);return answer;};
 const sender={id:'fixture',tab:{id:4},url:'https://www.zhihu.com/question/'+id+'?from=test'};
 const send=(i,s=sender)=>new Promise(r=>listener({type:'generateZhihu',item:i},s,r));
 assert.equal(listener({type:'generateZhihu',item},{...sender,url:sender.url.split('?')[0]+'/answer/88'},()=>{}),undefined);
 assert.equal((await send({...item,questionId:'888'})).ok,false);
 assert.equal(request,undefined);
 const result=await send(item);
 assert.equal(result.ok,true);assert.deepEqual(JSON.parse(JSON.stringify(result.draft)),zhihu.parse(answer));
 assert.equal(JSON.parse(request.messages[1].content).questionDescription,item.description);
 assert.equal(JSON.parse(request.messages[1].content).styleSamples,config.styleSamples);
 assert.ok(!request.messages[0].content.includes('评论区回复'));
 provider='doubao';assert.equal((await send(item)).draft.intro,'先看边界再讨论可行性。');
 assert.equal(webJob.maxChars,4800);const prompt=require('./doubao-prompt.js').build(core,config,item,'a'.repeat(32),webJob);
 assert.ok(prompt.includes(item.title)&&prompt.includes(item.description));assert.ok(!prompt.includes(config.apiKey));
 assert.ok(prompt.includes(config.styleSamples));
 assert.throws(()=>zhihu.parse('只有正文'));
 assert.throws(()=>zhihu.parse(answer.replace('先看边界再讨论可行性。','字'.repeat(41))));
});

test('知乎回填正文、选择包含剧透、开启送礼物，保护手写及切换问题，不发布',async()=>{
 const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
 const browser=await chromium.launch({...(process.env.BROWSER_EXECUTABLE_PATH?{executablePath:process.env.BROWSER_EXECUTABLE_PATH}:{}),headless:true});
 try{
  const p=await browser.newPage();
  await p.route('https://www.zhihu.com/**',r=>r.fulfill({contentType:'text/html; charset=utf-8',body:`<main>
  <h1 class="QuestionHeader-title">如何理解这个架构？</h1>
  <div class="QuestionRichText"><div class="RichText">需要说明模块边界。</div><button onclick="this.remove()">显示全部</button></div>
  <form class="AnswerForm"><button type="button" aria-label="图片" onclick="window.images++"></button><div id="editor" class="public-DraftEditor-content" contenteditable="true" onpaste="event.preventDefault();this.innerHTML=event.clipboardData.getData('text/html')"></div>
  <div id="settings" hidden><div><label>创作声明</label><button type="button" role="combobox" id="Popover12-toggle" aria-expanded="false" onclick="this.setAttribute('aria-expanded','true');document.querySelector('#Popover12-content').hidden=false">无声明</button></div><div><label>一句话介绍</label><span class="ztext">原有介绍</span><div onclick="document.querySelector('.Modal').hidden=false;setTimeout(()=>document.querySelector('.TopicBioItem-modifyButton').hidden=false,250)">修改<svg class="Zi--Edit"></svg></div></div><label for="gift">开启送礼物</label><input type="radio" id="gift" name="gift" onclick="if(!window.accepted){event.preventDefault();document.querySelector('.RewardForm-rewardModal').hidden=false}"></div></form>
  <button type="button" onclick="document.querySelector('#settings').hidden=false">发布设置</button>
  <button type="button" onclick="window.published++">发布回答</button></main>
  <div id="Popover12-content" role="listbox" hidden><button type="button" role="option" onclick="const toggle=document.querySelector('#Popover12-toggle');toggle.textContent=this.textContent;toggle.setAttribute('aria-expanded','false');this.parentElement.hidden=true">包含剧透</button></div>
  <div id="unrelated"><button type="button" role="option" onclick="window.published++">包含剧透</button></div>
  <div class="Modal" hidden>编辑话题经验<div class="TopicBioItems"><div class="TopicBioItem"><button class="TopicBioItem-modifyButton" hidden onclick="this.hidden=true;document.querySelector('#intro').hidden=false">修改</button><input id="intro" placeholder="一句话介绍" value="原有介绍" hidden><button onclick="window.saved++">保存</button></div><div class="TopicBioItem"><button class="TopicBioItem-modifyButton" onclick="window.saved++">修改</button></div></div><button onclick="this.parentElement.hidden=true">关闭</button></div>
  <div class="RewardForm-rewardModal" hidden>知乎赞赏功能使用协议<button onclick="window.accepted++;document.querySelector('#gift').checked=true;this.parentElement.hidden=true">确定</button></div>
  <script>window.images=0;window.saved=0;window.accepted=0;window.published=0;window.pending=[];Object.defineProperty(window,'chrome',{value:{runtime:{sendMessage(m){return new Promise(resolve=>pending.push({m,resolve}));}}}});</script>`}));
  await p.goto('https://www.zhihu.com/question/'+id);
  for(const file of ['zhihu-answer.js','zhihu-content.js'])await p.addScriptTag({path:path.join(__dirname,file)});
  const run=p.getByRole('button',{name:'AI 生成知乎回答'});
  const finish=()=>p.evaluate(draft=>pending.at(-1).resolve({ok:true,draft}),zhihu.parse(answer));
  await run.click();await p.waitForFunction(()=>pending.length===1);
  assert.deepEqual(await p.evaluate(()=>pending[0].m.item),item);
  await finish();
  await p.getByRole('status').getByText(/确认送礼物协议/).waitFor();
  assert.equal(await p.locator('#Popover12-toggle').innerText(),'包含剧透');
  assert.equal(await p.evaluate(()=>accepted),0);
  assert.equal(await p.locator('#gift').isChecked(),false);
  await p.getByRole('button',{name:'确定',exact:true}).click();
  await p.getByRole('button',{name:'填写一句话介绍'}).click();
  await p.locator('#intro').waitFor({state:'visible',timeout:4000});
  await p.locator('#comment-ai-zhihu [role=status]').getByText(/一句话介绍已填写/).waitFor();
  assert.match(await p.locator('#editor').innerText(),/正文第一段。\s+正文第二段。/);
  assert.equal(await p.locator('#intro').inputValue(),zhihu.parse(answer).intro);
  assert.match(await p.locator('#comment-ai-zhihu-intro-guide').innerText(),/「保存」，再点「完成」/);
  assert.equal(await p.locator('#gift').isChecked(),true);
  assert.equal(await p.evaluate(()=>saved),0);
  await p.getByRole('button',{name:'关闭',exact:true}).click();
  await p.locator('.TopicBioItem').first().evaluate(card=>{card.querySelector('input').hidden=true;card.querySelector('button').disabled=true;});
  await p.getByRole('button',{name:'填写一句话介绍'}).click();
  const guide=p.locator('#comment-ai-zhihu-intro-guide');
  await guide.getByText(/未找到可用的简介编辑按钮/).waitFor({timeout:6000});
  assert.match(await guide.innerText(),/建议简介：先看边界再讨论可行性/);
  assert.equal(await p.evaluate(()=>saved),0);
  await p.getByRole('button',{name:'关闭',exact:true}).click();
  await p.locator('#Popover12-toggle').evaluate(e=>{e.textContent='无声明';e.setAttribute('aria-controls','Popover12-content');});
  const existingBody=await p.locator('#editor').innerText();
  await p.getByRole('button',{name:'设为包含剧透'}).click();
  await p.getByRole('status').getByText('创作声明已设为「包含剧透」',{exact:true}).waitFor();
  assert.equal(await p.locator('#Popover12-toggle').innerText(),'包含剧透');
  assert.equal(await p.locator('#editor').innerText(),existingBody);
  assert.equal(await p.evaluate(()=>pending.length),1);
  await p.getByRole('button',{name:'插入图片'}).click();assert.equal(await p.evaluate(()=>images),1);
  await p.locator('#editor').fill('');await run.click();await p.waitForFunction(()=>pending.length===2);
  await p.locator('#editor').fill('手写草稿');await finish();
  await p.getByRole('status').getByText(/原编辑区已变化/).waitFor();
  assert.equal(await p.locator('#editor').innerText(),'手写草稿');
  await p.locator('#editor').fill('');await run.click();await p.waitForFunction(()=>pending.length===3);
  await p.evaluate(()=>history.pushState({},'','/question/777'));await finish();
  assert.equal((await p.locator('#editor').innerText()).trim(),'');
  assert.equal(await p.evaluate(()=>published),0);
 }finally{await browser.close();}
});
