
const menuBtn = document.querySelector('.menu-btn');
const mobileNav = document.querySelector('.mobile-nav');

menuBtn?.addEventListener('click', () => {
  const isOpen = mobileNav.classList.toggle('open');
  menuBtn.setAttribute('aria-expanded', String(isOpen));
  menuBtn.classList.toggle('open', isOpen);
});
mobileNav?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
  mobileNav.classList.remove('open');
  menuBtn.setAttribute('aria-expanded', 'false');
}));

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.design-panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(tab.dataset.target)?.classList.add('active');
  });
});

const dialog = document.getElementById('lightbox');
const dialogImg = dialog?.querySelector('img');
const closeBtn = dialog?.querySelector('.lightbox-close');
function openLightbox(src, alt='') {
  if (!dialog || !dialogImg) return;
  dialogImg.src = src; dialogImg.alt = alt; dialog.showModal(); document.body.classList.add('locked');
}
function closeLightbox() {
  if (!dialog) return; dialog.close(); document.body.classList.remove('locked'); if (dialogImg) dialogImg.src='';
}
document.querySelectorAll('.lightbox-trigger').forEach(btn => btn.addEventListener('click', () => {
  const img = btn.querySelector('img'); openLightbox(btn.dataset.full, img?.alt || '');
}));
closeBtn?.addEventListener('click', closeLightbox);
dialog?.addEventListener('click', e => {
  const rect = dialog.getBoundingClientRect();
  const inside = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
  if (!inside) closeLightbox();
});
dialog?.addEventListener('cancel', () => document.body.classList.remove('locked'));

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('in'); observer.unobserve(entry.target); } });
}, { threshold: 0.08 });
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

// ---- V3 dynamic content ----
const getPath = (obj, path) => path.split('.').reduce((acc, key) => acc?.[key], obj);
const mergeDeep = (base, extra) => {
  if (!extra || typeof extra !== 'object') return base;
  const out = Array.isArray(base) ? [...base] : {...base};
  Object.keys(extra).forEach(k => {
    if (extra[k] && typeof extra[k] === 'object' && !Array.isArray(extra[k]) && base?.[k] && typeof base[k] === 'object') out[k] = mergeDeep(base[k], extra[k]);
    else out[k] = extra[k];
  });
  return out;
};

function applySiteData(data){
  document.querySelectorAll('[data-content]').forEach(el => {
    const value = getPath(data, el.dataset.content);
    if (value !== undefined && value !== null) el.textContent = value;
  });
  document.querySelectorAll('[data-link]').forEach(el => {
    const value = getPath(data, el.dataset.link);
    if (value) el.href = value;
  });
  const list = document.querySelector('[data-updates-list]');
  if (list && Array.isArray(data.updates)) {
    list.innerHTML = data.updates.map(item => `
      <article class="update-item">
        <time>${escapeHtml(item.date || '')}</time>
        <div><strong>${escapeHtml(item.title || '')}</strong><p>${escapeHtml(item.body || '')}</p></div>
      </article>`).join('');
  }
  if (data.site?.title) document.title = data.site.title;
}
function escapeHtml(value=''){
  return String(value).replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
}

async function loadRemoteContent(){
  const defaults = window.DEFAULT_SITE_DATA || {};
  if (location.protocol === 'file:') { applySiteData(defaults); return; }
  try {
    const res = await fetch('/api/content', {headers:{'Accept':'application/json'}});
    if (!res.ok) throw new Error('No remote content');
    const remote = await res.json();
    applySiteData(mergeDeep(defaults, remote));
  } catch (err) {
    applySiteData(defaults);
  }
}
loadRemoteContent();
