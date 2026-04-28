// ══════════════════════════════════════════════════════════════
//  EVENTS
// ══════════════════════════════════════════════════════════════
async function loadEvents(){
  const all = await api('GET','api/evenements.php');
  const evts = all.filter(e=>e.type!=='demenagement'&&(!_currentMembers||e.personne_ids.some(id=>inCurrentTreeDirect(id))));
  const el=document.getElementById('events-grid');
  if(!evts.length){el.innerHTML=`<div class="empty"><div class="empty-icon">📅</div><div class="empty-title">${T('empty_events')}</div><div class="empty-sub">${T('empty_events_sub')}</div></div>`;return;}
  evts.sort((a,b)=>{
    if(!a.date_debut && !b.date_debut) return 0;
    if(!a.date_debut) return 1;
    if(!b.date_debut) return -1;
    return a.date_debut < b.date_debut ? 1 : a.date_debut > b.date_debut ? -1 : 0;
  });
  const rows=await Promise.all(evts.map(e=>translateFields(e,['titre'])));
  el.innerHTML=rows.map(e=>`
    <div class="ev-card" onclick="openEvent(${e.id})">
      ${e.thumb?`<img class="ev-thumb" src="${imgUrl(e.thumb)}" alt="">`:''}
      <div class="ev-title">${e.titre}</div>
      <div class="ev-meta">${[fmtDate(e.date_debut),e.lieu].filter(Boolean).join(' · ')}${e.nb_personnes>0?` · ${e.nb_personnes} ${T('nb_personnes_label')}`:''}</div>
      <div id="react-evenement-${e.id}"></div>
    </div>`).join('');
  rows.forEach(e => loadReactions('evenement', e.id, `react-evenement-${e.id}`, true));
}

