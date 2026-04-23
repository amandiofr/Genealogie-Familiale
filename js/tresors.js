// ══════════════════════════════════════════════════════════════
//  TRÉSORS
// ══════════════════════════════════════════════════════════════
async function loadTresors(){
  const all=await api('GET','api/tresors.php');
  const filtered=all.filter(t=>{
    if(!_currentMembers) return true;
    if(t.personne_ids.length) return t.personne_ids.some(id=>inCurrentTreeDirect(id));
    if(!t.auteur) return true;
    return people.some(p=>inCurrentTreeDirect(p.id)&&_nameSimilar(p.prenom,t.auteur));
  });
  const rows=await Promise.all(filtered.map(t=>translateFields(t,['titre','contenu'])));
  const el=document.getElementById('tresors-list');
  if(!rows.length){el.innerHTML=`<div class="empty"><div class="empty-icon">💎</div><div class="empty-title">${T('empty_tresors')}</div><div class="empty-sub">${T('empty_tresors_sub')}</div></div>`;return;}
  el.innerHTML=rows.map(t=>`
    <div class="an-card" onclick="openTresor(${t.id})" style="margin-bottom:10px;display:flex;align-items:flex-start;gap:14px;">
      ${t.thumb?`<img src="${imgUrl(t.thumb)}" style="width:48px;height:48px;object-fit:cover;border-radius:6px;flex-shrink:0;" alt="">`:`<span style="font-size:1.5rem;flex-shrink:0;margin-top:2px;">💎</span>`}
      <div style="flex:1;">
        <div class="an-title">${t.titre}</div>
        <div class="an-meta">${[t.date_tresor,t.auteur?T('lbl_by')+' '+t.auteur:'',t.personnes_noms?T('lbl_with')+' '+t.personnes_noms:''].filter(Boolean).join(' · ')}</div>
        <div class="an-excerpt">${t.contenu.replace(/\n/g,'<br>')}</div>
        <div id="react-tresor-${t.id}"></div>
      </div>
    </div>`).join('');
  rows.forEach(t => loadReactions('tresor', t.id, `react-tresor-${t.id}`, true));
}

