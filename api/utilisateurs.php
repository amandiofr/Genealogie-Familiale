<?php
require_once __DIR__ . '/../config.php';
header('Content-Type: application/json; charset=utf-8');

$user   = require_role('admin');
$db     = pdo();
$method = $_SERVER['REQUEST_METHOD'];
$id     = (int)($_GET['id'] ?? 0);

// GET — liste
if ($method === 'GET' && !$id) {
    $rows = $db->query('SELECT id,nom,email,role,created_at FROM utilisateurs ORDER BY id')->fetchAll();
    json_out($rows);
}

// POST — créer
if ($method === 'POST') {
    $b = body();
    if (empty($b['nom']) || empty($b['email']) || empty($b['password'])) json_error('Champs requis manquants');
    $hash = password_hash($b['password'], PASSWORD_BCRYPT);
    try {
        $st = $db->prepare('INSERT INTO utilisateurs (nom,email,password,role) VALUES (?,?,?,?)');
        $st->execute([$b['nom'], $b['email'], $hash, $b['role'] ?? 'lecteur']);
        json_out(['id' => $db->lastInsertId()]);
    } catch (PDOException) {
        json_error('Email déjà utilisé', 409);
    }
}

// PUT — modifier
if ($method === 'PUT' && $id) {
    $b = body();
    if (!empty($b['password'])) {
        $hash = password_hash($b['password'], PASSWORD_BCRYPT);
        $db->prepare('UPDATE utilisateurs SET nom=?,email=?,role=?,password=? WHERE id=?')
           ->execute([$b['nom'], $b['email'], $b['role'], $hash, $id]);
    } else {
        $db->prepare('UPDATE utilisateurs SET nom=?,email=?,role=? WHERE id=?')
           ->execute([$b['nom'], $b['email'], $b['role'], $id]);
    }
    json_out(['ok' => true]);
}

// DELETE — supprimer
if ($method === 'DELETE' && $id) {
    $admins = $db->query("SELECT COUNT(*) FROM utilisateurs WHERE role='admin'")->fetchColumn();
    $target = $db->prepare('SELECT role FROM utilisateurs WHERE id=?');
    $target->execute([$id]);
    $target = $target->fetch();
    if ($target['role'] === 'admin' && $admins <= 1) json_error('Impossible de supprimer le dernier administrateur');
    $db->prepare('DELETE FROM utilisateurs WHERE id=?')->execute([$id]);
    json_out(['ok' => true]);
}

json_error('Méthode non supportée', 405);
