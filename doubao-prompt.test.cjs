const {test}=require('node:test');const assert=require('node:assert/strict');
const core=require('./ai-core.js');const {build}=require('./doubao-prompt.js');
test('Doubao web prompt reuses professional natural style and full comment context without API configuration',()=>{
 const config={context:'本项目升级要求 Node 版本达标。',maxChars:240,apiKey:'must-not-leak',baseUrl:'must-not-leak-url'};
 const prompt=build(core,config,{platform:'抖音',workId:'7000000000000000001',workTitle:'OpenClaw 更新说明',comment:'这版为什么费token',reference:'原评论引用'});
 assert.ok(prompt.includes('OpenClaw 更新说明'));assert.ok(prompt.includes('这版为什么费token'));assert.ok(prompt.includes('7000000000000000001'));assert.ok(prompt.includes(config.context));assert.ok(prompt.includes('不要每条都以'));assert.ok(prompt.includes('不得将通用原理说成该项目的实际机制'));assert.ok(prompt.includes('不沿用会话里其他评论'));
 assert.ok(!prompt.includes('must-not-leak'));assert.throws(()=>build(core,{...config,maxChars:0},{comment:'x'}));
 const other=build(core,config,{platform:'今日头条',workTitle:'Hermes 更新',comment:'参数报错'});assert.ok(other.includes('Hermes 更新'));assert.ok(!other.includes('OpenClaw 更新说明'));
 const token='a'.repeat(32);const tagged=build(core,config,{comment:'测试'},token);assert.ok(!tagged.includes('【评论回复:'+token+'】'));assert.ok(!tagged.includes('【结束:'+token+'】'));
});
