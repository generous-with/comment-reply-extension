module.exports=()=>`<!doctype html><meta charset="utf-8"><body>
<div class="info-title-text-QsVcuc">OpenClaw 367 次提交，专治升级翻车：Node 达标才更新 #开源项目</div>
<div class="composer-XoMZWL" id="top-composer"><div class="editable-input-_mF1vt" contenteditable="true" data-placeholder="有爱评论，说点好听的~"></div><button disabled>发送</button></div>
<div id="comments"></div><script>
window.published=0;window.requests=[];window.delay=0;window.modelReply='先看看是不是上下文带得太多了，也可以对比一下新旧版本同一个任务的消耗。';window.responseError=false;
window.chrome={runtime:{sendMessage:async m=>{if(m.type==='settings')return {ok:true};requests.push(m);await new Promise(r=>setTimeout(r,delay));return responseError?{ok:false,error:'API 请求失败（HTTP 401）'}:{ok:true,text:modelReply};}}};
function add(id,comment,parent){
 const row=document.createElement('div');row.id=id;row.className='comment-item-o85vW5';row.innerHTML='<div class="comment-main-YV_lqD"><div class="username-AHNP_w">读者'+id+'</div><div class="time-qUi7iL">8小时前</div><div class="text-uG7vGS"></div><div class="comment-operation-wrap-lc52eY"><div class="operations-AVKfA7"><button type="button" class="operation-eC1t7Q"><span>回复</span></button><button class="operation-eC1t7Q">删除</button></div></div></div>';row.querySelector('.text-uG7vGS').textContent=comment;
 const ops=row.querySelector('.comment-operation-wrap-lc52eY');row.querySelector('button').onclick=()=>{const old=ops.querySelector('.composer-XoMZWL');if(old){old.remove();return;}const composer=document.createElement('div');composer.className='composer-XoMZWL compact-yiU5He';composer.innerHTML='<div contenteditable="true" class="editable-input-_mF1vt" data-placeholder="回复读者："></div><button disabled>发送</button>';ops.append(composer);composer.querySelector('[contenteditable]').oninput=e=>{row.dataset.reactHtml=e.currentTarget.innerHTML;composer.querySelector('button').disabled=!e.currentTarget.textContent.trim();};composer.querySelector('button').onclick=()=>window.published++;};
 (parent||document.querySelector('#comments')).append(row);return row;
}
const parent=add('a','只有我感觉这版本超级费token吗？长任务做得比以前更好，对话不如以前了');add('b','升级时提示 Node 版本不够');const replies=document.createElement('div');parent.querySelector('.comment-main-YV_lqD').append(replies);add('child','我这边也是这个情况',replies);
</script></body>`;
