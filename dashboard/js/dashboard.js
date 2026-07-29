var DASHBOARD_KEY = 'sweet2026';

function checkKey() {
  var key = new URLSearchParams(window.location.search).get('key');
  if (key === DASHBOARD_KEY) {
    localStorage.setItem('dash_key', DASHBOARD_KEY);
    return true;
  }
  return localStorage.getItem('dash_key') === DASHBOARD_KEY;
}

function checkAuth() {
  if (!checkKey()) { window.location.href = '/'; return; }
  var user = localStorage.getItem('adminUser');
  var path = window.location.pathname;
  if (!user && !path.includes('login.html')) {
    window.location.href = '/dashboard/login.html?key=' + DASHBOARD_KEY;
  }
  if (user && path.includes('login.html')) {
    window.location.href = '/dashboard/?key=' + DASHBOARD_KEY;
  }
}

function handleLogout() {
  try { auth.signOut(); } catch(e) {}
  localStorage.removeItem('adminUser');
  localStorage.removeItem('sweet_admin_local');
  localStorage.removeItem('dash_key');
  window.location.href = '/';
}
