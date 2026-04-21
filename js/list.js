// ══════════════════════════════════════════════════════════════
//  LIST
// ══════════════════════════════════════════════════════════════
let currentSort = 'date';
let _horsArbrePeople = null;

function _refreshActiveView() {
  const active = document.querySelector('.view.active')?.id?.replace('view-', '');
  if (active === 'events')    loadEvents();
  else if (active === 'reunions')  loadReunions();
  else if (active === 'anecdotes') loadAnecdotes();
  else if (active === 'autos')     loadAutos();
  else if (active === 'timeline')  loadTimeline();
}

function renderList() {
  filterList();
}
function setFilter(f,btn) {
  currentFilter=f;
  document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('sort-btn-'+currentSort)?.classList.add('active');
  filterList();
}
function setSort(s,btn) {
  currentSort=s;
  document.getElementById('sort-btn-date').classList.toggle('active', s==='date');
  document.getElementById('sort-btn-alpha').classList.toggle('active', s==='alpha');
  filterList();
}
async function filterList() {
  const q=(document.getElementById('search').value||'').toLowerCase().trim();
  let filtered=people.filter(p=>{
    if(!inCurrentTree(p.id)) return false;
    if(currentFilter==='male'&&p.genre!=='male') return false;
    if(currentFilter==='female'&&p.genre!=='female') return false;
    if(currentFilter==='living'&&(!p.vivant||p.deces)) return false;
    if(currentFilter==='deceased'&&p.vivant&&!p.deces) return false;
    if(q){const h=[p.prenom,p.nom,p.nom_naiss,p.lieu_naiss,p.profession,p.naissance?.substring(0,4)].filter(Boolean).join(' ').toLowerCase();if(!h.includes(q))return false;}
    return true;
  }).sort((a,b)=>{
    if(currentSort==='alpha'){
      const f=a.prenom.localeCompare(b.prenom,undefined,{sensitivity:'base'});
      return f!==0?f:a.nom.localeCompare(b.nom,undefined,{sensitivity:'base'});
    }
    if(!a.naissance&&!b.naissance) return 0;
    if(!a.naissance) return 1;
    if(!b.naissance) return -1;
    return a.naissance<b.naissance?-1:a.naissance>b.naissance?1:0;
  });
  // Lazy-load hors_arbre members once
  if (_horsArbrePeople === null) {
    try { _horsArbrePeople = await api('GET', 'api/personnes.php?hors_arbre=1'); } catch { _horsArbrePeople = []; }
  }
  let horsFiltered = _horsArbrePeople.slice().sort((a,b) => `${a.prenom} ${a.nom}`.localeCompare(`${b.prenom} ${b.nom}`, undefined, {sensitivity:'base'}));
  if (q) horsFiltered = horsFiltered.filter(p => [p.prenom, p.nom].filter(Boolean).join(' ').toLowerCase().includes(q));

  const heading=document.getElementById('view-list-heading');
  if(heading) heading.textContent=`${filtered.length} ${T('h_membres')}`;
  const el=document.getElementById('person-list');
  if(!filtered.length && !horsFiltered.length){el.innerHTML=`<div class="empty"><div class="empty-icon">🔍</div><div class="empty-title">${T('empty_search')}</div></div>`;return;}

  let html = '';
  if (filtered.length) {
    const rows = await Promise.all(filtered.map(p => translateFields(p, ['profession'])));
    html = rows.map(p=>{
      const naiss = p.naissance ? fmtDate(p.naissance) : '?';
      const deces = p.deces ? ' – ' + fmtDate(p.deces) : '';
      const sub=[p.profession, naiss+deces].filter(Boolean).join(' · ');
      const av=p.chemin_thumb?`<div class="li-avatar ${p.genre}"><img src="${imgUrl(p.chemin_thumb)}" alt=""></div>`:`<div class="li-avatar ${p.genre}">${initials(p)}</div>`;
      return `<div class="list-item" onclick="openPerson(${p.id})">${av}<div class="li-info"><div class="li-name">${fullName(p)}${p.nom_naiss?` <span style="color:var(--ink3);font-size:.8em;font-style:italic;">${T('nee_label')} ${p.nom_naiss}</span>`:''}</div><div class="li-sub">${sub}</div></div><span class="li-arrow">›</span></div>`;
    }).join('');
  }

  // ── Section hors_arbre ──────────────────────────────────────────────────────
  if (horsFiltered.length) {
    html += `<div style="font-size:.72rem;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--ink3);padding:.9rem .5rem .3rem;">${T('lb_tag_others')}</div>`
      + horsFiltered.map(p => {
        const av = p.chemin_thumb ? `<div class="li-avatar ${p.genre||''}"><img src="${imgUrl(p.chemin_thumb)}" alt=""></div>` : `<div class="li-avatar ${p.genre||''}">${initials(p)}</div>`;
        return `<div class="list-item" onclick="openPerson(${p.id})">${av}<div class="li-info"><div class="li-name">${fullName(p)}</div></div><span class="li-arrow">›</span></div>`;
      }).join('');
  }
  el.innerHTML = html;
}

