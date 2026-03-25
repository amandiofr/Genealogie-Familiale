// ══════════════════════════════════════════════════════════════
//  LIST
// ══════════════════════════════════════════════════════════════
function renderList() {
  filterList();
}
function setFilter(f,btn) {
  currentFilter=f;
  document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active'); filterList();
}
function filterList() {
  const q=(document.getElementById('search').value||'').toLowerCase().trim();
  let filtered=people.filter(p=>{
    if(currentFilter==='male'&&p.genre!=='male') return false;
    if(currentFilter==='female'&&p.genre!=='female') return false;
    if(currentFilter==='living'&&(!p.vivant||p.deces)) return false;
    if(currentFilter==='deceased'&&p.vivant&&!p.deces) return false;
    if(q){const h=[p.prenom,p.nom,p.nom_naiss,p.lieu_naiss,p.profession,p.naissance?.substring(0,4)].filter(Boolean).join(' ').toLowerCase();if(!h.includes(q))return false;}
    return true;
  }).sort((a,b)=>a.generation-b.generation||a.nom.localeCompare(b.nom));
  const el=document.getElementById('person-list');
  if(!filtered.length){el.innerHTML=`<div class="empty"><div class="empty-icon">🔍</div><div class="empty-title">${T('empty_search')}</div></div>`;return;}
  el.innerHTML=filtered.map(p=>{
    const naiss = p.naissance ? fmtDate(p.naissance) : '?';
    const deces = p.deces ? ' – ' + fmtDate(p.deces) : '';
    const sub=[p.profession, naiss+deces].filter(Boolean).join(' · ');
    const av=p.chemin_thumb?`<div class="li-avatar ${p.genre}"><img src="${imgUrl(p.chemin_thumb)}" alt=""></div>`:`<div class="li-avatar ${p.genre}">${initials(p)}</div>`;
    return `<div class="list-item" onclick="openPerson(${p.id})">${av}<div class="li-info"><div class="li-name">${fullName(p)}${p.nom_naiss?` <span style="color:var(--ink3);font-size:.8em;font-style:italic;">${T('nee_label')} ${p.nom_naiss}</span>`:''}</div><div class="li-sub">${sub}</div></div><span class="li-badge">${genLabel(p.generation)}</span><span class="li-arrow">›</span></div>`;
  }).join('');
}

