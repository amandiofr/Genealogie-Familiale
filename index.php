<?php
$v = fn($f) => filemtime(__DIR__ . '/' . $f);
?><!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Notre Famille</title>
<link rel="icon" type="image/png" href="familia.png">
<meta name="version" content="2.1">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="css/style.css?v=<?= $v('css/style.css') ?>">
</head>
</head>
<body>

<header>
  <nav id="nav">
    <div class="logo" onclick="showView('tree')" style="cursor:pointer;">🌿 <span id="logo-title">Notre Famille</span></div>
    <select id="arbre-select" onchange="setCurrentArbre(this.value)" style="padding:4px 24px 4px 8px;border:1px solid var(--border);border-radius:6px;font-family:'DM Sans',sans-serif;font-size:.8rem;color:var(--ink);background:var(--bg);outline:none;cursor:pointer;"></select>
    <div class="nav-buttons">
      <button class="active" data-view="tree">Arbre</button>
      <button data-view="events">Album</button>
      <button data-view="carte">Carte</button>
      <div class="admin-nav-wrap" id="nav-plus-wrap">
        <button id="nav-plus"><span id="nav-plus-text">Plus</span> <span style="font-size:.65em;opacity:.7;">▾</span></button>
        <div class="admin-dropdown" id="plus-dropdown">
          <button data-view="list">Personnes</button>
          <button data-view="anecdotes">Anecdotes</button>
          <button data-view="tresors">Trésors</button>
          <button data-view="recettes">Recettes</button>
          <button data-view="autos">Autos</button>
          <hr style="border:none;border-top:1px solid var(--border);margin:3px 8px;">
          <button data-view="timeline">Timeline</button>
          <button data-view="news">Dernières news</button>
          <button data-view="quality" id="nav-quality" style="display:none;">Qualité</button>
        </div>
      </div>
      <div class="admin-nav-wrap" id="nav-admin-wrap" style="display:none">
        <button id="nav-admin">Admin <span style="font-size:.65em;opacity:.7;">▾</span></button>
        <div class="admin-dropdown" id="admin-dropdown">
          <button data-view="admin-comptes"  id="nav-dd-comptes">Comptes</button>
          <button data-view="admin-export"   id="nav-dd-export">Export</button>
          <button data-view="admin-import"   id="nav-dd-import">Import</button>
          <button data-view="admin-notif"    id="nav-dd-notif">Notifications</button>
          <button data-view="admin-password" id="nav-dd-password">Mot de passe</button>
          <button data-view="admin-orphans"  id="nav-dd-orphans">Fichiers</button>
          <button data-view="admin-logs"     id="nav-dd-logs">Logs</button>
          <button data-view="admin-access"   id="nav-dd-access">Consultations</button>
          <button data-view="admin-lieux"    id="nav-dd-lieux">Lieux</button>
          <button data-view="admin-dev"     id="nav-dd-dev">Dev</button>
        </div>
      </div>
    </div>
  </nav>
  <div class="header-right">
    <span class="user-badge" id="user-badge"></span>
    <select id="author-picker" onchange="setAuthorName(this.value)"
      style="padding:4px 8px;border:1px solid var(--border);border-radius:6px;font-family:'DM Sans',sans-serif;font-size:.8rem;color:var(--ink);background:var(--bg);outline:none;cursor:pointer;">
      <option value="" disabled selected>Prénom</option>
    </select>
    <div id="lang-picker" style="position:relative;">
      <button id="lang-btn" onclick="toggleLangMenu()" style="background:none;border:1px solid var(--border);border-radius:6px;padding:4px 9px;font-size:.8rem;color:var(--ink2);font-family:'DM Sans',sans-serif;cursor:pointer;display:flex;align-items:center;gap:5px;white-space:nowrap;" aria-haspopup="true" aria-expanded="false">
        <span id="lang-flag"><img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzIDIiPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjIiIGZpbGw9IiMwMDIzOTUiLz48cmVjdCB4PSIxIiB3aWR0aD0iMSIgaGVpZ2h0PSIyIiBmaWxsPSIjZmZmIi8+PHJlY3QgeD0iMiIgd2lkdGg9IjEiIGhlaWdodD0iMiIgZmlsbD0iI0VEMjkzOSIvPjwvc3ZnPg==" width="18" height="12" style="border-radius:2px;vertical-align:middle;flex-shrink:0;" alt=""></span><span style="font-size:.6rem;opacity:.6;">▾</span>
      </button>
      <div id="lang-menu" style="display:none;position:absolute;right:0;top:calc(100% + 4px);background:var(--bg);border:1px solid var(--border);border-radius:8px;box-shadow:var(--shadow-lg);z-index:150;min-width:110px;overflow:hidden;">
        <button onclick="setLang('fr');closeLangMenu()" style="display:flex;align-items:center;gap:8px;width:100%;padding:8px 12px;background:none;border:none;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:.82rem;color:var(--ink);text-align:left;" onmouseover="this.style.background='var(--bg2)'" onmouseout="this.style.background='none'"><img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzIDIiPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjIiIGZpbGw9IiMwMDIzOTUiLz48cmVjdCB4PSIxIiB3aWR0aD0iMSIgaGVpZ2h0PSIyIiBmaWxsPSIjZmZmIi8+PHJlY3QgeD0iMiIgd2lkdGg9IjEiIGhlaWdodD0iMiIgZmlsbD0iI0VEMjkzOSIvPjwvc3ZnPg==" width="18" height="12" style="border-radius:2px;vertical-align:middle;flex-shrink:0;" alt=""> <span>Français</span></button>
        <button onclick="setLang('pt');closeLangMenu()" style="display:flex;align-items:center;gap:8px;width:100%;padding:8px 12px;background:none;border:none;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:.82rem;color:var(--ink);text-align:left;" onmouseover="this.style.background='var(--bg2)'" onmouseout="this.style.background='none'"><img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1IDMiPjxyZWN0IHdpZHRoPSIyIiBoZWlnaHQ9IjMiIGZpbGw9IiMwMDY2MDAiLz48cmVjdCB4PSIyIiB3aWR0aD0iMyIgaGVpZ2h0PSIzIiBmaWxsPSIjRkYwMDAwIi8+PGNpcmNsZSBjeD0iMiIgY3k9IjEuNSIgcj0iMC42IiBmaWxsPSIjRkZENzAwIiBzdHJva2U9IiMwMDMzOTkiIHN0cm9rZS13aWR0aD0iMC4xMiIvPjwvc3ZnPg==" width="18" height="12" style="border-radius:2px;vertical-align:middle;flex-shrink:0;" alt=""> <span>Português</span></button>
        <button onclick="setLang('en');closeLangMenu()" style="display:flex;align-items:center;gap:8px;width:100%;padding:8px 12px;background:none;border:none;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:.82rem;color:var(--ink);text-align:left;" onmouseover="this.style.background='var(--bg2)'" onmouseout="this.style.background='none'"><img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MCAzMCI+PHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjMwIiBmaWxsPSIjMDEyMTY5Ii8+PHBhdGggZD0iTTAsMCBMNjAsMzAgTTYwLDAgTDAsMzAiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSI2Ii8+PHBhdGggZD0iTTAsMCBMNjAsMzAgTTYwLDAgTDAsMzAiIHN0cm9rZT0iI0M4MTAyRSIgc3Ryb2tlLXdpZHRoPSI0Ii8+PHJlY3QgeD0iMjQiIHdpZHRoPSIxMiIgaGVpZ2h0PSIzMCIgZmlsbD0iI2ZmZiIvPjxyZWN0IHk9IjkiIHdpZHRoPSI2MCIgaGVpZ2h0PSIxMiIgZmlsbD0iI2ZmZiIvPjxyZWN0IHg9IjI2IiB3aWR0aD0iOCIgaGVpZ2h0PSIzMCIgZmlsbD0iI0M4MTAyRSIvPjxyZWN0IHk9IjExIiB3aWR0aD0iNjAiIGhlaWdodD0iOCIgZmlsbD0iI0M4MTAyRSIvPjwvc3ZnPg==" width="18" height="12" style="border-radius:2px;vertical-align:middle;flex-shrink:0;" alt=""> <span>English</span></button>
        <button onclick="setLang('de');closeLangMenu()" style="display:flex;align-items:center;gap:8px;width:100%;padding:8px 12px;background:none;border:none;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:.82rem;color:var(--ink);text-align:left;" onmouseover="this.style.background='var(--bg2)'" onmouseout="this.style.background='none'"><img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzIDIiPjxyZWN0IHdpZHRoPSIzIiBoZWlnaHQ9IjAuNjY3IiBmaWxsPSIjMDAwIi8+PHJlY3QgeT0iMC42NjciIHdpZHRoPSIzIiBoZWlnaHQ9IjAuNjY3IiBmaWxsPSIjREQwMDAwIi8+PHJlY3QgeT0iMS4zMzQiIHdpZHRoPSIzIiBoZWlnaHQ9IjAuNjY2IiBmaWxsPSIjRkZDRTAwIi8+PC9zdmc+" width="18" height="12" style="border-radius:2px;vertical-align:middle;flex-shrink:0;" alt=""> <span>Deutsch</span></button>
        <button onclick="setLang('fa');closeLangMenu()" style="display:flex;align-items:center;gap:8px;width:100%;padding:8px 12px;background:none;border:none;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:.82rem;color:var(--ink);text-align:left;" onmouseover="this.style.background='var(--bg2)'" onmouseout="this.style.background='none'"><img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzIDIiPjxyZWN0IHdpZHRoPSIzIiBoZWlnaHQ9IjAuNjY3IiBmaWxsPSIjMjM5RjQwIi8+PHJlY3QgeT0iMC42NjciIHdpZHRoPSIzIiBoZWlnaHQ9IjAuNjY3IiBmaWxsPSIjZmZmIi8+PHJlY3QgeT0iMS4zMzQiIHdpZHRoPSIzIiBoZWlnaHQ9IjAuNjY2IiBmaWxsPSIjREEwMDAwIi8+PC9zdmc+" width="18" height="12" style="border-radius:2px;vertical-align:middle;flex-shrink:0;" alt=""> <span>فارسی</span></button>
        <button onclick="setLang('ht');closeLangMenu()" style="display:flex;align-items:center;gap:8px;width:100%;padding:8px 12px;background:none;border:none;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:.82rem;color:var(--ink);text-align:left;" onmouseover="this.style.background='var(--bg2)'" onmouseout="this.style.background='none'"><img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzIDIiPjxyZWN0IHdpZHRoPSIzIiBoZWlnaHQ9IjEiIGZpbGw9IiMwMDIwOUYiLz48cmVjdCB5PSIxIiB3aWR0aD0iMyIgaGVpZ2h0PSIxIiBmaWxsPSIjRDIxMDM0Ii8+PC9zdmc+" width="18" height="12" style="border-radius:2px;vertical-align:middle;flex-shrink:0;" alt=""> <span>Kreyòl ayisyen</span></button>
        <button onclick="setLang('es');closeLangMenu()" style="display:flex;align-items:center;gap:8px;width:100%;padding:8px 12px;background:none;border:none;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:.82rem;color:var(--ink);text-align:left;" onmouseover="this.style.background='var(--bg2)'" onmouseout="this.style.background='none'"><img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzIDIiPjxyZWN0IHdpZHRoPSIzIiBoZWlnaHQ9IjAuNSIgZmlsbD0iI2M2MGIxZSIvPjxyZWN0IHk9IjAuNSIgd2lkdGg9IjMiIGhlaWdodD0iMSIgZmlsbD0iI2ZmYzQwMCIvPjxyZWN0IHk9IjEuNSIgd2lkdGg9IjMiIGhlaWdodD0iMC41IiBmaWxsPSIjYzYwYjFlIi8+PC9zdmc+" width="18" height="12" style="border-radius:2px;vertical-align:middle;flex-shrink:0;" alt=""> <span>Español</span></button>
        <button onclick="setLang('it');closeLangMenu()" style="display:flex;align-items:center;gap:8px;width:100%;padding:8px 12px;background:none;border:none;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:.82rem;color:var(--ink);text-align:left;" onmouseover="this.style.background='var(--bg2)'" onmouseout="this.style.background='none'"><img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzIDIiPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjIiIGZpbGw9IiMwMDkyNDYiLz48cmVjdCB4PSIxIiB3aWR0aD0iMSIgaGVpZ2h0PSIyIiBmaWxsPSIjZmZmIi8+PHJlY3QgeD0iMiIgd2lkdGg9IjEiIGhlaWdodD0iMiIgZmlsbD0iI0NFMkIzNyIvPjwvc3ZnPg==" width="18" height="12" style="border-radius:2px;vertical-align:middle;flex-shrink:0;" alt=""> <span>Italiano</span></button>
        <button onclick="setLang('el');closeLangMenu()" style="display:flex;align-items:center;gap:8px;width:100%;padding:8px 12px;background:none;border:none;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:.82rem;color:var(--ink);text-align:left;" onmouseover="this.style.background='var(--bg2)'" onmouseout="this.style.background='none'"><img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNyAxOCI+PHJlY3Qgd2lkdGg9IjI3IiBoZWlnaHQ9IjE4IiBmaWxsPSIjMEQ1RUFGIi8+PHJlY3Qgd2lkdGg9IjI3IiBoZWlnaHQ9IjIiIGZpbGw9IiNmZmYiLz48cmVjdCB5PSI0IiB3aWR0aD0iMjciIGhlaWdodD0iMiIgZmlsbD0iI2ZmZiIvPjxyZWN0IHk9IjgiIHdpZHRoPSIyNyIgaGVpZ2h0PSIyIiBmaWxsPSIjZmZmIi8+PHJlY3QgeT0iMTIiIHdpZHRoPSIyNyIgaGVpZ2h0PSIyIiBmaWxsPSIjZmZmIi8+PHJlY3QgeT0iMTYiIHdpZHRoPSIyNyIgaGVpZ2h0PSIyIiBmaWxsPSIjZmZmIi8+PHJlY3Qgd2lkdGg9IjkiIGhlaWdodD0iMTAiIGZpbGw9IiMwRDVFQUYiLz48cmVjdCB4PSIzLjUiIHdpZHRoPSIyIiBoZWlnaHQ9IjEwIiBmaWxsPSIjZmZmIi8+PHJlY3QgeT0iNCIgd2lkdGg9IjkiIGhlaWdodD0iMiIgZmlsbD0iI2ZmZiIvPjwvc3ZnPg==" width="18" height="12" style="border-radius:2px;vertical-align:middle;flex-shrink:0;" alt=""> <span>Ελληνικά</span></button>
      </div>
    </div>
    <label id="auto-translate-wrap" style="display:flex;align-items:center;gap:5px;cursor:pointer;font-size:.75rem;color:var(--ink2);white-space:nowrap;">
      <input type="checkbox" id="auto-translate-cb" onchange="setAutoTranslate(this.checked)" style="cursor:pointer;">
      <span id="auto-translate-lbl">Traduire</span>
    </label>
    <button class="btn-sm" id="btn-logout" onclick="logout()" title="Déconnexion" style="padding:5px 8px;"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg></button>
  </div>
