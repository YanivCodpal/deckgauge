-- Add per-option colors to existing "Size" STATUS columns so the cell renders
-- as a colored status-style pill. Additive: keeps the existing `options` array
-- and only adds `optionColors`. Hand-written (migrate:dev is unavailable here);
-- applied via migrate:deploy.

UPDATE board_columns
SET config = '{"options":["XXS","XS","S","M","L","XL","XXL"],"optionColors":{"XXS":"#00C875","XS":"#9CD326","S":"#CAB641","M":"#FFCB00","L":"#FDAB3D","XL":"#FF642E","XXL":"#E44258"}}'::jsonb
WHERE name = 'Size' AND type = 'status';