// ══════════════════════════════════════════════════════════════
//  OPEN PERSON MODAL
// ══════════════════════════════════════════════════════════════
async function openPerson(id) {
  const p = await api('GET',`api/personnes.php?id=${id}`);
  const age = calcAge(p);
  const av  = (p.photos||[]).find(ph=>ph.id==p.photo_id);

  let html=`<div class="modal-hd">`;
  if(av) html+=`<div class="modal-av ${p.genre}"><img src="${imgUrl(av.chemin)}" alt=""></div>`;
  else   html+=`<div class="modal-av ${p.genre}">${initials(p)}</div>`;
  html+=`<div class="modal-ti"><div class="modal-name">${p.prenom} ${p.nom}</div>${p.nom_naiss?`<div class="modal-maiden">${T('nee_label')} ${p.nom_naiss}</div>`:''}<div class="modal-gen">${genLabel(p.generation)}</div></div><button class="modal-close" onclick="closeOverlay('modal-person-view-overlay')">✕</button></div>`;
  html+=`<div class="modal-bd">`;

  // Infos
  html+=`<div class="modal-section"><div class="sec-title">${T('sec_info')}</div>`;
  if(p.naissance) html+=`<div class="info-row"><span class="info-icon">🎂</span><span class="info-label">${T('lbl_naiss')}</span><span class="info-val">${fmtDate(p.naissance)}${p.lieu_naiss?' — '+p.lieu_naiss:''}</span></div>`;
  if(age!==null)  html+=`<div class="info-row"><span class="info-icon">⏳</span><span class="info-label">${T('lbl_age')}</span><span class="info-val">${age} ${T('stat_ans')}${!p.vivant?' ('+T(p.genre==='female'?'deceased_f':'deceased_m')+')':''}</span></div>`;
  if(p.deces)     html+=`<div class="info-row"><span class="info-icon">🕊</span><span class="info-label">${T('lbl_deces')}</span><span class="info-val">${fmtDate(p.deces)}${p.lieu_deces?' — '+p.lieu_deces:''}</span></div>`;
  if(p.profession)html+=`<div class="info-row"><span class="info-icon">💼</span><span class="info-label">${T('lbl_job')}</span><span class="info-val">${p.profession}</span></div>`;
  html+=`</div>`;

  // Famille
  const conjoints  = (p.liens||[]).filter(l=>l.type==='conjoint');
  const fiancailles= (p.liens||[]).filter(l=>l.type==='fiancailles');
  const parents    = (p.liens||[]).filter(l=>l.type==='parent_enfant'&&Number(l.personne_b)===id);
  const enfants    = (p.liens||[]).filter(l=>l.type==='parent_enfant'&&Number(l.personne_a)===id);
  const allFamily  = [...conjoints.map(l=>({...l,role:'💍'})),...fiancailles.map(l=>({...l,role:'💑'})),...parents.map(l=>({...l,role:'👨‍👩‍👧'})),...enfants.map(l=>({...l,role:l.genre==='male'?'👦':'👧'}))];
  if(allFamily.length){
    html+=`<div class="modal-section"><div class="sec-title">${T('sec_famille')}</div>`;
    allFamily.forEach(l=>{
      const lid=Number(l.personne_a)===id?l.personne_b:l.personne_a;
      const fav=l.chemin_thumb?`<div class="fl-av ${l.genre}"><img src="${imgUrl(l.chemin_thumb)}" alt=""></div>`:`<div class="fl-av ${l.genre}">${(l.prenom[0]||'')+(l.nom[0]||'')}</div>`;
      html+=`<div class="family-link" onclick="openPerson(${lid})">${fav}<div><div class="fl-name">${l.prenom} ${l.nom}</div><div class="fl-role">${l.role}</div></div><span style="margin-left:auto;color:var(--ink3);font-size:.8rem;">›</span></div>`;
    });
    // Bouton ajouter un lien
    if(currentUser.role!=='lecteur') html+=`<button class="btn-secondary" style="width:100%;margin-top:8px;font-size:.75rem;" onclick="showLienForm(${id})">${T('btn_add_link')}</button>`;
    html+=`</div>`;
  } else if(currentUser.role!=='lecteur'){
    html+=`<div class="modal-section"><div class="sec-title">${T('sec_famille')}</div><button class="btn-secondary" style="width:100%;font-size:.75rem;" onclick="showLienForm(${id})">${T('btn_add_link')}</button></div>`;
  }

  // Photos
  if((p.photos||[]).length){
    html+=`<div class="modal-section"><div class="sec-title">${T('sec_photos')}</div><div class="photos-strip">`;
    p.photos.forEach(ph=>{
      const isMain = ph.id == p.photo_id;
      const mainBadge = isMain ? `<div style="position:absolute;bottom:3px;left:3px;background:var(--accent);color:#fff;font-size:.55rem;padding:2px 5px;border-radius:4px;letter-spacing:.03em;">${T('lbl_avatar')}</div>` : '';
      const setBtn = (!isMain && currentUser.role!=='lecteur') ? `<div onclick="event.stopPropagation();setAvatar(${id},${ph.id})" style="position:absolute;top:3px;right:3px;background:rgba(26,24,20,.55);color:#fff;font-size:.6rem;padding:2px 6px;border-radius:4px;cursor:pointer;" title="${T('title_set_avatar')}">★</div>` : '';
      html+=`<div style="position:relative;display:inline-block;"><img class="photo-thumb" src="${imgUrl(ph.chemin_thumb||ph.chemin)}" onclick="openLightbox(imgUrl('${ph.chemin}'))" title="${ph.legende||''}">${mainBadge}${setBtn}</div>`;
    });
    html+=`</div></div>`;
  }

  // Biographie
  if(p.biographie) html+=`<div class="modal-section"><div class="sec-title">${T('sec_bio')}</div><div class="notes-box">${p.biographie.replace(/\n/g,'<br>')}</div></div>`;

  // Événements liés
  if((p.evenements||[]).length){
    html+=`<div class="modal-section"><div class="sec-title">${T('sec_events')}</div>`;
    p.evenements.forEach(e=>{html+=`<div class="list-item" onclick="openEvent(${e.id});closeOverlay('modal-person-view-overlay')"><span style="font-size:1rem;">${EVT_ICONS[e.type]||'📌'}</span><div class="li-info"><div class="li-name">${e.titre}</div><div class="li-sub">${fmtDate(e.date_debut)||''}</div></div></div>`;});
    html+=`</div>`;
  }

  // Anecdotes liées
  if((p.anecdotes||[]).length){
    html+=`<div class="modal-section"><div class="sec-title">${T('sec_anecdotes')}</div>`;
    p.anecdotes.forEach(a=>{html+=`<div class="list-item" onclick="openAnecdote(${a.id});closeOverlay('modal-person-view-overlay')"><span style="font-size:1rem;">📖</span><div class="li-info"><div class="li-name">${a.titre}</div><div class="li-sub">${a.date_anec||a.auteur||''}</div></div></div>`;});
    html+=`</div>`;
  }

  // Actions
  if(currentUser.role!=='lecteur'){
    html+=`<div style="display:flex;gap:8px;margin-top:1rem;">
      <button class="btn-secondary" style="flex:1;font-size:.78rem;" onclick="showPersonForm(${id});closeOverlay('modal-person-view-overlay')">${T('btn_edit')}</button>
      <button class="btn-secondary" style="font-size:.78rem;" onclick="showPhotoUpload(${id})">${T('btn_photos')}</button>
      <button class="btn-danger" style="font-size:.78rem;" onclick="deletePerson(${id})">🗑</button>
    </div>`;
  }
  html+=`</div>`;

  document.getElementById('modal-person-view').innerHTML=html;
  document.getElementById('modal-person-view-overlay').classList.add('open');
}

