<?php
// ─────────────────────────────────────────────────────────────
//  TESTDATA.PHP — génère des données de test sur 4 générations
//  ⚠️  SUPPRIMEZ CE FICHIER après utilisation !
// ─────────────────────────────────────────────────────────────
require_once __DIR__ . '/config.php';

$db = pdo();

// ─── Prénoms de test
$prenomH = ['Henri','Georges','Marcel','Louis','Pierre','Jacques','René','André','Jean','Paul','Luc','Marc','Alain','Bruno','Claude'];
$prenomF = ['Marie','Hélène','Suzanne','Jeanne','Claire','Anne','Lucie','Sophie','Émilie','Julie','Laura','Nathalie','Christine','Isabelle','Céline'];
$noms    = ['Bertrand','Dupont','Martin','Bernard','Leroy','Moreau','Simon','Laurent','Lefebvre','Girard'];
$villes  = ['Paris','Lyon','Marseille','Bordeaux','Nantes','Toulouse','Strasbourg','Rennes','Grenoble','Montpellier'];

$insP = $db->prepare("INSERT INTO personnes (prenom,nom,genre,naissance,lieu_naiss,generation) VALUES (?,?,?,?,?,?)");
$insL = $db->prepare("INSERT IGNORE INTO liens (personne_a,personne_b,type) VALUES (?,?,?)");

function makeDate($minYear, $maxYear) {
    $y = rand($minYear, $maxYear);
    $m = str_pad(rand(1,12), 2, '0', STR_PAD_LEFT);
    $d = str_pad(rand(1,28), 2, '0', STR_PAD_LEFT);
    return "$y-$m-$d";
}

$ids = []; // gen → [id, ...]

// ─── Génération 0 : 1 couple fondateur
$gen = 0;
$insP->execute(['Émile', 'Bertrand', 'male',   makeDate(1880,1895), 'Lyon, France', $gen]); $hId = $db->lastInsertId();
$insP->execute(['Marguerite', 'Bertrand', 'female', makeDate(1882,1897), 'Grenoble, France', $gen]); $fId = $db->lastInsertId();
$insL->execute([$hId, $fId, 'conjoint']);
$ids[$gen] = [['h'=>$hId,'f'=>$fId]]; // couples de gen 0

// ─── Génération 1 : 5 enfants du couple fondateur, chacun marié
$gen = 1;
$ids[$gen] = [];
$birthYear = 1910;
for ($i = 0; $i < 5; $i++) {
    global $prenomH, $prenomF, $noms, $villes;
    // Enfant (alternance H/F)
    $isH   = ($i % 2 === 0);
    $pren  = $isH ? $prenomH[$i] : $prenomF[$i];
    $genre = $isH ? 'male' : 'female';
    $nom   = $noms[array_rand($noms)];
    $insP->execute([$pren, 'Bertrand', $genre, makeDate($birthYear, $birthYear+3), $villes[array_rand($villes)].', France', $gen]);
    $childId = $db->lastInsertId();
    $birthYear += 3;

    // Lien parent
    $insL->execute([$ids[0][0]['h'], $childId, 'parent_enfant']);
    $insL->execute([$ids[0][0]['f'], $childId, 'parent_enfant']);

    // Conjoint (nom de famille différent)
    $spouseNom   = $noms[array_rand($noms)];
    $spousePren  = $isH ? $prenomF[$i+5] : $prenomH[$i+5];
    $spouseGenre = $isH ? 'female' : 'male';
    $insP->execute([$spousePren, $spouseNom, $spouseGenre, makeDate($birthYear-5, $birthYear), $villes[array_rand($villes)].', France', $gen]);
    $spouseId = $db->lastInsertId();
    $insL->execute([$childId, $spouseId, 'conjoint']);

    $ids[$gen][] = ['h'=>($isH?$childId:$spouseId), 'f'=>($isH?$spouseId:$childId), 'child'=>$childId];
}

// ─── Génération 2 : 5 enfants par couple de gen 1
$gen = 2;
$ids[$gen] = [];
foreach ($ids[1] as $parentCouple) {
    $birthYear = 1935;
    for ($i = 0; $i < 5; $i++) {
        $isH   = (rand(0,1) === 1);
        $pren  = $isH ? $prenomH[rand(0,14)] : $prenomF[rand(0,14)];
        $genre = $isH ? 'male' : 'female';
        $insP->execute([$pren, 'Bertrand', $genre, makeDate($birthYear, $birthYear+3), $villes[array_rand($villes)].', France', $gen]);
        $childId = $db->lastInsertId();
        $birthYear += 3;

        $insL->execute([$parentCouple['h'], $childId, 'parent_enfant']);
        $insL->execute([$parentCouple['f'], $childId, 'parent_enfant']);

        // Conjoint
        $spouseNom  = $noms[array_rand($noms)];
        $spousePren = $isH ? $prenomF[rand(0,14)] : $prenomH[rand(0,14)];
        $spouseGenre= $isH ? 'female' : 'male';
        $insP->execute([$spousePren, $spouseNom, $spouseGenre, makeDate($birthYear-4, $birthYear), $villes[array_rand($villes)].', France', $gen]);
        $spouseId = $db->lastInsertId();
        $insL->execute([$childId, $spouseId, 'conjoint']);

        $ids[$gen][] = ['h'=>($isH?$childId:$spouseId), 'f'=>($isH?$spouseId:$childId), 'child'=>$childId];
    }
}

// ─── Génération 3 : 0 à 2 enfants par couple de gen 2 (sans conjoint — feuilles)
$gen = 3;
foreach ($ids[2] as $parentCouple) {
    $nbChildren = rand(0, 2);
    $birthYear  = 1965;
    for ($i = 0; $i < $nbChildren; $i++) {
        $isH   = (rand(0,1) === 1);
        $pren  = $isH ? $prenomH[rand(0,14)] : $prenomF[rand(0,14)];
        $genre = $isH ? 'male' : 'female';
        $insP->execute([$pren, 'Bertrand', $genre, makeDate($birthYear, $birthYear+4), $villes[array_rand($villes)].', France', $gen]);
        $childId = $db->lastInsertId();
        $birthYear += 3;
        $insL->execute([$parentCouple['h'], $childId, 'parent_enfant']);
        $insL->execute([$parentCouple['f'], $childId, 'parent_enfant']);
    }
}

// Compter
$total = $db->query("SELECT COUNT(*) FROM personnes")->fetchColumn();
$liens = $db->query("SELECT COUNT(*) FROM liens")->fetchColumn();
?>
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>Données de test</title>
<style>body{font-family:system-ui;max-width:500px;margin:60px auto;padding:0 20px}.ok{background:#eafaea;color:#2a7a2a;padding:12px 16px;border-radius:8px;margin:8px 0}.warn{background:#fffbe6;border:1px solid #f0c040;padding:16px;border-radius:8px;margin-top:20px}</style>
</head><body>
<h2>🌿 Données de test générées</h2>
<div class="ok">✓ <?= $total ?> personnes créées</div>
<div class="ok">✓ <?= $liens ?> liens créés</div>
<div class="warn">⚠️ <strong>Supprimez ce fichier</strong> <code>testdata.php</code> via FTP après vérification.<br><br><a href="/">→ Voir l'arbre</a></div>
</body></html>