</header>
<div id="subtree-banner" style="display:none;align-items:center;gap:8px;padding:5px 14px;background:var(--accent);color:#fff;font-size:.78rem;">
  <span id="subtree-banner-label"></span>
  <button onclick="clearSubtree()" style="margin-left:auto;background:rgba(255,255,255,.25);border:none;border-radius:4px;color:#fff;cursor:pointer;font-size:.75rem;padding:3px 10px;"></button>
</div>

<!-- ── ARBRE ─────────────────────────────────────────────────── -->
<div id="view-tree" class="view active">
  <div style="padding:.4rem 1rem .2rem;display:flex;align-items:center;gap:1rem;">
    <p class="tree-hint" id="tree-hint" style="margin:0;flex:1;"></p>
    <button id="btn-add-person-tree" onclick="showPersonForm(null)" class="btn-primary" style="font-size:.75rem;padding:4px 10px;">+ Membre</button>
    <button onclick="exportTreePDF()" class="hide-mobile" style="background:none;border:1px solid var(--border);border-radius:6px;padding:4px 10px;font-size:.75rem;color:var(--ink2);cursor:pointer;">⬇ PDF</button>
  </div>
  <div class="tree-wrap" style="width:100%;"><div id="tree-container"></div></div>
</div>

<!-- ── LISTE ─────────────────────────────────────────────────── -->
<div id="view-list" class="view">
  <div class="view-inner">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
      <h2 id="view-list-heading" style="font-family:'Cormorant Garamond',serif;font-size:1.4rem;font-weight:400;">Personnes</h2>
      <button class="btn-primary" id="btn-add-person" style="font-size:.78rem;padding:7px 14px;">+ Ajouter</button>
    </div>
    <div class="search-wrap">
      <span style="color:var(--ink3);font-size:.9rem;">🔍</span>
      <input type="text" id="search" placeholder="Rechercher par nom, lieu, profession…" oninput="filterList()">
    </div>
    <div class="filter-row" style="justify-content:space-between;flex-wrap:wrap;gap:.4rem;">
      <div style="display:flex;flex-wrap:wrap;gap:.35rem;">
        <button class="filter-btn active" data-filter="all" onclick="setFilter('all',this)">Tous</button>
        <button class="filter-btn" data-filter="male" onclick="setFilter('male',this)">Hommes</button>
        <button class="filter-btn" data-filter="female" onclick="setFilter('female',this)">Femmes</button>
        <button class="filter-btn" data-filter="living" onclick="setFilter('living',this)">Vivants</button>
        <button class="filter-btn" data-filter="deceased" onclick="setFilter('deceased',this)">Décédés</button>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:.35rem;">
        <button id="sort-btn-date" class="filter-btn active" onclick="setSort('date',this)">Naissance</button>
        <button id="sort-btn-birthday" class="filter-btn" onclick="setSort('birthday',this)">Anniversaire</button>
        <button id="sort-btn-alpha" class="filter-btn" onclick="setSort('alpha',this)">Alphabétique</button>
      </div>
    </div>
    <div id="person-list"></div>
  </div>
