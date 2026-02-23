-- Add created_by to roadtrip_todos (idempotent)
SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'roadtrip_todos'
  AND COLUMN_NAME = 'created_by'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE roadtrip_todos ADD COLUMN created_by INT NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists = (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'roadtrip_todos'
  AND CONSTRAINT_NAME = 'fk_todo_creator'
);
SET @sql2 = IF(@fk_exists = 0,
  'ALTER TABLE roadtrip_todos ADD CONSTRAINT fk_todo_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;
