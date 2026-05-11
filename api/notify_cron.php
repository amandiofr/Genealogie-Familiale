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

$dryRun = !empty($GLOBALS['_CRON_DRY_RUN']);

// ── Vérifier l'état des notifications ────────────────────────────────────────
$state = $db->query("SELECT * FROM notification_state WHERE id=1")->fetch();

// Rien de prévu → on sort (sauf simulation : on envoie quand même)
if (!$dryRun && (!$state || !$state['send_after'])) {
    echo "Aucune notification en attente.\n"; return;
}

// L'heure d'envoi n'est pas encore arrivée (debounce d'1h)
if (!$dryRun && $state['send_after'] > date('Y-m-d H:i:s')) {
    echo "Envoi prévu après : {$state['send_after']}\n"; return;
}

// Limite : 1 email par jour maximum
if (!$dryRun && $state['last_sent'] && $state['last_sent'] > date('Y-m-d H:i:s', time() - 86400)) {
    echo "Dernier envoi trop récent : {$state['last_sent']}\n"; return;
}

// ── Récupérer les modifications en attente ────────────────────────────────────
$lastSent = $state['last_sent'] ?? null;
if ($lastSent) {
    $s = $db->prepare("SELECT * FROM modification_log WHERE created_at > ? ORDER BY created_at DESC");
    $s->execute([$lastSent]);
    $logs = $s->fetchAll();
} else {
    $logs = $db->query("SELECT * FROM modification_log ORDER BY created_at DESC")->fetchAll();
}
if (empty($logs)) {
    // Plus rien à envoyer, remettre l'état à zéro
    $db->prepare("UPDATE notification_state SET send_after=NULL WHERE id=1")->execute();
    echo "Aucune modification à notifier.\n"; return;
}

// ── Récupérer les destinataires ───────────────────────────────────────────────
$recipients = $db->query("SELECT email FROM notification_emails")->fetchAll();
if (empty($recipients)) {
    echo "Aucun destinataire configuré.\n"; return;
}

// ── Construire le corps du mail (HTML) ───────────────────────────────────────
$typesFr = [
    'personne'  => 'Membres',
    'evenement' => 'Événements',
    'anecdote'  => 'Anecdotes',
    'tresor'    => 'Trésors',
    'recette'   => 'Recettes',
    'auto'      => 'Automobiles',
    'lien'      => 'Membres',
];
$actionsFr = ['ajout' => 'Ajout', 'modification' => 'Modification', 'suppression' => 'Suppression'];
$typeHash  = [
    'personne'  => 'person',
    'evenement' => 'event',
    'anecdote'  => 'anecdote',
    'tresor'    => 'tresor',
    'recette'   => 'recette',
    'auto'      => 'auto',
];

$actionColors = [
    'ajout'        => ['bg' => '#e8f5e9', 'fg' => '#2e7d32', 'label' => '＋ Ajout'],
    'modification' => ['bg' => '#fff8e8', 'fg' => '#8b5e3c', 'label' => '✎ Modification'],
    'suppression'  => ['bg' => '#fdecea', 'fg' => '#c0392b', 'label' => '✕ Suppression'],
];
$typeIcons = [
    'personne'  => '👤',
    'evenement' => '📅',
    'anecdote'  => '📖',
    'tresor'    => '🏺',
    'recette'   => '🍽️',
    'auto'      => '🚗',
    'lien'      => '👤',
];

