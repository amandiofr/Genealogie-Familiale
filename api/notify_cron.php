<?php
// ══════════════════════════════════════════════════════════════════════════════
//  NOTIFY_CRON.PHP — Script de notification par e-mail
//  À appeler via une tâche planifiée OVH toutes les 5-15 minutes :
//    php /home/votre_compte/www/api/notify_cron.php
//  OU via cURL (tâche planifiée HTTP) :
//    https://votre-site.fr/api/notify_cron.php?token=VOTRE_TOKEN
// ══════════════════════════════════════════════════════════════════════════════
require_once __DIR__ . '/../config.php';

// ── Protection par token (optionnel mais recommandé pour l'accès HTTP) ────────
$isCli = (php_sapi_name() === 'cli');
if (!$isCli) {
    if (NOTIFY_TOKEN !== '' && ($_GET['token'] ?? '') !== NOTIFY_TOKEN) {
        http_response_code(403); echo 'Accès refusé'; exit;
    }
}

$db = pdo();

// ── Anniversaires du jour (personnes vivantes) ────────────────────────────────
try {
    $hourEurope = (int)(new DateTime('now', new DateTimeZone('Europe/Paris')))->format('H');
    $todayMD = date('--m-d');
    $birthdays = $db->query(
        "SELECT prenom, nom, naissance FROM personnes
         WHERE vivant=1 AND naissance REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
         AND DATE_FORMAT(naissance, '--%m-%d') = " . $db->quote($todayMD)
    )->fetchAll();

    // Vérifier si les anniversaires ont déjà été envoyés aujourd'hui
    $bdState = $db->query("SELECT birthday_sent_date FROM notification_state WHERE id=1")->fetch();
    $alreadySentToday = ($bdState && $bdState['birthday_sent_date'] === date('Y-m-d'));

    if (!empty($birthdays) && $hourEurope >= 8 && $hourEurope < 22 && !$alreadySentToday) {
        $recipientsBd = $db->query("SELECT email FROM notification_emails")->fetchAll();
        if (!empty($recipientsBd)) {
            $linesBdFr = '';
            foreach ($birthdays as $p) {
                $age = (int)date('Y') - (int)substr($p['naissance'], 0, 4);
                $linesBdFr .= "🎂 {$p['prenom']} {$p['nom']} — {$age} ans\n";
            }
            $bdBody = <<<BODY
🌿 Notre Famille — Anniversaires du jour

{$linesBdFr}
BODY;
            $bdSubject = '=?UTF-8?B?' . base64_encode('🎂 Anniversaires — Notre Famille') . '?=';
            $bdHeaders  = "MIME-Version: 1.0\r\n";
            $bdHeaders .= "Content-Type: text/plain; charset=UTF-8\r\n";
            $bdHeaders .= "Content-Transfer-Encoding: base64\r\n";
            $bdHeaders .= "From: Notre Famille <" . NOTIFY_FROM . ">\r\n";
            $bdHeaders .= "X-Mailer: PHP/" . phpversion();
            foreach ($recipientsBd as $r) {
                mail($r['email'], $bdSubject, chunk_split(base64_encode($bdBody)), $bdHeaders);
            }
            // Enregistrer la date d'envoi pour éviter les doublons
            $db->prepare("UPDATE notification_state SET birthday_sent_date=CURDATE() WHERE id=1")->execute();
            echo count($birthdays) . " anniversaire(s) notifié(s).\n";
        }
    }
} catch (\Throwable $e) {
    echo "Erreur anniversaires : " . $e->getMessage() . "\n";
}

// ── Vérifier l'état des notifications ────────────────────────────────────────
$state = $db->query("SELECT * FROM notification_state WHERE id=1")->fetch();

// Rien de prévu → on sort
if (!$state || !$state['send_after']) {
    echo "Aucune notification en attente.\n"; exit;
}

// L'heure d'envoi n'est pas encore arrivée (debounce d'1h)
if ($state['send_after'] > date('Y-m-d H:i:s')) {
    echo "Envoi prévu après : {$state['send_after']}\n"; exit;
}

// Limite : 1 email par jour maximum
if ($state['last_sent'] && $state['last_sent'] > date('Y-m-d H:i:s', time() - 86400)) {
    echo "Dernier envoi trop récent : {$state['last_sent']}\n"; exit;
}

// ── Récupérer les modifications en attente ────────────────────────────────────
$logs = $db->query("SELECT * FROM modification_log ORDER BY created_at DESC")->fetchAll();
if (empty($logs)) {
    // Plus rien à envoyer, remettre l'état à zéro
    $db->prepare("UPDATE notification_state SET send_after=NULL WHERE id=1")->execute();
    echo "Aucune modification à notifier.\n"; exit;
}

// ── Récupérer les destinataires ───────────────────────────────────────────────
$recipients = $db->query("SELECT email FROM notification_emails")->fetchAll();
if (empty($recipients)) {
    echo "Aucun destinataire configuré.\n"; exit;
}

// ── Construire le corps du mail ───────────────────────────────────────────────
$typesFr = [
    'personne'  => 'Membres',
    'evenement' => 'Événements',
    'anecdote'  => 'Anecdotes',
    'reunion'   => 'Réunions',
    'lien'      => 'Membres',
];
$actionsFr = ['ajout' => 'Ajout', 'modification' => 'Modification', 'suppression' => 'Suppression'];

$linesFr = '';
foreach ($logs as $log) {
    $date     = date('d/m H:i', strtotime($log['created_at']));
    $typeFr   = $typesFr[$log['type']]   ?? $log['type'];
    $actionFr = $actionsFr[$log['action']] ?? $log['action'];
    $auteur   = $log['auteur'] ? "\n    par {$log['auteur']}" : '';
    $linesFr .= "• {$date} — {$typeFr} — {$actionFr}\n  {$log['description']}{$auteur}\n\n";
}

$nbModifs = count($logs);
$bodyText = <<<BODY
🌿 Notre Famille — Mises à jour

{$nbModifs} modification(s) :

{$linesFr}
Abonné aux notifications.
BODY;

// ── Envoyer le mail à chaque destinataire ─────────────────────────────────────
$subject = '=?UTF-8?B?' . base64_encode('🌿 Mise à jour — Notre Famille') . '?=';
$headers  = "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
$headers .= "Content-Transfer-Encoding: base64\r\n";
$headers .= "From: Notre Famille <" . NOTIFY_FROM . ">\r\n";
$headers .= "X-Mailer: PHP/" . phpversion();

$sent = 0;
foreach ($recipients as $r) {
    if (mail($r['email'], $subject, chunk_split(base64_encode($bodyText)), $headers)) {
        $sent++;
    }
}

// ── Mettre à jour l'état et vider le log ─────────────────────────────────────
$db->prepare("UPDATE notification_state SET send_after=NULL, last_sent=NOW() WHERE id=1")->execute();
$db->exec("DELETE FROM modification_log");

echo "Mail envoyé à {$sent}/" . count($recipients) . " destinataire(s). {$nbModifs} modification(s) notifiée(s).\n";