function calcAge(p){
  if(!p.naissance) return null;
  const b=new Date(p.naissance), e=p.deces?new Date(p.deces):new Date();
  return Math.floor((e-b)/31557600000);
}

// ══════════════════════════════════════════════════════════════
//  PERSON FORM
// ══════════════════════════════════════════════════════════════
function showPersonForm(id) {
  const p = id ? people.find(x=>x.id==id) : null;
  const t = p ? T('form_title_edit') : T('form_title_new_person');
  const genOptions = GEN_LABELS().map((l,i)=>`<option value="${i}"${(p?.generation||0)==i?' selected':''}>${i} — ${l}</option>`).join('');
  document.getElementById('modal-person-edit').innerHTML=`
    <div class="modal-hd" style="padding:1.2rem 1.4rem .8rem;">
      <div style="flex:1;font-family:'Cormorant Garamond',serif;font-size:1.25rem;font-weight:500;">${t}</div>
      <button class="modal-close" onclick="closeOverlay('modal-person-edit-overlay')">✕</button>
    </div>
    <div class="modal-bd">
      <div class="form-grid">
        <div class="fg"><label>${T('form_prenom')} *</label><input id="fp-prenom" value="${p?.prenom||''}"></div>
        <div class="fg"><label>${T('form_nom')} *</label><input id="fp-nom" value="${p?.nom||''}"></div>
        <div class="fg"><label>${T('form_nom_naiss')}</label><input id="fp-maiden" value="${p?.nom_naiss||''}"></div>
        <div class="fg"><label>${T('form_genre')}</label><select id="fp-genre"><option value="male"${p?.genre==='male'?' selected':''}>${T('form_homme')}</option><option value="female"${p?.genre==='female'?' selected':''}>${T('form_femme')}</option><option value="autre"${p?.genre==='autre'?' selected':''}>${T('form_autre')}</option></select></div>
        <div class="fg"><label>${T('form_naiss')}</label><input type="date" id="fp-naiss" value="${p?.naissance||''}"></div>
        <div class="fg"><label>${T('form_lieu_naiss')}</label><input id="fp-lieu-naiss" value="${p?.lieu_naiss||''}"></div>
        <div class="fg"><label>${T('form_deces')}</label><input type="date" id="fp-deces" value="${p?.deces||''}"></div>
        <div class="fg"><label>${T('form_lieu_deces')}</label><input id="fp-lieu-deces" value="${p?.lieu_deces||''}"></div>
        <div class="fg full"><label>${T('form_generation')}</label><select id="fp-gen">${genOptions}</select></div>
        <div class="fg full"><label>${T('form_job')}</label><input id="fp-job" value="${p?.profession||''}"></div>
        <div class="fg full"><label>${T('form_bio')}</label><textarea id="fp-bio">${p?.biographie||''}</textarea></div>
      </div>
      <div class="form-actions">
        <button class="btn-primary" onclick="savePerson(${id||''})">${T('form_save')}</button>
        <button class="btn-secondary" onclick="closeOverlay('modal-person-edit-overlay')">${T('form_cancel')}</button>
      </div>
    </div>`;
  document.getElementById('modal-person-edit-overlay').classList.add('open');
}

