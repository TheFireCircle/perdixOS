import { useEffect, useRef, useState } from "react";
import StyledMobileShell from "components/system/Mobile/StyledMobileShell";
import { useProcesses, useProcessesActions } from "contexts/process";
import processDirectory from "contexts/process/directory";
import {
  useForegroundId,
  useHomeClockWidgetSize,
  useHomePages,
  useSessionActions,
  useStackOrder,
} from "contexts/session";
import {
  type HomeClockWidgetSize,
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

const getHomeScreenApps = (appIds: string[]): typeof AVAILABLE_APPS =>
  appIds.flatMap((id) => {
    const app = AVAILABLE_APPS_BY_ID.get(id);

    return app ? [app] : [];
  });

const HOME_SWIPE_START_DISTANCE = 10;
const HOME_SWIPE_PAGE_RATIO = 0.2;
const HOME_FLICK_DISTANCE = 40;
const HOME_FLICK_DURATION_MS = 250;

type HomeSwipe = {
  dragging: boolean;
  pointerId: number;
  startTime: number;
  startX: number;
  startY: number;
};

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
  const [clockWidgetMenuOpen, setClockWidgetMenuOpen] = useState(false);
  const [notificationCenterOpen, setNotificationCenterOpen] = useState(false);
  const [quickSettingsExpanded, setQuickSettingsExpanded] = useState(false);
  const [brightness, setBrightness] = useState(82);
  const [quickSettings, setQuickSettings] = useState(INITIAL_QUICK_SETTINGS);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const notificationIdRef = useRef(0);
  const emptyPressTimerRef = useRef<number | undefined>(undefined);
  const widgetPressTimerRef = useRef<number | undefined>(undefined);
  const statusPointerStartRef = useRef<number | undefined>(undefined);
  const pulledDownRef = useRef(false);
  const appDrawerPointerStartRef = useRef<number | undefined>(undefined);
  const appDrawerGestureTriggeredRef = useRef(false);
  const homeRef = useRef<HTMLElement>(null);
  const homeTrackRef = useRef<HTMLDivElement>(null);
  const homeSwipeRef = useRef<HomeSwipe | undefined>(undefined);
  const suppressHomeClickRef = useRef(false);
  const processes = useProcesses();
  const foregroundId = useForegroundId();
  const stackOrder = useStackOrder();
  const homePages = useHomePages();
  const homeClockWidgetSize = useHomeClockWidgetSize();
  const { setHomeClockWidgetSize, setHomePages } = useSessionActions();
  const { closeWithTransition, minimize, open } = useProcessesActions();
  const currentHomePage = Math.min(homePage, homePages.length - 1);
  const homeAppIds = new Set(homePages.flat());
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
  const toggleHomeApp = (id: string): void =>
    setHomePages((currentPages) =>
      currentPages.some((pageAppIds) => pageAppIds.includes(id))
        ? currentPages.map((pageAppIds) =>
            pageAppIds.filter((appId) => appId !== id)
          )
        : currentPages.map((pageAppIds, index) =>
            index === currentHomePage ? [...pageAppIds, id] : pageAppIds
          )
    );
  const goToHomePage = (page: number): void => {
    setHomePage(Math.min(Math.max(page, 0), homePages.length - 1));
    setHomeMenuVisible(false);
    setClockWidgetMenuOpen(false);
  };
  const addHomePage = (): void => {
    setHomePages((currentPages) => [...currentPages, []]);
    setHomePage(homePages.length);
    setHomeMenuVisible(false);
  };
  const removeHomePage = (): void => {
    if (currentHomePage === 0) return;

    // Apps of the removed page move to the previous page instead of vanishing
    setHomePages((currentPages) =>
      currentPages.flatMap((pageAppIds, index) => {
        if (index === currentHomePage) return [];
        if (index === currentHomePage - 1) {
          return [[...pageAppIds, ...(currentPages[currentHomePage] ?? [])]];
        }

        return [pageAppIds];
      })
    );
    setHomePage(currentHomePage - 1);
    setHomeMenuVisible(false);
  };
  const addClockWidget = (): void => {
    setHomeClockWidgetSize((currentSize) => currentSize || "wide");
    setHomePage(0);
    setWidgetPickerOpen(false);
    setHomeMenuVisible(false);
  };
  const removeClockWidget = (): void => {
    setHomeClockWidgetSize(undefined);
    setClockWidgetMenuOpen(false);
  };
  const changeClockWidgetSize = (size: HomeClockWidgetSize): void => {
    setHomeClockWidgetSize(size);
    setClockWidgetMenuOpen(false);
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
    setClockWidgetMenuOpen(false);
    setHomeMenuVisible(true);
  };
  const startEmptySpaceLongPress: React.PointerEventHandler<HTMLElement> = (
    event
  ) => {
    if (
      event.target !== event.currentTarget ||
      (event.pointerType === "mouse" && event.button !== 0)
    ) {
      return;
    }

    const { clientX, clientY } = event;

    emptyPressTimerRef.current = window.setTimeout(
      () => showHomeMenu(clientX, clientY),
      500
    );
  };
  const clearEmptySpaceLongPress = (): void => {
    if (emptyPressTimerRef.current !== undefined) {
      window.clearTimeout(emptyPressTimerRef.current);
      emptyPressTimerRef.current = undefined;
    }
  };
  const startClockWidgetLongPress: React.PointerEventHandler<HTMLElement> = (
    event
  ) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    widgetPressTimerRef.current = window.setTimeout(() => {
      setClockWidgetMenuOpen(true);
    }, 500);
  };
  const clearClockWidgetLongPress = (): void => {
    if (widgetPressTimerRef.current !== undefined) {
      window.clearTimeout(widgetPressTimerRef.current);
      widgetPressTimerRef.current = undefined;
    }
  };
  const startHomeSwipe: React.PointerEventHandler<HTMLElement> = (event) => {
    suppressHomeClickRef.current = false;

    if (
      homeSwipeRef.current ||
      (event.pointerType === "mouse" && event.button !== 0) ||
      !homeTrackRef.current?.contains(event.target as Node)
    ) {
      return;
    }

    homeSwipeRef.current = {
      dragging: false,
      pointerId: event.pointerId,
      startTime: event.timeStamp,
      startX: event.clientX,
      startY: event.clientY,
    };
  };
  const moveHomeSwipe: React.PointerEventHandler<HTMLElement> = (event) => {
    const swipe = homeSwipeRef.current;
    const track = homeTrackRef.current;

    if (!swipe || !track || swipe.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - swipe.startX;

    if (!swipe.dragging) {
      const deltaY = event.clientY - swipe.startY;

      if (
        Math.abs(deltaX) < HOME_SWIPE_START_DISTANCE &&
        Math.abs(deltaY) < HOME_SWIPE_START_DISTANCE
      ) {
        return;
      }

      // Any real movement cancels pending long presses
      clearEmptySpaceLongPress();
      clearClockWidgetLongPress();

      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        homeSwipeRef.current = undefined;
        return;
      }

      swipe.dragging = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      track.classList.add("dragging");
      setHomeMenuVisible(false);
      setClockWidgetMenuOpen(false);
    }

    const pullingPastEdge =
      (deltaX > 0 && currentHomePage === 0) ||
      (deltaX < 0 && currentHomePage === homePages.length - 1);

    track.style.setProperty(
      "--home-drag-offset",
      `${pullingPastEdge ? deltaX / 3 : deltaX}px`
    );
  };
  const endHomeSwipe: React.PointerEventHandler<HTMLElement> = (event) => {
    const swipe = homeSwipeRef.current;
    const track = homeTrackRef.current;

    if (!swipe || swipe.pointerId !== event.pointerId) return;

    homeSwipeRef.current = undefined;

    if (!swipe.dragging || !track) return;

    track.classList.remove("dragging");
    track.style.removeProperty("--home-drag-offset");
    suppressHomeClickRef.current = true;

    if (event.type === "pointercancel") return;

    const deltaX = event.clientX - swipe.startX;
    const isFlick =
      Math.abs(deltaX) > HOME_FLICK_DISTANCE &&
      event.timeStamp - swipe.startTime < HOME_FLICK_DURATION_MS;

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
    setClockWidgetMenuOpen(false);
    setHomeMenuVisible(false);
    setAppDrawerOpen(true);
  };
  const openWidgetPicker = (): void => {
    setAppDrawerOpen(false);
    setHomeMenuVisible(false);
    setClockWidgetMenuOpen(false);
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
    setClockWidgetMenuOpen(false);
    setHomeMenuVisible(false);
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
        onPointerCancel={endHomeSwipe}
        onPointerDown={startHomeSwipe}
        onPointerMove={moveHomeSwipe}
        onPointerUp={endHomeSwipe}
      >
        <div
          ref={homeTrackRef}
          className="mobile-home-pages"
          style={{ "--home-page": currentHomePage } as React.CSSProperties}
        >
          {homePages.map((pageAppIds, pageIndex) => {
            const pageApps = getHomeScreenApps(pageAppIds);

            return (
              <div
                // eslint-disable-next-line react/no-array-index-key
                key={pageIndex}
                aria-hidden={pageIndex !== currentHomePage}
                aria-label={`Seite ${pageIndex + 1} von ${homePages.length}`}
                className="mobile-home-page"
                inert={pageIndex !== currentHomePage || undefined}
                role="group"
              >
                <button
                  aria-label="Startbildschirmoptionen öffnen"
                  className="mobile-home-empty-surface"
                  onContextMenu={(event) => {
                    event.preventDefault();
                    clearEmptySpaceLongPress();
                    showHomeMenu(event.clientX, event.clientY);
                  }}
                  onPointerCancel={clearEmptySpaceLongPress}
                  onPointerDown={startEmptySpaceLongPress}
                  onPointerUp={clearEmptySpaceLongPress}
                  tabIndex={-1}
                  type="button"
                />
                {pageIndex === 0 && homeClockWidgetSize && (
                  <div className="mobile-clock-widget-wrap">
                    <button
                      aria-label="Uhr- und Datumswidget, lange drücken für Optionen"
                      className={`mobile-clock-widget size-${homeClockWidgetSize}`}
                      onContextMenu={(event) => {
                        event.preventDefault();
                        clearClockWidgetLongPress();
                        setClockWidgetMenuOpen(true);
                      }}
                      onKeyDown={(event) => {
                        if (
                          event.key === "ContextMenu" ||
                          (event.shiftKey && event.key === "F10")
                        ) {
                          event.preventDefault();
                          setClockWidgetMenuOpen(true);
                        }
                      }}
                      onPointerCancel={clearClockWidgetLongPress}
                      onPointerDown={startClockWidgetLongPress}
                      onPointerUp={clearClockWidgetLongPress}
                      type="button"
                    >
                      <span
                        className="clock-widget-time"
                        suppressHydrationWarning
                      >
                        {formattedTime}
                      </span>
                      <span
                        className="clock-widget-date"
                        suppressHydrationWarning
                      >
                        {formattedDate}
                      </span>
                    </button>
                    {clockWidgetMenuOpen && (
                      <div
                        aria-label="Uhr-Widgetoptionen"
                        className="clock-widget-context-menu"
                        role="menu"
                      >
                        <button
                          onClick={removeClockWidget}
                          role="menuitem"
                          type="button"
                        >
                          Widget entfernen
                        </button>
                        <div
                          aria-label="Widgetgröße"
                          className="clock-widget-sizes"
                          role="group"
                        >
                          {(
                            [
                              ["compact", "Kompakt"],
                              ["wide", "Breit"],
                              ["large", "Groß"],
                            ] as const
                          ).map(([size, label]) => (
                            <button
                              key={size}
                              aria-checked={homeClockWidgetSize === size}
                              onClick={() => changeClockWidgetSize(size)}
                              role="menuitemradio"
                              type="button"
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {pageApps.length > 0 ? (
                  <ul
                    aria-label="Apps auf dem Startbildschirm"
                    className="mobile-home-app-grid"
                  >
                    {pageApps.map(({ icon, id, title }) => (
                      <li key={id}>
                        <button
                          aria-label={`${title} öffnen`}
                          className="mobile-home-app"
                          onClick={() => launchApp(id, icon)}
                          type="button"
                        >
                          <img
                            alt=""
                            draggable="false"
                            src={getAppIconUrl(icon)}
                          />
                          <span>{title}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
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
            );
          })}
        </div>
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
                homeClockWidgetSize
                  ? "Uhr-Widget ist bereits hinzugefügt"
                  : "Uhr-Widget hinzufügen"
              }
              disabled={Boolean(homeClockWidgetSize)}
              onClick={addClockWidget}
              type="button"
            >
              {homeClockWidgetSize ? "Hinzugefügt" : "Hinzufügen"}
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
            else if (clockWidgetMenuOpen) setClockWidgetMenuOpen(false);
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
            setClockWidgetMenuOpen(false);
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
            setClockWidgetMenuOpen(false);
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