</div>

<!-- ── ÉVÉNEMENTS ─────────────────────────────────────────────── -->
<div id="view-events" class="view">
  <div class="view-inner">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.2rem;">
      <h2 id="view-events-heading" style="font-family:'Cormorant Garamond',serif;font-size:1.4rem;font-weight:400;">Album</h2>
      <button class="btn-primary" id="btn-add-event" style="font-size:.78rem;padding:7px 14px;">+ Ajouter</button>
    </div>
    <div id="events-grid" class="cards-grid"></div>
  </div>
</div>


<!-- ── ANECDOTES ──────────────────────────────────────────────── -->
<div id="view-anecdotes" class="view">
  <div class="view-inner">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.2rem;">
      <h2 id="view-anecdotes-heading" style="font-family:'Cormorant Garamond',serif;font-size:1.4rem;font-weight:400;">Anecdotes</h2>
      <button class="btn-primary" id="btn-add-anecdote" style="font-size:.78rem;padding:7px 14px;">+ Écrire</button>
    </div>
    <div id="anecdotes-list"></div>
  </div>
</div>

<!-- ── TRÉSORS ───────────────────────────────────────────────── -->
<div id="view-tresors" class="view">
  <div class="view-inner">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.2rem;">
      <h2 id="view-tresors-heading" style="font-family:'Cormorant Garamond',serif;font-size:1.4rem;font-weight:400;">Trésors</h2>
      <button class="btn-primary" id="btn-add-tresor" style="font-size:.78rem;padding:7px 14px;">+ Ajouter</button>
    </div>
    <div id="tresors-list"></div>
  </div>
