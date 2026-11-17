(function enableAppUpdates() {
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return;

  const reloadKey = 'chamah-portal-service-worker-reload';
  let refreshing = false;
  let hadController = Boolean(navigator.serviceWorker.controller);

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) {
      hadController = true;
      return;
    }
    if (refreshing || sessionStorage.getItem(reloadKey) === 'pending') return;
    refreshing = true;
    sessionStorage.setItem(reloadKey, 'pending');
    window.location.reload();
  });

  window.addEventListener('pageshow', () => {
    sessionStorage.removeItem(reloadKey);
    navigator.serviceWorker.getRegistration().then((registration) => registration?.update()).catch(() => {});
  });

  navigator.serviceWorker.register('/service-worker.js', { updateViaCache: 'none' }).then((registration) => {
    registration.update().catch(() => {});
  }).catch(() => {
    // The portal remains usable when service workers are unavailable.
  });
}());
