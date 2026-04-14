<?php
require_once __DIR__ . '/../config.php';

$user   = require_auth();
$db     = pdo();
$method = $_SERVER['REQUEST_METHOD'];

// ── GET : tags pour une photo ─────────────────────────────────────────────────
if ($method === 'GET') {
    $source  = $_GET['source'] ?? '';
    $photoId = (int)($_GET['id'] ?? 0);
    if (!$source || !$photoId) json_error('Paramètres manquants');
    try {
        $st = $db->prepare("
            SELECT pt.id, pt.personne_id, pt.x, pt.y, pt.w, pt.h,
                   p.prenom, p.nom,
                   (SELECT ph.chemin_thumb FROM photos ph WHERE ph.personne_id = p.id ORDER BY ph.ordre LIMIT 1) AS chemin_thumb
            FROM photo_tags pt
            JOIN personnes p ON p.id = pt.personne_id
            WHERE pt.photo_source = ? AND pt.photo_id = ?
            ORDER BY pt.x, pt.y
        ");
        $st->execute([$source, $photoId]);
        json_out($st->fetchAll());
    } catch (\PDOException $e) { json_error($e->getMessage()); }
}

// ── POST : créer un tag ───────────────────────────────────────────────────────
if ($method === 'POST') {
    require_role('admin', 'editeur');
    $b          = body();
    $source     = trim($b['source']      ?? '');
    $photoId    = (int)($b['photo_id']   ?? 0);
    $personneId = (int)($b['personne_id'] ?? 0);
    $x = (float)($b['x'] ?? 0); $y = (float)($b['y'] ?? 0);
    $w = (float)($b['w'] ?? 0); $h = (float)($b['h'] ?? 0);
    if (!$source || !$photoId || !$personneId || $w <= 0 || $h <= 0) json_error('Paramètres invalides');
    try {
        $db->prepare("INSERT INTO photo_tags (photo_source, photo_id, personne_id, x, y, w, h) VALUES (?,?,?,?,?,?,?)")
           ->execute([$source, $photoId, $personneId, $x, $y, $w, $h]);
        json_out(['id' => (int)$db->lastInsertId(), 'photo_source' => $source, 'photo_id' => $photoId,
                  'personne_id' => $personneId, 'x' => $x, 'y' => $y, 'w' => $w, 'h' => $h]);
    } catch (\PDOException) {
        json_error('Tag déjà existant');
    }
}

// ── DELETE : supprimer un tag ─────────────────────────────────────────────────
if ($method === 'DELETE') {
    require_role('admin', 'editeur');
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) json_error('ID manquant');
    $db->prepare("DELETE FROM photo_tags WHERE id=?")->execute([$id]);
    json_out(['ok' => true]);
}

json_error('Action inconnue', 404);