</div>

<!-- ── RECETTES ───────────────────────────────────────────────── -->
<div id="view-recettes" class="view">
  <div class="view-inner">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.2rem;">
      <h2 id="view-recettes-heading" style="font-family:'Cormorant Garamond',serif;font-size:1.4rem;font-weight:400;">Recettes</h2>
      <button class="btn-primary" id="btn-add-recette" style="font-size:.78rem;padding:7px 14px;">+ Ajouter</button>
    </div>
    <div id="recettes-list"></div>
  </div>
</div>

<!-- ── AUTOS ───────────────────────────────────────────────── -->
<div id="view-autos" class="view">
  <div class="view-inner">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.2rem;">
      <h2 id="view-autos-heading" style="font-family:'Cormorant Garamond',serif;font-size:1.4rem;font-weight:400;">Autos de famille</h2>
      <button class="btn-primary" id="btn-add-auto" style="font-size:.78rem;padding:7px 14px;">+ Ajouter</button>
    </div>
    <div id="autos-list"></div>
  </div>
</div>

<!-- ── TIMELINE ──────────────────────────────────────────────── -->
<div id="view-timeline" class="view">
  <div class="view-inner">
    <h2 id="view-timeline-heading" style="font-family:'Cormorant Garamond',serif;font-size:1.4rem;font-weight:400;margin-bottom:1.2rem;">Timeline</h2>
    <div id="timeline-list"></div>
  </div>
