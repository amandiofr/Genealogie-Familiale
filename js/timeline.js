// ══════════════════════════════════════════════════════════════
//  TIMELINE
// ══════════════════════════════════════════════════════════════
async function loadTimeline() {
  const evts = await api('GET', 'api/evenements.php');

  const entries = [];

  // Naissances et décès depuis les membres directs de l'arbre courant (sans conjoints)
  people.forEach(p => {
    if (!inCurrentTreeDirect(p.id)) return;
    entries.push({
      group: 'life',
      date: p.naissance || null,
      icon: '👶',
      title: fullName(p),
      sub: fmtDate(p.naissance) || null,
      onclick: `openPerson(${p.id})`
    });
    if (p.deces) entries.push({
      group: 'life',
      date: p.deces,
      icon: '🕊',
      title: fullName(p),
      sub: fmtDate(p.deces) || null,
      onclick: `openPerson(${p.id})`
    });
  });

  // Événements de l'arbre courant (membres directs uniquement, sans conjoints)
  const _directMembers = (() => {
    if (!_currentArbreId || !_arbres.length) return null;
    const arbre = _arbres.find(a => a.id === _currentArbreId);
    return arbre ? new Set(arbre.membres.map(Number)) : null;
  })();
  const filteredEvts = evts.filter(e => !_directMembers || e.personne_ids.some(id => _directMembers.has(id)));
  filteredEvts.forEach(e => {
    const group = (e.type === 'naissance' || e.type === 'deces') ? 'life'
                : e.type === 'mariage' ? 'mariage' : 'other';
    entries.push({
      group,
      date: e.date_debut || null,
      icon: EVT_ICONS[e.type] || '📌',
      title: e.titre,
      sub: fmtDate(e.date_debut) || null,
      onclick: `openEvent(${e.id})`
    });
  });

  // Tri chronologique croissant, entrées sans date en dernier
  entries.sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
  });

  const el = document.getElementById('timeline-list');
  if (!entries.length) {
    el.innerHTML = `<div class="empty"><div class="empty-icon">🕰</div><div class="empty-title">${T('empty_timeline')}</div><div class="empty-sub">${T('empty_timeline_sub')}</div></div>`;
    return;
  }

  let html = `
    <div class="tl-wrap">
      <div class="tl-rail tl-rail-life"></div>
      <div class="tl-rail tl-rail-mariage"></div>
      <div class="tl-rail tl-rail-other"></div>
      <div class="tl-item tl-item-life tl-item-lbl"><div class="tl-dot"></div><div class="tl-rail-label">${T('tl_label_life')}</div></div>
      <div class="tl-item tl-item-mariage tl-item-lbl"><div class="tl-dot"></div><div class="tl-rail-label">${T('tl_label_mariage')}</div></div>
      <div class="tl-item tl-item-other tl-item-lbl"><div class="tl-dot"></div><div class="tl-rail-label">${T('tl_label_other')}</div></div>`;

  let lastDecade = null;
  let lastFive   = null;
  let shownBlank = false;

  entries.forEach(e => {
    if (!e.date) {
      if (!shownBlank) {
        shownBlank = true;
        html += `<div class="tl-year tl-year-decade"><span>—</span></div>`;
      }
    } else {
      const yr      = parseInt(e.date.substring(0, 4), 10);
      const decade  = Math.floor(yr / 10) * 10;
      const five    = Math.floor(yr / 5)  * 5;
      if (decade !== lastDecade) {
        lastDecade = decade;
        lastFive   = five;
        html += `<div class="tl-year tl-year-decade"><span>${decade}</span></div>`;
      } else if (five !== lastFive) {
        lastFive = five;
        html += `<div class="tl-year tl-year-five"><span>${five}</span></div>`;
      }
    }

    html += `
      <div class="tl-item tl-item-${e.group}">
        <div class="tl-dot"></div>
        <div class="tl-card" onclick="${e.onclick}">
          <div class="tl-card-head">
            <span class="tl-card-icon">${e.icon}</span>
            <span class="tl-card-title">${e.title}</span>
          </div>
          ${e.sub ? `<div class="tl-card-date">${e.sub}</div>` : ''}
        </div>
      </div>`;
  });
  html += '</div>';
  el.innerHTML = html;
}
