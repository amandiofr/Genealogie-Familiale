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
$logs = $db->query("SELECT * FROM modification_log ORDER BY created_at ASC")->fetchAll();
if (empty($logs)) {
    // Plus rien à envoyer, remettre l'état à zéro
    $db->prepare("UPDATE notification_state SET send_after=NULL WHERE id=1")->execute();
    echo "Aucune modification à notifier.\n"; exit;
}

// ── Récupérer les destinataires ───────────────────────────────────────────────
$recipients = $db->query("SELECT email FROM notification_emails")->fetchAll(\PDO::FETCH_COLUMN);
if (empty($recipients)) {
    echo "Aucun destinataire configuré.\n"; exit;
}

// ── Construire le corps du mail ───────────────────────────────────────────────
$typesFr = [
    'personne'  => 'Personne',
    'evenement' => 'Événement',
    'anecdote'  => 'Anecdote',
    'reunion'   => 'Réunion',
    'lien'      => 'Lien familial',
];
$typesPt = [
    'personne'  => 'Pessoa',
    'evenement' => 'Evento',
    'anecdote'  => 'Anedota',
    'reunion'   => 'Reunião',
    'lien'      => 'Ligação familiar',
];
$actionsFr = ['ajout' => 'Ajout', 'modification' => 'Modification', 'suppression' => 'Suppression'];
$actionsPt = ['ajout' => 'Adição', 'modification' => 'Modificação', 'suppression' => 'Eliminação'];

$linesFr = '';
$linesPt = '';
foreach ($logs as $log) {
    $date     = date('d/m/Y H:i', strtotime($log['created_at']));
    $typeFr   = $typesFr[$log['type']]   ?? $log['type'];
    $typePt   = $typesPt[$log['type']]   ?? $log['type'];
    $actionFr = $actionsFr[$log['action']] ?? $log['action'];
    $actionPt = $actionsPt[$log['action']] ?? $log['action'];
    $auteur   = $log['auteur'] ? " (par {$log['auteur']})" : '';
    $auteurPt = $log['auteur'] ? " (por {$log['auteur']})" : '';

    $linesFr .= "  • [{$date}] {$typeFr} — {$actionFr} : {$log['description']}{$auteur}\n";
    $linesPt .= "  • [{$date}] {$typePt} — {$actionPt} : {$log['description']}{$auteurPt}\n";
}

$nbModifs = count($logs);
$bodyText = <<<BODY
🌿 Notre Famille — Mises à jour / Nossa Família — Atualizações
══════════════════════════════════════════════════════════

── Français ────────────────────────────────────────────

{$nbModifs} modification(s) ont été apportées à l'arbre généalogique :

{$linesFr}

── Português ───────────────────────────────────────────

{$nbModifs} alteração(ões) foram feitas na árvore genealógica :

{$linesPt}

══════════════════════════════════════════════════════════
Vous recevez ce message car vous êtes abonné aux notifications de cet arbre généalogique.
Receberá esta mensagem porque está subscrito às notificações desta árvore genealógica.
BODY;

// ── Envoyer le mail à chaque destinataire ─────────────────────────────────────
$subject = '=?UTF-8?B?' . base64_encode('🌿 Mise à jour — Notre Famille / Atualização — Nossa Família') . '?=';
$headers  = "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
$headers .= "Content-Transfer-Encoding: base64\r\n";
$headers .= "From: Notre Famille <" . NOTIFY_FROM . ">\r\n";
$headers .= "X-Mailer: PHP/" . phpversion();

$sent = 0;
foreach ($recipients as $email) {
    if (mail($email, $subject, base64_encode($bodyText), $headers)) {
        $sent++;
    }
}

// ── Mettre à jour l'état et vider le journal ──────────────────────────────────
$db->prepare("UPDATE notification_state SET send_after=NULL, last_sent=NOW() WHERE id=1")->execute();
$db->query("DELETE FROM modification_log");

echo "Mail envoyé à {$sent}/" . count($recipients) . " destinataire(s). {$nbModifs} modification(s) notifiée(s).\n";
