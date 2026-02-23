-- Add position column to roadtrip_todos (idempotent)
SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'roadtrip_todos'
  AND COLUMN_NAME = 'position'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE roadtrip_todos ADD COLUMN position INT NOT NULL DEFAULT 0',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
