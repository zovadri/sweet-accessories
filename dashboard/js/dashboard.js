const DASHBOARD_KEY = 'sweet2026';

function checkKey() {
  const params = new URLSearchParams(window.location.search);
  const key = params.get('key');
  if (key === DASHBOARD_KEY) {
    localStorage.setItem('dash_key', DASHBOARD_KEY);
    return true;
  }
  const stored = localStorage.getItem('dash_key');
  if (stored === DASHBOARD_KEY) return true;
  return false;
}

function checkAuth() {
  if (!checkKey()) {
    window.location.href = '/';
    return;
  }
  const user = localStorage.getItem('adminUser');
  const isLoginPage = window.location.pathname.includes('login.html');
  if (!user && !isLoginPage) {
    window.location.href = '/dashboard/login.html?key=' + DASHBOARD_KEY;
  }
  if (user && isLoginPage) {
    window.location.href = '/dashboard/?key=' + DASHBOARD_KEY;
  }
}

function handleLogout() {
  if (typeof auth !== 'undefined' && auth.signOut) {
    auth.signOut();
  }
  localStorage.removeItem('adminUser');
  localStorage.removeItem('sweet_admin_local');
  localStorage.removeItem('sweet_admin_email');
  window.location.href = '/dashboard/login.html?key=' + DASHBOARD_KEY;
}
