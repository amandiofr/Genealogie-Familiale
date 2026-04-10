// ══════════════════════════════════════════════════════════════
//  ADMIN — USERS
// ══════════════════════════════════════════════════════════════
async function loadUsers(){
  const users=await api('GET','api/utilisateurs.php');
  document.getElementById('users-list').innerHTML=users.map(u=>`
    <div class="user-row" id="user-row-${u.id}">
      <div class="user-email">${u.email}</div>
      <div class="user-actions">
        <span class="role-badge ${u.role}">${T('role_' + u.role)}</span>
        ${u.role !== 'admin' ? `<button class="btn-sm" title="${T('lbl_arbres')}" onclick="showUserArbres(${u.id},${JSON.stringify(u.arbres).replace(/"/g,'&quot;')})">🌳</button>` : ''}
        <button class="btn-sm" title="${T('autologin_copy')}" onclick="genAutologinLink(${u.id})">🔗</button>
        <button class="btn-sm" onclick="deleteUser(${u.id},'${u.role}')">🗑</button>
      </div>
    </div>`).join('');
}

function showUserArbres(userId, userArbres) {
  const arbreNom = a => a.prenom_b ? `${a.prenom_a} ${T('lbl_et')} ${a.prenom_b}` : a.prenom_a;
  const checks = _arbres.map(a => `
    <label style="display:flex;align-items:center;gap:8px;padding:5px 0;cursor:pointer;font-size:.85rem;">
      <input type="checkbox" value="${encodeHTML(a.id)}" ${userArbres.includes(a.id)?'checked':''} style="width:15px;height:15px;">
      ${encodeHTML(arbreNom(a))}
    </label>`).join('');
  const el = document.getElementById('user-row-' + userId);
  // Supprimer un panel déjà ouvert
  const existing = el.nextElementSibling;
  if (existing && existing.classList.contains('arbre-assign-panel')) { existing.remove(); return; }
  document.querySelectorAll('.arbre-assign-panel').forEach(p => p.remove());
  const panel = document.createElement('div');
  panel.className = 'arbre-assign-panel';
  panel.style.cssText = 'padding:10px 14px 12px;background:var(--bg2);border-top:1px solid var(--border);';
  panel.innerHTML = `
    <div style="font-size:.75rem;font-weight:500;color:var(--ink2);margin-bottom:6px;">${T('lbl_acces_arbres')}</div>
    <div id="arbre-checks-${userId}">${checks || `<span style="font-size:.8rem;color:var(--ink3);">${T('empty_arbres')}</span>`}</div>
    <div style="margin-top:10px;display:flex;gap:8px;">
      <button class="btn-primary" style="font-size:.78rem;padding:5px 12px;" onclick="saveUserArbres(${userId})">${T('form_save')}</button>
      <button class="btn-secondary" style="font-size:.78rem;padding:5px 12px;" onclick="this.closest('.arbre-assign-panel').remove()">${T('form_cancel')}</button>
    </div>`;
  el.insertAdjacentElement('afterend', panel);
}

async function saveUserArbres(userId) {
  const checks = document.querySelectorAll(`#arbre-checks-${userId} input[type=checkbox]`);
  const arbres = Array.from(checks).filter(c=>c.checked).map(c=>c.value);
  try {
    // PUT minimal : seulement les arbres (pas de nom/email/role)
    const u = await api('GET','api/utilisateurs.php');
    const user = u.find(x=>x.id===userId);
    await api('PUT', `api/utilisateurs.php?id=${userId}`, {nom:user.nom, email:user.email, role:user.role, arbres});
    document.querySelector('.arbre-assign-panel')?.remove();
    loadUsers();
    toast(T('toast_arbres_saved'));
  } catch(e) { toast(e.message,'error'); }
}

