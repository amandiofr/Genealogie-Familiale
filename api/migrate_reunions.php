<?php
// ══════════════════════════════════════════════════════════════════════════════
//  MIGRATE_REUNIONS.PHP — Migration one-shot : réunions → evenements
//  À exécuter UNE SEULE FOIS en tant qu'admin :
//    https://votre-site.fr/api/migrate_reunions.php?token=VOTRE_TOKEN
//  Supprime ce fichier après exécution.
// ══════════════════════════════════════════════════════════════════════════════
require_once __DIR__ . '/../config.php';

$user = require_auth();
if ($user['role'] !== 'admin') { http_response_code(403); echo 'Réservé aux admins'; exit; }

// Protection anti-double exécution : vérifier si des réunions ont déjà été migrées
$db = pdo();
$alreadyMigrated = $db->query("SELECT COUNT(*) FROM evenements WHERE type='reunion'")->fetchColumn();
if ($alreadyMigrated > 0) {
    echo "⚠️ {$alreadyMigrated} réunion(s) déjà présente(s) dans evenements. Migration annulée pour éviter les doublons.\n";
    exit;
}

$reunions = $db->query("SELECT * FROM reunions ORDER BY id")->fetchAll();
if (!$reunions) { echo "Aucune réunion à migrer.\n"; exit; }

$db->beginTransaction();
try {
    $insEvt = $db->prepare("
        INSERT INTO evenements (titre, type, date_debut, date_fin, lieu, description, photo_id, created_at, updated_at)
        VALUES (?, 'reunion', ?, ?, ?, ?, NULL, ?, ?)
    ");
    $insParticipant = $db->prepare("
        INSERT IGNORE INTO evenement_personnes (evenement_id, personne_id, role)
        SELECT ?, personne_id, role FROM reunion_personnes WHERE reunion_id = ?
    ");
    $insPhoto = $db->prepare("
        INSERT INTO evenement_photos (evenement_id, chemin, chemin_thumb, legende, ordre)
        SELECT ?, chemin, chemin_thumb, legende, ordre FROM reunion_photos WHERE reunion_id = ?
    ");
    // Mapping ancien photo_id → nouveau evenement_photos.id
    $getOldPhotoRef = $db->prepare("
        SELECT rp.id AS old_id, rp.chemin FROM reunion_photos rp WHERE rp.reunion_id = ? AND rp.id = ?
    ");
    $getNewPhotoId = $db->prepare("
        SELECT ep.id FROM evenement_photos ep WHERE ep.evenement_id = ? AND ep.chemin = ?
    ");
    $updPhotoId = $db->prepare("UPDATE evenements SET photo_id = ? WHERE id = ?");

    $migrated = 0;
    foreach ($reunions as $r) {
        $insEvt->execute([
            $r['titre'], $r['date_debut'], $r['date_fin'],
            $r['lieu'], $r['description'],
            $r['created_at'], $r['updated_at'],
        ]);
        $newId = (int)$db->lastInsertId();

        $insParticipant->execute([$newId, $r['id']]);
        $insPhoto->execute([$newId, $r['id']]);

        // Restaurer le photo_id (avatar) de la réunion
        if ($r['photo_id']) {
            $getOldPhotoRef->execute([$r['id'], $r['photo_id']]);
            $oldRef = $getOldPhotoRef->fetch();
            if ($oldRef) {
                $getNewPhotoId->execute([$newId, $oldRef['chemin']]);
                $newPhotoId = $getNewPhotoId->fetchColumn();
                if ($newPhotoId) $updPhotoId->execute([$newPhotoId, $newId]);
            }
        }

        $migrated++;
        echo "✓ [{$r['id']}] {$r['titre']} → evenement #{$newId}\n";
    }

    $db->commit();
    echo "\n✅ {$migrated} réunion(s) migrée(s) avec succès.\n";
    echo "Vous pouvez supprimer ce fichier (api/migrate_reunions.php).\n";

} catch (Throwable $e) {
    $db->rollBack();
    echo "❌ Erreur : " . $e->getMessage() . "\n";
}
