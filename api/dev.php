<?php
require_once __DIR__ . '/../config.php';
require_role('admin');

$action = $_GET['action'] ?? '';

// ── Exécution immédiate du cron de notification ───────────────────────────────
if ($action === 'run_cron' && method_is('POST')) {
    $GLOBALS['_CRON_DRY_RUN'] = !empty($_GET['dry']);
    ob_start();
    require __DIR__ . '/notify_cron.php';
    $output = ob_get_clean();
    json_out(['output' => trim($output), 'dry_run' => $GLOBALS['_CRON_DRY_RUN']]);
}

// ── Taille du répertoire uploads/ ────────────────────────────────────────────
if ($action === 'upload_size' && method_is('GET')) {
    $dir   = __DIR__ . '/../uploads/';
    $total = 0;
    $count = 0;
    if (is_dir($dir)) {
        $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($dir, FilesystemIterator::SKIP_DOTS));
        foreach ($it as $file) {
            if ($file->isFile()) { $total += $file->getSize(); $count++; }
        }
    }
    json_out(['bytes' => $total, 'files' => $count]);
}

json_error('Action inconnue', 400);
