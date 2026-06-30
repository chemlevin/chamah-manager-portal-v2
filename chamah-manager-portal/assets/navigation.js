(() => {
  function closeDrawer() {
    const toggle = document.querySelector('#nav-toggle');
    if (toggle) toggle.checked = false;
  }

  document.addEventListener('click', (event) => {
    const toggle = document.querySelector('#nav-toggle');
    if (!toggle || !toggle.checked) return;

    if (event.target === toggle) return;

    const drawer = document.querySelector('.mobile-drawer');
    const hamburger = document.querySelector('.hamburger-button');
    const backdrop = event.target.closest('.nav-backdrop');

    if (backdrop) {
      event.preventDefault();
      closeDrawer();
      return;
    }

    if (drawer?.contains(event.target) || hamburger?.contains(event.target)) return;
    closeDrawer();
  }, true);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeDrawer();
  });
})();
