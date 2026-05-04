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
    const hashMap = { personne:'person', evenement:'event', anecdote:'anecdote', tresor:'tresor', recette:'recette', auto:'auto' };
    const rows = logs.map(l => {
      const hash = hashMap[l.type];
      const clickable = hash && l.object_id;
      const isDeleted = l.action === 'suppression';
      const onclick = !clickable ? '' : isDeleted
        ? `onclick="toast(T('admin_log_deleted'),'error')"`
        : `onclick="location.hash='${hash}/${l.object_id}'"`;
      const cursor = clickable ? 'cursor:pointer;' : '';
      return `
      <div ${onclick} style="${cursor}padding:.5rem 0;border-bottom:1px solid var(--border);font-size:.78rem;line-height:1.6;display:flex;flex-wrap:wrap;align-items:baseline;gap:.3rem .4rem;">
        <span style="padding:1px 6px;border-radius:10px;color:#fff;background:${actionColor[l.action]??'#888'};">${encodeHTML(l.action??'')}</span>
        ${l.auteur ? `<span style="font-weight:500;color:var(--ink2);">${encodeHTML(l.auteur)}</span>` : ''}
        <span style="padding:1px 6px;border-radius:10px;background:var(--bg2);color:var(--ink2);">${encodeHTML(l.type??'')}</span>
        <span style="color:var(--ink);word-break:break-word;">${encodeHTML(l.description??'')}</span>
        <span style="color:var(--ink3);white-space:nowrap;margin-left:auto;">${l.created_at?.replace('T',' ').slice(0,16) ?? ''}</span>
      </div>`;
    }).join('');

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
//  CONSULTATIONS
// ══════════════════════════════════════════════════════════════
async function loadAccessLog(offset = 0) {
  const el = document.getElementById('access-log-result');
  if (offset === 0) el.innerHTML = '<p style="font-size:.8rem;color:var(--ink3);">Chargement…</p>';
  try {
    const logs = await api('GET', `api/access_log.php?limit=100&offset=${offset}`);
    if (offset === 0 && !logs.length) {
      el.innerHTML = `<p style="font-size:.8rem;color:var(--ink3);font-style:italic;">${T('admin_access_empty')}</p>`;
      return;
    }
    const typeColor = { vue:'#888', personne:'#1a6eb5', evenement:'#2a7a2a', anecdote:'#b56a1a', tresor:'#7a2a7a', recette:'#c44', auto:'#555' };
    const hashMap   = { personne:'person', evenement:'event', anecdote:'anecdote', tresor:'tresor', recette:'recette', auto:'auto' };
    const rows = logs.map(l => {
      const hash = hashMap[l.type];
      const onclick = hash && l.element_id ? `onclick="location.hash='${hash}/${l.element_id}'"` : '';
      const cursor  = hash && l.element_id ? 'cursor:pointer;' : '';
      const ipLink  = l.ip ? `<a href="https://ipinfo.io/${encodeURIComponent(l.ip)}" target="_blank" rel="noopener" style="color:var(--accent2);text-decoration:none;font-family:monospace;">${encodeHTML(l.ip)}</a>` : '—';
      return `
      <div ${onclick} style="${cursor}padding:.5rem 0;border-bottom:1px solid var(--border);font-size:.78rem;line-height:1.6;display:flex;flex-wrap:wrap;align-items:baseline;gap:.3rem .4rem;">
        <span style="color:var(--ink3);white-space:nowrap;">${l.created_at?.replace('T',' ').slice(0,16) ?? ''}</span>
        <span>${ipLink}</span>
        <span style="font-weight:500;color:var(--ink2);">${encodeHTML(l.nom ?? '—')}</span>
        <span style="color:var(--ink3);font-size:.72rem;">${encodeHTML(l.login ?? '')}</span>
        <span style="padding:1px 6px;border-radius:10px;background:${typeColor[l.type]??'#888'};color:#fff;">${encodeHTML(l.type)}</span>
        ${l.element_name ? `<span style="color:var(--ink);word-break:break-word;">${encodeHTML(l.element_name)}</span>` : ''}
      </div>`;
    }).join('');

    if (offset === 0) {
      el.innerHTML = `<div id="access-log-rows" style="display:flex;flex-direction:column;gap:.2rem;">${rows}</div>`;
    } else {
      document.getElementById('access-log-rows').insertAdjacentHTML('beforeend', rows);
      document.getElementById('access-log-more')?.remove();
    }
    if (logs.length === 100) {
      el.insertAdjacentHTML('beforeend',
        `<button id="access-log-more" class="btn-secondary" onclick="loadAccessLog(${offset + 100})" style="margin-top:.8rem;font-size:.78rem;">${T('admin_logs_load_more')}</button>`);
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

    // ── Anecdotes invisibles (aucun participant membre direct d'un arbre) ──
    const allAnec = await api('GET', 'api/anecdotes.php');
    const invisibles = allAnec.filter(a =>
      a.personne_ids.length > 0 &&
      !a.personne_ids.some(id => _isDirectInAnyTree(id))
    ).sort(_alpha('titre'));
    html += _section('Anecdotes invisibles', invisibles, a =>
      `<div class="user-row" style="cursor:pointer;" onclick="openAnecdote(${a.id})">
        <div style="flex:1;">
          <div style="font-size:.85rem;font-weight:500;">📖 ${encodeHTML(a.titre)}</div>
          <div style="font-size:.72rem;color:#b45309;">Aucun participant dans aucun arbre</div>
        </div>
        <span style="font-size:.7rem;color:var(--ink3);">→</span>
      </div>`);

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
function _clearEntityHash() {
  if (/^#(person|event|anecdote|tresor|recette|auto)\/\d+$/.test(window.location.hash))
    history.replaceState(null, '', window.location.pathname + window.location.search);
}
function closeOverlay(id) {
  document.getElementById(id).classList.remove('open');
  if (id === 'modal-person-view-overlay') _clearEntityHash();
}

// Z-index dynamique : le dernier ouvert est devant
const _Z_FRONT = 310, _Z_BACK = 298;
function _lbBringFront(who) { // 'lightbox' | 'overlay'
  const lb = document.getElementById('lightbox');
  const ov = document.getElementById('modal-person-view-overlay');
  lb.style.zIndex = who === 'lightbox' ? _Z_FRONT : _Z_BACK;
  ov.style.zIndex = who === 'overlay'  ? _Z_FRONT : _Z_BACK;
}

// _lbPersonStacked  : fiche ouverte par-dessus la lightbox (overlay devant)
// _lbOpenedFromPerson: lightbox ouverte par-dessus la fiche (lightbox devant)
let _lbPersonStacked = false, _lbOpenedFromPerson = false;

// Ferme uniquement la fiche, révèle ce qui est derrière
function closePersonModal() {
  const ov = document.getElementById('modal-person-view-overlay');
  ov.classList.remove('open');
  ov.style.zIndex = '';
  document.getElementById('lightbox').style.zIndex = '';
  _lbPersonStacked = false;
  _clearEntityHash();
  // Si la photo était derrière, elle reprend naturellement le premier plan (z CSS)
}

// Ferme la fiche ET ce qui est empilé derrière (clic backdrop)
function closePersonModalAll() {
  const hadStack = _lbPersonStacked || _lbOpenedFromPerson;
  _lbOpenedFromPerson = false;
  closePersonModal();
  if (hadStack) closeLightbox();
}

// Ferme les modals sur clic backdrop uniquement si le mousedown a aussi démarré sur le backdrop
(function() {
  const _specialClose = {
    'modal-person-view-overlay': () => closePersonModalAll(),
    'modal-no-tree-overlay':     () => _cancelNoTree(),
  };
  document.querySelectorAll('.overlay').forEach(ov => {
    let _mdOnSelf = false;
    ov.addEventListener('mousedown', e => { _mdOnSelf = e.target === ov; });
    ov.addEventListener('click', e => {
      if (_mdOnSelf && e.target === ov) {
        (_specialClose[ov.id] || (() => closeOverlay(ov.id)))();
      }
      _mdOnSelf = false;
    });
  });
})();

// Ouvre une fiche depuis un tag de lightbox (lightbox reste ouverte derrière)
function _lbOpenPersonFromTag(personId) {
  _lbPersonStacked = true;
  _lbOpenedFromPerson = false;
  _lbBringFront('overlay');
  openPerson(personId);
}

let _lbGallery = [], _lbIdx = 0;
let _lbGalleryMeta = []; // parallel: [{photoId, source}] or null per entry
let _lbTagMode = false, _lbTags = [], _lbNavAnimating = false;
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
  _lbIdleTimer = setTimeout(() => lb.classList.add('lb-idle'), 2000);
}
document.addEventListener('mousemove', _lbResetIdle);
document.addEventListener('mousedown', _lbResetIdle);
document.addEventListener('touchstart', _lbResetIdle, { passive: true });
document.addEventListener('touchend',   _lbResetIdle, { passive: true });
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
  const personVisible = document.getElementById('modal-person-view-overlay').classList.contains('open');
  if (personVisible) {
    _lbOpenedFromPerson = true;
    _lbPersonStacked = false;
    _lbBringFront('lightbox');
  } else {
    _lbOpenedFromPerson = false;
  }
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
  // ── Face tags ──
  document.getElementById('lb-person-picker')?.remove();
  const _ov = document.getElementById('lb-face-overlay');
  if (_ov) { _ov.innerHTML = ''; _ov.className = 'lb-face-overlay'; _ov.style.display = 'none'; }
  const _tagBtn = document.getElementById('lb-tag-btn');
  const _meta = _lbGalleryMeta[_lbIdx];
  const _canEdit = currentUser && (currentUser.role === 'admin' || currentUser.role === 'editeur');
  if (_tagBtn) _tagBtn.style.display = (_meta && _canEdit) ? '' : 'none';
  if (_tagBtn) { _tagBtn.style.background = ''; _tagBtn.classList.toggle('active', _lbTagMode); }
  // URL deep link
  if (_meta) history.replaceState(null, '', '#photo/' + _meta.source + '/' + _meta.photoId);
  // Titre cliquable (entité parente)
  const _titleEl = document.getElementById('lb-title');
  if (_titleEl) {
    if (_meta?.parentId && _meta?.parentName) {
      const _srcToFn = { person: openPerson, evenement: openEvent, anecdote: openAnecdote, tresor: openTresor, recette: openRecette, auto: openAuto };
      _titleEl.textContent = _meta.parentName;
      _titleEl.onclick = e => { e.stopPropagation(); const fn = _srcToFn[_meta.source]; if (fn) { closeLightboxAll(); fn(_meta.parentId); } };
      _titleEl.style.display = '';
      if (typeof translateText === 'function') {
        const _snapMeta = _meta;
        translateText(_meta.parentName).then(t => {
          if (_lbGalleryMeta[_lbIdx] === _snapMeta) _titleEl.textContent = t;
        });
      }
    } else {
      _titleEl.style.display = 'none';
    }
  }
  // Recharger les tags (et réafficher l'overlay si mode tag actif)
  _lbTags = [];
  if (_meta) { _lbLoadTags(); }
  else if (_lbTagMode) { _lbRenderTags(); }
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
  _lbResetIdle();
  _lbSyncOverlayTransform();
}
function lbZoomOut() {
  const img = document.getElementById('lightbox-img');
  img.style.transform = ''; img.style.transformOrigin = ''; img.style.cursor = 'zoom-in';
  _lbZoomed = false; _lbTx = 0; _lbTy = 0; _lbScale = 1;
  if (!window.matchMedia('(pointer:coarse)').matches) _lbResetIdle();
  _lbPositionFaceOverlay();
}
// Ferme uniquement la photo, révèle ce qui est derrière
function closeLightbox() {
  const lb = document.getElementById('lightbox');
  lb.classList.remove('open','lb-idle');
  lb.style.zIndex = '';
  clearTimeout(_lbIdleTimer);
  lbZoomOut();
  _lbTagMode = false;
  document.getElementById('lb-person-picker')?.remove();
  _lbOpenedFromPerson = false;
  if (window.location.hash.startsWith('#photo/')) history.replaceState(null, '', window.location.pathname + window.location.search);
  // La fiche derrière (si présente) reprend naturellement le premier plan
}

// Ferme la photo ET ce qui est empilé derrière (clic backdrop lightbox)
function closeLightboxAll() {
  const hadStack = _lbPersonStacked || _lbOpenedFromPerson;
  _lbPersonStacked = false;
  closeLightbox();
  if (hadStack) {
    const ov = document.getElementById('modal-person-view-overlay');
    ov.classList.remove('open');
    ov.style.zIndex = '';
  }
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
    _lbSyncOverlayTransform();
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
    if (e.touches.length === 1 && !_lbZoomed && !_lbTagMode) {
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
      if (_lbTagMode) return; // bloquer swipe 1 doigt en mode tag
      const dx = e.touches[0].clientX - _swipeStartX;
      const dy = e.touches[0].clientY - _swipeStartY;
      if (!_swipeDir) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        _swipeDir = Math.abs(dx) >= Math.abs(dy) ? 'h' : 'v';
        // Cacher l'overlay dès que le swipe commence
        _lbNavAnimating = true;
        const _ov = document.getElementById('lb-face-overlay');
        if (_ov) _ov.style.display = 'none';
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
    _lbSyncOverlayTransform();
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
        // Cacher l'overlay pendant toute l'animation de navigation
        _lbNavAnimating = true;
        const _ov = document.getElementById('lb-face-overlay');
        if (_ov) _ov.style.display = 'none';
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
              _lbNavAnimating = false;
              // Repositionner l'overlay après l'animation
              _lbPositionFaceOverlay();
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
          _lbNavAnimating = false;
          _lbPositionFaceOverlay();
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
          _lbNavAnimating = false;
          _lbPositionFaceOverlay();
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

// ── Face tag overlay ──────────────────────────────────────────────────────────
function _lbPositionFaceOverlay() {
  const overlay = document.getElementById('lb-face-overlay');
  if (!overlay) return;
  if (_lbNavAnimating) { overlay.style.display = 'none'; return; }
  if (!_lbTags.length && !_lbTagMode) { overlay.style.display = 'none'; return; }
  // Mesurer la position réelle de l'image sans transform
  const img = document.getElementById('lightbox-img');
  const t = img.style.transform, o = img.style.transformOrigin;
  img.style.transform = ''; img.style.transformOrigin = '';
  const rect = img.getBoundingClientRect();
  img.style.transform = t; img.style.transformOrigin = o;
  if (!rect.width || !rect.height) { overlay.style.display = 'none'; return; }
  overlay.style.left   = rect.left + 'px';
  overlay.style.top    = rect.top + 'px';
  overlay.style.width  = rect.width + 'px';
  overlay.style.height = rect.height + 'px';
  overlay.style.display = '';
  _lbSyncOverlayTransform();
}

function _lbSyncOverlayTransform() {
  const overlay = document.getElementById('lb-face-overlay');
  if (!overlay) return;
  if (_lbZoomed) {
    overlay.style.transformOrigin = '0 0';
    overlay.style.transform = `translate(${_lbTx}px,${_lbTy}px) scale(${_lbScale})`;
    overlay.style.setProperty('--lb-inv-scale', (1 / _lbScale).toFixed(4));
  } else {
    overlay.style.transform = '';
    overlay.style.transformOrigin = '';
    overlay.style.removeProperty('--lb-inv-scale');
  }
}

async function _lbLoadTags() {
  const meta = _lbGalleryMeta[_lbIdx];
  if (!meta) return;
  try {
    _lbTags = await api('GET', `api/photo_tags.php?source=${meta.source}&id=${meta.photoId}`);
    // Attendre que l'image soit chargée avant de positionner l'overlay
    const img = document.getElementById('lightbox-img');
    if (!img.complete || !img.naturalWidth) {
      await new Promise(resolve => {
        img.addEventListener('load', resolve, { once: true });
        img.addEventListener('error', resolve, { once: true });
      });
    }
    _lbRenderTags();
  } catch { _lbTags = []; }
}

function _lbRenderTags() {
  const overlay = document.getElementById('lb-face-overlay');
  if (!overlay) return;
  const canEdit = currentUser && (currentUser.role === 'admin' || currentUser.role === 'editeur');
  overlay.innerHTML = _lbTags.map(t => {
    const delBtn = (canEdit && _lbTagMode)
      ? `<button class="lb-tag-del-btn" onclick="event.stopPropagation();_lbDeleteTag(${t.id})">✕</button>`
      : '';
    return `<div class="lb-face-tag" style="left:${t.x}%;top:${t.y}%;width:${t.w}%;height:${t.h}%;"
      onclick="event.stopPropagation();_lbOpenPersonFromTag(${t.personne_id})">
      <div class="lb-face-label">${encodeHTML(t.prenom)}</div>${delBtn}
    </div>`;
  }).join('');
  overlay.classList.toggle('tag-mode', _lbTagMode && canEdit);
  _lbPositionFaceOverlay();
}

async function _lbDeleteTag(tagId) {
  if (!confirm(T('lb_tag_del_confirm'))) return;
  try {
    await api('DELETE', `api/photo_tags.php?id=${tagId}`);
    _lbTags = _lbTags.filter(t => t.id !== tagId);
    _lbRenderTags();
  } catch(e) { toast(e.message, 'error'); }
}

function lbToggleTagMode() {
  _lbTagMode = !_lbTagMode;
  const btn = document.getElementById('lb-tag-btn');
  if (btn) {
    btn.style.background = '';
    btn.classList.toggle('active', _lbTagMode);
    btn.title = _lbTagMode ? T('lb_tag_btn_on') : T('lb_tag_btn_off');
  }
  document.getElementById('lb-person-picker')?.remove();
  // Bannière
  let banner = document.getElementById('lb-tag-banner');
  const lb = document.getElementById('lightbox');
  if (_lbTagMode) {
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'lb-tag-banner';
      banner.style.cssText = 'position:absolute;bottom:0;left:0;right:0;background:rgba(200,169,110,.9);color:#1a1814;font-size:.8rem;padding:8px 16px;pointer-events:none;z-index:2;white-space:normal;text-align:center;box-sizing:border-box;';
      lb.appendChild(banner);
    }
    banner.textContent = T('lb_tag_banner');
    lb.classList.add('lb-has-banner');
    const titleEl = document.getElementById('lb-title');
    if (titleEl) titleEl.style.bottom = banner.offsetHeight + 'px';
    _lbNaturalRect = null;
    _lbPositionFaceOverlay();
    _lbLoadTags();
  } else {
    banner?.remove();
    lb.classList.remove('lb-has-banner');
    const titleEl = document.getElementById('lb-title');
    if (titleEl) titleEl.style.bottom = '';
    _lbRenderTags(); // met à jour delete buttons + repositionne overlay
  }
}

// Dessin de rectangle en mode tag
// Le rectangle est dessiné dans un div fixed (espace écran) pour éviter les problèmes de transform.
// Les coordonnées sont converties en % de l'image naturelle uniquement à la fin.
function _lbInitDrawing(overlay) {
  let drawing = false, startX, startY, drawEl;
  const activePointers = new Set(); // tous les pointeurs actuellement pressés
  let hadMultiTouch = false;        // vrai si ≥2 doigts simultanés dans ce geste

  function _getDrawContainer() {
    let c = document.getElementById('lb-draw-container');
    if (!c) {
      c = document.createElement('div');
      c.id = 'lb-draw-container';
      c.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:350;';
      document.body.appendChild(c);
    }
    return c;
  }

  function _toPercent(screenX, screenY) {
    const baseLeft = parseFloat(overlay.style.left) || 0;
    const baseTop  = parseFloat(overlay.style.top)  || 0;
    const W = overlay.offsetWidth, H = overlay.offsetHeight;
    let lx, ly;
    if (_lbZoomed) {
      lx = (screenX - baseLeft - _lbTx) / _lbScale;
      ly = (screenY - baseTop  - _lbTy) / _lbScale;
    } else {
      lx = screenX - baseLeft;
      ly = screenY - baseTop;
    }
    return { px: (lx / W) * 100, py: (ly / H) * 100 };
  }

  overlay.addEventListener('pointerdown', e => {
    if (!_lbTagMode) return;
    if (e.target.closest('.lb-face-tag,.lb-tag-del-btn,.lb-person-picker')) return;
    activePointers.add(e.pointerId);
    if (activePointers.size > 1) {
      // 2e doigt = pinch : annuler le dessin en cours
      hadMultiTouch = true;
      if (drawing) { drawing = false; drawEl?.remove(); drawEl = null; }
      return;
    }
    if (hadMultiTouch) return; // encore dans le geste multi-touch
    e.stopPropagation(); e.preventDefault();
    drawing = true;
    overlay.setPointerCapture(e.pointerId);
    startX = e.clientX; startY = e.clientY;
    drawEl = document.createElement('div');
    drawEl.className = 'lb-tag-draw';
    drawEl.style.cssText = `left:${startX}px;top:${startY}px;width:0;height:0;`;
    _getDrawContainer().appendChild(drawEl);
  });

  overlay.addEventListener('pointermove', e => {
    if (!drawing || !drawEl) return;
    _lbResetIdle();
    e.preventDefault();
    const cx = e.clientX, cy = e.clientY;
    drawEl.style.left   = Math.min(startX, cx) + 'px';
    drawEl.style.top    = Math.min(startY, cy) + 'px';
    drawEl.style.width  = Math.abs(cx - startX) + 'px';
    drawEl.style.height = Math.abs(cy - startY) + 'px';
  });

  overlay.addEventListener('pointerup', e => {
    activePointers.delete(e.pointerId);
    if (activePointers.size === 0) hadMultiTouch = false; // tous les doigts levés : réinitialiser
    if (!drawing) return;
    drawing = false;
    if (hadMultiTouch || !drawEl) { drawEl?.remove(); drawEl = null; return; }
    const cx = e.clientX, cy = e.clientY;
    const sw = Math.abs(cx - startX), sh = Math.abs(cy - startY);
    drawEl.remove(); drawEl = null;
    if (sw < 10 || sh < 10) return;
    e.stopPropagation();
    document.addEventListener('click', ev => { if (!ev.target.closest('#lb-tag-btn')) ev.stopPropagation(); }, { capture: true, once: true });
    const p1 = _toPercent(Math.min(startX, cx), Math.min(startY, cy));
    const p2 = _toPercent(Math.max(startX, cx), Math.max(startY, cy));
    _lbShowPersonPicker(p1.px, p1.py, p2.px - p1.px, p2.py - p1.py, e.clientX, e.clientY);
  });

  overlay.addEventListener('pointercancel', e => {
    activePointers.delete(e.pointerId);
    if (activePointers.size === 0) hadMultiTouch = false;
    drawing = false; drawEl?.remove(); drawEl = null;
  });
}

async function _lbShowPersonPicker(px, py, pw, ph, screenX, screenY) {
  document.getElementById('lb-person-picker')?.remove();
  const div = document.createElement('div');
  div.id = 'lb-person-picker';
  const pickerW = Math.min(220, window.innerWidth - 16);
  div.style.cssText = `position:fixed;left:-9999px;top:-9999px;z-index:400;background:#1a1814;border:1px solid rgba(255,255,255,.15);border-radius:8px;padding:.6rem;width:${pickerW}px;box-shadow:0 4px 24px rgba(0,0,0,.8);`;
  div.innerHTML = `<div style="font-size:.75rem;color:rgba(255,255,255,.55);margin-bottom:.4rem;">${T('lb_tag_who')}</div>
    <input id="lb-picker-input" type="text" placeholder="${T('lb_tag_search')}" autocomplete="off"
      style="width:100%;font-size:.82rem;padding:.35rem .5rem;border:1px solid rgba(255,255,255,.2);border-radius:5px;background:rgba(255,255,255,.1);color:#fff;margin-bottom:.4rem;box-sizing:border-box;outline:none;"
      oninput="filterLbPicker(this.value)">
    <div id="lb-picker-list" style="max-height:200px;overflow-y:auto;"><div style="font-size:.8rem;color:rgba(255,255,255,.4);padding:.5rem 0;text-align:center;">…</div></div>
    <button id="lb-picker-add"
      style="margin-top:.4rem;width:100%;font-size:.75rem;padding:.3rem;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.06);color:rgba(255,255,255,.75);border-radius:5px;cursor:pointer;">+ ${T('lb_tag_add')}</button>
    <button id="lb-picker-cancel"
      style="margin-top:.3rem;width:100%;font-size:.75rem;padding:.3rem;border:none;background:rgba(255,255,255,.1);color:#fff;border-radius:5px;cursor:pointer;">${T('lb_tag_cancel')}</button>`;
  document.body.appendChild(div);
  const ph2 = div.offsetHeight;
  const left = Math.min(Math.max(8, screenX + 8), window.innerWidth - pickerW - 8);
  const top  = Math.min(Math.max(8, screenY + 8), window.innerHeight - ph2 - 8);
  div.style.left = left + 'px';
  div.style.top  = top + 'px';
  // Attach fixed buttons synchronously
  document.getElementById('lb-picker-add').addEventListener('pointerdown', e => {
    e.preventDefault();
    _lbShowCreateHorsArbreForm(px, py, pw, ph, screenX, screenY);
  });
  document.getElementById('lb-picker-cancel').addEventListener('pointerdown', e => {
    e.preventDefault();
    document.getElementById('lb-person-picker')?.remove();
  });
  if (!('ontouchstart' in window)) {
    setTimeout(() => document.getElementById('lb-picker-input')?.focus(), 50);
  }
  // Fetch hors_arbre then merge with all people
  let horsArbreList = [];
  try { horsArbreList = await api('GET', `api/personnes.php?hors_arbre=1&_=${Date.now()}`); } catch(e) {}
  const list = document.getElementById('lb-picker-list');
  if (!list) return;
  const taggedIds = new Set(_lbTags.map(t => +t.personne_id));
  const allSorted = [...people.filter(p => !taggedIds.has(+p.id)),
                     ...horsArbreList.filter(p => !taggedIds.has(+p.id))]
    .sort((a, b) => `${a.prenom} ${a.nom}`.localeCompare(`${b.prenom} ${b.nom}`, undefined, {sensitivity:'base'}));
  list.innerHTML = allSorted.map(p => `<div class="lb-picker-item" data-name="${encodeHTML((p.prenom+' '+p.nom).toLowerCase())}"
    data-id="${p.id}"
    onmouseenter="this.style.background='rgba(255,255,255,.12)'" onmouseleave="this.style.background=''"
    style="font-size:14px;line-height:20px;padding:6px 8px;border-radius:4px;cursor:pointer;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block;box-sizing:border-box;"
    >${encodeHTML(p.prenom+' '+p.nom)}</div>`).join('') || `<div style="font-size:.8rem;color:rgba(255,255,255,.4);padding:.5rem 0;text-align:center;">—</div>`;
  list.querySelectorAll('.lb-picker-item').forEach(el => {
    el.addEventListener('pointerdown', e => {
      e.preventDefault();
      const p = allSorted.find(p => +p.id === +el.dataset.id);
      _lbSaveTag(+el.dataset.id, px, py, pw, ph, p ? {prenom: p.prenom, nom: p.nom} : null);
    });
  });
  const inp = document.getElementById('lb-picker-input');
  if (inp?.value) filterLbPicker(inp.value);
  if (div.isConnected) {
    const newTop = Math.min(Math.max(8, screenY + 8), window.innerHeight - div.offsetHeight - 8);
    div.style.top = newTop + 'px';
  }
}


function _lbShowCreateHorsArbreForm(px, py, pw, ph, screenX, screenY) {
  document.getElementById('lb-person-picker')?.remove();
  const div = document.createElement('div');
  div.id = 'lb-person-picker';
  const pickerW = Math.min(220, window.innerWidth - 16);
  div.style.cssText = `position:fixed;left:-9999px;top:-9999px;z-index:400;background:#1a1814;border:1px solid rgba(255,255,255,.15);border-radius:8px;padding:.6rem;width:${pickerW}px;box-shadow:0 4px 24px rgba(0,0,0,.8);`;
  div.innerHTML = `<div style="font-size:.75rem;color:rgba(255,255,255,.55);margin-bottom:.5rem;">${T('lb_tag_new_person')}</div>
    <input id="lb-create-prenom" type="text" placeholder="Prénom" autocomplete="off"
      style="width:100%;font-size:.82rem;padding:.35rem .5rem;border:1px solid rgba(255,255,255,.2);border-radius:5px;background:rgba(255,255,255,.1);color:#fff;margin-bottom:.3rem;box-sizing:border-box;outline:none;">
    <input id="lb-create-nom" type="text" placeholder="Nom" autocomplete="off"
      style="width:100%;font-size:.82rem;padding:.35rem .5rem;border:1px solid rgba(255,255,255,.2);border-radius:5px;background:rgba(255,255,255,.1);color:#fff;margin-bottom:.4rem;box-sizing:border-box;outline:none;">
    <button id="lb-create-submit"
      style="width:100%;font-size:.82rem;padding:.35rem;border:none;background:rgba(139,111,78,.85);color:#fff;border-radius:5px;cursor:pointer;margin-bottom:.3rem;">${T('lb_tag_create')}</button>
    <button id="lb-create-back"
      style="width:100%;font-size:.75rem;padding:.3rem;border:none;background:rgba(255,255,255,.1);color:#fff;border-radius:5px;cursor:pointer;">${T('lb_tag_back')}</button>`;
  document.body.appendChild(div);
  const ph2 = div.offsetHeight;
  const left = Math.min(Math.max(8, screenX + 8), window.innerWidth - pickerW - 8);
  const top  = Math.min(Math.max(8, screenY + 8), window.innerHeight - ph2 - 8);
  div.style.left = left + 'px';
  div.style.top  = top + 'px';

  if (!('ontouchstart' in window)) {
    setTimeout(() => document.getElementById('lb-create-prenom')?.focus(), 50);
  }

  const doSubmit = async () => {
    const prenom = document.getElementById('lb-create-prenom')?.value.trim() || '';
    const nom    = document.getElementById('lb-create-nom')?.value.trim()    || '';
    if (!prenom) { document.getElementById('lb-create-prenom')?.focus(); return; }
    try {
      const r = await api('POST', 'api/personnes.php', { prenom, nom, hors_arbre: 1 });
      if (typeof _horsArbrePeople !== 'undefined' && _horsArbrePeople !== null) _horsArbrePeople = null; // invalidate cache
      _lbSaveTag(r.id, px, py, pw, ph, { prenom, nom });
    } catch(err) { toast(err.message, 'error'); }
  };

  document.getElementById('lb-create-submit')?.addEventListener('pointerdown', e => {
    e.preventDefault();
    doSubmit();
  });
  document.getElementById('lb-create-nom')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') doSubmit();
  });
  document.getElementById('lb-create-prenom')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('lb-create-nom')?.focus();
  });
  document.getElementById('lb-create-back')?.addEventListener('pointerdown', e => {
    e.preventDefault();
    _lbShowPersonPicker(px, py, pw, ph, screenX, screenY);
  });
}

