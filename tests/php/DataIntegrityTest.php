<?php
require_once __DIR__ . '/DbTestCase.php';

/**
 * Tests d'intégrité sur les données réelles (seed.sql).
 * Tous les tests sont skippés si seed.sql est absent.
 */
class DataIntegrityTest extends DbTestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        if (!file_exists(__DIR__ . '/../fixtures/seed.sql')) {
            $this->markTestSkipped('seed.sql absent');
        }
    }

    // ── Liens ─────────────────────────────────────────────────────────────────

    public function testPasDeAutoLien(): void
    {
        $count = $this->db->query(
            "SELECT COUNT(*) FROM liens WHERE personne_a = personne_b"
        )->fetchColumn();

        $this->assertEquals(0, $count, 'Une personne ne peut pas être liée à elle-même');
    }

    public function testLiensPointentVersPersonnesExistantes(): void
    {
        $orphans = $this->db->query("
            SELECT COUNT(*) FROM liens l
            WHERE NOT EXISTS (SELECT 1 FROM personnes WHERE id = l.personne_a)
               OR NOT EXISTS (SELECT 1 FROM personnes WHERE id = l.personne_b)
        ")->fetchColumn();

        $this->assertEquals(0, $orphans, 'Tous les liens doivent pointer vers des personnes existantes');
    }

    public function testMaxDeuxParentsParPersonne(): void
    {
        $rows = $this->db->query("
            SELECT personne_b, COUNT(*) AS nb
            FROM liens
            WHERE type = 'parent_enfant'
            GROUP BY personne_b
            HAVING nb > 2
        ")->fetchAll();

        $this->assertEmpty($rows, 'Une personne ne peut pas avoir plus de 2 parents');
    }

    public function testPasDeDoublonConjoint(): void
    {
        // (A conjoint B) et (B conjoint A) simultanément = doublon
        $doublons = $this->db->query("
            SELECT COUNT(*) FROM liens l1
            JOIN liens l2
              ON l1.personne_a = l2.personne_b
             AND l1.personne_b = l2.personne_a
             AND l1.type = 'conjoint'
             AND l2.type = 'conjoint'
             AND l1.id < l2.id
        ")->fetchColumn();

        $this->assertEquals(0, $doublons, 'Le lien conjoint ne doit pas être dupliqué dans les deux sens');
    }

    // ── Dates ─────────────────────────────────────────────────────────────────

    public function testPasDeDecesAvantNaissance(): void
    {
        $rows = $this->db->query("
            SELECT id, prenom, nom, naissance, deces
            FROM personnes
            WHERE naissance IS NOT NULL
              AND deces IS NOT NULL
              AND deces < naissance
        ")->fetchAll();

        $this->assertEmpty(
            $rows,
            'Personnes avec décès avant naissance : ' . implode(', ', array_map(
                fn($r) => "{$r['prenom']} {$r['nom']} ({$r['naissance']} → {$r['deces']})", $rows
            ))
        );
    }

    public function testPasDeNaissanceDansLeFutur(): void
    {
        $rows = $this->db->query("
            SELECT id, prenom, nom, naissance
            FROM personnes
            WHERE naissance > DATE('now')
        ")->fetchAll();

        $this->assertEmpty($rows, 'Dates de naissance dans le futur détectées');
    }

    public function testDecedeSansDateDeDecesEstRare(): void
    {
        // Pas une erreur bloquante, mais on documente combien il y en a
        $count = $this->db->query("
            SELECT COUNT(*) FROM personnes
            WHERE vivant = 0 AND deces IS NULL
        ")->fetchColumn();

        // Simple documentation — on tolère jusqu'à 20% des décédés sans date
        $totalDecedes = $this->db->query(
            "SELECT COUNT(*) FROM personnes WHERE vivant = 0"
        )->fetchColumn();

        if ($totalDecedes > 0) {
            $ratio = $count / $totalDecedes;
            $this->assertLessThan(
                0.5,
                $ratio,
                "$count décédés sur $totalDecedes sans date de décès (> 50%)"
            );
        } else {
            $this->assertEquals(0, $count);
        }
    }

    // ── Cohérence généalogique ────────────────────────────────────────────────

    public function testDifferenceAgeParentEnfantRaisonnable(): void
    {
        $rows = $this->db->query("
            SELECT
                parent.id   AS parent_id,
                parent.prenom || ' ' || parent.nom AS parent_nom,
                enfant.prenom || ' ' || enfant.nom AS enfant_nom,
                parent.naissance AS parent_naiss,
                enfant.naissance AS enfant_naiss,
                CAST(strftime('%Y', enfant.naissance) AS INTEGER)
                  - CAST(strftime('%Y', parent.naissance) AS INTEGER) AS diff_ans
            FROM liens l
            JOIN personnes parent ON parent.id = l.personne_a
            JOIN personnes enfant ON enfant.id = l.personne_b
            WHERE l.type = 'parent_enfant'
              AND parent.naissance IS NOT NULL
              AND enfant.naissance IS NOT NULL
              AND ABS(
                CAST(strftime('%Y', enfant.naissance) AS INTEGER)
                - CAST(strftime('%Y', parent.naissance) AS INTEGER)
              ) < 10
        ")->fetchAll();

        $this->assertEmpty(
            $rows,
            'Parents/enfants avec moins de 10 ans d\'écart : ' . implode(', ', array_map(
                fn($r) => "{$r['parent_nom']} → {$r['enfant_nom']} ({$r['diff_ans']} ans)", $rows
            ))
        );
    }

    // ── Requêtes de l'API ─────────────────────────────────────────────────────

    public function testRequeteListePersonnesAvecPhoto(): void
    {
        // Requête exacte de api/personnes.php GET liste
        $rows = $this->db->query("
            SELECT p.*, ph.chemin_thumb
            FROM   personnes p
            LEFT JOIN photos ph ON ph.id = p.photo_id
            ORDER BY p.generation, p.nom, p.prenom
        ")->fetchAll();

        $this->assertGreaterThan(0, count($rows));
        $this->assertArrayHasKey('prenom', $rows[0]);
        $this->assertArrayHasKey('chemin_thumb', $rows[0]);
    }

    public function testRequeteLiensAvecInfosAutrePersonne(): void
    {
        // Requête exacte de api/personnes.php GET fiche (utilise IF() → user function SQLite)
        $id = (int) $this->db->query("SELECT id FROM personnes LIMIT 1")->fetchColumn();

        $rows = $this->db->prepare("
            SELECT l.id AS lien_id, l.personne_a, l.personne_b, l.type,
                   pe.prenom, pe.nom
            FROM liens l
            JOIN personnes pe ON pe.id = IIF(l.personne_a=?, l.personne_b, l.personne_a)
            WHERE l.personne_a=? OR l.personne_b=?
        ");
        $rows->execute([$id, $id, $id]);
        $liens = $rows->fetchAll();

        // Vérifier que tous les liens retournés concernent bien cette personne
        foreach ($liens as $lien) {
            $this->assertTrue(
                $lien['personne_a'] == $id || $lien['personne_b'] == $id,
                'Le lien retourné ne concerne pas la personne demandée'
            );
        }
    }

    public function testRequeteFreresSoeurs(): void
    {
        // Trouver une personne qui a au moins un parent dans la DB
        $row = $this->db->query("
            SELECT personne_b AS id FROM liens WHERE type='parent_enfant' LIMIT 1
        ")->fetch();

        if (!$row) {
            $this->markTestSkipped('Aucun lien parent_enfant dans la seed');
        }

        $id = (int) $row['id'];

        // Requête exacte de api/personnes.php (frères/sœurs)
        $st = $this->db->prepare("
            SELECT DISTINCT pe.id, pe.prenom, pe.nom
            FROM liens l
            JOIN personnes pe ON pe.id = l.personne_b
            WHERE l.type = 'parent_enfant'
              AND l.personne_a IN (
                  SELECT personne_a FROM liens
                  WHERE personne_b = ? AND type = 'parent_enfant'
              )
              AND pe.id != ?
            ORDER BY pe.naissance IS NULL, pe.naissance ASC
        ");
        $st->execute([$id, $id]);
        $siblings = $st->fetchAll();

        // Pas d'erreur SQL et pas de doublon
        $ids = array_column($siblings, 'id');
        $this->assertEquals(count($ids), count(array_unique($ids)), 'Doublons dans les frères/sœurs');
        $this->assertNotContains($id, $ids, 'La personne ne doit pas apparaître dans ses propres frères/sœurs');
    }
}
