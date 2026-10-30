// Shared prompt for the Doubao web backend; excludes API credentials.
(function(root){
  const persona='你是一个AI大模型开发、运维专家。接下来会有一些用户在某些方面的评论，你需要根据用户的评论给出相应的回复。精简不啰嗦，字数不要过多，用1到3句话表达，让用户感受到你的专业；回答不要太人机，一定要像自然的评论区回复。';
  function build(core,config,item,token){
    if(!Number.isInteger(config.maxChars)||config.maxChars<50||config.maxChars>1000)throw Error('回复长度应为 50–1000 字');
    if(typeof config.context!=='string'||config.context.length>20000)throw Error('作者知识背景最多 20000 字');
    const messages=core.messages(config,item);
    let prompt=persona+'\n'+messages[0].content+'\n\n以下是本条评论的独立上下文。仅根据本条上下文回复，不沿用会话里其他评论的项目、作者或技术结论。\n'+messages[1].content;
    if(token){if(!/^[a-f0-9]{32}$/.test(token))throw Error('请求标识错误');prompt+='\n为让扩展准确取回本次最终回复，请仅在最终回复外包裹标记：前缀由“【评论回复:”加请求标识再加“】”拼成，后缀由“【结束:”加同一标识再加“】”拼成。不要在思考过程或示例里输出标记。请求标识：'+token;}
    return prompt;
  }
  const api={build,persona};root.DoubaoPrompt=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
