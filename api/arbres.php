<?php
require_once __DIR__ . '/../config.php';
session_start_once();
require_auth();
header('Content-Type: application/json; charset=utf-8');

$db = pdo();

// IDs de personnes qui ont au moins un parent (personne_b dans parent_enfant)
$hasParentRows = $db->query("
    SELECT DISTINCT personne_b AS id FROM liens WHERE type = 'parent_enfant'
")->fetchAll();
$hasParent = [];
foreach ($hasParentRows as $r) $hasParent[(int)$r['id']] = true;

// Tous les liens conjoint/fiancailles
$conjointRows = $db->query("
    SELECT l.id AS lien_id,
           pa.id AS id_a, pa.prenom AS prenom_a, pa.genre AS genre_a,
           pb.id AS id_b, pb.prenom AS prenom_b, pb.genre AS genre_b
    FROM liens l
    JOIN personnes pa ON pa.id = l.personne_a
    JOIN personnes pb ON pb.id = l.personne_b
    WHERE l.type IN ('conjoint', 'fiancailles')
    ORDER BY l.id ASC
")->fetchAll();

// 1. Couples-racines : ni l'un ni l'autre n'ont de parents
$couples = [];
$inCouple = [];
foreach ($conjointRows as $c) {
    $idA = (int)$c['id_a'];
    $idB = (int)$c['id_b'];
    if (!isset($hasParent[$idA]) && !isset($hasParent[$idB])) {
        $couples[] = $c;
        $inCouple[$idA] = true;
        $inCouple[$idB] = true;
    }
}

// Personnes qui sont conjoint(e) de quelqu'un qui a des parents → exclure des racines
$conjointOfChild = [];
foreach ($conjointRows as $c) {
    $idA = (int)$c['id_a'];
    $idB = (int)$c['id_b'];
    if (isset($hasParent[$idA])) $conjointOfChild[$idB] = true;
    if (isset($hasParent[$idB])) $conjointOfChild[$idA] = true;
}

// 2. Célibataires-racines : pas de parents, pas dans un couple-racine, pas conjoint d'un enfant
$allPersonnes = $db->query("SELECT id, prenom FROM personnes ORDER BY id ASC")->fetchAll();
$singles = array_values(array_filter($allPersonnes, fn($p) =>
    !isset($hasParent[(int)$p['id']]) &&
    !isset($inCouple[(int)$p['id']]) &&
    !isset($conjointOfChild[(int)$p['id']])
));

// 3. Tous les liens parent_enfant pour le BFS
$linkRows = $db->query("
    SELECT personne_a, personne_b FROM liens WHERE type = 'parent_enfant'
")->fetchAll();

$childrenMap = [];
foreach ($linkRows as $lr) {
    $childrenMap[(int)$lr['personne_a']][] = (int)$lr['personne_b'];
}

function bfs(array $rootIds, array $childrenMap): array {
    $visited = [];
    $queue = $rootIds;
    foreach ($rootIds as $id) $visited[$id] = true;
    while (!empty($queue)) {
        $pid = array_shift($queue);
        foreach (($childrenMap[$pid] ?? []) as $cid) {
            if (!isset($visited[$cid])) {
                $visited[$cid] = true;
                $queue[] = $cid;
            }
        }
    }
    return array_keys($visited);
}

$arbres = [];

foreach ($couples as $c) {
    $rootIds = [(int)$c['id_a'], (int)$c['id_b']];
    $membres = bfs($rootIds, $childrenMap);
    $isMaleA = $c['genre_a'] === 'male';
    $pere    = $isMaleA ? $c['prenom_a'] : $c['prenom_b'];
    $mere    = $isMaleA ? $c['prenom_b'] : $c['prenom_a'];
    $arbres[] = ['id' => 'c_' . $c['lien_id'], 'prenom_a' => $pere, 'prenom_b' => $mere, 'racine' => $rootIds, 'membres' => $membres];
}

foreach ($singles as $p) {
    $rootIds = [(int)$p['id']];
    $membres = bfs($rootIds, $childrenMap);
    $arbres[] = ['id' => 'p_' . $p['id'], 'prenom_a' => $p['prenom'], 'prenom_b' => null, 'racine' => $rootIds, 'membres' => $membres];
}

json_out($arbres);
