
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
document.addEventListener('click', event => {
  const btn = event.target.closest?.('.lightbox-trigger');
  if (!btn) return;
  const img = btn.querySelector('img');
  openLightbox(btn.dataset.full || img?.src || '', img?.alt || '');
});
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
  renderUploadedGallery(data.galleryUploads || []);
  if (data.site?.title) document.title = data.site.title;
}

function renderUploadedGallery(items){
  const grid = document.querySelector('.gallery-grid');
  if (!grid) return;
  grid.querySelectorAll('[data-uploaded-gallery]').forEach(el => el.remove());
  if (!Array.isArray(items)) return;
  items.forEach(item => {
    if (!item?.url) return;
    const character = ['LEILEI','ZERO','OTHER'].includes(item.character) ? item.character : 'OTHER';
    const glow = character === 'LEILEI' ? 'pink-glow' : character === 'ZERO' ? 'blue-glow' : '';
    const button = document.createElement('button');
    button.className = `gallery-item uploaded-gallery ${glow} lightbox-trigger reveal in`;
    button.dataset.uploadedGallery = '1';
    button.dataset.full = item.url;
    button.innerHTML = `<img src="${escapeAttr(item.url)}" alt="${escapeAttr(item.title || 'Gallery artwork')}" loading="lazy">
      <span><b>${escapeHtml(character)}</b><small>${escapeHtml(item.caption || item.title || 'ARTWORK')}</small></span>`;
    grid.appendChild(button);
  });
}
function escapeHtml(value=''){
  return String(value).replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
}
function escapeAttr(value=''){ return escapeHtml(value).replace(/`/g,'&#96;'); }

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
