// ══════════════════════════════════════════════════════════════
//  RÉUNIONS FAMILIALES
// ══════════════════════════════════════════════════════════════
async function loadReunions(){
  const all=await api('GET','api/reunions.php');
  const evts=all.filter(e=>!_currentMembers||!e.personne_ids.length||e.personne_ids.some(id=>inCurrentTreeDirect(id)));
  const el=document.getElementById('reunions-grid');
  if(!evts.length){el.innerHTML=`<div class="empty"><div class="empty-icon">🏡</div><div class="empty-title">${T('empty_reunions')}</div><div class="empty-sub">${T('empty_reunions_sub')}</div></div>`;return;}
  evts.sort((a,b)=>{
    if(!a.date_debut && !b.date_debut) return 0;
    if(!a.date_debut) return 1;
    if(!b.date_debut) return -1;
    return a.date_debut > b.date_debut ? -1 : a.date_debut < b.date_debut ? 1 : 0;
  });
  el.innerHTML=evts.map(e=>`
    <div class="ev-card" onclick="openReunion(${e.id})">
      ${e.thumb?`<img class="ev-thumb" src="${imgUrl(e.thumb)}" alt="">`:''}
      <div class="ev-title">${e.titre}</div>
      <div class="ev-meta">${[fmtDate(e.date_debut),e.lieu].filter(Boolean).join(' · ')}${e.nb_personnes>0?` · ${e.nb_personnes} ${T('nb_personnes_label')}`:''}</div>
    </div>`).join('');
}

async function openReunion(id){
  const e=await api('GET',`api/reunions.php?id=${id}`);
  const avatarHtml = e.thumb
    ? `<div class="modal-av" style="border-radius:10px;overflow:hidden;width:60px;height:60px;flex-shrink:0;"><img src="${imgUrl(e.thumb)}" style="width:100%;height:100%;object-fit:cover;" alt=""></div>`
    : `<div style="font-size:1.8rem;line-height:1;">🏡</div>`;
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
      html+=`<div class="family-link" onclick="openPerson(${p.id});closeOverlay('modal-person-view-overlay')">${av}<div><div class="fl-name">${p.prenom} ${p.nom}</div>${p.role?`<div class="fl-role">${p.role}</div>`:''}</div></div>`;
    }); html+=`</div>`;
  }
  if((e.photos||[]).length){
    html+=`<div class="modal-section"><div class="sec-title">${T('sec_photos')}</div><div class="photos-strip">`;
    _lbGallery = e.photos.map(p=>imgUrl(p.chemin));
    const _reEffId = e.photo_id || e.photos[0]?.id;
    e.photos.forEach((ph,i)=>{
      const isMain = ph.id == _reEffId;
      const mainBadge = isMain ? `<div style="position:absolute;bottom:3px;left:3px;background:var(--accent);color:#fff;font-size:.55rem;padding:2px 5px;border-radius:4px;letter-spacing:.03em;">${T('event_favourite')}</div>` : '';
      const setBtn = (!isMain && currentUser.role!=='lecteur') ? `<div onclick="event.stopPropagation();setReunionAvatar(${id},${ph.id})" style="position:absolute;top:3px;right:3px;background:rgba(26,24,20,.55);color:#fff;font-size:.6rem;padding:2px 6px;border-radius:4px;cursor:pointer;" title="${T('event_favourite')}">★</div>` : '';
      const delBtn = (currentUser.role!=='lecteur') ? `<div onclick="event.stopPropagation();deleteReunionPhoto(${id},${ph.id})" style="position:absolute;bottom:3px;right:3px;background:rgba(180,40,40,.7);color:#fff;font-size:.6rem;padding:2px 6px;border-radius:4px;cursor:pointer;" title="${T('btn_delete_photo')}">🗑</div>` : '';
      html+=`<div style="position:relative;display:inline-block;"><img class="photo-thumb" src="${imgUrl(ph.chemin_thumb||ph.chemin)}" onclick="openLightbox(${i})" title="${ph.legende||''}">${mainBadge}${setBtn}${delBtn}</div>`;
    });
    html+=`</div></div>`;
  }
  if(currentUser.role!=='lecteur'){
    html+=`<div style="display:flex;gap:8px;margin-top:1rem;">
      <button class="btn-secondary" style="flex:1;font-size:.78rem;" onclick="showReunionForm(${id});closeOverlay('modal-person-view-overlay')">${T('btn_edit')}</button>
      <button class="btn-danger" style="font-size:.78rem;" onclick="deleteReunion(${id})">🗑</button>
    </div>`;
  }
  html+=`</div>`;
  document.getElementById('modal-person-view').innerHTML=html;
  document.getElementById('modal-person-view-overlay').classList.add('open');
  document.getElementById('modal-person-view').style.maxWidth='640px';
}

