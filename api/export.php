<?php
require_once __DIR__ . '/../config.php';

$user   = require_auth();
$db     = pdo();
$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

// ── EXPORT GEDCOM ─────────────────────────────────────────────────────────────
if ($action === 'gedcom' && $method === 'GET') {
    header('Content-Type: text/plain; charset=utf-8');
    header('Content-Disposition: attachment; filename="famille_' . date('Y-m-d') . '.ged"');
    echo build_gedcom($db);
    exit;
}

// ── EXPORT JSON ───────────────────────────────────────────────────────────────
if ($action === 'json' && $method === 'GET') {
    header('Content-Type: application/json; charset=utf-8');
    header('Content-Disposition: attachment; filename="famille_' . date('Y-m-d') . '.json"');
    $data = [
        'exported_at'         => date('c'),
        'version'             => '1.0',
        'personnes'           => $db->query('SELECT * FROM personnes')->fetchAll(),
        'liens'               => $db->query('SELECT * FROM liens')->fetchAll(),
        'evenements'          => $db->query('SELECT * FROM evenements')->fetchAll(),
        'evenement_personnes' => $db->query('SELECT * FROM evenement_personnes')->fetchAll(),
        'anecdotes'           => $db->query('SELECT * FROM anecdotes')->fetchAll(),
        'anecdote_personnes'  => $db->query('SELECT * FROM anecdote_personnes')->fetchAll(),
        'reunions'            => $db->query('SELECT * FROM reunions')->fetchAll(),
        'reunion_personnes'   => $db->query('SELECT * FROM reunion_personnes')->fetchAll(),
    ];
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    exit;
}

// ── EXPORT CSV ────────────────────────────────────────────────────────────────
if ($action === 'csv' && $method === 'GET') {
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="famille_' . date('Y-m-d') . '.csv"');
    echo "\xEF\xBB\xBF"; // BOM UTF-8 pour Excel
    $out  = fopen('php://output', 'w');
    $cols = ['id','prenom','nom','nom_naiss','genre','naissance','lieu_naiss','deces','lieu_deces','vivant','generation','profession','biographie'];
    fputcsv($out, $cols, ';');
    foreach ($db->query('SELECT * FROM personnes')->fetchAll() as $row) {
        fputcsv($out, array_map(fn($c) => $row[$c] ?? '', $cols), ';');
    }
    fclose($out);
    exit;
}

// ── IMPORT GEDCOM ─────────────────────────────────────────────────────────────
if ($action === 'import-gedcom' && $method === 'POST') {
    require_role('admin');
    if (empty($_FILES['file'])) json_error('Fichier manquant');
    $content = file_get_contents($_FILES['file']['tmp_name']);
    $n = import_gedcom($content, $db);
    json_out(['imported' => $n, 'message' => "$n personne(s) importée(s)"], 200);
}

// ── IMPORT JSON ───────────────────────────────────────────────────────────────
if ($action === 'import-json' && $method === 'POST') {
    require_role('admin');
    if (empty($_FILES['file'])) json_error('Fichier manquant');
    $data = json_decode(file_get_contents($_FILES['file']['tmp_name']), true);
    if (!$data) json_error('JSON invalide');
    $n = import_json($data, $db);
    json_out(['imported' => $n, 'message' => "$n personne(s) importée(s)"]);
}

json_error('Action inconnue', 404);

// ═════════════════════════════════════════════════════════════
//  GEDCOM helpers
// ═════════════════════════════════════════════════════════════
const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

function iso_to_ged(?string $iso): string {
    if (!$iso) return '';
    $p = explode('-', $iso);
    if (count($p) === 3) return sprintf('%d %s %s', (int)$p[2], MONTHS[(int)$p[1]-1], $p[0]);
    if (count($p) === 2) return MONTHS[(int)$p[1]-1] . ' ' . $p[0];
    return $p[0];
}

