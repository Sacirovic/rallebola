ALTER TABLE lists
  ADD COLUMN roadtrip_id INT NULL,
  ADD CONSTRAINT fk_lists_roadtrip
    FOREIGN KEY (roadtrip_id) REFERENCES roadtrips(id) ON DELETE CASCADE;

-- Backfill grocery lists for existing roadtrips
INSERT INTO lists (user_id, name, roadtrip_id)
SELECT r.owner_id, CONCAT(r.name, ' – Grocery List'), r.id
FROM roadtrips r
WHERE NOT EXISTS (SELECT 1 FROM lists l WHERE l.roadtrip_id = r.id);