async function openTresor(id){
  let t=await api('GET',`api/tresors.php?id=${id}`);
  t=await translateFields(t,['titre','contenu']);
  let html=`<div class="modal-hd" style="padding:1.2rem 1.4rem .8rem;">
    <div style="font-size:1.5rem;">💎</div>
    <div class="modal-ti"><div class="modal-name">${t.titre}</div>${t.date_tresor||t.auteur?`<div class="modal-maiden">${[t.date_tresor,t.auteur?T('lbl_by')+' '+t.auteur:''].filter(Boolean).join(' · ')}</div>`:''}</div>
    <button class="modal-close" onclick="closeOverlay('modal-person-view-overlay')">✕</button>
  </div><div class="modal-bd">`;
  html+=`<div class="notes-box" style="margin-bottom:1rem;">${t.contenu.replace(/\n/g,'<br>')}</div>`;
  if((t.personnes||[]).length){
    html+=`<div class="modal-section"><div class="sec-title">${T('form_mentions')}</div>`;
    t.personnes.forEach(p=>{
      const av=p.chemin_thumb?`<div class="fl-av ${p.genre}"><img src="${imgUrl(p.chemin_thumb)}" alt=""></div>`:`<div class="fl-av ${p.genre}">${(p.prenom[0]||'')+(p.nom[0]||'')}</div>`;
      html+=`<div class="family-link" onclick="openPerson(${p.id});closeOverlay('modal-person-view-overlay')">${av}<div class="fl-name">${p.prenom} ${p.nom}</div></div>`;
    }); html+=`</div>`;
  }
  if((t.photos||[]).length){
    html+=`<div class="modal-section"><div class="sec-title">${T('sec_photos')}</div><div class="photos-strip">`;
    _lbGallery = t.photos.map(p=>imgUrl(p.chemin));
    _lbGalleryMeta = t.photos.map(p=>({photoId:p.id, source:'tresor', parentId:t.id, parentName:t.titre}));
    const mainId = t.photo_id || t.photos[0]?.id;
    t.photos.forEach((ph,i)=>{
      const isMain = ph.id == mainId;
      const mainBadge = isMain ? `<div style="position:absolute;bottom:3px;left:3px;background:var(--accent);color:#fff;font-size:.55rem;padding:2px 5px;border-radius:4px;letter-spacing:.03em;">${T('event_favourite')}</div>` : '';
      const setBtn = (!isMain && currentUser.role!=='lecteur') ? `<div onclick="event.stopPropagation();setTresorAvatar(${t.id},${ph.id})" style="position:absolute;top:3px;right:3px;background:rgba(26,24,20,.55);color:#fff;font-size:.6rem;padding:2px 6px;border-radius:4px;cursor:pointer;" title="${T('event_favourite')}">★</div>` : '';
      const delBtn = currentUser.role!=='lecteur' ? `<div onclick="event.stopPropagation();deleteTresorPhoto(${t.id},${ph.id})" style="position:absolute;bottom:3px;right:3px;background:rgba(180,40,40,.7);color:#fff;font-size:.6rem;padding:2px 6px;border-radius:4px;cursor:pointer;" title="${T('btn_delete_photo')}">🗑</div>` : '';
      html+=`<div style="position:relative;display:inline-block;"><img class="photo-thumb" src="${imgUrl(ph.chemin_thumb||ph.chemin)}" onclick="openLightbox(${i})">${mainBadge}${setBtn}${delBtn}</div>`;
    });
    html+=`</div></div>`;
  }
  html+=`<div id="react-tresor-detail-${id}"></div>`;
  if(currentUser.role!=='lecteur') html+=`<div style="display:flex;gap:8px;margin-top:1rem;"><button class="btn-secondary" style="flex:1;font-size:.78rem;" onclick="showTresorForm(${id});closeOverlay('modal-person-view-overlay')">${T('btn_edit')}</button><button class="btn-danger" style="font-size:.78rem;" onclick="deleteTresor(${id})">🗑</button></div>`;
  html+=`</div>`;
  document.getElementById('modal-person-view').innerHTML=html;
  document.getElementById('modal-person-view-overlay').classList.add('open');
  history.replaceState(null, '', '#tresor/' + id);
  loadReactions('tresor', id, `react-tresor-detail-${id}`);
}

async function showTresorForm(id){
  let t = null;
  if (id) { try { t = await api('GET', `api/tresors.php?id=${id}`); } catch {} }

  const mentionIds = new Set((t?.personnes||[]).map(p=>String(p.id)));
  const peopleOptions=people.map(p=>`<option value="${p.id}"${mentionIds.has(String(p.id))?' selected':''}>${fullName(p)}</option>`).join('');

  document.getElementById('modal-form-tresor').innerHTML=`
    <div class="modal-hd" style="padding:1.2rem 1.4rem .8rem;">
      <div style="flex:1;font-family:'Cormorant Garamond',serif;font-size:1.25rem;font-weight:500;">${id?T('form_title_edit'):T('form_title_new_tresor')}</div>
      <button class="modal-close" onclick="closeOverlay('modal-form-tresor-overlay')">✕</button>
    </div>
    <div class="modal-bd">
      <div class="fg"><label>${T('form_titre')} *</label><input id="ft-titre" value="${t?.titre||''}" placeholder="${T('ph_titre_tresor')}"></div>
      <div class="fg"><label>${T('form_contenu')} *</label><textarea id="ft-contenu" style="min-height:160px;" placeholder="${T('ph_contenu_tresor')}">${encodeHTML(t?.contenu||'')}</textarea></div>
      <div class="form-grid">
        <div class="fg"><label>${T('form_date_approx')}</label><input id="ft-date" value="${t?.date_tresor||''}" placeholder="${T('ph_date_tresor')}"></div>
        <div class="fg"><label>${T('form_written_by')}</label><input id="ft-auteur" value="${t?.auteur ?? authorName ?? ''}" placeholder="${T('author_placeholder')}"></div>
        <div class="fg full"><label>${T('form_mentions')}</label><select id="ft-personnes" multiple size="5" style="height:110px;">${peopleOptions}</select></div>
      </div>
      ${id ? `<div class="fg full" style="margin-top:.8rem;">
        <div class="fg-section-label">${T('lbl_add_photos')}</div>
        <div class="upload-zone">
          <input type="file" accept="image/*" multiple onchange="previewTresorPhotos(this)">
          <div class="upload-icon">📷</div>
          <div class="upload-label">${T(_isTouch?'lbl_upload_hint_touch':'lbl_upload_hint')}<br><span style="font-size:.7rem;color:var(--ink3);">${T('lbl_upload_max')}</span></div>
        </div>
        <div class="upload-preview" id="tresor-upload-preview"></div>
      </div>` : ''}
      <div class="form-actions">
        <button class="btn-primary" onclick="saveTresor(${id||''})">${T('form_save')}</button>
        ${id ? `<button class="btn-secondary" onclick="uploadTresorPhotos(${id})" style="font-size:.78rem;">📤 ${T('lbl_add_photos')}</button>` : ''}
        <button class="btn-secondary" onclick="closeOverlay('modal-form-tresor-overlay')">${T('form_cancel')}</button>
      </div>
    </div>`;
  document.getElementById('modal-form-tresor-overlay').classList.add('open');
}

