ALTER TABLE items
  ADD COLUMN checked  TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN position INT        NOT NULL DEFAULT 0;

-- Initialise position to match existing insertion order
UPDATE items i
JOIN (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY list_id ORDER BY created_at ASC) - 1 AS pos
  FROM items
) ranked ON ranked.id = i.id
SET i.position = ranked.pos;