async function openEvent(id){
  let e=await api('GET',`api/evenements.php?id=${id}`);
  e=await translateFields(e,['titre','description']);
  // Avatar : photo préférée ou icône type
  const avatarHtml = e.thumb
    ? `<div class="modal-av" style="border-radius:10px;overflow:hidden;width:60px;height:60px;flex-shrink:0;"><img src="${imgUrl(e.thumb)}" style="width:100%;height:100%;object-fit:cover;" alt=""></div>`
    : `<div style="font-size:1.8rem;line-height:1;">📅</div>`;
  let html=`<div class="modal-hd" style="padding:1.2rem 1.4rem .8rem;">
    ${avatarHtml}
    <div class="modal-ti"><div class="modal-name">${e.titre}</div></div>
    <button class="modal-close" onclick="closeOverlay('modal-person-view-overlay')">✕</button>
  </div><div class="modal-bd">`;
  if(e.date_debut||e.lieu){
    html+=`<div class="modal-section"><div class="sec-title">${T('sec_info')}</div>`;
    if(e.date_debut) html+=`<div class="info-row"><span class="info-icon">📅</span><span class="info-label">${T('lbl_date')}</span><span class="info-val">${fmtDate(e.date_debut)}${e.date_fin&&e.date_fin!==e.date_debut?' → '+fmtDate(e.date_fin):''}</span></div>`;
    if(e.lieu) html+=`<div class="info-row"><span class="info-icon">📍</span><span class="info-label">${T('form_lieu')}</span><span class="info-val">${e.lieu}</span></div>`;
    html+=`</div>`;
  }
  if(e.description) html+=`<div class="modal-section"><div class="sec-title">${T('sec_description')}</div><div class="notes-box">${e.description.replace(/\n/g,'<br>')}</div></div>`;
  if((e.personnes||[]).length){
    html+=`<div class="modal-section"><div class="sec-title">${T('sec_participants')}</div>`;
    e.personnes.forEach(p=>{
      const av=p.chemin_thumb?`<div class="fl-av ${p.genre}"><img src="${imgUrl(p.chemin_thumb)}" alt=""></div>`:`<div class="fl-av ${p.genre}">${(p.prenom[0]||'')+(p.nom[0]||'')}</div>`;
      html+=`<div class="family-link" onclick="openPerson(${p.id});closeOverlay('modal-person-view-overlay')">${av}<div><div class="fl-name">${p.prenom}</div>${p.role?`<div class="fl-role">${p.role}</div>`:''}</div></div>`;
    }); html+=`</div>`;
  }
  if((e.photos||[]).length){
    html+=`<div class="modal-section"><div class="sec-title">${T('sec_photos')}</div><div class="photos-strip">`;
    _lbGallery = e.photos.map(p=>imgUrl(p.chemin));
    _lbGalleryMeta = e.photos.map(p=>({photoId:p.id, source:'evenement', parentId:e.id, parentName:e.titre}));
    const _evEffId = e.photo_id || e.photos[0]?.id;
    e.photos.forEach((ph,i)=>{
      const isMain = ph.id == _evEffId;
      const mainBadge = isMain ? `<div style="position:absolute;bottom:3px;left:3px;background:var(--accent);color:#fff;font-size:.55rem;padding:2px 5px;border-radius:4px;letter-spacing:.03em;">${T('event_favourite')}</div>` : '';
      const setBtn = (!isMain && currentUser.role!=='lecteur') ? `<div onclick="event.stopPropagation();setEventAvatar(${id},${ph.id})" style="position:absolute;top:3px;right:3px;background:rgba(26,24,20,.55);color:#fff;font-size:.6rem;padding:2px 6px;border-radius:4px;cursor:pointer;" title="${T('event_favourite')}">★</div>` : '';
      const delBtn = (currentUser.role!=='lecteur') ? `<div onclick="event.stopPropagation();deleteEventPhoto(${id},${ph.id})" style="position:absolute;bottom:3px;right:3px;background:rgba(180,40,40,.7);color:#fff;font-size:.6rem;padding:2px 6px;border-radius:4px;cursor:pointer;" title="${T('btn_delete_photo')}">🗑</div>` : '';
      html+=`<div style="position:relative;display:inline-block;"><img class="photo-thumb" src="${imgUrl(ph.chemin_thumb||ph.chemin)}" onclick="openLightbox(${i})" title="${ph.legende||''}">${mainBadge}${setBtn}${delBtn}</div>`;
    });
    html+=`</div></div>`;
  }
  html+=`<div id="react-evenement-detail-${id}"></div>`;
  if(currentUser.role!=='lecteur'){
    html+=`<div style="display:flex;gap:8px;margin-top:1rem;">
      <button class="btn-secondary" style="flex:1;font-size:.78rem;" onclick="showEventForm(${id});closeOverlay('modal-person-view-overlay')">${T('btn_edit')}</button>
      <button class="btn-danger" style="font-size:.78rem;" onclick="deleteEvent(${id})">🗑</button>
    </div>`;
  }
  html+=`</div>`;
  const _mv_ev = document.getElementById('modal-person-view');
  _mv_ev.innerHTML=html;
  _mv_ev.style.maxWidth='640px';
  document.getElementById('modal-person-view-overlay').classList.add('open');
  _mv_ev.scrollTop=0;
  history.replaceState(null, '', '#event/' + id);
  loadReactions('evenement', id, `react-evenement-detail-${id}`);
}

