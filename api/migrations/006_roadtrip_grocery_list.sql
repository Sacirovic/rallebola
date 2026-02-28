ALTER TABLE lists
  ADD COLUMN IF NOT EXISTS roadtrip_id INT NULL;

-- Re-create FK idempotently (DROP IF EXISTS supported in MySQL 8.0.29+)
ALTER TABLE lists DROP CONSTRAINT IF EXISTS fk_lists_roadtrip;
ALTER TABLE lists ADD CONSTRAINT fk_lists_roadtrip
  FOREIGN KEY (roadtrip_id) REFERENCES roadtrips(id) ON DELETE CASCADE;

-- Backfill grocery lists for existing roadtrips
INSERT INTO lists (user_id, name, roadtrip_id)
SELECT r.owner_id, CONCAT(r.name, ' – Grocery List'), r.id
FROM roadtrips r
WHERE NOT EXISTS (SELECT 1 FROM lists l WHERE l.roadtrip_id = r.id);
