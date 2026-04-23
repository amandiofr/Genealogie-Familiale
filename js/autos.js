// ══════════════════════════════════════════════════════════════
//  AUTOS
// ══════════════════════════════════════════════════════════════
async function loadAutos() {
  const all = await api('GET', 'api/autos.php');
  const rows = all.filter(a => !a.owner_id || inCurrentTreeDirect(a.owner_id));
  const el = document.getElementById('autos-list');
  if (!rows.length) {
    el.innerHTML = `<div class="empty"><div class="empty-icon">🚗</div><div class="empty-title">${T('empty_autos')}</div><div class="empty-sub">${T('empty_autos_sub')}</div></div>`;
    return;
  }
  let html = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px;">`;
  rows.forEach(a => {
    const ownerAv = a.owner_thumb
      ? `<div class="fl-av ${a.owner_genre||'male'}" style="width:38px;height:38px;flex-shrink:0;"><img src="${imgUrl(a.owner_thumb)}" alt=""></div>`
      : a.owner_prenom
        ? `<div class="fl-av ${a.owner_genre||'male'}" style="width:38px;height:38px;font-size:.75rem;flex-shrink:0;">${(a.owner_prenom[0]||'')+(a.owner_nom[0]||'')}</div>`
        : '';
    const carImg = a.thumb
      ? `<img src="${imgUrl(a.thumb)}" style="width:80px;height:80px;object-fit:cover;border-radius:7px;flex-shrink:0;" alt="">`
      : `<div style="width:80px;height:80px;border-radius:7px;background:var(--bg2);display:flex;align-items:center;justify-content:center;font-size:1.6rem;flex-shrink:0;">🚗</div>`;
    const meta = [a.annee, a.couleur, a.owner_prenom].filter(Boolean).join(' · ');
    html += `
      <div onclick="openAuto(${a.id})" style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:var(--bg);border:1px solid var(--border);border-radius:10px;cursor:pointer;transition:box-shadow .15s;" onmouseover="this.style.boxShadow='var(--shadow-lg)'" onmouseout="this.style.boxShadow=''">
        ${ownerAv}
        ${carImg}
        <div style="flex:1;min-width:0;text-transform:none;">
          <div style="font-weight:500;font-size:.9rem;">${a.marque}${a.modele ? ' ' + a.modele : ''}</div>
          ${meta ? `<div style="font-size:.78rem;color:var(--ink3);margin-top:2px;">${meta}</div>` : ''}
        </div>
      </div>`;
  });
  html += '</div>';
  el.innerHTML = html;
}

