// Groups with more rows than this threshold render via VirtualProjectRows
// (react-window FixedSizeList) instead of the standard @dnd-kit sortable map.
// Drag-and-drop is disabled for virtualized groups because SortableContext
// cannot be mixed with a windowed list.
export const VIRTUALIZE_THRESHOLD = 200;