</div>

<!-- ── CARTE ─────────────────────────────────────────────────── -->
<div id="view-carte" class="view" style="padding:0;">
  <div style="padding:.8rem 1rem .4rem;display:flex;align-items:center;gap:.8rem;flex-wrap:wrap;background:var(--bg);position:sticky;top:56px;z-index:10;border-bottom:1px solid var(--border);">
    <h2 id="view-carte-heading" style="font-family:'Cormorant Garamond',serif;font-size:1.2rem;font-weight:400;margin:0;white-space:nowrap;">Carte</h2>
    <button id="carte-play-btn" onclick="toggleCartePlay()" style="background:var(--accent);color:#fff;border:none;border-radius:6px;padding:4px 12px;cursor:pointer;font-size:1rem;">▶</button>
    <input type="range" id="carte-slider" min="1800" max="2025" value="1900"
           oninput="onCarteSlider(this.value)"
           style="flex:1;min-width:120px;accent-color:var(--accent);">
    <span id="carte-year-label" style="font-family:'Cormorant Garamond',serif;font-size:1.4rem;font-weight:500;min-width:4ch;text-align:right;">1900</span>
    <span id="carte-count" style="font-size:.78rem;color:var(--ink3);white-space:nowrap;"></span>
  </div>
  <div id="carte-map" style="width:100%;height:calc(100vh - 110px);"></div>
</div>

<!-- ── NEWS ──────────────────────────────────────────────────── -->
<div id="view-news" class="view">
  <div class="view-inner">
    <h2 id="view-news-heading" style="font-family:'Cormorant Garamond',serif;font-size:1.4rem;font-weight:400;margin-bottom:1.2rem;">Dernières news</h2>
    <div class="form-card">
      <div id="news-result"></div>
    </div>
  </div>
</div>

<!-- ── ADMIN ──────────────────────────────────────────────────── -->
<!-- ── ADMIN : Comptes ────────────────────────────────────────── -->
<div id="view-admin-comptes" class="view">
  <div class="view-inner">
    <h2 id="view-admin-comptes-heading" style="font-family:'Cormorant Garamond',serif;font-size:1.4rem;font-weight:400;margin-bottom:1.2rem;">Gestion des comptes</h2>
    <div class="form-card">
      <div id="users-list" style="margin-bottom:1rem;"></div>
      <button class="btn-primary" onclick="showAddUser()" style="font-size:.78rem;padding:7px 14px;" id="btn-admin-new-user">+ Nouveau compte</button>
    </div>
  </div>
</div>

<!-- ── ADMIN : Export ─────────────────────────────────────────── -->
<div id="view-admin-export" class="view">
  <div class="view-inner">
    <h2 id="view-admin-export-heading" style="font-family:'Cormorant Garamond',serif;font-size:1.4rem;font-weight:400;margin-bottom:1.2rem;">Export des données</h2>
    <div class="form-card">
      <a class="export-btn" href="api/export.php?action=gedcom">
        <span style="font-size:1.1rem;">🧬</span>
        <div><div class="export-title" id="export-gedcom-title">Exporter en GEDCOM</div><div class="export-sub" id="export-gedcom-sub">Standard universel — compatible Ancestry, MyHeritage, Geneanet…</div></div>
        <span style="color:var(--ink3);">↓</span>
      </a>
      <a class="export-btn" href="api/export.php?action=json">
        <span style="font-size:1.1rem;">📦</span>
        <div><div class="export-title" id="export-json-title">Exporter en JSON</div><div class="export-sub" id="export-json-sub">Sauvegarde complète — toutes les données, événements, anecdotes</div></div>
        <span style="color:var(--ink3);">↓</span>
      </a>
      <a class="export-btn" href="api/export.php?action=csv">
        <span style="font-size:1.1rem;">📊</span>
        <div><div class="export-title" id="export-csv-title">Exporter en CSV (ZIP)</div><div class="export-sub" id="export-csv-sub">Toutes les tables — membres, liens, événements, anecdotes…</div></div>
        <span style="color:var(--ink3);">↓</span>
      </a>
    </div>
  </div>
</div>

