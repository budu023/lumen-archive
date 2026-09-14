
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
  loginScreen.hidden=true; app.hidden=false;
  modeBadge.textContent = mode==='local' ? 'LOCAL DEMO' : 'ONLINE';
  modeBadge.style.color = mode==='local' ? '#f0c66a' : '#72d6aa';
  dbStatus.textContent = mode==='local' ? '本地演示' : 'D1 已连接';
  fillFields(); renderUpdates(); updateCount();
  if(mode==='local'){ saveBtn.textContent='导出 JSON'; }
}

async function checkSession(){
  if(localMode){ localNotice.hidden=false; demoBtn.hidden=false; return; }
  try{
    const res = await fetch('/api/session',{credentials:'same-origin'});
    if(res.ok){ const j=await res.json(); if(j.authenticated){ await loadRemote(); enterApp('online'); } }
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
    await loadRemote(); enterApp('online'); loginMsg.textContent='';
  }catch(err){ loginMsg.textContent=err.message; }
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
function updateCount(){ $('#updateCount').textContent=String((data.updates||[]).length).padStart(2,'0'); }
$('#addUpdateBtn').addEventListener('click',()=>{ data.updates.unshift({date:new Date().toISOString().slice(0,10).replaceAll('-','.'),title:'New Update',body:'填写本次更新内容。'}); renderUpdates();updateCount();setDirty(); });

$$('.nav-item').forEach(btn=>btn.addEventListener('click',()=>{
  $$('.nav-item').forEach(b=>b.classList.remove('active'));btn.classList.add('active');
  $$('.panel').forEach(p=>p.classList.remove('active')); document.querySelector(`[data-panel-view="${btn.dataset.panel}"]`)?.classList.add('active');
  const names={overview:['DASHBOARD','概览'],home:['HOME PAGE','首页'],characters:['CHARACTERS','角色'],world:['WORLD / LORE','世界观'],gallery:['GALLERY','图库信息'],updates:['CHANGELOG','更新日志'],social:['SOCIAL','社交链接'],backup:['DATA','备份']};
  $('#panelKicker').textContent=names[btn.dataset.panel]?.[0]||''; $('#panelTitle').textContent=names[btn.dataset.panel]?.[1]||'';
}));

saveBtn.addEventListener('click',async()=>{
  if(localMode){ exportJson(); return; }
  saveBtn.disabled=true; saveBtn.textContent='保存中…';
  try{
    const res=await fetch('/api/content',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
    const j=await res.json().catch(()=>({})); if(!res.ok)throw new Error(j.error||'保存失败'); setDirty(false); saveBtn.textContent='已保存 ✓'; setTimeout(()=>saveBtn.textContent='保存更改',1300);
  }catch(e){ saveState.textContent=e.message;saveState.className='save-state dirty';saveBtn.textContent='保存更改'; }
  finally{saveBtn.disabled=false;}
});

$('#logoutBtn').addEventListener('click',async()=>{ if(!localMode) await fetch('/api/logout',{method:'POST'}).catch(()=>{}); location.reload(); });
$('#exportBtn').addEventListener('click',exportJson);
function exportJson(){ const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='lumen-site-data.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500); }
$('#importInput').addEventListener('change',async e=>{ const f=e.target.files?.[0]; if(!f)return; try{data=JSON.parse(await f.text());fillFields();renderUpdates();updateCount();setDirty();}catch(err){alert('JSON 格式错误');} });

function escapeHtml(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function escapeAttr(v=''){return escapeHtml(v).replace(/`/g,'&#96;');}
checkSession();
