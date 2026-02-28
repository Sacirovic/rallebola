-- Add roadtrip_id to lists (idempotent)
SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'lists'
  AND COLUMN_NAME = 'roadtrip_id'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE lists ADD COLUMN roadtrip_id INT NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add FK constraint (idempotent)
SET @fk_exists = (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'lists'
  AND CONSTRAINT_NAME = 'fk_lists_roadtrip'
);
SET @sql2 = IF(@fk_exists = 0,
  'ALTER TABLE lists ADD CONSTRAINT fk_lists_roadtrip FOREIGN KEY (roadtrip_id) REFERENCES roadtrips(id) ON DELETE CASCADE',
  'SELECT 1'
);
PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- Backfill grocery lists for existing roadtrips
INSERT INTO lists (user_id, name, roadtrip_id)
SELECT r.owner_id, CONCAT(r.name, ' – Grocery List'), r.id
FROM roadtrips r
WHERE NOT EXISTS (SELECT 1 FROM lists l WHERE l.roadtrip_id = r.id);
