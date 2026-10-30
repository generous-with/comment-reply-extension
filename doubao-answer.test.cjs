const {test}=require('node:test');const assert=require('node:assert/strict');const {extract}=require('./doubao-answer.js');
test('actual reported fullwidth-colon answer is extracted with strict request identity',()=>{
 const id='443cf3d19cf143949fde6ccccc371f75';const body='目前确实是针对 Apple Silicon 做的优化，跨平台适配还要处理底层指令集差异。NAS 这边暂时没法直接跑，有点可惜。';
 assert.equal(extract('【评论回复：'+id+'】 '+body+' 【结束：'+id+'】',id),body);
 assert.equal(extract('【 评论回复 : '+id+' 】\n内容：保留全角符号\n【 结束 ： '+id+' 】',id),'内容：保留全角符号');
 assert.equal(extract('【评论回复:'+id+'】回答【结束:'+id+'】',id),'回答');
 assert.equal(extract('【评论回复：'+id+'】尚在生成',id),null);
 assert.equal(extract('【评论回复：'+id+'】旧内容【结束：'+id+'】','a'.repeat(32)),null);
});
