// ══════════════════════════════════════════════════════════════
//  CARTE — localisation des membres dans le temps
// ══════════════════════════════════════════════════════════════

let _carteMap        = null;
let _carteLieuxNorm  = {};
let _carteZIndex     = 1;
let _carteMarkers    = {};  // personId → { marker, pin, lat, lng }
let _carteInfoWindow = null;
let _cartePersons    = [];
let _carteLieux      = {};
let _carteYear       = null;
let _carteYearMin    = 1800;
let _carteYearMax    = new Date().getFullYear();
let _cartePlaying    = false;
let _cartePlayTimer  = null;
let _carteAnimFrames = {}; // personId → rAF id

async function loadCarte() {
  const container = document.getElementById('carte-map');
  if (!container) return;

  // Charger Google Maps si besoin
  if (!window.google?.maps) {
    try {
      const r = await api('GET', 'api/maps_key.php');
      if (!r.key) { container.innerHTML = `<div class="empty"><div class="empty-icon">🗺️</div><div class="empty-title">${T('carte_no_key')}</div></div>`; return; }
      await _loadGoogleMaps(r.key);
    } catch { container.innerHTML = `<div class="empty"><div class="empty-icon">🗺️</div><div class="empty-title">${T('carte_no_key')}</div></div>`; return; }
  }

  // Initialiser la carte une seule fois
  if (!_carteMap) {
    container.style.visibility = 'hidden';
    const { Map } = await google.maps.importLibrary('maps');
    _carteMap = new Map(container, {
      center: { lat: 46.5, lng: 2.3 },
      zoom: 5,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      mapId: 'DEMO_MAP_ID',
    });
    _carteInfoWindow = new google.maps.InfoWindow();
  }

  // Charger données
  const [persons, events, lieux] = await Promise.all([
    api('GET', 'api/personnes.php'),
    api('GET', 'api/evenements.php'),
    api('GET', 'api/lieux.php'),
  ]);

  // Index lieux géocodés — double index : exact + normalisé (sans accents, lowercase)
  _carteLieux = {};
  _carteLieuxNorm = {};
  const _norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  lieux.forEach(l => {
    _carteLieux[l.nom_approx] = l;
    _carteLieuxNorm[_norm(l.nom_approx)] = l;
  });

  // Index déménagements par personne_id
  const demenagements = events.filter(e => e.type === 'demenagement' && e.lieu && e.date_debut);
  const demParPersonne = {};
  demenagements.forEach(e => {
    const annee = parseInt(e.date_debut);
    (e.personne_ids || []).forEach(pid => {
      if (!demParPersonne[pid]) demParPersonne[pid] = [];
      demParPersonne[pid].push({ annee, lieu: e.lieu });
    });
  });
  Object.values(demParPersonne).forEach(arr => arr.sort((a, b) => a.annee - b.annee));

  // Index année de mariage par personne_id (premier lien conjoint/fiancailles avec date)
  const marriageYear = {};
  for (const l of _allLiens) {
    if ((l.type === 'conjoint' || l.type === 'fiancailles') && l.date_debut) {
      const yr = parseInt(l.date_debut);
      if (isNaN(yr)) continue;
      const a = Number(l.personne_a), b = Number(l.personne_b);
      if (!marriageYear[a]) marriageYear[a] = yr;
      if (!marriageYear[b]) marriageYear[b] = yr;
    }
  }

  // Construire les données de timeline par personne
  // Membres directs → depuis la naissance ; conjoints → depuis le mariage
  _cartePersons = persons
    .filter(p => inCurrentTree(p.id) && p.lieu_naiss && p.naissance)
    .map(p => {
      const naissAnnee = parseInt(p.naissance);
      const isDirect = inCurrentTreeDirect(p.id);
      if (!isDirect && !marriageYear[p.id]) return null;
      const showFrom = isDirect ? naissAnnee : marriageYear[p.id];
      return {
        id:           p.id,
        prenom:       p.prenom,
        nom:          p.nom,
        genre:        p.genre || 'autre',
        thumb:        p.chemin_thumb || null,
        naissAnnee:   showFrom,
        decesAnnee:   p.deces ? parseInt(p.deces) : null,
        lieuNaiss:    p.lieu_naiss,
        deplacements: (demParPersonne[p.id] || []).filter(d => d.annee >= naissAnnee),
      };
    })
    .filter(Boolean);

  // Plage d'années
  const annees = _cartePersons.map(p => p.naissAnnee).filter(Boolean);
  _carteYearMin = annees.length ? Math.min(...annees) : 1800;
  _carteYearMax = new Date().getFullYear();

  // Créer un marqueur par personne
  const { AdvancedMarkerElement } = await google.maps.importLibrary('marker');
  Object.values(_carteMarkers).forEach(m => { m.marker.map = null; });
  _carteMarkers = {};
  Object.values(_carteAnimFrames).forEach(id => cancelAnimationFrame(id));
  _carteAnimFrames = {};
  _carteZIndex = 1;

  _cartePersons.forEach(p => {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'width:0;height:0;position:relative;';
    const av = document.createElement('div');
    av.style.cssText = `position:absolute;width:30px;height:30px;border-radius:50%;border:2px solid #fff;overflow:hidden;cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;color:#fff;transform:translate(-50%,-50%);`;
    const colors = { male:'#5b7fa6', female:'#a67b8a', autre:'#7c5c3e' };
    av.style.background = colors[p.genre] || colors.autre;
    if (p.thumb) {
      const img = document.createElement('img');
      img.src = imgUrl(p.thumb);
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
      av.appendChild(img);
    } else {
      av.textContent = (p.prenom[0]||'') + (p.nom[0]||'');
    }
    wrapper.appendChild(av);
    const marker = new AdvancedMarkerElement({
      map: null,
      title: `${p.prenom} ${p.nom}`,
      content: wrapper,
      zIndex: 0,
    });
    marker.addListener('gmp-click', () => {
      const age = _carteYear - p.naissAnnee;
      const m = _carteMarkers[p.id];
      _carteInfoWindow.setContent(`<div style="font-family:'DM Sans',sans-serif;max-width:200px;">
        <div style="font-weight:600;">${p.prenom} ${p.nom}</div>
        <div style="color:#888;font-size:.85em;">${age} ans · ${m?._currentLieu||''}</div>
      </div>`);
      _carteInfoWindow.open(_carteMap, marker);
    });
    _carteMarkers[p.id] = { marker, wrapper, av, lat: null, lng: null, _currentLieu: '' };
  });

  // Ajuster la vue pour englober toutes les positions historiques
  const allPositions = [];
  _cartePersons.forEach(p => {
    [p.lieuNaiss, ...p.deplacements.map(d => d.lieu)].forEach(lieu => {
      const geo = _geoForLieu(lieu);
      if (geo?.lat != null) allPositions.push({ lat: parseFloat(geo.lat), lng: parseFloat(geo.lng) });
    });
  });
  // Slider
  _carteYear = _carteYearMin;
  const slider = document.getElementById('carte-slider');
  if (slider) { slider.min = _carteYearMin; slider.max = _carteYearMax; slider.value = _carteYear; }
  _updateCarteYearLabel();

  // Positionner la carte AVANT d'afficher les marqueurs
  if (allPositions.length) {
    const bounds = new google.maps.LatLngBounds();
    allPositions.forEach(pos => bounds.extend(pos));
    await new Promise(resolve => {
      google.maps.event.addListenerOnce(_carteMap, 'idle', resolve);
      _carteMap.fitBounds(bounds, 60);
    });
  }

  container.style.visibility = 'visible';
  _renderCarteYear(_carteYear);
}