async function showReunionForm(id){
  let e = null;
  if (id) { try { e = await api('GET', `api/reunions.php?id=${id}`); } catch {} }

  const participantIds = new Set((e?.personnes||[]).map(p=>String(p.id)));
  const peopleOptions = people.map(p=>`<option value="${p.id}"${participantIds.has(String(p.id))?' selected':''}>${fullName(p)}</option>`).join('');

  document.getElementById('modal-form-reunion').innerHTML=`
    <div class="modal-hd" style="padding:1.2rem 1.4rem .8rem;">
      <div style="flex:1;font-family:'Cormorant Garamond',serif;font-size:1.25rem;font-weight:500;">${id?T('form_title_edit'):T('form_title_new_reunion')}</div>
      <button class="modal-close" onclick="closeOverlay('modal-form-reunion-overlay')">✕</button>
    </div>
    <div class="modal-bd">
      <div class="form-grid">
        <div class="fg full"><label>${T('form_titre')} *</label><input id="rn-titre" value="${e?.titre||''}" placeholder="${T('ph_titre_reunion')}"></div>
        <div class="fg"><label>${T('form_date_debut')}</label><input type="date" id="rn-date-debut" value="${e?.date_debut||''}"></div>
        <div class="fg"><label>${T('form_date_fin')}</label><input type="date" id="rn-date-fin" value="${e?.date_fin||''}"></div>
        <div class="fg full"><label>${T('form_lieu')}</label><input id="rn-lieu" value="${e?.lieu||''}" placeholder="${T('ph_lieu')}"></div>
        <div class="fg full"><label>${T('sec_description')}</label><textarea id="rn-desc" placeholder="${T('ph_desc_reunion')}">${e?.description||''}</textarea></div>
        <div class="fg full"><label>${T('form_participants')}</label><select id="rn-personnes" multiple size="6" style="height:130px;">${peopleOptions}</select></div>
      </div>
      ${id ? `<div class="fg full" style="margin-top:.8rem;">
        <label>${T('lbl_add_photos')}</label>
        <div class="upload-zone">
          <input type="file" accept="image/*" multiple onchange="previewReunionPhotos(this)">
          <div class="upload-icon">📷</div>
          <div class="upload-label">${T(_isTouch?'lbl_upload_hint_touch':'lbl_upload_hint')}<br><span style="font-size:.7rem;color:var(--ink3);">${T('lbl_upload_max')}</span></div>
        </div>
        <div class="upload-preview" id="rn-upload-preview"></div>
      </div>` : ''}
      <div class="form-actions">
        <button class="btn-primary" onclick="saveReunion(${id||''})">${T('form_save')}</button>
        ${id ? `<button class="btn-secondary" onclick="uploadReunionPhotos(${id})" style="font-size:.78rem;">📤 ${T('lbl_add_photos')}</button>` : ''}
        <button class="btn-secondary" onclick="closeOverlay('modal-form-reunion-overlay')">${T('form_cancel')}</button>
      </div>
    </div>`;
  document.getElementById('modal-form-reunion-overlay').classList.add('open');
}

let pendingReunionFiles = [];
function previewReunionPhotos(input) {
  pendingReunionFiles = Array.from(input.files);
  const prev = document.getElementById('rn-upload-preview');
  if (!prev) return;
  prev.innerHTML = '';
  pendingReunionFiles.forEach(f => {
    const r = new FileReader();
    r.onload = e => { prev.innerHTML += `<img src="${e.target.result}" alt="">`; };
    r.readAsDataURL(f);
  });
}

async function uploadReunionPhotos(reunionId) {
  if (!pendingReunionFiles.length) { toast(T('error_no_photo'), 'error'); return; }
  for (const f of pendingReunionFiles) {
    const fd = new FormData();
    fd.append('photo', f);
    await fetch(`api/reunions.php?id=${reunionId}&sub=photos`, { method:'POST', body:fd });
  }
  pendingReunionFiles = [];
  toast(T('toast_photos_added'));
  closeOverlay('modal-form-reunion-overlay');
  loadReunions();
}

async function saveReunion(id){
  const sel=document.getElementById('rn-personnes');
  const personnes=Array.from(sel.selectedOptions).map(o=>({id:o.value,role:''}));
  const body={titre:document.getElementById('rn-titre').value.trim(),date_debut:document.getElementById('rn-date-debut').value||null,date_fin:document.getElementById('rn-date-fin').value||null,lieu:document.getElementById('rn-lieu').value.trim()||null,description:document.getElementById('rn-desc').value.trim()||null,personnes};
  if(!body.titre){toast(T('error_title_required'),'error');return;}
  try{
    if(id) await api('PUT',`api/reunions.php?id=${id}`,body);
    else   await api('POST','api/reunions.php',body);
    closeOverlay('modal-form-reunion-overlay'); loadReunions(); toast(id?T('toast_reunion_edited'):T('toast_reunion_added'));
  }catch(e){toast(e.message,'error');}
}

async function deleteReunion(id){
  if(!confirm(T('confirm_delete_reunion'))) return;
  await api('DELETE',`api/reunions.php?id=${id}`);
  closeOverlay('modal-person-view-overlay'); loadReunions(); toast(T('toast_reunion_deleted'));
}

async function setReunionAvatar(reunionId, photoId) {
  try {
    await api('PUT', `api/reunions.php?id=${reunionId}&sub=photos&subid=${photoId}`);
    toast(T('event_avatar_set'));
    openReunion(reunionId);
    loadReunions();
  } catch(e) { toast(e.message, 'error'); }
}

async function deleteReunionPhoto(reunionId, photoId) {
  if (!confirm(T('btn_delete_photo') + ' ?')) return;
  try {
    await api('DELETE', `api/reunions.php?id=${reunionId}&sub=photos&subid=${photoId}`);
    toast(T('toast_reunion_edited'));
    openReunion(reunionId);
  } catch(e) { toast(e.message, 'error'); }
}
