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
        SELECT r.*,
          COALESCE(
            (SELECT chemin_thumb FROM recette_photos WHERE id=r.photo_id AND recette_id=r.id LIMIT 1),
            (SELECT chemin_thumb FROM recette_photos WHERE recette_id=r.id ORDER BY ordre LIMIT 1)
          ) AS thumb
        FROM recettes r
        ORDER BY r.titre ASC
    ")->fetchAll();
    json_out($rows);
}

if ($method === 'GET' && $id) {
    $st = $db->prepare('SELECT * FROM recettes WHERE id=?'); $st->execute([$id]); $r = $st->fetch();
    if (!$r) json_error('Introuvable', 404);

    $ph = $db->prepare('SELECT * FROM recette_photos WHERE recette_id=? ORDER BY ordre'); $ph->execute([$id]); $r['photos'] = $ph->fetchAll();
    json_out($r);
}

if ($method === 'POST' && !$id && $sub !== 'photos') {
    require_role('admin', 'editeur');
    $b = body();
    if (empty($b['titre']) || empty($b['contenu'])) json_error('Titre et contenu requis');
    $db->prepare('INSERT INTO recettes (titre,description,ingredients,contenu,date_recette,auteur) VALUES (?,?,?,?,?,?)')->execute([$b['titre'], $b['description'] ?: null, $b['ingredients'] ?: null, $b['contenu'], $b['date_recette'] ?: null, $b['auteur'] ?: null]);
    log_modification('recette', 'ajout', $b['titre'], $user['nom'], $db->lastInsertId());
    json_out(['id' => $db->lastInsertId()]);
}

if ($method === 'PUT' && $id && !$sub) {
    require_role('admin', 'editeur');
    $b = body();
    $db->prepare('UPDATE recettes SET titre=?,description=?,ingredients=?,contenu=?,date_recette=?,auteur=? WHERE id=?')->execute([$b['titre'], $b['description'] ?: null, $b['ingredients'] ?: null, $b['contenu'], $b['date_recette'] ?: null, $b['auteur'] ?: null, $id]);
    log_modification('recette', 'modification', $b['titre'], $user['nom'], $id);
    json_out(['ok' => true]);
}

if ($method === 'DELETE' && $id && !$sub) {
    require_role('admin', 'editeur');
    $rec = $db->prepare('SELECT titre FROM recettes WHERE id=?'); $rec->execute([$id]); $rec = $rec->fetch();
    $photos = $db->prepare('SELECT chemin,chemin_thumb FROM recette_photos WHERE recette_id=?'); $photos->execute([$id]);
    foreach ($photos->fetchAll() as $ph) { del_file($ph['chemin']); del_file($ph['chemin_thumb']); }
    $db->prepare('DELETE FROM recettes WHERE id=?')->execute([$id]);
    if ($rec) log_modification('recette', 'suppression', $rec['titre'], $user['nom'], $id);
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
        if (!in_array($mime, ['image/jpeg','image/png','image/webp','image/gif'], true)) json_error('Format non supporté');
        $name = bin2hex(random_bytes(12));
        $dest = UPLOAD_DIR.$name.'.jpg'; $thumb = THUMB_DIR.$name.'_thumb.jpg';
        $src = load_img($file['tmp_name'], $mime);
        rsave($src, imagesx($src), imagesy($src), $dest, 1600, false);
        rsave($src, imagesx($src), imagesy($src), $thumb, 300, true);
        imagedestroy($src);
        $c = UPLOAD_URL.$name.'.jpg'; $ct = THUMB_URL.$name.'_thumb.jpg';
        $db->prepare('INSERT INTO recette_photos (recette_id,chemin,chemin_thumb,legende,ordre) VALUES (?,?,?,?,?)')->execute([$id, $c, $ct, $_POST['legende'] ?? null, (int)($_POST['ordre'] ?? 0)]);
        $photo_id = $db->lastInsertId();
        // Première photo → avatar automatique
        $rc = $db->prepare('SELECT photo_id FROM recettes WHERE id=?'); $rc->execute([$id]); $rc = $rc->fetch();
        if (!$rc['photo_id']) $db->prepare('UPDATE recettes SET photo_id=? WHERE id=?')->execute([$photo_id, $id]);
        $rc_name = $db->prepare('SELECT titre FROM recettes WHERE id=?'); $rc_name->execute([$id]); $rc_name = $rc_name->fetchColumn() ?: '';
        log_modification('recette', 'ajout', 'Photo : ' . $rc_name, $user['nom'], $id);
        json_out(['id' => $photo_id, 'chemin' => $c, 'chemin_thumb' => $ct]);
    }
    if ($method === 'PUT' && $subid) {
        $db->prepare('UPDATE recettes SET photo_id=? WHERE id=?')->execute([$subid, $id]);
        json_out(['ok' => true]);
    }
    if ($method === 'DELETE' && $subid) {
        $ph = $db->prepare('SELECT * FROM recette_photos WHERE id=?'); $ph->execute([$subid]); $ph = $ph->fetch();
        if ($ph) { del_file($ph['chemin']); del_file($ph['chemin_thumb']); $db->prepare('DELETE FROM recette_photos WHERE id=?')->execute([$subid]); }
        json_out(['ok' => true]);
    }
}

json_error('Requête non reconnue', 400);

function load_img(string $p, string $m) { return match($m) {'image/png'=>imagecreatefrompng($p),'image/gif'=>imagecreatefromgif($p),'image/webp'=>imagecreatefromwebp($p),default=>imagecreatefromjpeg($p)}; }
function rsave($s, int $ow, int $oh, string $d, int $mx, bool $cr): void { if($cr){$r=max($mx/$ow,$mx/$oh);$cw=(int)round($mx/$r);$ch=(int)round($mx/$r);$cx=(int)round(($ow-$cw)/2);$cy=(int)round(($oh-$ch)/2);$i=imagecreatetruecolor($mx,$mx);imagecopyresampled($i,$s,0,0,$cx,$cy,$mx,$mx,$cw,$ch);}else{$r=min($mx/$ow,$mx/$oh,1);$nw=(int)round($ow*$r);$nh=(int)round($oh*$r);$i=imagecreatetruecolor($nw,$nh);imagecopyresampled($i,$s,0,0,0,0,$nw,$nh,$ow,$oh);}imagejpeg($i,$d,85);imagedestroy($i); }
function del_file(?string $p): void { if($p && file_exists(__DIR__.'/../'.$p)) @unlink(__DIR__.'/../'.$p); }
