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

document.addEventListener('DOMContentLoaded', function() {
  var sidebar = document.querySelector('.sidebar');
  if (!sidebar) return;
  var toggle = document.createElement('button');
  toggle.className = 'sidebar-toggle';
  toggle.innerHTML = '☰';
  toggle.setAttribute('aria-label', 'القائمة');
  document.body.appendChild(toggle);
  var backdrop = document.createElement('div');
  backdrop.className = 'sidebar-backdrop';
  document.body.appendChild(backdrop);
  toggle.addEventListener('click', function() {
    sidebar.classList.toggle('open');
    backdrop.classList.toggle('open');
    document.body.style.overflow = sidebar.classList.contains('open') ? 'hidden' : '';
  });
  backdrop.addEventListener('click', function() {
    sidebar.classList.remove('open');
    backdrop.classList.remove('open');
    document.body.style.overflow = '';
  });
  sidebar.querySelectorAll('a').forEach(function(a) {
    a.addEventListener('click', function() {
      if (window.innerWidth <= 768) {
        sidebar.classList.remove('open');
        backdrop.classList.remove('open');
        document.body.style.overflow = '';
      }
    });
  });
});
