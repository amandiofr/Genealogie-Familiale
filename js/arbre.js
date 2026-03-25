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
  // Charger tous les liens en une fois
  let allLiens = [];
  try {
    // On charge la fiche de chaque personne pour avoir ses liens — trop lent.
    // À la place, on fait un appel dédié si disponible, sinon on utilise
    // les données déjà en mémoire depuis les fiches ouvertes.
    // Pour l'arbre, on reconstruit les liens depuis une API légère.
    const r = await fetch('api/liens.php');
    if (r.ok) allLiens = await r.json();
  } catch {}

  drawTree(allLiens);
}

function drawTree(allLiens) {
  const container = document.getElementById('tree-container');
  const conjointLinks = allLiens.filter(l => l.type === 'conjoint');
  const parentLinks   = allLiens.filter(l => l.type === 'parent_enfant');

  // ── 1. Grouper par génération
  const gens = {};
  people.forEach(p => { (gens[p.generation]??=[]).push(p); });
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
    return u.type === 'couple' ? CARD_W * 2 + COUPLE_GAP : CARD_W;
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

  // ── LOG automatique dans la console (F12) ──────────────────────────────────
  console.group('🌿 Arbre généalogique — diagnostic');
  sortedGens.forEach(gen => {
    console.group('Génération ' + gen + ' (' + (units[gen]||[]).length + ' unités)');
    (units[gen]||[]).forEach((u, i) => {
      const names = u.people.map(p => p.prenom + ' ' + p.nom + ' [id=' + p.id + ']').join(' + ');
      const parentIds = new Set();
      u.people.forEach(p => {
        parentLinks.filter(l => l.personne_b == p.id).forEach(l => parentIds.add(l.personne_a));
      });
      const parentStr = parentIds.size ? '← parents ids: ' + [...parentIds].join(',') : '← sans parent connu';
      console.log('[' + i + '] ' + u.type + ' | ' + names + ' | ' + parentStr);
    });
    // Détecter les fratries non contiguës
    const seen = new Map();
    let genOk = true;
    (units[gen]||[]).forEach((u, i) => {
      const pIds = new Set();
      u.people.forEach(p => parentLinks.filter(l=>l.personne_b==p.id).forEach(l=>pIds.add(l.personne_a)));
      if (pIds.size === 0) return;
      const key = [...pIds].sort().join('-');
      if (!seen.has(key)) { seen.set(key, {first:i, last:i}); }
      else {
        const s = seen.get(key);
        if (i !== s.last + 1) {
          console.warn('❌ Fratrie mélangée: parents[' + key + '] positions ' + s.first + '..' + s.last + ' puis ' + i);
          genOk = false;
        }
        s.last = i;
      }
    });
    if (genOk) console.log('✅ Fratries contiguës');
    console.groupEnd();
  });
  console.groupEnd();
  // ────────────────────────────────────────────────────────────────────────────

  // ── 3. Positionnement : séquentiel gauche à droite, sans superposition
  const MARGIN = 60;
  const cardPositions = {};

  function setUnitX(u, x) {
    if (u.type === 'couple') {
      cardPositions[u.people[0].id] = { x, y: u.y, cx: x + CARD_W/2 };
      const x2 = x + CARD_W + COUPLE_GAP;
      cardPositions[u.people[1].id] = { x: x2, y: u.y, cx: x2 + CARD_W/2 };
      u.midX = x + CARD_W + COUPLE_GAP/2;
    } else {
      cardPositions[u.people[0].id] = { x, y: u.y, cx: x + CARD_W/2 };
      u.midX = x + CARD_W/2;
    }
  }

  sortedGens.forEach((gen, gi) => {
    const y = 50 + gi * (CARD_H + GAP_Y);
    let cx = MARGIN;
    (units[gen] || []).forEach(u => {
      u.y = y;
      setUnitX(u, cx);
      cx += unitWidth(u) + GAP_X;
    });
  });

  // ── 4. Passe bottom-up : décaler chaque unité vers la droite pour s'aligner
  //       sur le centre de ses enfants. Pousser les suivants si nécessaire.
  //       Jamais vers la gauche.
  for (let gi = sortedGens.length - 2; gi >= 0; gi--) {
    const gen     = sortedGens[gi];
    const childUs = units[sortedGens[gi + 1]] || [];
    const us      = units[gen] || [];

    for (let i = 0; i < us.length; i++) {
      const u = us[i];

      // Centre des enfants de cette unité
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
      if (targetX <= u.midX - unitWidth(u) / 2) continue; // jamais à gauche

      setUnitX(u, targetX);

      // Pousser les suivants vers la droite si chevauchement
      for (let j = i + 1; j < us.length; j++) {
        const minX = us[j - 1].midX + unitWidth(us[j - 1]) / 2 + GAP_X;
        if (us[j].midX - unitWidth(us[j]) / 2 < minX) {
          setUnitX(us[j], minX);
        } else break;
      }
    }
  }

  // ── 5. Passe du bas vers le haut : aligner chaque fratrie sur le milieu de ses parents.
  //       Pousser les suivants si nécessaire. Jamais vers la gauche.
  for (let gi = sortedGens.length - 1; gi >= 1; gi--) {
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

      // Pousser les suivants si chevauchement
      const afterIdx = Math.max(...fratrie.map(cu => us.indexOf(cu))) + 1;
      for (let j = afterIdx; j < us.length; j++) {
        const needed = us[j - 1].midX + unitWidth(us[j - 1]) / 2 + GAP_X;
        if (us[j].midX - unitWidth(us[j]) / 2 < needed) setUnitX(us[j], needed);
        else break;
      }
    }
  }

  const totalHeight = sortedGens.length * (CARD_H + GAP_Y) + 80;
  let maxRight = 0;
  people.forEach(p => {
    if (cardPositions[p.id]) maxRight = Math.max(maxRight, cardPositions[p.id].x + CARD_W);
  });
  const totalWidth = maxRight + MARGIN;


  // ── 4. Construire le SVG
  let svg = `<svg id="tree-svg" width="${totalWidth}" height="${totalHeight}" xmlns="http://www.w3.org/2000/svg">`;

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
      familyGroups.set(key, { srcX: parentUnit.midX, srcY: parentUnit.y + CARD_H, children:[] });
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
    const midY = srcY + GAP_Y * 0.42;

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
      const x1 = cardPositions[u.people[0].id].cx + CARD_W/2;
      const x2 = cardPositions[u.people[1].id].cx - CARD_W/2;
      const y  = u.y + CARD_H/2;
      svg += `<line x1="${r(x1)}" y1="${r(y)}" x2="${r(x2)}" y2="${r(y)}" stroke="${coupleColor}" stroke-width="1.5"/>`;
      svg += `<text x="${r((x1+x2)/2)}" y="${r(y+4)}" text-anchor="middle" font-size="10" fill="${coupleColor}" font-family="serif">♥</text>`;
    });
  });

  // ── 4c. Étiquettes de génération
  sortedGens.forEach((gen, gi) => {
    const y = 50 + gi*(CARD_H+GAP_Y) + CARD_H/2;
    svg += `<text x="14" y="${r(y)}" text-anchor="middle" dominant-baseline="middle"
      font-size="8.5" fill="rgba(154,148,140,0.55)" font-family="'DM Sans',sans-serif"
      transform="rotate(-90,14,${r(y)})">${genLabel(gen).toUpperCase()}</text>`;
  });

  // ── 4d. Cartes personnes
  people.forEach(p => {
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

    svg += `<foreignObject x="${r(pos.x)}" y="${r(pos.y)}" width="${CARD_W}" height="${CARD_H}" overflow="visible">
      <div xmlns="http://www.w3.org/1999/xhtml">
        <div class="p-card ${p.genre}${dec}" onclick="openPerson(${p.id})">${av}
          <div class="p-name">${p.prenom}<br>${p.nom}</div>${maiden}
          <div class="p-dates">${dates}</div>
        </div>
      </div>
    </foreignObject>`;
  });

  svg += '</svg>';
  container.innerHTML = svg;
  enableDrag(document.getElementById('view-tree').querySelector('.tree-wrap'));
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

