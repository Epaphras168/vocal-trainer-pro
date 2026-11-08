// Pick the theme before first paint so there's no flash.
// Kept as a separate file (not inline) so the Content Security Policy needs no 'unsafe-inline' scripts.
try {
  var saved = JSON.parse(localStorage.getItem('belto-progress') || '{}').state || {};
  var pref = saved.theme || 'system';
  var dark = pref === 'dark' || (pref === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.documentElement.dataset.accent = saved.accent || 'ember';
} catch (e) {}
