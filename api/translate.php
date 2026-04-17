<?php
require_once __DIR__ . '/../config.php';
header('Content-Type: application/json; charset=utf-8');

require_auth();

$b      = body();
$text   = trim($b['text'] ?? '');
$target = trim($b['target'] ?? 'fr');

if (!$text) json_out(['translation' => '']);

// Langues supportées par Google Translate (codes ISO 639-1)
$validLangs = ['fr','pt','en','de','fa'];
if (!in_array($target, $validLangs)) $target = 'fr';

$url = 'https://translation.googleapis.com/language/translate/v2?key=' . urlencode(GOOGLE_API_KEY);

$payload = json_encode(['q' => $text, 'target' => $target, 'format' => 'html']);

$ctx = stream_context_create(['http' => [
    'method'  => 'POST',
    'header'  => "Content-Type: application/json\r\nContent-Length: " . strlen($payload),
    'content' => $payload,
    'timeout' => 8,
]]);

$resp = @file_get_contents($url, false, $ctx);
if ($resp === false) json_error('Traduction indisponible', 502);

$data = json_decode($resp, true);
$translation = $data['data']['translations'][0]['translatedText'] ?? null;
if ($translation === null) json_error('Réponse inattendue de Google', 502);

json_out(['translation' => html_entity_decode($translation, ENT_QUOTES | ENT_HTML5, 'UTF-8')]);
