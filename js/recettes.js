// ══════════════════════════════════════════════════════════════
//  RECETTES
// ══════════════════════════════════════════════════════════════
function _normName(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
}
function _nameSimilar(a, b) {
  const na=_normName(a), nb=_normName(b);
  if(na===nb) return true;
  // Levenshtein avec seuil 2
  const m=na.length, n=nb.length;
  if(Math.abs(m-n)>2) return false;
  const dp=Array.from({length:m+1},(_,i)=>Array.from({length:n+1},(_,j)=>i?j?0:i:j));
  for(let i=1;i<=m;i++) for(let j=1;j<=n;j++)
    dp[i][j]=na[i-1]===nb[j-1]?dp[i-1][j-1]:1+Math.min(dp[i-1][j],dp[i][j-1],dp[i-1][j-1]);
  return dp[m][n]<=2;
}

async function loadRecettes(){
  const all=await api('GET','api/recettes.php');
  const rows=all.filter(r=>{
    if(!_currentMembers) return true;
    if(!r.auteur) return true;
    return people.some(p=>inCurrentTreeDirect(p.id)&&_nameSimilar(p.prenom,r.auteur));
  });
  const el=document.getElementById('recettes-list');
  if(!rows.length){el.innerHTML=`<div class="empty"><div class="empty-icon">🍽️</div><div class="empty-title">${T('empty_recettes')}</div><div class="empty-sub">${T('empty_recettes_sub')}</div></div>`;return;}
  el.innerHTML=rows.map(r=>`
    <div class="an-card" onclick="openRecette(${r.id})" style="margin-bottom:10px;display:flex;align-items:flex-start;gap:14px;">
      ${r.thumb?`<img src="${imgUrl(r.thumb)}" style="width:48px;height:48px;object-fit:cover;border-radius:6px;flex-shrink:0;" alt="">`:`<span style="font-size:1.5rem;flex-shrink:0;margin-top:2px;">🍽️</span>`}
      <div style="flex:1;">
        <div style="font-weight:500;font-family:'Cormorant Garamond',serif;font-size:1.05rem;">${r.titre}</div>
        <div style="font-size:.78rem;color:var(--ink3);margin-top:2px;">${[r.date_recette,r.auteur?T('lbl_by')+' '+r.auteur:''].filter(Boolean).join(' · ')}</div>
        ${r.description?`<div class="an-excerpt">${r.description.replace(/\n/g,'<br>')}</div>`:''}
      </div>
    </div>`).join('');
}