// ══════════════════════════════════════════════════════════════
//  OPEN PERSON MODAL
// ══════════════════════════════════════════════════════════════
async function openPerson(id) {
  let p = await api('GET',`api/personnes.php?id=${id}`);
  p = await translateFields(p, ['biographie', 'profession']);
  const age = calcAge(p);
  const av  = (p.photos||[]).find(ph=>ph.id==p.photo_id);

  let html=`<div class="modal-hd">`;
  if(av) html+=`<div class="modal-av ${p.genre}"><img src="${imgUrl(av.chemin)}" alt=""></div>`;
  else   html+=`<div class="modal-av ${p.genre}">${initials(p)}</div>`;
  html+=`<div class="modal-ti"><div class="modal-name">${p.prenom} ${(p.nom||'').toUpperCase()}</div>${p.nom_naiss?`<div class="modal-maiden">${T('nee_label')} ${p.nom_naiss.toUpperCase()}</div>`:''}<div class="modal-gen">${genLabel(p.generation)}</div></div><button class="modal-close" onclick="closePersonModal()">✕</button></div>`;
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
  const sortedParents = parents.slice().sort((a,b)=>(a.genre==='male'?0:1)-(b.genre==='male'?0:1));
  const sortedEnfants = enfants.slice().sort((a,b)=>{
    if(!a.naissance&&!b.naissance) return 0;
    if(!a.naissance) return 1; if(!b.naissance) return -1;
    return a.naissance.localeCompare(b.naissance);
  });
  const groupA = [...conjoints.map(l=>({...l,role:'💍'})),...fiancailles.map(l=>({...l,role:'💑'})),...sortedParents.map(l=>({...l,role:'👨‍👩‍👧'}))];
  const groupB = sortedEnfants.map(l=>({...l,role:l.genre==='male'?'👦':'👧'}));
  const allFamily = [...groupA,...groupB];
  const renderFL = (l) => {
    const isDirect = !l._computed && !!l.lien_id;
    const lid=Number(l.personne_a)===id?l.personne_b:l.personne_a;
    const fav=l.chemin_thumb?`<div class="fl-av ${l.genre}"><img src="${imgUrl(l.chemin_thumb)}" alt=""></div>`:`<div class="fl-av ${l.genre}">${(l.prenom[0]||'')+(l.nom[0]||'')}</div>`;
    const editBtn = isDirect && currentUser.role!=='lecteur'
      ? `<button class="fl-edit-btn" data-pid="${id}" data-lid="${l.lien_id}" data-type="${l.type}" data-debut="${l.date_debut||''}" data-fin="${l.date_fin||''}" data-notes="${encodeHTML(l.notes||'')}" style="background:none;border:none;color:var(--ink3);cursor:pointer;font-size:.7rem;padding:0 2px;line-height:1;">✏️</button>`
      : '';
    const delBtn = isDirect && currentUser.role!=='lecteur'
      ? `<button class="fl-del-btn" data-pid="${id}" data-lid="${l.lien_id}" style="margin-left:2px;background:none;border:none;color:var(--ink3);cursor:pointer;font-size:.7rem;padding:0 2px;line-height:1;" title="${T('confirm_delete_lien')}">✕</button>`
      : '';
    const isSpouse = l.type==='conjoint'||l.type==='fiancailles';
    const dateLbl = isSpouse
      ? (l.date_debut ? fmtDate(l.date_debut) : '')
      : (l.naissance  ? fmtDate(l.naissance)  : '');
    return `<div class="family-link" onclick="openPerson(${lid})">${fav}<div><div class="fl-name">${l.prenom} ${l.nom}</div><div class="fl-role">${l.role}${dateLbl?` <span style="color:var(--ink3);font-size:.75em;">${dateLbl}</span>`:''}</div></div><span style="margin-left:auto;color:var(--ink3);font-size:.8rem;">›</span>${editBtn}${delBtn}</div>`;
  };
  if(allFamily.length){
    html+=`<div class="modal-section"><div class="sec-title">${T('sec_famille')}</div>`;
    groupA.forEach(l=>{ html+=renderFL(l); });
    groupB.forEach(l=>{ html+=renderFL(l); });
    // Bouton ajouter un lien
    if(currentUser.role!=='lecteur') html+=`<button class="btn-secondary" style="width:100%;margin-top:8px;font-size:.75rem;" onclick="showLienForm(${id})">${T('btn_add_link')}</button>`;
    html+=`</div>`;
  } else if(currentUser.role!=='lecteur'){
    html+=`<div class="modal-section"><div class="sec-title">${T('sec_famille')}</div><button class="btn-secondary" style="width:100%;font-size:.75rem;" onclick="showLienForm(${id})">${T('btn_add_link')}</button></div>`;
  }

  // Photos
  if((p.photos||[]).length){
    html+=`<div class="modal-section"><div class="sec-title">${T('sec_photos')}</div><div class="photos-strip">`;
    _lbGallery = p.photos.map(ph=>imgUrl(ph.chemin));
    _lbGalleryMeta = p.photos.map(ph=>({photoId:ph.id, source:'person'}));
    const _pEffId = p.photo_id || p.photos[0]?.id;
    p.photos.forEach((ph,i)=>{
      const isMain = ph.id == _pEffId;
      const mainBadge = isMain ? `<div style="position:absolute;bottom:3px;left:3px;background:var(--accent);color:#fff;font-size:.55rem;padding:2px 5px;border-radius:4px;letter-spacing:.03em;">${T('lbl_avatar')}</div>` : '';
      const setBtn = (!isMain && currentUser.role!=='lecteur') ? `<div onclick="event.stopPropagation();setAvatar(${id},${ph.id})" style="position:absolute;top:3px;right:3px;background:rgba(26,24,20,.55);color:#fff;font-size:.6rem;padding:2px 6px;border-radius:4px;cursor:pointer;" title="${T('title_set_avatar')}">★</div>` : '';
      const delBtn = currentUser.role!=='lecteur' ? `<div onclick="event.stopPropagation();deletePersonPhoto(${id},${ph.id})" style="position:absolute;bottom:3px;right:3px;background:rgba(180,40,40,.7);color:#fff;font-size:.6rem;padding:2px 6px;border-radius:4px;cursor:pointer;" title="${T('btn_delete_photo')}">🗑</div>` : '';
      html+=`<div style="position:relative;display:inline-block;"><img class="photo-thumb" src="${imgUrl(ph.chemin_thumb||ph.chemin)}" onclick="openLightbox(${i})" title="${ph.legende||''}">${mainBadge}${setBtn}${delBtn}</div>`;
    });
    html+=`</div></div>`;
  }

  // Biographie
  if(p.biographie) html+=`<div class="modal-section"><div class="sec-title">${T('sec_bio')}</div><div class="notes-box">${p.biographie.replace(/\n/g,'<br>')}</div></div>`;

  // Déménagements (membres directs et conjoints de l'arbre courant)
  const _dems = inCurrentTree(id) ? (p.evenements||[]).filter(e=>e.type==='demenagement').sort((a,b)=>a.date_debut>b.date_debut?1:-1) : null;
  if (_dems !== null) {
  html+=`<div class="modal-section" id="dem-section"><div class="sec-title">${T('sec_dems')}</div>`;
  html+=`<div id="dem-list">`;
  if(_dems.length){
    _dems.forEach(e=>{
      const annee = e.date_debut ? e.date_debut.substring(0,4) : '?';
      const autres = (e.nb_personnes||1) - 1;
      const avecLabel = autres > 0 ? ` <span style="color:var(--ink3);font-size:.75em;">+ ${autres}</span>` : '';
      const editBtns = currentUser.role!=='lecteur' ? `<button onclick="showDemForm(${id},${e.id})" style="background:none;border:none;color:var(--ink3);cursor:pointer;font-size:.75rem;padding:0 4px;">✏️</button><button onclick="deleteDem(${id},${e.id})" style="background:none;border:none;color:var(--ink3);cursor:pointer;font-size:.75rem;padding:0 2px;">🗑</button>` : '';
      html+=`<div style="display:flex;align-items:center;gap:.5rem;padding:.35rem 0;border-bottom:1px solid var(--border2);">
        <span style="font-size:.8rem;font-weight:600;min-width:2.5rem;color:var(--ink2);">${annee}</span>
        <span style="flex:1;font-size:.85rem;">${e.lieu||'—'}${avecLabel}</span>
        ${editBtns}
      </div>`;
    });
  } else {
    html+=`<div style="font-size:.8rem;color:var(--ink3);font-style:italic;padding:.3rem 0;">${T('dem_empty')}</div>`;
  }
  html+=`</div>`;
  if(currentUser.role!=='lecteur') html+=`<button class="btn-secondary" style="width:100%;margin-top:8px;font-size:.75rem;" onclick="showDemForm(${id},null)">${T('btn_add_dem')}</button>`;
  html+=`<div id="dem-form-wrap" style="display:none;"></div>`;
  html+=`</div>`;
  } // fin if inCurrentTreeDirect


  // Actions
  if(currentUser.role!=='lecteur'){
    html+=`<div style="display:flex;gap:8px;margin-top:1rem;flex-wrap:wrap;">
      <button class="btn-secondary" style="flex:1;min-width:0;font-size:.78rem;padding:6px 14px;" onclick="showPersonForm(${id});closeOverlay('modal-person-view-overlay')">${T('btn_edit')}</button>
      <button class="btn-secondary" style="flex:1;min-width:0;font-size:.78rem;padding:6px 14px;" onclick="showPhotoUpload(${id})">${T('btn_photos')}</button>
      ${currentUser.role==='admin' ? `<button class="btn-danger" style="font-size:.78rem;padding:6px 11px;" onclick="deletePerson(${id})">🗑</button>` : ''}
    </div>`;
  }
  const _isSubtreeRoot = _subtreeRootId === id;
  html+=`<div style="margin-top:.5rem;">
    ${_isSubtreeRoot
      ? `<button class="btn-secondary" style="width:100%;font-size:.78rem;padding:6px 14px;" onclick="clearSubtree();closeOverlay('modal-person-view-overlay')">${T('btn_clear_subtree')}</button>`
      : `<button class="btn-secondary" style="width:100%;font-size:.78rem;padding:6px 14px;" onclick="setSubtree(${id});closeOverlay('modal-person-view-overlay')">${T('btn_subtree')}</button>`
    }
  </div>`;
  html+=`</div>`;

  const _mv = document.getElementById('modal-person-view');
  _mv.innerHTML = html;
  _mv.scrollTop = 0;
  _mv.addEventListener('click', function(e) {
    const eb = e.target.closest('.fl-edit-btn');
    if (eb) {
      e.stopPropagation();
      showLienEditForm(+eb.dataset.pid, +eb.dataset.lid, eb.dataset.type, eb.dataset.debut, eb.dataset.fin, eb.dataset.notes);
      return;
    }
    const db = e.target.closest('.fl-del-btn');
    if (db) {
      e.stopPropagation();
      deleteLien(+db.dataset.pid, +db.dataset.lid);
    }
  }, { once: true });
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
async function showPersonForm(id) {
  let p = id ? people.find(x=>x.id==id) : null;
  if (id && !p) { try { p = await api('GET', `api/personnes.php?id=${id}`); } catch {} }
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
        <div class="fg"><label>${T('form_nom')}</label><input id="fp-nom" value="${p?.nom||''}"></div>
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
      ${!id ? `<div class="form-grid" style="margin-top:.5rem;">
          <div class="fg"><label>${T('form_lien_type')}</label>
            <select id="fp-lien-type">
              <option value="">${T('form_lien_none')}</option>
              <option value="conjoint">💍 ${T('lien_conjoint')}</option>
              <option value="parent_enfant_a">👶 ${T('lien_parent_a')}</option>
              <option value="parent_enfant_b">👨‍👩‍👧 ${T('lien_parent_b')}</option>
              <option value="fiancailles">💑 ${T('lien_fiancailles')}</option>
            </select>
          </div>
          <div class="fg"><label>${T('form_lien_with')}</label>
            <select id="fp-lien-other">
              <option value="">${T('form_lien_none')}</option>
              ${people.filter(x=>inCurrentTree(x.id)).sort((a,b)=>`${a.prenom} ${a.nom}`.localeCompare(`${b.prenom} ${b.nom}`,undefined,{sensitivity:'base'})).map(x=>`<option value="${x.id}">${fullName(x)}</option>`).join('')}
            </select>
          </div>
        </div>` : ''}
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
  if(!body.prenom){toast(T('error_name_required'),'error');return;}
  try{
    if(id) {
      await api('PUT',`api/personnes.php?id=${id}`,body);
      await loadPeople(); await loadArbres(); renderTree(); renderList();
      _refreshActiveView();
      closeOverlay('modal-person-edit-overlay');
      toast(T('toast_edited'));
      return;
    }

    // Nouveau membre
    const lienType  = document.getElementById('fp-lien-type')?.value;
    const lienOther = document.getElementById('fp-lien-other')?.value;
    const hasLien   = lienType && lienOther;

    if(!hasLien) {
      // Montrer le dialogue AVANT de créer — stocker les données en attente
      closeOverlay('modal-person-edit-overlay');
      _showNoTreeDialog(null, body);
      return;
    }

    const r = await api('POST','api/personnes.php',body);
    const newId = r.id;
    let type = lienType, persA = newId, persB = lienOther;
    if(lienType === 'parent_enfant_a') { type = 'parent_enfant'; persA = newId;    persB = lienOther; }
    if(lienType === 'parent_enfant_b') { type = 'parent_enfant'; persA = lienOther; persB = newId; }
    await api('POST', `api/personnes.php?id=${persA}&sub=liens`, { personne_b: persB, type });
    await loadPeople(); await loadArbres(); renderTree(); renderList();
    _refreshActiveView();
    closeOverlay('modal-person-edit-overlay');
    toast(T('toast_added'));
  }catch(e){toast(e.message,'error');}
}

let _noTreeBody = null; // données du formulaire en attente de création

function _cancelNoTree() {
  _noTreeBody = null;
  closeOverlay('modal-no-tree-overlay');
}

function _showNoTreeDialog(personId, body) {
  // personId ignoré désormais — on stocke body et on crée au moment du choix
  _noTreeBody = body;
  const name = [body.prenom, body.nom].filter(Boolean).join(' ');
  const lienOptions = people.filter(x => _inAnyTree(x.id))
    .sort((a,b) => `${a.prenom} ${a.nom}`.localeCompare(`${b.prenom} ${b.nom}`, undefined, {sensitivity:'base'}))
    .map(x => `<option value="${x.id}">${fullName(x)}</option>`).join('');
  const el = document.getElementById('modal-no-tree');
  if (!el) return;
  el.innerHTML = `
    <div class="modal-hd" style="padding:1.2rem 1.4rem .8rem;">
      <div style="flex:1;font-family:'Cormorant Garamond',serif;font-size:1.15rem;font-weight:500;">${T('no_tree_title')}</div>
      <button class="modal-close" onclick="_cancelNoTree()">✕</button>
    </div>
    <div class="modal-bd">
      <p style="font-size:.9rem;color:var(--ink2);margin-bottom:1rem;">${T('no_tree_msg').replace('{name}', name)}</p>
      <div class="form-grid">
        <div class="fg"><label>${T('form_lien_type')}</label>
          <select id="nt-lien-type">
            <option value="conjoint">💍 ${T('lien_conjoint')}</option>
            <option value="parent_enfant_a">👶 ${T('lien_parent_a')}</option>
            <option value="parent_enfant_b">👨‍👩‍👧 ${T('lien_parent_b')}</option>
            <option value="fiancailles">💑 ${T('lien_fiancailles')}</option>
          </select>
        </div>
        <div class="fg"><label>${T('form_lien_with')}</label>
          <select id="nt-lien-other">
            <option value="">${T('form_lien_none')}</option>
            ${lienOptions}
          </select>
        </div>
      </div>
      <div class="form-actions">
        <button class="btn-primary" onclick="_saveNoTreeLien()">${T('no_tree_add_link')}</button>
        <button class="btn-secondary" onclick="_confirmNewTree()">${T('no_tree_new_tree')}</button>
      </div>
    </div>`;
  document.getElementById('modal-no-tree-overlay').classList.add('open');
}

async function _confirmNewTree() {
  if (!_noTreeBody) { closeOverlay('modal-no-tree-overlay'); return; }
  try {
    await api('POST','api/personnes.php', _noTreeBody);
    _noTreeBody = null;
    await loadPeople(); await loadArbres(); renderTree(); renderList();
    _refreshActiveView();
    closeOverlay('modal-no-tree-overlay');
    toast(T('toast_added'));
  } catch(e) { toast(e.message, 'error'); }
}

async function _saveNoTreeLien() {
  const lienType  = document.getElementById('nt-lien-type').value;
  const lienOther = document.getElementById('nt-lien-other').value;
  if (!lienOther) { toast(T('form_lien_none'), 'error'); return; }
  if (!_noTreeBody) return;
  try {
    const r = await api('POST','api/personnes.php', _noTreeBody);
    const newId = r.id;
    let type = lienType, persA = newId, persB = lienOther;
    if (lienType === 'parent_enfant_a') { type = 'parent_enfant'; persA = newId;    persB = lienOther; }
    if (lienType === 'parent_enfant_b') { type = 'parent_enfant'; persA = lienOther; persB = newId; }
    await api('POST', `api/personnes.php?id=${persA}&sub=liens`, { personne_b: persB, type });
    _noTreeBody = null;
    await loadPeople(); await loadArbres(); renderTree(); renderList();
    _refreshActiveView();
    closeOverlay('modal-no-tree-overlay');
    toast(T('toast_added'));
  } catch(e) { toast(e.message, 'error'); }
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

async function deletePersonPhoto(personId, photoId){
  if(!confirm(T('btn_delete_photo') + ' ?')) return;
  try {
    await api('DELETE', `api/personnes.php?id=${personId}&sub=photos&subid=${photoId}`);
    toast(T('btn_delete_photo'));
    openPerson(personId);
    await loadPeople(); renderTree(); renderList();
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
      <div style="flex:1;font-family:'Cormorant Garamond',serif;font-size:1.25rem;font-weight:500;">${T('lbl_add_photos')}</div>
      <button class="modal-close" onclick="closeOverlay('modal-person-edit-overlay')">✕</button>
    </div>
    <div class="modal-bd">
      <div class="fg"><label>${T('lbl_legende')}</label><input id="ph-legende" placeholder="${T('lbl_legende_ph')}"></div>
      <div class="fg"><label>${T('form_date_approx')}</label><input id="ph-date" placeholder="Ex : 1985, 1985-07…"></div>
      <div class="upload-zone" id="upload-zone">
        <input type="file" accept="image/*" multiple onchange="previewPhotos(this)">
        <div class="upload-icon">📷</div>
        <div class="upload-label">${T(_isTouch?'lbl_upload_hint_touch':'lbl_upload_hint')}<br><span style="font-size:.7rem;color:var(--ink3);">${T('lbl_upload_max')}</span></div>
      </div>
      <div class="upload-preview" id="upload-preview"></div>
      <div class="form-actions" style="margin-top:1rem;">
        <button class="btn-primary" onclick="uploadPhotos(${personId})">${T('lbl_upload_send')}</button>
        <button class="btn-secondary" onclick="closeOverlay('modal-person-edit-overlay')">${T('form_cancel')}</button>
      </div>
    </div>`;
  document.getElementById('modal-person-view-overlay').style.zIndex = '';
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
  if(!pendingFiles.length){toast(T('error_no_photo'),'error');return;}
  const legende=document.getElementById('ph-legende').value;
  const date=document.getElementById('ph-date').value;
  for(const f of pendingFiles){
    const fd=new FormData(); fd.append('photo',f); fd.append('legende',legende); fd.append('date_photo',date);
    await fetch(`api/personnes.php?id=${personId}&sub=photos`,{method:'POST',body:fd});
  }
  pendingFiles=[];
  await loadPeople();
  renderTree();
  closeOverlay('modal-person-edit-overlay');
  toast(`${pendingFiles.length||'Photos'} envoyée(s)`);
  openPerson(personId);
}

// ══════════════════════════════════════════════════════════════
//  LIENS FAMILIAUX
// ══════════════════════════════════════════════════════════════
function showLienForm(personId) {
  const p = people.find(x => x.id == personId);
  const others = people.slice()
    .sort((a,b) => a.prenom.localeCompare(b.prenom, undefined, {sensitivity:'base'}) || (a.nom||'').localeCompare(b.nom||'', undefined, {sensitivity:'base'}))
    .filter(x => x.id != personId && (currentUser?.role === 'admin' ? _inAnyTree(x.id) : inCurrentTree(x.id)))
    .map(x => `<option value="${x.id}">${fullName(x)}</option>`).join('');

  document.getElementById('modal-person-edit').innerHTML = `
    <div class="modal-hd" style="padding:1.2rem 1.4rem .8rem;">
      <div style="flex:1;font-family:'Cormorant Garamond',serif;font-size:1.25rem;font-weight:500;">${T('form_title_add_link')}</div>
      <button class="modal-close" onclick="closeOverlay('modal-person-edit-overlay')">✕</button>
    </div>
    <div class="modal-bd">
      <div class="fg" style="margin-bottom:.5rem;">
        <label>${T('lbl_personne_concernee')}</label>
        <div style="padding:8px 10px;background:var(--bg2);border-radius:7px;font-size:.88rem;font-weight:500;">${p.prenom} ${p.nom}</div>
      </div>
      <div class="fg"><label>${T('form_lien_type')}</label>
        <select id="lf-type">
          <option value="conjoint">💍 ${T('lien_conjoint')}</option>
          <option value="parent_enfant_a">👶 ${T('lien_parent_a')}</option>
          <option value="parent_enfant_b">👨‍👩‍👧 ${T('lien_parent_b')}</option>
          <option value="fiancailles">💑 ${T('lien_fiancailles')}</option>
        </select>
      </div>
      <div class="fg"><label>${T('form_lien_with')}</label><select id="lf-other">${others}</select></div>
      <div class="form-grid">
        <div class="fg"><label>${T('lbl_date_debut')}</label><input type="date" id="lf-debut"></div>
        <div class="fg"><label>${T('lbl_date_fin')}</label><input type="date" id="lf-fin"></div>
      </div>
      <div class="fg"><label>${T('lbl_notes')}</label><input id="lf-notes" placeholder="${T('ph_notes_lien')}"></div>
      <div class="form-actions">
        <button class="btn-primary" onclick="saveLien(${personId})">${T('form_save')}</button>
        <button class="btn-secondary" onclick="closeOverlay('modal-person-edit-overlay')">${T('form_cancel')}</button>
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
    await loadPeople(); await loadArbres(); renderTree(); renderList();
    _refreshActiveView();
    closeOverlay('modal-person-edit-overlay');
    toast(T('toast_lien_added'));
    openPerson(personId);
  } catch(e) { toast(e.message, 'error'); }
}

function showLienEditForm(personId, lienId, type, dateDebut, dateFin, notes) {
  document.getElementById('modal-person-edit').innerHTML = `
    <div class="modal-hd" style="padding:1.2rem 1.4rem .8rem;">
      <div style="flex:1;font-family:'Cormorant Garamond',serif;font-size:1.25rem;font-weight:500;">${T('form_title_edit_link')}</div>
      <button class="modal-close" onclick="closeOverlay('modal-person-edit-overlay')">✕</button>
    </div>
    <div class="modal-bd">
      <div class="fg"><label>${T('form_lien_type')}</label>
        <select id="le-type">
          <option value="conjoint" ${type==='conjoint'?'selected':''}>💍 ${T('lien_conjoint')}</option>
          <option value="parent_enfant" ${type==='parent_enfant'?'selected':''}>👶 ${T('lien_parent_a')}</option>
          <option value="fiancailles" ${type==='fiancailles'?'selected':''}>💑 ${T('lien_fiancailles')}</option>
        </select>
      </div>
      <div class="form-grid">
        <div class="fg"><label>${T('lbl_date_debut')}</label><input type="date" id="le-debut" value="${dateDebut}"></div>
        <div class="fg"><label>${T('lbl_date_fin')}</label><input type="date" id="le-fin" value="${dateFin}"></div>
      </div>
      <div class="fg"><label>${T('lbl_notes')}</label><input id="le-notes" value="${encodeHTML(notes)}" placeholder="${T('ph_notes_lien')}"></div>
      <div class="form-actions">
        <button class="btn-primary" onclick="saveLienEdit(${personId},${lienId})">${T('form_save')}</button>
        <button class="btn-secondary" onclick="closeOverlay('modal-person-edit-overlay')">${T('form_cancel')}</button>
      </div>
    </div>`;
  closeOverlay('modal-person-view-overlay');
  document.getElementById('modal-person-edit-overlay').classList.add('open');
}

async function saveLienEdit(personId, lienId) {
  const body = {
    type:       document.getElementById('le-type').value,
    date_debut: document.getElementById('le-debut').value || null,
    date_fin:   document.getElementById('le-fin').value   || null,
    notes:      document.getElementById('le-notes').value.trim() || null,
  };
  try {
    await api('PUT', `api/personnes.php?id=${personId}&sub=liens&subid=${lienId}`, body);
    await loadPeople(); await loadArbres(); renderTree(); renderList();
    _refreshActiveView();
    closeOverlay('modal-person-edit-overlay');
    toast(T('toast_lien_edited'));
    openPerson(personId);
  } catch(e) { toast(e.message, 'error'); }
}

async function deleteLien(personId, lienId) {
  if (!confirm(T('confirm_delete_lien'))) return;
  try {
    await api('DELETE', `api/personnes.php?id=${personId}&sub=liens&subid=${lienId}`);
    await loadPeople(); await loadArbres(); renderTree(); renderList();
    _refreshActiveView();
    toast(T('toast_lien_deleted'));
    openPerson(personId);
  } catch(e) { toast(e.message, 'error'); }
}

// ══════════════════════════════════════════════════════════════
//  DÉMÉNAGEMENTS — form inline dans la fiche personne
// ══════════════════════════════════════════════════════════════
let _demPersonId  = null;
let _demEventId   = null;
let _demSelected  = new Set(); // participant IDs sélectionnés

async function showDemForm(personId, eventId) {
  _demPersonId = personId;
  _demEventId  = eventId;
  _demSelected = new Set([personId]); // la personne elle-même toujours incluse

  let annee = '', lieu = '';

  if (eventId) {
    // Charger les données existantes
    const e = await api('GET', `api/evenements.php?id=${eventId}`);
    annee = e.date_debut ? e.date_debut.substring(0,4) : '';
    lieu  = e.lieu || '';
    (e.personnes||[]).forEach(p => _demSelected.add(p.id));
  }

  // Construire la liste des lieux connus pour le datalist
  const lieuxConnus = Object.keys(typeof _carteLieux !== 'undefined' ? _carteLieux : {});

  // Construire le form
  const wrap = document.getElementById('dem-form-wrap');
  if (!wrap) return;

  const datalistOpts = lieuxConnus.map(l => `<option value="${encodeHTML(l)}">`).join('');

  wrap.style.display = 'block';
  wrap.innerHTML = `
    <datalist id="dem-lieux-list">${datalistOpts}</datalist>
    <div style="background:var(--surface2);border-radius:8px;padding:.8rem;margin-top:.5rem;display:flex;flex-direction:column;gap:.6rem;">
      <div style="display:flex;gap:.5rem;">
        <input id="dem-annee" type="number" min="1600" max="2100" value="${encodeHTML(annee)}" placeholder="${T('dem_year')}"
          style="width:80px;padding:.35rem .5rem;border:1px solid var(--border);border-radius:6px;background:var(--bg);font-size:.85rem;">
        <input id="dem-lieu" type="text" list="dem-lieux-list" value="${encodeHTML(lieu)}" placeholder="${T('dem_place')}"
          style="flex:1;padding:.35rem .5rem;border:1px solid var(--border);border-radius:6px;background:var(--bg);font-size:.85rem;">
      </div>
      <div>
        <div style="font-size:.75rem;color:var(--ink3);margin-bottom:.35rem;">${T('dem_participants')}</div>
        <div id="dem-participants" style="display:flex;flex-direction:column;gap:.25rem;max-height:180px;overflow-y:auto;">
          ${_renderDemParticipants(personId)}
        </div>
      </div>
      <div style="display:flex;gap:.5rem;">
        <button class="btn-primary" style="flex:1;font-size:.8rem;" onclick="saveDem()">${T('btn_save')}</button>
        <button class="btn-secondary" style="font-size:.8rem;" onclick="closeDemForm()">✕</button>
      </div>
    </div>`;

  wrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function _renderDemParticipants(excludeId) {
  return people
    .filter(p => inCurrentTree(p.id))
    .map(p => {
      const checked = _demSelected.has(p.id);
      const disabled = p.id === excludeId ? 'disabled' : '';
      return `<label style="display:flex;align-items:center;gap:.5rem;font-size:.8rem;cursor:pointer;padding:.15rem 0;">
        <input type="checkbox" ${checked ? 'checked' : ''} ${disabled} onchange="toggleDemParticipant(${p.id},this.checked)"
          style="width:15px;height:15px;flex-shrink:0;">
        <span>${p.prenom} ${p.nom}</span>
      </label>`;
    }).join('');
}

function toggleDemParticipant(pid, checked) {
  if (checked) _demSelected.add(pid);
  else _demSelected.delete(pid);
}

function closeDemForm() {
  const wrap = document.getElementById('dem-form-wrap');
  if (wrap) { wrap.style.display = 'none'; wrap.innerHTML = ''; }
}

async function saveDem() {
  const annee = document.getElementById('dem-annee')?.value?.trim();
  const lieu  = document.getElementById('dem-lieu')?.value?.trim();
  if (!annee || !lieu) { toast(T('dem_required'), 'error'); return; }

  const personnes = [..._demSelected].map(id => ({ id }));
  const body = {
    titre:      lieu,
    type:       'demenagement',
    date_debut: annee + '-01-01',
    lieu:       lieu,
    personnes,
  };

  try {
    if (_demEventId) {
      await api('PUT', `api/evenements.php?id=${_demEventId}`, body);
    } else {
      await api('POST', 'api/evenements.php', body);
    }
    closeDemForm();
    openPerson(_demPersonId);
    toast(T('toast_dem_saved'));
  } catch(e) { toast(e.message, 'error'); }
}

async function deleteDem(personId, eventId) {
  if (!confirm(T('confirm_delete_dem'))) return;
  try {
    await api('DELETE', `api/evenements.php?id=${eventId}`);
    openPerson(personId);
    toast(T('toast_dem_deleted'));
  } catch(e) { toast(e.message, 'error'); }
}