async function showEventForm(id){
  // Charger les données existantes si modification
  let e = null;
  if (id) { try { e = await api('GET', `api/evenements.php?id=${id}`); } catch {} }

  const participantIds = new Set((e?.personnes||[]).map(p=>String(p.id)));
  const peopleOptions = people.filter(p=>inCurrentTree(p.id)).map(p=>`<option value="${p.id}"${participantIds.has(String(p.id))?' selected':''}>${p.prenom}</option>`).join('');

  document.getElementById('modal-form-event').innerHTML=`
    <div class="modal-hd" style="padding:1.2rem 1.4rem .8rem;">
      <div style="flex:1;font-family:'Cormorant Garamond',serif;font-size:1.25rem;font-weight:500;">${id?T('form_title_edit'):T('form_title_new_event')}</div>
      <button class="modal-close" onclick="closeOverlay('modal-form-event-overlay')">✕</button>
    </div>
    <div class="modal-bd">
      <input type="hidden" id="fe-type" value="${e?.type||'autre'}">
      <div class="form-grid">
        <div class="fg full"><label>${T('form_titre')} *</label><input id="fe-titre" value="${e?.titre||''}" placeholder="${T('ph_titre_event')}"></div>
        <div class="fg"><label>${T('form_date_debut')}</label><input type="date" id="fe-date-debut" value="${e?.date_debut||''}"></div>
        <div class="fg"><label>${T('form_date_fin')}</label><input type="date" id="fe-date-fin" value="${e?.date_fin||''}"></div>
        <div class="fg full"><label>${T('form_lieu')}</label><input id="fe-lieu" value="${e?.lieu||''}" placeholder="${T('ph_lieu')}" oninput="checkDemenagementLieu()"><div id="fe-lieu-warn" style="display:none;font-size:.72rem;color:#b45309;margin-top:3px;">⚠️ <span></span></div></div>
        <div class="fg full"><label>${T('sec_description')}</label><textarea id="fe-desc" placeholder="${T('ph_desc_event')}">${encodeHTML(e?.description||'')}</textarea></div>
        <div class="fg full"><label>${T('form_participants')}</label><select id="fe-personnes" multiple size="6" style="height:130px;">${peopleOptions}</select></div>
      </div>
      ${id ? `<div class="fg full" style="margin-top:.8rem;">
        <div class="fg-section-label">${T('lbl_add_photos')}</div>
        <div class="upload-zone">
          <input type="file" accept="image/*" multiple onchange="previewEventPhotos(this)">
          <div class="upload-icon">📷</div>
          <div class="upload-label">${T(_isTouch?'lbl_upload_hint_touch':'lbl_upload_hint')}<br><span style="font-size:.7rem;color:var(--ink3);">${T('lbl_upload_max')}</span></div>
        </div>
        <div class="upload-preview" id="evt-upload-preview"></div>
      </div>` : ''}
      <div class="form-actions">
        <button class="btn-primary" onclick="saveEvent(${id||''})">${T('form_save')}</button>
        ${id ? `<button class="btn-secondary" onclick="uploadEventPhotos(${id})" style="font-size:.78rem;">📤 ${T('lbl_add_photos')}</button>` : ''}
        <button class="btn-secondary" onclick="closeOverlay('modal-form-event-overlay')">${T('form_cancel')}</button>
      </div>
    </div>`;
  document.getElementById('modal-form-event-overlay').classList.add('open');
}

function checkDemenagementLieu() {
  const type = document.getElementById('fe-type')?.value;
  const lieu = document.getElementById('fe-lieu')?.value.trim();
  const warn = document.getElementById('fe-lieu-warn');
  if (!warn) return;
  const show = type === 'demenagement' && !lieu;
  warn.style.display = show ? '' : 'none';
  if (show) warn.querySelector('span').textContent = T('warn_demenagement_lieu');
}

let pendingEventFiles = [];
function previewEventPhotos(input) {
  pendingEventFiles = Array.from(input.files);
  const prev = document.getElementById('evt-upload-preview');
  if (!prev) return;
  prev.innerHTML = '';
  pendingEventFiles.forEach(f => {
    const r = new FileReader();
    r.onload = e => { prev.innerHTML += `<img src="${e.target.result}" alt="">`; };
    r.readAsDataURL(f);
  });
}

async function uploadEventPhotos(eventId) {
  if (!pendingEventFiles.length) { toast(T('error_no_photo'), 'error'); return; }
  for (const f of pendingEventFiles) {
    const fd = new FormData();
    fd.append('photo', f);
    await fetch(`api/evenements.php?id=${eventId}&sub=photos`, { method:'POST', body:fd });
  }
  pendingEventFiles = [];
  toast(T('toast_photos_added'));
  closeOverlay('modal-form-event-overlay');
  await loadEvents();
  openEvent(eventId);
}

async function saveEvent(id){
  const sel=document.getElementById('fe-personnes');
  const personnes=Array.from(sel.selectedOptions).map(o=>({id:o.value,role:''}));
  const body={titre:document.getElementById('fe-titre').value.trim(),type:document.getElementById('fe-type').value,date_debut:document.getElementById('fe-date-debut').value||null,date_fin:document.getElementById('fe-date-fin').value||null,lieu:document.getElementById('fe-lieu').value.trim()||null,description:document.getElementById('fe-desc').value.trim()||null,personnes};
  if(!body.titre){toast(T('error_title_required'),'error');return;}
  try{
    if(id) await api('PUT',`api/evenements.php?id=${id}`,body);
    else   await api('POST','api/evenements.php',body);
    closeOverlay('modal-form-event-overlay'); loadEvents(); toast(id?T('toast_event_edited'):T('toast_event_added'));
  }catch(e){toast(e.message,'error');}
}

