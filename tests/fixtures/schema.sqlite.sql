-- SQLite schema derived from install.php
-- MySQL-specific syntax removed (UNSIGNED, ENGINE, CHARSET, ENUM → TEXT, etc.)

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS utilisateurs (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  nom             TEXT NOT NULL,
  email           TEXT NOT NULL UNIQUE,
  password        TEXT NOT NULL,
  role            TEXT NOT NULL DEFAULT 'lecteur',
  autologin_token TEXT DEFAULT NULL,
  created_at      TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS personnes (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  prenom       TEXT NOT NULL,
  nom          TEXT NOT NULL,
  nom_naiss    TEXT DEFAULT NULL,
  genre        TEXT DEFAULT 'male',
  naissance    TEXT DEFAULT NULL,
  lieu_naiss   TEXT DEFAULT NULL,
  deces        TEXT DEFAULT NULL,
  lieu_deces   TEXT DEFAULT NULL,
  vivant       INTEGER NOT NULL DEFAULT 1,
  generation   INTEGER NOT NULL DEFAULT 0,
  arbre_ordre  INTEGER DEFAULT NULL,
  profession   TEXT DEFAULT NULL,
  biographie   TEXT DEFAULT NULL,
  photo_id     INTEGER DEFAULT NULL,
  created_at   TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at   TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS liens (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  personne_a INTEGER NOT NULL,
  personne_b INTEGER NOT NULL,
  type       TEXT NOT NULL,
  date_debut TEXT DEFAULT NULL,
  date_fin   TEXT DEFAULT NULL,
  notes      TEXT DEFAULT NULL,
  UNIQUE(personne_a, personne_b, type),
  FOREIGN KEY (personne_a) REFERENCES personnes(id) ON DELETE CASCADE,
  FOREIGN KEY (personne_b) REFERENCES personnes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS photos (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  personne_id  INTEGER DEFAULT NULL,
  chemin       TEXT NOT NULL,
  chemin_thumb TEXT DEFAULT NULL,
  legende      TEXT DEFAULT NULL,
  date_photo   TEXT DEFAULT NULL,
  ordre        INTEGER DEFAULT 0,
  created_at   TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (personne_id) REFERENCES personnes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS evenements (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  titre       TEXT NOT NULL,
  type        TEXT NOT NULL,
  date_debut  TEXT DEFAULT NULL,
  date_fin    TEXT DEFAULT NULL,
  lieu        TEXT DEFAULT NULL,
  description TEXT DEFAULT NULL,
  photo_id    INTEGER DEFAULT NULL,
  created_at  TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at  TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS evenement_personnes (
  evenement_id INTEGER NOT NULL,
  personne_id  INTEGER NOT NULL,
  role         TEXT DEFAULT NULL,
  PRIMARY KEY (evenement_id, personne_id),
  FOREIGN KEY (evenement_id) REFERENCES evenements(id) ON DELETE CASCADE,
  FOREIGN KEY (personne_id)  REFERENCES personnes(id)  ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS evenement_photos (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  evenement_id INTEGER NOT NULL,
  chemin       TEXT NOT NULL,
  chemin_thumb TEXT DEFAULT NULL,
  legende      TEXT DEFAULT NULL,
  ordre        INTEGER DEFAULT 0,
  FOREIGN KEY (evenement_id) REFERENCES evenements(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reunions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  titre       TEXT NOT NULL,
  type        TEXT DEFAULT NULL,
  date_debut  TEXT DEFAULT NULL,
  date_fin    TEXT DEFAULT NULL,
  lieu        TEXT DEFAULT NULL,
  description TEXT DEFAULT NULL,
  photo_id    INTEGER DEFAULT NULL,
  created_at  TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at  TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reunion_personnes (
  reunion_id  INTEGER NOT NULL,
  personne_id INTEGER NOT NULL,
  role        TEXT DEFAULT NULL,
  PRIMARY KEY (reunion_id, personne_id),
  FOREIGN KEY (reunion_id)  REFERENCES reunions(id)  ON DELETE CASCADE,
  FOREIGN KEY (personne_id) REFERENCES personnes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reunion_photos (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  reunion_id   INTEGER NOT NULL,
  chemin       TEXT NOT NULL,
  chemin_thumb TEXT DEFAULT NULL,
  legende      TEXT DEFAULT NULL,
  ordre        INTEGER DEFAULT 0,
  FOREIGN KEY (reunion_id) REFERENCES reunions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS anecdotes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  titre      TEXT NOT NULL,
  contenu    TEXT NOT NULL,
  date_anec  TEXT DEFAULT NULL,
  auteur     TEXT DEFAULT NULL,
  photo_id   INTEGER DEFAULT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS anecdote_personnes (
  anecdote_id INTEGER NOT NULL,
  personne_id INTEGER NOT NULL,
  PRIMARY KEY (anecdote_id, personne_id),
  FOREIGN KEY (anecdote_id) REFERENCES anecdotes(id) ON DELETE CASCADE,
  FOREIGN KEY (personne_id) REFERENCES personnes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS anecdote_photos (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  anecdote_id  INTEGER NOT NULL,
  chemin       TEXT NOT NULL,
  chemin_thumb TEXT DEFAULT NULL,
  legende      TEXT DEFAULT NULL,
  ordre        INTEGER DEFAULT 0,
  FOREIGN KEY (anecdote_id) REFERENCES anecdotes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS autos (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  marque      TEXT NOT NULL,
  modele      TEXT DEFAULT NULL,
  annee       INTEGER DEFAULT NULL,
  couleur     TEXT DEFAULT NULL,
  description TEXT DEFAULT NULL,
  personne_id INTEGER DEFAULT NULL,
  photo_id    INTEGER DEFAULT NULL,
  created_at  TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at  TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (personne_id) REFERENCES personnes(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS auto_photos (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  auto_id      INTEGER NOT NULL,
  chemin       TEXT NOT NULL,
  chemin_thumb TEXT DEFAULT NULL,
  legende      TEXT DEFAULT NULL,
  ordre        INTEGER DEFAULT 0,
  created_at   TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (auto_id) REFERENCES autos(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tresors (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  titre       TEXT NOT NULL,
  contenu     TEXT NOT NULL,
  date_tresor TEXT DEFAULT NULL,
  auteur      TEXT DEFAULT NULL,
  photo_id    INTEGER DEFAULT NULL,
  created_at  TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at  TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tresor_personnes (
  tresor_id   INTEGER NOT NULL,
  personne_id INTEGER NOT NULL,
  PRIMARY KEY (tresor_id, personne_id),
  FOREIGN KEY (tresor_id)   REFERENCES tresors(id)   ON DELETE CASCADE,
  FOREIGN KEY (personne_id) REFERENCES personnes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tresor_photos (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  tresor_id    INTEGER NOT NULL,
  chemin       TEXT NOT NULL,
  chemin_thumb TEXT DEFAULT NULL,
  legende      TEXT DEFAULT NULL,
  ordre        INTEGER DEFAULT 0,
  FOREIGN KEY (tresor_id) REFERENCES tresors(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS recettes (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  titre        TEXT NOT NULL,
  description  TEXT DEFAULT NULL,
  ingredients  TEXT DEFAULT NULL,
  contenu      TEXT NOT NULL,
  date_recette TEXT DEFAULT NULL,
  auteur       TEXT DEFAULT NULL,
  photo_id     INTEGER DEFAULT NULL,
  created_at   TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at   TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS recette_photos (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  recette_id   INTEGER NOT NULL,
  chemin       TEXT NOT NULL,
  chemin_thumb TEXT DEFAULT NULL,
  legende      TEXT DEFAULT NULL,
  ordre        INTEGER DEFAULT 0,
  FOREIGN KEY (recette_id) REFERENCES recettes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS remember_tokens (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES utilisateurs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notification_emails (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  email      TEXT NOT NULL UNIQUE,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS modification_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  type        TEXT NOT NULL,
  action      TEXT NOT NULL,
  description TEXT NOT NULL,
  auteur      TEXT DEFAULT NULL,
  created_at  TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notification_state (
  id         INTEGER NOT NULL DEFAULT 1,
  send_after TEXT DEFAULT NULL,
  last_sent  TEXT DEFAULT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS arbre_utilisateurs (
  arbre_id       TEXT    NOT NULL,
  utilisateur_id INTEGER NOT NULL,
  PRIMARY KEY (arbre_id, utilisateur_id),
  FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE
);
