<?php
require_once __DIR__ . '/../config.php';

require_auth();
$db     = pdo();
$method = $_SERVER['REQUEST_METHOD'];

$VALID_SOURCES = ['anecdote', 'evenement', 'tresor', 'recette'];
$VALID_EMOJIS  = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

// Nom d'affichage : authorName transmis en header (obligatoire)
$displayName = null;
if (isset($_SERVER['HTTP_X_AUTHOR_NAME']) && $_SERVER['HTTP_X_AUTHOR_NAME'] !== '') {
    $displayName = mb_substr(trim(base64_decode($_SERVER['HTTP_X_AUTHOR_NAME'])), 0, 100);
}
if (!$displayName) json_error('Prénom non sélectionné', 400);

// ── GET : réactions pour un item ─────────────────────────────────────────────
if ($method === 'GET') {
    $source   = $_GET['source']   ?? '';
    $sourceId = (int)($_GET['id'] ?? 0);
    if (!in_array($source, $VALID_SOURCES) || !$sourceId) json_error('Paramètres manquants');

    try {
        $st = $db->prepare("
            SELECT emoji, display_name
            FROM reactions
            WHERE source = ? AND source_id = ?
            ORDER BY created_at
        ");
        $st->execute([$source, $sourceId]);
        $rows = $st->fetchAll();
    } catch (\PDOException $e) { json_error($e->getMessage()); }

    $grouped = [];
    foreach ($rows as $row) {
        $e = $row['emoji'];
        if (!isset($grouped[$e])) $grouped[$e] = ['emoji' => $e, 'count' => 0, 'users' => [], 'mine' => false];
        $grouped[$e]['count']++;
        $grouped[$e]['users'][] = $row['display_name'];
        if ($row['display_name'] === $displayName) $grouped[$e]['mine'] = true;
    }
    json_out(array_values($grouped));
}

// ── POST : ajouter/remplacer la réaction ─────────────────────────────────────
if ($method === 'POST') {
    $b        = body();
    $source   = trim($b['source']     ?? '');
    $sourceId = (int)($b['source_id'] ?? 0);
    $emoji    = trim($b['emoji']      ?? '');
    $emoji    = preg_replace('/\x{FE0F}/u', '', $emoji);
    $VALID_EMOJIS_NORM = array_map(fn($e) => preg_replace('/\x{FE0F}/u', '', $e), $VALID_EMOJIS);
    if (!in_array($source, $VALID_SOURCES) || !$sourceId || !in_array($emoji, $VALID_EMOJIS_NORM))
        json_error('Paramètres invalides');

    $db->prepare("DELETE FROM reactions WHERE source=? AND source_id=? AND display_name=?")
       ->execute([$source, $sourceId, $displayName]);
    $db->prepare("INSERT INTO reactions (source, source_id, display_name, emoji) VALUES (?,?,?,?)")
       ->execute([$source, $sourceId, $displayName, $emoji]);
    json_out(['ok' => true]);
}

// ── DELETE : retirer sa réaction ─────────────────────────────────────────────
if ($method === 'DELETE') {
    $source   = $_GET['source']   ?? '';
    $sourceId = (int)($_GET['id'] ?? 0);
    if (!in_array($source, $VALID_SOURCES) || !$sourceId) json_error('Paramètres manquants');

    $db->prepare("DELETE FROM reactions WHERE source=? AND source_id=? AND display_name=?")
       ->execute([$source, $sourceId, $displayName]);
    json_out(['ok' => true]);
}

json_error('Action inconnue', 404);
