ALTER TABLE items
  ADD COLUMN IF NOT EXISTS checked  TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS position INT        NOT NULL DEFAULT 0;

-- Initialise positions based on insertion order, but only for lists
-- where no positions have been customised yet (all still at default 0)
UPDATE items i
JOIN (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY list_id ORDER BY created_at ASC) - 1 AS pos
  FROM items
) ranked ON ranked.id = i.id
SET i.position = ranked.pos
WHERE NOT EXISTS (
  SELECT 1 FROM items i2 WHERE i2.list_id = i.list_id AND i2.position > 0
);
