const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');
test('Doubao owned conversation creation, reuse, closed-tab recovery and no API dependency',async()=>{
 const state={},tabs=new Map();let created=0,lastPrompt,injected=0;
 const chrome={storage:{local:{get:async()=>state,set:async x=>Object.assign(state,x)}},tabs:{get:async id=>{if(!tabs.has(id))throw Error('closed');return tabs.get(id);},create:async x=>{created++;const t={id:created,url:x.url};tabs.set(t.id,t);return t;},update:async(id,x)=>({id,...x}),query:async()=>[],sendMessage:async(id,m)=>{if(m.type==='doubaoPing')return {ok:true};lastPrompt=m.prompt;tabs.get(id).url='https://www.doubao.com/chat/5678';return {ok:true,text:'回复内容',url:tabs.get(id).url};}}};
 const version=require('./manifest.json').version;
 chrome.runtime={getManifest:()=>({version})};chrome.scripting={executeScript:async()=>{injected++;}};
 const send=chrome.tabs.sendMessage;chrome.tabs.sendMessage=async(id,m)=>m.type.startsWith('doubaoPing:')?{ok:true,version:injected?version:'0.5.1'}:send(id,m);
 const ctx={chrome,URL,crypto:require('node:crypto').webcrypto,ReplyAI:require('./ai-core.js'),DoubaoPrompt:require('./doubao-prompt.js'),setInterval:()=>1,clearInterval:()=>{},setTimeout};vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/doubao-worker.js','utf8'),ctx);
 const c={provider:'doubao',doubaoUrl:'',context:'',maxChars:240};
 assert.equal(await ctx.generateWithDoubao(c,{comment:'怎么升级？'}),'回复内容');assert.equal(created,1);assert.ok(lastPrompt.includes('开发、运维专家'));assert.equal(state.doubaoBinding.configured,'https://www.doubao.com/chat/');assert.equal(state.aiConfig,undefined);
 assert.ok(injected>=1,'stale bridge must be upgraded before submitting the task');
 await ctx.generateWithDoubao(c,{comment:'哪个版本？'});assert.equal(created,1);
 tabs.clear();await ctx.generateWithDoubao(c,{comment:'报错了'});assert.equal(created,2);assert.equal(state.doubaoBinding.url,'https://www.doubao.com/chat/5678');
 await assert.rejects(ctx.generateWithDoubao({...c,doubaoUrl:'https://evil.example/chat/123'},{comment:'x'}),/会话地址/);
});
