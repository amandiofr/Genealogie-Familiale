<?php
// api/liens.php — retourne tous les liens pour le rendu de l'arbre
require_once __DIR__ . '/../config.php';
header('Content-Type: application/json; charset=utf-8');

require_auth();

$rows = pdo()->query('SELECT id, personne_a, personne_b, type, date_debut, date_fin FROM liens')->fetchAll();
json_out($rows);
