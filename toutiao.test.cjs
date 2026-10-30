const {test}=require('node:test');const assert=require('node:assert/strict');const path=require('node:path');
test('Toutiao: full title, matching selected panel, manual edit and stale-context protection',async()=>{
 const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
 const browser=await chromium.launch({...(process.env.BROWSER_EXECUTABLE_PATH?{executablePath:process.env.BROWSER_EXECUTABLE_PATH}:{}),headless:true});
 try{
  const page=await browser.newPage();
  await page.route('https://mp.toutiao.com/**',r=>r.fulfill({contentType:'text/html; charset=utf-8',body:`<!doctype html><body><div id="list"></div><div class="sub-comment-col"></div><script>
  window.requests=[];window.published=0;window.delay=0;
  window.chrome={runtime:{sendMessage:async m=>{if(m.type==='settings')return {ok:true};requests.push(m);await new Promise(r=>setTimeout(r,window.delay));return {ok:true,text:'先看看报错里具体是哪个参数，贴一下完整报错会更好定位。'};}}};
  function add(id,title,comment){const wrap=document.createElement('div');wrap.className='all-comment-item-wrap';wrap.id=id;wrap.innerHTML='<div class="comment-item"><div class="comment-item-header"><span class="comment-item-title">读者'+id+'</span><span>评论了图文《<a class="comment-item-header-extra-title"></a>》</span></div><div class="comment-item-content"></div><div class="comment-item-actions"><div class="comment">回复</div></div></div>';wrap.querySelector('a').textContent=title.slice(0,10)+'…';wrap.querySelector('a').title=title;wrap.querySelector('.comment-item-content').textContent=comment;
  wrap.querySelector('.comment').onclick=()=>{document.querySelectorAll('.all-comment-item-wrap').forEach(e=>e.classList.remove('select'));wrap.classList.add('select');const copy=wrap.querySelector('.comment-item').cloneNode(true);copy.querySelectorAll('.toutiao-ai-draft-status').forEach(e=>e.remove());const panel=document.createElement('div');panel.className='comment-item-reply-box-wrap comment-item-reply-box-showed';panel.innerHTML='<div class="reply-box"><textarea class="byte-textarea"></textarea><button>发布</button></div>';copy.append(panel);document.querySelector('.sub-comment-col').replaceChildren(copy);panel.querySelector('textarea').oninput=e=>copy.dataset.reactValue=e.target.value;panel.querySelector('button').onclick=()=>window.published++;};document.querySelector('#list').append(wrap);}
  add('a','开源仓库25.7万Star！Hermes出手修复配置问题','这次更新导致原来的设置不能用，因为参数错误');add('b','Python 环境安装指南','依赖一直装不上');</script></body>`}));
  await page.goto('https://mp.toutiao.com/profile_v4/manage/comment/all?enter_from=left_menu');
  await page.addScriptTag({path:path.join(__dirname,'toutiao-content.js')});
  await page.locator('#a .comment-item-actions .comment').click();
  await page.getByText('AI 回复已填入，请审核后手动发布',{exact:true}).waitFor();
  let item=await page.evaluate(()=>requests[0].item);
  assert.equal(item.comment,'这次更新导致原来的设置不能用，因为参数错误');assert.equal(item.workTitle,'开源仓库25.7万Star！Hermes出手修复配置问题');assert.equal(item.titleTruncated,false);assert.equal(item.platform,'今日头条');
  assert.equal(await page.locator('.sub-comment-col .comment-item').getAttribute('data-react-value'),await page.locator('.sub-comment-col textarea').inputValue());
  await page.evaluate(()=>window.delay=350);await page.locator('#b .comment-item-actions .comment').click();
  await page.locator('.sub-comment-col textarea').fill('保留我手写的回复');
  await page.getByText('你已编辑输入框，已保留你的内容',{exact:true}).waitFor();
  assert.equal(await page.locator('.sub-comment-col textarea').inputValue(),'保留我手写的回复');
  await page.evaluate(()=>window.delay=0);
  // The full title may genuinely be unavailable; mark visible truncated text.
  await page.locator('#a a').evaluate(e=>e.removeAttribute('title'));
  await page.locator('#a .comment-item-actions .comment').click();
  await page.getByText('AI 回复已填入，请审核后手动发布（作品标题不完整）',{exact:true}).waitFor();
  item=await page.evaluate(()=>requests.at(-1).item);assert.equal(item.titleTruncated,true);
  assert.equal(await page.evaluate(()=>published),0);
  // A delayed response must not be filled after that comment's title changes.
  await page.evaluate(()=>window.delay=350);await page.locator('#b .comment-item-actions .comment').click();
  await page.locator('#b a').evaluate(e=>e.title='另一个作品');
  await page.waitForTimeout(450);assert.equal(await page.locator('.sub-comment-col textarea').inputValue(),'');
  assert.equal(await page.evaluate(()=>published),0);
 }finally{await browser.close();}
});
