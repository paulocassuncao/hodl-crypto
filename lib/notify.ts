/**
 * Show a system notification. Prefers the service worker's registration
 * (which fires reliably when the installed app is backgrounded and is
 * required on Android), falling back to a page Notification. No-op without
 * granted permission. Shared by the price-alert and sleeve-signal watchers;
 * `public/sw.js` routes notification clicks to `data.url`.
 */
export const notify = (title: string, body: string, url: string): void => {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") {
    return;
  }
  if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
    void navigator.serviceWorker.ready
      .then((reg) => reg.showNotification(title, { body, data: { url } }))
      .catch(() => {
        new Notification(title, { body });
      });
    return;
  }
  new Notification(title, { body });
};
