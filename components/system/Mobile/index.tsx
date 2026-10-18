import { useEffect, useRef, useState } from "react";
import FileManager from "components/system/Files/FileManager";
import StyledMobileShell from "components/system/Mobile/StyledMobileShell";
import { useProcesses, useProcessesActions } from "contexts/process";
import { useForegroundId, useStackOrder } from "contexts/session";
import { type SurfaceMode } from "contexts/session/types";
import { START_MENU_PATH } from "utils/constants";
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

type MobileShellProps = {
  surfaceMode: SurfaceMode;
};

const MobileShell: FC<MobileShellProps> = ({ surfaceMode }) => {
  const [now, setNow] = useState(() => new Date());
  const [recentsOpen, setRecentsOpen] = useState(false);
  const [notificationCenterOpen, setNotificationCenterOpen] = useState(false);
  const [quickSettingsExpanded, setQuickSettingsExpanded] = useState(false);
  const [brightness, setBrightness] = useState(82);
  const [quickSettings, setQuickSettings] = useState(INITIAL_QUICK_SETTINGS);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const notificationIdRef = useRef(0);
  const statusPointerStartRef = useRef<number | undefined>(undefined);
  const pulledDownRef = useRef(false);
  const processes = useProcesses();
  const foregroundId = useForegroundId();
  const stackOrder = useStackOrder();
  const { closeWithTransition, minimize } = useProcessesActions();
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

    setRecentsOpen(false);
    setNotificationCenterOpen((open) => !open);
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
      <section aria-label="Startbildschirm" className="mobile-home">
        <div className="mobile-clock" suppressHydrationWarning>
          {new Intl.DateTimeFormat("de-DE", {
            hour: "2-digit",
            minute: "2-digit",
          }).format(now)}
        </div>
        <div className="mobile-date" suppressHydrationWarning>
          {new Intl.DateTimeFormat("de-DE", {
            dateStyle: "full",
          }).format(now)}
        </div>
        <FileManager
          url={START_MENU_PATH}
          hideLoading
          isMobileHome
          loadIconsImmediately
          readOnly
        />
      </section>
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
            setRecentsOpen(false);

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
            setNotificationCenterOpen(false);
            setRecentsOpen((open) => !open);
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
