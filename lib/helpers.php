<?php
// ─────────────────────────────────────────────────────────────
//  HELPERS — fonctions utilitaires partagées par toutes les API
// ─────────────────────────────────────────────────────────────

// ── PDO singleton ─────────────────────────────────────────────
function pdo(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET;
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
    }
    return $pdo;
}

// ── Réponses JSON ─────────────────────────────────────────────
function json_out(mixed $data, int $code = 200): void {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function json_error(string $msg, int $code = 400): void {
    json_out(['error' => $msg], $code);
}

// ── Requête HTTP ──────────────────────────────────────────────
function method_is(string ...$methods): bool {
    return in_array($_SERVER['REQUEST_METHOD'], $methods, true);
}

function body(): array {
    $raw = file_get_contents('php://input');
    return json_decode($raw, true) ?? [];
}

// ── Session ───────────────────────────────────────────────────
function session_start_once(): void {
    if (session_status() === PHP_SESSION_NONE) {
        session_name('GENEALOGIE_SESS');
        session_set_cookie_params([
            'lifetime' => 365 * 24 * 3600,
            'path'     => '/',
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
        session_start();
    }
}

// ── Authentification ──────────────────────────────────────────
function require_auth(): array {
    session_start_once();
    if (!empty($_SESSION['user'])) {
        return $_SESSION['user'];
    }
    // Session expirée (OVH GC) → tenter le cookie remember-me
    $raw = $_COOKIE['GENEALOGIE_REMEMBER'] ?? null;
    if ($raw) {
        $hash     = hash('sha256', $raw);
        $lifetime = 365 * 24 * 3600;
        $st = pdo()->prepare("
            SELECT u.id, u.nom, u.email, u.role, rt.id AS token_id
            FROM remember_tokens rt
            JOIN utilisateurs u ON u.id = rt.user_id
            WHERE rt.token_hash = ? AND rt.expires_at > NOW()
        ");
        $st->execute([$hash]);
        $row = $st->fetch();
        if ($row) {
            $user = ['id' => $row['id'], 'nom' => $row['nom'], 'email' => $row['email'], 'role' => $row['role']];
            $newExpires = date('Y-m-d H:i:s', time() + $lifetime);
            pdo()->prepare("UPDATE remember_tokens SET expires_at=? WHERE id=?")->execute([$newExpires, $row['token_id']]);
            $_SESSION['user'] = $user;
            return $user;
        }
    }
    json_error('Non authentifié', 401);
}

function require_role(string ...$roles): array {
    $user = require_auth();
    if (!in_array($user['role'], $roles, true)) {
        json_error('Droits insuffisants', 403);
    }
    return $user;
}

// ── Journal des modifications ─────────────────────────────────
function log_modification(string $type, string $action, string $description, ?string $auteur = null, int $object_id = 0): void {
    try {
        $headerAuthor = isset($_SERVER['HTTP_X_AUTHOR_NAME']) ? trim(base64_decode($_SERVER['HTTP_X_AUTHOR_NAME'])) : null;
        if ($headerAuthor !== null && $headerAuthor !== '') {
            $auteur = mb_substr($headerAuthor, 0, 100);
        }
        $db = pdo();
        $db->prepare("INSERT INTO modification_log (type, action, description, auteur, object_id) VALUES (?,?,?,?,?)")
           ->execute([$type, $action, $description, $auteur, $object_id ?: null]);
        // Debounce : repousser l'envoi d'1h à chaque modification
        $send_after = date('Y-m-d H:i:s', time() + 3600);
        $existing = $db->query("SELECT id FROM notification_state LIMIT 1")->fetch();
        if ($existing) {
            $db->prepare("UPDATE notification_state SET send_after=? WHERE id=1")->execute([$send_after]);
        } else {
            $db->prepare("INSERT INTO notification_state (id, send_after) VALUES (1, ?)")->execute([$send_after]);
        }
    } catch (\Throwable $e) { /* non-bloquant */ }
}
