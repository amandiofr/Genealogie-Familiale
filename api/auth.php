<?php
require_once __DIR__ . '/../config.php';

session_start_once();
header('Content-Type: application/json; charset=utf-8');

$action   = $_GET['action'] ?? '';
$lifetime = 180 * 24 * 3600; // 6 mois
$cookieName = 'GENEALOGIE_REMEMBER';

// ── Helpers token ─────────────────────────────────────────────────────────────
function set_remember_cookie(string $token, int $lifetime): void {
    global $cookieName;
    setcookie($cookieName, $token, [
        'expires'  => time() + $lifetime,
        'path'     => '/',
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
}

function clear_remember_cookie(): void {
    global $cookieName;
    setcookie($cookieName, '', ['expires' => time() - 3600, 'path' => '/', 'httponly' => true, 'samesite' => 'Lax']);
}

function issue_token(int $userId, int $lifetime): void {
    $token = bin2hex(random_bytes(32)); // 64 hex chars
    $hash  = hash('sha256', $token);
    $expires = date('Y-m-d H:i:s', time() + $lifetime);
    pdo()->prepare("INSERT INTO remember_tokens (user_id, token_hash, expires_at) VALUES (?,?,?)")
         ->execute([$userId, $hash, $expires]);
    set_remember_cookie($token, $lifetime);
}

function delete_token_by_cookie(): void {
    global $cookieName;
    $raw = $_COOKIE[$cookieName] ?? null;
    if (!$raw) return;
    $hash = hash('sha256', $raw);
    pdo()->prepare("DELETE FROM remember_tokens WHERE token_hash=?")->execute([$hash]);
}

function restore_session_from_cookie(): ?array {
    global $cookieName, $lifetime;
    $raw = $_COOKIE[$cookieName] ?? null;
    if (!$raw) return null;
    $hash = hash('sha256', $raw);
    $st = pdo()->prepare("
        SELECT u.id, u.nom, u.email, u.role, rt.id AS token_id
        FROM remember_tokens rt
        JOIN utilisateurs u ON u.id = rt.user_id
        WHERE rt.token_hash = ? AND rt.expires_at > NOW()
    ");
    $st->execute([$hash]);
    $row = $st->fetch();
    if (!$row) { clear_remember_cookie(); return null; }
    // Rotation : supprimer l'ancien token, émettre un nouveau
    pdo()->prepare("DELETE FROM remember_tokens WHERE id=?")->execute([$row['token_id']]);
    $user = ['id' => $row['id'], 'nom' => $row['nom'], 'email' => $row['email'], 'role' => $row['role']];
    issue_token($user['id'], $lifetime);
    $_SESSION['user'] = $user;
    return $user;
}

// ── POST /api/auth.php?action=login ──────────────────────────────────────────
if ($action === 'login' && method_is('POST')) {
    $b        = body();
    $email    = trim($b['email'] ?? '');
    $password = $b['password'] ?? '';

    if (!$email || !$password) json_error('Champs requis manquants');

    $st = pdo()->prepare('SELECT * FROM utilisateurs WHERE email = ?');
    $st->execute([$email]);
    $user = $st->fetch();

    if (!$user || !password_verify($password, $user['password'])) {
        json_error('Email ou mot de passe incorrect', 401);
    }

    $userData = ['id' => $user['id'], 'nom' => $user['nom'], 'email' => $user['email'], 'role' => $user['role']];
    $_SESSION['user'] = $userData;

    // Émettre un token persistant 6 mois
    issue_token($user['id'], $lifetime);

    json_out(['user' => $userData]);
}

// ── POST /api/auth.php?action=logout ─────────────────────────────────────────
if ($action === 'logout' && method_is('POST')) {
    delete_token_by_cookie();
    clear_remember_cookie();
    session_destroy();
    json_out(['ok' => true]);
}

// ── GET /api/auth.php?action=me ───────────────────────────────────────────────
if ($action === 'me' && method_is('GET')) {
    // 1. Session active ?
    if (!empty($_SESSION['user'])) {
        json_out(['user' => $_SESSION['user']]);
    }
    // 2. Cookie "remember me" ?
    $user = restore_session_from_cookie();
    if ($user) {
        json_out(['user' => $user]);
    }
    json_error('Non authentifié', 401);
}

// ── GET /api/auth.php?action=autologin&token=xxxx ────────────────────────────
if ($action === 'autologin' && method_is('GET')) {
    $token = $_GET['token'] ?? '';
    if (!$token) json_error('Token manquant', 400);
    $hash = hash('sha256', $token);
    $st = pdo()->prepare('SELECT id, nom, email, role FROM utilisateurs WHERE autologin_token = ?');
    $st->execute([$hash]);
    $user = $st->fetch();
    if (!$user) json_error('Lien invalide ou révoqué', 401);
    $userData = ['id' => $user['id'], 'nom' => $user['nom'], 'email' => $user['email'], 'role' => $user['role']];
    $_SESSION['user'] = $userData;
    issue_token($user['id'], $lifetime);
    json_out(['user' => $userData]);
}

// ── POST /api/auth.php?action=gen_autologin ───────────────────────────────────
if ($action === 'gen_autologin' && method_is('POST')) {
    $currentUser = require_auth();
    if ($currentUser['role'] !== 'admin') json_error('Accès refusé', 403);
    $b   = body();
    $uid = (int)($b['user_id'] ?? 0);
    if (!$uid) json_error('user_id requis');
    $token = bin2hex(random_bytes(32));
    $hash  = hash('sha256', $token);
    pdo()->prepare('UPDATE utilisateurs SET autologin_token=? WHERE id=?')->execute([$hash, $uid]);
    json_out(['token' => $token]);
}

// ── POST /api/auth.php?action=revoke_autologin ────────────────────────────────
if ($action === 'revoke_autologin' && method_is('POST')) {
    $currentUser = require_auth();
    if ($currentUser['role'] !== 'admin') json_error('Accès refusé', 403);
    $b   = body();
    $uid = (int)($b['user_id'] ?? 0);
    if (!$uid) json_error('user_id requis');
    pdo()->prepare('UPDATE utilisateurs SET autologin_token=NULL WHERE id=?')->execute([$uid]);
    json_out(['ok' => true]);
}

// ── PUT /api/auth.php?action=password ─────────────────────────────────────────
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
