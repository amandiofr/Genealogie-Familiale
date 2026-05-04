<?php
require_once __DIR__ . '/../config.php';
session_start_once();
$currentUser = require_auth();
header('Content-Type: application/json; charset=utf-8');
$db = pdo();

if (method_is('POST')) {
    $body = json_decode(file_get_contents('php://input'), true) ?? [];
    $ip = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? null;
    if (is_string($ip)) $ip = trim(explode(',', $ip)[0]);
    $db->prepare('INSERT INTO access_log (utilisateur_id, login, nom, ip, type, element_id, element_name) VALUES (?,?,?,?,?,?,?)')
       ->execute([
           $currentUser['id'],
           $currentUser['email'] ?? null,
           $currentUser['nom']   ?? null,
           $ip,
           $body['type']         ?? 'inconnu',
           $body['element_id']   ?? null,
           $body['element_name'] ?? null,
       ]);
    json_out(['ok' => true]);
}

if (method_is('GET')) {
    if ($currentUser['role'] !== 'admin') { http_response_code(403); json_out(['error' => 'Forbidden']); exit; }
    $limit  = min((int)($_GET['limit']  ?? 100), 200);
    $offset = (int)($_GET['offset'] ?? 0);
    $st = $db->prepare('SELECT * FROM access_log ORDER BY created_at DESC LIMIT ? OFFSET ?');
    $st->execute([$limit, $offset]);
    json_out($st->fetchAll());
}
