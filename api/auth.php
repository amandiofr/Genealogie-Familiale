<?php
require_once __DIR__ . '/../config.php';

session_start_once();
header('Content-Type: application/json; charset=utf-8');

$action = $_GET['action'] ?? '';

// POST /api/auth.php?action=login
if ($action === 'login' && method_is('POST')) {
    $b = body();
    $email    = trim($b['email'] ?? '');
    $password = $b['password'] ?? '';

    if (!$email || !$password) json_error('Champs requis manquants');

    $user = pdo()->prepare('SELECT * FROM utilisateurs WHERE email = ?');
    $user->execute([$email]);
    $user = $user->fetch();

    if (!$user || !password_verify($password, $user['password'])) {
        json_error('Email ou mot de passe incorrect', 401);
    }

    $_SESSION['user'] = [
        'id'    => $user['id'],
        'nom'   => $user['nom'],
        'email' => $user['email'],
        'role'  => $user['role'],
    ];

    json_out(['user' => $_SESSION['user']]);
}

// POST /api/auth.php?action=logout
if ($action === 'logout' && method_is('POST')) {
    session_destroy();
    json_out(['ok' => true]);
}

// GET /api/auth.php?action=me
if ($action === 'me' && method_is('GET')) {
    if (empty($_SESSION['user'])) json_error('Non authentifié', 401);
    json_out(['user' => $_SESSION['user']]);
}

// PUT /api/auth.php?action=password
if ($action === 'password' && method_is('PUT')) {
    $user = require_auth();
    $b    = body();
    $row  = pdo()->prepare('SELECT password FROM utilisateurs WHERE id=?');
    $row->execute([$user['id']]);
    $row  = $row->fetch();
    if (!password_verify($b['ancien'] ?? '', $row['password'])) {
        json_error('Ancien mot de passe incorrect');
    }
    $hash = password_hash($b['nouveau'], PASSWORD_BCRYPT);
    pdo()->prepare('UPDATE utilisateurs SET password=? WHERE id=?')->execute([$hash, $user['id']]);
    json_out(['ok' => true]);
}

json_error('Action inconnue', 404);
