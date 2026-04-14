// ══════════════════════════════════════════════════════════════
//  TRADUCTION AUTOMATIQUE
// ══════════════════════════════════════════════════════════════
let autoTranslate = localStorage.getItem('autoTranslate') !== '0';

// Cache persisté dans localStorage
const _CACHE_KEY = 'genealogie_translate_cache';
let _translateCache = {};
try { _translateCache = JSON.parse(localStorage.getItem(_CACHE_KEY) || '{}'); } catch { _translateCache = {}; }
function _saveTrCache() { try { localStorage.setItem(_CACHE_KEY, JSON.stringify(_translateCache)); } catch {} }

function setAutoTranslate(val) {
  autoTranslate = val;
  localStorage.setItem('autoTranslate', val ? '1' : '0');
  // Vider le cache pour forcer une nouvelle traduction
  _translateCache = {};
  localStorage.removeItem(_CACHE_KEY);
  // Recharger la vue active
  const active = document.querySelector('.view.active')?.id?.replace('view-', '');
  if (active) showView(active);
}

// Traduit un texte vers currentLang, avec cache
// Retourne une Promise<string>
async function translateText(text) {
  if (!autoTranslate || !text) return text;
  const key = text + '|' + currentLang;
  if (_translateCache[key]) return _translateCache[key];
  try {
    const d = await api('POST', 'api/translate.php', { text, target: currentLang });
    _translateCache[key] = d.translation.trim().replace(/\n{2,}/g, '\n');
    _saveTrCache();
    return _translateCache[key];
  } catch {
    return text; // en cas d'erreur, afficher l'original
  }
}

// Traduit plusieurs champs d'un objet et retourne un nouvel objet avec les champs traduits
// fields: tableau de noms de champs à traduire
async function translateFields(obj, fields) {
  if (!autoTranslate) return obj;
  const result = { ...obj };
  await Promise.all(fields.map(async f => {
    if (obj[f]) result[f] = await translateText(obj[f]);
  }));
  return result;
}

// Initialiser la case à cocher au chargement
function initAutoTranslate() {
  const cb = document.getElementById('auto-translate-cb');
  if (cb) cb.checked = autoTranslate;
}
