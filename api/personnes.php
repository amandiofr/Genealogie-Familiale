<?php
require_once __DIR__ . '/../config.php';
header('Content-Type: application/json; charset=utf-8');

$user   = require_auth();
$db     = pdo();
$method = $_SERVER['REQUEST_METHOD'];
$id     = (int)($_GET['id']    ?? 0);
$sub    = $_GET['sub']   ?? '';   // 'photos' | 'liens'
$subid  = (int)($_GET['subid'] ?? 0);

// ── GET liste ────────────────────────────────────────────────────────────────
if ($method === 'GET' && !$id) {
    $rows = $db->query("
        SELECT p.*, ph.chemin_thumb
        FROM   personnes p
        LEFT JOIN photos ph ON ph.id = p.photo_id
        ORDER BY p.generation, p.nom, p.prenom
    ")->fetchAll();
    json_out($rows);
}

// ── GET fiche complète ───────────────────────────────────────────────────────
if ($method === 'GET' && $id) {
    $st = $db->prepare('SELECT * FROM personnes WHERE id=?');
    $st->execute([$id]);
    $p = $st->fetch();
    if (!$p) json_error('Introuvable', 404);

    // Photos
    $ph = $db->prepare('SELECT * FROM photos WHERE personne_id=? ORDER BY ordre,id');
    $ph->execute([$id]); $p['photos'] = $ph->fetchAll();

    // Liens avec infos de l'autre personne
    $li = $db->prepare("
        SELECT l.*, pe.prenom, pe.nom, pe.genre, pe.naissance, pe.deces, pe.vivant,
               ph2.chemin_thumb
        FROM liens l
        JOIN personnes pe ON pe.id = IF(l.personne_a=?, l.personne_b, l.personne_a)
        LEFT JOIN photos ph2 ON ph2.id = pe.photo_id
        WHERE l.personne_a=? OR l.personne_b=?
    ");
    $li->execute([$id, $id, $id]); $p['liens'] = $li->fetchAll();

    // Événements
    $ev = $db->prepare("
        SELECT e.* FROM evenements e
        JOIN evenement_personnes ep ON ep.evenement_id=e.id
        WHERE ep.personne_id=? ORDER BY e.date_debut DESC
    ");
    $ev->execute([$id]); $p['evenements'] = $ev->fetchAll();

    // Anecdotes
    $an = $db->prepare("
        SELECT a.* FROM anecdotes a
        JOIN anecdote_personnes ap ON ap.anecdote_id=a.id
        WHERE ap.personne_id=? ORDER BY a.date_anec DESC
    ");
    $an->execute([$id]); $p['anecdotes'] = $an->fetchAll();

    json_out($p);
}

// ── POST créer ───────────────────────────────────────────────────────────────
if ($method === 'POST' && !$id) {
    require_role('admin', 'editeur');
    $b = body();
    if (empty($b['prenom']) || empty($b['nom'])) json_error('Prénom et nom requis');

    $st = $db->prepare("
        INSERT INTO personnes (prenom,nom,nom_naiss,genre,naissance,lieu_naiss,deces,lieu_deces,vivant,generation,profession,biographie)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
    ");
    $st->execute([
        $b['prenom'], $b['nom'],
        $b['nom_naiss']  ?: null,
        $b['genre']      ?? 'male',
        $b['naissance']  ?: null,
        $b['lieu_naiss'] ?: null,
        $b['deces']      ?: null,
        $b['lieu_deces'] ?: null,
        isset($b['deces']) && $b['deces'] ? 0 : 1,
        (int)($b['generation'] ?? 0),
        $b['profession'] ?: null,
        $b['biographie'] ?: null,
    ]);
    json_out(['id' => $db->lastInsertId()]);
}

// ── PUT modifier ─────────────────────────────────────────────────────────────
if ($method === 'PUT' && $id && !$sub) {
    require_role('admin', 'editeur');
    $b = body();
    $db->prepare("
        UPDATE personnes SET prenom=?,nom=?,nom_naiss=?,genre=?,naissance=?,lieu_naiss=?,
               deces=?,lieu_deces=?,vivant=?,generation=?,profession=?,biographie=?
        WHERE id=?
    ")->execute([
        $b['prenom'], $b['nom'],
        $b['nom_naiss']  ?: null,
        $b['genre']      ?? 'male',
        $b['naissance']  ?: null,
        $b['lieu_naiss'] ?: null,
        $b['deces']      ?: null,
        $b['lieu_deces'] ?: null,
        isset($b['deces']) && $b['deces'] ? 0 : 1,
        (int)($b['generation'] ?? 0),
        $b['profession'] ?: null,
        $b['biographie'] ?: null,
        $id,
    ]);
    json_out(['ok' => true]);
}

// ── DELETE supprimer ─────────────────────────────────────────────────────────
if ($method === 'DELETE' && $id && !$sub) {
    require_role('admin');
    $db->prepare('DELETE FROM personnes WHERE id=?')->execute([$id]);
    json_out(['ok' => true]);
}

// ════════════════════════════════════════════════════════════════════
//  SOUS-RESSOURCES
// ════════════════════════════════════════════════════════════════════

// ── LIENS ────────────────────────────────────────────────────────────────────
if ($sub === 'liens') {
    require_role('admin', 'editeur');

    if ($method === 'POST') {
        $b = body();
        try {
            $db->prepare("INSERT INTO liens (personne_a,personne_b,type,date_debut,date_fin,notes) VALUES (?,?,?,?,?,?)")
               ->execute([$id, $b['personne_b'], $b['type'], $b['date_debut'] ?: null, $b['date_fin'] ?: null, $b['notes'] ?: null]);
            json_out(['id' => $db->lastInsertId()]);
        } catch (PDOException) {
            json_error('Lien déjà existant', 409);
        }
    }

    if ($method === 'DELETE' && $subid) {
        $db->prepare('DELETE FROM liens WHERE id=? AND (personne_a=? OR personne_b=?)')->execute([$subid, $id, $id]);
        json_out(['ok' => true]);
    }
}

// ── PHOTOS ───────────────────────────────────────────────────────────────────
if ($sub === 'photos') {
    require_role('admin', 'editeur');

    if ($method === 'POST') {
        if (empty($_FILES['photo'])) json_error('Aucun fichier');
        $result = save_photo($_FILES['photo'], $id);
        json_out($result);
    }

    // Définir photo principale
    if ($method === 'PUT' && $subid) {
        $db->prepare('UPDATE personnes SET photo_id=? WHERE id=?')->execute([$subid, $id]);
        json_out(['ok' => true]);
    }

    if ($method === 'DELETE' && $subid) {
        $photo = $db->prepare('SELECT * FROM photos WHERE id=?');
        $photo->execute([$subid]); $photo = $photo->fetch();
        if ($photo) {
            delete_file($photo['chemin']); delete_file($photo['chemin_thumb']);
            $db->prepare('DELETE FROM photos WHERE id=?')->execute([$subid]);
            // Réassigner photo principale si besoin
            $p = $db->prepare('SELECT photo_id FROM personnes WHERE id=?');
            $p->execute([$id]); $p = $p->fetch();
            if ((int)$p['photo_id'] === $subid) {
                $next = $db->prepare('SELECT id FROM photos WHERE personne_id=? ORDER BY ordre LIMIT 1');
                $next->execute([$id]); $next = $next->fetch();
                $db->prepare('UPDATE personnes SET photo_id=? WHERE id=?')->execute([$next['id'] ?? null, $id]);
            }
        }
        json_out(['ok' => true]);
    }
}

json_error('Requête non reconnue', 400);

// ─────────────────────────────────────────────────────────────
//  Helpers photo
// ─────────────────────────────────────────────────────────────
function save_photo(array $file, int $personne_id): array {
    global $db;
    if ($file['error'] !== UPLOAD_ERR_OK) throw new RuntimeException('Erreur upload');
    if ($file['size']  > MAX_UPLOAD_SIZE)  json_error('Fichier trop volumineux (max 20 Mo)');
    $mime = mime_content_type($file['tmp_name']);
    if (!in_array($mime, ['image/jpeg','image/png','image/webp','image/gif'], true)) json_error('Format non supporté');

    $name  = bin2hex(random_bytes(12));
    $dest  = UPLOAD_DIR . $name . '.jpg';
    $thumb = THUMB_DIR  . $name . '_thumb.jpg';

    // Redimensionnement avec GD (disponible sur tous les hébergements mutualisés)
    $src_img = match($mime) {
        'image/png'  => imagecreatefrompng($file['tmp_name']),
        'image/gif'  => imagecreatefromgif($file['tmp_name']),
        'image/webp' => imagecreatefromwebp($file['tmp_name']),
        default      => imagecreatefromjpeg($file['tmp_name']),
    };
    if (!$src_img) json_error('Impossible de lire l\'image');

    $ow = imagesx($src_img); $oh = imagesy($src_img);

    // Original max 1600px
    if ($ow > 1600 || $oh > 1600) {
        $ratio  = min(1600/$ow, 1600/$oh);
        $nw = (int)round($ow * $ratio); $nh = (int)round($oh * $ratio);
        $img = imagecreatetruecolor($nw, $nh);
        imagecopyresampled($img, $src_img, 0,0,0,0, $nw,$nh,$ow,$oh);
        imagejpeg($img, $dest, 85); imagedestroy($img);
    } else {
        imagejpeg($src_img, $dest, 85);
    }

    // Thumbnail 300×300 crop center
    $tw = 300; $th = 300;
    $ratio_c = max($tw/$ow, $th/$oh);
    $cw = (int)round($tw/$ratio_c); $ch = (int)round($th/$ratio_c);
    $cx = (int)round(($ow-$cw)/2);  $cy = (int)round(($oh-$ch)/2);
    $timg = imagecreatetruecolor($tw, $th);
    imagecopyresampled($timg, $src_img, 0,0,$cx,$cy, $tw,$th,$cw,$ch);
    imagejpeg($timg, $thumb, 80); imagedestroy($timg);
    imagedestroy($src_img);

    $chemin       = UPLOAD_URL . $name . '.jpg';
    $chemin_thumb = THUMB_URL  . $name . '_thumb.jpg';

    $st = $db->prepare('INSERT INTO photos (personne_id,chemin,chemin_thumb,legende,date_photo,ordre) VALUES (?,?,?,?,?,?)');
    $st->execute([$personne_id, $chemin, $chemin_thumb, $_POST['legende'] ?? null, $_POST['date_photo'] ?? null, (int)($_POST['ordre'] ?? 0)]);
    $photo_id = $db->lastInsertId();

    // Première photo → photo principale
    $p = $db->prepare('SELECT photo_id FROM personnes WHERE id=?');
    $p->execute([$personne_id]); $p = $p->fetch();
    if (!$p['photo_id']) $db->prepare('UPDATE personnes SET photo_id=? WHERE id=?')->execute([$photo_id, $personne_id]);

    return ['id' => $photo_id, 'chemin' => $chemin, 'chemin_thumb' => $chemin_thumb];
}

function delete_file(?string $path): void {
    if (!$path) return;
    $full = __DIR__ . '/../' . $path;
    if (file_exists($full)) @unlink($full);
}
