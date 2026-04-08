<?php
require_once __DIR__ . '/../config.php';

$user   = require_auth();
$db     = pdo();
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// ── GET : collecter tous les lieux uniques de la BD ───────────────────────────
if ($method === 'GET' && $action === 'collect') {
    $sql = "
        SELECT DISTINCT lieu FROM (
            SELECT lieu_naiss AS lieu FROM personnes WHERE lieu_naiss IS NOT NULL AND lieu_naiss != ''
            UNION
            SELECT lieu FROM evenements WHERE lieu IS NOT NULL AND lieu != '' AND type = 'demenagement'
        ) AS t
        ORDER BY lieu
    ";
    $lieux = $db->query($sql)->fetchAll(PDO::FETCH_COLUMN);

    // Joindre les géocodages existants
    $geocoded = [];
    if ($lieux) {
        $in = implode(',', array_fill(0, count($lieux), '?'));
        $rows = $db->prepare("SELECT * FROM lieux_geocodes WHERE nom_approx IN ($in)")->execute($lieux);
        $stmt = $db->prepare("SELECT * FROM lieux_geocodes WHERE nom_approx IN ($in)");
        $stmt->execute($lieux);
        foreach ($stmt->fetchAll() as $r) $geocoded[$r['nom_approx']] = $r;
    }

    $result = array_map(fn($l) => array_merge(
        ['nom_approx' => $l, 'nom_normalise' => null, 'lat' => null, 'lng' => null],
        $geocoded[$l] ?? []
    ), $lieux);

    json_out($result);
}

// ── GET : retourner tous les géocodages ───────────────────────────────────────
if ($method === 'GET') {
    $rows = $db->query("SELECT * FROM lieux_geocodes WHERE lat IS NOT NULL")->fetchAll();
    json_out($rows);
}

// ── POST : géocoder un lieu via Google Maps ───────────────────────────────────
if ($method === 'POST' && $action === 'geocode') {
    require_role('admin');
    $b   = body();
    $nom = trim($b['nom'] ?? '');
    if (!$nom) json_error('Nom manquant');

    $url = 'https://maps.googleapis.com/maps/api/geocode/json?address=' . urlencode($nom) . '&key=' . urlencode(GOOGLE_API_KEY);
    $ctx = stream_context_create(['http' => ['timeout' => 8]]);
    if (!GOOGLE_API_KEY) json_error('Clé Google Maps non configurée (GOOGLE_API_KEY vide)');
    $resp = @file_get_contents($url, false, $ctx);
    if (!$resp) json_error('Erreur géocodage (réseau)');

    $data = json_decode($resp, true);
    if (!empty($data['error_message'])) json_error('Google: ' . $data['error_message']);
    if (empty($data['results'][0])) json_out(['found' => false, 'nom_approx' => $nom]);

    $r   = $data['results'][0];
    $lat = $r['geometry']['location']['lat'];
    $lng = $r['geometry']['location']['lng'];
    $nom_normalise = $r['formatted_address'];

    $db->prepare("INSERT INTO lieux_geocodes (nom_approx, nom_normalise, lat, lng)
                  VALUES (?,?,?,?)
                  ON DUPLICATE KEY UPDATE nom_normalise=VALUES(nom_normalise), lat=VALUES(lat), lng=VALUES(lng), updated_at=NOW()")
       ->execute([$nom, $nom_normalise, $lat, $lng]);

    json_out(['nom_approx' => $nom, 'nom_normalise' => $nom_normalise, 'lat' => $lat, 'lng' => $lng]);
}

// ── PUT : mise à jour manuelle ────────────────────────────────────────────────
if ($method === 'PUT') {
    require_role('admin');
    $b = body();
    $nom = trim($b['nom_approx'] ?? '');
    if (!$nom) json_error('Nom manquant');

    $db->prepare("INSERT INTO lieux_geocodes (nom_approx, nom_normalise, lat, lng)
                  VALUES (?,?,?,?)
                  ON DUPLICATE KEY UPDATE nom_normalise=VALUES(nom_normalise), lat=VALUES(lat), lng=VALUES(lng), updated_at=NOW()")
       ->execute([$nom, $b['nom_normalise'] ?? null, $b['lat'] ?? null, $b['lng'] ?? null]);

    json_out(['ok' => true]);
}

json_error('Action inconnue', 404);