function _norm(s) { return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
function filterLbPicker(q) {
  const lq = _norm(q);
  document.querySelectorAll('.lb-picker-item').forEach(el => {
    el.style.display = _norm(el.dataset.name).includes(lq) ? '' : 'none';
  });
}

async function _lbSaveTag(personId, px, py, pw, ph, personHint = null) {
  document.getElementById('lb-person-picker')?.remove();
  const meta = _lbGalleryMeta[_lbIdx];
  if (!meta) return;
  const person = personHint || people.find(p => p.id === personId);
  try {
    const r = await api('POST', 'api/photo_tags.php', {
      source: meta.source, photo_id: meta.photoId,
      personne_id: personId, x: px, y: py, w: pw, h: ph
    });
    _lbTags.push({ ...r, prenom: person?.prenom||'', nom: person?.nom||'' });
    _lbRenderTags();
    toast(`${person?.prenom||''} ${person?.nom||''} ${T('lb_tag_identified')}`);
  } catch(e) { toast(e.message, 'error'); }
}

window.addEventListener('resize', () => { if (!_lbZoomed) _lbPositionFaceOverlay(); });
document.addEventListener('DOMContentLoaded', () => {
  const ov = document.getElementById('lb-face-overlay');
  if (ov) _lbInitDrawing(ov);
});

function toast(msg,type='ok',duration=2800){
  const el=document.getElementById('toast');
  el.textContent=msg;
  el.style.background=type==='error'?'#c44':type==='info'?'#1a6eb5':'var(--ink)';
  el.classList.add('show');
  setTimeout(()=>el.classList.remove('show'),duration);
}

async function logout(){
  await fetch('api/auth.php?action=logout',{method:'POST'});
  localStorage.removeItem('authorName');
  localStorage.setItem('genealogie_author_reminder', Date.now() + 7 * 24 * 60 * 60 * 1000);
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
    const lbOpen = document.getElementById('lightbox').classList.contains('open');
    const ovOpen = document.getElementById('modal-person-view-overlay').classList.contains('open');
    if (lbOpen && _lbOpenedFromPerson) {
      // Photo ouverte depuis fiche : fermer la photo, révéler la fiche
      closeLightbox();
    } else if (ovOpen && _lbPersonStacked) {
      // Fiche ouverte depuis photo : fermer la fiche, révéler la photo
      closePersonModal();
    } else {
      // Pas d'empilement : tout fermer
      document.querySelectorAll('.overlay.open').forEach(el => {
        el.classList.remove('open');
        el.style.zIndex = '';
      });
      closeLightbox();
    }
  }
  if (document.getElementById('lightbox').classList.contains('open')) {
    if (e.key === 'ArrowLeft')  lbNav(-1);
    if (e.key === 'ArrowRight') lbNav(1);
  }
});

