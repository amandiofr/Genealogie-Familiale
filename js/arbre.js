// ══════════════════════════════════════════════════════════════
//  ARBRE SVG — avec couples et filiations
// ══════════════════════════════════════════════════════════════

// Dimensions des cartes et espacements
const CARD_W   = 124;  // largeur carte
const CARD_H   = 130;  // hauteur carte
const GAP_X    = 20;   // espace horizontal entre cartes
const COUPLE_GAP = 16; // espace entre les deux cartes d'un couple
const GAP_Y    = 80;   // espace vertical entre générations
const CONN_R   = 4;    // rayon des coins arrondis sur les connecteurs

function renderTree() {
  // ── Charger les liens depuis l'API (on a besoin des conjoints + parent/enfant)
  // Les liens sont déjà dans people via la fiche complète — mais la liste /personnes.php
  // ne retourne pas les liens. On les reconstruit à partir de ce qu'on a en mémoire
  // en faisant un appel groupé uniquement si nécessaire.
  buildTreeSVG();
}

async function buildTreeSVG() {
  try {
    const r = await fetch('api/liens.php');
    if (r.ok) _allLiens = await r.json();
  } catch {}
  _expandCurrentMembersWithSpouses();
  drawTree(_allLiens);
}

function _expandCurrentMembersWithSpouses() {
  if (!_currentMembers) return;
  _allLiens.filter(l => l.type === 'conjoint').forEach(l => {
    if (_currentMembers.has(Number(l.personne_a))) _currentMembers.add(Number(l.personne_b));
    if (_currentMembers.has(Number(l.personne_b))) _currentMembers.add(Number(l.personne_a));
  });
}