async function deleteEvent(id){
  if(!confirm(T('confirm_delete_event'))) return;
  await api('DELETE',`api/evenements.php?id=${id}`);
  closeOverlay('modal-person-view-overlay'); loadEvents(); toast(T('toast_event_deleted'));
}

// ══════════════════════════════════════════════════════════════
//  ANECDOTES
// ══════════════════════════════════════════════════════════════
async function loadAnecdotes(){
  const all=await api('GET','api/anecdotes.php');
  const filtered=all.filter(a=>!_currentMembers||!a.personne_ids.length||a.personne_ids.some(id=>inCurrentTreeDirect(id)));
  const rows=await Promise.all(filtered.map(a=>translateFields(a,['titre','contenu'])));
  const el=document.getElementById('anecdotes-list');
  if(!rows.length){el.innerHTML=`<div class="empty"><div class="empty-icon">📖</div><div class="empty-title">${T('empty_anecdotes')}</div><div class="empty-sub">${T('empty_anecdotes_sub')}</div></div>`;return;}
  el.innerHTML=rows.map(a=>`
    <div class="an-card" onclick="openAnecdote(${a.id})" style="margin-bottom:10px;display:flex;align-items:flex-start;gap:14px;">
      ${a.thumb?`<img src="${imgUrl(a.thumb)}" style="width:48px;height:48px;object-fit:cover;border-radius:6px;flex-shrink:0;" alt="">`:`<span style="font-size:1.5rem;flex-shrink:0;margin-top:2px;">📖</span>`}
      <div style="flex:1;">
        <div class="an-title">${a.titre}</div>
        <div class="an-meta">${[a.date_anec,a.auteur?T('lbl_by')+' '+a.auteur:'',a.personnes_noms?T('lbl_with')+' '+a.personnes_noms:''].filter(Boolean).join(' · ')}</div>
        <div class="an-excerpt">${a.contenu.replace(/\n/g,'<br>')}</div>
        <div id="react-anecdote-${a.id}"></div>
      </div>
    </div>`).join('');
  rows.forEach(a => loadReactions('anecdote', a.id, `react-anecdote-${a.id}`, true));
}