async function openRecette(id){
  const r=await api('GET',`api/recettes.php?id=${id}`);
  let html=`<div class="modal-hd" style="padding:1.2rem 1.4rem .8rem;">
    <div style="font-size:1.5rem;">🍽️</div>
    <div class="modal-ti"><div class="modal-name">${r.titre}</div>${r.date_recette||r.auteur?`<div class="modal-maiden">${[r.date_recette,r.auteur?T('lbl_by')+' '+r.auteur:''].filter(Boolean).join(' · ')}</div>`:''}</div>
    <button class="modal-close" onclick="closeOverlay('modal-person-view-overlay')">✕</button>
  </div><div class="modal-bd">`;
  if(r.description) html+=`<div class="modal-section"><div class="sec-title">${T('sec_description')}</div><div class="notes-box">${r.description.replace(/\n/g,'<br>')}</div></div>`;
  if(r.ingredients) html+=`<div class="modal-section"><div class="sec-title">${T('lbl_ingredients')}</div><div class="notes-box">${r.ingredients.replace(/\n/g,'<br>')}</div></div>`;
  html+=`<div class="modal-section"><div class="sec-title">${T('lbl_preparation')}</div><div class="notes-box">${r.contenu.replace(/([.!?])\s+/g,'$1<br><br>').replace(/\n/g,'<br>')}</div></div>`;
  if((r.photos||[]).length){
    html+=`<div class="modal-section"><div class="sec-title">${T('sec_photos')}</div><div class="photos-strip">`;
    _lbGallery = r.photos.map(p=>imgUrl(p.chemin));
    const mainId = r.photo_id || r.photos[0]?.id;
    r.photos.forEach((ph,i)=>{
      const isMain = ph.id == mainId;
      const mainBadge = isMain ? `<div style="position:absolute;bottom:3px;left:3px;background:var(--accent);color:#fff;font-size:.55rem;padding:2px 5px;border-radius:4px;letter-spacing:.03em;">${T('event_favourite')}</div>` : '';
      const setBtn = (!isMain && currentUser.role!=='lecteur') ? `<div onclick="event.stopPropagation();setRecetteAvatar(${r.id},${ph.id})" style="position:absolute;top:3px;right:3px;background:rgba(26,24,20,.55);color:#fff;font-size:.6rem;padding:2px 6px;border-radius:4px;cursor:pointer;" title="${T('event_favourite')}">★</div>` : '';
      const delBtn = currentUser.role!=='lecteur' ? `<div onclick="event.stopPropagation();deleteRecettePhoto(${r.id},${ph.id})" style="position:absolute;bottom:3px;right:3px;background:rgba(180,40,40,.7);color:#fff;font-size:.6rem;padding:2px 6px;border-radius:4px;cursor:pointer;" title="${T('btn_delete_photo')}">🗑</div>` : '';
      html+=`<div style="position:relative;display:inline-block;"><img class="photo-thumb" src="${imgUrl(ph.chemin_thumb||ph.chemin)}" onclick="openLightbox(${i})">${mainBadge}${setBtn}${delBtn}</div>`;
    });
    html+=`</div></div>`;
  }
  if(currentUser.role!=='lecteur') html+=`<div style="display:flex;gap:8px;margin-top:1rem;"><button class="btn-secondary" style="flex:1;font-size:.78rem;" onclick="showRecetteForm(${id});closeOverlay('modal-person-view-overlay')">${T('btn_edit')}</button><button class="btn-danger" style="font-size:.78rem;" onclick="deleteRecette(${id})">🗑</button></div>`;
  html+=`</div>`;
  document.getElementById('modal-person-view').innerHTML=html;
  document.getElementById('modal-person-view-overlay').classList.add('open');
}

async function showRecetteForm(id){
  let r = null;
  if (id) { try { r = await api('GET', `api/recettes.php?id=${id}`); } catch {} }

  document.getElementById('modal-form-recette').innerHTML=`
    <div class="modal-hd" style="padding:1.2rem 1.4rem .8rem;">
      <div style="flex:1;font-family:'Cormorant Garamond',serif;font-size:1.25rem;font-weight:500;">${id?T('form_title_edit'):T('form_title_new_recette')}</div>
      <button class="modal-close" onclick="closeOverlay('modal-form-recette-overlay')">✕</button>
    </div>
    <div class="modal-bd">
      <div class="fg"><label>${T('form_titre')} *</label><input id="fr-titre" value="${r?.titre||''}" placeholder="${T('ph_titre_recette')}"></div>
      <div class="fg"><label>${T('sec_description')}</label><textarea id="fr-description" style="min-height:80px;" placeholder="${T('ph_desc_recette')}">${r?.description||''}</textarea></div>
      <div class="fg"><label>${T('lbl_ingredients')}</label><textarea id="fr-ingredients" style="min-height:100px;" placeholder="${T('ph_ingredients_recette')}">${r?.ingredients||''}</textarea></div>
      <div class="fg"><label>${T('lbl_preparation')} *</label><textarea id="fr-contenu" style="min-height:160px;" placeholder="${T('ph_contenu_recette')}">${r?.contenu||''}</textarea></div>
      <div class="form-grid">
        <div class="fg"><label>${T('form_date_approx')}</label><input id="fr-date" value="${r?.date_recette||''}" placeholder="${T('ph_date_recette')}"></div>
        <div class="fg"><label>${T('form_written_by')}</label><input id="fr-auteur" value="${r?.auteur ?? authorName ?? ''}" placeholder="${T('author_placeholder')}"></div>
      </div>
      ${id ? `<div class="fg full" style="margin-top:.8rem;">
        <label>${T('lbl_add_photos')}</label>
        <div class="upload-zone">
          <input type="file" accept="image/*" multiple onchange="previewRecettePhotos(this)">
          <div class="upload-icon">📷</div>
          <div class="upload-label">${T(_isTouch?'lbl_upload_hint_touch':'lbl_upload_hint')}<br><span style="font-size:.7rem;color:var(--ink3);">${T('lbl_upload_max')}</span></div>
        </div>
        <div class="upload-preview" id="rec-upload-preview"></div>
      </div>` : ''}
      <div class="form-actions">
        <button class="btn-primary" onclick="saveRecette(${id||''})">${T('form_save')}</button>
        ${id ? `<button class="btn-secondary" onclick="uploadRecettePhotos(${id})" style="font-size:.78rem;">📤 ${T('lbl_add_photos')}</button>` : ''}
        <button class="btn-secondary" onclick="closeOverlay('modal-form-recette-overlay')">${T('form_cancel')}</button>
      </div>
    </div>`;
  document.getElementById('modal-form-recette-overlay').classList.add('open');
}

