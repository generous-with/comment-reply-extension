(function(root){
 function extract(text,token){
  if(typeof text!=='string'||!/^[a-f0-9]{32}$/i.test(token))return null;
  const space='[\\s\\u200b\\u200c\\u200d\\ufeff]*';
  const marker=label=>new RegExp('【'+space+label+space+'[:：]'+space+token+space+'】','i');
  const start=marker('评论回复').exec(text);if(!start)return null;
  const rest=text.slice(start.index+start[0].length);const end=marker('结束').exec(rest);if(!end)return null;
  return rest.slice(0,end.index).trim()||null;
 }
 const api={extract};root.DoubaoAnswer=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