async function openAnecdote(id){
  let a=await api('GET',`api/anecdotes.php?id=${id}`);
  a=await translateFields(a,['titre','contenu']);
  let html=`<div class="modal-hd" style="padding:1.2rem 1.4rem .8rem;">
    <div style="font-size:1.5rem;">📖</div>
    <div class="modal-ti"><div class="modal-name">${a.titre}</div>${a.date_anec||a.auteur?`<div class="modal-maiden">${[a.date_anec,a.auteur?T('lbl_by')+' '+a.auteur:''].filter(Boolean).join(' · ')}</div>`:''}</div>
    <button class="modal-close" onclick="closeOverlay('modal-person-view-overlay')">✕</button>
  </div><div class="modal-bd">`;
  html+=`<div class="notes-box" style="margin-bottom:1rem;">${a.contenu.replace(/\n/g,'<br>')}</div>`;
  if((a.personnes||[]).length){
    html+=`<div class="modal-section"><div class="sec-title">${T('form_mentions')}</div>`;
    a.personnes.forEach(p=>{
      const av=p.chemin_thumb?`<div class="fl-av ${p.genre}"><img src="${imgUrl(p.chemin_thumb)}" alt=""></div>`:`<div class="fl-av ${p.genre}">${(p.prenom[0]||'')+(p.nom[0]||'')}</div>`;
      html+=`<div class="family-link" onclick="openPerson(${p.id});closeOverlay('modal-person-view-overlay')">${av}<div class="fl-name">${p.prenom}</div></div>`;
    }); html+=`</div>`;
  }
  if((a.photos||[]).length){
    html+=`<div class="modal-section"><div class="sec-title">${T('sec_photos')}</div><div class="photos-strip">`;
    _lbGallery = a.photos.map(p=>imgUrl(p.chemin));
    _lbGalleryMeta = a.photos.map(p=>({photoId:p.id, source:'anecdote', parentId:a.id, parentName:a.titre}));
    const _anEffId = a.photo_id || a.photos[0]?.id;
    a.photos.forEach((ph,i)=>{
      const isMain = ph.id == _anEffId;
      const mainBadge = isMain ? `<div style="position:absolute;bottom:3px;left:3px;background:var(--accent);color:#fff;font-size:.55rem;padding:2px 5px;border-radius:4px;letter-spacing:.03em;">${T('event_favourite')}</div>` : '';
      const setBtn = (!isMain && currentUser.role!=='lecteur') ? `<div onclick="event.stopPropagation();setAnecdoteAvatar(${a.id},${ph.id})" style="position:absolute;top:3px;right:3px;background:rgba(26,24,20,.55);color:#fff;font-size:.6rem;padding:2px 6px;border-radius:4px;cursor:pointer;" title="${T('event_favourite')}">★</div>` : '';
      const delBtn = currentUser.role!=='lecteur' ? `<div onclick="event.stopPropagation();deleteAnecdotePhoto(${a.id},${ph.id})" style="position:absolute;bottom:3px;right:3px;background:rgba(180,40,40,.7);color:#fff;font-size:.6rem;padding:2px 6px;border-radius:4px;cursor:pointer;" title="${T('btn_delete_photo')}">🗑</div>` : '';
      html+=`<div style="position:relative;display:inline-block;"><img class="photo-thumb" src="${imgUrl(ph.chemin_thumb||ph.chemin)}" onclick="openLightbox(${i})">${mainBadge}${setBtn}${delBtn}</div>`;
    });
    html+=`</div></div>`;
  }
  html+=`<div id="react-anecdote-detail-${id}"></div>`;
  if(currentUser.role!=='lecteur') html+=`<div style="display:flex;gap:8px;margin-top:1rem;"><button class="btn-secondary" style="flex:1;font-size:.78rem;" onclick="showAnecdoteForm(${id});closeOverlay('modal-person-view-overlay')">${T('btn_edit')}</button><button class="btn-danger" style="font-size:.78rem;" onclick="deleteAnecdote(${id})">🗑</button></div>`;
  html+=`</div>`;
  const _mv_an = document.getElementById('modal-person-view');
  _mv_an.innerHTML=html;
  document.getElementById('modal-person-view-overlay').classList.add('open');
  _mv_an.scrollTop=0;
  history.replaceState(null, '', '#anecdote/' + id);
  loadReactions('anecdote', id, `react-anecdote-detail-${id}`);
}

async function showAnecdoteForm(id){
  let a = null;
  if (id) { try { a = await api('GET', `api/anecdotes.php?id=${id}`); } catch {} }

  const mentionIds = new Set((a?.personnes||[]).map(p=>String(p.id)));
  const peopleOptions=people.map(p=>`<option value="${p.id}"${mentionIds.has(String(p.id))?' selected':''}>${p.prenom}</option>`).join('');

  document.getElementById('modal-form-anecdote').innerHTML=`
    <div class="modal-hd" style="padding:1.2rem 1.4rem .8rem;">
      <div style="flex:1;font-family:'Cormorant Garamond',serif;font-size:1.25rem;font-weight:500;">${id?T('form_title_edit'):T('form_title_new_anec')}</div>
      <button class="modal-close" onclick="closeOverlay('modal-form-anecdote-overlay')">✕</button>
    </div>
    <div class="modal-bd">
      <div class="fg"><label>${T('form_titre')} *</label><input id="fa-titre" value="${encodeHTML(a?.titre||'')}" placeholder="${T('ph_titre_anec')}"></div>
      <div class="fg"><label>${T('form_contenu')} *</label><textarea id="fa-contenu" style="min-height:160px;" placeholder="${T('ph_contenu_anec')}">${encodeHTML(a?.contenu||'')}</textarea></div>
      <div class="form-grid">
        <div class="fg"><label>${T('form_date_approx')}</label><input id="fa-date" value="${a?.date_anec||''}" placeholder="${T('ph_date_anec')}"></div>
        <div class="fg"><label>${T('form_written_by')}</label><input id="fa-auteur" value="${a?.auteur ?? authorName ?? ''}" placeholder="${T('author_placeholder')}"></div>
        <div class="fg full"><label>${T('form_mentions')}</label><select id="fa-personnes" multiple size="5" style="height:110px;">${peopleOptions}</select></div>
      </div>
      ${id ? `<div class="fg full" style="margin-top:.8rem;">
        <div class="fg-section-label">${T('lbl_add_photos')}</div>
        <div class="upload-zone">
          <input type="file" accept="image/*" multiple onchange="previewAnecdotePhotos(this)">
          <div class="upload-icon">📷</div>
          <div class="upload-label">${T(_isTouch?'lbl_upload_hint_touch':'lbl_upload_hint')}<br><span style="font-size:.7rem;color:var(--ink3);">${T('lbl_upload_max')}</span></div>
        </div>
        <div class="upload-preview" id="anec-upload-preview"></div>
      </div>` : ''}
      <div class="form-actions">
        <button class="btn-primary" onclick="saveAnecdote(${id||''})">${T('form_save')}</button>
        ${id ? `<button class="btn-secondary" onclick="uploadAnecdotePhotos(${id})" style="font-size:.78rem;">📤 ${T('lbl_add_photos')}</button>` : ''}
        <button class="btn-secondary" onclick="closeOverlay('modal-form-anecdote-overlay')">${T('form_cancel')}</button>
      </div>
    </div>`;
  document.getElementById('modal-form-anecdote-overlay').classList.add('open');
}

