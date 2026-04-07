// ══════════════════════════════════════════════════════════════
//  ARBRES — filtre global
// ══════════════════════════════════════════════════════════════
const _isTouch = window.matchMedia('(pointer:coarse)').matches;
let _arbres = [], _currentArbreId = null, _currentMembers = null;
let _allLiens = [];

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

async function loadArbres() {
  try { _arbres = await api('GET', 'api/arbres.php'); } catch { _arbres = []; }
  _allTreeMembers = null; _allTreeSpouses = null; _directMembersSet = null;
  // Charger les liens pour pouvoir inclure les conjoints dans le filtre
  try { const r = await fetch('api/liens.php'); if (r.ok) _allLiens = await r.json(); } catch {}
  _arbres.sort((a, b) => {
    const na = a.prenom_b ? `${a.prenom_a} ${a.prenom_b}` : a.prenom_a;
    const nb = b.prenom_b ? `${b.prenom_a} ${b.prenom_b}` : b.prenom_a;
    return na.localeCompare(nb, undefined, {sensitivity:'base'});
  });
  _currentArbreId = _arbres[0]?.id || null;
  _applyArbre();
  _renderArbreCombo();
}

function _applyArbre() {
  _directMembersSet = null;
  if (!_currentArbreId || !_arbres.length) { _currentMembers = null; return; }
  const arbre = _arbres.find(a => a.id === _currentArbreId);
  _currentMembers = arbre ? new Set(arbre.membres.map(Number)) : null;
  if (typeof _expandCurrentMembersWithSpouses === 'function') _expandCurrentMembersWithSpouses();
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

function setCurrentArbre(id) {
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
    // Masquer bouton ajouter pour lecteurs
    if (r.user.role === 'lecteur') {
      document.getElementById('btn-add-person').style.display='none';
      document.getElementById('btn-add-person-tree').style.display='none';
      document.getElementById('btn-add-event').style.display='none';
      document.getElementById('btn-add-reunion').style.display='none';
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
    const btn = e.target.closest('button[data-view]');
    if (!btn) return;
    showView(btn.dataset.view);
  });
  // Fermer le dropdown en cliquant ailleurs
  document.addEventListener('click', e => {
    if (!e.target.closest('.admin-nav-wrap')) {
      document.getElementById('admin-dropdown')?.classList.remove('open');
    }
  });
  document.getElementById('btn-add-person').onclick   = () => showPersonForm(null);
  document.getElementById('btn-add-event').onclick    = () => showEventForm(null);
  document.getElementById('btn-add-reunion').onclick  = () => showReunionForm(null);
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
  const hash = window.location.hash.slice(1);
  const adminViews = ['admin-comptes','admin-export','admin-import','admin-notif','admin-password','admin-orphans','admin-logs','admin-quality'];
  const validViews = ['tree','list','events','reunions','anecdotes','tresors','recettes','autos','timeline',...adminViews];
  if (hash && validViews.includes(hash)) {
    if (!adminViews.includes(hash) || currentUser.role === 'admin') {
      showView(hash);
    }
  }
}

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
  history.replaceState(null, '', '#' + name);
  // Marquer le bouton nav actif
  const navBtn = document.querySelector(`nav button[data-view="${name}"]`);
  if (navBtn) navBtn.classList.add('active');
  if (name.startsWith('admin-')) document.getElementById('nav-admin').classList.add('active');
  // Charger les données
  if (name==='tree')             { centerTree(); }
  if (name==='list')             { renderList(); }
  if (name==='events')           { loadEvents(); }
  if (name==='reunions')         { loadReunions(); }
  if (name==='anecdotes')        { loadAnecdotes(); }
  if (name==='tresors')          { loadTresors(); }
  if (name==='recettes')         { loadRecettes(); }
  if (name==='autos')            { loadAutos(); }
  if (name==='timeline')         { loadTimeline(); }
  if (name==='admin-comptes')    { loadUsers(); }
  if (name==='admin-notif')      { loadNotifEmails(); }
  if (name==='admin-logs')       { loadModificationLog(); }
  if (name==='admin-quality')    { loadQualityCheck(); }
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

