<?php
// ─────────────────────────────────────────────────────────────
//  INSTALL.PHP — à exécuter UNE SEULE FOIS via le navigateur
//  Puis supprimez ce fichier (ou renommez-le) !
// ─────────────────────────────────────────────────────────────
require_once __DIR__ . '/config.php';

$tables = [

'utilisateurs' => "
CREATE TABLE IF NOT EXISTS utilisateurs (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nom        VARCHAR(100) NOT NULL,
  email      VARCHAR(200) NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,
  role       ENUM('admin','editeur','lecteur') NOT NULL DEFAULT 'lecteur',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;",

'personnes' => "
CREATE TABLE IF NOT EXISTS personnes (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  prenom       VARCHAR(100) NOT NULL,
  nom          VARCHAR(100) NOT NULL,
  nom_naiss    VARCHAR(100) DEFAULT NULL,
  genre        ENUM('male','female','autre') DEFAULT 'male',
  naissance    DATE         DEFAULT NULL,
  lieu_naiss   VARCHAR(200) DEFAULT NULL,
  deces        DATE         DEFAULT NULL,
  lieu_deces   VARCHAR(200) DEFAULT NULL,
  vivant       TINYINT(1)   NOT NULL DEFAULT 1,
  generation   SMALLINT     NOT NULL DEFAULT 0,
  arbre_ordre  SMALLINT     DEFAULT NULL,
  profession   VARCHAR(200) DEFAULT NULL,
  biographie   TEXT         DEFAULT NULL,
  photo_id     INT UNSIGNED DEFAULT NULL,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;",

'liens' => "
CREATE TABLE IF NOT EXISTS liens (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  personne_a   INT UNSIGNED NOT NULL,
  personne_b   INT UNSIGNED NOT NULL,
  type       ENUM('conjoint','parent_enfant','fiancailles') NOT NULL,
  date_debut DATE    DEFAULT NULL,
  date_fin   DATE    DEFAULT NULL,
  notes      TEXT    DEFAULT NULL,
  UNIQUE KEY uniq_lien (personne_a, personne_b, type),
  FOREIGN KEY (personne_a) REFERENCES personnes(id) ON DELETE CASCADE,
  FOREIGN KEY (personne_b) REFERENCES personnes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;",

'photos' => "
CREATE TABLE IF NOT EXISTS photos (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  personne_id  INT UNSIGNED DEFAULT NULL,
  chemin       VARCHAR(400) NOT NULL,
  chemin_thumb VARCHAR(400) DEFAULT NULL,
  legende      TEXT         DEFAULT NULL,
  date_photo   VARCHAR(50)  DEFAULT NULL,
  ordre        SMALLINT     DEFAULT 0,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (personne_id) REFERENCES personnes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;",

'evenements' => "
CREATE TABLE IF NOT EXISTS evenements (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  titre       VARCHAR(300) NOT NULL,
  type        ENUM('mariage','demenagement','autre') NOT NULL,
  date_debut  DATE    DEFAULT NULL,
  date_fin    DATE    DEFAULT NULL,
  lieu        VARCHAR(300) DEFAULT NULL,
  description TEXT    DEFAULT NULL,
  photo_id    INT UNSIGNED DEFAULT NULL,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;",

'evenement_personnes' => "
CREATE TABLE IF NOT EXISTS evenement_personnes (
  evenement_id INT UNSIGNED NOT NULL,
  personne_id  INT UNSIGNED NOT NULL,
  role         VARCHAR(100) DEFAULT NULL,
  PRIMARY KEY (evenement_id, personne_id),
  FOREIGN KEY (evenement_id) REFERENCES evenements(id) ON DELETE CASCADE,
  FOREIGN KEY (personne_id)  REFERENCES personnes(id)  ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;",

'evenement_photos' => "
CREATE TABLE IF NOT EXISTS evenement_photos (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  evenement_id INT UNSIGNED NOT NULL,
  chemin       VARCHAR(400) NOT NULL,
  chemin_thumb VARCHAR(400) DEFAULT NULL,
  legende      TEXT         DEFAULT NULL,
  ordre        SMALLINT     DEFAULT 0,
  FOREIGN KEY (evenement_id) REFERENCES evenements(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;",

'reunions' => "
CREATE TABLE IF NOT EXISTS reunions (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  titre       VARCHAR(300) NOT NULL,
  date_debut  DATE    DEFAULT NULL,
  date_fin    DATE    DEFAULT NULL,
  lieu        VARCHAR(300) DEFAULT NULL,
  description TEXT    DEFAULT NULL,
  photo_id    INT UNSIGNED DEFAULT NULL,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;",

'reunion_personnes' => "
CREATE TABLE IF NOT EXISTS reunion_personnes (
  reunion_id  INT UNSIGNED NOT NULL,
  personne_id INT UNSIGNED NOT NULL,
  role        VARCHAR(100) DEFAULT NULL,
  PRIMARY KEY (reunion_id, personne_id),
  FOREIGN KEY (reunion_id)  REFERENCES reunions(id)  ON DELETE CASCADE,
  FOREIGN KEY (personne_id) REFERENCES personnes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;",

'reunion_photos' => "
CREATE TABLE IF NOT EXISTS reunion_photos (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reunion_id  INT UNSIGNED NOT NULL,
  chemin      VARCHAR(400) NOT NULL,
  chemin_thumb VARCHAR(400) DEFAULT NULL,
  legende     TEXT         DEFAULT NULL,
  ordre       SMALLINT     DEFAULT 0,
  FOREIGN KEY (reunion_id) REFERENCES reunions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;",

'anecdotes' => "
CREATE TABLE IF NOT EXISTS anecdotes (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  titre      VARCHAR(300) NOT NULL,
  contenu    TEXT         NOT NULL,
  date_anec  VARCHAR(50)  DEFAULT NULL,
  auteur     VARCHAR(150) DEFAULT NULL,
  photo_id   INT UNSIGNED DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;",

'anecdote_personnes' => "
CREATE TABLE IF NOT EXISTS anecdote_personnes (
  anecdote_id INT UNSIGNED NOT NULL,
  personne_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (anecdote_id, personne_id),
  FOREIGN KEY (anecdote_id) REFERENCES anecdotes(id) ON DELETE CASCADE,
  FOREIGN KEY (personne_id) REFERENCES personnes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;",

'anecdote_photos' => "
CREATE TABLE IF NOT EXISTS anecdote_photos (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  anecdote_id INT UNSIGNED NOT NULL,
  chemin      VARCHAR(400) NOT NULL,
  chemin_thumb VARCHAR(400) DEFAULT NULL,
  legende     TEXT         DEFAULT NULL,
  ordre       SMALLINT     DEFAULT 0,
  FOREIGN KEY (anecdote_id) REFERENCES anecdotes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;",

'autos' => "
CREATE TABLE IF NOT EXISTS autos (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  marque      VARCHAR(100) NOT NULL,
  modele      VARCHAR(100) DEFAULT NULL,
  annee       SMALLINT     DEFAULT NULL,
  couleur     VARCHAR(100) DEFAULT NULL,
  description TEXT         DEFAULT NULL,
  personne_id INT UNSIGNED DEFAULT NULL,
  photo_id    INT UNSIGNED DEFAULT NULL,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (personne_id) REFERENCES personnes(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;",

'auto_photos' => "
CREATE TABLE IF NOT EXISTS auto_photos (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  auto_id      INT UNSIGNED NOT NULL,
  chemin       VARCHAR(400) NOT NULL,
  chemin_thumb VARCHAR(400) DEFAULT NULL,
  legende      TEXT         DEFAULT NULL,
  ordre        SMALLINT     DEFAULT 0,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (auto_id) REFERENCES autos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;",

'tresors' => "
CREATE TABLE IF NOT EXISTS tresors (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  titre       VARCHAR(300) NOT NULL,
  contenu     TEXT         NOT NULL,
  date_tresor VARCHAR(50)  DEFAULT NULL,
  auteur      VARCHAR(150) DEFAULT NULL,
  photo_id    INT UNSIGNED DEFAULT NULL,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;",

'tresor_personnes' => "
CREATE TABLE IF NOT EXISTS tresor_personnes (
  tresor_id   INT UNSIGNED NOT NULL,
  personne_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (tresor_id, personne_id),
  FOREIGN KEY (tresor_id)   REFERENCES tresors(id)   ON DELETE CASCADE,
  FOREIGN KEY (personne_id) REFERENCES personnes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;",

'tresor_photos' => "
CREATE TABLE IF NOT EXISTS tresor_photos (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tresor_id    INT UNSIGNED NOT NULL,
  chemin       VARCHAR(400) NOT NULL,
  chemin_thumb VARCHAR(400) DEFAULT NULL,
  legende      TEXT         DEFAULT NULL,
  ordre        SMALLINT     DEFAULT 0,
  FOREIGN KEY (tresor_id) REFERENCES tresors(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;",

'recettes' => "
CREATE TABLE IF NOT EXISTS recettes (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  titre        VARCHAR(300) NOT NULL,
  description  TEXT         DEFAULT NULL,
  ingredients  TEXT         DEFAULT NULL,
  contenu      TEXT         NOT NULL,
  date_recette VARCHAR(50)  DEFAULT NULL,
  auteur       VARCHAR(150) DEFAULT NULL,
  photo_id     INT UNSIGNED DEFAULT NULL,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;",

'recette_photos' => "
CREATE TABLE IF NOT EXISTS recette_photos (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  recette_id   INT UNSIGNED NOT NULL,
  chemin       VARCHAR(400) NOT NULL,
  chemin_thumb VARCHAR(400) DEFAULT NULL,
  legende      TEXT         DEFAULT NULL,
  ordre        SMALLINT     DEFAULT 0,
  FOREIGN KEY (recette_id) REFERENCES recettes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;",

'remember_tokens' => "
CREATE TABLE IF NOT EXISTS remember_tokens (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NOT NULL,
  token_hash CHAR(64)     NOT NULL,
  expires_at DATETIME     NOT NULL,
  created_at DATETIME     DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_token (token_hash),
  FOREIGN KEY (user_id) REFERENCES utilisateurs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;",

'notification_emails' => "
CREATE TABLE IF NOT EXISTS notification_emails (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email      VARCHAR(200) NOT NULL UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;",

'modification_log' => "
CREATE TABLE IF NOT EXISTS modification_log (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  type        VARCHAR(50)  NOT NULL,
  action      ENUM('ajout','modification','suppression') NOT NULL,
  description VARCHAR(500) NOT NULL,
  auteur      VARCHAR(200) DEFAULT NULL,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;",

'notification_state' => "
CREATE TABLE IF NOT EXISTS notification_state (
  id         INT UNSIGNED NOT NULL DEFAULT 1,
  send_after DATETIME     DEFAULT NULL,
  last_sent  DATETIME     DEFAULT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;",

];

$errors = [];
$done   = [];

try {
    $db = pdo();
    foreach ($tables as $name => $sql) {
        try {
            $db->exec($sql);
            $done[] = $name;
        } catch (PDOException $e) {
            $errors[] = "$name : " . $e->getMessage();
        }
    }

    // Migration : ajouter photo_id à anecdotes si absent (installations existantes)
    try {
        $cols = $db->query("SHOW COLUMNS FROM anecdotes LIKE 'photo_id'")->fetchAll();
        if (empty($cols)) {
            $db->exec("ALTER TABLE anecdotes ADD COLUMN photo_id INT UNSIGNED DEFAULT NULL");
            $done[] = '→ Migration : colonne photo_id ajoutée à anecdotes';
        }
    } catch (PDOException $e) {
        $errors[] = 'Migration photo_id anecdotes : ' . $e->getMessage();
    }

    // Migration : ajouter photo_id à evenements si absent (installations existantes)
    try {
        $cols = $db->query("SHOW COLUMNS FROM evenements LIKE 'photo_id'")->fetchAll();
        if (empty($cols)) {
            $db->exec("ALTER TABLE evenements ADD COLUMN photo_id INT UNSIGNED DEFAULT NULL");
            $done[] = '→ Migration : colonne photo_id ajoutée à evenements';
        }
    } catch (PDOException $e) {
        $errors[] = 'Migration photo_id : ' . $e->getMessage();
    }

    // Migration : autologin_token sur utilisateurs
    try {
        $cols = $db->query("SHOW COLUMNS FROM utilisateurs LIKE 'autologin_token'")->fetchAll();
        if (empty($cols)) {
            $db->exec("ALTER TABLE utilisateurs ADD COLUMN autologin_token CHAR(64) DEFAULT NULL");
            $done[] = '→ Migration : colonne autologin_token ajoutée à utilisateurs';
        }
    } catch (PDOException $e) {
        $errors[] = 'Migration autologin_token : ' . $e->getMessage();
    }

    // Compte admin par défaut
    $count = $db->query('SELECT COUNT(*) FROM utilisateurs')->fetchColumn();
    if ($count == 0) {
        $hash = password_hash('admin1234', PASSWORD_BCRYPT);
        $db->prepare('INSERT INTO utilisateurs (nom,email,password,role) VALUES (?,?,?,?)')
           ->execute(['Administrateur', 'admin@famille.local', $hash, 'admin']);
        $done[] = '→ Compte admin créé (admin@famille.local / admin1234)';
    }
} catch (PDOException $e) {
    $errors[] = 'Connexion impossible : ' . $e->getMessage();
}
?>
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Installation — Généalogie Familiale</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 600px; margin: 60px auto; padding: 0 20px; }
  h1   { font-size: 1.4rem; margin-bottom: 1.5rem; }
  .ok  { color: #2a7a2a; background: #eafaea; padding: 8px 12px; border-radius: 6px; margin: 4px 0; }
  .err { color: #a00; background: #fde; padding: 8px 12px; border-radius: 6px; margin: 4px 0; }
  .warn{ background:#fffbe6; border:1px solid #f0c040; padding:16px; border-radius:8px; margin-top:24px; }
  a   { color: #1a6eb5; }
</style>
</head>
<body>
<h1>🌿 Installation Généalogie Familiale</h1>

<?php foreach ($done as $d): ?>
  <div class="ok">✓ <?= htmlspecialchars($d) ?></div>
<?php endforeach; ?>
<?php foreach ($errors as $e): ?>
  <div class="err">✗ <?= htmlspecialchars($e) ?></div>
<?php endforeach; ?>

<?php if (empty($errors)): ?>
<div class="warn">
  <strong>⚠️ Sécurité</strong><br><br>
  Installation terminée. Faites maintenant ces deux choses :<br><br>
  1. <strong>Supprimez ce fichier</strong> <code>install.php</code> de votre serveur (via FTP)<br>
  2. <strong>Changez le mot de passe admin</strong> dès votre première connexion<br><br>
  <a href="/">→ Accéder au site</a>
</div>
<?php endif; ?>
</body>
</html>
