(() => {
  const OPEN_CLASS = 'nav-drawer-open';

  function getParts() {
    return {
      toggle: document.querySelector('#nav-toggle'),
      drawer: document.querySelector('.mobile-drawer'),
      backdrop: document.querySelector('.nav-backdrop'),
      hamburger: document.querySelector('.hamburger-button'),
    };
  }

  function setDrawerOpen(open) {
    const { toggle, drawer, backdrop, hamburger } = getParts();
    const isOpen = Boolean(open);

    if (toggle) toggle.checked = isOpen;
    document.documentElement.classList.toggle(OPEN_CLASS, isOpen);
    document.body?.classList.toggle(OPEN_CLASS, isOpen);
    drawer?.setAttribute('aria-hidden', String(!isOpen));
    backdrop?.setAttribute('aria-hidden', String(!isOpen));
    hamburger?.setAttribute('aria-expanded', String(isOpen));
  }

  function closeDrawer() {
    setDrawerOpen(false);
  }

  function syncFromToggle() {
    const { toggle } = getParts();
    setDrawerOpen(Boolean(toggle?.checked));
  }

  function bindNavigation() {
    const { toggle, drawer, backdrop } = getParts();
    if (!toggle) return;

    setDrawerOpen(false);
    toggle.addEventListener('change', syncFromToggle);

    ['pointerdown', 'click', 'touchstart'].forEach((eventName) => {
      backdrop?.addEventListener(eventName, (event) => {
        event.preventDefault();
        event.stopPropagation();
        closeDrawer();
      }, true);
    });

    drawer?.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', closeDrawer);
    });
  }

  document.addEventListener('click', (event) => {
    const { toggle, drawer, hamburger } = getParts();
    if (!toggle?.checked) return;
    if (event.target === toggle) return;
    if (event.target.closest('.nav-backdrop')) {
      event.preventDefault();
      event.stopPropagation();
      closeDrawer();
      return;
    }
    if (drawer?.contains(event.target) || hamburger?.contains(event.target)) return;
    closeDrawer();
  }, true);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeDrawer();
  });

  window.addEventListener('pageshow', closeDrawer);
  window.addEventListener('hashchange', closeDrawer);
  window.addEventListener('popstate', closeDrawer);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindNavigation, { once: true });
  } else {
    bindNavigation();
  }
})();
