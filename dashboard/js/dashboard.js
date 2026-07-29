function checkAuth() {
  var user = localStorage.getItem('adminUser');
  if (user) return;
  try {
    auth.onAuthStateChanged(function(u) {
      if (u) {
        localStorage.setItem('adminUser', u.email);
      } else if (!window.location.pathname.includes('login.html')) {
        window.location.href = '/dashboard/login.html';
      }
    });
  } catch(e) {
    if (!window.location.pathname.includes('login.html')) {
      window.location.href = '/dashboard/login.html';
    }
  }
}

function handleLogout() {
  try { auth.signOut(); } catch(e) {}
  localStorage.removeItem('adminUser');
  window.location.href = '/dashboard/login.html';
}
