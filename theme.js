// Runs before styles paint; storage may be unavailable in private browsing.
(() => {
  let preference = 'system';
  try { preference = localStorage.getItem('wy-theme') || 'system'; } catch {}
  if (!['light', 'dark', 'system'].includes(preference)) preference = 'system';
  document.documentElement.dataset.preference = preference;
  if (preference !== 'system') document.documentElement.dataset.theme = preference;
  document.documentElement.dataset.effectiveTheme = preference === 'system'
    ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : preference;
})();
