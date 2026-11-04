/** Available before the native bridge loads in rebuilt PC apps. */
export const isDesktopRuntime = () => {
  const shell = window as unknown as { __D79_DESKTOP__?: boolean; pywebview?: unknown };
  return Boolean(shell.__D79_DESKTOP__ || shell.pywebview || navigator.userAgent.includes("Double79Desktop/"));
};

export const initializeDesktopRuntime = () => {
  const mark = () => {
    if (isDesktopRuntime()) document.documentElement.classList.add("desktop-runtime");
  };
  mark();
  window.addEventListener("pywebviewready", mark, { once: true });
  window.addEventListener("d79:desktop-ready", mark, { once: true });
};