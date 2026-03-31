<?php
require_once __DIR__ . '/../config.php';
session_start_once();
require_auth();
header('Content-Type: application/json; charset=utf-8');

$db = pdo();

// 1. Couples-racines : lien conjoint où au moins un membre a génération <= 2
$couples = $db->query("
    SELECT l.id AS lien_id,
           pa.id AS id_a, pa.prenom AS prenom_a, pa.genre AS genre_a, pa.generation AS gen_a,
           pb.id AS id_b, pb.prenom AS prenom_b, pb.genre AS genre_b, pb.generation AS gen_b
    FROM liens l
    JOIN personnes pa ON pa.id = l.personne_a
    JOIN personnes pb ON pb.id = l.personne_b
    WHERE l.type = 'conjoint'
      AND (pa.generation <= 2 OR pb.generation <= 2)
    ORDER BY l.id ASC
")->fetchAll();

$inCouple = [];
foreach ($couples as $c) {
    $inCouple[(int)$c['id_a']] = true;
    $inCouple[(int)$c['id_b']] = true;
}

// 2. Célibataires-racines : gen <= 2 et pas dans un couple-racine
$singles = $db->query("
    SELECT id, prenom FROM personnes
    WHERE generation <= 2
    ORDER BY id ASC
")->fetchAll();
$singles = array_values(array_filter($singles, fn($p) => !isset($inCouple[(int)$p['id']])));

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
    // Père en premier (genre male), sinon ordre naturel
    $isMaleA = $c['genre_a'] === 'male';
    $pere   = $isMaleA ? $c['prenom_a'] : $c['prenom_b'];
    $mere   = $isMaleA ? $c['prenom_b'] : $c['prenom_a'];
    $arbres[] = ['id' => 'c_' . $c['lien_id'], 'prenom_a' => $pere, 'prenom_b' => $mere, 'racine' => $rootIds, 'membres' => $membres];
}

foreach ($singles as $p) {
    $rootIds = [(int)$p['id']];
    $membres = bfs($rootIds, $childrenMap);
    $arbres[] = ['id' => 'p_' . $p['id'], 'prenom_a' => $p['prenom'], 'prenom_b' => null, 'racine' => $rootIds, 'membres' => $membres];
}

json_out($arbres);