<!-- ── ADMIN : Import ─────────────────────────────────────────── -->
<div id="view-admin-import" class="view">
  <div class="view-inner">
    <h2 id="view-admin-import-heading" style="font-family:'Cormorant Garamond',serif;font-size:1.4rem;font-weight:400;margin-bottom:1.2rem;">Importer des données</h2>
    <div class="form-card">
      <div class="fg"><label id="lbl-import-ged">Fichier GEDCOM (.ged)</label>
        <input type="file" accept=".ged" id="import-ged-file" style="display:none" onchange="document.getElementById('import-ged-name').textContent=this.files[0]?.name||''">
        <div style="display:flex;align-items:center;gap:8px;">
          <button type="button" id="btn-choose-ged" class="btn-secondary" style="font-size:.8rem;white-space:nowrap;" onclick="document.getElementById('import-ged-file').click()">Choisir un fichier</button>
          <span id="import-ged-name" style="font-size:.8rem;color:var(--ink2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;"></span>
        </div>
      </div>
      <button class="btn-secondary" onclick="importFile('gedcom')" style="font-size:.8rem;" id="btn-import-ged">Importer GEDCOM</button>
      <div style="margin-top:.9rem;" class="fg"><label id="lbl-import-json">Fichier JSON (export précédent)</label>
        <input type="file" accept=".json" id="import-json-file" style="display:none" onchange="document.getElementById('import-json-name').textContent=this.files[0]?.name||''">
        <div style="display:flex;align-items:center;gap:8px;">
          <button type="button" id="btn-choose-json" class="btn-secondary" style="font-size:.8rem;white-space:nowrap;" onclick="document.getElementById('import-json-file').click()">Choisir un fichier</button>
          <span id="import-json-name" style="font-size:.8rem;color:var(--ink2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;"></span>
        </div>
      </div>
      <button class="btn-secondary" onclick="importFile('json')" style="font-size:.8rem;" id="btn-import-json">Importer JSON</button>
    </div>
  </div>
</div>

<!-- ── ADMIN : Notifications ──────────────────────────────────── -->
<div id="view-admin-notif" class="view">
  <div class="view-inner">
    <h2 id="view-admin-notif-heading" style="font-family:'Cormorant Garamond',serif;font-size:1.4rem;font-weight:400;margin-bottom:1.2rem;">Notifications par e-mail</h2>
    <div class="form-card">
      <p style="font-size:.8rem;color:var(--ink3);margin-bottom:.9rem;" id="lbl-admin-notif-desc">Liste des adresses à prévenir lors de modifications. Un e-mail au maximum par jour, envoyé 1 heure après la dernière modification.</p>
      <div id="notif-emails-list" style="margin-bottom:.8rem;"></div>
      <div style="display:flex;gap:.5rem;flex-wrap:wrap;">
        <input type="email" id="notif-new-email" placeholder="nouvelle@adresse.fr" style="flex:1;min-width:0;padding:7px 10px;border:1px solid var(--border);border-radius:6px;font-family:'DM Sans',sans-serif;font-size:.82rem;">
        <button class="btn-primary" onclick="addNotifEmail()" style="font-size:.78rem;padding:7px 14px;white-space:nowrap;" id="btn-notif-add">+ Ajouter</button>
      </div>
    </div>
  </div>
</div>

<!-- ── ADMIN : Mot de passe ───────────────────────────────────── -->
<div id="view-admin-password" class="view">
  <div class="view-inner">
    <h2 id="view-admin-password-heading" style="font-family:'Cormorant Garamond',serif;font-size:1.4rem;font-weight:400;margin-bottom:1.2rem;">Changer mon mot de passe</h2>
    <div class="form-card">
      <div class="form-grid">
        <div class="fg"><label id="lbl-pwd-old">Ancien mot de passe</label><input type="password" id="pwd-old"></div>
        <div class="fg"><label id="lbl-pwd-new">Nouveau mot de passe</label><input type="password" id="pwd-new"></div>
      </div>
      <button class="btn-primary" onclick="changePassword()" style="font-size:.8rem;" id="btn-pwd-save">Modifier</button>
    </div>
  </div>
</div>

<!-- ── ADMIN : Fichiers orphelins ─────────────────────────────── -->
<div id="view-admin-orphans" class="view">
  <div class="view-inner">
    <h2 id="view-admin-orphans-heading" style="font-family:'Cormorant Garamond',serif;font-size:1.4rem;font-weight:400;margin-bottom:1.2rem;">Fichiers non utilisés</h2>
    <div class="form-card">
      <p style="font-size:.8rem;color:var(--ink3);margin-bottom:.9rem;" id="lbl-admin-orphans-desc">Fichiers présents dans uploads/ mais non référencés en base de données.</p>
      <div id="orphan-files-result"></div>
      <button class="btn-secondary" onclick="scanOrphanFiles()" style="font-size:.8rem;" id="btn-scan-orphans">Scanner</button>
    </div>
  </div>
</div>