async function openAuto(id) {
  let a = await api('GET', `api/autos.php?id=${id}`);
  a = await translateFields(a, ['description']);
  const ownerAv = a.owner_thumb
    ? `<div class="fl-av ${a.owner_genre||'male'}" style="width:44px;height:44px;flex-shrink:0;"><img src="${imgUrl(a.owner_thumb)}" alt=""></div>`
    : a.owner_prenom
      ? `<div class="fl-av ${a.owner_genre||'male'}" style="width:44px;height:44px;font-size:.85rem;flex-shrink:0;">${(a.owner_prenom[0]||'')+(a.owner_nom[0]||'')}</div>`
      : `<div style="font-size:1.8rem;line-height:1;">🚗</div>`;
  const subtitle = [a.annee, a.couleur, a.owner_prenom].filter(Boolean).join(' · ');
  let html = `<div class="modal-hd" style="padding:1.2rem 1.4rem .8rem;">
    ${ownerAv}
    <div class="modal-ti" style="text-transform:none;">
      <div class="modal-name">${a.marque}${a.modele ? ' ' + a.modele : ''}</div>
      ${subtitle ? `<div class="modal-gen">${subtitle}</div>` : ''}
    </div>
    <button class="modal-close" onclick="closeOverlay('modal-person-view-overlay')">✕</button>
  </div><div class="modal-bd">`;

  if (a.description) {
    html += `<div class="modal-section"><div class="notes-box">${a.description.replace(/\n/g,'<br>')}</div></div>`;
  }

  if ((a.photos||[]).length) {
    html += `<div class="modal-section"><div class="sec-title">${T('sec_photos')}</div><div class="photos-strip">`;
    _lbGallery = a.photos.map(p => imgUrl(p.chemin));
    _lbGalleryMeta = a.photos.map(p=>({photoId:p.id, source:'auto', parentId:a.id, parentName:a.marque+(a.modele?' '+a.modele:'')}));
    const _auEffId = a.photo_id || a.photos[0]?.id;
    a.photos.forEach((ph, i) => {
      const isMain = ph.id == _auEffId;
      const mainBadge = isMain ? `<div style="position:absolute;bottom:3px;left:3px;background:var(--accent);color:#fff;font-size:.55rem;padding:2px 5px;border-radius:4px;letter-spacing:.03em;">${T('event_favourite')}</div>` : '';
      const setBtn = (!isMain && currentUser.role !== 'lecteur') ? `<div onclick="event.stopPropagation();setAutoAvatar(${id},${ph.id})" style="position:absolute;top:3px;right:3px;background:rgba(26,24,20,.55);color:#fff;font-size:.6rem;padding:2px 6px;border-radius:4px;cursor:pointer;" title="${T('event_favourite')}">★</div>` : '';
      const delBtn = currentUser.role !== 'lecteur' ? `<div onclick="event.stopPropagation();deleteAutoPhoto(${id},${ph.id})" style="position:absolute;bottom:3px;right:3px;background:rgba(180,40,40,.7);color:#fff;font-size:.6rem;padding:2px 6px;border-radius:4px;cursor:pointer;" title="${T('btn_delete_photo')}">🗑</div>` : '';
      html += `<div style="position:relative;display:inline-block;"><img class="photo-thumb" src="${imgUrl(ph.chemin_thumb||ph.chemin)}" onclick="openLightbox(${i})" title="${ph.legende||''}">${mainBadge}${setBtn}${delBtn}</div>`;
    });
    html += `</div></div>`;
  }

  if (currentUser.role !== 'lecteur') {
    html += `<div style="display:flex;gap:8px;margin-top:1rem;">
      <button class="btn-secondary" style="flex:1;font-size:.78rem;" onclick="showAutoForm(${id});closeOverlay('modal-person-view-overlay')">${T('btn_edit')}</button>
      <button class="btn-danger" style="font-size:.78rem;" onclick="deleteAuto(${id})">🗑</button>
    </div>`;
  }
  html += `</div>`;
  document.getElementById('modal-person-view').innerHTML = html;
  document.getElementById('modal-person-view').style.maxWidth = '560px';
  document.getElementById('modal-person-view-overlay').classList.add('open');
  history.replaceState(null, '', '#auto/' + id);
}

async function showAutoForm(id) {
  let a = null;
  if (id) { try { a = await api('GET', `api/autos.php?id=${id}`); } catch {} }

  // Pre-select owner: existing record > authorName picker > none
  const defaultOwner = a ? a.personne_id : (people.find(p => p.prenom === authorName)?.id ?? null);
  const sortedPeople = [...people].sort((x,y) => `${x.prenom} ${x.nom}`.localeCompare(`${y.prenom} ${y.nom}`, undefined, {sensitivity:'base'}));
  const ownerOptions = `<option value="">${T('form_owner_none')}</option>` +
    sortedPeople.map(p => `<option value="${p.id}"${p.id == defaultOwner ? ' selected' : ''}>${p.prenom}</option>`).join('');

  document.getElementById('modal-form-auto').innerHTML = `
    <div class="modal-hd" style="padding:1.2rem 1.4rem .8rem;">
      <div style="flex:1;font-family:'Cormorant Garamond',serif;font-size:1.25rem;font-weight:500;">${id ? T('form_title_edit') : T('form_title_new_auto')}</div>
      <button class="modal-close" onclick="closeOverlay('modal-form-auto-overlay')">✕</button>
    </div>
    <div class="modal-bd">
      <div class="form-grid">
        <div class="fg"><label>${T('form_marque')} *</label><input id="fau-marque" value="${a?.marque||''}" placeholder="${T('ph_marque')}"></div>
        <div class="fg"><label>${T('form_modele')}</label><input id="fau-modele" value="${a?.modele||''}" placeholder="${T('ph_modele')}"></div>
        <div class="fg"><label>${T('form_annee')}</label><input id="fau-annee" type="number" min="1885" max="2100" value="${a?.annee||''}" placeholder="1972"></div>
        <div class="fg"><label>${T('form_couleur')}</label><input id="fau-couleur" value="${a?.couleur||''}" placeholder="${T('ph_couleur')}"></div>
        <div class="fg full"><label>${T('form_owner')}</label><select id="fau-owner">${ownerOptions}</select></div>
        <div class="fg full"><label>${T('sec_description')}</label><textarea id="fau-desc" placeholder="${T('ph_desc_auto')}">${encodeHTML(a?.description||'')}</textarea></div>
      </div>
      ${id ? `<div class="fg full" style="margin-top:.8rem;">
        <div class="fg-section-label">${T('lbl_add_photos')}</div>
        <div class="upload-zone">
          <input type="file" accept="image/*" multiple onchange="previewAutoPhotos(this)">
          <div class="upload-icon">📷</div>
          <div class="upload-label">${T(_isTouch?'lbl_upload_hint_touch':'lbl_upload_hint')}<br><span style="font-size:.7rem;color:var(--ink3);">${T('lbl_upload_max')}</span></div>
        </div>
        <div class="upload-preview" id="auto-upload-preview"></div>
      </div>` : ''}
      <div class="form-actions">
        <button class="btn-primary" onclick="saveAuto(${id||''})">${T('form_save')}</button>
        ${id ? `<button class="btn-secondary" onclick="uploadAutoPhotos(${id})" style="font-size:.78rem;">📤 ${T('lbl_add_photos')}</button>` : ''}
        <button class="btn-secondary" onclick="closeOverlay('modal-form-auto-overlay')">${T('form_cancel')}</button>
      </div>
    </div>`;
  document.getElementById('modal-form-auto-overlay').classList.add('open');
}

