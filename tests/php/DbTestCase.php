<?php
use PHPUnit\Framework\TestCase;

/**
 * Base class for tests that need a database.
 * Uses SQLite in-memory, loaded from:
 *   - tests/fixtures/schema.sqlite.sql  (committed, always present)
 *   - tests/fixtures/seed.sql           (gitignored, MySQL dump from OVH)
 */
abstract class DbTestCase extends TestCase
{
    protected PDO $db;

    protected function setUp(): void
    {
        $this->db = new PDO('sqlite::memory:', null, null, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
        $this->db->exec('PRAGMA foreign_keys = ON;');

        // MySQL IF(cond, true, false) → SQLite user function
        $this->db->sqliteCreateFunction('IF', fn($c, $t, $f) => $c ? $t : $f, 3);

        $this->db->exec(file_get_contents(__DIR__ . '/../fixtures/schema.sqlite.sql'));

        $seed = __DIR__ . '/../fixtures/seed.sql';
        if (file_exists($seed)) {
            $this->loadMysqlDump($seed);
        }
    }

    /**
     * Extracts INSERT statements from a MySQL dump and replays them on SQLite.
     * Skips statements that fail (e.g. MySQL-only functions in DEFAULT values).
     */
    private function loadMysqlDump(string $path): void
    {
        $content = file_get_contents($path);

        // Match multiline INSERT statements
        preg_match_all('/^INSERT INTO\s+.+?;\s*$/ms', $content, $matches);

        foreach ($matches[0] as $insert) {
            // MySQL escapes single quotes with \' — SQLite uses '' instead
            $insert = str_replace("\\'", "''", $insert);

            try {
                $this->db->exec($insert);
            } catch (\PDOException) {
                // Silently skip rows with MySQL-specific syntax
            }
        }
    }

    /** Insert a minimal person and return its id. */
    protected function insertPerson(string $prenom, string $nom, array $extra = []): int
    {
        $fields = array_merge(['prenom' => $prenom, 'nom' => $nom, 'vivant' => 1], $extra);
        $cols   = implode(', ', array_keys($fields));
        $placeholders = implode(', ', array_fill(0, count($fields), '?'));
        $this->db->prepare("INSERT INTO personnes ($cols) VALUES ($placeholders)")
                 ->execute(array_values($fields));
        return (int) $this->db->lastInsertId();
    }
}