function showAddUser(){
  document.getElementById('modal-user').innerHTML=`
    <div class="modal-hd" style="padding:1.2rem 1.4rem .8rem;">
      <div style="flex:1;font-family:'Cormorant Garamond',serif;font-size:1.25rem;font-weight:500;">${T('form_title_new_user')}</div>
      <button class="modal-close" onclick="closeOverlay('modal-user-overlay')">✕</button>
    </div>
    <div class="modal-bd">
      <div class="fg"><label>${T('form_nom')}</label><input id="nu-nom" placeholder="${T('ph_prenom_nom')}"></div>
      <div class="fg"><label>${T('form_email')}</label><input type="email" id="nu-email" placeholder="email@exemple.fr"></div>
      <div class="fg"><label>${T('form_password')}</label><input type="password" id="nu-pass" placeholder="${T('ph_password')}"></div>
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
        <div style="flex:1;min-width:0;font-size:.85rem;word-break:break-all;">${e.email}</div>
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
//  LOGS DES MODIFICATIONS
// ══════════════════════════════════════════════════════════════
async function loadModificationLog(offset = 0) {
  const el = document.getElementById('mod-log-result');
  if (offset === 0) el.innerHTML = '<p style="font-size:.8rem;color:var(--ink3);">Chargement…</p>';
  try {
    const logs = await api('GET', `api/admin.php?action=logs&limit=50&offset=${offset}`);
    if (offset === 0 && !logs.length) {
      el.innerHTML = `<p style="font-size:.8rem;color:var(--ink3);font-style:italic;">${T('admin_logs_empty')}</p>`;
      return;
    }
    const actionColor = { ajout:'#2a7a2a', modification:'#1a6eb5', suppression:'#c44' };
    const rows = logs.map(l => `
      <div style="padding:.5rem 0;border-bottom:1px solid var(--border);font-size:.78rem;line-height:1.6;">
        <div style="display:flex;flex-wrap:wrap;align-items:center;gap:.3rem .4rem;margin-bottom:.15rem;">
          <span style="padding:1px 6px;border-radius:10px;color:#fff;background:${actionColor[l.action]??'#888'};">${l.action}</span>
          <span style="padding:1px 6px;border-radius:10px;background:var(--bg2);color:var(--ink2);">${l.type}</span>
          <span style="color:var(--ink3);">${l.created_at?.replace('T',' ').slice(0,16) ?? ''}</span>
          <span style="font-weight:500;color:var(--ink2);">${l.auteur ?? ''}</span>
        </div>
        <div style="color:var(--ink);word-break:break-word;">${l.description}</div>
      </div>`).join('');

    if (offset === 0) {
      el.innerHTML = `<div id="mod-log-rows" style="display:flex;flex-direction:column;gap:.3rem;">${rows}</div>`;
    } else {
      document.getElementById('mod-log-rows').insertAdjacentHTML('beforeend', rows);
      document.getElementById('mod-log-more')?.remove();
    }
    if (logs.length === 50) {
      el.insertAdjacentHTML('beforeend',
        `<button id="mod-log-more" class="btn-secondary" onclick="loadModificationLog(${offset + 50})" style="margin-top:.8rem;font-size:.78rem;">${T('admin_logs_load_more')}</button>`);
    }
  } catch(e) { el.innerHTML = ''; toast(e.message, 'error'); }
}

// ══════════════════════════════════════════════════════════════
//  FICHIERS ORPHELINS
// ══════════════════════════════════════════════════════════════
async function scanOrphanFiles() {
  const btn = document.getElementById('btn-scan-orphans');
  const el  = document.getElementById('orphan-files-result');
  btn.disabled = true;
  el.innerHTML = `<p style="font-size:.8rem;color:var(--ink3);">${T('admin_orphans_scanning')}</p>`;
  try {
    const d = await api('GET', 'api/admin.php?action=orphan_files');
    if (!d.orphans.length) {
      el.innerHTML = `<p style="font-size:.8rem;color:var(--ink3);font-style:italic;">${T('admin_orphans_none')}</p>`;
      return;
    }
    const fmt = n => n < 1024 ? n + ' o' : n < 1048576 ? Math.round(n / 1024) + ' Ko' : (n / 1048576).toFixed(1) + ' Mo';
    el.innerHTML = `
      <p style="font-size:.8rem;margin-bottom:.7rem;">${d.orphans.length} fichier(s) — ${fmt(d.total_size)} au total</p>
      <div id="orphan-list" style="display:flex;flex-direction:column;gap:.4rem;margin-bottom:.8rem;">
        ${d.orphans.map(f => `
          <div class="user-row orphan-row" data-path="${f.path}">
            <img src="${f.path}" loading="lazy" style="width:40px;height:40px;object-fit:cover;border-radius:4px;flex-shrink:0;" onerror="this.style.display='none'">
            <div style="flex:1;min-width:0;">
              <div style="font-size:.8rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${f.path.split('/').pop()}</div>
              <div style="font-size:.72rem;color:var(--ink3);">${fmt(f.size)}</div>
            </div>
            <button class="btn-sm orphan-del-btn" data-path="${f.path}" title="Supprimer">🗑</button>
          </div>`).join('')}
      </div>
      <button class="btn-secondary" id="btn-delete-all-orphans" style="font-size:.78rem;color:#c44;border-color:#c44;">
        ${T('admin_orphans_delete_all')} (${fmt(d.total_size)})
      </button>`;

    document.getElementById('orphan-list').addEventListener('click', async e => {
      const btn = e.target.closest('.orphan-del-btn');
      if (!btn) return;
      await _deleteOrphan(btn.dataset.path);
      btn.closest('.orphan-row').remove();
      if (!document.querySelector('.orphan-row')) el.innerHTML = `<p style="font-size:.8rem;color:var(--ink3);font-style:italic;">Aucun fichier orphelin.</p>`;
    });

    document.getElementById('btn-delete-all-orphans').addEventListener('click', async () => {
      if (!confirm(T('admin_orphans_confirm'))) return;
      const rows = [...document.querySelectorAll('.orphan-row')];
      for (const row of rows) {
        try { await _deleteOrphan(row.dataset.path); row.remove(); } catch { /* continue */ }
      }
      el.innerHTML = `<p style="font-size:.8rem;color:var(--ink3);font-style:italic;">${T('admin_orphans_none')}</p>`;
      toast(T('admin_orphans_deleted'));
    });

  } catch(e) {
    el.innerHTML = '';
    toast(e.message, 'error');
  } finally {
    btn.disabled = false;
  }
}

async function _deleteOrphan(path) {
  await api('DELETE', 'api/admin.php?action=delete_file', { path });
  toast('Supprimé : ' + path.split('/').pop());
}

// ══════════════════════════════════════════════════════════════
//  CONTRÔLE QUALITÉ
// ══════════════════════════════════════════════════════════════
async function copyMarriageDate(lienId, personId, date) {
  try {
    // Récupérer le lien existant pour préserver type/notes
    const p = await api('GET', `api/personnes.php?id=${personId}`);
    const lien = (p.liens || []).find(l => Number(l.lien_id) === Number(lienId));
    await api('PUT', `api/personnes.php?id=${personId}&sub=liens&subid=${lienId}`, {
      type:       lien?.type || 'conjoint',
      date_debut: date,
      date_fin:   lien?.date_fin || null,
      notes:      lien?.notes || null,
    });
    toast('✅ Date reportée');
    loadQualityCheck();
  } catch(e) { toast(e.message, 'error'); }
}

async function loadQualityCheck() {
  const el = document.getElementById('quality-result');
  el.innerHTML = `<p style="font-size:.8rem;color:var(--ink3);">${T('admin_quality_loading')}</p>`;
  try {
    const d = await api('GET', 'api/admin.php?action=quality_check');

    let html = '';

    // Filtrer par arbre courant si applicable
    const _inTree = p => inCurrentTree(p.id);
    const _inTreeById = id => inCurrentTree(id);

    const _alpha = key => (a, b) => String(a[key]||'').localeCompare(String(b[key]||''), undefined, {sensitivity:'base'});
    const _alphaFull = (a, b) => `${a.prenom} ${a.nom||''}`.localeCompare(`${b.prenom} ${b.nom||''}`, undefined, {sensitivity:'base'});
    const _section = (title, items, rowsFn) => {
      if (!items.length) return '';
      return `<h3 style="font-size:.9rem;font-weight:600;margin:1.2rem 0 .5rem;">${title} (${items.length})</h3>`
           + `<div style="display:flex;flex-direction:column;gap:.3rem;">${items.map(rowsFn).join('')}</div>`;
    };

    // ── Membres ──
    const personnesFilt = d.personnes.filter(_inTree).sort(_alphaFull);
    html += _section(T('admin_quality_members'), personnesFilt, p => {
      const issues = [];
      if (!p.nom || p.nom.includes('?'))              issues.push(T('admin_quality_nom'));
      if (!p.naissance || p.naissance.includes('?'))  issues.push(T('admin_quality_naissance'));
      if (!p.lieu_naiss || p.lieu_naiss.includes('?')) issues.push(T('admin_quality_lieu_naiss'));
      return `<div class="user-row" style="cursor:pointer;" onclick="showPersonForm(${p.id})">
        <div style="flex:1;">
          <div style="font-size:.85rem;font-weight:500;">${p.prenom} ${p.nom||'?'}</div>
          <div style="font-size:.72rem;color:#b45309;">${issues.join(' · ')}</div>
        </div>
        <span style="font-size:.7rem;color:var(--ink3);">✏️</span>
      </div>`;
    });

    // ── Réunions ──
    html += _section(T('admin_quality_reunions'), [...d.reunions].sort(_alpha('titre')), r => {
      const issues = [];
      if (!r.date_debut || r.date_debut.includes('?')) issues.push(T('admin_quality_no_date'));
      if (!r.lieu || r.lieu.includes('?'))             issues.push(T('admin_quality_no_lieu'));
      return `<div class="user-row" style="cursor:pointer;" onclick="showReunionForm(${r.id})">
        <div style="flex:1;">
          <div style="font-size:.85rem;font-weight:500;">${r.titre}</div>
          <div style="font-size:.72rem;color:#b45309;">${issues.join(' · ')}</div>
        </div>
        <span style="font-size:.7rem;color:var(--ink3);">✏️</span>
      </div>`;
    });

    // ── Événements ──
    html += _section(T('admin_quality_events'), [...d.evenements].sort(_alpha('titre')), e => {
      const issues = [];
      if (!e.nb_personnes || e.nb_personnes == 0)      issues.push(T('admin_quality_no_persons'));
      if (!e.date_debut || e.date_debut.includes('?'))  issues.push(T('admin_quality_no_date'));
      if (!e.lieu || e.lieu.includes('?'))              issues.push(T('admin_quality_no_lieu'));
      return `<div class="user-row" style="cursor:pointer;" onclick="showEventForm(${e.id})">
        <div style="flex:1;">
          <div style="font-size:.85rem;font-weight:500;">${EVT_ICONS[e.type]||'📌'} ${e.titre}</div>
          <div style="font-size:.72rem;color:#b45309;">${issues.join(' · ')}</div>
        </div>
        <span style="font-size:.7rem;color:var(--ink3);">✏️</span>
      </div>`;
    });

    // ── Membres isolés ──
    html += _section(T('admin_quality_isoles'), [...d.isoles].sort(_alphaFull), p =>
      `<div class="user-row" style="cursor:pointer;" onclick="openPerson(${p.id})">
        <div style="flex:1;"><div style="font-size:.85rem;font-weight:500;">${p.prenom} ${p.nom||'?'}</div>
        <div style="font-size:.72rem;color:#b45309;">${T('admin_quality_no_links')}</div></div>
        <span style="font-size:.7rem;color:var(--ink3);">✏️</span></div>`);

    // ── Membres sans photo ──
    const sansPhotoFilt = d.sans_photo.filter(_inTree).sort(_alphaFull);
    html += _section(T('admin_quality_sans_photo'), sansPhotoFilt, p =>
      `<div class="user-row" style="cursor:pointer;" onclick="openPerson(${p.id})">
        <div style="flex:1;"><div style="font-size:.85rem;font-weight:500;">${p.prenom} ${p.nom||'?'}</div>
        <div style="font-size:.72rem;color:#b45309;">${T('admin_quality_no_photo')}</div></div>
        <span style="font-size:.7rem;color:var(--ink3);">✏️</span></div>`);

    // ── Conjoints sans date de mariage ──
    const sansDateFilt = d.sans_date_mariage
      .filter(l => _inTreeById(l.id_a) || _inTreeById(l.id_b ?? l.id_a))
      .sort((a, b) => `${a.prenom_a} ${a.nom_a||''}`.localeCompare(`${b.prenom_a} ${b.nom_a||''}`, undefined, {sensitivity:'base'}));
    html += _section(T('admin_quality_no_marriage_date'), sansDateFilt, l => {
      const copyBtn = l.date_evt
        ? `<button class="btn-sm" style="font-size:.7rem;padding:2px 8px;white-space:nowrap;" onclick="event.stopPropagation();copyMarriageDate(${l.lien_id},${l.id_a},'${l.date_evt}')">📅 ${l.date_evt.substring(0,4)}</button>`
        : '';
      return `<div class="user-row" style="cursor:pointer;" onclick="openPerson(${l.id_a})">
        <div style="flex:1;"><div style="font-size:.85rem;font-weight:500;">${l.prenom_a} ${l.nom_a||''} & ${l.prenom_b} ${l.nom_b||''}</div>
        <div style="font-size:.72rem;color:#b45309;">${T('admin_quality_no_date')}</div></div>
        ${copyBtn}<span style="font-size:.7rem;color:var(--ink3);">✏️</span></div>`;
    });

    // ── Incohérences de dates ──
    html += _section(T('admin_quality_incoherences'), [...d.incoherences].sort(_alphaFull), p => {
      const detail = p.parent_prenom
        ? `${T('admin_quality_born_before_parent')} ${p.parent_prenom} ${p.parent_nom||''}`
        : T('admin_quality_death_before_birth');
      return `<div class="user-row" style="cursor:pointer;" onclick="openPerson(${p.id})">
        <div style="flex:1;"><div style="font-size:.85rem;font-weight:500;">${p.prenom} ${p.nom||'?'}</div>
        <div style="font-size:.72rem;color:#b45309;">${detail}</div></div>
        <span style="font-size:.7rem;color:var(--ink3);">✏️</span></div>`;
    });

    // ── Lieux non géocodés ──
    const lieux = await api('GET', 'api/lieux.php?action=collect');
    const nonGeo = lieux.filter(l => l.lat == null).sort(_alpha('nom_approx'));
    html += _section(T('admin_quality_lieux'), nonGeo, l =>
      `<div class="user-row" style="cursor:pointer;" onclick="showView('admin-lieux')">
        <div style="flex:1;">
          <div style="font-size:.85rem;font-weight:500;">📍 ${l.nom_approx}</div>
          <div style="font-size:.72rem;color:#b45309;">${T('lieux_not_geocoded')}</div>
        </div>
        <span style="font-size:.7rem;color:var(--ink3);">→</span>
      </div>`);

    if (!html) html = `<p style="font-size:.85rem;color:var(--ink3);font-style:italic;padding:1rem 0;">${T('admin_quality_ok')}</p>`;

    el.innerHTML = html;
  } catch(e) { el.innerHTML = ''; toast(e.message, 'error'); }
}

// ══════════════════════════════════════════════════════════════
//  MISC
// ══════════════════════════════════════════════════════════════
function closeOverlay(id){ document.getElementById(id).classList.remove('open'); }
let _lbGallery = [], _lbIdx = 0;
let _lbZoomed = false, _lbTx = 0, _lbTy = 0;
let _lbScale = 1, _lbNaturalRect = null;
let _lbIdleTimer = null, _lbMouseX = -1, _lbMouseY = -1;
function _lbResetIdle(e) {
  if (e && e.type === 'mousemove') {
    if (e.clientX === _lbMouseX && e.clientY === _lbMouseY) return;
    _lbMouseX = e.clientX; _lbMouseY = e.clientY;
  }
  const lb = document.getElementById('lightbox');
  if (!lb.classList.contains('open')) return;
  lb.classList.remove('lb-idle');
  clearTimeout(_lbIdleTimer);
  if (!_lbZoomed) _lbIdleTimer = setTimeout(() => lb.classList.add('lb-idle'), 2000);
}
document.addEventListener('mousemove', _lbResetIdle);
document.addEventListener('mousedown', _lbResetIdle);
let _lbDragging = false, _lbDragMoved = false, _lbSkipNextClick = false;
const _LB_SCALE = 2.5;

function _lbClamp() {
  const r = _lbNaturalRect; if (!r) return;
  const vw = window.innerWidth, vh = window.innerHeight;
  const sw = _lbScale * r.width, sh = _lbScale * r.height;
  if (sw >= vw) { _lbTx = Math.min(-r.left, Math.max(vw - r.left - sw, _lbTx)); }
  else          { _lbTx = vw / 2 - r.left - sw / 2; }
  if (sh >= vh) { _lbTy = Math.min(-r.top,  Math.max(vh - r.top  - sh, _lbTy)); }
  else          { _lbTy = vh / 2 - r.top  - sh / 2; }
}

function _lbGetNaturalRect() {
  const img = document.getElementById('lightbox-img');
  if (_lbNaturalRect) return _lbNaturalRect;
  const t = img.style.transform, o = img.style.transformOrigin;
  img.style.transform = ''; img.style.transformOrigin = '';
  const r = img.getBoundingClientRect();
  img.style.transform = t; img.style.transformOrigin = o;
  return (_lbNaturalRect = r);
}

function openLightbox(idx) {
  _lbIdx = idx; _lbShow();
  document.getElementById('lightbox').classList.add('open');
  requestAnimationFrame(() => {
    const img = document.getElementById('lightbox-img');
    if (img.complete && img.naturalWidth > 0) _lbNaturalRect = img.getBoundingClientRect();
  });
  _lbResetIdle();
}
function _lbShow() {
  const src = _lbGallery[_lbIdx];
  const img = document.getElementById('lightbox-img');
  img.src = src;
  img.style.transform = ''; img.style.transformOrigin = ''; img.style.cursor = 'zoom-in';
  _lbZoomed = false; _lbTx = 0; _lbTy = 0; _lbScale = 1; _lbNaturalRect = null;
  const dl = document.getElementById('lb-download');
  dl.href = src; dl.download = src.split('/').pop() || 'photo.jpg';
  const multi = _lbGallery.length > 1;
  document.getElementById('lb-prev').style.display = multi ? '' : 'none';
  document.getElementById('lb-next').style.display = multi ? '' : 'none';
}
function lbNav(dir) { _lbIdx = (_lbIdx + dir + _lbGallery.length) % _lbGallery.length; _lbShow(); }
function lbZoomIn(e) {
  const img = document.getElementById('lightbox-img');
  _lbNaturalRect = _lbGetNaturalRect();
  const px = e.clientX - _lbNaturalRect.left, py = e.clientY - _lbNaturalRect.top;
  _lbScale = _LB_SCALE;
  _lbTx = px * (1 - _lbScale); _lbTy = py * (1 - _lbScale);
  _lbClamp();
  img.style.transformOrigin = '0 0';
  img.style.transform = `translate(${_lbTx}px,${_lbTy}px) scale(${_lbScale})`;
  img.style.cursor = 'grab'; _lbZoomed = true;
  clearTimeout(_lbIdleTimer);
  document.getElementById('lightbox').classList.remove('lb-idle');
}
function lbZoomOut() {
  const img = document.getElementById('lightbox-img');
  img.style.transform = ''; img.style.transformOrigin = ''; img.style.cursor = 'zoom-in';
  _lbZoomed = false; _lbTx = 0; _lbTy = 0; _lbScale = 1;
  if (!window.matchMedia('(pointer:coarse)').matches) _lbResetIdle();
}
function closeLightbox() {
  const lb = document.getElementById('lightbox');
  lb.classList.remove('open','lb-idle');
  clearTimeout(_lbIdleTimer);
  lbZoomOut();
}

// Setup zoom + drag + pinch
(function(){
  const img = document.getElementById('lightbox-img');
  const lb  = document.getElementById('lightbox');
  const _isTouch = () => window.matchMedia('(pointer:coarse)').matches;
  let _lbLastTap = 0;
  let _pinching = false, _pinchStartDist = 0, _pinchStartScale = 1;
  let _pinchStartTx = 0, _pinchStartTy = 0, _pinchMidX = 0, _pinchMidY = 0;
  let _swipeStartX = 0, _swipeStartY = 0, _swipeOffset = 0, _swipeOffsetY = 0, _swipeDir = null;

  img.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    e.preventDefault(); e.stopPropagation();
    img.setPointerCapture(e.pointerId);
    _lbDragMoved = false;
    if (_lbZoomed && !_pinching) { _lbDragging = true; img.style.cursor = 'grabbing'; }
  });
  img.addEventListener('pointermove', e => {
    if (!_lbDragging || _pinching) return;
    _lbDragMoved = true;
    _lbTx += e.movementX; _lbTy += e.movementY;
    _lbClamp();
    img.style.transform = `translate(${_lbTx}px,${_lbTy}px) scale(${_lbScale})`;
  });
  img.addEventListener('pointerup', e => {
    if (!_lbDragging) return;
    _lbDragging = false;
    if (!_lbDragMoved && !_isTouch()) { lbZoomOut(); _lbSkipNextClick = true; }
    else if (_lbDragMoved) img.style.cursor = 'grab';
  });
  img.addEventListener('pointercancel', () => { if (_lbDragging) { _lbDragging = false; img.style.cursor = 'grab'; } });
  img.addEventListener('click', e => {
    e.stopPropagation();
    if (_lbSkipNextClick) { _lbSkipNextClick = false; return; }
    if (!_isTouch() && !_lbZoomed) lbZoomIn(e);
  });


  // Pinch-to-zoom
  lb.addEventListener('touchstart', e => {
    if (e.target.closest('.lb-nav,.lightbox-close,.lb-download')) return;
    if (e.touches.length === 1 && !_lbZoomed) {
      _swipeStartX = e.touches[0].clientX;
      _swipeStartY = e.touches[0].clientY;
      _swipeOffset = 0; _swipeOffsetY = 0; _swipeDir = null;
    }
    if (e.touches.length !== 2) return;
    e.preventDefault();
    _pinching = true; _lbDragging = false;
    const t0 = e.touches[0], t1 = e.touches[1];
    const dx = t1.clientX - t0.clientX, dy = t1.clientY - t0.clientY;
    _pinchStartDist  = Math.sqrt(dx*dx + dy*dy);
    _pinchStartScale = _lbScale; _pinchStartTx = _lbTx; _pinchStartTy = _lbTy;
    _pinchMidX = (t0.clientX + t1.clientX) / 2;
    _pinchMidY = (t0.clientY + t1.clientY) / 2;
    _lbNaturalRect = null; // force fresh measurement each pinch
    _lbNaturalRect = _lbGetNaturalRect();
  }, { passive: false });

  lb.addEventListener('touchmove', e => {
    if (!_pinching && !_lbZoomed && e.touches.length === 1) {
      const dx = e.touches[0].clientX - _swipeStartX;
      const dy = e.touches[0].clientY - _swipeStartY;
      if (!_swipeDir) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        _swipeDir = Math.abs(dx) >= Math.abs(dy) ? 'h' : 'v';
      }
      e.preventDefault();
      if (_swipeDir === 'h') {
        _swipeOffset = dx;
        img.style.transform = `translateX(${dx}px)`;
      } else {
        _swipeOffsetY = dy;
        const progress = Math.min(1, Math.abs(dy) / (window.innerHeight * 0.5));
        lb.style.background = `rgba(0,0,0,${(0.9 * (1 - progress * 0.7)).toFixed(2)})`;
        img.style.transform = `translateY(${dy}px)`;
      }
      return;
    }
    if (!_pinching || e.touches.length !== 2) return;
    e.preventDefault();
    const t0 = e.touches[0], t1 = e.touches[1];
    const dx = t1.clientX - t0.clientX, dy = t1.clientY - t0.clientY;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const midX = (t0.clientX + t1.clientX) / 2, midY = (t0.clientY + t1.clientY) / 2;
    const newScale = Math.max(1, Math.min(6, _pinchStartScale * dist / _pinchStartDist));
    const nr = _lbNaturalRect;
    _lbTx = midX - nr.left - (_pinchMidX - nr.left - _pinchStartTx) / _pinchStartScale * newScale;
    _lbTy = midY - nr.top  - (_pinchMidY - nr.top  - _pinchStartTy) / _pinchStartScale * newScale;
    _lbScale = newScale;
    if (_lbScale <= 1.05) {
      img.style.transform = ''; img.style.transformOrigin = ''; img.style.cursor = 'zoom-in';
      _lbZoomed = false; _lbTx = 0; _lbTy = 0; _lbScale = 1;
    } else {
      _lbClamp();
      img.style.transformOrigin = '0 0';
      img.style.transform = `translate(${_lbTx}px,${_lbTy}px) scale(${_lbScale})`;
      img.style.cursor = 'grab'; _lbZoomed = true;
    }
  }, { passive: false });

  lb.addEventListener('touchend', e => {
    if (_pinching) {
      if (e.touches.length < 2) { _pinching = false; if (_lbScale < 1.3) lbZoomOut(); }
      return;
    }
    if (_swipeDir === 'h') {
      _swipeDir = null;
      const dx = _swipeOffset; _swipeOffset = 0;
      const vw = window.innerWidth;
      if (_lbGallery.length > 1 && Math.abs(dx) > Math.min(80, vw * 0.25)) {
        const dir = dx < 0 ? 1 : -1;
        img.style.transition = 'transform 0.2s ease';
        img.style.transform = `translateX(${-dir * vw}px)`;
        img.addEventListener('transitionend', function slideOut() {
          img.removeEventListener('transitionend', slideOut);
          img.style.transition = 'none';
          lbNav(dir);
          img.style.transform = `translateX(${dir * vw}px)`;
          requestAnimationFrame(() => requestAnimationFrame(() => {
            img.style.transition = 'transform 0.2s ease';
            img.style.transform = '';
            img.addEventListener('transitionend', function slideIn() {
              img.removeEventListener('transitionend', slideIn);
              img.style.transition = '';
            });
          }));
        });
        _lbSkipNextClick = true;
      } else {
        img.style.transition = 'transform 0.2s ease';
        img.style.transform = '';
        img.addEventListener('transitionend', function snapBack() {
          img.removeEventListener('transitionend', snapBack);
          img.style.transition = '';
        });
      }
      return;
    }
    if (_swipeDir === 'v') {
      _swipeDir = null;
      const dy = _swipeOffsetY; _swipeOffsetY = 0;
      const vh = window.innerHeight;
      if (Math.abs(dy) > vh * 0.25) {
        const slideDir = dy > 0 ? 1 : -1;
        img.style.transition = 'transform 0.25s ease, opacity 0.25s ease';
        lb.style.transition = 'background 0.25s ease';
        img.style.transform = `translateY(${slideDir * vh}px)`;
        img.style.opacity = '0';
        lb.style.background = 'rgba(0,0,0,0)';
        img.addEventListener('transitionend', function closeAnim() {
          img.removeEventListener('transitionend', closeAnim);
          img.style.transition = ''; img.style.opacity = '';
          lb.style.transition = ''; lb.style.background = '';
          closeLightbox();
        }, { once: true });
        _lbSkipNextClick = true;
      } else {
        img.style.transition = 'transform 0.2s ease';
        lb.style.transition = 'background 0.2s ease';
        img.style.transform = '';
        lb.style.background = '';
        img.addEventListener('transitionend', function snapBack() {
          img.removeEventListener('transitionend', snapBack);
          img.style.transition = ''; lb.style.transition = '';
        });
      }
      return;
    }
    // Clean tap on image: double-tap detection
    if (e.changedTouches.length === 1 && !_pinching) {
      const touch = e.changedTouches[0];
      const now = Date.now(), isDouble = (now - _lbLastTap) < 300;
      _lbLastTap = isDouble ? 0 : now;
      if (isDouble) {
        _lbZoomed ? lbZoomOut() : lbZoomIn(touch);
        _lbSkipNextClick = true;
      }
    }
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
//  LIEUX — géocodage admin
// ══════════════════════════════════════════════════════════════
let _lieuxData = [];

async function loadLieux() {
  const rows = await api('GET', 'api/lieux.php?action=collect');
  _lieuxData = rows;
  _renderLieux();
}

function _renderLieux() {
  const el = document.getElementById('lieux-list');
  if (!el) return;
  if (!_lieuxData.length) { el.innerHTML = `<div style="font-size:.85rem;color:var(--ink3);">${T('empty_lieux')}</div>`; return; }
  const geocoded = _lieuxData.filter(l => l.lat != null).length;
  document.getElementById('lieux-progress').textContent = `${geocoded}/${_lieuxData.length} ${T('lieux_geocoded')}`;
  el.innerHTML = _lieuxData.map((l, i) => {
    const ok = l.lat != null;
    const status = ok
      ? `<span style="color:var(--green,#4a7c4e);font-size:.75rem;">✓ ${l.nom_normalise||''}</span>`
      : `<span style="color:var(--ink3);font-size:.75rem;">${T('lieux_not_geocoded')}</span>`;
    return `<div style="display:flex;flex-direction:column;gap:.3rem;padding:.5rem 0;border-bottom:1px solid var(--border);" id="lieu-row-${i}">
      <div style="display:flex;align-items:center;gap:.6rem;flex-wrap:wrap;">
        <span style="flex:1;font-size:.85rem;min-width:120px;">${l.nom_approx}</span>
        <span style="flex:2;min-width:140px;">${status}</span>
        <span style="font-size:.75rem;color:var(--ink3);min-width:110px;">${ok ? `${parseFloat(l.lat).toFixed(4)}, ${parseFloat(l.lng).toFixed(4)}` : ''}</span>
        <button class="btn-sm" onclick="geocodeLieu(${i})">${T('btn_geocode')}</button>
        <button class="btn-sm" onclick="editLieu(${i})">${T('btn_edit')}</button>
      </div>
      <div id="lieu-edit-${i}" style="display:none;padding:.4rem .2rem;gap:.4rem;align-items:center;flex-wrap:wrap;">
        <input id="lieu-edit-input-${i}" type="text" value="${l.nom_approx.replace(/"/g,'&quot;')}" onkeydown="if(event.key==='Enter')editLieuSearch(${i})" style="flex:1;min-width:180px;font-size:.85rem;padding:.3rem .5rem;border:1px solid var(--border);border-radius:6px;background:var(--surface2);">
        <button class="btn-sm btn-primary" onclick="editLieuSearch(${i})">${T('btn_search')}</button>
        <button class="btn-sm" onclick="editLieuClose(${i})">✕</button>
      </div>
    </div>`;
  }).join('');
}

async function geocodeLieu(i) {
  const l = _lieuxData[i];
  if (!l) return;
  try {
    const r = await api('POST', 'api/lieux.php?action=geocode', { nom: l.nom_approx });
    if (r.found === false) { toast(`${l.nom_approx} : ${T('lieux_not_geocoded')}`, 'error'); return; }
    _lieuxData[i] = { ...l, ...r };
    _renderLieux();
    toast(`${l.nom_approx} → ${r.nom_normalise}`);
  } catch(e) { toast(e.message, 'error'); }
}

async function geocodeAllLieux() {
  const btn = document.getElementById('btn-geocode-all');
  if (btn) btn.disabled = true;
  const todo = _lieuxData.filter(l => l.lat == null);
  let done = 0;
  for (const l of todo) {
    const i = _lieuxData.indexOf(l);
    try {
      const r = await api('POST', 'api/lieux.php?action=geocode', { nom: l.nom_approx });
      if (r.found !== false) _lieuxData[i] = { ...l, ...r };
    } catch {}
    done++;
    document.getElementById('lieux-progress').textContent = `${T('lieux_geocoding')} ${done}/${todo.length}…`;
    await new Promise(r => setTimeout(r, 300)); // éviter rate limit
  }
  if (btn) btn.disabled = false;
  _renderLieux();
  toast(T('toast_geocode_done'));
}

function editLieu(i) {
  const el = document.getElementById(`lieu-edit-${i}`);
  if (!el) return;
  el.style.display = 'flex';
  document.getElementById(`lieu-edit-input-${i}`)?.focus();
}

function editLieuClose(i) {
  const el = document.getElementById(`lieu-edit-${i}`);
  if (el) el.style.display = 'none';
}

async function editLieuSearch(i) {
  const l = _lieuxData[i];
  if (!l) return;
  const input = document.getElementById(`lieu-edit-input-${i}`);
  const query = input?.value.trim();
  if (!query) return;
  try {
    const r = await api('POST', 'api/lieux.php?action=geocode', { nom: query, nom_approx: l.nom_approx });
    if (r.found === false) { toast(`${query} : ${T('lieux_not_geocoded')}`, 'error'); return; }
    _lieuxData[i] = { ...l, ...r };
    _renderLieux();
    toast(`${l.nom_approx} → ${r.nom_normalise}`);
  } catch(e) { toast(e.message, 'error'); }
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