function drawTree(allLiens) {
  // _currentMembers already includes spouses (expanded in _expandCurrentMembersWithSpouses)
  const treePeople = _currentMembers
    ? people.filter(p => _currentMembers.has(Number(p.id)))
    : people;
  const container = document.getElementById('tree-container');
  const cW         = 46;
  const cH         = 82;
  const cGapX      = 12;
  const cGapY      = 50;
  const cCoupleGap = 10;
  const vHalf      = cW / 2;
  const conjointLinks = allLiens.filter(l => l.type === 'conjoint');
  const parentLinks   = allLiens.filter(l => l.type === 'parent_enfant');

  // ── 1. Grouper par génération
  const gens = {};
  treePeople.forEach(p => { (gens[p.generation]??=[]).push(p); });
  const sortedGens = Object.keys(gens).map(Number).sort((a,b)=>a-b);
  if (!sortedGens.length) { container.innerHTML=''; return; }

  // ── 2. Construire les unités par génération
  //
  // Règle : pour chaque génération N, parcourir les unités de N-1 dans l'ordre.
  // Pour chaque unité parente, placer IMMÉDIATEMENT tous ses enfants (+ leur
  // conjoint externe s'ils en ont un), avant de passer à l'unité parente suivante.
  // Cela garantit que les enfants d'un même couple sont toujours contigus.

  const units = {};

  function unitWidth(u) {
    return u.type === 'couple' ? cW * 2 + cCoupleGap : cW;
  }

  // Trouve le conjoint d'une personne dans genPeople, non encore utilisé
  function getSpouse(p, genPeople, used) {
    const cl = conjointLinks.find(l => l.personne_a == p.id || l.personne_b == p.id);
    if (!cl) return null;
    const sid = cl.personne_a == p.id ? cl.personne_b : cl.personne_a;
    if (used.has(sid)) return null;
    return genPeople.find(q => q.id == sid) || null;
  }

  // Crée une unité couple (homme en premier si possible)
  function makeCouple(a, b) {
    const [f, s] = a.genre === 'male' ? [a, b]
      : b.genre === 'male' ? [b, a] : [a, b];
    return { type: 'couple', people: [f, s] };
  }

  sortedGens.forEach((gen, gi) => {
    const genPeople = [...gens[gen]];
    const used      = new Set();
    const ordered   = [];

    if (gi === 0) {
      // Génération racine : ordre naturel, couples groupés
      genPeople.forEach(p => {
        if (used.has(p.id)) return;
        const s = getSpouse(p, genPeople, used);
        if (s) {
          ordered.push(makeCouple(p, s));
          used.add(p.id); used.add(s.id);
        } else {
          ordered.push({ type: 'solo', people: [p] });
          used.add(p.id);
        }
      });

    } else {
      const prevUnits = units[sortedGens[gi - 1]];

      // Parcourir chaque unité parente dans l'ordre
      prevUnits.forEach(parentUnit => {
        // Enfants directs de cette unité, pas encore placés
        const children = genPeople.filter(child =>
          !used.has(child.id) &&
          parentUnit.people.some(parent =>
            parentLinks.some(l => l.personne_a == parent.id && l.personne_b == child.id)
          )
        );

        // Trier par date de naissance (id comme proxy si date absente)
        children.sort((a, b) =>
          (a.naissance || '') < (b.naissance || '') ? -1
          : (a.naissance || '') > (b.naissance || '') ? 1
          : a.id - b.id
        );

        children.forEach(child => {
          if (used.has(child.id)) return;

          // Chercher le conjoint de cet enfant
          const spouse = getSpouse(child, genPeople, used);

          // N'accepter le conjoint que s'il n'a PAS de parents dans gen-1
          // (s'il en a, il sera placé avec ses propres parents)
          const spouseHasParentsInPrev = spouse && prevUnits.some(pu =>
            pu.people.some(par =>
              parentLinks.some(l => l.personne_a == par.id && l.personne_b == spouse.id)
            )
          );

          if (spouse && !spouseHasParentsInPrev) {
            ordered.push(makeCouple(child, spouse));
            used.add(child.id); used.add(spouse.id);
          } else {
            ordered.push({ type: 'solo', people: [child] });
            used.add(child.id);
          }
        });
      });

      // Personnes restantes sans parents connus dans gen-1 → à la fin
      genPeople.forEach(p => {
        if (used.has(p.id)) return;
        const s = getSpouse(p, genPeople, used);
        if (s) {
          ordered.push(makeCouple(p, s));
          used.add(p.id); used.add(s.id);
        } else {
          ordered.push({ type: 'solo', people: [p] });
          used.add(p.id);
        }
      });
    }

    units[gen] = ordered;
  });


  // ── 3. Positionnement : séquentiel gauche à droite, sans superposition
  const MARGIN = 60;
  const cardPositions = {};

  function setUnitX(u, x) {
    if (u.type === 'couple') {
      cardPositions[u.people[0].id] = { x, y: u.y, cx: x + vHalf };
      const x2 = x + cW + cCoupleGap;
      cardPositions[u.people[1].id] = { x: x2, y: u.y, cx: x2 + vHalf };
      u.midX = x + cW/2 + cCoupleGap/2 + vHalf;
    } else {
      cardPositions[u.people[0].id] = { x, y: u.y, cx: x + vHalf };
      u.midX = x + vHalf;
    }
  }

  sortedGens.forEach((gen, gi) => {
    const y = 50 + gi * (cH + cGapY);
    let cx = MARGIN;
    (units[gen] || []).forEach(u => {
      u.y = y;
      setUnitX(u, cx);
      cx += unitWidth(u) + cGapX;
    });
  });

  // ── 4+5. Passes itératives (max 5 fois) jusqu'à convergence
  function passFratries(topDown = false) {
    const indices = Array.from({length: sortedGens.length - 1}, (_, i) => topDown ? i + 1 : sortedGens.length - 1 - i);
    for (const gi of indices) {
      const us       = units[sortedGens[gi]] || [];
      const parentUs = units[sortedGens[gi - 1]] || [];
      const done     = new Set();

      for (let i = 0; i < us.length; i++) {
        const u = us[i];
        const parentU = parentUs.find(pu =>
          pu.people.some(par =>
            u.people.some(child =>
              parentLinks.some(l => l.personne_a == par.id && l.personne_b == child.id)
            )
          )
        );
        if (!parentU) continue;
        const key = parentU.people.map(p => p.id).join('-');
        if (done.has(key)) continue;
        done.add(key);

        const fratrie = us.filter(cu =>
          cu.people.some(child =>
            parentU.people.some(par =>
              parentLinks.some(l => l.personne_a == par.id && l.personne_b == child.id)
            )
          )
        );

        const fratrieLeft  = Math.min(...fratrie.map(cu => cu.midX - unitWidth(cu) / 2));
        const fratrieRight = Math.max(...fratrie.map(cu => cu.midX + unitWidth(cu) / 2));
        const delta = parentU.midX - (fratrieLeft + fratrieRight) / 2;
        if (delta <= 0) continue;

        fratrie.forEach(cu => setUnitX(cu, cu.midX - unitWidth(cu) / 2 + delta));

        const afterIdx = Math.max(...fratrie.map(cu => us.indexOf(cu))) + 1;
        for (let j = afterIdx; j < us.length; j++) {
          const needed = us[j - 1].midX + unitWidth(us[j - 1]) / 2 + cGapX;
          if (us[j].midX - unitWidth(us[j]) / 2 < needed) setUnitX(us[j], needed);
          else break;
        }
      }
    }
  }

  for (let iter = 0; iter < 5; iter++) {
    let moved = false;

    // Passe 4 : aligner chaque unité sur le centre de ses enfants (jamais à gauche)
    for (let gi = sortedGens.length - 2; gi >= 0; gi--) {
      const childUs = units[sortedGens[gi + 1]] || [];
      const us      = units[sortedGens[gi]] || [];

      for (let i = 0; i < us.length; i++) {
        const u = us[i];
        const myChildUs = childUs.filter(cu =>
          cu.people.some(child =>
            u.people.some(parent =>
              parentLinks.some(l => l.personne_a == parent.id && l.personne_b == child.id)
            )
          )
        );
        if (!myChildUs.length) continue;

        const childCenter = (
          Math.min(...myChildUs.map(cu => cu.midX - unitWidth(cu) / 2)) +
          Math.max(...myChildUs.map(cu => cu.midX + unitWidth(cu) / 2))
        ) / 2;

        const targetX = childCenter - unitWidth(u) / 2;
        if (targetX <= u.midX - unitWidth(u) / 2) continue;

        setUnitX(u, targetX);
        moved = true;

        for (let j = i + 1; j < us.length; j++) {
          const minX = us[j - 1].midX + unitWidth(us[j - 1]) / 2 + cGapX;
          if (us[j].midX - unitWidth(us[j]) / 2 < minX) { setUnitX(us[j], minX); moved = true; }
          else break;
        }
      }
    }

    // Passe 5 : aligner chaque fratrie sur le milieu de ses parents (jamais à gauche)
    passFratries();

    if (!moved) break;
  }

  const totalHeight = sortedGens.length * (cH + cGapY) + 80;
  let maxRight = 0;
  treePeople.forEach(p => {
    if (cardPositions[p.id]) maxRight = Math.max(maxRight, cardPositions[p.id].x + cW);
  });

  // Centre horizontal de la génération racine
  const rootUnits = units[sortedGens[0]] || [];
  const rootLeft  = Math.min(...rootUnits.map(u => u.midX - unitWidth(u) / 2));
  const rootRight = Math.max(...rootUnits.map(u => u.midX + unitWidth(u) / 2));
  const rootCenterX = (rootLeft + rootRight) / 2;
  const totalWidth = maxRight + MARGIN;


  // ── 4. Construire le SVG
  let svg = `<svg id="tree-svg" width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}" xmlns="http://www.w3.org/2000/svg">`;

  const lineColor   = 'rgba(100,140,160,0.6)';
  const coupleColor = 'rgba(180,140,90,0.9)';

  const allUnitsFlat = Object.values(units).flat();

  // ── 4a. Connecteurs parents → enfants
  // Grouper les enfants par unité parente pour dessiner une barre commune
  const familyGroups = new Map();
  parentLinks.forEach(l => {
    const childPos   = cardPositions[l.personne_b];
    const parentUnit = allUnitsFlat.find(u => u.people.some(p => p.id == l.personne_a));
    if (!childPos || !parentUnit) return;
    const key = parentUnit.people.map(p=>p.id).sort().join('-');
    if (!familyGroups.has(key)) {
      familyGroups.set(key, { srcX: parentUnit.midX, srcY: parentUnit.y + cH, children:[] });
    }
    // Éviter les doublons (deux parents du même couple pointent vers le même enfant)
    const fg = familyGroups.get(key);
    if (!fg.children.find(c => c.cx === childPos.cx)) {
      fg.children.push({ cx: childPos.cx, y: childPos.y });
    }
  });

  familyGroups.forEach(({ srcX, srcY, children }) => {
    if (!children.length) return;
    // Trier les enfants de gauche à droite
    children.sort((a,b) => a.cx - b.cx);
    const midY = srcY + cGapY * 0.73;

    if (children.length === 1) {
      const cx = children[0].cx;
      svg += `<path d="M${r(srcX)},${r(srcY)} V${r(midY)} H${r(cx)} V${r(children[0].y)}" fill="none" stroke="${lineColor}" stroke-width="1.5"/>`;
    } else {
      const minX = children[0].cx;
      const maxX = children[children.length-1].cx;
      // Ligne verticale depuis le couple
      svg += `<line x1="${r(srcX)}" y1="${r(srcY)}" x2="${r(srcX)}" y2="${r(midY)}" stroke="${lineColor}" stroke-width="1.5"/>`;
      // Barre horizontale du premier au dernier enfant
      svg += `<line x1="${r(minX)}" y1="${r(midY)}" x2="${r(maxX)}" y2="${r(midY)}" stroke="${lineColor}" stroke-width="1.5"/>`;
      // Branches verticales vers chaque enfant
      children.forEach(c => {
        svg += `<line x1="${r(c.cx)}" y1="${r(midY)}" x2="${r(c.cx)}" y2="${r(c.y)}" stroke="${lineColor}" stroke-width="1.5"/>`;
      });
    }
  });

  // ── 4b. Traits des couples
  sortedGens.forEach(gen => {
    (units[gen]||[]).forEach(u => {
      if (u.type !== 'couple') return;
      const x1 = cardPositions[u.people[0].id].x + vHalf * 2;
      const x2 = cardPositions[u.people[1].id].x;
      const avatarCenter = 3 + 18;
      const y  = u.y + avatarCenter;
      svg += `<line x1="${r(x1)}" y1="${r(y)}" x2="${r(x2)}" y2="${r(y)}" stroke="${coupleColor}" stroke-width="1.5"/>`;
      svg += `<text x="${r((x1+x2)/2)}" y="${r(y+4)}" text-anchor="middle" font-size="10" fill="${coupleColor}" font-family="serif">♥</text>`;
    });
  });

  // ── 4c. Étiquettes de génération
  sortedGens.forEach((gen, gi) => {
    const y = 50 + gi*(cH+cGapY) + cH/2;
    svg += `<text x="14" y="${r(y)}" text-anchor="middle" dominant-baseline="middle"
      font-size="8.5" fill="rgba(154,148,140,0.55)" font-family="'DM Sans',sans-serif"
      transform="rotate(-90,14,${r(y)})">${genLabel(gen).toUpperCase()}</text>`;
  });

  // ── 4d. Cartes personnes
  treePeople.forEach(p => {
    const pos = cardPositions[p.id];
    if (!pos) return;
    const dec  = (p.deces||!p.vivant) ? ' deceased':'';
    const yr   = p.naissance ? p.naissance.substring(0,4) : '';
    const yrD  = p.deces ? p.deces.substring(0,4) : '';
    const neLabel = p.genre==='female' ? T('ne_f') : T('ne_m');
    const dates = yrD ? `${yr||'?'}–${yrD}` : yr ? `${neLabel} ${yr}` : `${neLabel} ?`;
    const av = p.chemin_thumb
      ? `<div class="p-avatar ${p.genre}"><img src="${imgUrl(p.chemin_thumb)}" alt=""></div>`
      : `<div class="p-avatar ${p.genre}">${initials(p)}</div>`;
    const maidenLabel = p.genre==='female' ? T('nee_label') : T('ne_label');
    const maiden = p.nom_naiss ? `<div class="p-maiden">${maidenLabel} ${p.nom_naiss}</div>` : '';

    const compactYear = yrD ? `${yr||'?'}–${yrD}` : (yr||'?');
    const cardInner = `${av}<div class="p-name" style="font-size:.6rem;">${p.prenom}</div><div class="p-year">${compactYear}</div>`;
    svg += `<foreignObject x="${r(pos.x)}" y="${r(pos.y)}" width="${cW}" height="${cH}" overflow="visible">
      <div xmlns="http://www.w3.org/1999/xhtml">
        <div class="p-card p-card-compact ${p.genre}${dec}" onclick="openPerson(${p.id})">${cardInner}
        </div>
      </div>
    </foreignObject>`;
  });

  svg += '</svg>';
  container.innerHTML = svg;
  const wrap = document.getElementById('view-tree').querySelector('.tree-wrap');
  enableDrag(wrap);
  enablePinchZoom(wrap);
  wrap.scrollLeft = rootCenterX - wrap.clientWidth / 2;
}

