import styled from "styled-components";

const StyledSettings = styled.div`
  background: #f1f4f2;
  color: #202522;
  display: grid;
  font-family: ${({ theme }) => theme.formats.systemFont};
  grid-template-columns: 220px minmax(0, 1fr);
  height: 100%;

  .settings-sidebar {
    background: #e7ece9;
    border-right: 1px solid #d2dad5;
    padding: 28px 16px;

    h1 {
      font-size: 20px;
      font-weight: 600;
      margin: 0 0 28px 10px;
    }

    nav {
      display: grid;
      gap: 4px;
    }

    button {
      background: #d5e5dc;
      border: 0;
      border-radius: 6px;
      color: #183d2e;
      font: inherit;
      min-height: 40px;
      padding: 8px 10px;
      text-align: left;
    }
  }

  .settings-content {
    min-width: 0;
    overflow: auto;
    padding: 38px 42px;

    h2 {
      font-size: 25px;
      font-weight: 600;
      margin: 3px 0 28px;
    }
  }

  .settings-eyebrow {
    color: #53645b;
    font-size: 12px;
    margin: 0;
  }

  .settings-option {
    border-bottom: 1px solid #d4ddd7;
    display: grid;
    gap: 16px;
    padding: 0 0 24px;

    h3 {
      font-size: 16px;
      font-weight: 600;
      margin: 0 0 6px;
    }

    p {
      color: #526058;
      font-size: 13px;
      line-height: 1.5;
      margin: 0;
    }
  }

  .settings-segment {
    background: #e1e7e3;
    border: 1px solid #cbd5ce;
    border-radius: 7px;
    display: inline-flex;
    gap: 3px;
    justify-self: start;
    padding: 3px;

    button {
      background: transparent;
      border: 0;
      border-radius: 5px;
      color: #34443b;
      font: inherit;
      font-size: 13px;
      min-height: 34px;
      padding: 0 14px;

      &[aria-pressed="true"] {
        background: #fff;
        box-shadow: 0 1px 3px rgb(23 43 31 / 18%);
        color: #123e2c;
      }
    }
  }

  .settings-description {
    min-height: 20px;
  }

  @media (width <= 600px) {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto minmax(0, 1fr);

    .settings-sidebar {
      border-bottom: 1px solid #d2dad5;
      border-right: 0;
      padding: 16px 18px 12px;

      h1 {
        font-size: 18px;
        margin: 0 0 12px;
      }

      nav {
        display: flex;
      }
    }

    .settings-content {
      padding: 24px 20px;
    }
  }
`;

export default StyledSettings;
