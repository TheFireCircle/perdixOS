import StyledSettings from "components/apps/Settings/StyledSettings";
import { useSessionActions, useSurfaceMode } from "contexts/session";
import { type SurfaceMode } from "contexts/session/types";

const SURFACE_MODES: {
  description: string;
  label: string;
  value: SurfaceMode;
}[] = [
  {
    description: "Die Oberfläche richtet sich nach der Breite des Viewports.",
    label: "Automatisch",
    value: "auto",
  },
  {
    description: "Die Android-artige Oberfläche wird immer verwendet.",
    label: "Mobil",
    value: "mobile",
  },
  {
    description: "Die Desktop-Oberfläche wird immer verwendet.",
    label: "Desktop",
    value: "desktop",
  },
];

const Settings: FC = () => {
  const surfaceMode = useSurfaceMode();
  const { setSurfaceMode } = useSessionActions();
  const selectedMode = SURFACE_MODES.find(({ value }) => value === surfaceMode);

  return (
    <StyledSettings>
      <aside className="settings-sidebar">
        <h1>Einstellungen</h1>
        <nav aria-label="Einstellungsbereiche">
          <button aria-current="page" type="button">
            Entwicklereinstellungen
          </button>
        </nav>
      </aside>
      <main className="settings-content">
        <p className="settings-eyebrow">System</p>
        <h2>Entwicklereinstellungen</h2>
        <section
          aria-labelledby="surface-mode-heading"
          className="settings-option"
        >
          <div>
            <h3 id="surface-mode-heading">Oberflächenmodus</h3>
            <p>Wähle, welche Oberfläche daedalOS verwenden soll.</p>
          </div>
          <div aria-label="Oberflächenmodus" className="settings-segment">
            {SURFACE_MODES.map(({ label, value }) => (
              <button
                key={value}
                aria-pressed={surfaceMode === value}
                onClick={() => setSurfaceMode(value)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
          <p aria-live="polite" className="settings-description">
            {selectedMode?.description}
          </p>
        </section>
      </main>
    </StyledSettings>
  );
};

export default Settings;