<!-- ── ADMIN : Logs ───────────────────────────────────────────── -->
<div id="view-admin-logs" class="view">
  <div class="view-inner">
    <h2 id="view-admin-logs-heading" style="font-family:'Cormorant Garamond',serif;font-size:1.4rem;font-weight:400;margin-bottom:1.2rem;">Logs des modifications</h2>
    <div class="form-card">
      <div id="mod-log-result"></div>
    </div>
  </div>
</div>

<!-- ── ADMIN : Consultations ────────────────────────────────── -->
<div id="view-admin-access" class="view">
  <div class="view-inner">
    <h2 id="view-admin-access-heading" style="font-family:'Cormorant Garamond',serif;font-size:1.4rem;font-weight:400;margin-bottom:1.2rem;">Consultations</h2>
    <div class="form-card">
      <div id="access-log-result"></div>
    </div>
  </div>
</div>

<!-- ── ADMIN : Qualité ──────────────────────────────────────── -->
<div id="view-quality" class="view">
  <div class="view-inner">
    <h2 id="view-quality-heading" style="font-family:'Cormorant Garamond',serif;font-size:1.4rem;font-weight:400;margin-bottom:1.2rem;">Contrôle qualité</h2>
    <div class="form-card">
      <div id="quality-result"></div>
    </div>
  </div>
</div>

<!-- ── ADMIN : Lieux ──────────────────────────────────────────── -->
<div id="view-admin-lieux" class="view">
  <div class="view-inner">
    <h2 id="view-admin-lieux-heading" style="font-family:'Cormorant Garamond',serif;font-size:1.4rem;font-weight:400;margin-bottom:1.2rem;">Géocodage des lieux</h2>
    <div class="form-card">
      <div style="display:flex;gap:.6rem;margin-bottom:1rem;flex-wrap:wrap;">
        <button class="btn-primary" style="font-size:.78rem;" onclick="geocodeAllLieux()" id="btn-geocode-all">Géocoder tous</button>
        <span id="lieux-progress" style="font-size:.8rem;color:var(--ink3);align-self:center;"></span>
      </div>
      <div id="lieux-list"></div>
    </div>
  </div>
</div>

<!-- ── ADMIN : Maintenance ─────────────────────────────────────── -->
<div id="view-admin-dev" class="view">
  <div class="view-inner">
    <h2 id="view-admin-dev-heading" style="font-family:'Cormorant Garamond',serif;font-size:1.4rem;font-weight:400;margin-bottom:1.2rem;">Maintenance</h2>
    <div class="form-card" style="display:flex;flex-direction:column;gap:1rem;">

      <div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap;">
        <div style="flex:1;min-width:200px;">
          <div id="dev-cron-title" style="font-size:.88rem;font-weight:500;">Exécution immédiate du cron</div>
          <div id="dev-cron-desc" style="font-size:.75rem;color:var(--ink3);margin-top:2px;">Déclenche l'envoi des notifications sans attendre la tâche planifiée.</div>
        </div>
        <div style="display:flex;gap:.5rem;">
          <button id="dev-btn-simulate" class="btn-secondary" style="font-size:.78rem;white-space:nowrap;" onclick="devRunCron(true)">▶ Simuler</button>
          <button id="dev-btn-send"     class="btn-primary"   style="font-size:.78rem;white-space:nowrap;" onclick="devRunCron(false)">▶ Envoyer</button>
        </div>
      </div>
      <pre id="dev-cron-output" style="display:none;font-size:.75rem;background:var(--bg2);padding:.6rem .9rem;border-radius:5px;white-space:pre-wrap;margin:0;"></pre>

      <hr style="border:none;border-top:1px solid var(--border);margin:0;">

      <div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap;">
        <div style="flex:1;min-width:200px;">
          <div id="dev-upload-title" style="font-size:.88rem;font-weight:500;">Taille du répertoire uploads/</div>
          <div id="dev-upload-desc" style="font-size:.75rem;color:var(--ink3);margin-top:2px;">Calcule le poids total des photos et fichiers stockés.</div>
        </div>
        <button id="dev-btn-calc" class="btn-secondary" style="font-size:.78rem;white-space:nowrap;" onclick="devUploadSize()">📁 Calculer</button>
      </div>
      <div id="dev-upload-size" style="display:none;font-size:.82rem;color:var(--ink2);"></div>

      <hr style="border:none;border-top:1px solid var(--border);margin:0;">

      <div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap;">
        <div style="flex:1;min-width:200px;">
          <div id="dev-reminder-title" style="font-size:.88rem;font-weight:500;">Démo : rappel de choix de prénom</div>
          <div id="dev-reminder-desc" style="font-size:.75rem;color:var(--ink3);margin-top:2px;">Affiche la notification qui demande à l'utilisateur de choisir son prénom d'auteur.</div>
        </div>
        <button id="dev-btn-reminder" class="btn-secondary" style="font-size:.78rem;white-space:nowrap;" onclick="devDemoReminder()">🔔 Afficher</button>
      </div>

      <div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap;">
        <div style="flex:1;min-width:200px;">
          <div id="dev-error-title" style="font-size:.88rem;font-weight:500;">Démo : bannière d'erreur</div>
          <div id="dev-error-desc" style="font-size:.75rem;color:var(--ink3);margin-top:2px;">Simule une erreur JS non gérée pour tester la bannière de rechargement.</div>
        </div>
        <button id="dev-btn-error" class="btn-secondary" style="font-size:.78rem;white-space:nowrap;" onclick="devDemoError()">💥 Tester</button>
      </div>

    </div>
  </div>