async function savePerson(id) {
  const body={
    prenom:   document.getElementById('fp-prenom').value.trim(),
    nom:      document.getElementById('fp-nom').value.trim(),
    nom_naiss:document.getElementById('fp-maiden').value.trim()||null,
    genre:    document.getElementById('fp-genre').value,
    naissance:document.getElementById('fp-naiss').value||null,
    lieu_naiss:document.getElementById('fp-lieu-naiss').value.trim()||null,
    deces:    document.getElementById('fp-deces').value||null,
    lieu_deces:document.getElementById('fp-lieu-deces').value.trim()||null,
    generation:parseInt(document.getElementById('fp-gen').value),
    profession:document.getElementById('fp-job').value.trim()||null,
    biographie:document.getElementById('fp-bio').value.trim()||null,
  };
  if(!body.prenom||!body.nom){toast(T('error_name_required'),'error');return;}
  try{
    if(id) await api('PUT',`api/personnes.php?id=${id}`,body);
    else   await api('POST','api/personnes.php',body);
    await loadPeople(); renderTree(); renderList();
    closeOverlay('modal-person-edit-overlay');
    toast(id?T('toast_edited'):T('toast_added'));
  }catch(e){toast(e.message,'error');}
}

async function deleteEventPhoto(eventId, photoId){
  if(!confirm(T('btn_delete_photo') + ' ?')) return;
  try {
    await api('DELETE', `api/evenements.php?id=${eventId}&sub=photos&subid=${photoId}`);
    toast(T('toast_event_edited'));
    openEvent(eventId);
  } catch(e) { toast(e.message,'error'); }
}

async function setEventAvatar(eventId, photoId){
  try {
    await api('PUT', `api/evenements.php?id=${eventId}&sub=photos&subid=${photoId}`);
    toast(T('event_avatar_set'));
    openEvent(eventId);
    loadEvents();
  } catch(e) { toast(e.message,'error'); }
}

async function setAvatar(personId, photoId){
  try {
    await api('PUT', `api/personnes.php?id=${personId}&sub=photos&subid=${photoId}`);
    toast(T('avatar_set'));
    openPerson(personId);
    await loadPeople(); renderTree(); renderList();
  } catch(e) { toast(e.message,'error'); }
}

async function deletePerson(id){
  if(!confirm(T('confirm_delete_person'))) return;
  await api('DELETE',`api/personnes.php?id=${id}`);
  closeOverlay('modal-person-view-overlay');
  await loadPeople(); renderTree(); renderList();
  toast(T('toast_deleted'));
}

// ══════════════════════════════════════════════════════════════
//  PHOTO UPLOAD
// ══════════════════════════════════════════════════════════════
function showPhotoUpload(personId){
  document.getElementById('modal-person-edit').innerHTML=`
    <div class="modal-hd" style="padding:1.2rem 1.4rem .8rem;">
      <div style="flex:1;font-family:'Cormorant Garamond',serif;font-size:1.25rem;font-weight:500;">Ajouter des photos</div>
      <button class="modal-close" onclick="closeOverlay('modal-person-edit-overlay')">✕</button>
    </div>
    <div class="modal-bd">
      <div class="fg"><label>Légende (optionnelle)</label><input id="ph-legende" placeholder="Ex : Été 1985 à Marseille"></div>
      <div class="fg"><label>Date approximative</label><input id="ph-date" placeholder="Ex : 1985, 1985-07…"></div>
      <div class="upload-zone" id="upload-zone">
        <input type="file" accept="image/*" multiple onchange="previewPhotos(this)">
        <div class="upload-icon">📷</div>
        <div class="upload-label">Cliquez ou déposez vos photos ici<br><span style="font-size:.7rem;color:var(--ink3);">JPEG, PNG, WebP — max 20 Mo chacune</span></div>
      </div>
      <div class="upload-preview" id="upload-preview"></div>
      <div class="form-actions" style="margin-top:1rem;">
        <button class="btn-primary" onclick="uploadPhotos(${personId})">📤 Envoyer</button>
        <button class="btn-secondary" onclick="closeOverlay('modal-person-edit-overlay')">Annuler</button>
      </div>
    </div>`;
  document.getElementById('modal-person-edit-overlay').classList.add('open');
}

