import { describe, it, expect } from 'vitest';
import { fmtDate, fullName, initials, encodeHTML, calcAge, isDeceased, sortByBirth } from '../../js/utils.js';

describe('fmtDate', () => {
  it('formate une date ISO complète en JJ/MM/AAAA', () => {
    expect(fmtDate('1985-03-22')).toBe('22/03/1985');
  });
  it('retourne null si vide ou null', () => {
    expect(fmtDate(null)).toBeNull();
    expect(fmtDate('')).toBeNull();
    expect(fmtDate(undefined)).toBeNull();
  });
  it('retourne la valeur brute si année seule', () => {
    expect(fmtDate('1985')).toBe('1985');
  });
  it('retourne la valeur brute si AAAA-MM (sans jour)', () => {
    expect(fmtDate('1985-03')).toBe('1985-03');
  });
});

describe('fullName', () => {
  it('concatène prénom et nom', () => {
    expect(fullName({ prenom: 'Marie', nom: 'Dupont' })).toBe('Marie Dupont');
  });
  it('gère prénom vide', () => {
    expect(fullName({ prenom: '', nom: 'Dupont' })).toBe(' Dupont');
  });
  it('gère nom vide', () => {
    expect(fullName({ prenom: 'Marie', nom: '' })).toBe('Marie ');
  });
});

describe('initials', () => {
  it('retourne les initiales', () => {
    expect(initials({ prenom: 'Marie', nom: 'Dupont' })).toBe('MD');
  });
  it('gère prénom vide', () => {
    expect(initials({ prenom: '', nom: 'Dupont' })).toBe('D');
  });
  it('gère nom vide', () => {
    expect(initials({ prenom: 'Marie', nom: '' })).toBe('M');
  });
  it('gère prénom null', () => {
    expect(initials({ prenom: null, nom: 'Dupont' })).toBe('D');
  });
  it('gère nom null', () => {
    expect(initials({ prenom: 'Marie', nom: null })).toBe('M');
  });
  it('retourne vide si les deux sont null', () => {
    expect(initials({ prenom: null, nom: null })).toBe('');
  });
});

describe('encodeHTML', () => {
  it('échappe les caractères HTML', () => {
    expect(encodeHTML('<script>"&"</script>')).toBe('&lt;script&gt;&quot;&amp;&quot;&lt;/script&gt;');
  });
  it('ne modifie pas un texte sans caractères spéciaux', () => {
    expect(encodeHTML('Bonjour')).toBe('Bonjour');
  });
  it('convertit null en chaîne "null"', () => {
    expect(encodeHTML(null)).toBe('null');
  });
  it('convertit un nombre en chaîne', () => {
    expect(encodeHTML(42)).toBe('42');
  });
  it('chaîne vide reste vide', () => {
    expect(encodeHTML('')).toBe('');
  });
});

describe('calcAge', () => {
  it('calcule l\'âge entre naissance et décès', () => {
    expect(calcAge({ naissance: '1920-01-01', deces: '2000-01-01' })).toBe(80);
  });
  it('calcule l\'âge à une date non-anniversaire', () => {
    expect(calcAge({ naissance: '1920-07-01', deces: '2000-01-01' })).toBe(79);
  });
  it('retourne null si pas de date de naissance', () => {
    expect(calcAge({ naissance: null })).toBeNull();
    expect(calcAge({ naissance: '' })).toBeNull();
  });
  // Note: calcAge sans décès utilise new Date() — ne pas tester de valeur fixe
  it('retourne un nombre pour une personne vivante sans décès', () => {
    const age = calcAge({ naissance: '1950-01-01', deces: null });
    expect(typeof age).toBe('number');
    expect(age).toBeGreaterThan(0);
  });
});

describe('isDeceased', () => {
  it('retourne true si deces est renseigné', () => {
    expect(isDeceased({ deces: '2000-01-01', vivant: null })).toBe(true);
  });
  it('retourne true si vivant === 0 (number)', () => {
    expect(isDeceased({ deces: null, vivant: 0 })).toBe(true);
  });
  it('retourne true si vivant === "0" (string)', () => {
    expect(isDeceased({ deces: null, vivant: '0' })).toBe(true);
  });
  it('retourne false si deces est une chaîne vide', () => {
    expect(isDeceased({ deces: '', vivant: null })).toBe(false);
  });
  it('retourne false si vivant est null sans décès', () => {
    expect(isDeceased({ deces: null, vivant: null })).toBe(false);
  });
  it('retourne false si vivant === 1', () => {
    expect(isDeceased({ deces: null, vivant: 1 })).toBe(false);
    expect(isDeceased({ deces: null, vivant: '1' })).toBe(false);
  });
});

describe('sortByBirth', () => {
  it('trie par date de naissance croissante', () => {
    const people = [
      { id: 1, naissance: '1960-05-01' },
      { id: 2, naissance: '1945-03-10' },
      { id: 3, naissance: '1970-11-20' },
    ];
    expect(sortByBirth(people).map(p => p.id)).toEqual([2, 1, 3]);
  });
  it('place les personnes sans date en premier (chaîne vide < toute date)', () => {
    const people = [
      { id: 1, naissance: '1960-01-01' },
      { id: 2, naissance: null },
      { id: 3, naissance: '1950-01-01' },
    ];
    expect(sortByBirth(people).map(p => p.id)).toEqual([2, 3, 1]);
  });
  it('utilise l\'id comme critère secondaire à date égale', () => {
    const people = [
      { id: 3, naissance: '1960-01-01' },
      { id: 1, naissance: '1960-01-01' },
      { id: 2, naissance: '1960-01-01' },
    ];
    expect(sortByBirth(people).map(p => p.id)).toEqual([1, 2, 3]);
  });
  it('ne mute pas le tableau original', () => {
    const people = [{ id: 1, naissance: '1960-01-01' }, { id: 2, naissance: '1950-01-01' }];
    sortByBirth(people);
    expect(people[0].id).toBe(1);
  });
  it('gère un tableau vide', () => {
    expect(sortByBirth([])).toEqual([]);
  });
});
