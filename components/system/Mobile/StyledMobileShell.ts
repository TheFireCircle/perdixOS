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

  [aria-label="Apps"] {
    contain: none !important;
    display: grid;
    gap: 16px 8px;
    grid-auto-flow: row;
    grid-auto-rows: 98px;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    grid-template-rows: none;
    height: auto !important;
    overflow: visible;
    padding: 0;
    place-content: start;

    > li {
      display: flex;
      justify-content: center;
      min-width: 0;
      padding: 0;

      > button {
        color: #fff;
        max-width: 76px;
        padding: 0;
        width: 100%;

        figure {
          gap: 7px;
          margin: 0;
          width: 100%;

          picture {
            filter: drop-shadow(0 3px 7px rgb(0 0 0 / 30%));
            height: 52px;
            width: 52px;
          }

          figcaption {
            color: #fff;
            font-size: 12px;
            line-height: 1.2;
            max-height: 29px;
            overflow: hidden;
            text-align: center;
            text-overflow: ellipsis;
            text-shadow: 0 1px 4px rgb(0 0 0 / 75%);
            width: 100%;
          }
        }
      }
    }
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
    font-size: 12px;
    font-weight: 600;
    height: calc(28px + env(safe-area-inset-top, 0));
    justify-content: space-between;
    padding: env(safe-area-inset-top, 0) 16px 0;
    top: 0;
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
