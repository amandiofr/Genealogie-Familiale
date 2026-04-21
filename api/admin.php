<?php
require_once __DIR__ . '/../config.php';

$action = $_GET['action'] ?? '';

// quality_check est accessible aux éditeurs aussi
if ($action === 'quality_check') {
    require_role('admin', 'editeur');
} else {
    require_role('admin');
}

// ── GET orphan_files ──────────────────────────────────────────────────────────
if ($action === 'orphan_files' && method_is('GET')) {
    $db = pdo();

    // Collect every path referenced in the DB
    $referenced = [];
    $tables = ['photos', 'anecdote_photos', 'evenement_photos', 'reunion_photos', 'auto_photos'];
    foreach ($tables as $table) {
        foreach ($db->query("SELECT chemin, chemin_thumb FROM $table")->fetchAll() as $row) {
            if ($row['chemin'])       $referenced[$row['chemin']]       = true;
            if ($row['chemin_thumb']) $referenced[$row['chemin_thumb']] = true;
        }
    }

    // Scan uploads/ and uploads/thumbs/
    $orphans = [];
    $scan = [UPLOAD_URL => UPLOAD_DIR, THUMB_URL => THUMB_DIR];
    foreach ($scan as $url_prefix => $dir) {
        if (!is_dir($dir)) continue;
        foreach (scandir($dir) as $file) {
            if ($file[0] === '.' || is_dir($dir . $file)) continue;
            $rel = $url_prefix . $file;
            if (!isset($referenced[$rel])) {
                $orphans[] = [
                    'path'  => $rel,
                    'size'  => filesize($dir . $file),
                    'mtime' => filemtime($dir . $file),
                ];
            }
        }
    }

    usort($orphans, fn($a, $b) => $b['mtime'] - $a['mtime']);
    $total = array_sum(array_column($orphans, 'size'));
    json_out(['orphans' => $orphans, 'total_size' => $total]);
}

// ── DELETE delete_file ────────────────────────────────────────────────────────
if ($action === 'delete_file' && method_is('DELETE')) {
    $path = trim(body()['path'] ?? '');

    // Strict validation: must be inside uploads/, no directory traversal
    if (!preg_match('#^uploads/(thumbs/)?[^/]+$#', $path)) {
        json_error('Chemin invalide');
    }

    $abs = __DIR__ . '/../' . $path;
    if (!is_file($abs)) json_error('Fichier introuvable', 404);

    unlink($abs);
    json_out(['deleted' => $path]);
}

// ── GET logs ─────────────────────────────────────────────────────────────────
if ($action === 'logs' && method_is('GET')) {
    $limit  = min((int)($_GET['limit']  ?? 50), 200);
    $offset = max((int)($_GET['offset'] ?? 0),  0);
    $st = pdo()->prepare('SELECT * FROM modification_log ORDER BY created_at DESC LIMIT ? OFFSET ?');
    $st->execute([$limit, $offset]);
    json_out($st->fetchAll());
}