let pendingFiles=[];
function previewPhotos(input){
  pendingFiles=Array.from(input.files);
  const prev=document.getElementById('upload-preview');
  prev.innerHTML='';
  pendingFiles.forEach(f=>{const r=new FileReader();r.onload=e=>{prev.innerHTML+=`<img src="${e.target.result}" alt="">`};r.readAsDataURL(f);});
}

async function uploadPhotos(personId){
  if(!pendingFiles.length){toast('Aucune photo sélectionnée','error');return;}
  const legende=document.getElementById('ph-legende').value;
  const date=document.getElementById('ph-date').value;
  for(const f of pendingFiles){
    const fd=new FormData(); fd.append('photo',f); fd.append('legende',legende); fd.append('date_photo',date);
    await fetch(`api/personnes.php?id=${personId}&sub=photos`,{method:'POST',body:fd});
  }
  pendingFiles=[];
  await loadPeople();
  closeOverlay('modal-person-edit-overlay');
  toast(`${pendingFiles.length||'Photos'} envoyée(s)`);
  openPerson(personId);
}

// ══════════════════════════════════════════════════════════════
//  LIENS FAMILIAUX
// ══════════════════════════════════════════════════════════════
function showLienForm(personId) {
  const p = people.find(x => x.id == personId);
  const others = people.filter(x => x.id != personId)
    .sort((a,b) => a.nom.localeCompare(b.nom))
    .map(x => `<option value="${x.id}">${fullName(x)}</option>`).join('');

  document.getElementById('modal-person-edit').innerHTML = `
    <div class="modal-hd" style="padding:1.2rem 1.4rem .8rem;">
      <div style="flex:1;font-family:'Cormorant Garamond',serif;font-size:1.25rem;font-weight:500;">Ajouter un lien familial</div>
      <button class="modal-close" onclick="closeOverlay('modal-person-edit-overlay')">✕</button>
    </div>
    <div class="modal-bd">
      <div class="fg" style="margin-bottom:.5rem;">
        <label>Personne concernée</label>
        <div style="padding:8px 10px;background:var(--bg2);border-radius:7px;font-size:.88rem;font-weight:500;">${p.prenom} ${p.nom}</div>
      </div>
      <div class="fg"><label>Type de lien</label>
        <select id="lf-type">
          <option value="conjoint">💍 ${T('lien_conjoint')}</option>
          <option value="parent_enfant_a">👶 ${T('lien_parent_a')}</option>
          <option value="parent_enfant_b">👨‍👩‍👧 ${T('lien_parent_b')}</option>
          <option value="fiancailles">💑 ${T('lien_fiancailles')}</option>
        </select>
      </div>
      <div class="fg"><label>Avec qui</label><select id="lf-other">${others}</select></div>
      <div class="form-grid">
        <div class="fg"><label>Date début</label><input type="date" id="lf-debut"></div>
        <div class="fg"><label>Date fin</label><input type="date" id="lf-fin"></div>
      </div>
      <div class="fg"><label>Notes</label><input id="lf-notes" placeholder="Ex : Mariés à Lyon…"></div>
      <div class="form-actions">
        <button class="btn-primary" onclick="saveLien(${personId})">💾 Enregistrer</button>
        <button class="btn-secondary" onclick="closeOverlay('modal-person-edit-overlay')">Annuler</button>
      </div>
    </div>`;
  closeOverlay('modal-person-view-overlay');
  document.getElementById('modal-person-edit-overlay').classList.add('open');
}

async function saveLien(personId) {
  const typeRaw = document.getElementById('lf-type').value;
  const otherId = document.getElementById('lf-other').value;
  const debut   = document.getElementById('lf-debut').value || null;
  const fin     = document.getElementById('lf-fin').value   || null;
  const notes   = document.getElementById('lf-notes').value.trim() || null;

  let type = typeRaw, persA = personId, persB = otherId;
  if (typeRaw === 'parent_enfant_a') { type = 'parent_enfant'; persA = personId; persB = otherId; }
  if (typeRaw === 'parent_enfant_b') { type = 'parent_enfant'; persA = otherId;  persB = personId; }

  try {
    await api('POST', `api/personnes.php?id=${persA}&sub=liens`, {
      personne_b: persB, type, date_debut: debut, date_fin: fin, notes
    });
    closeOverlay('modal-person-edit-overlay');
    toast('Lien ajouté');
    openPerson(personId);
  } catch(e) { toast(e.message, 'error'); }
}

