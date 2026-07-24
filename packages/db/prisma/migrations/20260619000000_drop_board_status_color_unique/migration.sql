-- Drop the UNIQUE (board_id, color) constraint on board_statuses.
--
-- This index capped each board at as many statuses as there were palette
-- colors and made the Azure DevOps promote service crash (P2002) once a board
-- mapped more distinct work-item states than available colors. Status labels
-- stay unique per board via board_statuses_board_id_label_key; colors may now
-- repeat, and the promote service reuses the least-used color when the palette
-- is exhausted.
DROP INDEX "board_statuses_board_id_color_key";