</div>

<!-- ── MODAL PERSON VIEW ─────────────────────────────────────── -->
<div class="overlay" id="modal-person-view-overlay">
  <div class="modal" id="modal-person-view" onclick="event.stopPropagation()"></div>
</div>

<!-- ── MODAL FORM PERSON ──────────────────────────────────────── -->
<div class="overlay" id="modal-person-edit-overlay">
  <div class="modal" id="modal-person-edit" onclick="event.stopPropagation()" style="max-width:560px;"></div>
</div>

<!-- ── MODAL NO TREE ─────────────────────────────────────────── -->
<div class="overlay" id="modal-no-tree-overlay">
  <div class="modal" id="modal-no-tree" onclick="event.stopPropagation()" style="max-width:480px;"></div>
</div>

<!-- ── MODAL FORM ÉVÉNEMENT ──────────────────────────────────── -->
<div class="overlay" id="modal-form-event-overlay">
  <div class="modal" id="modal-form-event" onclick="event.stopPropagation()" style="max-width:560px;"></div>
</div>


<!-- ── MODAL FORM ANECDOTE ───────────────────────────────────── -->
<div class="overlay" id="modal-form-anecdote-overlay">
  <div class="modal" id="modal-form-anecdote" onclick="event.stopPropagation()" style="max-width:560px;"></div>
</div>

<!-- ── MODAL FORM TRÉSOR ──────────────────────────────────────── -->
<div class="overlay" id="modal-form-tresor-overlay">
  <div class="modal" id="modal-form-tresor" onclick="event.stopPropagation()" style="max-width:560px;"></div>
</div>

<!-- ── MODAL FORM RECETTE ─────────────────────────────────────── -->
<div class="overlay" id="modal-form-recette-overlay">
  <div class="modal" id="modal-form-recette" onclick="event.stopPropagation()" style="max-width:560px;"></div>
</div>

<!-- ── MODAL FORM AUTO ───────────────────────────────────────── -->
<div class="overlay" id="modal-form-auto-overlay">
  <div class="modal" id="modal-form-auto" onclick="event.stopPropagation()" style="max-width:560px;"></div>
</div>

<!-- ── MODAL FORM USER ───────────────────────────────────────── -->
<div class="overlay" id="modal-user-overlay">
  <div class="modal" id="modal-user" onclick="event.stopPropagation()" style="max-width:420px;"></div>
</div>

<!-- ── LIGHTBOX ──────────────────────────────────────────────── -->
<div class="lightbox" id="lightbox" onclick="closeLightboxAll()">
  <button class="lightbox-close" onclick="event.stopPropagation();closeLightbox()">✕</button>
  <a id="lb-download" class="lb-download" onclick="event.stopPropagation()" title="Télécharger"><svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="14"/><polyline points="5,8 12,16 19,8"/><line x1="4" y1="21" x2="20" y2="21"/></svg></a>
  <button id="lb-tag-btn" class="lb-download" onclick="event.stopPropagation();lbToggleTagMode()" style="right:100px;display:none;font-size:.9rem;">🏷️</button>
  <button id="lb-prev" class="lb-nav lb-prev" onclick="event.stopPropagation();lbNav(-1)">‹</button>
  <button id="lb-next" class="lb-nav lb-next" onclick="event.stopPropagation();lbNav(1)">›</button>
  <img id="lightbox-img" src="" alt="" draggable="false">
  <div id="lb-face-overlay" class="lb-face-overlay" style="display:none;"></div>
  <div id="lb-title" style="display:none;" onclick="event.stopPropagation()"></div>
</div>

<div class="toast" id="toast"></div>

<script src="js/i18n.js?v=<?= $v('js/i18n.js') ?>"></script>
<script src="js/translate.js?v=<?= $v('js/translate.js') ?>"></script>
<script src="js/init.js?v=<?= $v('js/init.js') ?>"></script>
<script src="js/arbre.js?v=<?= $v('js/arbre.js') ?>"></script>
<script src="js/list.js?v=<?= $v('js/list.js') ?>"></script>
<script src="js/reactions.js?v=<?= $v('js/reactions.js') ?>"></script>
<script src="js/events.js?v=<?= $v('js/events.js') ?>"></script>
<script src="js/timeline.js?v=<?= $v('js/timeline.js') ?>"></script>
<script src="js/autos.js?v=<?= $v('js/autos.js') ?>"></script>
<script src="js/tresors.js?v=<?= $v('js/tresors.js') ?>"></script>
<script src="js/recettes.js?v=<?= $v('js/recettes.js') ?>"></script>
<script src="js/carte.js?v=<?= $v('js/carte.js') ?>"></script>
<script src="js/admin.js?v=<?= $v('js/admin.js') ?>"></script>
<script src="js/news.js?v=<?= $v('js/news.js') ?>"></script>
</body>
</html>
