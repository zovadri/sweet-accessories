function checkAuth() {
  var user = localStorage.getItem('adminUser');
  if (!user && !window.location.pathname.includes('login.html')) {
    window.location.href = '/dashboard/login.html';
  }
}

function handleLogout() {
  try { auth.signOut(); } catch(e) {}
  localStorage.removeItem('adminUser');
  window.location.href = '/dashboard/login.html';
}