// ══════════════════════════════════════════════════════════════
//  DEV
// ══════════════════════════════════════════════════════════════
async function devRunCron(dry = true) {
  const out = document.getElementById('dev-cron-output');
  out.style.display = 'block';
  out.textContent = '…';
  try {
    const url = 'api/dev.php?action=run_cron' + (dry ? '&dry=1' : '');
    const res = await api('POST', url);
    out.textContent = res.output || '(aucune sortie)';
  } catch(e) { out.textContent = '❌ ' + e.message; }
}

async function devUploadSize() {
  const el = document.getElementById('dev-upload-size');
  el.style.display = 'block';
  el.textContent = '…';
  try {
    const res = await api('GET', 'api/dev.php?action=upload_size');
    const mb = (res.bytes / 1024 / 1024).toFixed(2);
    el.textContent = `📁 ${mb} Mo — ${res.files} fichier(s)`;
  } catch(e) { el.textContent = '❌ ' + e.message; }
}

function devDemoReminder() {
  toast(T('author_reminder'), 'info', 6000);
}

function devDemoError() {
  Promise.reject(new Error('Test erreur simulée'));
}

init().catch(err => {
  document.body.innerHTML = '<div style="padding:2rem;font-family:monospace;color:red;background:#fff;position:fixed;inset:0;overflow:auto;z-index:9999;">'
    + '<h2>Erreur au démarrage</h2><pre>' + err.stack + '</pre></div>';
  console.error('init() failed:', err);
});