let pendingAutoFiles = [];
function previewAutoPhotos(input) {
  pendingAutoFiles = Array.from(input.files);
  const prev = document.getElementById('auto-upload-preview');
  if (!prev) return;
  prev.innerHTML = '';
  pendingAutoFiles.forEach(f => {
    const r = new FileReader();
    r.onload = e => { prev.innerHTML += `<img src="${e.target.result}" alt="">`; };
    r.readAsDataURL(f);
  });
}

async function uploadAutoPhotos(autoId) {
  if (!pendingAutoFiles.length) { toast(T('error_no_photo'), 'error'); return; }
  for (const f of pendingAutoFiles) {
    const fd = new FormData();
    fd.append('photo', f);
    await fetch(`api/autos.php?id=${autoId}&sub=photos`, { method: 'POST', body: fd });
  }
  pendingAutoFiles = [];
  toast(T('toast_photos_added'));
  closeOverlay('modal-form-auto-overlay');
  loadAutos();
}

async function setAutoAvatar(autoId, photoId) {
  try {
    await api('PUT', `api/autos.php?id=${autoId}&sub=photos&subid=${photoId}`);
    toast(T('event_avatar_set'));
    openAuto(autoId);
    loadAutos();
  } catch(e) { toast(e.message, 'error'); }
}

async function deleteAutoPhoto(autoId, photoId) {
  if (!confirm(T('btn_delete_photo') + ' ?')) return;
  try {
    await api('DELETE', `api/autos.php?id=${autoId}&sub=photos&subid=${photoId}`);
    toast(T('toast_auto_edited'));
    openAuto(autoId);
  } catch(e) { toast(e.message, 'error'); }
}

async function saveAuto(id) {
  const marque = document.getElementById('fau-marque').value.trim();
  if (!marque) { toast(T('error_title_required'), 'error'); return; }
  const body = {
    marque,
    modele: document.getElementById('fau-modele').value.trim() || null,
    annee:  document.getElementById('fau-annee').value || null,
    couleur: document.getElementById('fau-couleur').value.trim() || null,
    description: document.getElementById('fau-desc').value.trim() || null,
    personne_id: document.getElementById('fau-owner').value || null,
  };
  try {
    if (id) await api('PUT', `api/autos.php?id=${id}`, body);
    else     await api('POST', 'api/autos.php', body);
    closeOverlay('modal-form-auto-overlay'); loadAutos(); toast(id ? T('toast_auto_edited') : T('toast_auto_added'));
  } catch(e) { toast(e.message, 'error'); }
}

async function deleteAuto(id) {
  if (!confirm(T('confirm_delete_auto'))) return;
  await api('DELETE', `api/autos.php?id=${id}`);
  closeOverlay('modal-person-view-overlay'); loadAutos(); toast(T('toast_auto_deleted'));
}
