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
          GROUP_CONCAT(p.prenom SEPARATOR ', ') AS personnes_noms,
          COALESCE(
            (SELECT chemin_thumb FROM anecdote_photos WHERE id=a.photo_id AND anecdote_id=a.id LIMIT 1),
            (SELECT chemin_thumb FROM anecdote_photos WHERE anecdote_id=a.id ORDER BY ordre LIMIT 1)
          ) AS thumb
        FROM anecdotes a
        LEFT JOIN anecdote_personnes ap ON ap.anecdote_id=a.id
        LEFT JOIN personnes p ON p.id=ap.personne_id
        GROUP BY a.id
        ORDER BY a.date_anec IS NULL, a.date_anec DESC, a.created_at DESC
    ")->fetchAll();
    json_out($rows);
}

if ($method === 'GET' && $id) {
    $st = $db->prepare('SELECT * FROM anecdotes WHERE id=?'); $st->execute([$id]); $a = $st->fetch();
    if (!$a) json_error('Introuvable',404);

    $pp = $db->prepare("SELECT p.id,p.prenom,p.nom,p.genre,ph.chemin_thumb FROM anecdote_personnes ap JOIN personnes p ON p.id=ap.personne_id LEFT JOIN photos ph ON ph.id=p.photo_id WHERE ap.anecdote_id=?");
    $pp->execute([$id]); $a['personnes'] = $pp->fetchAll();

    $ph = $db->prepare('SELECT * FROM anecdote_photos WHERE anecdote_id=? ORDER BY ordre'); $ph->execute([$id]); $a['photos'] = $ph->fetchAll();
    json_out($a);
}

if ($method === 'POST' && !$id && $sub !== 'photos') {
    require_role('admin','editeur');
    $b = body();
    if (empty($b['titre'])||empty($b['contenu'])) json_error('Titre et contenu requis');
    $db->prepare('INSERT INTO anecdotes (titre,contenu,date_anec,auteur) VALUES (?,?,?,?)')->execute([$b['titre'],$b['contenu'],$b['date_anec']?:null,$b['auteur']?:null]);
    $aid = $db->lastInsertId();
    if (!empty($b['personnes'])) {
        $ins=$db->prepare('INSERT IGNORE INTO anecdote_personnes (anecdote_id,personne_id) VALUES (?,?)');
        foreach ($b['personnes'] as $pid) $ins->execute([$aid,$pid]);
    }
    log_modification('anecdote', 'ajout', $b['titre'], $user['nom']);
    json_out(['id'=>$aid]);
}

if ($method === 'PUT' && $id && !$sub) {
    require_role('admin','editeur');
    $b = body();
    $db->prepare('UPDATE anecdotes SET titre=?,contenu=?,date_anec=?,auteur=? WHERE id=?')->execute([$b['titre'],$b['contenu'],$b['date_anec']?:null,$b['auteur']?:null,$id]);
    if (isset($b['personnes'])) {
        $db->prepare('DELETE FROM anecdote_personnes WHERE anecdote_id=?')->execute([$id]);
        $ins=$db->prepare('INSERT IGNORE INTO anecdote_personnes (anecdote_id,personne_id) VALUES (?,?)');
        foreach ($b['personnes'] as $pid) $ins->execute([$id,$pid]);
    }
    log_modification('anecdote', 'modification', $b['titre'], $user['nom']);
    json_out(['ok'=>true]);
}

if ($method === 'DELETE' && $id && !$sub) {
    require_role('admin','editeur');
    $an=$db->prepare('SELECT titre FROM anecdotes WHERE id=?'); $an->execute([$id]); $an=$an->fetch();
    $photos=$db->prepare('SELECT chemin,chemin_thumb FROM anecdote_photos WHERE anecdote_id=?'); $photos->execute([$id]);
    foreach ($photos->fetchAll() as $ph) { del_file($ph['chemin']); del_file($ph['chemin_thumb']); }
    $db->prepare('DELETE FROM anecdotes WHERE id=?')->execute([$id]);
    if ($an) log_modification('anecdote', 'suppression', $an['titre'], $user['nom']);
    json_out(['ok'=>true]);
}

if ($sub==='photos') {
    require_role('admin','editeur');
    if ($method==='POST'&&$id) {
        if (empty($_FILES['photo'])) json_error('Aucun fichier');
        $file=$_FILES['photo'];
        if ($file['error']!==UPLOAD_ERR_OK) json_error('Erreur upload');
        if ($file['size']>MAX_UPLOAD_SIZE) json_error('Fichier trop volumineux');
        $mime=mime_content_type($file['tmp_name']);
        if (!in_array($mime,['image/jpeg','image/png','image/webp','image/gif'],true)) json_error('Format non supporté');
        $name=bin2hex(random_bytes(12));
        $dest=UPLOAD_DIR.$name.'.jpg'; $thumb=THUMB_DIR.$name.'_thumb.jpg';
        $src=load_img($file['tmp_name'],$mime);
        rsave($src,imagesx($src),imagesy($src),$dest,1600,false);
        rsave($src,imagesx($src),imagesy($src),$thumb,300,true);
        imagedestroy($src);
        $c=UPLOAD_URL.$name.'.jpg'; $ct=THUMB_URL.$name.'_thumb.jpg';
        $db->prepare('INSERT INTO anecdote_photos (anecdote_id,chemin,chemin_thumb,legende,ordre) VALUES (?,?,?,?,?)')->execute([$id,$c,$ct,$_POST['legende']??null,(int)($_POST['ordre']??0)]);
        json_out(['id'=>$db->lastInsertId(),'chemin'=>$c,'chemin_thumb'=>$ct]);
    }
    if ($method==='PUT'&&$subid) {
        require_role('admin','editeur');
        $db->prepare('UPDATE anecdotes SET photo_id=? WHERE id=?')->execute([$subid, $id]);
        json_out(['ok'=>true]);
    }
    if ($method==='DELETE'&&$subid) {
        $ph=$db->prepare('SELECT * FROM anecdote_photos WHERE id=?'); $ph->execute([$subid]); $ph=$ph->fetch();
        if ($ph){del_file($ph['chemin']);del_file($ph['chemin_thumb']);$db->prepare('DELETE FROM anecdote_photos WHERE id=?')->execute([$subid]);}
        json_out(['ok'=>true]);
    }
}

json_error('Requête non reconnue',400);

function load_img(string $p,string $m){ return match($m){'image/png'=>imagecreatefrompng($p),'image/gif'=>imagecreatefromgif($p),'image/webp'=>imagecreatefromwebp($p),default=>imagecreatefromjpeg($p)}; }
function rsave($s,int $ow,int $oh,string $d,int $mx,bool $cr):void{if($cr){$r=max($mx/$ow,$mx/$oh);$cw=(int)round($mx/$r);$ch=(int)round($mx/$r);$cx=(int)round(($ow-$cw)/2);$cy=(int)round(($oh-$ch)/2);$i=imagecreatetruecolor($mx,$mx);imagecopyresampled($i,$s,0,0,$cx,$cy,$mx,$mx,$cw,$ch);}else{$r=min($mx/$ow,$mx/$oh,1);$nw=(int)round($ow*$r);$nh=(int)round($oh*$r);$i=imagecreatetruecolor($nw,$nh);imagecopyresampled($i,$s,0,0,0,0,$nw,$nh,$ow,$oh);}imagejpeg($i,$d,85);imagedestroy($i);}
function del_file(?string $p):void{if($p&&file_exists(__DIR__.'/../'.$p))@unlink(__DIR__.'/../'.$p);}
