import {
  type HomeClockWidgetSize,
  type HomeGridItem,
  type SessionData,
} from "contexts/session/types";

export const HOME_GRID_COLUMNS = 4;
export const HOME_GRID_ROWS = 6;

export const HOME_WIDGET_SPANS: Record<HomeClockWidgetSize, HomeGridSpan> = {
  compact: { columns: 2, rows: 1 },
  large: { columns: 4, rows: 2 },
  wide: { columns: 4, rows: 1 },
};

export type HomeGridSpan = { columns: number; rows: number };

export type HomeGridCell = { column: number; row: number };

export type HomeGridPlacement = HomeGridCell & { swapKey?: string };

type UnplacedHomeGridItem =
  | Omit<Extract<HomeGridItem, { type: "app" }>, "column" | "row">
  | Omit<Extract<HomeGridItem, { type: "widget" }>, "column" | "row">;

export const getHomeItemKey = ({ id, type }: HomeGridItem): string =>
  `${type}:${id}`;

export const getHomeItemSpan = (item: UnplacedHomeGridItem): HomeGridSpan =>
  item.type === "widget"
    ? HOME_WIDGET_SPANS[item.size]
    : { columns: 1, rows: 1 };

const GRID_ORIGIN: HomeGridCell = { column: 0, row: 0 };

const isInsideGrid = (
  { column, row }: HomeGridCell,
  { columns, rows }: HomeGridSpan
): boolean =>
  Number.isInteger(column) &&
  Number.isInteger(row) &&
  column >= 0 &&
  row >= 0 &&
  column + columns <= HOME_GRID_COLUMNS &&
  row + rows <= HOME_GRID_ROWS;

const overlaps = (
  cell: HomeGridCell,
  span: HomeGridSpan,
  item: HomeGridItem
): boolean => {
  const itemSpan = getHomeItemSpan(item);

  return (
    cell.column < item.column + itemSpan.columns &&
    item.column < cell.column + span.columns &&
    cell.row < item.row + itemSpan.rows &&
    item.row < cell.row + span.rows
  );
};

export const getOverlappingItems = (
  items: HomeGridItem[],
  cell: HomeGridCell,
  span: HomeGridSpan
): HomeGridItem[] => items.filter((item) => overlaps(cell, span, item));

export const isAreaFree = (
  items: HomeGridItem[],
  cell: HomeGridCell,
  span: HomeGridSpan
): boolean =>
  isInsideGrid(cell, span) &&
  getOverlappingItems(items, cell, span).length === 0;

/**
 * Free area closest to `preferred`. Without a preference the grid is filled
 * in reading order (row by row).
 */
export const findNearestFreeCell = (
  items: HomeGridItem[],
  span: HomeGridSpan,
  preferred?: HomeGridCell
): HomeGridCell | undefined => {
  let nearest: HomeGridCell | undefined;
  let nearestDistance = Infinity;

  for (let row = 0; row <= HOME_GRID_ROWS - span.rows; row++) {
    for (let column = 0; column <= HOME_GRID_COLUMNS - span.columns; column++) {
      const cell = { column, row };

      if (isAreaFree(items, cell, span)) {
        const distance = preferred
          ? (column - preferred.column) ** 2 + (row - preferred.row) ** 2
          : row * HOME_GRID_COLUMNS + column;

        if (distance < nearestDistance) {
          nearest = cell;
          nearestDistance = distance;
        }
      }
    }
  }

  return nearest;
};

const clampCell = (cell: HomeGridCell, span: HomeGridSpan): HomeGridCell => ({
  column: Math.min(Math.max(cell.column, 0), HOME_GRID_COLUMNS - span.columns),
  row: Math.min(Math.max(cell.row, 0), HOME_GRID_ROWS - span.rows),
});

/**
 * Where a dragged item lands when released over `cell`: the cell itself if
 * free, a swap when dropped exactly onto another app, otherwise the nearest
 * free area of the page.
 */
export const resolveHomeDrop = (
  pageItems: HomeGridItem[],
  dragged: HomeGridItem,
  cell: HomeGridCell
): HomeGridPlacement | undefined => {
  const draggedKey = getHomeItemKey(dragged);
  const span = getHomeItemSpan(dragged);
  const target = clampCell(cell, span);
  const others = pageItems.filter(
    (item) => getHomeItemKey(item) !== draggedKey
  );

  if (isAreaFree(others, target, span)) return target;

  const [occupant, ...moreOccupants] = getOverlappingItems(
    others,
    target,
    span
  );

  if (
    dragged.type === "app" &&
    occupant?.type === "app" &&
    moreOccupants.length === 0
  ) {
    return {
      column: occupant.column,
      row: occupant.row,
      swapKey: getHomeItemKey(occupant),
    };
  }

  return findNearestFreeCell(others, span, target);
};

