async function loadNews(offset = 0) {
  const el = document.getElementById('news-result');
  if (offset === 0) el.innerHTML = `<p style="font-size:.8rem;color:var(--ink3);">${T('news_loading')}</p>`;
  try {
    const arbreParam = _currentArbreId ? `&arbre_id=${encodeURIComponent(_currentArbreId)}` : '';
    const logs = await api('GET', `api/news.php?limit=20&offset=${offset}${arbreParam}`);
    if (offset === 0 && !logs.length) {
      el.innerHTML = `<p style="font-size:.8rem;color:var(--ink3);font-style:italic;">${T('news_empty')}</p>`;
      return;
    }
    const actionColor = { ajout:'#2a7a2a', modification:'#1a6eb5', suppression:'#c44' };
    const hashMap = { personne:'person', evenement:'event', anecdote:'anecdote', tresor:'tresor', recette:'recette', auto:'auto' };
    const typeLabels = () => ({
      personne: T('stat_membres'), evenement: T('nav_events'),
      anecdote: T('nav_anecdotes'), tresor: T('nav_tresors'),
      recette: T('nav_recettes'), auto: T('nav_autos'), lien: T('stat_membres'),
    });
    const rows = logs.map((log, i) => {
      const date = new Date(log.created_at).toLocaleDateString(currentLang, {day:'2-digit',month:'2-digit',year:'numeric'});
      const tl = typeLabels();
      const typeLbl = tl[log.type] || log.type;
      const color = actionColor[log.action] || '#888';
      const hash = hashMap[log.type];
      const href = hash && log.object_id && log.action !== 'suppression' ? `#${hash}/${log.object_id}` : null;
      const border = i < logs.length - 1 ? 'border-bottom:1px solid var(--border);' : '';
      const inner = `<span style="font-size:.7rem;color:${color};font-weight:600;min-width:70px;">${encodeHTML(typeLbl)}</span>
        <span style="font-size:.82rem;flex:1;">${encodeHTML(log.description)}</span>
        ${log.auteur ? `<span style="font-size:.72rem;color:var(--ink3);">${encodeHTML(log.auteur)}</span>` : ''}
        <span style="font-size:.68rem;color:var(--ink3);white-space:nowrap;">${date}</span>`;
      return href
        ? `<a href="${href}" style="display:flex;align-items:baseline;gap:.5rem;padding:.45rem .1rem;${border}text-decoration:none;color:inherit;cursor:pointer;">${inner}</a>`
        : `<div style="display:flex;align-items:baseline;gap:.5rem;padding:.45rem .1rem;${border}">${inner}</div>`;
    }).join('');

    if (offset === 0) {
      el.innerHTML = `<div id="news-rows">${rows}</div>`;
    } else {
      document.getElementById('news-rows').insertAdjacentHTML('beforeend', rows);
      document.getElementById('news-more')?.remove();
    }
    if (logs.length === 20) {
      el.insertAdjacentHTML('beforeend',
        `<button id="news-more" class="btn-secondary" onclick="loadNews(${offset + 20})" style="margin-top:.8rem;font-size:.78rem;">${T('news_load_more')}</button>`);
    }
  } catch(e) { el.innerHTML = ''; toast(e.message, 'error'); }
}
