// ══════════════════════════════════════════════════════════════
//  ADMIN — USERS
// ══════════════════════════════════════════════════════════════
async function loadUsers(){
  const users=await api('GET','api/utilisateurs.php');
  document.getElementById('users-list').innerHTML=users.map(u=>`
    <div class="user-row">
      <div style="flex:1;"><div style="font-size:.88rem;font-weight:500;">${u.nom}</div><div style="font-size:.72rem;color:var(--ink3);">${u.email}</div></div>
      <span class="role-badge ${u.role}">${T('role_' + u.role)}</span>
      <button class="btn-sm" title="${T('autologin_copy')}" onclick="genAutologinLink(${u.id})">🔗</button>
      <button class="btn-sm" onclick="deleteUser(${u.id},'${u.role}')">🗑</button>
    </div>`).join('');
}

function showAddUser(){
  document.getElementById('modal-user').innerHTML=`
    <div class="modal-hd" style="padding:1.2rem 1.4rem .8rem;">
      <div style="flex:1;font-family:'Cormorant Garamond',serif;font-size:1.25rem;font-weight:500;">${T('form_title_new_user')}</div>
      <button class="modal-close" onclick="closeOverlay('modal-user-overlay')">✕</button>
    </div>
    <div class="modal-bd">
      <div class="fg"><label>${T('form_nom')}</label><input id="nu-nom" placeholder="Prénom Nom"></div>
      <div class="fg"><label>${T('form_email')}</label><input type="email" id="nu-email" placeholder="email@exemple.fr"></div>
      <div class="fg"><label>${T('form_password')}</label><input type="password" id="nu-pass" placeholder="Min. 8 caractères"></div>
      <div class="fg"><label>${T('form_role')}</label><select id="nu-role"><option value="lecteur">${T('role_lecteur_desc')}</option><option value="editeur">${T('role_editeur_desc')}</option><option value="admin">${T('role_admin_desc')}</option></select></div>
      <div class="form-actions">
        <button class="btn-primary" onclick="createUser()">${T('btn_create_account')}</button>
        <button class="btn-secondary" onclick="closeOverlay('modal-user-overlay')">${T('form_cancel')}</button>
      </div>
    </div>`;
  document.getElementById('modal-user-overlay').classList.add('open');
}

async function createUser(){
  const body={nom:document.getElementById('nu-nom').value.trim(),email:document.getElementById('nu-email').value.trim(),password:document.getElementById('nu-pass').value,role:document.getElementById('nu-role').value};
  try{await api('POST','api/utilisateurs.php',body);closeOverlay('modal-user-overlay');loadUsers();toast(T('toast_user_created'));}
  catch(e){toast(e.message,'error');}
}

async function genAutologinLink(userId) {
  try {
    const d = await api('POST', 'api/auth.php?action=gen_autologin', { user_id: userId });
    const url = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '/') + 'login.html?autologin=' + d.token;
    await navigator.clipboard.writeText(url);
    toast(T('autologin_copied'));
  } catch(e) { toast(e.message, 'error'); }
}

async function deleteUser(id,role){
  if(!confirm(T('confirm_delete_user'))) return;
  try{await api('DELETE',`api/utilisateurs.php?id=${id}`);loadUsers();toast(T('toast_user_deleted'));}
  catch(e){toast(e.message,'error');}
}

async function changePassword(){
  const body={ancien:document.getElementById('pwd-old').value,nouveau:document.getElementById('pwd-new').value};
  try{await api('PUT','api/auth.php?action=password',body);toast(T('toast_pwd'));document.getElementById('pwd-old').value='';document.getElementById('pwd-new').value='';}
  catch(e){toast(e.message,'error');}
}

// ══════════════════════════════════════════════════════════════
//  NOTIFICATIONS PAR E-MAIL
// ══════════════════════════════════════════════════════════════
async function loadNotifEmails() {
  try {
    const list = await api('GET', 'api/notifications.php');
    const el = document.getElementById('notif-emails-list');
    if (!list.length) {
      el.innerHTML = `<p style="font-size:.8rem;color:var(--ink3);font-style:italic;">${T('notif_empty')}</p>`;
      return;
    }
    el.innerHTML = list.map(e => `
      <div class="user-row">
        <div style="flex:1;font-size:.85rem;">${e.email}</div>
        <button class="btn-sm" onclick="deleteNotifEmail(${e.id})">🗑</button>
      </div>`).join('');
  } catch(e) { /* tables pas encore créées → silencieux */ }
}

async function addNotifEmail() {
  const input = document.getElementById('notif-new-email');
  const email = input.value.trim();
  if (!email) return;
  try {
    await api('POST', 'api/notifications.php', { email });
    input.value = '';
    loadNotifEmails();
    toast(T('notif_added'));
  } catch(e) { toast(e.message, 'error'); }
}

async function deleteNotifEmail(id) {
  if (!confirm(T('notif_confirm_delete'))) return;
  try {
    await api('DELETE', `api/notifications.php?id=${id}`);
    loadNotifEmails();
    toast(T('notif_deleted'));
  } catch(e) { toast(e.message, 'error'); }
}

// ══════════════════════════════════════════════════════════════
//  IMPORT
// ══════════════════════════════════════════════════════════════
async function importFile(type){
  const input=document.getElementById(`import-${type}-file`);
  if(!input?.files?.length){toast(T('error_select_file'),'error');return;}
  const fd=new FormData(); fd.append('file',input.files[0]);
  try{
    const r=await fetch(`api/export.php?action=import-${type}`,{method:'POST',body:fd});
    const d=await r.json();
    if(!r.ok) throw new Error(d.error);
    await loadPeople(); renderTree();
    toast(d.message);
  }catch(e){toast(e.message,'error');}
}

