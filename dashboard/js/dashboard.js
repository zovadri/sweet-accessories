function checkAuth() {
  var authed = localStorage.getItem('sweet_admin_local') === 'true' || localStorage.getItem('adminUser');
  if (!authed && !window.location.pathname.includes('login.html')) {
    window.location.href = '/dashboard/login.html';
  }
}

function handleLogout() {
  try { auth.signOut(); } catch(e) {}
  localStorage.removeItem('sweet_admin_local');
  localStorage.removeItem('sweet_admin_email');
  localStorage.removeItem('adminUser');
  window.location.href = '/dashboard/login.html';
}
