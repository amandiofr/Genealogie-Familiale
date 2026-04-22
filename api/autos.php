<?php
require_once __DIR__ . '/../config.php';
header('Content-Type: application/json; charset=utf-8');

$user   = require_auth();
$db     = pdo();
$method = $_SERVER['REQUEST_METHOD'];
$id     = (int)($_GET['id']    ?? 0);
$sub    = $_GET['sub']   ?? '';
$subid  = (int)($_GET['subid'] ?? 0);

if ($method === 'GET' && !$id) {
    $rows = $db->query("
        SELECT a.*,
          p.id AS owner_id, p.prenom AS owner_prenom, p.nom AS owner_nom, p.genre AS owner_genre,
          (SELECT chemin_thumb FROM photos WHERE id=p.photo_id LIMIT 1) AS owner_thumb,
          COALESCE(
            (SELECT chemin_thumb FROM auto_photos WHERE id=a.photo_id AND auto_id=a.id LIMIT 1),
            (SELECT chemin_thumb FROM auto_photos WHERE auto_id=a.id ORDER BY ordre LIMIT 1)
          ) AS thumb
        FROM autos a
        LEFT JOIN personnes p ON p.id=a.personne_id
        ORDER BY a.annee IS NULL, a.annee ASC, a.created_at ASC
    ")->fetchAll();
    json_out($rows);
}

if ($method === 'GET' && $id) {
    $st = $db->prepare("
        SELECT a.*,
          p.id AS owner_id, p.prenom AS owner_prenom, p.nom AS owner_nom, p.genre AS owner_genre,
          (SELECT chemin_thumb FROM photos WHERE id=p.photo_id LIMIT 1) AS owner_thumb
        FROM autos a
        LEFT JOIN personnes p ON p.id=a.personne_id
        WHERE a.id=?
    "); $st->execute([$id]); $a = $st->fetch();
    if (!$a) json_error('Introuvable', 404);

    $ph = $db->prepare('SELECT * FROM auto_photos WHERE auto_id=? ORDER BY ordre'); $ph->execute([$id]); $a['photos'] = $ph->fetchAll();
    json_out($a);
}

if ($method === 'POST' && !$id && $sub !== 'photos') {
    require_role('admin', 'editeur');
    $b = body();
    if (empty($b['marque'])) json_error('Marque requise');
    $db->prepare('INSERT INTO autos (marque, modele, annee, couleur, description, personne_id) VALUES (?,?,?,?,?,?)')
       ->execute([$b['marque'], $b['modele'] ?: null, $b['annee'] ?: null, $b['couleur'] ?: null, $b['description'] ?: null, $b['personne_id'] ?: null]);
    $aid = $db->lastInsertId();
    log_modification('auto', 'ajout', $b['marque'] . ($b['modele'] ? ' ' . $b['modele'] : ''), $user['nom']);
    json_out(['id' => $aid]);
}

if ($method === 'PUT' && $id && !$sub) {
    require_role('admin', 'editeur');
    $b = body();
    $db->prepare('UPDATE autos SET marque=?, modele=?, annee=?, couleur=?, description=?, personne_id=? WHERE id=?')
       ->execute([$b['marque'], $b['modele'] ?: null, $b['annee'] ?: null, $b['couleur'] ?: null, $b['description'] ?: null, $b['personne_id'] ?: null, $id]);
    log_modification('auto', 'modification', $b['marque'] . ($b['modele'] ? ' ' . $b['modele'] : ''), $user['nom']);
    json_out(['ok' => true]);
}

if ($method === 'DELETE' && $id && !$sub) {
    require_role('admin', 'editeur');
    $an = $db->prepare('SELECT marque, modele FROM autos WHERE id=?'); $an->execute([$id]); $an = $an->fetch();
    $photos = $db->prepare('SELECT chemin, chemin_thumb FROM auto_photos WHERE auto_id=?'); $photos->execute([$id]);
    foreach ($photos->fetchAll() as $ph) { del_file($ph['chemin']); del_file($ph['chemin_thumb']); }
    $db->prepare('DELETE FROM autos WHERE id=?')->execute([$id]);
    if ($an) log_modification('auto', 'suppression', $an['marque'] . ($an['modele'] ? ' ' . $an['modele'] : ''), $user['nom']);
    json_out(['ok' => true]);
}

if ($sub === 'photos') {
    require_role('admin', 'editeur');
    if ($method === 'POST' && $id) {
        if (empty($_FILES['photo'])) json_error('Aucun fichier');
        $file = $_FILES['photo'];
        if ($file['error'] !== UPLOAD_ERR_OK) json_error('Erreur upload');
        if ($file['size'] > MAX_UPLOAD_SIZE) json_error('Fichier trop volumineux');
        $mime = mime_content_type($file['tmp_name']);
        if (!in_array($mime, ['image/jpeg', 'image/png', 'image/webp', 'image/gif'], true)) json_error('Format non supporté');
        $name = bin2hex(random_bytes(12));
        $dest = UPLOAD_DIR . $name . '.jpg'; $thumb = THUMB_DIR . $name . '_thumb.jpg';
        $src = load_img($file['tmp_name'], $mime);
        rsave($src, imagesx($src), imagesy($src), $dest, 1600, false);
        rsave($src, imagesx($src), imagesy($src), $thumb, 300, true);
        imagedestroy($src);
        $c = UPLOAD_URL . $name . '.jpg'; $ct = THUMB_URL . $name . '_thumb.jpg';
        $db->prepare('INSERT INTO auto_photos (auto_id, chemin, chemin_thumb, legende, ordre) VALUES (?,?,?,?,?)')
           ->execute([$id, $c, $ct, $_POST['legende'] ?? null, (int)($_POST['ordre'] ?? 0)]);
        $photo_id = $db->lastInsertId();
        // Set as favorite if first photo
        $count = $db->query("SELECT COUNT(*) FROM auto_photos WHERE auto_id=$id")->fetchColumn();
        if ($count == 1) {
            $db->prepare('UPDATE autos SET photo_id=? WHERE id=?')->execute([$photo_id, $id]);
        }
        $au_row = $db->prepare('SELECT marque, modele FROM autos WHERE id=?'); $au_row->execute([$id]); $au_row = $au_row->fetch();
        $au_name = trim(($au_row['marque'] ?? '') . ' ' . ($au_row['modele'] ?? ''));
        log_modification('auto', 'ajout', 'Photo : ' . $au_name, $user['nom']);
        json_out(['id' => $photo_id, 'chemin' => $c, 'chemin_thumb' => $ct]);
    }
    if ($method === 'PUT' && $subid) {
        $db->prepare('UPDATE autos SET photo_id=? WHERE id=?')->execute([$subid, $id]);
        json_out(['ok' => true]);
    }
    if ($method === 'DELETE' && $subid) {
        $ph = $db->prepare('SELECT * FROM auto_photos WHERE id=?'); $ph->execute([$subid]); $ph = $ph->fetch();
        if ($ph) { del_file($ph['chemin']); del_file($ph['chemin_thumb']); $db->prepare('DELETE FROM auto_photos WHERE id=?')->execute([$subid]); }
        // Clear photo_id if it was the favorite
        $db->prepare('UPDATE autos SET photo_id=NULL WHERE id=? AND photo_id=?')->execute([$id, $subid]);
        json_out(['ok' => true]);
    }
}

json_error('Requête non reconnue', 400);

function load_img(string $p, string $m) { return match($m) { 'image/png' => imagecreatefrompng($p), 'image/gif' => imagecreatefromgif($p), 'image/webp' => imagecreatefromwebp($p), default => imagecreatefromjpeg($p) }; }
function rsave($s, int $ow, int $oh, string $d, int $mx, bool $cr): void { if ($cr) { $r = max($mx/$ow,$mx/$oh); $cw=(int)round($mx/$r); $ch=(int)round($mx/$r); $cx=(int)round(($ow-$cw)/2); $cy=(int)round(($oh-$ch)/2); $i=imagecreatetruecolor($mx,$mx); imagecopyresampled($i,$s,0,0,$cx,$cy,$mx,$mx,$cw,$ch); } else { $r=min($mx/$ow,$mx/$oh,1); $nw=(int)round($ow*$r); $nh=(int)round($oh*$r); $i=imagecreatetruecolor($nw,$nh); imagecopyresampled($i,$s,0,0,0,0,$nw,$nh,$ow,$oh); } imagejpeg($i,$d,85); imagedestroy($i); }
function del_file(?string $p): void { if ($p && file_exists(__DIR__ . '/../' . $p)) @unlink(__DIR__ . '/../' . $p); }
