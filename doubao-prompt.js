// Shared prompt for the Doubao web backend; excludes API credentials.
(function(root){
  function build(core,config,item,token,job){
    if(!Number.isInteger(config.maxChars)||config.maxChars<50||config.maxChars>1000)throw Error('回复长度应为 50–1000 字');
    if(typeof config.context!=='string'||config.context.length>20000)throw Error('作者知识背景最多 20000 字');
    const messages=job?.messages??core.messages(config,item);
    const context=job?'以下是本次知乎问题的独立上下文，不沿用会话里的其他问题或评论。':'以下是本条评论的独立上下文。仅根据本条上下文回复，不沿用会话里其他评论的项目、作者或技术结论。';
    let prompt=messages[0].content+'\n\n'+context+'\n'+messages[1].content;
    if(token){if(!/^[a-f0-9]{32}$/.test(token))throw Error('请求标识错误');prompt+='\n为让扩展准确取回本次最终回复，请仅在最终回复外包裹标记：前缀由“【评论回复:”加请求标识再加“】”拼成，后缀由“【结束:”加同一标识再加“】”拼成。不要在思考过程或示例里输出标记。请求标识：'+token;}
    return prompt;
  }
  const api={build};root.DoubaoPrompt=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
