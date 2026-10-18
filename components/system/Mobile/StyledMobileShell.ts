import { css, styled } from "styled-components";
import { type SurfaceMode } from "contexts/session/types";

const StyledMobileShell = styled.div<{ $surfaceMode: SurfaceMode }>`
  display: ${({ $surfaceMode }) =>
    $surfaceMode === "mobile" ? "block" : "none"};
  inset: 0;
  pointer-events: none;
  position: absolute;

  @media (width <= 760px) {
    ${({ $surfaceMode }) =>
      $surfaceMode === "auto" &&
      css`
        display: block;
      `}
  }

  .mobile-home {
    background:
      linear-gradient(180deg, rgb(7 19 30 / 12%), rgb(5 13 23 / 38%)),
      linear-gradient(
        155deg,
        #28645e 0%,
        #376b50 42%,
        #665b43 72%,
        #70473f 100%
      );
    inset: 0;
    overflow: auto;
    padding: calc(62px + env(safe-area-inset-top, 0px)) 20px
      calc(42px + env(safe-area-inset-bottom, 0px));
    pointer-events: auto;
    position: absolute;
    z-index: 0;
  }

  .mobile-clock {
    color: #fff;
    font-size: 46px;
    font-weight: 300;
    line-height: 1;
    margin: 5vh 0 5px;
  }

  .mobile-date {
    color: rgb(255 255 255 / 76%);
    font-size: 14px;
    margin-bottom: 8vh;
  }

  .mobile-home-app-grid,
  .app-drawer-grid {
    display: grid;
    gap: 18px 8px;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .mobile-home-app-grid {
    padding-top: 4px;
  }

  .mobile-home-app-grid li,
  .app-drawer-grid li {
    min-width: 0;
    position: relative;
  }

  .mobile-home-app,
  .app-drawer-launch {
    align-items: center;
    background: transparent;
    border: 0;
    color: #fff;
    display: flex;
    flex-direction: column;
    font: inherit;
    gap: 7px;
    min-width: 0;
    padding: 0 2px;
    text-align: center;
    width: 100%;

    img {
      filter: drop-shadow(0 3px 7px rgb(0 0 0 / 30%));
      height: 52px;
      object-fit: contain;
      width: 52px;
    }

    span {
      font-size: 12px;
      line-height: 1.2;
      max-height: 29px;
      overflow: hidden;
      overflow-wrap: anywhere;
      text-overflow: ellipsis;
      text-shadow: 0 1px 4px rgb(0 0 0 / 75%);
      width: 100%;
    }
  }

  .app-drawer-launch {
    color: #34464e;

    img {
      filter: none;
    }

    span {
      text-shadow: none;
    }
  }

  .mobile-home-empty,
  .app-drawer-empty {
    font-size: 14px;
    text-align: center;
  }

  .mobile-home-empty {
    color: rgb(255 255 255 / 84%);
    margin: 12vh auto 0;
    max-width: 260px;

    p {
      margin: 0 0 12px;
    }

    button {
      background: rgb(255 255 255 / 18%);
      border: 1px solid rgb(255 255 255 / 35%);
      border-radius: 18px;
      color: #fff;
      font: inherit;
      font-size: 13px;
      min-height: 38px;
      padding: 0 16px;
    }
  }

  .mobile-app-drawer-handle {
    align-items: center;
    background: rgb(12 22 25 / 36%);
    border: 0;
    border-radius: 20px;
    bottom: calc(36px + env(safe-area-inset-bottom, 0px));
    color: #fff;
    display: flex;
    flex-direction: column;
    font: inherit;
    font-size: 11px;
    gap: 3px;
    height: 42px;
    justify-content: center;
    left: 50%;
    min-width: 112px;
    padding: 2px 12px;
    position: absolute;
    touch-action: none;
    transform: translateX(-50%);
    z-index: 2;
  }

  .app-drawer-handle-indicator {
    background: rgb(255 255 255 / 86%);
    border-radius: 2px;
    height: 3px;
    width: 28px;
  }

  .mobile-app-drawer {
    animation: notification-shade-enter 180ms ease-out both;
    background: #e7ebed;
    bottom: calc(28px + env(safe-area-inset-bottom, 0));
    color: #263238;
    display: flex;
    flex-direction: column;
    inset-inline: 0;
    overflow: hidden;
    padding-top: env(safe-area-inset-top, 0);
    pointer-events: auto;
    position: absolute;
    top: calc(28px + env(safe-area-inset-top, 0));
    z-index: 100001;
  }

  .mobile-app-drawer > .app-drawer-handle-indicator {
    background: #aab5ba;
    flex: 0 0 4px;
    margin: 8px auto 0;
    width: 36px;
  }

  .app-drawer-header {
    align-items: center;
    display: flex;
    justify-content: space-between;
    min-height: 58px;
    padding: 8px 18px;

    h2 {
      color: #263238;
      font-size: 20px;
      font-weight: 400;
      margin: 0;
    }

    button {
      background: transparent;
      border: 0;
      color: #52636a;
      font-size: 25px;
      height: 40px;
      padding: 0;
      width: 40px;
    }
  }

  .app-drawer-search {
    align-items: center;
    background: #fff;
    border: 1px solid #d4dcdf;
    border-radius: 4px;
    color: #64747b;
    display: flex;
    flex: 0 0 42px;
    gap: 10px;
    margin: 0 16px 14px;
    padding: 0 12px;

    span {
      font-size: 20px;
    }

    input {
      background: transparent;
      border: 0;
      color: #263238;
      flex: 1;
      font: inherit;
      font-size: 14px;
      min-width: 0;
      outline: 0;
    }
  }

  .app-drawer-grid {
    align-content: start;
    flex: 1;
    gap: 20px 8px;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 10px 16px 24px;
  }

  .app-drawer-pin {
    align-items: center;
    background: #168d87;
    border: 2px solid #e7ebed;
    border-radius: 50%;
    bottom: 28px;
    color: #fff;
    display: flex;
    font-size: 16px;
    height: 26px;
    justify-content: center;
    padding: 0;
    position: absolute;
    right: 4px;
    width: 26px;

    &[aria-pressed="true"] {
      background: #58666d;
    }
  }

  .mobile-navigation button {
    align-items: center;
    background: transparent;
    border: 0;
    color: inherit;
    display: flex;
    height: 100%;
    justify-content: center;
    min-width: 64px;
    padding: 0;
  }

  .mobile-status,
  .mobile-navigation {
    align-items: center;
    color: #fff;
    display: flex;
    left: 0;
    pointer-events: auto;
    position: absolute;
    right: 0;
    z-index: 100000;
  }

  .mobile-status {
    background: rgb(8 15 22 / 24%);
    cursor: grab;
    font-size: 12px;
    font-weight: 600;
    height: calc(28px + env(safe-area-inset-top, 0));
    justify-content: space-between;
    padding: env(safe-area-inset-top, 0) 16px 0;
    top: 0;
    touch-action: none;
    user-select: none;
  }

  .mobile-status-icons {
    align-items: center;
    display: flex;
    gap: 7px;
  }

  .mobile-cellular {
    align-items: flex-end;
    display: flex;
    gap: 2px;
    height: 11px;

    span {
      background: #fff;
      border-radius: 1px;
      height: 4px;
      width: 2px;

      &:nth-child(2) {
        height: 6px;
      }

      &:nth-child(3) {
        height: 8px;
      }

      &:nth-child(4) {
        height: 10px;
      }
    }
  }

  .mobile-wifi {
    border: 2px solid transparent;
    border-radius: 50%;
    border-top-color: #fff;
    height: 12px;
    position: relative;
    width: 14px;

    &[data-enabled] {
      opacity: 100%;
    }

    &:not([data-enabled]) {
      opacity: 45%;
    }

    &::after {
      background: #fff;
      border-radius: 50%;
      bottom: 0;
      content: "";
      height: 2px;
      left: 50%;
      position: absolute;
      transform: translateX(-50%);
      width: 2px;
    }
  }

  .mobile-battery {
    border: 1px solid rgb(255 255 255 / 90%);
    border-radius: 2px;
    height: 10px;
    position: relative;
    width: 17px;

    &::before {
      background: #fff;
      content: "";
      inset: 2px;
      position: absolute;
    }

    &::after {
      background: #fff;
      content: "";
      height: 4px;
      position: absolute;
      right: -3px;
      top: 2px;
      width: 2px;
    }
  }

  .mobile-navigation {
    background: rgb(8 13 20 / 90%);
    bottom: 0;
    height: calc(28px + env(safe-area-inset-bottom, 0));
    justify-content: center;
    padding-bottom: env(safe-area-inset-bottom, 0);
  }

  .mobile-back-icon {
    border-bottom: 2px solid #fff;
    border-left: 2px solid #fff;
    height: 9px;
    transform: rotate(45deg);
    width: 9px;
  }

  .mobile-home-icon {
    border: 2px solid #fff;
    border-radius: 50%;
    height: 14px;
    width: 14px;
  }

  .mobile-recents-icon {
    border: 2px solid #fff;
    border-radius: 2px;
    height: 13px;
    width: 15px;
  }

  .mobile-recents {
    background: rgb(9 16 25 / 94%);
    inset: calc(28px + env(safe-area-inset-top, 0px)) 0
      calc(28px + env(safe-area-inset-bottom, 0px));
    overflow: auto;
    padding: 24px 18px;
    pointer-events: auto;
    position: absolute;
    z-index: 100001;
  }

  .mobile-brightness-overlay {
    background: #000;
    inset: 0;
    pointer-events: none;
    position: absolute;
    z-index: 99999;
  }

  .mobile-notification-center {
    animation: notification-shade-enter 180ms ease-out both;
    background: #e7ebed;
    color: #263238;
    display: flex;
    flex-direction: column;
    inset: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: env(safe-area-inset-top, 0) 0 env(safe-area-inset-bottom, 0);
    pointer-events: auto;
    position: absolute;
    z-index: 100001;
  }

  .notification-shade-handle {
    background: #aab5ba;
    border-radius: 2px;
    height: 4px;
    margin: 8px auto 0;
    width: 36px;
  }

  .notification-shade-header {
    align-items: center;
    display: flex;
    justify-content: space-between;
    min-height: 82px;
    padding: 12px 20px;
  }

  .notification-shade-time {
    color: #263238;
    font-size: 28px;
    font-weight: 400;
    margin: 0 0 3px;
  }

  .notification-shade-date {
    color: #58666d;
    font-size: 13px;
    margin: 0;
  }

  .notification-shade-actions {
    display: flex;
    gap: 8px;
  }

  .mobile-notification-center .notification-shade-actions button {
    align-items: center;
    background: #d5dcdf;
    border: 0;
    border-radius: 50%;
    color: #36464d;
    display: flex;
    height: 38px;
    justify-content: center;
    padding: 0;
    width: 38px;
  }

  .notification-settings-button {
    font-size: 20px;
  }

  .notification-close-button {
    font-size: 24px;
  }

  .quick-settings {
    background: #dce2e4;
    border-bottom: 1px solid #cbd3d6;
    padding: 10px 14px 14px;
  }

  .quick-settings-grid {
    display: grid;
    gap: 8px;
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .quick-setting {
    align-items: flex-start;
    background: #f4f6f7;
    border: 1px solid #d1d9dc;
    border-radius: 5px;
    color: #3e5058;
    display: flex;
    flex-direction: column;
    gap: 5px;
    justify-content: center;
    min-height: 76px;
    min-width: 0;
    padding: 8px;
    text-align: left;

    &.active {
      background: #168d87;
      border-color: #168d87;
      color: #fff;
    }
  }

  .quick-setting-icon {
    align-items: center;
    background: rgb(45 62 70 / 10%);
    border-radius: 50%;
    display: flex;
    font-size: 18px;
    height: 30px;
    justify-content: center;
    width: 30px;
  }

  .quick-setting.active .quick-setting-icon {
    background: rgb(255 255 255 / 19%);
  }

  .quick-setting-label {
    font-size: 11px;
    line-height: 1.2;
    overflow-wrap: anywhere;
  }

  .quick-setting-status {
    font-size: 10px;
    opacity: 80%;
  }

  .quick-settings-controls {
    align-items: center;
    display: flex;
    gap: 12px;
    justify-content: space-between;
    margin-top: 14px;
  }

  .brightness-control {
    align-items: center;
    color: #46575e;
    display: flex;
    flex: 1;
    font-size: 20px;
    gap: 10px;
    min-width: 0;

    input {
      accent-color: #168d87;
      min-width: 0;
      width: 100%;
    }
  }

  .quick-settings-expand {
    background: transparent;
    border: 0;
    color: #087b76;
    font: inherit;
    font-size: 12px;
    min-height: 40px;
    padding: 0 4px;
    white-space: nowrap;
  }

  .notification-list {
    flex: 1;
    padding: 16px 14px 24px;
  }

  .notification-list-header {
    align-items: center;
    display: flex;
    justify-content: space-between;
    margin: 0 2px 10px;

    h2 {
      color: #34464e;
      font-size: 14px;
      font-weight: 600;
      margin: 0;
    }

    .mobile-notification-center & button {
      background: transparent;
      border: 0;
      color: #087b76;
      font: inherit;
      font-size: 12px;
      min-height: 36px;
      padding: 0 4px;
    }
  }

  .notification-list ol {
    display: grid;
    gap: 8px;
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .mobile-notification {
    align-items: flex-start;
    background: #fff;
    border: 1px solid #dce1e3;
    border-radius: 4px;
    display: flex;
    gap: 12px;
    padding: 14px 12px;

    > img,
    > .notification-app-icon {
      border-radius: 50%;
      flex: 0 0 34px;
      height: 34px;
      object-fit: cover;
      width: 34px;
    }

    > .notification-app-icon {
      align-items: center;
      background: #168d87;
      color: #fff;
      display: flex;
      font-size: 15px;
      justify-content: center;
    }
  }

  .notification-copy {
    flex: 1;
    min-width: 0;

    h3 {
      color: #27383f;
      font-size: 14px;
      font-weight: 600;
      margin: 4px 0;
    }

    p {
      color: #53636a;
      font-size: 13px;
      line-height: 1.4;
      margin: 0;
      overflow-wrap: anywhere;
    }
  }

  .notification-meta {
    align-items: center;
    color: #6a777d;
    display: flex;
    font-size: 11px;
    justify-content: space-between;
  }

  .notification-dismiss {
    background: transparent;
    border: 0;
    color: #718087;
    font-size: 20px;
    height: 30px;
    line-height: 1;
    padding: 0;
    width: 30px;
  }

  .notification-empty {
    color: #607077;
    font-size: 13px;
    margin: 32px 0;
    text-align: center;
  }

  @keyframes notification-shade-enter {
    from {
      opacity: 0%;
      transform: translateY(-12px);
    }

    to {
      opacity: 100%;
      transform: translateY(0);
    }
  }

  .mobile-recents h2 {
    color: #fff;
    font-size: 18px;
    font-weight: 500;
    margin: 0 0 18px;
  }

  .mobile-recent-entry {
    align-items: center;
    background: rgb(255 255 255 / 9%);
    border: 1px solid rgb(255 255 255 / 13%);
    border-radius: 8px;
    color: #fff;
    display: flex;
    gap: 12px;
    margin-bottom: 10px;
    min-height: 70px;
    padding: 10px 12px;
    text-align: left;
    width: 100%;
  }

  .mobile-recent-open {
    align-items: center;
    background: transparent;
    border: 0;
    color: inherit;
    display: flex;
    flex: 1;
    gap: 12px;
    min-width: 0;
    padding: 0;
    text-align: left;
  }

  .mobile-recent-icon {
    background-position: center;
    background-repeat: no-repeat;
    background-size: contain;
    flex: 0 0 42px;
    height: 42px;
  }

  .mobile-recent-title {
    flex: 1;
    font-size: 14px;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .mobile-close-app {
    align-items: center;
    background: transparent;
    border: 0;
    color: #fff;
    display: flex;
    font-size: 21px;
    height: 40px;
    justify-content: center;
    width: 40px;
  }

  .mobile-empty {
    color: rgb(255 255 255 / 72%);
    font-size: 14px;
    margin: 30px 0;
    text-align: center;
  }
`;

export default StyledMobileShell;
