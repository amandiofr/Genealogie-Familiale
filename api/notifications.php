<?php
require_once __DIR__ . '/../config.php';
header('Content-Type: application/json; charset=utf-8');

require_role('admin');
$db     = pdo();
$method = $_SERVER['REQUEST_METHOD'];
$id     = (int)($_GET['id'] ?? 0);

// ── GET liste des emails ──────────────────────────────────────────────────────
if ($method === 'GET') {
    json_out($db->query("SELECT id, email, created_at FROM notification_emails ORDER BY created_at")->fetchAll());
}

// ── POST ajouter un email ─────────────────────────────────────────────────────
if ($method === 'POST') {
    $b     = body();
    $email = trim($b['email'] ?? '');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) json_error('Adresse email invalide');
    try {
        $db->prepare("INSERT INTO notification_emails (email) VALUES (?)")->execute([$email]);
        json_out(['id' => (int)$db->lastInsertId(), 'email' => $email]);
    } catch (\PDOException) {
        json_error('Email déjà enregistré', 409);
    }
}

// ── DELETE supprimer un email ─────────────────────────────────────────────────
if ($method === 'DELETE' && $id) {
    $db->prepare("DELETE FROM notification_emails WHERE id=?")->execute([$id]);
    json_out(['ok' => true]);
}

json_error('Requête non reconnue', 400);
