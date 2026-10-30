const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const path=require('node:path');const fs=require('node:fs');
const http=require('node:http');const assert=require('node:assert/strict');
(async()=>{
 let received,apiCalls=0;
 const server=http.createServer((req,res)=>{let body='';req.on('data',x=>body+=x);req.on('end',()=>{apiCalls++;received={url:req.url,auth:req.headers.authorization,body:JSON.parse(body)};res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({choices:[{message:{content:'通常需要按模型名和显式配置选择路由，具体以项目实现为准。'}}]}));});});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 // Headless Edge cannot confirm its browser-chrome optional permission bubble.
 // Predeclare ONLY the local fixture origin in an isolated test copy, never in the release.
 const fixtureDir=path.join(__dirname,'evidence','test-extension');fs.mkdirSync(fixtureDir,{recursive:true});
 for(const file of ['ai-core.js','ai-background.js','ai-content.js','toutiao-content.js','douyin-content.js','doubao-prompt.js','doubao-worker.js','doubao-answer.js','doubao-content.js','settings.html','settings.js','options.css'])fs.copyFileSync(path.join(__dirname,file),path.join(fixtureDir,file));
 const fixtureManifest=JSON.parse(fs.readFileSync(path.join(__dirname,'manifest.json'),'utf8'));fixtureManifest.host_permissions=[...(fixtureManifest.host_permissions||[]),'http://127.0.0.1/*'];fs.writeFileSync(path.join(fixtureDir,'manifest.json'),JSON.stringify(fixtureManifest));
 // Deliberately disable automatic Doubao injection in the test copy. The real worker
 // must recover the missing bridge through scripting.executeScript before sending.
 fixtureManifest.content_scripts=fixtureManifest.content_scripts.filter(x=>!x.matches.some(m=>m.includes('doubao.com')));fs.writeFileSync(path.join(fixtureDir,'manifest.json'),JSON.stringify(fixtureManifest));
 const profile=fs.mkdtempSync(path.join(__dirname,'evidence','edge-smoke-'));
 const browser=await chromium.launchPersistentContext(profile,{...(process.env.EDGE_EXECUTABLE_PATH?{executablePath:process.env.EDGE_EXECUTABLE_PATH}:{channel:'msedge'}),headless:true,ignoreDefaultArgs:['--disable-extensions'],args:['--disable-extensions-except='+fixtureDir,'--load-extension='+fixtureDir]});
 try{
  const worker=browser.serviceWorkers()[0]||await browser.waitForEvent('serviceworker',{timeout:15000});
  const id=new URL(worker.url()).hostname;
  await worker.evaluate(()=>chrome.runtime.onMessage.addListener((m,s)=>{globalThis.testSender={id:s.id,url:s.url,tab:!!s.tab};}));
  const page=await browser.newPage();await page.goto('chrome-extension://'+id+'/settings.html');
  await page.getByRole('heading',{name:'AI 评论回复助手',exact:true}).waitFor();
  await page.screenshot({path:path.join(__dirname,'evidence','settings.png'),fullPage:true});
  const manifest=await worker.evaluate(()=>chrome.runtime.getManifest());
  if(manifest.version!==fixtureManifest.version)throw Error('Wrong version');
  await page.locator('#provider').selectOption('api');
  await page.locator('#baseUrl').fill('http://127.0.0.1:'+server.address().port+'/v1');
  await page.locator('#model').fill('fixture-model');await page.locator('#apiKey').fill('fixture-key');
  await page.getByRole('button',{name:'保存并授权 API 域名'}).click();
  await page.waitForFunction(()=>document.getElementById('status').textContent.includes('已保存。'),{},{timeout:5000}).catch(async e=>{console.log('SAVE STATUS:',await page.locator('#status').textContent());console.log('CONFIGURED:',await worker.evaluate(async()=>{const {aiConfig}=await chrome.storage.local.get('aiConfig');return !!aiConfig;}));throw e;});
  await page.getByRole('button',{name:'测试连接',exact:true}).click();
  await page.waitForFunction(()=>document.getElementById('status').textContent.includes('连接成功。'),{},{timeout:5000}).catch(async e=>{console.log('TEST STATUS:',await page.locator('#status').textContent());console.log('API REQUEST RECEIVED:',!!received);console.log('SENDER',await worker.evaluate(()=>({last:globalThis.testSender,own:chrome.runtime.id,url:chrome.runtime.getURL('settings.html')})));console.log('RUNTIME',await page.evaluate(async()=>{try{return await chrome.runtime.sendMessage({type:'test'});}catch(e){return {error:e.message};}}));throw e;});
  assert.equal(received.url,'/v1/chat/completions');assert.equal(received.auth,'Bearer fixture-key');
  const comments=await browser.newPage();
  await comments.route('https://message.bilibili.com/**',route=>route.fulfill({contentType:'text/html; charset=utf-8',body:`<div class="interaction-item"><div class="interaction-item__right"><p class="interaction-item__msg">DeepSeek 引擎和其他模型如何选择路由？</p><div class="interaction-item__btn reply"><span>回复</span></div></div></div><script>window.published=0;document.querySelector('.reply').onclick=()=>{const panel=document.createElement('div');panel.className='interaction-item__panel';panel.innerHTML='<textarea class="message-reply-box__input"></textarea><button class="message-reply-box__pub">发表评论</button>';document.querySelector('.interaction-item__right').append(panel);panel.querySelector('button').onclick=()=>window.published++;};</script>`}));
  await comments.goto('https://message.bilibili.com/#/reply');
  await comments.locator('.reply').click();
  await comments.getByText('AI 回复已填入，请审核后点击“发表评论”',{exact:true}).waitFor({timeout:15000});
  assert.ok((await comments.locator('textarea').inputValue()).includes('模型名'));
  assert.equal(JSON.parse(received.body.messages[1].content).comment,'DeepSeek 引擎和其他模型如何选择路由？');
  assert.equal(await comments.evaluate(()=>window.published),0);
  await comments.screenshot({path:path.join(__dirname,'evidence','autofill.png'),fullPage:true});
  const tt=await browser.newPage();
  await tt.route('https://mp.toutiao.com/**',route=>route.fulfill({contentType:'text/html; charset=utf-8',body:`<div class="comment-item"><div class="comment-item-header"><span class="comment-item-title">筑墨成书</span>评论了图文《<a class="comment-item-header-extra-title" title="开源仓库25.7万Star！Hermes出手修复配置问题">开源仓库25.7万Star！Hermes出手…</a>》</div><div class="comment-item-content">这次更新导致很多大模型原来的设置不能用，因为参数错误</div><div class="comment-item-actions"><div class="comment">回复</div></div><div class="comment-item-reply-box-wrap" hidden><textarea class="byte-textarea"></textarea><button>发布</button></div></div><script>window.published=0;document.querySelector('.comment-item-actions .comment').onclick=()=>{const el=document.querySelector('.comment-item-reply-box-wrap');el.hidden=false;el.classList.add('comment-item-reply-box-showed');};document.querySelector('button').onclick=()=>window.published++;</script>`}));
  await tt.goto('https://mp.toutiao.com/profile_v4/manage/comment/all?enter_from=left_menu');await tt.locator('.comment-item-actions .comment').click();
  await tt.getByText('AI 回复已填入，请审核后手动发布',{exact:true}).waitFor({timeout:15000});
  const ttItem=JSON.parse(received.body.messages[1].content);
  assert.equal(ttItem.platform,'今日头条');assert.equal(ttItem.workTitle,'开源仓库25.7万Star！Hermes出手修复配置问题');assert.equal(ttItem.titleTruncated,false);assert.ok(ttItem.comment.includes('参数错误'));
  assert.ok(await tt.locator('textarea').inputValue());assert.equal(await tt.evaluate(()=>published),0);
  await tt.screenshot({path:path.join(__dirname,'evidence','toutiao-autofill.png'),fullPage:true});
  const dy=await browser.newPage();await dy.route('https://creator.douyin.com/**',route=>route.fulfill({contentType:'text/html; charset=utf-8',body:require('./douyin.fixture.cjs')()}));
  await dy.goto('https://creator.douyin.com/creator-micro/work-management/work-detail/7000000000000000001?tabKey=commentManagement');
  await dy.locator('#a > .comment-main-YV_lqD > .comment-operation-wrap-lc52eY .operations-AVKfA7 button').first().click();
  await dy.locator('#a > .comment-main-YV_lqD > .douyin-ai-draft-status').getByText('AI 回复已填入',{exact:false}).waitFor({timeout:15000});
  const dyItem=JSON.parse(received.body.messages[1].content);assert.equal(dyItem.platform,'抖音');assert.equal(dyItem.workId,'7000000000000000001');assert.ok(dyItem.workTitle.startsWith('OpenClaw 367'));assert.ok(dyItem.comment.includes('费token'));
  assert.ok(await dy.locator('#a > .comment-main-YV_lqD > .comment-operation-wrap-lc52eY [contenteditable]').textContent());assert.equal(await dy.locator('#top-composer [contenteditable]').textContent(),'');assert.equal(await dy.evaluate(()=>published),0);
  await dy.screenshot({path:path.join(__dirname,'evidence','douyin-autofill.png'),fullPage:true});
  const beforeDoubao=apiCalls;
  await browser.route('https://www.doubao.com/chat/**',route=>route.fulfill({contentType:'text/html; charset=utf-8',body:`<!doctype html><textarea data-testid="chat_input_input"></textarea><button data-testid="chat_input_send_button">发送</button><button data-testid="chat_input_local_break_button" style="display:none">停止</button><div id="answers"><p>旧回答，不可用于新评论</p></div><script>window.sentPrompts=[];document.querySelector('[data-testid="chat_input_send_button"]').onclick=()=>{const input=document.querySelector('textarea');const prompt=input.value;sentPrompts.push(prompt);const token=prompt.match(/请求标识：([a-f0-9]{32})/)[1];input.value='';const stop=document.querySelector('[data-testid="chat_input_local_break_button"]');stop.style.display='block';const p=document.createElement('p');document.getElementById('answers').append(p);p.textContent='【评论回复：'+token+'】先对一下 Node 的版本。';setTimeout(()=>{p.textContent+='这类升级报错可以先贴一下完整日志。【结束：'+token+'】';stop.style.display='none';},250);};</script>`}));
  await page.bringToFront();await page.locator('#provider').selectOption('doubao');await page.getByRole('button',{name:'保存豆包设置'}).click();
  await page.waitForFunction(()=>document.getElementById('status').textContent.includes('已保存豆包网页版模式'));
  // Pre-open the fixture before seeding its owned-tab binding. Chrome-created tabs can
  // start navigating before Playwright attaches interception; do not use live Doubao in this test.
  const controlledDb=await browser.newPage();await controlledDb.goto('https://www.doubao.com/chat/12345678901234567');await controlledDb.locator('#answers').waitFor();
  assert.equal(await controlledDb.locator('#comment-doubao-status').count(),0);
  console.log('FIXTURE URL',controlledDb.url());
  await worker.evaluate(async()=>{const url='https://www.doubao.com/chat/12345678901234567';const tabs=await chrome.tabs.query({});const tab=tabs.find(t=>t.url===url);if(!tab)throw Error('Missing fixture tab: '+JSON.stringify(tabs.map(t=>({id:t.id,url:t.url}))));await chrome.storage.local.set({doubaoBinding:{configured:url,url,tabId:tab.id}});});
  await dy.bringToFront();await dy.locator('#b > .comment-main-YV_lqD > .comment-operation-wrap-lc52eY .operations-AVKfA7 button').first().click();
  await controlledDb.waitForFunction(()=>window.sentPrompts?.length===1);
  // Simulate Douyin refreshing its comment DOM while its tab is away at Doubao.
  await dy.locator('#b').evaluate(row=>{const fresh=row.cloneNode(true);fresh.querySelector('.time-qUi7iL').textContent='9小时前';row.replaceWith(fresh);window.dispatchEvent(new PopStateEvent('popstate'));});
  await dy.locator('#b .douyin-ai-draft-status').getByText('AI 回复已填入',{exact:false}).waitFor({timeout:12000}).catch(async e=>{console.log('DOUBAO STATUS',await dy.locator('#b .douyin-ai-draft-status').textContent());for(const p of browser.pages().filter(p=>p.url().includes('doubao.com')))console.log('DB',p.url(),await p.evaluate(()=>({sent:window.sentPrompts?.length,answer:document.getElementById('answers')?.innerText,input:document.querySelector('textarea')?.value.length})));throw e;});
  assert.equal(await dy.locator('#b [contenteditable]').textContent(),'先对一下 Node 的版本。这类升级报错可以先贴一下完整日志。');assert.equal(apiCalls,beforeDoubao);
  const db=browser.pages().find(p=>p.url().startsWith('https://www.doubao.com/chat/'));assert.ok(db);const prompts=await db.evaluate(()=>sentPrompts);assert.equal(prompts.length,1);assert.ok(prompts[0].includes('升级时提示 Node 版本不够'));assert.ok(prompts[0].includes('开发、运维专家'));assert.ok(!prompts[0].includes('fixture-key'));assert.equal(await dy.evaluate(()=>published),0);
  assert.ok((await db.locator('#comment-doubao-status').textContent()).includes('已取回完整回答'));
  // Keep an evidence record of the web-only route, not a real Doubao/model validation.
  fs.writeFileSync(path.join(__dirname,'evidence','doubao-smoke.json'),JSON.stringify({version:manifest.version,webPage:'controlled Doubao fixture using public input test IDs',actualExtension:true,source:'Douyin b comment',personaIncluded:true,contextIncluded:true,oldAnswerIgnored:true,completeNonceMarkerRequired:true,modelApiCalls:apiCalls-beforeDoubao,commentPublications:0},null,2));
  fs.writeFileSync(path.join(__dirname,'evidence','extension-smoke.json'),JSON.stringify({version:manifest.version,browser:'Edge headless',extensionLoaded:true,settingsRendered:true,settingsSaved:true,permission:'Local fixture host predeclared in TEST COPY only; release optional permission prompt requires manual confirmation',api:'local fixture server, not a real language model',fullExtensionAutofill:true,toutiaoTitleAndCommentInApiRequest:true,toutiaoAutofill:true,douyinWorkContextInApiRequest:true,douyinAutofill:true,douyinTopComposerUntouched:true,publicationCount:0,contentScripts:manifest.content_scripts.map(x=>x.js)},null,2));
  console.log('PASS: Edge extension, settings save, API test, service worker fetch, correct comment autofill, 0 publications. Local API permission is predeclared only in test copy.');
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
