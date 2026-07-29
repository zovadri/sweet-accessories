function checkAuth() {
  var local = localStorage.getItem('sweet_admin_local');
  if (!local && !window.location.pathname.includes('login.html')) {
    window.location.href = '/dashboard/login.html';
  }
}
