<?php
require_once __DIR__ . '/../config.php';
session_start_once();
$currentUser = require_auth();
header('Content-Type: application/json; charset=utf-8');

$db = pdo();
$limit  = max(1, min(100, (int)($_GET['limit']  ?? 20)));
$offset = max(0, (int)($_GET['offset'] ?? 0));
$arbreId = isset($_GET['arbre_id']) ? trim($_GET['arbre_id']) : null;
if ($arbreId === '') $arbreId = null;

// Vérifier l'accès à cet arbre pour les non-admins
if ($arbreId !== null && $currentUser['role'] !== 'admin') {
    $check = $db->prepare("SELECT 1 FROM arbre_utilisateurs WHERE arbre_id=? AND utilisateur_id=?");
    $check->execute([$arbreId, $currentUser['id']]);
    if (!$check->fetch()) json_error('Accès refusé', 403);
}

try {
    if ($arbreId !== null) {
        $stmt = $db->prepare("SELECT * FROM modification_log WHERE arbre_id=? ORDER BY created_at DESC LIMIT ? OFFSET ?");
        $stmt->execute([$arbreId, $limit, $offset]);
    } else {
        $stmt = $db->prepare("SELECT * FROM modification_log ORDER BY created_at DESC LIMIT ? OFFSET ?");
        $stmt->execute([$limit, $offset]);
    }
    json_out($stmt->fetchAll());
} catch (\Throwable $e) {
    json_error($e->getMessage());
}
