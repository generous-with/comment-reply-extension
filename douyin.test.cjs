const {test}=require('node:test');const assert=require('node:assert/strict');const path=require('node:path');
test('Douyin detail: per-comment contenteditable, work context, nested replies and no global posting',async()=>{
 const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
 const browser=await chromium.launch({...(process.env.BROWSER_EXECUTABLE_PATH?{executablePath:process.env.BROWSER_EXECUTABLE_PATH}:{}),headless:true});
 try{
  const page=await browser.newPage();await page.route('https://creator.douyin.com/**',r=>r.fulfill({contentType:'text/html; charset=utf-8',body:require('./douyin.fixture.cjs')()}));
  await page.goto('https://creator.douyin.com/creator-micro/work-management/work-detail/7000000000000000001?tabKey=commentManagement');
  await page.addScriptTag({path:path.join(__dirname,'douyin-content.js')});
  const reply=id=>page.locator('#'+id+' > .comment-main-YV_lqD > .comment-operation-wrap-lc52eY .operations-AVKfA7 button').first();
  const editor=id=>page.locator('#'+id+' > .comment-main-YV_lqD > .comment-operation-wrap-lc52eY [contenteditable]');
  await reply('a').click();await page.locator('#a > .comment-main-YV_lqD > .douyin-ai-draft-status').getByText('AI 回复已填入',{exact:false}).waitFor();
  let item=await page.evaluate(()=>requests[0].item);assert.equal(item.workId,'7000000000000000001');assert.equal(item.platform,'抖音');assert.ok(item.workTitle.startsWith('OpenClaw 367'));assert.ok(item.comment.includes('费token'));assert.ok(!item.comment.includes('我这边也是'));
  assert.equal(await page.locator('#top-composer [contenteditable]').textContent(),'');assert.ok((await page.locator('#a').getAttribute('data-react-html')).includes('上下文'));assert.equal(await page.locator('#a > .comment-main-YV_lqD > .comment-operation-wrap-lc52eY .composer-XoMZWL button').isEnabled(),true);
  await reply('a').click();assert.equal(await page.evaluate(()=>requests.length),1);
  await reply('child').click();await page.locator('#child .douyin-ai-draft-status').getByText('AI 回复已填入',{exact:false}).waitFor();item=await page.evaluate(()=>requests.at(-1).item);assert.equal(item.comment,'我这边也是这个情况');assert.equal(await editor('a').count(),0);
  await page.evaluate(()=>window.delay=350);await reply('b').click();await editor('b').fill('我自己写的回复');await page.locator('#b .douyin-ai-draft-status').getByText('你已编辑回复框',{exact:false}).waitFor();assert.equal(await editor('b').textContent(),'我自己写的回复');
  await reply('b').click();await page.evaluate(()=>{window.delay=0;window.modelReply='x'.repeat(501);});await reply('b').click();await page.locator('#b .douyin-ai-draft-status').getByText('500字限制',{exact:false}).waitFor();assert.equal(await editor('b').textContent(),'');
  await reply('b').click();await page.evaluate(()=>{window.delay=350;window.modelReply='回复内容';});await reply('b').click();
  await page.evaluate(()=>{history.pushState({},'', '/creator-micro/work-management/work-detail/8800000000000000000?tabKey=commentManagement');document.querySelector('.info-title-text-QsVcuc').textContent='另一篇稿件';});await page.waitForTimeout(450);assert.equal(await editor('b').textContent(),'');
  // The same script also handles another work ID without being rebound to the initial URL.
  await reply('b').click();await page.evaluate(()=>window.delay=0);await reply('b').click();await page.locator('#b .douyin-ai-draft-status').getByText('AI 回复已填入',{exact:false}).waitFor();item=await page.evaluate(()=>requests.at(-1).item);assert.equal(item.workId,'8800000000000000000');assert.equal(item.workTitle,'另一篇稿件');
  assert.equal(await page.evaluate(()=>published),0);assert.equal(await page.locator('#top-composer [contenteditable]').textContent(),'');
 }finally{await browser.close();}
});
