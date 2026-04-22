<?php
require_once __DIR__ . '/../config.php';
header('Content-Type: application/json; charset=utf-8');

require_auth();
$db     = pdo();
$source  = $_GET['source']   ?? '';
$photoId = (int)($_GET['photo_id'] ?? 0);
if (!$source || !$photoId) json_error('Paramètres manquants');

// Map source → (photo table, parent FK column, chemin columns)
$map = [
    'person'    => ['photos',           'personne_id',  'photos',           'personne_id'],
    'evenement' => ['evenement_photos', 'evenement_id', 'evenement_photos', 'evenement_id'],
    'reunion'   => ['reunion_photos',   'reunion_id',   'reunion_photos',   'reunion_id'],
    'anecdote'  => ['anecdote_photos',  'anecdote_id',  'anecdote_photos',  'anecdote_id'],
    'auto'      => ['auto_photos',      'auto_id',      'auto_photos',      'auto_id'],
    'tresor'    => ['tresor_photos',    'tresor_id',    'tresor_photos',    'tresor_id'],
    'recette'   => ['recette_photos',   'recette_id',   'recette_photos',   'recette_id'],
];

if (!isset($map[$source])) json_error('Source inconnue');
[$table, $fk] = $map[$source];

// 1. Find the parent entity ID from the photo row
$st = $db->prepare("SELECT `$fk` FROM `$table` WHERE id = ?");
$st->execute([$photoId]);
$row = $st->fetch();
if (!$row) json_error('Photo introuvable', 404);
$parentId = (int)$row[$fk];

// 2. Return all photos for that parent entity
$st2 = $db->prepare("SELECT * FROM `$table` WHERE `$fk` = ? ORDER BY ordre, id");
$st2->execute([$parentId]);

// 3. Fetch parent entity name
$nameSql = [
    'person'    => "SELECT CONCAT(prenom, ' ', nom) FROM personnes WHERE id = ?",
    'evenement' => "SELECT titre FROM evenements WHERE id = ?",
    'anecdote'  => "SELECT titre FROM anecdotes WHERE id = ?",
    'auto'      => "SELECT CONCAT(marque, IFNULL(CONCAT(' ', NULLIF(modele, '')), '')) FROM autos WHERE id = ?",
    'tresor'    => "SELECT titre FROM tresors WHERE id = ?",
    'recette'   => "SELECT titre FROM recettes WHERE id = ?",
];
$parentName = '';
if (isset($nameSql[$source])) {
    $ns = $db->prepare($nameSql[$source]);
    $ns->execute([$parentId]);
    $parentName = $ns->fetchColumn() ?: '';
}
json_out(['photos' => $st2->fetchAll(), 'parent_id' => $parentId, 'parent_name' => $parentName, 'source' => $source]);
