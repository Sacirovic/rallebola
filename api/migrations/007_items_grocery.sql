-- Add checked column to items (idempotent)
SET @checked_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'items'
  AND COLUMN_NAME = 'checked'
);
SET @sql = IF(@checked_exists = 0,
  'ALTER TABLE items ADD COLUMN checked TINYINT(1) NOT NULL DEFAULT 0',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add position column to items (idempotent)
SET @pos_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'items'
  AND COLUMN_NAME = 'position'
);
SET @sql2 = IF(@pos_exists = 0,
  'ALTER TABLE items ADD COLUMN position INT NOT NULL DEFAULT 0',
  'SELECT 1'
);
PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- Initialise positions based on insertion order, but only for lists
-- where no positions have been customised yet (all still at default 0)
UPDATE items i
JOIN (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY list_id ORDER BY created_at ASC) - 1 AS pos
  FROM items
) ranked ON ranked.id = i.id
SET i.position = ranked.pos
WHERE i.list_id NOT IN (
  SELECT list_id FROM (SELECT DISTINCT list_id FROM items WHERE position > 0) AS customised
);