// ── GET quality_check ────────────────────────────────────────────────────────
if ($action === 'quality_check' && method_is('GET')) {
    $db = pdo();
    try {
    $db->exec("SET SESSION sql_mode = ''"); // permettre les dates vides héritées

    $personnes = $db->query("
        SELECT id, prenom, nom, naissance, lieu_naiss
        FROM personnes
        WHERE hors_arbre = 0
          AND ((nom        IS NULL OR nom        = '' OR nom        LIKE '%?%')
           OR   naissance  IS NULL
           OR  (lieu_naiss IS NULL OR lieu_naiss = '' OR lieu_naiss LIKE '%?%'))
        ORDER BY prenom, nom
    ")->fetchAll();

    $evenements = $db->query("
        SELECT e.id, e.titre, e.type, e.date_debut, e.lieu,
               COUNT(ep.personne_id) AS nb_personnes
        FROM evenements e
        LEFT JOIN evenement_personnes ep ON ep.evenement_id = e.id
        GROUP BY e.id, e.titre, e.type, e.date_debut, e.lieu
        HAVING e.date_debut IS NULL
            OR (e.lieu IS NULL OR e.lieu = '' OR e.lieu LIKE '%?%')
            OR nb_personnes = 0
        ORDER BY e.titre
    ")->fetchAll();

    $reunions = $db->query("
        SELECT id, titre, date_debut, lieu
        FROM reunions
        WHERE  date_debut IS NULL
           OR (lieu       IS NULL OR lieu = '' OR lieu LIKE '%?%')
        ORDER BY titre
    ")->fetchAll();

    // Membres isolés (aucun lien familial)
    $isoles = $db->query("
        SELECT id, prenom, nom FROM personnes
        WHERE id NOT IN (SELECT personne_a FROM liens UNION SELECT personne_b FROM liens)
        ORDER BY nom, prenom
    ")->fetchAll();

    // Membres sans photo
    $sansPhoto = $db->query("
        SELECT id, prenom, nom FROM personnes
        WHERE id NOT IN (SELECT DISTINCT personne_id FROM photos)
        ORDER BY nom, prenom
    ")->fetchAll();

    // Conjoints sans date de mariage — avec date de l'événement mariage si disponible
    $sansDateMariage = $db->query("
        SELECT l.id AS lien_id, pa.id AS id_a, pa.prenom AS prenom_a, pa.nom AS nom_a,
               pb.id AS id_b, pb.prenom AS prenom_b, pb.nom AS nom_b,
               (
                 SELECT e.date_debut FROM evenements e
                 JOIN evenement_personnes ep1 ON ep1.evenement_id = e.id AND ep1.personne_id = pa.id
                 JOIN evenement_personnes ep2 ON ep2.evenement_id = e.id AND ep2.personne_id = pb.id
                 WHERE e.type = 'mariage' AND e.date_debut IS NOT NULL
                 ORDER BY e.date_debut ASC LIMIT 1
               ) AS date_evt
        FROM liens l
        JOIN personnes pa ON pa.id = l.personne_a
        JOIN personnes pb ON pb.id = l.personne_b
        WHERE l.type IN ('conjoint','fiancailles')
          AND (l.date_debut IS NULL OR l.date_debut = '0000-00-00')
        ORDER BY pa.nom, pa.prenom
    ")->fetchAll();

    // Dates incohérentes : enfant né avant un parent, ou décès avant naissance
    $incoherences = $db->query("
        SELECT p.id, p.prenom, p.nom, p.naissance, p.deces,
               par.prenom AS parent_prenom, par.nom AS parent_nom, par.naissance AS parent_naiss
        FROM personnes p
        JOIN liens l ON l.personne_b = p.id AND l.type = 'parent_enfant'
        JOIN personnes par ON par.id = l.personne_a
        WHERE p.naissance IS NOT NULL AND par.naissance IS NOT NULL
          AND p.naissance != '0000-00-00' AND par.naissance != '0000-00-00'
          AND YEAR(p.naissance) < YEAR(par.naissance)
        ORDER BY p.nom, p.prenom
    ")->fetchAll();

    $decesAvantNaiss = $db->query("
        SELECT id, prenom, nom, naissance, deces FROM personnes
        WHERE naissance IS NOT NULL AND deces IS NOT NULL
          AND naissance != '0000-00-00' AND deces != '0000-00-00'
          AND YEAR(deces) < YEAR(naissance)
        ORDER BY nom, prenom
    ")->fetchAll();

    json_out([
        'personnes'       => $personnes,
        'evenements'      => $evenements,
        'reunions'        => $reunions,
        'isoles'          => $isoles,
        'sans_photo'      => $sansPhoto,
        'sans_date_mariage' => $sansDateMariage,
        'incoherences'    => array_merge($incoherences, $decesAvantNaiss),
    ]);
    } catch (\PDOException $e) { json_error($e->getMessage()); }
}

json_error('Action inconnue', 400);