$rowsHtml = '';
foreach ($logs as $log) {
    $date     = date('d/m/Y à H:i', strtotime($log['created_at']));
    $typeFr   = $typesFr[$log['type']]     ?? $log['type'];
    $icon     = $typeIcons[$log['type']]   ?? '•';
    $ac       = $actionColors[$log['action']] ?? ['bg' => '#f0ede8', 'fg' => '#6b5e4e', 'label' => $log['action']];
    $auteur   = $log['auteur'] ? htmlspecialchars($log['auteur']) : '';

    $badge = '<span style="display:inline-block;padding:2px 8px;border-radius:12px;font-size:.68rem;font-weight:600;'
        . 'background:' . $ac['bg'] . ';color:' . $ac['fg'] . ';letter-spacing:.02em;">' . $ac['label'] . '</span>';

    $btn = '';
    $hash = $typeHash[$log['type']] ?? null;
    if ($hash && !empty($log['object_id']) && $log['action'] !== 'suppression') {
        $url = rtrim(SITE_URL, '/') . '/#' . $hash . '/' . (int)$log['object_id'];
        $btn = '<a href="' . $url . '" style="display:inline-block;margin-top:8px;padding:5px 14px;'
            . 'background:#c5a880;color:#fff;text-decoration:none;border-radius:4px;'
            . 'font-size:.75rem;font-family:Georgia,serif;letter-spacing:.03em;">Voir →</a>';
    }

    $rowsHtml .= '<tr><td style="padding:0 0 10px;">'
        . '<div style="background:#faf8f5;border:1px solid #ece6dd;border-radius:6px;padding:12px 14px;">'
        . '<table width="100%" cellpadding="0" cellspacing="0"><tr>'
        . '<td style="font-size:1.1rem;width:28px;vertical-align:top;padding-top:1px;">' . $icon . '</td>'
        . '<td style="vertical-align:top;">'
        . '<div style="margin-bottom:4px;">' . $badge
        . '<span style="font-size:.72rem;color:#a09080;margin-left:8px;">' . $date . '</span></div>'
        . '<div style="font-size:.9rem;color:#2a2118;font-weight:500;">' . htmlspecialchars($log['description']) . '</div>'
        . ($auteur ? '<div style="font-size:.75rem;color:#7a6a58;margin-top:2px;">par ' . $auteur . '</div>' : '')
        . ($btn ? '<div>' . $btn . '</div>' : '')
        . '</td></tr></table>'
        . '</div>'
        . '</td></tr>';
}

$nbModifs = count($logs);
$siteUrl  = rtrim(SITE_URL, '/');
$bodyHtml = <<<HTML
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0ede8;font-family:Georgia,serif;color:#2a2118;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0ede8;padding:32px 16px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

  <!-- En-tête -->
  <tr><td style="background:#2a2118;border-radius:8px 8px 0 0;padding:24px 28px;">
    <div style="font-size:1.4rem;color:#c5a880;letter-spacing:.04em;">🌿 Notre Famille</div>
    <div style="font-size:.8rem;color:#a09080;margin-top:4px;letter-spacing:.06em;text-transform:uppercase;">Mises à jour</div>
  </td></tr>

  <!-- Corps -->
  <tr><td style="background:#fff;padding:24px 28px;">
    <p style="font-size:.82rem;color:#6b5e4e;margin:0 0 18px;border-bottom:1px solid #ece6dd;padding-bottom:12px;">
      <strong>{$nbModifs}</strong> modification(s) enregistrée(s)
    </p>
    <table width="100%" cellpadding="0" cellspacing="0">
      {$rowsHtml}
    </table>
  </td></tr>

  <!-- Pied de page -->
  <tr><td style="background:#faf8f5;border-top:1px solid #ece6dd;border-radius:0 0 8px 8px;padding:14px 28px;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="font-size:.7rem;color:#a09080;">Abonné aux notifications de Notre Famille</td>
      <td align="right">
        <a href="{$siteUrl}" style="font-size:.7rem;color:#8b5e3c;text-decoration:none;">Ouvrir le site →</a>
      </td>
    </tr></table>
  </td></tr>

</table>
</td></tr></table>
</body></html>
HTML;

// ── Envoyer le mail à chaque destinataire ─────────────────────────────────────
// ── Envoyer le mail à chaque destinataire ─────────────────────────────────────
$subject = '=?UTF-8?B?' . base64_encode('🌿 Mise à jour — Notre Famille') . '?=';
$headers  = "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: text/html; charset=UTF-8\r\n";
$headers .= "Content-Transfer-Encoding: base64\r\n";
$headers .= "From: Notre Famille <" . NOTIFY_FROM . ">\r\n";
$headers .= "X-Mailer: PHP/" . phpversion();

$sent = 0;
foreach ($recipients as $r) {
    if (mail($r['email'], $subject, chunk_split(base64_encode($bodyHtml)), $headers)) {
        $sent++;
    }
}

// ── Mettre à jour l'état ──────────────────────────────────────────────────────
if (!$dryRun) {
    $db->prepare("UPDATE notification_state SET send_after=NULL, last_sent=NOW() WHERE id=1")->execute();
    echo "Mail envoyé à {$sent}/" . count($recipients) . " destinataire(s). {$nbModifs} modification(s) notifiée(s).\n";
} else {
    echo "[simulation] Mail envoyé à {$sent}/" . count($recipients) . " destinataire(s). {$nbModifs} modification(s) — état conservé.\n";
}
