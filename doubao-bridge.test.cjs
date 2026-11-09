const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const token='a'.repeat(32);

function fixture(answer){
 let listener,now=0,sent=false,panel;
 const input={tagName:'TEXTAREA',value:'',isConnected:true,getClientRects:()=>[{}],focus(){},dispatchEvent(){}};
 const stop={getClientRects:()=>sent?[{}]:[]};
 const send={getClientRects:()=>[{}],getAttribute:()=>null,click(){sent=true;input.value='';}};
 const bubble={textContent:answer,innerText:answer,getClientRects:()=>[{}],closest:()=>null};
 const document={getElementById:()=>panel,createElement:()=>({setAttribute(){},style:{}}),documentElement:{append(el){panel=el;}},
  querySelectorAll(selector){
   if(selector.startsWith('textarea'))return [input];
   if(selector.includes('local_break'))return [stop];
   if(selector.includes('send_button'))return [send];
   return sent?[bubble]:[];
  }};
 const chrome={runtime:{id:'fixture',getManifest:()=>({version:'fixture'}),onMessage:{addListener(f){listener=f;}}}};
 const ctx={document,chrome,location:{pathname:'/chat/1',href:'https://www.doubao.com/chat/1'},getComputedStyle:()=>({visibility:'visible'}),
  HTMLTextAreaElement:function(){},Event:function(){},DoubaoAnswer:require('./doubao-answer.js'),Date:{now:()=>now},
  setInterval(fn,ms){const timer={};const tick=()=>{if(timer.stopped)return;now+=ms;fn();setImmediate(tick);};setImmediate(tick);return timer;},
  clearInterval(timer){timer.stopped=true;}};
 Object.defineProperty(ctx.HTMLTextAreaElement.prototype,'value',{set(value){this.value=value;}});
 vm.runInNewContext(fs.readFileSync(__dirname+'/doubao-content.js','utf8'),ctx);
 return ()=>new Promise(resolve=>listener({type:'doubaoRun:fixture',token,prompt:'测试提示词',maxChars:240},{id:'fixture'},resolve));
}

test('A stable, complete response for this request is returned despite a stale stop control',async()=>{
 const run=fixture('【评论回复：'+token+'】核对错误日志。\n【结束：'+token+'】');
 const result=await run();assert.equal(result.ok,true);assert.equal(result.text,'核对错误日志。');
});

test('Partial or unrelated text is never returned and the timeout identifies missing markers',async()=>{
 const run=fixture('【评论回复：'+token+'】仍缺结束标记');
 const result=await run();assert.equal(result.ok,false);assert.match(result.error,/未找到本次完整回答标记/);
});
