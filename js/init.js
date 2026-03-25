// ══════════════════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════════════════
async function init() {
  try {
    const r = await api('GET','api/auth.php?action=me');
    currentUser = r.user;
    document.getElementById('user-badge').textContent = r.user.nom + ' (' + T('role_' + r.user.role) + ')';
    if (r.user.role === 'admin') document.getElementById('nav-admin').style.display = '';
    // Masquer bouton ajouter pour lecteurs
    if (r.user.role === 'lecteur') {
      document.getElementById('btn-add-person').style.display='none';
      document.getElementById('btn-add-event').style.display='none';
      document.getElementById('btn-add-anecdote').style.display='none';
    }
  } catch { window.location.href='login.html'; return; }

  // Restaurer la langue sauvegardée
  currentLang = localStorage.getItem('lang') || 'fr';
  const _m = LANG_META[currentLang] || LANG_META['fr'];
  const _f = document.getElementById('lang-flag');
  const _c = document.getElementById('lang-code');
  if (_f) _f.innerHTML = _m.flag;
  if (_c) _c.textContent = _m.code;
  applyLang();

  // nav — attaché avant tout appel potentiellement plantant
  document.getElementById('nav').addEventListener('click', e => {
    const btn = e.target.closest('button[data-view]');
    if (!btn) return;
    showView(btn.dataset.view, btn);
  });
  document.getElementById('btn-add-person').onclick   = () => showPersonForm(null);
  document.getElementById('btn-add-event').onclick    = () => showEventForm(null);
  document.getElementById('btn-add-anecdote').onclick = () => showAnecdoteForm(null);

  await loadPeople();
  try { renderTree(); } catch(e) { console.error('renderTree() failed:', e); }

  // Deep linking via URL hash
  const hash = window.location.hash.slice(1);
  const validViews = ['tree', 'list', 'events', 'anecdotes', 'admin'];
  if (hash && validViews.includes(hash)) {
    if (hash !== 'admin' || currentUser.role === 'admin') {
      const btn = document.querySelector(`nav button[data-view="${hash}"]`);
      showView(hash, btn);
    }
  }
}

// ══════════════════════════════════════════════════════════════
//  API helper
// ══════════════════════════════════════════════════════════════
async function api(method, url, body) {
  const opts = { method, headers:{} };
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
function showView(name, btn) {
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.querySelectorAll('nav button').forEach(b=>b.classList.remove('active'));
  document.getElementById('view-'+name).classList.add('active');
  if (btn) btn.classList.add('active');
  history.replaceState(null, '', '#' + name);
  if (name==='list')      { renderList(); }
  if (name==='events')    { loadEvents(); }
  if (name==='anecdotes') { loadAnecdotes(); }
  if (name==='admin')     { loadUsers(); }
}

// ══════════════════════════════════════════════════════════════
//  PEOPLE — load & tree
// ══════════════════════════════════════════════════════════════
async function loadPeople() {
  people = await api('GET','api/personnes.php');
}

function initials(p) { return (p.prenom[0]||'')+(p.nom[0]||''); }
function fullName(p) { return p.prenom+' '+p.nom; }
function fmtDate(d)  { if(!d) return null; const p=d.split('-'); return p.length===3?p[2]+'/'+p[1]+'/'+p[0]:d; }
function genLabel(g) { return GEN_LABELS()[g]||('Génération '+g); }

function avatarHTML(p, cls='p-avatar') {
  if (p.chemin_thumb) return `<div class="${cls} ${p.genre}"><img src="${imgUrl(p.chemin_thumb)}" alt=""></div>`;
  return `<div class="${cls} ${p.genre}">${initials(p)}</div>`;
}

