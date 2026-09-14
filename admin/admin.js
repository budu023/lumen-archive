
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const clone = obj => JSON.parse(JSON.stringify(obj));
const getPath = (obj, path) => path.split('.').reduce((a,k)=>a?.[k],obj);
const setPath = (obj, path, value) => { const keys=path.split('.'); let cur=obj; keys.slice(0,-1).forEach(k => cur = cur[k] ??= {}); cur[keys.at(-1)] = value; };

let data = clone(window.DEFAULT_SITE_DATA || {});
let localMode = location.protocol === 'file:';
let dirty = false;

const loginScreen = $('#loginScreen');
const app = $('#app');
const loginMsg = $('#loginMsg');
const localNotice = $('#localNotice');
const demoBtn = $('#demoBtn');
const saveBtn = $('#saveBtn');
const saveState = $('#saveState');
const modeBadge = $('#modeBadge');
const dbStatus = $('#dbStatus');

function setDirty(value=true){ dirty=value; saveState.textContent=value?'有未保存修改':'已保存'; saveState.className='save-state '+(value?'dirty':'saved'); }
function enterApp(mode='online'){
  // V3.1: robustly switch from login screen to admin app.
  loginScreen.hidden = true;
  loginScreen.setAttribute('hidden', '');
  loginScreen.style.display = 'none';

  app.hidden = false;
  app.removeAttribute('hidden');
  app.style.removeProperty('display');

  loginMsg.textContent = '';
  modeBadge.textContent = mode==='local' ? 'LOCAL DEMO' : 'ONLINE';
  modeBadge.style.color = mode==='local' ? '#f0c66a' : '#72d6aa';
  dbStatus.textContent = mode==='local' ? '本地演示' : 'D1 已连接';
  fillFields(); renderUpdates(); renderMedia(); updateCount(); checkMediaStatus();
  if(mode==='local'){ saveBtn.textContent='导出 JSON'; }
}

async function checkSession(){
  if(localMode){ localNotice.hidden=false; demoBtn.hidden=false; return; }
  try{
    const res = await fetch('/api/session',{credentials:'same-origin'});
    if(res.ok){
      const j=await res.json();
      if(j.authenticated){
        await loadRemote();
        enterApp('online');
      }
    }
  }catch(e){}
}

$('#loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  if(localMode){ loginMsg.textContent='本地文件没有服务端登录，请使用下方“进入本地界面预览”。'; return; }
  loginMsg.textContent='正在验证…';
  try{
    const res=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:$('#username').value,password:$('#password').value})});
    const j=await res.json().catch(()=>({}));
    if(!res.ok) throw new Error(j.error||'登录失败');
    loginMsg.textContent='登录成功，正在载入后台…';
    await loadRemote();
    enterApp('online');
  }catch(err){
    console.error('Admin login error:', err);
    loginMsg.textContent = err?.message || '后台载入失败，请打开开发者工具 Console 查看错误。';
  }
});
demoBtn.addEventListener('click',()=>enterApp('local'));

async function loadRemote(){
  const res=await fetch('/api/content',{headers:{Accept:'application/json'}});
  if(res.ok){ const remote=await res.json(); data=deepMerge(clone(window.DEFAULT_SITE_DATA||{}),remote); }
}
function deepMerge(base,extra){ if(!extra||typeof extra!=='object')return base; for(const [k,v] of Object.entries(extra)){ if(v&&typeof v==='object'&&!Array.isArray(v)&&base[k]&&typeof base[k]==='object') base[k]=deepMerge(base[k],v); else base[k]=v; } return base; }

function fillFields(){ $$('[data-field]').forEach(el=>{ el.value=getPath(data,el.dataset.field)??''; el.addEventListener('input',()=>{setPath(data,el.dataset.field,el.value);setDirty();},{once:false}); }); }
function renderUpdates(){
  const wrap=$('#updatesEditor'); wrap.innerHTML='';
  (data.updates||[]).forEach((u,i)=>{
    const card=document.createElement('article'); card.className='update-card';
    card.innerHTML=`<label>DATE<input value="${escapeAttr(u.date||'')}" data-u="date"></label><div class="update-text"><label>TITLE<input value="${escapeAttr(u.title||'')}" data-u="title"></label><label>DESCRIPTION<textarea rows="3" data-u="body">${escapeHtml(u.body||'')}</textarea></label></div><button class="delete-update" title="删除">×</button>`;
    card.querySelectorAll('[data-u]').forEach(el=>el.addEventListener('input',()=>{data.updates[i][el.dataset.u]=el.value;setDirty();}));
    card.querySelector('.delete-update').addEventListener('click',()=>{data.updates.splice(i,1);renderUpdates();updateCount();setDirty();});
    wrap.appendChild(card);
  });
}
function updateCount(){
  $('#updateCount').textContent=String((data.updates||[]).length).padStart(2,'0');
  const totalGallery = 5 + (data.galleryUploads||[]).length;
  const galleryCount = $('#galleryCount');
  if (galleryCount) galleryCount.textContent=String(totalGallery).padStart(2,'0');
}
$('#addUpdateBtn').addEventListener('click',()=>{ data.updates.unshift({date:new Date().toISOString().slice(0,10).replaceAll('-','.'),title:'New Update',body:'填写本次更新内容。'}); renderUpdates();updateCount();setDirty(); });

