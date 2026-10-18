import { useRef } from "react";
import StyledDesktop from "components/system/Desktop/StyledDesktop";
import useWallpaper from "components/system/Desktop/Wallpapers/useWallpaper";
import FileManager from "components/system/Files/FileManager";
import MobileShell from "components/system/Mobile";
import { useSurfaceMode } from "contexts/session";
import { DESKTOP_PATH } from "utils/constants";

const Desktop: FC = ({ children }) => {
  const desktopRef = useRef<HTMLElement | null>(null);
  const surfaceMode = useSurfaceMode();

  useWallpaper(desktopRef);

  return (
    <StyledDesktop ref={desktopRef} $surfaceMode={surfaceMode}>
      <FileManager
        url={DESKTOP_PATH}
        allowMovingDraggableEntries
        hideLoading
        hideScrolling
        isDesktop
        loadIconsImmediately
      />
      {children}
      <MobileShell surfaceMode={surfaceMode} />
    </StyledDesktop>
  );
};

export default Desktop;
