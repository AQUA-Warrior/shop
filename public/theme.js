(function() {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  let theme = localStorage.getItem('theme') || (prefersDark ? 'dark' : 'light');
  setTheme(theme);

  btn.onclick = function() {
    theme = (document.body.classList.contains('dark')) ? 'light' : 'dark';
    setTheme(theme);
    btn.style.transform = 'rotate(360deg) scale(1.2)';
    setTimeout(() => btn.style.transform = '', 400);
  };

  function setTheme(mode) {
    if (mode === 'dark') {
      document.body.classList.add('dark');
      btn.textContent = '☀️';
    } else {
      document.body.classList.remove('dark');
      btn.textContent = '🌙';
    }
    localStorage.setItem('theme', mode);
  }
})();
