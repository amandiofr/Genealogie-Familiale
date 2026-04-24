<?php
require_once __DIR__ . '/DbTestCase.php';

class PersonnesTest extends DbTestCase
{
    // ── Schema ────────────────────────────────────────────────────────────────

    public function testAllTablesExist(): void
    {
        $tables = $this->db->query("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
                           ->fetchAll(PDO::FETCH_COLUMN);

        $expected = [
            'anecdote_personnes', 'anecdote_photos', 'anecdotes',
            'auto_photos', 'autos',
            'evenement_personnes', 'evenement_photos', 'evenements',
            'liens', 'modification_log', 'notification_emails', 'notification_state',
            'personnes', 'photos',
            'remember_tokens',
            'utilisateurs',
        ];

        foreach ($expected as $table) {
            $this->assertContains($table, $tables, "Table '$table' manquante");
        }
    }

    // ── Personnes ─────────────────────────────────────────────────────────────

    public function testInsertAndRetrievePerson(): void
    {
        $id = $this->insertPerson('Marie', 'Dupont', ['naissance' => '1950-06-15', 'vivant' => 1]);

        $p = $this->db->prepare('SELECT * FROM personnes WHERE id=?');
        $p->execute([$id]);
        $row = $p->fetch();

        $this->assertEquals('Marie', $row['prenom']);
        $this->assertEquals('Dupont', $row['nom']);
        $this->assertEquals('1950-06-15', $row['naissance']);
        $this->assertEquals(1, $row['vivant']);
    }

    public function testDeceasedPerson(): void
    {
        $id = $this->insertPerson('Jean', 'Martin', ['vivant' => 0, 'deces' => '2010-03-01']);
        $row = $this->db->query("SELECT * FROM personnes WHERE id=$id")->fetch();

        $this->assertEquals(0, $row['vivant']);
        $this->assertEquals('2010-03-01', $row['deces']);
    }

    public function testListPersonnesOrderedByNomPrenom(): void
    {
        $z = $this->insertPerson('Zoé', 'Martin');
        $a = $this->insertPerson('Alice', 'Dupont');
        $b = $this->insertPerson('Bob', 'Dupont');

        $ids = implode(',', [$z, $a, $b]);
        $rows = $this->db->query("SELECT prenom, nom FROM personnes WHERE id IN ($ids) ORDER BY nom, prenom")->fetchAll();

        $this->assertEquals('Alice', $rows[0]['prenom']);
        $this->assertEquals('Bob',   $rows[1]['prenom']);
        $this->assertEquals('Zoé',   $rows[2]['prenom']);
    }

    // ── Liens ─────────────────────────────────────────────────────────────────

    public function testParentEnfantLien(): void
    {
        $parent = $this->insertPerson('Pierre', 'Dupont');
        $enfant = $this->insertPerson('Lucie', 'Dupont');

        $this->db->prepare("INSERT INTO liens (personne_a, personne_b, type) VALUES (?, ?, 'parent_enfant')")
                 ->execute([$parent, $enfant]);

        $st = $this->db->prepare("SELECT * FROM liens WHERE personne_a=? AND personne_b=? AND type='parent_enfant'");
        $st->execute([$parent, $enfant]);
        $lien = $st->fetch();
        $this->assertEquals($parent, $lien['personne_a']);
        $this->assertEquals($enfant, $lien['personne_b']);
    }

    public function testUniqueLienConstraint(): void
    {
        $a = $this->insertPerson('A', 'A');
        $b = $this->insertPerson('B', 'B');
        $this->db->prepare("INSERT INTO liens (personne_a, personne_b, type) VALUES (?, ?, 'conjoint')")
                 ->execute([$a, $b]);

        $this->expectException(\PDOException::class);
        $this->db->prepare("INSERT INTO liens (personne_a, personne_b, type) VALUES (?, ?, 'conjoint')")
                 ->execute([$a, $b]);
    }

    public function testCascadeDeleteRemovesLiens(): void
    {
        $a = $this->insertPerson('A', 'A');
        $b = $this->insertPerson('B', 'B');
        $this->db->prepare("INSERT INTO liens (personne_a, personne_b, type) VALUES (?, ?, 'conjoint')")
                 ->execute([$a, $b]);

        $this->db->prepare('DELETE FROM personnes WHERE id=?')->execute([$a]);

        $st = $this->db->prepare("SELECT COUNT(*) FROM liens WHERE personne_a=? OR personne_b=?");
        $st->execute([$a, $a]);
        $this->assertEquals(0, $st->fetchColumn(), 'Les liens doivent être supprimés en cascade');
    }

    // ── Seed data (skipped if seed.sql absent) ────────────────────────────────

    public function testSeedPersonnesLoaded(): void
    {
        if (!file_exists(__DIR__ . '/../fixtures/seed.sql')) {
            $this->markTestSkipped('seed.sql absent');
        }
        $count = (int) $this->db->query('SELECT COUNT(*) FROM personnes')->fetchColumn();
        $this->assertGreaterThan(0, $count);
    }

    public function testSeedLiensLoaded(): void
    {
        if (!file_exists(__DIR__ . '/../fixtures/seed.sql')) {
            $this->markTestSkipped('seed.sql absent');
        }
        $count = (int) $this->db->query('SELECT COUNT(*) FROM liens')->fetchColumn();
        $this->assertGreaterThan(0, $count);
    }
}
