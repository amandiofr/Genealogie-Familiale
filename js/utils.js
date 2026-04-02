// ══════════════════════════════════════════════════════════════
//  Pure utility functions — also exported for testing
// ══════════════════════════════════════════════════════════════

export function fmtDate(d) {
  if (!d) return null;
  const p = d.split('-');
  return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : d;
}

export function fullName(p) { return p.prenom + ' ' + p.nom; }

export function initials(p) { return ((p.prenom || '')[0] || '') + ((p.nom || '')[0] || ''); }

export function encodeHTML(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function calcAge(p) {
  if (!p.naissance) return null;
  const b = new Date(p.naissance);
  const e = p.deces ? new Date(p.deces) : new Date();
  return Math.floor((e - b) / 31557600000);
}

export function isDeceased(p) {
  return !!(p.deces || p.vivant === 0 || p.vivant === '0');
}

export function sortByBirth(people) {
  return [...people].sort((a, b) =>
    (a.naissance || '') < (b.naissance || '') ? -1
    : (a.naissance || '') > (b.naissance || '') ? 1
    : a.id - b.id
  );
}
