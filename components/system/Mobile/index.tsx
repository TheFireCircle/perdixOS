import { useEffect, useRef, useState } from "react";
import {
  findHomeItem,
  findNearestFreeCell,
  getHomeItemKey,
  getHomeItemSpan,
  HOME_GRID_COLUMNS,
  HOME_GRID_ROWS,
  HOME_WIDGET_SPANS,
  type HomeGridCell,
  type HomeGridPlacement,
  type HomeGridSpan,
  isAreaFree,
  moveHomeItem,
  placeHomeItem,
  removeHomeItem,
  resolveHomeDrop,
} from "components/system/Mobile/homeGrid";
import StyledMobileShell from "components/system/Mobile/StyledMobileShell";
import { useProcesses, useProcessesActions } from "contexts/process";
import processDirectory from "contexts/process/directory";
import {
  useForegroundId,
  useHomePages,
  useSessionActions,
  useStackOrder,
} from "contexts/session";
import {
  type HomeClockWidgetSize,
  type HomeGridItem,
  type SurfaceMode,
} from "contexts/session/types";
import { PROCESS_DELIMITER } from "utils/constants";
import {
  SYSTEM_NOTIFICATION_EVENT,
  type SystemNotification,
  type SystemNotificationInput,
} from "utils/notifications";

const QUICK_SETTINGS = [
  { icon: "⌁", key: "wifi", label: "WLAN" },
  { icon: "ᛒ", key: "bluetooth", label: "Bluetooth" },
  { icon: "−", key: "doNotDisturb", label: "Nicht stören" },
  { icon: "✈", key: "airplaneMode", label: "Flugmodus" },
  { icon: "⌖", key: "location", label: "Standort" },
  { icon: "◉", key: "flashlight", label: "Taschenlampe" },
  { icon: "%", key: "batterySaver", label: "Akkusparen" },
  { icon: "↻", key: "autoRotate", label: "Automatisch drehen" },
] as const;

type QuickSettingKey = (typeof QUICK_SETTINGS)[number]["key"];

const INITIAL_QUICK_SETTINGS: Record<QuickSettingKey, boolean> = {
  airplaneMode: false,
  autoRotate: true,
  batterySaver: false,
  bluetooth: false,
  doNotDisturb: false,
  flashlight: false,
  location: true,
  wifi: true,
};

const AVAILABLE_APPS = Object.entries(processDirectory)
  .filter(
    ([, { dialogProcess, hideTaskbarEntry, icon }]) =>
      Boolean(icon) && !dialogProcess && !hideTaskbarEntry
  )
  .map(([id, { icon, title }]) => ({ icon, id, title }))
  .sort((left, right) => left.title.localeCompare(right.title, "de"));

const AVAILABLE_APPS_BY_ID = new Map(
  AVAILABLE_APPS.map((app) => [app.id, app])
);

const getAppIconUrl = (icon: string): string =>
  `/System/Icons/48x48/${icon.split("/").at(-1) || "unknown.webp"}`;

const HOME_LONG_PRESS_MS = 500;
const HOME_SWIPE_START_DISTANCE = 10;
const HOME_SWIPE_PAGE_RATIO = 0.2;
const HOME_FLICK_DISTANCE = 40;
const HOME_FLICK_DURATION_MS = 250;
const HOME_DRAG_EDGE_SIZE = 28;
const HOME_DRAG_EDGE_DELAY_MS = 600;
const HOME_REMOVE_ZONE_BOTTOM = 76;

const WIDGET_SIZE_LABELS = [
  ["compact", "Kompakt"],
  ["wide", "Breit"],
  ["large", "Groß"],
] as const;

type HomeGesture = {
  mode: "item" | "page" | "pending";
  pointerId: number;
  startTime: number;
  startX: number;
  startY: number;
};

type HomeDropTarget = "remove" | { page: number; placement: HomeGridPlacement };

type HomeDrag = {
  createdPage?: number;
  edgeDirection: -1 | 0 | 1;
  edgeTimer?: number;
  height: number;
  item: HomeGridItem;
  key: string;
  moved: boolean;
  offsetX: number;
  offsetY: number;
  pickupX: number;
  pickupY: number;
  target?: HomeDropTarget;
  width: number;
  x: number;
  y: number;
};

type HomeItemMenu = {
  key: string;
  placement: "above" | "below";
  x: number;
  y: number;
};

const getGridAreaStyle = (
  { column, row }: HomeGridCell,
  { columns, rows }: HomeGridSpan
): React.CSSProperties => ({
  gridColumn: `${column + 1} / span ${columns}`,
  gridRow: `${row + 1} / span ${rows}`,
});

const isSameDropTarget = (
  left?: HomeDropTarget,
  right?: HomeDropTarget
): boolean => JSON.stringify(left) === JSON.stringify(right);

const getHomeItemElement = (
  container: HTMLElement | null,
  key: string
): HTMLElement | undefined =>
  container?.querySelector<HTMLElement>(
    `[data-home-item="${CSS.escape(key)}"]`
  ) ?? undefined;

type MobileShellProps = {
  surfaceMode: SurfaceMode;
};