function ged_to_iso(?string $str): ?string {
    if (!$str) return null;
    $str = preg_replace('/^(ABT|CAL|EST|BEF|AFT)\s+/i', '', trim($str));
    $p   = preg_split('/\s+/', $str);
    if (count($p) === 3) {
        $mi = array_search(strtoupper($p[1]), MONTHS);
        if ($mi === false) return null;
        return sprintf('%s-%02d-%02d', $p[2], $mi+1, (int)$p[0]);
    }
    if (count($p) === 2) {
        $mi = array_search(strtoupper($p[0]), MONTHS);
        if ($mi === false) return null;
        return sprintf('%s-%02d', $p[1], $mi+1);
    }
    if (preg_match('/^\d{4}$/', $p[0])) return $p[0];
    return null;
}

function build_gedcom(PDO $db): string {
    $personnes = $db->query('SELECT * FROM personnes')->fetchAll();
    $conjoints = $db->query("SELECT * FROM liens WHERE type='conjoint'")->fetchAll();
    $parEnf    = $db->query("SELECT * FROM liens WHERE type='parent_enfant'")->fetchAll();

    $L = [];
    $L[] = '0 HEAD';
    $L[] = '1 SOUR GENEALOGIE-FAMILIALE';
    $L[] = '2 VERS 1.0';
    $L[] = '1 GEDC';
    $L[] = '2 VERS 5.5.1';
    $L[] = '1 CHAR UTF-8';
    $L[] = '1 DATE ' . iso_to_ged(date('Y-m-d'));
    $L[] = '1 LANG French';

    foreach ($personnes as $p) {
        $L[] = "0 @I{$p['id']}@ INDI";
        $L[] = "1 NAME {$p['prenom']} /{$p['nom']}/";
        if ($p['nom_naiss']) $L[] = "2 SURN {$p['nom_naiss']}";
        $L[] = '1 SEX ' . ($p['genre']==='female' ? 'F' : ($p['genre']==='male' ? 'M' : 'U'));
        if ($p['naissance']) { $L[]='1 BIRT'; $L[]='2 DATE '.iso_to_ged($p['naissance']); if($p['lieu_naiss']) $L[]='2 PLAC '.$p['lieu_naiss']; }
        if (!$p['vivant'])   { $L[]='1 DEAT Y'; if($p['deces']) $L[]='2 DATE '.iso_to_ged($p['deces']); if($p['lieu_deces']) $L[]='2 PLAC '.$p['lieu_deces']; }
        if ($p['profession']) $L[] = '1 OCCU '.$p['profession'];
        if ($p['biographie']) { foreach (str_split($p['biographie'], 248) as $i=>$chunk) $L[] = ($i===0?'1 NOTE ':'2 CONT ').$chunk; }
    }

    $famIdx = 1;
    foreach ($conjoints as $lien) {
        $pa = array_filter($personnes, fn($x)=>$x['id']==$lien['personne_a']); $pa=reset($pa);
        $pb = array_filter($personnes, fn($x)=>$x['id']==$lien['personne_b']); $pb=reset($pb);
        $husbId = ($pa['genre']==='female') ? $pb['id'] : $pa['id'];
        $wifeId = ($pa['genre']==='female') ? $pa['id'] : $pb['id'];
        $children = array_unique(array_column(array_filter($parEnf, fn($l)=>$l['personne_a']==$husbId||$l['personne_a']==$wifeId), 'personne_b'));
        $L[] = "0 @F{$famIdx}@ FAM";
        $L[] = "1 HUSB @I{$husbId}@";
        $L[] = "1 WIFE @I{$wifeId}@";
        if ($lien['date_debut']) { $L[]='1 MARR'; $L[]='2 DATE '.iso_to_ged($lien['date_debut']); if($lien['notes']) $L[]='2 PLAC '.$lien['notes']; }
        foreach ($children as $cid) $L[] = "1 CHIL @I{$cid}@";
        $famIdx++;
    }

    $L[] = '0 TRLR';
    return implode("\r\n", $L);
}