// ══════════════════════════════════════════════════════════════
//  MISC
// ══════════════════════════════════════════════════════════════
function closeOverlay(id){ document.getElementById(id).classList.remove('open'); }
let _lbGallery = [], _lbIdx = 0;
let _lbZoomed = false, _lbTx = 0, _lbTy = 0, _lbImgRect = null;
let _lbDragging = false, _lbDragMoved = false, _lbSkipNextClick = false;
const _LB_SCALE = 2.5;

function _lbClamp() {
  if (!_lbImgRect) return;
  const r = _lbImgRect;
  const vw = window.innerWidth, vh = window.innerHeight;
  const sw = _LB_SCALE * r.width, sh = _LB_SCALE * r.height;
  // Si l'image zoomée est plus large que l'écran : contraindre les bords
  // Sinon : centrer (pas de pan possible dans ce sens)
  if (sw >= vw) {
    _lbTx = Math.min(-r.left, Math.max(vw - r.left - sw, _lbTx));
  } else {
    _lbTx = vw / 2 - r.left - sw / 2;
  }
  if (sh >= vh) {
    _lbTy = Math.min(-r.top, Math.max(vh - r.top - sh, _lbTy));
  } else {
    _lbTy = vh / 2 - r.top - sh / 2;
  }
}

function openLightbox(idx) {
  _lbIdx = idx;
  _lbShow();
  document.getElementById('lightbox').classList.add('open');
}
function _lbShow() {
  const src = _lbGallery[_lbIdx];
  const img = document.getElementById('lightbox-img');
  img.src = src;
  img.style.transform = '';
  img.style.transformOrigin = '';
  img.style.cursor = 'zoom-in';
  _lbZoomed = false; _lbTx = 0; _lbTy = 0;
  const dl = document.getElementById('lb-download');
  dl.href = src;
  dl.download = src.split('/').pop() || 'photo.jpg';
  const multi = _lbGallery.length > 1;
  document.getElementById('lb-prev').style.display = multi ? '' : 'none';
  document.getElementById('lb-next').style.display = multi ? '' : 'none';
}
function lbNav(dir) {
  _lbIdx = (_lbIdx + dir + _lbGallery.length) % _lbGallery.length;
  _lbShow();
}
function lbZoomIn(e) {
  const img = document.getElementById('lightbox-img');
  _lbImgRect = img.getBoundingClientRect();
  const px = e.clientX - _lbImgRect.left;
  const py = e.clientY - _lbImgRect.top;
  _lbTx = px * (1 - _LB_SCALE);
  _lbTy = py * (1 - _LB_SCALE);
  _lbClamp();
  img.style.transformOrigin = '0 0';
  img.style.transform = `translate(${_lbTx}px,${_lbTy}px) scale(${_LB_SCALE})`;
  img.style.cursor = 'grab';
  _lbZoomed = true;
}
function lbZoomOut() {
  const img = document.getElementById('lightbox-img');
  img.style.transform = '';
  img.style.transformOrigin = '';
  img.style.cursor = 'zoom-in';
  _lbZoomed = false; _lbTx = 0; _lbTy = 0;
}
function closeLightbox() {
  document.getElementById('lightbox').classList.remove('open');
  lbZoomOut();
}
// Setup zoom + drag on lightbox image
(function(){
  const img = document.getElementById('lightbox-img');
  img.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    img.setPointerCapture(e.pointerId);
    _lbDragMoved = false;
    if (_lbZoomed) { _lbDragging = true; img.style.cursor = 'grabbing'; }
  });
  img.addEventListener('pointermove', e => {
    if (!_lbDragging) return;
    _lbDragMoved = true;
    _lbTx += e.movementX; _lbTy += e.movementY;
    _lbClamp();
    img.style.transform = `translate(${_lbTx}px,${_lbTy}px) scale(${_LB_SCALE})`;
  });
  img.addEventListener('pointerup', e => {
    if (!_lbDragging) return;
    _lbDragging = false;
    if (!_lbDragMoved) { lbZoomOut(); _lbSkipNextClick = true; }
    else img.style.cursor = 'grab';
  });
  img.addEventListener('pointercancel', () => {
    if (!_lbDragging) return;
    _lbDragging = false;
    img.style.cursor = 'grab';
  });
  img.addEventListener('click', e => {
    e.stopPropagation();
    if (_lbSkipNextClick) { _lbSkipNextClick = false; return; }
    if (!_lbZoomed) lbZoomIn(e);
  });
})();

function toast(msg,type='ok'){
  const el=document.getElementById('toast');
  el.textContent=msg;
  el.style.background=type==='error'?'#c44':'var(--ink)';
  el.classList.add('show');
  setTimeout(()=>el.classList.remove('show'),2800);
}

async function logout(){
  await fetch('api/auth.php?action=logout',{method:'POST'});
  window.location.href='login.html';
}

// ══════════════════════════════════════════════════════════════
//  BOOTSTRAP
// ══════════════════════════════════════════════════════════════
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.overlay.open').forEach(el => el.classList.remove('open'));
    closeLightbox();
  }
  if (document.getElementById('lightbox').classList.contains('open')) {
    if (e.key === 'ArrowLeft')  lbNav(-1);
    if (e.key === 'ArrowRight') lbNav(1);
  }
});

init().catch(err => {
  document.body.innerHTML = '<div style="padding:2rem;font-family:monospace;color:red;background:#fff;position:fixed;inset:0;overflow:auto;z-index:9999;">'
    + '<h2>Erreur au démarrage</h2><pre>' + err.stack + '</pre></div>';
  console.error('init() failed:', err);
});
