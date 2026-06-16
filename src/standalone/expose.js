export function exposeHandlers(handlers) {
  Object.assign(window, handlers);
  window.__FITNOW_READY = true;
}