let pendingRecetteFiles = [];
function previewRecettePhotos(input) {
  pendingRecetteFiles = Array.from(input.files);
  const prev = document.getElementById('rec-upload-preview');
  if (!prev) return;
  prev.innerHTML = '';
  pendingRecetteFiles.forEach(f => {
    const r = new FileReader();
    r.onload = e => { prev.innerHTML += `<img src="${e.target.result}" alt="">`; };
    r.readAsDataURL(f);
  });
}

async function uploadRecettePhotos(recetteId) {
  if (!pendingRecetteFiles.length) { toast(T('error_no_photo'), 'error'); return; }
  for (const f of pendingRecetteFiles) {
    const fd = new FormData();
    fd.append('photo', f);
    await fetch(`api/recettes.php?id=${recetteId}&sub=photos`, { method:'POST', body:fd });
  }
  pendingRecetteFiles = [];
  toast(T('toast_photos_added'));
  closeOverlay('modal-form-recette-overlay');
  loadRecettes();
}

async function setRecetteAvatar(recetteId, photoId) {
  try {
    await api('PUT', `api/recettes.php?id=${recetteId}&sub=photos&subid=${photoId}`);
    toast(T('event_avatar_set'));
    openRecette(recetteId);
    loadRecettes();
  } catch(e) { toast(e.message, 'error'); }
}

async function deleteRecettePhoto(recetteId, photoId) {
  if (!confirm(T('btn_delete_photo') + ' ?')) return;
  try {
    await api('DELETE', `api/recettes.php?id=${recetteId}&sub=photos&subid=${photoId}`);
    toast(T('toast_recette_edited'));
    openRecette(recetteId);
  } catch(e) { toast(e.message, 'error'); }
}

async function saveRecette(id){
  const body={titre:document.getElementById('fr-titre').value.trim(),description:document.getElementById('fr-description').value.trim()||null,ingredients:document.getElementById('fr-ingredients').value.trim()||null,contenu:document.getElementById('fr-contenu').value.trim(),date_recette:document.getElementById('fr-date').value.trim()||null,auteur:document.getElementById('fr-auteur').value.trim()||null};
  if(!body.titre||!body.contenu){toast(T('error_title_content_required'),'error');return;}
  try{
    if(id) await api('PUT',`api/recettes.php?id=${id}`,body);
    else   await api('POST','api/recettes.php',body);
    closeOverlay('modal-form-recette-overlay'); loadRecettes(); toast(id?T('toast_recette_edited'):T('toast_recette_added'));
  }catch(e){toast(e.message,'error');}
}

async function deleteRecette(id){
  if(!confirm(T('confirm_delete_recette'))) return;
  await api('DELETE',`api/recettes.php?id=${id}`);
  closeOverlay('modal-person-view-overlay'); loadRecettes(); toast(T('toast_recette_deleted'));
}