const MobileShell: FC<MobileShellProps> = ({ surfaceMode }) => {
  const [now, setNow] = useState(() => new Date());
  const [recentsOpen, setRecentsOpen] = useState(false);
  const [appDrawerOpen, setAppDrawerOpen] = useState(false);
  const [appSearch, setAppSearch] = useState("");
  const [widgetPickerOpen, setWidgetPickerOpen] = useState(false);
  const [homePage, setHomePage] = useState(0);
  const [homeMenuVisible, setHomeMenuVisible] = useState(false);
  const [homeMenuPosition, setHomeMenuPosition] = useState({
    x: 0,
    y: 0,
  });
  const [homeItemMenu, setHomeItemMenu] = useState<HomeItemMenu>();
  const [homeDrag, setHomeDrag] =
    useState<Pick<HomeDrag, "height" | "item" | "key" | "width">>();
  const [homeDropTarget, setHomeDropTarget] = useState<HomeDropTarget>();
  const [notificationCenterOpen, setNotificationCenterOpen] = useState(false);
  const [quickSettingsExpanded, setQuickSettingsExpanded] = useState(false);
  const [brightness, setBrightness] = useState(82);
  const [quickSettings, setQuickSettings] = useState(INITIAL_QUICK_SETTINGS);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const notificationIdRef = useRef(0);
  const statusPointerStartRef = useRef<number | undefined>(undefined);
  const pulledDownRef = useRef(false);
  const appDrawerPointerStartRef = useRef<number | undefined>(undefined);
  const appDrawerGestureTriggeredRef = useRef(false);
  const homeRef = useRef<HTMLElement>(null);
  const homeTrackRef = useRef<HTMLDivElement>(null);
  const homeGhostRef = useRef<HTMLDivElement | null>(null);
  const homeGestureRef = useRef<HomeGesture | undefined>(undefined);
  const homeDragRef = useRef<HomeDrag | undefined>(undefined);
  const homeLongPressTimerRef = useRef<number | undefined>(undefined);
  const lastHomePointerTypeRef = useRef("");
  const suppressHomeClickRef = useRef(false);
  const processes = useProcesses();
  const foregroundId = useForegroundId();
  const stackOrder = useStackOrder();
  const homePages = useHomePages();
  const { setHomePages } = useSessionActions();
  const { closeWithTransition, minimize, open } = useProcessesActions();
  const currentHomePage = Math.min(homePage, homePages.length - 1);
  const homeItems = homePages.flat();
  const homeAppIds = new Set(
    homeItems.flatMap((item) => (item.type === "app" ? [item.id] : []))
  );
  const hasClockWidget = homeItems.some(({ type }) => type === "widget");
  const homeItemMenuTarget =
    homeItemMenu && findHomeItem(homePages, homeItemMenu.key)?.item;
  const normalizedAppSearch = appSearch.trim().toLocaleLowerCase("de");
  const filteredApps = AVAILABLE_APPS.filter(({ title }) =>
    title.toLocaleLowerCase("de").includes(normalizedAppSearch)
  );
  const activeProcessId =
    (foregroundId && !processes[foregroundId]?.minimized && foregroundId) ||
    stackOrder.find((id) => {
      const process = processes[id];

      return (
        process &&
        !process.minimized &&
        !process.closing &&
        !process.dialogProcess &&
        process.hasWindow !== false &&
        !process.hideTaskbarEntry
      );
    }) ||
    "";
  const recentProcesses = Object.entries(processes).filter(
    ([, { closing, dialogProcess, hasWindow, hideTaskbarEntry }]) =>
      !closing && !dialogProcess && hasWindow !== false && !hideTaskbarEntry
  );
  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 30_000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const onNotification = (event: Event): void => {
      const { detail } = event as CustomEvent<SystemNotificationInput>;

      if (!detail?.app || !detail.title || !detail.message) return;

      const createdAt = Date.now();

      setNotifications((currentNotifications) => [
        {
          ...detail,
          createdAt,
          id: `${createdAt}-${notificationIdRef.current++}`,
        },
        ...currentNotifications,
      ]);
    };

    window.addEventListener(SYSTEM_NOTIFICATION_EVENT, onNotification);

    return () =>
      window.removeEventListener(SYSTEM_NOTIFICATION_EVENT, onNotification);
  }, []);

  const focusProcess = (id: string): void => {
    const process = processes[id];

    if (process?.minimized) {
      minimize(id);
      window.requestAnimationFrame(() => process.componentWindow?.focus());
    } else {
      process?.componentWindow?.focus();
    }

    setRecentsOpen(false);
  };
  const launchApp = (id: string, icon: string): void => {
    const existingProcessId = Object.keys(processes).find(
      (processId) =>
        processId === id || processId.startsWith(`${id}${PROCESS_DELIMITER}`)
    );

    if (existingProcessId) focusProcess(existingProcessId);
    else open(id, {}, icon);

    setAppDrawerOpen(false);
  };
  const closeHomeMenus = (): void => {
    setHomeMenuVisible(false);
    setHomeItemMenu(undefined);
  };
  const toggleHomeApp = (id: string): void =>
    setHomePages(
      homeAppIds.has(id)
        ? removeHomeItem(homePages, `app:${id}`)
        : placeHomeItem(homePages, { id, type: "app" }, currentHomePage).pages
    );
  const goToHomePage = (page: number): void => {
    setHomePage(Math.min(Math.max(page, 0), homePages.length - 1));
    closeHomeMenus();
  };
  const addHomePage = (): void => {
    setHomePages((currentPages) => [...currentPages, []]);
    setHomePage(homePages.length);
    closeHomeMenus();
  };
  const removeHomePage = (): void => {
    if (currentHomePage === 0) return;

    // Items of the removed page move to the previous page instead of vanishing
    let pages = homePages.filter((_, page) => page !== currentHomePage);

    for (const item of homePages[currentHomePage] ?? []) {
      ({ pages } = placeHomeItem(pages, item, currentHomePage - 1, item));
    }

    setHomePages(pages);
    setHomePage(currentHomePage - 1);
    closeHomeMenus();
  };
  const addClockWidget = (): void => {
    if (!hasClockWidget) {
      const { page, pages } = placeHomeItem(
        homePages,
        { id: "clock", size: "wide", type: "widget" },
        currentHomePage
      );

      setHomePages(pages);
      setHomePage(page);
    }

    setWidgetPickerOpen(false);
    closeHomeMenus();
  };
  const removeHomeScreenItem = (key: string): void => {
    setHomePages(removeHomeItem(homePages, key));
    setHomeItemMenu(undefined);
  };
  const getWidgetResizeCell = (
    widget: HomeGridItem,
    size: HomeClockWidgetSize
  ): HomeGridCell | undefined => {
    const key = getHomeItemKey(widget);
    const source = findHomeItem(homePages, key);

    if (!source) return undefined;

    const others = homePages[source.page].filter(
      (item) => getHomeItemKey(item) !== key
    );
    const span = HOME_WIDGET_SPANS[size];

    return isAreaFree(others, widget, span)
      ? { column: widget.column, row: widget.row }
      : findNearestFreeCell(others, span, widget);
  };
  const resizeHomeWidget = (
    widget: HomeGridItem,
    size: HomeClockWidgetSize
  ): void => {
    const cell = getWidgetResizeCell(widget, size);
    const key = getHomeItemKey(widget);

    if (cell) {
      setHomePages(
        homePages.map((pageItems) =>
          pageItems.map((item) =>
            getHomeItemKey(item) === key && item.type === "widget"
              ? { ...item, ...cell, size }
              : item
          )
        )
      );
    }

    setHomeItemMenu(undefined);
  };
  const showHomeMenu = (clientX: number, clientY: number): void => {
    const bounds = homeRef.current?.getBoundingClientRect();

    if (!bounds) return;

    setHomeMenuPosition({
      x: Math.min(Math.max(clientX - bounds.left, 100), bounds.width - 100),
      y: Math.min(
        Math.max(clientY - bounds.top - 16, 190),
        bounds.height - 100
      ),
    });
    setHomeItemMenu(undefined);
    setHomeMenuVisible(true);
  };
  const showHomeItemMenu = (key: string): void => {
    const element = getHomeItemElement(homeTrackRef.current, key);
    const bounds = homeRef.current?.getBoundingClientRect();

    if (!element || !bounds) return;

    const rect = element.getBoundingClientRect();
    const below = rect.top + rect.height / 2 - bounds.top < bounds.height / 2;

    setHomeMenuVisible(false);
    setHomeItemMenu({
      key,
      placement: below ? "below" : "above",
      x: Math.min(
        Math.max(rect.left + rect.width / 2 - bounds.left, 100),
        bounds.width - 100
      ),
      y: (below ? rect.bottom : rect.top) - bounds.top,
    });
  };
  const openHomeItemMenuByKeyboard =
    (key: string): React.KeyboardEventHandler<HTMLButtonElement> =>
    (event) => {
      if (
        event.key === "ContextMenu" ||
        (event.shiftKey && event.key === "F10")
      ) {
        event.preventDefault();
        showHomeItemMenu(key);
      }
    };
  const clearHomeLongPress = (): void => {
    if (homeLongPressTimerRef.current !== undefined) {
      window.clearTimeout(homeLongPressTimerRef.current);
      homeLongPressTimerRef.current = undefined;
    }
  };
  const positionHomeGhost = (): void => {
    const drag = homeDragRef.current;
    const ghost = homeGhostRef.current;
    const bounds = homeRef.current?.getBoundingClientRect();

    if (!drag || !ghost || !bounds) return;

    ghost.style.setProperty(
      "--ghost-x",
      `${drag.x - drag.offsetX - bounds.left}px`
    );
    ghost.style.setProperty(
      "--ghost-y",
      `${drag.y - drag.offsetY - bounds.top}px`
    );
  };
  const updateHomeDropTarget = (
    page = currentHomePage,
    pages = homePages
  ): void => {
    const drag = homeDragRef.current;
    const bounds = homeRef.current?.getBoundingClientRect();
    // Every page has the same layout, so the first grid serves as reference
    const grid =
      homeTrackRef.current?.querySelector<HTMLElement>(".mobile-home-grid");

    if (!drag || !bounds || !grid) return;

    let target: HomeDropTarget | undefined;

    if (drag.y - bounds.top < HOME_REMOVE_ZONE_BOTTOM) {
      target = "remove";
    } else {
      const cellWidth = grid.clientWidth / HOME_GRID_COLUMNS;
      const cellHeight = grid.clientHeight / HOME_GRID_ROWS;
      const placement = resolveHomeDrop(pages[page] ?? [], drag.item, {
        column: Math.round(
          (drag.x - drag.offsetX - bounds.left - grid.offsetLeft) / cellWidth
        ),
        row: Math.round(
          (drag.y - drag.offsetY - bounds.top - grid.offsetTop) / cellHeight
        ),
      });

      target = placement && { page, placement };
    }

    drag.target = target;
    setHomeDropTarget((currentTarget) =>
      isSameDropTarget(currentTarget, target) ? currentTarget : target
    );
  };
  const flipHomePageWhileDragging = (direction: -1 | 1): void => {
    const drag = homeDragRef.current;

    if (!drag) return;

    drag.edgeTimer = undefined;
    drag.edgeDirection = 0;

    const nextPage = currentHomePage + direction;

    if (nextPage < 0) return;

    if (nextPage >= homePages.length) {
      // Dragging past the last page opens a new one, unless it would stay empty
      const lastPageHasOtherItems = homePages
        .at(-1)
        ?.some((item) => getHomeItemKey(item) !== drag.key);

      if (!lastPageHasOtherItems) return;

      drag.createdPage = homePages.length;
      setHomePages([...homePages, []]);
    }

    setHomePage(nextPage);
    updateHomeDropTarget(nextPage, homePages);
  };
  const dragHomeItem = (x: number, y: number): void => {
    const drag = homeDragRef.current;
    const bounds = homeRef.current?.getBoundingClientRect();

    if (!drag || !bounds) return;

    drag.x = x;
    drag.y = y;
    positionHomeGhost();

    if (!drag.moved) {
      if (
        Math.hypot(x - drag.pickupX, y - drag.pickupY) <
        HOME_SWIPE_START_DISTANCE
      ) {
        return;
      }

      drag.moved = true;
    }

    updateHomeDropTarget();

    const edgeDirection =
      x - bounds.left < HOME_DRAG_EDGE_SIZE
        ? -1
        : bounds.right - x < HOME_DRAG_EDGE_SIZE
          ? 1
          : 0;

    if (edgeDirection === drag.edgeDirection) return;

    window.clearTimeout(drag.edgeTimer);
    drag.edgeTimer =
      edgeDirection === 0
        ? undefined
        : window.setTimeout(
            () => flipHomePageWhileDragging(edgeDirection),
            HOME_DRAG_EDGE_DELAY_MS
          );
    drag.edgeDirection = edgeDirection;
  };
  const pickUpHomeItem = (
    element: HTMLElement,
    clientX: number,
    clientY: number
  ): void => {
    homeLongPressTimerRef.current = undefined;

    const gesture = homeGestureRef.current;
    const key = element.dataset.homeItem;
    const source = key ? findHomeItem(homePages, key) : undefined;

    if (!gesture || !key || !source) return;

    const rect = element.getBoundingClientRect();

    try {
      homeRef.current?.setPointerCapture(gesture.pointerId);
    } catch {
      // Pointer was released in the meantime
      return;
    }

    gesture.mode = "item";
    homeDragRef.current = {
      edgeDirection: 0,
      height: rect.height,
      item: source.item,
      key,
      moved: false,
      offsetX: clientX - rect.left,
      offsetY: clientY - rect.top,
      pickupX: clientX,
      pickupY: clientY,
      width: rect.width,
      x: clientX,
      y: clientY,
    };
    suppressHomeClickRef.current = true;
    closeHomeMenus();
    setHomeDropTarget(undefined);
    setHomeDrag({
      height: rect.height,
      item: source.item,
      key,
      width: rect.width,
    });
    navigator.vibrate?.(15);
  };
  const finishHomeItemDrag = (commit: boolean): void => {
    const drag = homeDragRef.current;

    homeDragRef.current = undefined;
    suppressHomeClickRef.current = true;
    setHomeDrag(undefined);
    setHomeDropTarget(undefined);

    if (!drag) return;

    window.clearTimeout(drag.edgeTimer);

    const { target } = drag;
    let pages = homePages;

    if (!commit) {
      // Cancelled drags leave everything in place
    } else if (!drag.moved) {
      // Long press without moving opens the item options instead
      showHomeItemMenu(drag.key);
    } else if (target === "remove") {
      pages = removeHomeItem(pages, drag.key);
    } else if (target) {
      pages = moveHomeItem(pages, drag.key, target.page, target.placement);
    }

    if (
      drag.createdPage !== undefined &&
      pages[drag.createdPage]?.length === 0
    ) {
      pages = pages.filter((_, page) => page !== drag.createdPage);
    }

    if (pages !== homePages) setHomePages(pages);
  };
  const startHomeGesture: React.PointerEventHandler<HTMLElement> = (event) => {
    suppressHomeClickRef.current = false;
    lastHomePointerTypeRef.current = event.pointerType;

    if (
      homeGestureRef.current ||
      (event.pointerType === "mouse" && event.button !== 0) ||
      !homeTrackRef.current?.contains(event.target as Node)
    ) {
      return;
    }

    homeGestureRef.current = {
      mode: "pending",
      pointerId: event.pointerId,
      startTime: event.timeStamp,
      startX: event.clientX,
      startY: event.clientY,
    };

    const target = event.target as Element;
    const itemElement = target.closest<HTMLElement>("[data-home-item]");
    const { clientX, clientY } = event;

    clearHomeLongPress();

    if (itemElement) {
      homeLongPressTimerRef.current = window.setTimeout(
        () => pickUpHomeItem(itemElement, clientX, clientY),
        HOME_LONG_PRESS_MS
      );
    } else if (!target.closest("button")) {
      homeLongPressTimerRef.current = window.setTimeout(() => {
        homeLongPressTimerRef.current = undefined;
        showHomeMenu(clientX, clientY);
      }, HOME_LONG_PRESS_MS);
    }
  };
  const moveHomeGesture: React.PointerEventHandler<HTMLElement> = (event) => {
    const gesture = homeGestureRef.current;
    const track = homeTrackRef.current;

    if (!gesture || !track || gesture.pointerId !== event.pointerId) return;

    if (gesture.mode === "item") {
      dragHomeItem(event.clientX, event.clientY);
      return;
    }

    const deltaX = event.clientX - gesture.startX;

    if (gesture.mode === "pending") {
      const deltaY = event.clientY - gesture.startY;

      if (
        Math.abs(deltaX) < HOME_SWIPE_START_DISTANCE &&
        Math.abs(deltaY) < HOME_SWIPE_START_DISTANCE
      ) {
        return;
      }

      // Any real movement cancels pending long presses
      clearHomeLongPress();

      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        homeGestureRef.current = undefined;
        return;
      }

      gesture.mode = "page";
      event.currentTarget.setPointerCapture(event.pointerId);
      track.classList.add("dragging");
      closeHomeMenus();
    }

    const pullingPastEdge =
      (deltaX > 0 && currentHomePage === 0) ||
      (deltaX < 0 && currentHomePage === homePages.length - 1);

    track.style.setProperty(
      "--home-drag-offset",
      `${pullingPastEdge ? deltaX / 3 : deltaX}px`
    );
  };
  const endHomeGesture: React.PointerEventHandler<HTMLElement> = (event) => {
    const gesture = homeGestureRef.current;
    const track = homeTrackRef.current;

    if (!gesture || gesture.pointerId !== event.pointerId) return;

    clearHomeLongPress();
    homeGestureRef.current = undefined;

    if (gesture.mode === "item") {
      finishHomeItemDrag(event.type !== "pointercancel");
      return;
    }

    if (gesture.mode !== "page" || !track) return;

    track.classList.remove("dragging");
    track.style.removeProperty("--home-drag-offset");
    suppressHomeClickRef.current = true;

    if (event.type === "pointercancel") return;

    const deltaX = event.clientX - gesture.startX;
    const isFlick =
      Math.abs(deltaX) > HOME_FLICK_DISTANCE &&
      event.timeStamp - gesture.startTime < HOME_FLICK_DURATION_MS;

    if (
      isFlick ||
      Math.abs(deltaX) > track.clientWidth * HOME_SWIPE_PAGE_RATIO
    ) {
      goToHomePage(currentHomePage + (deltaX < 0 ? 1 : -1));
    }
  };

  const openAppDrawer = (): void => {
    setNotificationCenterOpen(false);
    setRecentsOpen(false);
    setWidgetPickerOpen(false);
    closeHomeMenus();
    setAppDrawerOpen(true);
  };
  const openWidgetPicker = (): void => {
    setAppDrawerOpen(false);
    closeHomeMenus();
    setWidgetPickerOpen(true);
  };
  const startAppDrawerPull: React.PointerEventHandler<HTMLButtonElement> = (
    event
  ) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    appDrawerGestureTriggeredRef.current = false;
    appDrawerPointerStartRef.current = event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveAppDrawerPull: React.PointerEventHandler<HTMLButtonElement> = (
    event
  ) => {
    const startY = appDrawerPointerStartRef.current;

    if (startY === undefined || startY - event.clientY < 36) return;

    appDrawerPointerStartRef.current = undefined;
    appDrawerGestureTriggeredRef.current = true;
    openAppDrawer();
  };
  const startStatusPull: React.PointerEventHandler<HTMLDivElement> = (
    event
  ) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    statusPointerStartRef.current = event.clientY;
    pulledDownRef.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveStatusPull: React.PointerEventHandler<HTMLDivElement> = (event) => {
    const startY = statusPointerStartRef.current;

    if (startY === undefined || event.clientY - startY < 36) return;

    statusPointerStartRef.current = undefined;
    pulledDownRef.current = true;
    setRecentsOpen(false);
    setNotificationCenterOpen(true);
  };
  const toggleNotificationCenter = (): void => {
    if (pulledDownRef.current) {
      pulledDownRef.current = false;
      return;
    }

    setAppDrawerOpen(false);
    setWidgetPickerOpen(false);
    closeHomeMenus();
    setRecentsOpen(false);
    setNotificationCenterOpen((isOpen) => !isOpen);
  };
  const toggleQuickSetting = (key: QuickSettingKey): void =>
    setQuickSettings((currentSettings) => {
      if (key === "airplaneMode") {
        const airplaneMode = !currentSettings.airplaneMode;

        return {
          ...currentSettings,
          airplaneMode,
          ...(airplaneMode && { bluetooth: false, wifi: false }),
        };
      }

      return { ...currentSettings, [key]: !currentSettings[key] };
    });
  const visibleQuickSettings = quickSettingsExpanded
    ? QUICK_SETTINGS
    : QUICK_SETTINGS.slice(0, 4);
  const formattedTime = new Intl.DateTimeFormat("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(now);
  const formattedDate = new Intl.DateTimeFormat("de-DE", {
    dateStyle: "full",
  }).format(now);
  const renderHomeItem = (item: HomeGridItem): React.ReactNode => {
    const key = getHomeItemKey(item);

    if (item.type === "widget") {
      return (
        <button
          aria-label="Uhr- und Datumswidget, lange drücken zum Verschieben"
          className={`mobile-clock-widget size-${item.size}`}
          onKeyDown={openHomeItemMenuByKeyboard(key)}
          type="button"
        >
          <span className="clock-widget-time" suppressHydrationWarning>
            {formattedTime}
          </span>
          <span className="clock-widget-date" suppressHydrationWarning>
            {formattedDate}
          </span>
        </button>
      );
    }

    const app = AVAILABLE_APPS_BY_ID.get(item.id);

    if (!app) return undefined;

    return (
      <button
        aria-label={`${app.title} öffnen`}
        className="mobile-home-app"
        onClick={() => launchApp(app.id, app.icon)}
        onKeyDown={openHomeItemMenuByKeyboard(key)}
        type="button"
      >
        <img alt="" draggable="false" src={getAppIconUrl(app.icon)} />
        <span className="home-app-label">{app.title}</span>
      </button>
    );
  };

  return (
    <StyledMobileShell $surfaceMode={surfaceMode}>
      <section
        ref={homeRef}
        aria-label="Startbildschirm"
        className="mobile-home"
        onClickCapture={(event) => {
          if (suppressHomeClickRef.current) {
            suppressHomeClickRef.current = false;
            event.preventDefault();
            event.stopPropagation();
          }
        }}
        onPointerCancel={endHomeGesture}
        onPointerDown={startHomeGesture}
        onPointerMove={moveHomeGesture}
        onPointerUp={endHomeGesture}
      >
        {homeDrag && (
          <div
            aria-hidden="true"
            className={`home-remove-zone${homeDropTarget === "remove" ? " active" : ""}`}
          >
            <span>✕</span>
            Entfernen
          </div>
        )}
        <div
          ref={homeTrackRef}
          className="mobile-home-pages"
          onContextMenu={(event) => {
            event.preventDefault();

            // Touch long presses are handled by the long press timer
            if (lastHomePointerTypeRef.current !== "mouse") return;

            const itemElement = (event.target as Element).closest<HTMLElement>(
              "[data-home-item]"
            );

            clearHomeLongPress();

            if (itemElement?.dataset.homeItem) {
              showHomeItemMenu(itemElement.dataset.homeItem);
            } else {
              showHomeMenu(event.clientX, event.clientY);
            }
          }}
          style={{ "--home-page": currentHomePage } as React.CSSProperties}
        >
          {homePages.map((pageItems, pageIndex) => (
            <div
              // eslint-disable-next-line react/no-array-index-key
              key={pageIndex}
              aria-hidden={pageIndex !== currentHomePage}
              aria-label={`Seite ${pageIndex + 1} von ${homePages.length}`}
              className="mobile-home-page"
              inert={pageIndex !== currentHomePage || undefined}
              role="group"
            >
              <ul aria-label="Apps und Widgets" className="mobile-home-grid">
                {pageItems
                  .filter(
                    (item) =>
                      item.type !== "app" || AVAILABLE_APPS_BY_ID.has(item.id)
                  )
                  .map((item) => {
                    const key = getHomeItemKey(item);

                    return (
                      <li
                        key={key}
                        className={`home-grid-item${homeDrag?.key === key ? " placeholder" : ""}`}
                        data-home-item={key}
                        style={getGridAreaStyle(item, getHomeItemSpan(item))}
                      >
                        {renderHomeItem(item)}
                      </li>
                    );
                  })}
                {homeDrag &&
                  homeDropTarget &&
                  homeDropTarget !== "remove" &&
                  homeDropTarget.page === pageIndex && (
                    <li
                      aria-hidden="true"
                      className={`home-grid-drop-target${homeDropTarget.placement.swapKey ? " swap" : ""}`}
                      style={getGridAreaStyle(
                        homeDropTarget.placement,
                        getHomeItemSpan(homeDrag.item)
                      )}
                    />
                  )}
              </ul>
              {pageItems.length === 0 && !homeDrag && (
                <div className="mobile-home-empty">
                  <p>
                    {pageIndex === 0
                      ? "Dein Startbildschirm ist noch leer."
                      : "Diese Seite ist noch leer."}
                  </p>
                  <button onClick={openAppDrawer} type="button">
                    Apps auswählen
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
        {homeDrag && (
          <div
            ref={(element) => {
              homeGhostRef.current = element;
              positionHomeGhost();
            }}
            aria-hidden="true"
            className="home-grid-item home-drag-ghost"
            style={{
              height: `${homeDrag.height}px`,
              width: `${homeDrag.width}px`,
            }}
          >
            {renderHomeItem(homeDrag.item)}
          </div>
        )}
        {homePages.length > 1 && (
          <div
            aria-label="Startbildschirmseiten"
            className="mobile-home-page-indicator"
            role="group"
          >
            {homePages.map((_, pageIndex) => (
              <button
                // eslint-disable-next-line react/no-array-index-key
                key={pageIndex}
                aria-current={pageIndex === currentHomePage || undefined}
                aria-label={`Seite ${pageIndex + 1}`}
                onClick={() => goToHomePage(pageIndex)}
                type="button"
              />
            ))}
          </div>
        )}
        {homeMenuVisible && (
          <div
            aria-label="Startbildschirmoptionen"
            className="mobile-home-menu"
            role="menu"
            style={{
              left: `${homeMenuPosition.x}px`,
              top: `${homeMenuPosition.y}px`,
            }}
          >
            <button onClick={openWidgetPicker} role="menuitem" type="button">
              <span aria-hidden="true" className="home-menu-icon">
                ▦
              </span>
              Widgets
            </button>
            <button onClick={addHomePage} role="menuitem" type="button">
              <span aria-hidden="true" className="home-menu-icon">
                ＋
              </span>
              Seite hinzufügen
            </button>
            {currentHomePage > 0 && (
              <button onClick={removeHomePage} role="menuitem" type="button">
                <span aria-hidden="true" className="home-menu-icon">
                  −
                </span>
                Seite entfernen
              </button>
            )}
          </div>
        )}
        {homeItemMenu && homeItemMenuTarget && (
          <div
            aria-label={
              homeItemMenuTarget.type === "widget"
                ? "Widgetoptionen"
                : "App-Optionen"
            }
            className={`mobile-home-menu ${homeItemMenu.placement}`}
            role="menu"
            style={{
              left: `${homeItemMenu.x}px`,
              top: `${homeItemMenu.y}px`,
            }}
          >
            {homeItemMenuTarget.type === "widget" ? (
              <>
                <button
                  onClick={() => removeHomeScreenItem(homeItemMenu.key)}
                  role="menuitem"
                  type="button"
                >
                  <span aria-hidden="true" className="home-menu-icon">
                    ✕
                  </span>
                  Widget entfernen
                </button>
                <div
                  aria-label="Widgetgröße"
                  className="home-menu-group"
                  role="group"
                >
                  {WIDGET_SIZE_LABELS.map(([size, label]) => (
                    <button
                      key={size}
                      aria-checked={homeItemMenuTarget.size === size}
                      disabled={!getWidgetResizeCell(homeItemMenuTarget, size)}
                      onClick={() => resizeHomeWidget(homeItemMenuTarget, size)}
                      role="menuitemradio"
                      type="button"
                    >
                      <span aria-hidden="true" className="home-menu-icon">
                        {homeItemMenuTarget.size === size ? "✓" : ""}
                      </span>
                      {label}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <button
                onClick={() => removeHomeScreenItem(homeItemMenu.key)}
                role="menuitem"
                type="button"
              >
                <span aria-hidden="true" className="home-menu-icon">
                  ✕
                </span>
                Vom Startbildschirm entfernen
              </button>
            )}
          </div>
        )}
        <button
          aria-label="Appdrawer öffnen"
          className="mobile-app-drawer-handle"
          onClick={() => {
            if (appDrawerGestureTriggeredRef.current) {
              appDrawerGestureTriggeredRef.current = false;
              return;
            }

            openAppDrawer();
          }}
          onPointerCancel={() => {
            appDrawerPointerStartRef.current = undefined;
          }}
          onPointerDown={startAppDrawerPull}
          onPointerMove={moveAppDrawerPull}
          onPointerUp={() => {
            appDrawerPointerStartRef.current = undefined;
          }}
          type="button"
        >
          <span aria-hidden="true" className="app-drawer-handle-indicator" />
          <span>Alle Apps</span>
        </button>
      </section>
      {widgetPickerOpen && (
        <section
          aria-label="Widgets"
          aria-modal="true"
          className="mobile-widget-picker"
          role="dialog"
        >
          <div className="app-drawer-handle-indicator" />
          <header className="widget-picker-header">
            <h2>Widgets</h2>
            <button
              aria-label="Widgetmenü schließen"
              onClick={() => setWidgetPickerOpen(false)}
              type="button"
            >
              ×
            </button>
          </header>
          <article className="widget-picker-entry">
            <div aria-hidden="true" className="widget-picker-clock-preview">
              <span>{formattedTime}</span>
              <span>{formattedDate}</span>
            </div>
            <div className="widget-picker-copy">
              <h3>Uhr &amp; Datum</h3>
              <p>Uhrzeit und aktuelles Datum auf dem Startbildschirm.</p>
            </div>
            <button
              aria-label={
                hasClockWidget
                  ? "Uhr-Widget ist bereits hinzugefügt"
                  : "Uhr-Widget hinzufügen"
              }
              disabled={hasClockWidget}
              onClick={addClockWidget}
              type="button"
            >
              {hasClockWidget ? "Hinzugefügt" : "Hinzufügen"}
            </button>
          </article>
        </section>
      )}
      <div
        aria-expanded={notificationCenterOpen}
        aria-label="Statusleiste, nach unten ziehen für Benachrichtigungen"
        className="mobile-status"
        onClick={toggleNotificationCenter}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            toggleNotificationCenter();
          }
        }}
        onPointerCancel={() => {
          statusPointerStartRef.current = undefined;
        }}
        onPointerDown={startStatusPull}
        onPointerMove={moveStatusPull}
        onPointerUp={() => {
          statusPointerStartRef.current = undefined;
        }}
        role="button"
        tabIndex={0}
      >
        <span suppressHydrationWarning>{formattedTime}</span>
        <span aria-hidden="true" className="mobile-status-icons">
          <span className="mobile-cellular">
            <span />
            <span />
            <span />
            <span />
          </span>
          <span
            className="mobile-wifi"
            data-enabled={quickSettings.wifi || undefined}
          />
          <span className="mobile-battery" />
        </span>
      </div>
      <div
        aria-hidden="true"
        className="mobile-brightness-overlay"
        style={{ opacity: ((100 - brightness) / 100) * 0.55 }}
      />
      {appDrawerOpen && (
        <section
          aria-label="Appdrawer"
          aria-modal="true"
          className="mobile-app-drawer"
          role="dialog"
        >
          <div className="app-drawer-handle-indicator" />
          <header className="app-drawer-header">
            <h2>Alle Apps</h2>
            <button
              aria-label="Appdrawer schließen"
              onClick={() => setAppDrawerOpen(false)}
              type="button"
            >
              ×
            </button>
          </header>
          <label className="app-drawer-search">
            <span aria-hidden="true">⌕</span>
            <input
              aria-label="Apps suchen"
              onChange={(event) => setAppSearch(event.target.value)}
              placeholder="Apps suchen"
              type="search"
              value={appSearch}
            />
          </label>
          {filteredApps.length > 0 ? (
            <ul aria-label="Verfügbare Apps" className="app-drawer-grid">
              {filteredApps.map(({ icon, id, title }) => {
                const isOnHomeScreen = homeAppIds.has(id);

                return (
                  <li key={id}>
                    <button
                      aria-label={`${title} öffnen`}
                      className="app-drawer-launch"
                      onClick={() => launchApp(id, icon)}
                      type="button"
                    >
                      <img alt="" draggable="false" src={getAppIconUrl(icon)} />
                      <span>{title}</span>
                    </button>
                    <button
                      aria-label={`${title} ${isOnHomeScreen ? "vom" : "zum"} Startbildschirm ${isOnHomeScreen ? "entfernen" : "hinzufügen"}`}
                      aria-pressed={isOnHomeScreen}
                      className="app-drawer-pin"
                      onClick={() => toggleHomeApp(id)}
                      type="button"
                    >
                      {isOnHomeScreen ? "−" : "+"}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="app-drawer-empty">Keine Apps gefunden</p>
          )}
        </section>
      )}
      {notificationCenterOpen && (
        <section
          aria-label="Benachrichtigungscenter"
          aria-modal="true"
          className="mobile-notification-center"
          role="dialog"
        >
          <div className="notification-shade-handle" />
          <header className="notification-shade-header">
            <div>
              <p className="notification-shade-time" suppressHydrationWarning>
                {formattedTime}
              </p>
              <p className="notification-shade-date" suppressHydrationWarning>
                {formattedDate}
              </p>
            </div>
            <div className="notification-shade-actions">
              <button
                aria-label="Einstellungen öffnen"
                className="notification-settings-button"
                onClick={() => {
                  open("Settings");
                  setNotificationCenterOpen(false);
                }}
                type="button"
              >
                ⚙
              </button>
              <button
                aria-label="Benachrichtigungscenter schließen"
                className="notification-close-button"
                onClick={() => setNotificationCenterOpen(false)}
                type="button"
              >
                ×
              </button>
            </div>
          </header>
          <section aria-label="Schnelleinstellungen" className="quick-settings">
            <div className="quick-settings-grid">
              {visibleQuickSettings.map(({ icon, key, label }) => (
                <button
                  key={key}
                  aria-pressed={quickSettings[key]}
                  className={`quick-setting${quickSettings[key] ? " active" : ""}`}
                  onClick={() => toggleQuickSetting(key)}
                  type="button"
                >
                  <span aria-hidden="true" className="quick-setting-icon">
                    {icon}
                  </span>
                  <span className="quick-setting-label">{label}</span>
                  {key === "wifi" && (
                    <span className="quick-setting-status">
                      {quickSettings.wifi ? "Verbunden" : "Aus"}
                    </span>
                  )}
                  {key === "bluetooth" && (
                    <span className="quick-setting-status">
                      {quickSettings.bluetooth ? "Ein" : "Aus"}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="quick-settings-controls">
              <label className="brightness-control">
                <span aria-hidden="true">☼</span>
                <input
                  aria-label="Helligkeit"
                  max="100"
                  min="20"
                  onChange={(event) =>
                    setBrightness(Number(event.target.value))
                  }
                  type="range"
                  value={brightness}
                />
              </label>
              <button
                aria-expanded={quickSettingsExpanded}
                className="quick-settings-expand"
                onClick={() =>
                  setQuickSettingsExpanded((expanded) => !expanded)
                }
                type="button"
              >
                {quickSettingsExpanded ? "Weniger" : "Mehr anzeigen"}
              </button>
            </div>
          </section>
          <section
            aria-labelledby="notification-list-heading"
            className="notification-list"
          >
            <header className="notification-list-header">
              <h2 id="notification-list-heading">Benachrichtigungen</h2>
              {notifications.length > 0 && (
                <button onClick={() => setNotifications([])} type="button">
                  Alle löschen
                </button>
              )}
            </header>
            {notifications.length > 0 ? (
              <ol>
                {notifications.map((notification) => (
                  <li key={notification.id}>
                    <article className="mobile-notification">
                      {notification.icon ? (
                        <img alt="" src={notification.icon} />
                      ) : (
                        <span
                          aria-hidden="true"
                          className="notification-app-icon"
                        >
                          {notification.app.slice(0, 1)}
                        </span>
                      )}
                      <div className="notification-copy">
                        <div className="notification-meta">
                          <span>{notification.app}</span>
                          <time
                            dateTime={new Date(
                              notification.createdAt
                            ).toISOString()}
                          >
                            {new Intl.DateTimeFormat("de-DE", {
                              hour: "2-digit",
                              minute: "2-digit",
                            }).format(notification.createdAt)}
                          </time>
                        </div>
                        <h3>{notification.title}</h3>
                        <p>{notification.message}</p>
                      </div>
                      <button
                        aria-label={`${notification.title} schließen`}
                        className="notification-dismiss"
                        onClick={() =>
                          setNotifications((currentNotifications) =>
                            currentNotifications.filter(
                              ({ id }) => id !== notification.id
                            )
                          )
                        }
                        type="button"
                      >
                        ×
                      </button>
                    </article>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="notification-empty">Keine Benachrichtigungen</p>
            )}
          </section>
        </section>
      )}
      {recentsOpen && (
        <section
          aria-label="Zuletzt verwendete Apps"
          className="mobile-recents"
        >
          <h2>Zuletzt verwendet</h2>
          {recentProcesses.length > 0 ? (
            recentProcesses.map(([id, { icon, title }]) => (
              <div key={id} className="mobile-recent-entry">
                <button
                  aria-label={`${title} öffnen`}
                  className="mobile-recent-open"
                  onClick={() => focusProcess(id)}
                  type="button"
                >
                  <span
                    aria-hidden="true"
                    className="mobile-recent-icon"
                    style={{ backgroundImage: `url("${icon}")` }}
                  />
                  <span className="mobile-recent-title">{title}</span>
                </button>
                <button
                  aria-label={`${title} schließen`}
                  className="mobile-close-app"
                  onClick={() => closeWithTransition(id)}
                  type="button"
                >
                  ×
                </button>
              </div>
            ))
          ) : (
            <p className="mobile-empty">Keine Apps geöffnet</p>
          )}
        </section>
      )}
      <nav aria-label="Android-Navigation" className="mobile-navigation">
        <button
          aria-label="Zurück: App schließen"
          onClick={() => {
            if (notificationCenterOpen) setNotificationCenterOpen(false);
            else if (widgetPickerOpen) setWidgetPickerOpen(false);
            else if (homeItemMenu) setHomeItemMenu(undefined);
            else if (homeMenuVisible) setHomeMenuVisible(false);
            else if (appDrawerOpen) setAppDrawerOpen(false);
            else if (recentsOpen) setRecentsOpen(false);
            else if (activeProcessId) closeWithTransition(activeProcessId);
          }}
          type="button"
        >
          <span aria-hidden="true" className="mobile-back-icon" />
        </button>
        <button
          aria-label="Startbildschirm"
          onClick={() => {
            const homeAlreadyVisible =
              !activeProcessId &&
              !recentsOpen &&
              !notificationCenterOpen &&
              !appDrawerOpen &&
              !widgetPickerOpen;

            if (homeAlreadyVisible) setHomePage(0);

            setRecentsOpen(false);
            setNotificationCenterOpen(false);
            setAppDrawerOpen(false);
            setWidgetPickerOpen(false);
            setHomeItemMenu(undefined);
            setHomeMenuVisible(false);

            Object.entries(processes).forEach(([id, process]) => {
              if (
                !process.closing &&
                !process.minimized &&
                process.hasWindow !== false
              ) {
                minimize(id);
              }
            });
          }}
          type="button"
        >
          <span aria-hidden="true" className="mobile-home-icon" />
        </button>
        <button
          aria-label="App-Umschalter"
          aria-pressed={recentsOpen}
          onClick={() => {
            setAppDrawerOpen(false);
            setNotificationCenterOpen(false);
            setWidgetPickerOpen(false);
            setHomeItemMenu(undefined);
            setHomeMenuVisible(false);
            setRecentsOpen((isOpen) => !isOpen);
          }}
          type="button"
        >
          <span aria-hidden="true" className="mobile-recents-icon" />
        </button>
      </nav>
    </StyledMobileShell>
  );
};

export default MobileShell;