function import_gedcom(string $content, PDO $db): int {
    $lines   = preg_split('/\r?\n/', $content);
    $records = [];
    $cur     = null;

    foreach ($lines as $raw) {
        if (!preg_match('/^(\d+)\s+(?:(@\S+@)\s+)?(\w+)(?:\s+(.*))?$/', trim($raw), $m)) continue;
        [$_, $level, $xref, $tag, $val] = $m + [4=>''];
        $level = (int)$level;
        if ($level === 0) { if ($cur) $records[] = $cur; $cur = ['xref'=>$xref,'tag'=>$tag,'val'=>trim($val),'sub'=>[]]; }
        elseif ($cur) $cur['sub'][] = ['level'=>$level,'tag'=>$tag,'val'=>trim($val)];
    }
    if ($cur) $records[] = $cur;

    $indiMap = [];
    $imported = 0;

    $db->beginTransaction();
    try {
        $insP = $db->prepare("INSERT INTO personnes (prenom,nom,nom_naiss,genre,naissance,lieu_naiss,deces,lieu_deces,vivant,generation,profession,biographie) VALUES (?,?,?,?,?,?,?,?,?,0,?,?)");
        $insL = $db->prepare("INSERT IGNORE INTO liens (personne_a,personne_b,type,date_debut,notes) VALUES (?,?,?,?,?)");

        foreach ($records as $rec) {
            if ($rec['tag'] !== 'INDI') continue;
            $sub   = $rec['sub'];
            $get   = fn($t) => (array_filter($sub,fn($s)=>$s['tag']===$t)[array_key_first(array_filter($sub,fn($s)=>$s['tag']===$t))] ?? [])['val'] ?? null;
            $nameR = $get('NAME') ?? '';
            preg_match('/^(.*?)\s*\/(.*)\/\s*$/', $nameR, $nm);
            $prenom = trim($nm[1] ?? $nameR); $nom = trim($nm[2] ?? '');
            $sex   = $get('SEX');
            $genre = $sex==='F'?'female':($sex==='M'?'male':'autre');

            $naissance=$lieu_naiss=$deces=$lieu_deces=null; $vivant=1;
            foreach ($sub as $i=>$s) {
                if ($s['tag']==='BIRT') { $naissance=ged_to_iso($sub[$i+1]['val']??null); $lieu_naiss=$sub[$i+2]['tag']==='PLAC'?$sub[$i+2]['val']:null; }
                if ($s['tag']==='DEAT') { $vivant=0; $deces=ged_to_iso($sub[$i+1]['val']??null)??''; $lieu_deces=$sub[$i+2]['tag']==='PLAC'?$sub[$i+2]['val']:null; }
            }
            $note='';
            foreach ($sub as $s) { if($s['tag']==='NOTE'||$s['tag']==='CONT') $note.=$s['val']."\n"; }

            $insP->execute([$prenom?:'?',$nom?:'?',null,$genre,$naissance,$lieu_naiss,$deces,$lieu_deces,$vivant,$get('OCCU'),trim($note)?:null]);
            $indiMap[$rec['xref']] = $db->lastInsertId();
            $imported++;
        }

        foreach ($records as $rec) {
            if ($rec['tag'] !== 'FAM') continue;
            $get = fn($t) => array_values(array_filter($rec['sub'],fn($s)=>$s['tag']===$t));
            $husbX = preg_match('/@(\S+)@/',$get('HUSB')[0]['val']??'',$m)?'@'.$m[1].'@':null;
            $wifeX = preg_match('/@(\S+)@/',$get('WIFE')[0]['val']??'',$m)?'@'.$m[1].'@':null;
            $chilX = array_map(fn($s)=>preg_match('/@(\S+)@/',$s['val'],$m)?'@'.$m[1].'@':null,$get('CHIL'));
            $marrDate=$marrPlace=null;
            foreach ($rec['sub'] as $i=>$s) { if($s['tag']==='MARR'){$marrDate=ged_to_iso($rec['sub'][$i+1]['val']??null);$marrPlace=$rec['sub'][$i+2]['tag']==='PLAC'?$rec['sub'][$i+2]['val']:null;} }
            $hId=$husbX?($indiMap[$husbX]??null):null; $wId=$wifeX?($indiMap[$wifeX]??null):null;
            if ($hId&&$wId) $insL->execute([$hId,$wId,'conjoint',$marrDate,$marrPlace]);
            foreach ($chilX as $cx) { $cId=$cx?($indiMap[$cx]??null):null; if(!$cId) continue; if($hId) $insL->execute([$hId,$cId,'parent_enfant',null,null]); if($wId) $insL->execute([$wId,$cId,'parent_enfant',null,null]); }
        }
        $db->commit();
    } catch (Throwable $e) { $db->rollBack(); throw $e; }

    return $imported;
}