let pendingTresorFiles = [];
function previewTresorPhotos(input) {
  pendingTresorFiles = Array.from(input.files);
  const prev = document.getElementById('tresor-upload-preview');
  if (!prev) return;
  prev.innerHTML = '';
  pendingTresorFiles.forEach(f => {
    const r = new FileReader();
    r.onload = e => { prev.innerHTML += `<img src="${e.target.result}" alt="">`; };
    r.readAsDataURL(f);
  });
}

async function uploadTresorPhotos(tresorId) {
  if (!pendingTresorFiles.length) { toast(T('error_no_photo'), 'error'); return; }
  for (const f of pendingTresorFiles) {
    const fd = new FormData();
    fd.append('photo', f);
    await fetch(`api/tresors.php?id=${tresorId}&sub=photos`, { method:'POST', body:fd });
  }
  pendingTresorFiles = [];
  toast(T('toast_photos_added'));
  closeOverlay('modal-form-tresor-overlay');
  loadTresors();
}

async function setTresorAvatar(tresorId, photoId) {
  try {
    await api('PUT', `api/tresors.php?id=${tresorId}&sub=photos&subid=${photoId}`);
    toast(T('event_avatar_set'));
    openTresor(tresorId);
    loadTresors();
  } catch(e) { toast(e.message, 'error'); }
}

async function deleteTresorPhoto(tresorId, photoId) {
  if (!confirm(T('btn_delete_photo') + ' ?')) return;
  try {
    await api('DELETE', `api/tresors.php?id=${tresorId}&sub=photos&subid=${photoId}`);
    toast(T('toast_tresor_edited'));
    openTresor(tresorId);
  } catch(e) { toast(e.message, 'error'); }
}

async function saveTresor(id){
  const sel=document.getElementById('ft-personnes');
  const personnes=Array.from(sel.selectedOptions).map(o=>parseInt(o.value));
  const body={titre:document.getElementById('ft-titre').value.trim(),contenu:document.getElementById('ft-contenu').value.trim(),date_tresor:document.getElementById('ft-date').value.trim()||null,auteur:document.getElementById('ft-auteur').value.trim()||null,personnes};
  if(!body.titre||!body.contenu){toast(T('error_title_content_required'),'error');return;}
  try{
    if(id) await api('PUT',`api/tresors.php?id=${id}`,body);
    else   await api('POST','api/tresors.php',body);
    closeOverlay('modal-form-tresor-overlay'); loadTresors(); toast(id?T('toast_tresor_edited'):T('toast_tresor_added'));
  }catch(e){toast(e.message,'error');}
}

async function deleteTresor(id){
  if(!confirm(T('confirm_delete_tresor'))) return;
  await api('DELETE',`api/tresors.php?id=${id}`);
  closeOverlay('modal-person-view-overlay'); loadTresors(); toast(T('toast_tresor_deleted'));
}
