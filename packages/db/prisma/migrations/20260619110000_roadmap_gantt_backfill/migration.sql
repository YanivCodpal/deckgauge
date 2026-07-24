-- Back-fill a default "Size" STATUS column into every board that lacks one.
-- Guard: board has no column named 'Size' of type 'status'.
INSERT INTO board_columns (id, "boardId", name, type, "order", config)
SELECT
  gen_random_uuid()::text,
  b.id,
  'Size',
  'status',
  0,
  '{"options":["XXS","XS","S","M","L","XL","XXL"]}'::jsonb
FROM boards b
WHERE NOT EXISTS (
  SELECT 1 FROM board_columns c
  WHERE c."boardId" = b.id
    AND c.name = 'Size'
    AND c.type = 'status'
);

-- Back-fill a default RoadmapConfig for every existing ROADMAP view that lacks one.
-- Guard: ROADMAP view has no roadmap_configs row.
INSERT INTO roadmap_configs (id, board_view_id, start_date, visible_quarters, size_durations, default_size_weeks, created_at, updated_at)
SELECT
  gen_random_uuid()::text,
  v.id,
  now(),
  4,
  '{"XXS":0.5,"XS":1,"S":2,"M":3,"L":4,"XL":6,"XXL":8}'::jsonb,
  2,
  now(),
  now()
FROM board_views v
WHERE v.type = 'roadmap'
  AND NOT EXISTS (
    SELECT 1 FROM roadmap_configs rc WHERE rc.board_view_id = v.id
  );
