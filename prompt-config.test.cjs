const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const core=require('./ai-core.js');
const {build}=require('./doubao-prompt.js');

test('Both backends use custom prompt, legacy and empty values use the shared default',()=>{
 const c={...core.defaults};const item={comment:'如何配置？',workTitle:'测试作品'};
 for(const value of [undefined,'','  ']){
  const config={...c,replyPrompt:value};
  assert.ok(core.messages(config,item)[0].content.startsWith(core.defaults.replyPrompt));
  assert.equal(build(core,config,item).split('你是一个AI大模型开发、运维专家').length,2);
 }
 const custom={...c,replyPrompt:'你是一位摄影师，用简洁的口吻答复。'};
 for(const text of [core.messages(custom,item)[0].content,build(core,custom,item)]){
  assert.ok(text.startsWith(custom.replyPrompt));
  assert.ok(!text.includes('你是一个AI大模型开发、运维专家'));
  assert.ok(text.includes('不得将通用原理说成该项目的实际机制'));
 }
 assert.throws(()=>build(core,{...c,replyPrompt:'x'.repeat(12001)},item),/提示词最多/);
});

test('Settings migrate old config, persist custom prompt and restore defaults without losing provider or credentials',async()=>{
 const fields={};const form={querySelector:()=>({})};
 for(const id of ['provider','baseUrl','model','apiKey','context','maxChars','enabled','doubaoUrl','replyPrompt','resetPrompt','status','test'])fields[id]={value:'',checked:false,closest:()=>({})};
 fields.form=form;
 let saved;const old={...core.defaults,provider:'doubao',apiKey:'test-only-key',doubaoUrl:'https://www.doubao.com/chat/12345'};delete old.replyPrompt;
 const ctx={document:{getElementById:id=>fields[id]},ReplyAI:core,URL,chrome:{storage:{local:{get:async()=>({aiConfig:old}),set:async x=>{saved=x.aiConfig;}}}}};
 vm.runInNewContext(fs.readFileSync(__dirname+'/settings.js','utf8'),ctx);await new Promise(setImmediate);
 assert.equal(fields.replyPrompt.value,core.defaults.replyPrompt);
 fields.replyPrompt.value='自定义回复口吻';await fields.form.onsubmit({preventDefault(){}});
 assert.equal(saved.replyPrompt,'自定义回复口吻');assert.equal(saved.apiKey,old.apiKey);assert.equal(saved.doubaoUrl,old.doubaoUrl);
 fields.resetPrompt.onclick();assert.equal(fields.replyPrompt.value,core.defaults.replyPrompt);assert.equal(saved.replyPrompt,'自定义回复口吻');
 fields.replyPrompt.value=' ';await fields.form.onsubmit({preventDefault(){}});assert.equal(saved.replyPrompt,core.defaults.replyPrompt);
});