$$('.nav-item').forEach(btn=>btn.addEventListener('click',()=>{
  $$('.nav-item').forEach(b=>b.classList.remove('active'));btn.classList.add('active');
  $$('.panel').forEach(p=>p.classList.remove('active')); document.querySelector(`[data-panel-view="${btn.dataset.panel}"]`)?.classList.add('active');
  const names={overview:['DASHBOARD','概览'],home:['HOME PAGE','首页'],characters:['CHARACTERS','角色'],world:['WORLD / LORE','世界观'],gallery:['GALLERY / R2','图库管理'],updates:['CHANGELOG','更新日志'],social:['SOCIAL','社交链接'],backup:['DATA','备份']};
  $('#panelKicker').textContent=names[btn.dataset.panel]?.[0]||''; $('#panelTitle').textContent=names[btn.dataset.panel]?.[1]||'';
}));

async function persistData({quiet=false}={}){
  if(localMode){ if(!quiet) exportJson(); return true; }
  const res=await fetch('/api/content',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
  const j=await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(j.error||'保存失败');
  setDirty(false);
  return true;
}

saveBtn.addEventListener('click',async()=>{
  if(localMode){ exportJson(); return; }
  saveBtn.disabled=true; saveBtn.textContent='保存中…';
  try{
    await persistData();
    saveBtn.textContent='已保存 ✓';
    setTimeout(()=>saveBtn.textContent='保存更改',1300);
  }catch(e){ saveState.textContent=e.message;saveState.className='save-state dirty';saveBtn.textContent='保存更改'; }
  finally{saveBtn.disabled=false;}
});


// ---- V4 R2 media manager ----
const mediaFile = $('#mediaFile');
const uploadDrop = $('#uploadDrop');
const uploadPreview = $('#uploadPreview');
const uploadPlaceholder = $('#uploadPlaceholder');
const uploadStatus = $('#uploadStatus');
const uploadMediaBtn = $('#uploadMediaBtn');
let previewUrl = '';

function setUploadStatus(message, state=''){
  if(!uploadStatus) return;
  uploadStatus.textContent = message;
  uploadStatus.dataset.state = state;
}
function showSelectedFile(file){
  if(!file) return;
  if(previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = URL.createObjectURL(file);
  uploadPreview.src = previewUrl;
  uploadPreview.hidden = false;
  uploadPlaceholder.hidden = true;
  if(!$('#mediaTitle').value) $('#mediaTitle').value = file.name.replace(/\.[^.]+$/, '');
  setUploadStatus(`${file.name} · ${(file.size/1024/1024).toFixed(2)} MB`, 'ready');
}
mediaFile?.addEventListener('change',()=>showSelectedFile(mediaFile.files?.[0]));
['dragenter','dragover'].forEach(type=>uploadDrop?.addEventListener(type,e=>{e.preventDefault();uploadDrop.classList.add('dragging');}));
['dragleave','drop'].forEach(type=>uploadDrop?.addEventListener(type,e=>{e.preventDefault();uploadDrop.classList.remove('dragging');}));
uploadDrop?.addEventListener('drop',e=>{
  const file=e.dataTransfer?.files?.[0]; if(!file)return;
  const dt=new DataTransfer(); dt.items.add(file); mediaFile.files=dt.files; showSelectedFile(file);
});

async function checkMediaStatus(){
  if(localMode){
    $('#r2Status').textContent='本地不可用';
    $('#uploadBindingBadge').textContent='LOCAL';
    return;
  }
  try{
    const res=await fetch('/api/media',{credentials:'same-origin'});
    const j=await res.json().catch(()=>({}));
    if(res.ok && j.configured){
      $('#r2Status').textContent='R2 已连接'; $('#r2Status').classList.remove('warn');
      $('#uploadBindingBadge').textContent='R2 ONLINE';
    }else{
      $('#r2Status').textContent='R2 未绑定'; $('#uploadBindingBadge').textContent='R2 OFFLINE';
    }
  }catch{
    $('#r2Status').textContent='检测失败';
  }
}

uploadMediaBtn?.addEventListener('click',async()=>{
  if(localMode){ setUploadStatus('本地预览无法上传，请部署并绑定 R2。','error'); return; }
  const file=mediaFile?.files?.[0];
  if(!file){ setUploadStatus('请先选择一张图片。','error'); return; }
  if(file.size > 15*1024*1024){ setUploadStatus('图片不能超过 15 MB。','error'); return; }
  uploadMediaBtn.disabled=true;
  uploadMediaBtn.innerHTML='上传中… <span>⏳</span>';
  setUploadStatus('正在上传到 Cloudflare R2…','busy');
  try{
    const form=new FormData(); form.append('file',file);
    const res=await fetch('/api/media',{method:'POST',body:form,credentials:'same-origin'});
    const j=await res.json().catch(()=>({}));
    if(!res.ok) throw new Error(j.error||'上传失败');
    const item={
      id: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      key:j.key,
      url:j.url,
      title:$('#mediaTitle').value.trim() || file.name.replace(/\.[^.]+$/,''),
      character:$('#mediaCharacter').value,
      caption:$('#mediaCaption').value.trim() || 'NEW ARTWORK',
      createdAt:new Date().toISOString()
    };
    data.galleryUploads ??= [];
    data.galleryUploads.unshift(item);
    try{
      await persistData({quiet:true});
    }catch(metaError){
      data.galleryUploads.shift();
      await fetch(`/api/media?key=${encodeURIComponent(j.key)}`,{method:'DELETE',credentials:'same-origin'}).catch(()=>{});
      throw new Error(`图片已上传，但发布信息保存失败：${metaError.message}`);
    }
    renderMedia(); updateCount();
    setUploadStatus('上传成功，图片已经公开显示在 Gallery。','success');
    mediaFile.value=''; $('#mediaTitle').value=''; $('#mediaCaption').value='';
    if(previewUrl) URL.revokeObjectURL(previewUrl); previewUrl='';
    uploadPreview.removeAttribute('src'); uploadPreview.hidden=true; uploadPlaceholder.hidden=false;
  }catch(e){
    setUploadStatus(e.message||'上传失败','error');
  }finally{
    uploadMediaBtn.disabled=false; uploadMediaBtn.innerHTML='上传并立即发布 <span>↗</span>';
  }
});

function renderMedia(){
  const wrap=$('#mediaEditor'); if(!wrap) return;
  wrap.innerHTML='';
  const items=data.galleryUploads||[];
  if(!items.length){
    wrap.innerHTML='<div class="empty-media">还没有通过 R2 上传的图片。上传第一张以后，它会显示在这里。</div>';
    updateCount(); return;
  }
  items.forEach((item,i)=>{
    const card=document.createElement('article'); card.className='media-card';
    card.innerHTML=`
      <img class="media-thumb" src="${escapeAttr(item.url||'')}" alt="">
      <div class="media-fields">
        <label>TITLE<input data-media-field="title" value="${escapeAttr(item.title||'')}"></label>
        <div class="media-mini-grid">
          <label>CHARACTER<select data-media-field="character">
            <option value="LEILEI" ${item.character==='LEILEI'?'selected':''}>LEILEI</option>
            <option value="ZERO" ${item.character==='ZERO'?'selected':''}>ZERO</option>
            <option value="OTHER" ${item.character==='OTHER'?'selected':''}>OTHER</option>
          </select></label>
          <label>CAPTION<input data-media-field="caption" value="${escapeAttr(item.caption||'')}"></label>
        </div>
        <small>${escapeHtml(item.key||'')}</small>
      </div>
      <div class="media-actions">
        <button data-move="-1" title="上移">↑</button>
        <button data-move="1" title="下移">↓</button>
        <a href="${escapeAttr(item.url||'#')}" target="_blank" title="查看">↗</a>
        <button class="danger" data-delete-media title="删除">×</button>
      </div>`;
    card.querySelectorAll('[data-media-field]').forEach(el=>el.addEventListener('input',()=>{
      data.galleryUploads[i][el.dataset.mediaField]=el.value; setDirty();
    }));
    card.querySelectorAll('[data-move]').forEach(btn=>btn.addEventListener('click',()=>{
      const to=i+Number(btn.dataset.move); if(to<0||to>=data.galleryUploads.length)return;
      [data.galleryUploads[i],data.galleryUploads[to]]=[data.galleryUploads[to],data.galleryUploads[i]];
      renderMedia(); setDirty();
    }));
    card.querySelector('[data-delete-media]').addEventListener('click',()=>deleteMedia(i));
    wrap.appendChild(card);
  });
  updateCount();
}

async function deleteMedia(index){
  const item=data.galleryUploads?.[index]; if(!item)return;
  if(!confirm(`确定删除“${item.title||'这张图片'}”吗？它会从公开 Gallery 移除。`))return;
  const previous=[...data.galleryUploads];
  data.galleryUploads.splice(index,1);
  try{
    await persistData({quiet:true});
    renderMedia();
    if(item.key){
      const res=await fetch(`/api/media?key=${encodeURIComponent(item.key)}`,{method:'DELETE',credentials:'same-origin'});
      if(!res.ok) console.warn('R2 object cleanup failed');
    }
  }catch(e){
    data.galleryUploads=previous; renderMedia(); alert(`删除失败：${e.message}`);
  }
}

$('#logoutBtn').addEventListener('click',async()=>{ if(!localMode) await fetch('/api/logout',{method:'POST'}).catch(()=>{}); location.reload(); });
$('#exportBtn').addEventListener('click',exportJson);
function exportJson(){ const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='lumen-site-data.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500); }
$('#importInput').addEventListener('change',async e=>{ const f=e.target.files?.[0]; if(!f)return; try{data=JSON.parse(await f.text());fillFields();renderUpdates();renderMedia();updateCount();setDirty();}catch(err){alert('JSON 格式错误');} });

function escapeHtml(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function escapeAttr(v=''){return escapeHtml(v).replace(/`/g,'&#96;');}
checkSession();
