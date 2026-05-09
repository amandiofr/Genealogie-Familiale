function logAccess(type, elementId = null, elementName = null) {
  api('POST', 'api/access_log.php', { type, element_id: elementId, element_name: elementName }).catch(() => {});
}

// ══════════════════════════════════════════════════════════════
//  ARBRES — filtre global
// ══════════════════════════════════════════════════════════════
const _isTouch = window.matchMedia('(pointer:coarse)').matches;
let _arbres = [], _currentArbreId = null, _currentMembers = null;
let _allLiens = [];
let _subtreeRootId = null; // null = pas de filtre sous-arbre (non persisté)

function inCurrentTree(personId) {
  return !_currentMembers || _currentMembers.has(Number(personId));
}

let _directMembersSet = null;
function inCurrentTreeDirect(personId) {
  if (!_currentArbreId || !_arbres.length) return true;
  if (!_directMembersSet) {
    const arbre = _arbres.find(a => a.id === _currentArbreId);
    _directMembersSet = arbre ? new Set(arbre.membres.map(Number)) : null;
  }
  return !_directMembersSet || _directMembersSet.has(Number(personId));
}

let _allTreeMembers = null; // cache: Set of all IDs that belong to at least one tree
let _allTreeSpouses = null; // cache: Set of spouse IDs of tree members
function _inAnyTree(personId) {
  if (!_arbres.length) return false;
  if (!_allTreeMembers) {
    _allTreeMembers = new Set(_arbres.flatMap(a => a.membres.map(Number)));
    _allTreeSpouses = new Set();
    for (const l of _allLiens) {
      if (l.type === 'conjoint' || l.type === 'fiancailles') {
        const a = Number(l.personne_a), b = Number(l.personne_b);
        if (_allTreeMembers.has(a)) _allTreeSpouses.add(b);
        if (_allTreeMembers.has(b)) _allTreeSpouses.add(a);
      }
    }
  }
  return _allTreeMembers.has(Number(personId)) || _allTreeSpouses.has(Number(personId));
}
function _isDirectInAnyTree(personId) {
  _inAnyTree(personId); // ensure cache populated
  return !!_allTreeMembers?.has(Number(personId));
}

async function loadArbres() {
  try {
    const resp = await api('GET', 'api/arbres.php');
    _arbres = resp.arbres || [];
    const migrations = resp.migrations || {};
    if (_currentArbreId && migrations[_currentArbreId]) _currentArbreId = migrations[_currentArbreId];
    const _lsSaved = localStorage.getItem('genealogie_arbre');
    if (_lsSaved && migrations[_lsSaved]) localStorage.setItem('genealogie_arbre', migrations[_lsSaved]);
  } catch { _arbres = []; }
  _allTreeMembers = null; _allTreeSpouses = null; _directMembersSet = null;
  // Charger les liens pour pouvoir inclure les conjoints dans le filtre
  try { const r = await fetch('api/liens.php'); if (r.ok) _allLiens = await r.json(); } catch {}
  _arbres.sort((a, b) => {
    const na = a.prenom_b ? `${a.prenom_a} ${a.prenom_b}` : a.prenom_a;
    const nb = b.prenom_b ? `${b.prenom_a} ${b.prenom_b}` : b.prenom_a;
    return na.localeCompare(nb, undefined, {sensitivity:'base'});
  });
  if (!_currentArbreId || !_arbres.find(a => a.id === _currentArbreId)) {
    const _saved = localStorage.getItem('genealogie_arbre');
    _currentArbreId = (_saved && _arbres.find(a => a.id === _saved)) ? _saved : (_arbres[0]?.id || null);
  }
  _applyArbre();
  _renderArbreCombo();
}

function _applySubtreeFilter() {
  _directMembersSet = _computeDescendants(_subtreeRootId);
  _currentMembers = new Set(_directMembersSet);
  for (const l of _allLiens) {
    if (l.type === 'conjoint' || l.type === 'fiancailles') {
      const a = Number(l.personne_a), b = Number(l.personne_b);
      if (_currentMembers.has(a)) _currentMembers.add(b);
      if (_currentMembers.has(b)) _currentMembers.add(a);
    }
  }
}