function import_json(array $data, PDO $db): int {
    $idMap=$evtMap=$anecMap=[]; $imported=0;
    $db->beginTransaction();
    try {
        $insP=$db->prepare("INSERT INTO personnes (prenom,nom,nom_naiss,genre,naissance,lieu_naiss,deces,lieu_deces,vivant,generation,profession,biographie) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)");
        foreach ($data['personnes']??[] as $p) {
            $insP->execute([$p['prenom'],$p['nom'],$p['nom_naiss']??null,$p['genre']??'male',$p['naissance']??null,$p['lieu_naiss']??null,$p['deces']??null,$p['lieu_deces']??null,$p['vivant']??1,$p['generation']??0,$p['profession']??null,$p['biographie']??null]);
            $idMap[$p['id']]=$db->lastInsertId(); $imported++;
        }
        $insL=$db->prepare('INSERT IGNORE INTO liens (personne_a,personne_b,type,date_debut,date_fin,notes) VALUES (?,?,?,?,?,?)');
        foreach ($data['liens']??[] as $l) { $a=$idMap[$l['personne_a']]??null;$b=$idMap[$l['personne_b']]??null; if($a&&$b) $insL->execute([$a,$b,$l['type'],$l['date_debut']??null,$l['date_fin']??null,$l['notes']??null]); }
        $insE=$db->prepare('INSERT INTO evenements (titre,type,date_debut,date_fin,lieu,description) VALUES (?,?,?,?,?,?)');
        foreach ($data['evenements']??[] as $e) { $insE->execute([$e['titre'],$e['type'],$e['date_debut']??null,$e['date_fin']??null,$e['lieu']??null,$e['description']??null]); $evtMap[$e['id']]=$db->lastInsertId(); }
        $insEP=$db->prepare('INSERT IGNORE INTO evenement_personnes (evenement_id,personne_id,role) VALUES (?,?,?)');
        foreach ($data['evenement_personnes']??[] as $ep) { $eid=$evtMap[$ep['evenement_id']]??null;$pid=$idMap[$ep['personne_id']]??null; if($eid&&$pid) $insEP->execute([$eid,$pid,$ep['role']??null]); }
        $insA=$db->prepare('INSERT INTO anecdotes (titre,contenu,date_anec,auteur) VALUES (?,?,?,?)');
        foreach ($data['anecdotes']??[] as $a) { $insA->execute([$a['titre'],$a['contenu'],$a['date_anec']??null,$a['auteur']??null]); $anecMap[$a['id']]=$db->lastInsertId(); }
        $insAP=$db->prepare('INSERT IGNORE INTO anecdote_personnes (anecdote_id,personne_id) VALUES (?,?)');
        foreach ($data['anecdote_personnes']??[] as $ap) { $aid=$anecMap[$ap['anecdote_id']]??null;$pid=$idMap[$ap['personne_id']]??null; if($aid&&$pid) $insAP->execute([$aid,$pid]); }
        $reunMap=[];
        $insR=$db->prepare('INSERT INTO reunions (titre,date_debut,date_fin,lieu,description) VALUES (?,?,?,?,?)');
        foreach ($data['reunions']??[] as $r) { $insR->execute([$r['titre'],$r['date_debut']??null,$r['date_fin']??null,$r['lieu']??null,$r['description']??null]); $reunMap[$r['id']]=$db->lastInsertId(); }
        $insRP=$db->prepare('INSERT IGNORE INTO reunion_personnes (reunion_id,personne_id,role) VALUES (?,?,?)');
        foreach ($data['reunion_personnes']??[] as $rp) { $rid=$reunMap[$rp['reunion_id']]??null;$pid=$idMap[$rp['personne_id']]??null; if($rid&&$pid) $insRP->execute([$rid,$pid,$rp['role']??null]); }
        $db->commit();
    } catch (Throwable $e) { $db->rollBack(); throw $e; }
    return $imported;
}
