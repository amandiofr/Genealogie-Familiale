<?php
require_once __DIR__ . '/../config.php';
header('Content-Type: application/json; charset=utf-8');

$user   = require_auth();
$db     = pdo();
$method = $_SERVER['REQUEST_METHOD'];
$id     = (int)($_GET['id']    ?? 0);
$sub    = $_GET['sub']   ?? '';
$subid  = (int)($_GET['subid'] ?? 0);

// ── GET liste ────────────────────────────────────────────────────────────────
if ($method === 'GET' && !$id) {
    $rows = $db->query("
        SELECT e.*,
          (SELECT COUNT(*) FROM reunion_personnes WHERE reunion_id=e.id) AS nb_personnes,
          (SELECT GROUP_CONCAT(DISTINCT personne_id) FROM reunion_personnes WHERE reunion_id=e.id) AS personne_ids,
          COALESCE(
            (SELECT chemin_thumb FROM reunion_photos WHERE id=e.photo_id AND reunion_id=e.id LIMIT 1),
            (SELECT chemin_thumb FROM reunion_photos WHERE reunion_id=e.id ORDER BY ordre LIMIT 1)
          ) AS thumb
        FROM reunions e ORDER BY e.date_debut DESC, e.created_at DESC
    ")->fetchAll();
    foreach ($rows as &$row) {
        $row['personne_ids'] = $row['personne_ids']
            ? array_map('intval', explode(',', $row['personne_ids'])) : [];
    }
    json_out($rows);
}

// ── GET détail ───────────────────────────────────────────────────────────────
if ($method === 'GET' && $id) {
    $st = $db->prepare('SELECT * FROM reunions WHERE id=?');
    $st->execute([$id]); $e = $st->fetch();
    if (!$e) json_error('Introuvable', 404);

    $pp = $db->prepare("
        SELECT p.id,p.prenom,p.nom,p.genre,ep.role, ph.chemin_thumb
        FROM reunion_personnes ep
        JOIN personnes p ON p.id=ep.personne_id
        LEFT JOIN photos ph ON ph.id=p.photo_id
        WHERE ep.reunion_id=?
    ");
    $pp->execute([$id]); $e['personnes'] = $pp->fetchAll();

    $ph = $db->prepare('SELECT * FROM reunion_photos WHERE reunion_id=? ORDER BY ordre');
    $ph->execute([$id]); $e['photos'] = $ph->fetchAll();

    $e['thumb'] = null;
    foreach ($e['photos'] as $p) {
        if ($e['photo_id'] && $p['id'] == $e['photo_id']) { $e['thumb'] = $p['chemin_thumb']; break; }
    }
    if (!$e['thumb'] && !empty($e['photos'])) $e['thumb'] = $e['photos'][0]['chemin_thumb'];

    json_out($e);
}

// ── POST créer ───────────────────────────────────────────────────────────────
if ($method === 'POST' && !$id && $sub !== 'photos') {
    require_role('admin','editeur');
    $b = body();
    if (empty($b['titre'])) json_error('Titre requis');

    $db->prepare("INSERT INTO reunions (titre,date_debut,date_fin,lieu,description) VALUES (?,?,?,?,?)")
       ->execute([$b['titre'],$b['date_debut']?:null,$b['date_fin']?:null,$b['lieu']?:null,$b['description']?:null]);
    $eid = $db->lastInsertId();

    if (!empty($b['personnes'])) {
        $ins = $db->prepare('INSERT IGNORE INTO reunion_personnes (reunion_id,personne_id,role) VALUES (?,?,?)');
        foreach ($b['personnes'] as $p) $ins->execute([$eid, $p['id'], $p['role'] ?? null]);
    }
    log_modification('reunion', 'ajout', $b['titre'], $user['nom'], $eid);
    json_out(['id' => $eid]);
}

// ── PUT modifier ─────────────────────────────────────────────────────────────
if ($method === 'PUT' && $id && !$sub) {
    require_role('admin','editeur');
    $b = body();
    $db->prepare("UPDATE reunions SET titre=?,date_debut=?,date_fin=?,lieu=?,description=? WHERE id=?")
       ->execute([$b['titre'],$b['date_debut']?:null,$b['date_fin']?:null,$b['lieu']?:null,$b['description']?:null,$id]);

    if (isset($b['personnes'])) {
        $db->prepare('DELETE FROM reunion_personnes WHERE reunion_id=?')->execute([$id]);
        $ins = $db->prepare('INSERT IGNORE INTO reunion_personnes (reunion_id,personne_id,role) VALUES (?,?,?)');
        foreach ($b['personnes'] as $p) $ins->execute([$id, $p['id'], $p['role'] ?? null]);
    }
    log_modification('reunion', 'modification', $b['titre'], $user['nom'], $id);
    json_out(['ok' => true]);
}

// ── DELETE ───────────────────────────────────────────────────────────────────
if ($method === 'DELETE' && $id && !$sub) {
    require_role('admin','editeur');
    $re = $db->prepare('SELECT titre FROM reunions WHERE id=?');
    $re->execute([$id]); $re = $re->fetch();
    $photos = $db->prepare('SELECT chemin,chemin_thumb FROM reunion_photos WHERE reunion_id=?');
    $photos->execute([$id]);
    foreach ($photos->fetchAll() as $ph) { del_file_r($ph['chemin']); del_file_r($ph['chemin_thumb']); }
    $db->prepare('DELETE FROM reunions WHERE id=?')->execute([$id]);
    if ($re) log_modification('reunion', 'suppression', $re['titre'], $user['nom'], $id);
    json_out(['ok' => true]);
}

// ── PUT définir photo préférée (avatar) ──────────────────────────────────────
if ($method === 'PUT' && $id && $sub === 'photos' && $subid) {
    require_role('admin','editeur');
    $check = $db->prepare('SELECT id FROM reunion_photos WHERE id=? AND reunion_id=?');
    $check->execute([$subid, $id]);
    if (!$check->fetch()) json_error('Photo introuvable', 404);
    $db->prepare('UPDATE reunions SET photo_id=? WHERE id=?')->execute([$subid, $id]);
    json_out(['ok' => true]);
}

if ($sub === 'photos') {
    require_role('admin','editeur');

    if ($method === 'POST' && $id) {
        if (empty($_FILES['photo'])) json_error('Aucun fichier');
        $file = $_FILES['photo'];
        if ($file['error'] !== UPLOAD_ERR_OK) json_error('Erreur upload');
        if ($file['size'] > MAX_UPLOAD_SIZE)   json_error('Fichier trop volumineux');
        $mime = mime_content_type($file['tmp_name']);
        if (!in_array($mime,['image/jpeg','image/png','image/webp','image/gif'],true)) json_error('Format non supporté');

        $name  = bin2hex(random_bytes(12));
        $dest  = UPLOAD_DIR . $name . '.jpg';
        $thumb = THUMB_DIR  . $name . '_thumb.jpg';
        $src   = load_image_r($file['tmp_name'], $mime);
        resize_save_r($src, imagesx($src), imagesy($src), $dest, 1600, false);
        resize_save_r($src, imagesx($src), imagesy($src), $thumb, 300, true);
        imagedestroy($src);

        $chemin       = UPLOAD_URL . $name . '.jpg';
        $chemin_thumb = THUMB_URL  . $name . '_thumb.jpg';
        $db->prepare('INSERT INTO reunion_photos (reunion_id,chemin,chemin_thumb,legende,ordre) VALUES (?,?,?,?,?)')
           ->execute([$id,$chemin,$chemin_thumb,$_POST['legende']??null,(int)($_POST['ordre']??0)]);
        json_out(['id'=>$db->lastInsertId(),'chemin'=>$chemin,'chemin_thumb'=>$chemin_thumb]);
    }

    if ($method === 'DELETE' && $subid) {
        $ph = $db->prepare('SELECT * FROM reunion_photos WHERE id=?');
        $ph->execute([$subid]); $ph = $ph->fetch();
        if ($ph) { del_file_r($ph['chemin']); del_file_r($ph['chemin_thumb']); $db->prepare('DELETE FROM reunion_photos WHERE id=?')->execute([$subid]); }
        json_out(['ok'=>true]);
    }
}

json_error('Requête non reconnue', 400);

function load_image_r(string $path, string $mime) {
    return match($mime) {
        'image/png'  => imagecreatefrompng($path),
        'image/gif'  => imagecreatefromgif($path),
        'image/webp' => imagecreatefromwebp($path),
        default      => imagecreatefromjpeg($path),
    };
}
function resize_save_r($src, int $ow, int $oh, string $dest, int $max, bool $crop): void {
    if ($crop) {
        $ratio = max($max/$ow,$max/$oh);
        $cw=(int)round($max/$ratio); $ch=(int)round($max/$ratio);
        $cx=(int)round(($ow-$cw)/2); $cy=(int)round(($oh-$ch)/2);
        $img = imagecreatetruecolor($max,$max);
        imagecopyresampled($img,$src,0,0,$cx,$cy,$max,$max,$cw,$ch);
    } else {
        $ratio=min($max/$ow,$max/$oh,1);
        $nw=(int)round($ow*$ratio); $nh=(int)round($oh*$ratio);
        $img = imagecreatetruecolor($nw,$nh);
        imagecopyresampled($img,$src,0,0,0,0,$nw,$nh,$ow,$oh);
    }
    imagejpeg($img,$dest,85); imagedestroy($img);
}
function del_file_r(?string $p): void { if($p&&file_exists(__DIR__.'/../'.$p)) @unlink(__DIR__.'/../'.$p); }
