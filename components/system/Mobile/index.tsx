import { useEffect, useState } from "react";
import FileManager from "components/system/Files/FileManager";
import StyledMobileShell from "components/system/Mobile/StyledMobileShell";
import { useProcesses, useProcessesActions } from "contexts/process";
import { useForegroundId, useStackOrder } from "contexts/session";
import { START_MENU_PATH } from "utils/constants";

const MobileShell: FC = () => {
  const [now, setNow] = useState(() => new Date());
  const [recentsOpen, setRecentsOpen] = useState(false);
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
  const foregroundProcess = processes[activeProcessId];

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 30_000);

    return () => window.clearInterval(interval);
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

  return (
    <StyledMobileShell>
      <section aria-label="Startbildschirm" className="mobile-home">
        <div className="mobile-clock">
          {new Intl.DateTimeFormat("de-DE", {
            hour: "2-digit",
            minute: "2-digit",
          }).format(now)}
        </div>
        <div className="mobile-date">
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
      <div aria-label="Statusleiste" className="mobile-status">
        <span>
          {new Intl.DateTimeFormat("de-DE", {
            hour: "2-digit",
            minute: "2-digit",
          }).format(now)}
        </span>
        <span aria-hidden="true" className="mobile-status-icons">
          <span className="mobile-cellular">
            <span />
            <span />
            <span />
            <span />
          </span>
          <span className="mobile-wifi" />
          <span className="mobile-battery" />
        </span>
      </div>
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
            if (recentsOpen) setRecentsOpen(false);
            else if (activeProcessId) closeWithTransition(activeProcessId);
          }}
          type="button"
        >
          <span aria-hidden="true" className="mobile-back-icon" />
        </button>
        <button
          aria-label="Startbildschirm"
          onClick={() =>
            foregroundProcess &&
            !foregroundProcess.minimized &&
            minimize(activeProcessId)
          }
          type="button"
        >
          <span aria-hidden="true" className="mobile-home-icon" />
        </button>
        <button
          aria-label="App-Umschalter"
          aria-pressed={recentsOpen}
          onClick={() => setRecentsOpen((open) => !open)}
          type="button"
        >
          <span aria-hidden="true" className="mobile-recents-icon" />
        </button>
      </nav>
    </StyledMobileShell>
  );
};

export default MobileShell;
