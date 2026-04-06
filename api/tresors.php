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
        SELECT t.*,
          GROUP_CONCAT(DISTINCT p.prenom ORDER BY p.prenom SEPARATOR ', ') AS personnes_noms,
          GROUP_CONCAT(DISTINCT tp.personne_id) AS personne_ids,
          COALESCE(
            (SELECT chemin_thumb FROM tresor_photos WHERE id=t.photo_id AND tresor_id=t.id LIMIT 1),
            (SELECT chemin_thumb FROM tresor_photos WHERE tresor_id=t.id ORDER BY ordre LIMIT 1)
          ) AS thumb
        FROM tresors t
        LEFT JOIN tresor_personnes tp ON tp.tresor_id=t.id
        LEFT JOIN personnes p ON p.id=tp.personne_id
        GROUP BY t.id
        ORDER BY t.date_tresor IS NULL, t.date_tresor DESC, t.created_at DESC
    ")->fetchAll();
    foreach ($rows as &$row) {
        $row['personne_ids'] = $row['personne_ids']
            ? array_map('intval', explode(',', $row['personne_ids'])) : [];
    }
    json_out($rows);
}

if ($method === 'GET' && $id) {
    $st = $db->prepare('SELECT * FROM tresors WHERE id=?'); $st->execute([$id]); $t = $st->fetch();
    if (!$t) json_error('Introuvable', 404);

    $pp = $db->prepare("SELECT p.id,p.prenom,p.nom,p.genre,ph.chemin_thumb FROM tresor_personnes tp JOIN personnes p ON p.id=tp.personne_id LEFT JOIN photos ph ON ph.id=p.photo_id WHERE tp.tresor_id=?");
    $pp->execute([$id]); $t['personnes'] = $pp->fetchAll();

    $ph = $db->prepare('SELECT * FROM tresor_photos WHERE tresor_id=? ORDER BY ordre'); $ph->execute([$id]); $t['photos'] = $ph->fetchAll();
    json_out($t);
}

if ($method === 'POST' && !$id && $sub !== 'photos') {
    require_role('admin', 'editeur');
    $b = body();
    if (empty($b['titre']) || empty($b['contenu'])) json_error('Titre et contenu requis');
    $db->prepare('INSERT INTO tresors (titre,contenu,date_tresor,auteur) VALUES (?,?,?,?)')->execute([$b['titre'], $b['contenu'], $b['date_tresor'] ?: null, $b['auteur'] ?: null]);
    $tid = $db->lastInsertId();
    if (!empty($b['personnes'])) {
        $ins = $db->prepare('INSERT IGNORE INTO tresor_personnes (tresor_id,personne_id) VALUES (?,?)');
        foreach ($b['personnes'] as $pid) $ins->execute([$tid, $pid]);
    }
    log_modification('tresor', 'ajout', $b['titre'], $user['nom']);
    json_out(['id' => $tid]);
}

if ($method === 'PUT' && $id && !$sub) {
    require_role('admin', 'editeur');
    $b = body();
    $db->prepare('UPDATE tresors SET titre=?,contenu=?,date_tresor=?,auteur=? WHERE id=?')->execute([$b['titre'], $b['contenu'], $b['date_tresor'] ?: null, $b['auteur'] ?: null, $id]);
    if (isset($b['personnes'])) {
        $db->prepare('DELETE FROM tresor_personnes WHERE tresor_id=?')->execute([$id]);
        $ins = $db->prepare('INSERT IGNORE INTO tresor_personnes (tresor_id,personne_id) VALUES (?,?)');
        foreach ($b['personnes'] as $pid) $ins->execute([$id, $pid]);
    }
    log_modification('tresor', 'modification', $b['titre'], $user['nom']);
    json_out(['ok' => true]);
}

if ($method === 'DELETE' && $id && !$sub) {
    require_role('admin', 'editeur');
    $tr = $db->prepare('SELECT titre FROM tresors WHERE id=?'); $tr->execute([$id]); $tr = $tr->fetch();
    $photos = $db->prepare('SELECT chemin,chemin_thumb FROM tresor_photos WHERE tresor_id=?'); $photos->execute([$id]);
    foreach ($photos->fetchAll() as $ph) { del_file($ph['chemin']); del_file($ph['chemin_thumb']); }
    $db->prepare('DELETE FROM tresors WHERE id=?')->execute([$id]);
    if ($tr) log_modification('tresor', 'suppression', $tr['titre'], $user['nom']);
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
        $db->prepare('INSERT INTO tresor_photos (tresor_id,chemin,chemin_thumb,legende,ordre) VALUES (?,?,?,?,?)')->execute([$id, $c, $ct, $_POST['legende'] ?? null, (int)($_POST['ordre'] ?? 0)]);
        json_out(['id' => $db->lastInsertId(), 'chemin' => $c, 'chemin_thumb' => $ct]);
    }
    if ($method === 'PUT' && $subid) {
        $db->prepare('UPDATE tresors SET photo_id=? WHERE id=?')->execute([$subid, $id]);
        json_out(['ok' => true]);
    }
    if ($method === 'DELETE' && $subid) {
        $ph = $db->prepare('SELECT * FROM tresor_photos WHERE id=?'); $ph->execute([$subid]); $ph = $ph->fetch();
        if ($ph) { del_file($ph['chemin']); del_file($ph['chemin_thumb']); $db->prepare('DELETE FROM tresor_photos WHERE id=?')->execute([$subid]); }
        json_out(['ok' => true]);
    }
}

json_error('Requête non reconnue', 400);

function load_img(string $p, string $m) { return match($m) {'image/png'=>imagecreatefrompng($p),'image/gif'=>imagecreatefromgif($p),'image/webp'=>imagecreatefromwebp($p),default=>imagecreatefromjpeg($p)}; }
function rsave($s, int $ow, int $oh, string $d, int $mx, bool $cr): void { if($cr){$r=max($mx/$ow,$mx/$oh);$cw=(int)round($mx/$r);$ch=(int)round($mx/$r);$cx=(int)round(($ow-$cw)/2);$cy=(int)round(($oh-$ch)/2);$i=imagecreatetruecolor($mx,$mx);imagecopyresampled($i,$s,0,0,$cx,$cy,$mx,$mx,$cw,$ch);}else{$r=min($mx/$ow,$mx/$oh,1);$nw=(int)round($ow*$r);$nh=(int)round($oh*$r);$i=imagecreatetruecolor($nw,$nh);imagecopyresampled($i,$s,0,0,0,0,$nw,$nh,$ow,$oh);}imagejpeg($i,$d,85);imagedestroy($i); }
function del_file(?string $p): void { if($p && file_exists(__DIR__.'/../'.$p)) @unlink(__DIR__.'/../'.$p); }