export const findHomeItem = (
  pages: HomeGridItem[][],
  key: string
): { item: HomeGridItem; page: number } | undefined => {
  for (const [page, pageItems] of pages.entries()) {
    const item = pageItems.find((pageItem) => getHomeItemKey(pageItem) === key);

    if (item) return { item, page };
  }

  return undefined;
};

export const removeHomeItem = (
  pages: HomeGridItem[][],
  key: string
): HomeGridItem[][] =>
  pages.map((pageItems) =>
    pageItems.filter((item) => getHomeItemKey(item) !== key)
  );

export const moveHomeItem = (
  pages: HomeGridItem[][],
  key: string,
  targetPage: number,
  { swapKey, ...cell }: HomeGridPlacement
): HomeGridItem[][] => {
  const source = findHomeItem(pages, key);

  if (!source) return pages;

  const swapped =
    swapKey === undefined ? undefined : findHomeItem(pages, swapKey);
  const withoutMoved = removeHomeItem(
    swapped ? removeHomeItem(pages, swapKey as string) : pages,
    key
  );

  return withoutMoved.map((pageItems, page) => [
    ...pageItems,
    ...(page === targetPage ? [{ ...source.item, ...cell }] : []),
    ...(swapped && page === source.page
      ? [
          {
            ...swapped.item,
            column: source.item.column,
            row: source.item.row,
          },
        ]
      : []),
  ]);
};

/**
 * Places an item on the first page with room, starting at `startPage` and as
 * close to `preferred` as possible. A new
 * page is appended when every page is full.
 */
export const placeHomeItem = (
  pages: HomeGridItem[][],
  item: UnplacedHomeGridItem,
  startPage = 0,
  preferred?: HomeGridCell
): { page: number; pages: HomeGridItem[][] } => {
  const span = getHomeItemSpan(item);
  const pageIndexes = pages.map((_, page) => page);
  const pageOrder = [
    ...pageIndexes.filter((page) => page >= startPage),
    ...pageIndexes.filter((page) => page < startPage),
  ];

  for (const page of pageOrder) {
    const cell = findNearestFreeCell(pages[page], span, preferred);

    if (cell) {
      return {
        page,
        pages: pages.map((pageItems, index) =>
          index === page ? [...pageItems, { ...item, ...cell }] : pageItems
        ),
      };
    }
  }

  return {
    page: pages.length,
    pages: [...pages, [{ ...item, ...GRID_ORIGIN }]],
  };
};

const isWidgetSize = (size: unknown): size is HomeClockWidgetSize =>
  size === "compact" || size === "large" || size === "wide";

const toUnplacedItem = (entry: unknown): undefined | UnplacedHomeGridItem => {
  if (typeof entry === "string") return { id: entry, type: "app" };
  if (!entry || typeof entry !== "object") return undefined;

  const { id, size, type } = entry as Record<string, unknown>;

  if (type === "app" && typeof id === "string") return { id, type };
  if (type === "widget" && id === "clock" && isWidgetSize(size)) {
    return { id, size, type };
  }

  return undefined;
};

/**
 * Restores the home screen from a saved session. Also migrates the older
 * formats (a flat app list or app ids per page plus a separate clock widget).
 */
export const restoreHomePages = (
  session: Partial<SessionData>
): HomeGridItem[][] | undefined => {
  const savedPages: undefined | unknown[][] =
    Array.isArray(session.homePages) &&
    session.homePages.length > 0 &&
    session.homePages.every(Array.isArray)
      ? session.homePages
      : Array.isArray(session.homeApps)
        ? [session.homeApps]
        : undefined;

  if (!savedPages && !session.homeClockWidgetSize) return undefined;

  let pages: HomeGridItem[][] = (savedPages || [[]]).map(() => []);
  const unplaced: { item: UnplacedHomeGridItem; page: number }[] = [];
  const seenKeys = new Set<string>();

  if (isWidgetSize(session.homeClockWidgetSize)) {
    unplaced.push({
      item: { id: "clock", size: session.homeClockWidgetSize, type: "widget" },
      page: 0,
    });
  }

  savedPages?.forEach((entries, page) => {
    for (const entry of entries) {
      const item = toUnplacedItem(entry);

      if (item) {
        const { column, row } = (entry || {}) as Partial<HomeGridCell>;
        const placed = { ...item, column, row } as HomeGridItem;

        if (
          typeof column === "number" &&
          typeof row === "number" &&
          !seenKeys.has(getHomeItemKey(placed)) &&
          isAreaFree(pages[page], placed, getHomeItemSpan(item))
        ) {
          pages[page].push(placed);
          seenKeys.add(getHomeItemKey(placed));
        } else {
          unplaced.push({ item, page });
        }
      }
    }
  });

  for (const { item, page } of unplaced) {
    const key = getHomeItemKey(item as HomeGridItem);

    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      ({ pages } = placeHomeItem(pages, item, page));
    }
  }

  return pages;
};