function _loadGoogleMaps(key) {
  return new Promise((resolve, reject) => {
    if (window.google?.maps) { resolve(); return; }
    window._gmapsCallback = resolve;
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&callback=_gmapsCallback&loading=async`;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

function _geoForLieu(lieu) {
  if (!lieu) return null;
  const direct = _carteLieux[lieu];
  if (direct?.lat != null) return direct;
  const norm = lieu.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  return _carteLieuxNorm[norm] || null;
}

function _locForPersonAtYear(p, year) {
  if (year < p.naissAnnee) return null;
  let lieu = p.lieuNaiss;
  for (const dep of p.deplacements) {
    if (dep.annee <= year) lieu = dep.lieu;
    else break;
  }
  return lieu;
}

function _renderCarteYear(year) {
  if (!_carteMap) return;

  // Calculer la position cible de chaque personne
  const targets = {}; // personId → {lat, lng, geo, lieu}
  _cartePersons.forEach(p => {
    const lieu = _locForPersonAtYear(p, year);
    const geo  = lieu ? _geoForLieu(lieu) : null;
    if (geo?.lat != null) targets[p.id] = { lat: parseFloat(geo.lat), lng: parseFloat(geo.lng), geo, lieu };
  });

  let visible = 0;
  _cartePersons.forEach(p => {
    const m = _carteMarkers[p.id];
    if (!m) return;
    const t = targets[p.id];

    if (!t) {
      m.marker.map = null;
      m.lat = null; m.lng = null;
      return;
    }

    const toLat = t.lat;
    const toLng = t.lng;
    m._currentLieu = t.geo.nom_normalise || t.lieu;
    visible++;

    if (m.lat === null) {
      m.marker.position = { lat: toLat, lng: toLng };
      m.marker.zIndex = ++_carteZIndex;
      m.marker.map = _carteMap;
      m.lat = toLat; m.lng = toLng;
    } else if (m.lat !== toLat || m.lng !== toLng) {
      const fromLat = m.lat, fromLng = m.lng;
      m.lat = toLat; m.lng = toLng;
      m.marker.zIndex = ++_carteZIndex;
      m.marker.map = _carteMap;
      _animateMarker(p.id, fromLat, fromLng, toLat, toLng, 600);
    }
  });

  const lbl = document.getElementById('carte-count');
  if (lbl) lbl.textContent = `${visible} ${T('carte_persons_label')}`;
}

function _animateMarker(pid, fromLat, fromLng, toLat, toLng, duration) {
  if (_carteAnimFrames[pid]) cancelAnimationFrame(_carteAnimFrames[pid]);
  const start = performance.now();
  const m = _carteMarkers[pid];
  if (!m) return;
  // zIndex déjà incrémenté dans _renderCarteYear avant l'appel
  function step(now) {
    const t = Math.min((now - start) / duration, 1);
    // ease in-out cubic plus prononcé aux extrémités
    const ease = t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2;
    const lat = fromLat + (toLat - fromLat) * ease;
    const lng = fromLng + (toLng - fromLng) * ease;
    m.marker.position = { lat, lng };
    if (t < 1) {
      _carteAnimFrames[pid] = requestAnimationFrame(step);
    } else {
      delete _carteAnimFrames[pid];
    }
  }
  _carteAnimFrames[pid] = requestAnimationFrame(step);
}

function onCarteSlider(val) {
  _carteYear = parseInt(val);
  _updateCarteYearLabel();
  _renderCarteYear(_carteYear);
}

function _updateCarteYearLabel() {
  const el = document.getElementById('carte-year-label');
  if (el) el.textContent = _carteYear;
}

function toggleCartePlay() {
  if (!_cartePlaying && _carteYear >= _carteYearMax) {
    // Recommencer depuis le début
    Object.values(_carteAnimFrames).forEach(id => cancelAnimationFrame(id));
    _carteAnimFrames = {};
    Object.values(_carteMarkers).forEach(m => { m.marker.map = null; m.lat = null; m.lng = null; });
    _carteYear = _carteYearMin;
    const slider = document.getElementById('carte-slider');
    if (slider) slider.value = _carteYear;
    _updateCarteYearLabel();
    _renderCarteYear(_carteYear);
  }
  _cartePlaying = !_cartePlaying;
  const btn = document.getElementById('carte-play-btn');
  if (btn) btn.textContent = _cartePlaying ? '⏸' : '▶';
  if (_cartePlaying) _cartePlayStep();
  else clearTimeout(_cartePlayTimer);
}

function _cartePlayStep() {
  if (!_cartePlaying) return;
  if (_carteYear >= _carteYearMax) {
    _cartePlaying = false;
    const btn = document.getElementById('carte-play-btn');
    if (btn) btn.textContent = '▶';
    return;
  }
  _carteYear++;
  const slider = document.getElementById('carte-slider');
  if (slider) slider.value = _carteYear;
  _updateCarteYearLabel();
  _renderCarteYear(_carteYear);
  _cartePlayTimer = setTimeout(_cartePlayStep, 200);
}