function _applyArbre() {
  _directMembersSet = null;
  if (!_currentArbreId || !_arbres.length) { _currentMembers = null; return; }
  const arbre = _arbres.find(a => a.id === _currentArbreId);
  _currentMembers = arbre ? new Set(arbre.membres.map(Number)) : null;
  if (typeof _expandCurrentMembersWithSpouses === 'function') _expandCurrentMembersWithSpouses();
  if (_subtreeRootId && _allLiens) _applySubtreeFilter();
}

function _renderArbreCombo() {
  const sel = document.getElementById('arbre-select');
  if (!sel) return;
  sel.innerHTML = _arbres.map(a => {
    const nom = a.prenom_b ? `${a.prenom_a} ${T('lbl_et')} ${a.prenom_b}` : a.prenom_a;
    return `<option value="${encodeHTML(a.id)}">${encodeHTML(nom)}</option>`;
  }).join('');
  sel.value = _currentArbreId ?? '';
}

function encodeHTML(s) { return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;'); }

// ── Sous-arbre temporaire ────────────────────────────────────────────────────
function _computeDescendants(rootId) {
  const direct = new Set([Number(rootId)]);
  const queue = [Number(rootId)];
  // Inclure le/les conjoint(s) du root comme co-racines du BFS
  for (const l of _allLiens) {
    if (l.type === 'conjoint' || l.type === 'fiancailles') {
      const a = Number(l.personne_a), b = Number(l.personne_b);
      if (a === Number(rootId) && !direct.has(b)) { direct.add(b); queue.push(b); }
      if (b === Number(rootId) && !direct.has(a)) { direct.add(a); queue.push(a); }
    }
  }
  while (queue.length) {
    const pid = queue.shift();
    for (const l of _allLiens) {
      if (l.type === 'parent_enfant' && Number(l.personne_a) === pid) {
        const child = Number(l.personne_b);
        if (!direct.has(child)) { direct.add(child); queue.push(child); }
      }
    }
  }
  return direct;
}

function setSubtree(personId) {
  _subtreeRootId = Number(personId);
  const p = people.find(x => x.id === _subtreeRootId);
  _applySubtreeFilter();
  const banner = document.getElementById('subtree-banner');
  if (banner) {
    document.getElementById('subtree-banner-label').textContent = `🌳 ${T('btn_subtree').replace('🌳 ','')} : ${p ? fullName(p) : ''}`;
    document.querySelector('#subtree-banner button').textContent = T('btn_clear_subtree');
    banner.style.display = 'flex';
  }
  renderTree();
  const activeView = document.querySelector('.view.active')?.id?.replace('view-', '');
  if (activeView && activeView !== 'tree') showView(activeView, null);
}

function clearSubtree() {
  _subtreeRootId = null;
  _applyArbre();
  const banner = document.getElementById('subtree-banner');
  if (banner) banner.style.display = 'none';
  renderTree();
  const activeView = document.querySelector('.view.active')?.id?.replace('view-', '');
  if (activeView && activeView !== 'tree') showView(activeView, null);
}

function setCurrentArbre(id) {
  if (!_arbres.find(a => a.id === id)) return; // arbre non accessible à cet utilisateur
  _subtreeRootId = null;
  const banner = document.getElementById('subtree-banner');
  if (banner) banner.style.display = 'none';
  _currentArbreId = id;
  localStorage.setItem('genealogie_arbre', id);
  _applyArbre();
  updateAuthorPicker();
  renderTree();
  const activeView = document.querySelector('.view.active')?.id?.replace('view-', '');
  if (activeView && activeView !== 'tree') showView(activeView, null);
}

// ══════════════════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════════════════
async function init() {
  try {
    const r = await api('GET','api/auth.php?action=me');
    currentUser = r.user;
    document.getElementById('user-badge').textContent = r.user.nom + ' (' + T('role_' + r.user.role) + ')';
    if (r.user.role === 'admin') document.getElementById('nav-admin-wrap').style.display = '';
    if (r.user.role === 'admin' || r.user.role === 'editeur') document.getElementById('nav-quality').style.display = '';
    // Masquer bouton ajouter pour lecteurs
    if (r.user.role === 'lecteur') {
      document.getElementById('btn-add-person').style.display='none';
      document.getElementById('btn-add-person-tree').style.display='none';
      document.getElementById('btn-add-event').style.display='none';
      document.getElementById('btn-add-anecdote').style.display='none';
      document.getElementById('btn-add-tresor').style.display='none';
      document.getElementById('btn-add-recette').style.display='none';
      document.getElementById('btn-add-auto').style.display='none';
    }
  } catch { window.location.href='login.html'; return; }

  // nav — attaché avant tout appel potentiellement plantant
  document.getElementById('nav').addEventListener('click', e => {
    // Dropdown admin toggle
    if (e.target.closest('#nav-admin') && !e.target.closest('[data-view]')) {
      document.getElementById('admin-dropdown').classList.toggle('open');
      return;
    }
    // Dropdown plus toggle
    if (e.target.closest('#nav-plus') && !e.target.closest('[data-view]')) {
      document.getElementById('plus-dropdown').classList.toggle('open');
      return;
    }
    const btn = e.target.closest('button[data-view]');
    if (!btn) return;
    showView(btn.dataset.view);
  });
  // Fermer les dropdowns en cliquant ailleurs
  document.addEventListener('click', e => {
    if (!e.target.closest('#nav-admin-wrap')) document.getElementById('admin-dropdown')?.classList.remove('open');
    if (!e.target.closest('#nav-plus-wrap'))  document.getElementById('plus-dropdown')?.classList.remove('open');
  });
  document.getElementById('btn-add-person').onclick   = () => showPersonForm(null);
  document.getElementById('btn-add-event').onclick    = () => showEventForm(null);
  document.getElementById('btn-add-anecdote').onclick = () => showAnecdoteForm(null);
  document.getElementById('btn-add-tresor').onclick   = () => showTresorForm(null);
  document.getElementById('btn-add-recette').onclick  = () => showRecetteForm(null);
  document.getElementById('btn-add-auto').onclick     = () => showAutoForm(null);

  await loadPeople();
  await loadArbres();

  // Restaurer la langue sauvegardée (après loadArbres pour que _renderArbreCombo ait les données)
  currentLang = localStorage.getItem('lang') || 'fr';
  const _m = LANG_META[currentLang] || LANG_META['fr'];
  const _f = document.getElementById('lang-flag');
  const _c = document.getElementById('lang-code');
  if (_f) _f.innerHTML = _m.flag;
  if (_c) _c.textContent = _m.code;
  applyLang();
  updateAuthorPicker();
  initAutoTranslate();
  renderTree();

  // Deep linking via URL hash
  await _handleHash(window.location.hash.slice(1));
  window.addEventListener('hashchange', e => {
    const hash = new URL(e.newURL).hash.slice(1);
    _handleHash(hash);
  });

  // Rappel choix de prénom (tous les rôles, 1 fois par jour max)
  if (!authorName) {
    const _DAY   = 24 * 60 * 60 * 1000;
    const _stored = localStorage.getItem('genealogie_author_reminder');
    if (!_stored || Date.now() >= parseInt(_stored)) {
      localStorage.setItem('genealogie_author_reminder', Date.now() + _DAY);
      setTimeout(() => toast(T('author_reminder'), 'info', 6000), 2000);
    }
  }
}

const _adminViews = ['admin-comptes','admin-export','admin-import','admin-notif','admin-password','admin-orphans','admin-logs','admin-dev','admin-access','admin-lieux'];
const _editorViews = ['quality'];
const _validViews = ['tree','list','events','anecdotes','tresors','recettes','autos','timeline','carte',..._adminViews,..._editorViews];

async function _handleHash(hash) {
  if (!hash) return;
  const membersMatch = hash.match(/^list\?(.*)$/);
  if (membersMatch) {
    const params = new URLSearchParams(membersMatch[1]);
    const arbre = params.get('arbre');
    if (arbre && _arbres.find(a => a.id === arbre)) {
      _currentArbreId = arbre;
      localStorage.setItem('genealogie_arbre', arbre);
      _applyArbre();
      updateAuthorPicker();
      _renderArbreCombo();
    }
    const sort = params.get('sort');
    if (sort && ['date','alpha','birthday'].includes(sort)) currentSort = sort;
    const filter = params.get('filter');
    if (filter && ['all','male','female','living','deceased'].includes(filter)) currentFilter = filter;
    const q = params.get('q') || '';
    const searchEl = document.getElementById('search');
    if (searchEl) searchEl.value = q;
    showView('list');
    document.getElementById('sort-btn-date')?.classList.toggle('active', currentSort === 'date');
    document.getElementById('sort-btn-alpha')?.classList.toggle('active', currentSort === 'alpha');
    document.getElementById('sort-btn-birthday')?.classList.toggle('active', currentSort === 'birthday');
    document.querySelectorAll('.filter-btn').forEach(b =>
      b.classList.toggle('active', (b.getAttribute('data-filter') ?? 'all') === currentFilter)
    );
    document.getElementById('sort-btn-' + currentSort)?.classList.add('active');
    return;
  }
  if (_validViews.includes(hash)) {
    if ((!_adminViews.includes(hash) && !_editorViews.includes(hash)) || currentUser.role === 'admin' || (_editorViews.includes(hash) && currentUser.role === 'editeur')) {
      showView(hash);
    }
    return;
  }
  const entityMatch = hash.match(/^(person|event|anecdote|tresor|recette|auto)\/(\d+)$/);
  if (entityMatch) {
    const [, type, idStr] = entityMatch;
    const openFns = { person: openPerson, event: openEvent, anecdote: openAnecdote, tresor: openTresor, recette: openRecette, auto: openAuto };
    try { await openFns[type](parseInt(idStr)); } catch(e) { console.warn('Entity deep link failed:', e); }
    return;
  }
  const photoMatch = hash.match(/^photo\/([^/]+)\/(\d+)$/);
  if (photoMatch) {
    const [, photoSrc, photoIdStr] = photoMatch;
    try {
      const data = await api('GET', `api/tagged_photo.php?source=${encodeURIComponent(photoSrc)}&photo_id=${photoIdStr}`);
      if (data.photos && data.photos.length) {
        _lbGallery = data.photos.map(p => imgUrl(p.chemin));
        _lbGalleryMeta = data.photos.map(p => ({photoId: p.id, source: photoSrc, parentId: data.parent_id, parentName: data.parent_name}));
        const idx = data.photos.findIndex(p => p.id === parseInt(photoIdStr));
        openLightbox(idx >= 0 ? idx : 0);
      }
    } catch (e) { console.warn('Photo deep link failed:', e); }
  }
}

// ══════════════════════════════════════════════════════════════
//  Global error handler — évite l'écran blanc sur erreur JS inattendue
// ══════════════════════════════════════════════════════════════
window.addEventListener('unhandledrejection', e => {
  const msg = e.reason?.message || 'Erreur inattendue';
  const b = document.getElementById('_err-banner') || (() => {
    const el = document.createElement('div');
    el.id = '_err-banner';
    Object.assign(el.style, { position:'fixed', top:'0', left:'0', right:'0', padding:'12px 16px',
      background:'#5a4e3a', color:'#fff', fontSize:'14px', zIndex:'9999', textAlign:'center',
      display:'flex', alignItems:'center', justifyContent:'center', gap:'12px' });
    document.body.appendChild(el);
    return el;
  })();
  const label = (typeof T === 'function' ? T('err_unexpected') : null) || 'Une erreur est survenue. Appuyez sur le bouton pour recharger la page.';
  const btnLabel = (typeof T === 'function' ? T('btn_reload') : null) || 'Rafraîchir';
  b.innerHTML = `<span>${label}</span><button onclick="location.reload()" style="background:#fff;color:#5a4e3a;border:none;border-radius:4px;padding:4px 12px;font-size:13px;font-weight:600;cursor:pointer;">${btnLabel}</button>`;
  e.preventDefault();
});

// ══════════════════════════════════════════════════════════════
//  API helper
// ══════════════════════════════════════════════════════════════
async function api(method, url, body) {
  const opts = { method, headers:{} };
  if (authorName) opts.headers['X-Author-Name'] = btoa(unescape(encodeURIComponent(authorName)));
  if (body instanceof FormData) { opts.body = body; }
  else if (body) { opts.headers['Content-Type']='application/json'; opts.body=JSON.stringify(body); }
  const r = await fetch(url, opts);
  if (r.status === 401) { window.location.href='login.html'; return; }
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || 'Erreur');
  return d;
}

