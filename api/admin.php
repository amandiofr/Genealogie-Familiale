<?php
require_once __DIR__ . '/../config.php';
require_role('admin');

$action = $_GET['action'] ?? '';

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

    $personnes = $db->query("
        SELECT id, prenom, nom, naissance, lieu_naiss
        FROM personnes
        WHERE (nom        IS NULL OR nom        = '' OR nom        LIKE '%?%')
           OR  naissance  IS NULL
           OR (lieu_naiss IS NULL OR lieu_naiss = '' OR lieu_naiss LIKE '%?%')
        ORDER BY nom, prenom
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

    json_out(['personnes' => $personnes, 'evenements' => $evenements, 'reunions' => $reunions]);
    } catch (\PDOException $e) { json_error($e->getMessage()); }
}

json_error('Action inconnue', 400);
