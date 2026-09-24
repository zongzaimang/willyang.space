// The site is light-only, including visits with a previously saved dark preference.
(() => {
  const root = document.documentElement;
  root.dataset.theme = 'light';
  root.dataset.effectiveTheme = 'light';
  root.dataset.preference = 'light';
  try { localStorage.removeItem('wy-theme'); } catch {}
})();