let pendingAnecdoteFiles = [];
function previewAnecdotePhotos(input) {
  pendingAnecdoteFiles = Array.from(input.files);
  const prev = document.getElementById('anec-upload-preview');
  if (!prev) return;
  prev.innerHTML = '';
  pendingAnecdoteFiles.forEach(f => {
    const r = new FileReader();
    r.onload = e => { prev.innerHTML += `<img src="${e.target.result}" alt="">`; };
    r.readAsDataURL(f);
  });
}

async function uploadAnecdotePhotos(anecdoteId) {
  if (!pendingAnecdoteFiles.length) { toast(T('error_no_photo'), 'error'); return; }
  for (const f of pendingAnecdoteFiles) {
    const fd = new FormData();
    fd.append('photo', f);
    await fetch(`api/anecdotes.php?id=${anecdoteId}&sub=photos`, { method:'POST', body:fd });
  }
  pendingAnecdoteFiles = [];
  toast(T('toast_photos_added'));
  closeOverlay('modal-form-anecdote-overlay');
  loadAnecdotes();
}

async function setAnecdoteAvatar(anecdoteId, photoId) {
  try {
    await api('PUT', `api/anecdotes.php?id=${anecdoteId}&sub=photos&subid=${photoId}`);
    toast(T('event_avatar_set'));
    openAnecdote(anecdoteId);
    loadAnecdotes();
  } catch(e) { toast(e.message, 'error'); }
}

async function deleteAnecdotePhoto(anecdoteId, photoId) {
  if (!confirm(T('btn_delete_photo') + ' ?')) return;
  try {
    await api('DELETE', `api/anecdotes.php?id=${anecdoteId}&sub=photos&subid=${photoId}`);
    toast(T('toast_anec_edited'));
    openAnecdote(anecdoteId);
  } catch(e) { toast(e.message, 'error'); }
}

async function saveAnecdote(id){
  const sel=document.getElementById('fa-personnes');
  const personnes=Array.from(sel.selectedOptions).map(o=>parseInt(o.value));
  const body={titre:document.getElementById('fa-titre').value.trim(),contenu:document.getElementById('fa-contenu').value.trim(),date_anec:document.getElementById('fa-date').value.trim()||null,auteur:document.getElementById('fa-auteur').value.trim()||null,personnes};
  if(!body.titre||!body.contenu){toast(T('error_title_content_required'),'error');return;}
  try{
    if(id) await api('PUT',`api/anecdotes.php?id=${id}`,body);
    else   await api('POST','api/anecdotes.php',body);
    closeOverlay('modal-form-anecdote-overlay'); loadAnecdotes(); toast(id?T('toast_anec_edited'):T('toast_anec_added'));
  }catch(e){toast(e.message,'error');}
}

async function deleteAnecdote(id){
  if(!confirm(T('confirm_delete_anec'))) return;
  await api('DELETE',`api/anecdotes.php?id=${id}`);
  closeOverlay('modal-person-view-overlay'); loadAnecdotes(); toast(T('toast_anec_deleted'));
}