// ══════════════════════════════════════════════════════════════
//  VIEWS
// ══════════════════════════════════════════════════════════════
function showView(name) {
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.querySelectorAll('nav button').forEach(b=>b.classList.remove('active'));
  document.getElementById('view-'+name).classList.add('active');
  document.getElementById('admin-dropdown')?.classList.remove('open');
  document.getElementById('plus-dropdown')?.classList.remove('open');
  history.replaceState(null, '', '#' + name);
  logAccess('vue', null, name);
  // Marquer le bouton nav actif
  const navBtn = document.querySelector(`nav button[data-view="${name}"]`);
  if (navBtn) navBtn.classList.add('active');
  if (name.startsWith('admin-') && name !== 'quality') document.getElementById('nav-admin')?.classList.add('active');
  const _plusViews = ['anecdotes','list','tresors','recettes','autos','timeline','quality'];
  if (_plusViews.includes(name)) document.getElementById('nav-plus')?.classList.add('active');
  // Charger les données
  if (name==='tree')             { centerTree(); }
  if (name==='list')             { renderList(); }
  if (name==='events')           { loadEvents(); }
  if (name==='anecdotes')        { loadAnecdotes(); }
  if (name==='tresors')          { loadTresors(); }
  if (name==='recettes')         { loadRecettes(); }
  if (name==='autos')            { loadAutos(); }
  if (name==='timeline')         { loadTimeline(); }
  if (name==='carte')            { loadCarte(); }
  if (name==='admin-comptes')    { loadUsers(); }
  if (name==='admin-notif')      { loadNotifEmails(); }
  if (name==='admin-logs')       { loadModificationLog(); }
  if (name==='quality')    { loadQualityCheck(); }
  if (name==='admin-lieux')      { loadLieux(); }
  if (name==='admin-access')     { loadAccessLog(); }
}

// ══════════════════════════════════════════════════════════════
//  PEOPLE — load & tree
// ══════════════════════════════════════════════════════════════
async function loadPeople() {
  people = await api('GET','api/personnes.php');
  people.sort((a,b) => {
    const f = a.prenom.localeCompare(b.prenom, undefined, {sensitivity:'base'});
    return f !== 0 ? f : a.nom.localeCompare(b.nom, undefined, {sensitivity:'base'});
  });
}

function initials(p) { return (p.prenom[0]||'')+(p.nom[0]||''); }
function fullName(p) { return p.prenom+' '+p.nom; }
function fmtDate(d)  { if(!d) return null; const p=d.split('-'); return p.length===3?p[2]+'/'+p[1]+'/'+p[0]:d; }
function genLabel(g) { return GEN_LABELS()[g]||('Génération '+g); }

function avatarHTML(p, cls='p-avatar') {
  if (p.chemin_thumb) return `<div class="${cls} ${p.genre}"><img src="${imgUrl(p.chemin_thumb)}" alt=""></div>`;
  return `<div class="${cls} ${p.genre}">${initials(p)}</div>`;
}

