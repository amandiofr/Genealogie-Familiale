<?php
// ─────────────────────────────────────────────────────────────
//  CONFIG — copiez ce fichier en "config.php" et remplissez
//  vos identifiants. Ne commitez jamais config.php dans git.
// ─────────────────────────────────────────────────────────────

// Base de données MySQL
// OVH mutualisé : quelque chose comme "mysqlXX-XX.perso.ovh.net"
// InfinityFree   : "sql.infinityfree.com"
// Hébergement cPanel standard : "localhost"
define('DB_HOST',    'localhost');
define('DB_NAME',    'ma_base');
define('DB_USER',    'mon_utilisateur');
define('DB_PASS',    'mon_mot_de_passe');
define('DB_CHARSET', 'utf8mb4');

// Clé secrète pour les sessions — générez une chaîne aléatoire longue
define('SESSION_SECRET', 'changez-cette-cle-secrete-longue-et-aleatoire');

// Dossier uploads (chemin absolu depuis la racine du projet)
define('UPLOAD_DIR',  __DIR__ . '/uploads/');
define('THUMB_DIR',   __DIR__ . '/uploads/thumbs/');
define('UPLOAD_URL',  'uploads/');
define('THUMB_URL',   'uploads/thumbs/');

// Taille max des photos uploadées (en octets)
define('MAX_UPLOAD_SIZE', 20 * 1024 * 1024); // 20 Mo

// Google Cloud Translation API (optionnel — pour la traduction automatique)
define('GOOGLE_TRANSLATE_KEY', '');

// Google API key (optionnel — pour la carte géographique)
define('GOOGLE_API_KEY', '');

// Notifications e-mail
define('NOTIFY_FROM',  'noreply@votre-domaine.fr');  // adresse expéditeur
define('NOTIFY_TOKEN', '');                           // token optionnel pour sécuriser l'accès HTTP au cron
define('SITE_URL',     'https://votre-domaine.fr/familia');

require_once __DIR__ . '/lib/helpers.php';