let _pinchAbort = null;

function enablePinchZoom(wrap) {
  if (_pinchAbort) _pinchAbort.abort();
  _pinchAbort = new AbortController();
  const { signal } = _pinchAbort;

  const svg = wrap.querySelector('#tree-svg');
  if (!svg) return;

  const baseW = parseFloat(svg.getAttribute('width'));
  const baseH = parseFloat(svg.getAttribute('height'));
  let currentScale = 1;
  let lastDist = null;

  function pinchDist(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  wrap.addEventListener('touchstart', e => {
    if (e.touches.length === 2) lastDist = pinchDist(e.touches);
  }, { passive: true, signal });

  wrap.addEventListener('touchmove', e => {
    if (e.touches.length !== 2 || !lastDist) return;
    e.preventDefault();

    const newDist = pinchDist(e.touches);
    const ratio   = newDist / lastDist;
    lastDist = newDist;

    const newScale = Math.min(Math.max(currentScale * ratio, 0.3), 4);
    const factor   = newScale / currentScale;
    currentScale   = newScale;

    const rect   = wrap.getBoundingClientRect();
    const midX   = (e.touches[0].clientX + e.touches[1].clientX) / 2;
    const midY   = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    const focusX = midX - rect.left + wrap.scrollLeft;
    const focusY = midY - rect.top  + wrap.scrollTop;

    svg.setAttribute('width',  baseW * currentScale);
    svg.setAttribute('height', baseH * currentScale);

    wrap.scrollLeft = focusX * factor - (midX - rect.left);
    wrap.scrollTop  = focusY * factor - (midY - rect.top);
  }, { passive: false, signal });

  wrap.addEventListener('touchend', e => {
    if (e.touches.length < 2) lastDist = null;
  }, { passive: true, signal });
}

function r(n) { return Math.round(n*10)/10; }


function enableDrag(el) {
  let startX, startY, scrollLeft, scrollTop, dragging = false;
  el.addEventListener('mousedown', e => {
    if (e.target.closest('.p-card')) return;
    dragging = true;
    startX = e.pageX - el.offsetLeft;
    startY = e.pageY - el.offsetTop;
    scrollLeft = el.scrollLeft;
    scrollTop  = el.scrollTop;
  });
  el.addEventListener('mouseleave', () => dragging = false);
  el.addEventListener('mouseup',   () => dragging = false);
  el.addEventListener('mousemove', e => {
    if (!dragging) return;
    e.preventDefault();
    el.scrollLeft = scrollLeft - (e.pageX - el.offsetLeft - startX);
    el.scrollTop  = scrollTop  - (e.pageY - el.offsetTop  - startY);
  });
}

