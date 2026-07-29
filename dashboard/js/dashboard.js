function checkAuth() {
  const user = localStorage.getItem('adminUser');
  const isLoginPage = window.location.pathname.includes('login.html');
  if (!user && !isLoginPage) {
    window.location.href = '/dashboard/login.html';
  }
  if (user && isLoginPage) {
    window.location.href = '/dashboard/';
  }
}

function handleLogout() {
  if (typeof auth !== 'undefined' && auth.signOut) {
    auth.signOut();
  }
  localStorage.removeItem('adminUser');
  localStorage.removeItem('sweet_admin_local');
  localStorage.removeItem('sweet_admin_email');
  window.location.href = '/dashboard/login.html';
}
