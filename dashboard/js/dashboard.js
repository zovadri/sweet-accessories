class DashboardAPI {
  constructor() {
    this.baseUrl = '/api';
    this.token = localStorage.getItem('sweet_token');
    this.user = JSON.parse(localStorage.getItem('sweet_user') || 'null');
    this.db = null;
    this.initFirebase();
    this.checkAuth();
  }

  initFirebase() {
    const firebaseConfig = {
      apiKey: "YOUR_API_KEY",
      authDomain: "YOUR_AUTH_DOMAIN",
      projectId: "YOUR_PROJECT_ID",
      storageBucket: "YOUR_STORAGE_BUCKET",
      messagingSenderId: "YOUR_SENDER_ID",
      appId: "YOUR_APP_ID"
    };
    if (typeof firebase !== 'undefined' && !firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
      this.db = firebase;
    }
  }

  checkAuth() {
    const isLocal = localStorage.getItem('sweet_admin_local') === 'true';
    if (!this.token && !isLocal && !window.location.pathname.includes('login.html')) {
      this.redirectToLogin();
    }
    if ((this.token || isLocal) && window.location.pathname.includes('login.html')) {
      this.redirectToDashboard();
    }
  }

  redirectToLogin() {
    window.location.href = '/dashboard/login.html';
  }

  redirectToDashboard() {
    window.location.href = '/dashboard/index.html';
  }

  async login(email, password) {
    try {
      const res = await fetch(`${this.baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (!res.ok) throw new Error('Login failed');
      const data = await res.json();
      this.token = data.token;
      this.user = data.user;
      localStorage.setItem('sweet_token', data.token);
      localStorage.setItem('sweet_user', JSON.stringify(data.user));
      return data;
    } catch (e) {
      throw e;
    }
  }

  logout() {
    localStorage.removeItem('sweet_token');
    localStorage.removeItem('sweet_user');
    localStorage.removeItem('sweet_admin_local');
    localStorage.removeItem('sweet_admin_email');
    this.token = null;
    this.user = null;
    this.redirectToLogin();
  }

  async getDashboardStats() {
    const res = await fetch(`${this.baseUrl}/dashboard/stats`, {
      headers: { Authorization: `Bearer ${this.token}` }
    });
    return res.json();
  }

  async getProducts(page = 1, limit = 10) {
    const res = await fetch(`${this.baseUrl}/products?page=${page}&limit=${limit}`, {
      headers: { Authorization: `Bearer ${this.token}` }
    });
    return res.json();
  }

  async getProduct(id) {
    const res = await fetch(`${this.baseUrl}/products/${id}`, {
      headers: { Authorization: `Bearer ${this.token}` }
    });
    return res.json();
  }

  async createProduct(product) {
    const res = await fetch(`${this.baseUrl}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`
      },
      body: JSON.stringify(product)
    });
    return res.json();
  }

  async updateProduct(id, product) {
    const res = await fetch(`${this.baseUrl}/products/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`
      },
      body: JSON.stringify(product)
    });
    return res.json();
  }

  async deleteProduct(id) {
    const res = await fetch(`${this.baseUrl}/products/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${this.token}` }
    });
    return res.json();
  }

  async getCategories() {
    const res = await fetch(`${this.baseUrl}/categories`, {
      headers: { Authorization: `Bearer ${this.token}` }
    });
    return res.json();
  }

  async createCategory(category) {
    const res = await fetch(`${this.baseUrl}/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`
      },
      body: JSON.stringify(category)
    });
    return res.json();
  }

  async updateCategory(id, category) {
    const res = await fetch(`${this.baseUrl}/categories/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`
      },
      body: JSON.stringify(category)
    });
    return res.json();
  }

  async deleteCategory(id) {
    const res = await fetch(`${this.baseUrl}/categories/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${this.token}` }
    });
    return res.json();
  }

  async getBanners() {
    const res = await fetch(`${this.baseUrl}/banners`, {
      headers: { Authorization: `Bearer ${this.token}` }
    });
    return res.json();
  }

  async createBanner(banner) {
    const res = await fetch(`${this.baseUrl}/banners`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`
      },
      body: JSON.stringify(banner)
    });
    return res.json();
  }

  async updateBanner(id, banner) {
    const res = await fetch(`${this.baseUrl}/banners/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`
      },
      body: JSON.stringify(banner)
    });
    return res.json();
  }

  async deleteBanner(id) {
    const res = await fetch(`${this.baseUrl}/banners/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${this.token}` }
    });
    return res.json();
  }

  async getReviews() {
    const res = await fetch(`${this.baseUrl}/reviews`, {
      headers: { Authorization: `Bearer ${this.token}` }
    });
    return res.json();
  }

  async createReview(review) {
    const res = await fetch(`${this.baseUrl}/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`
      },
      body: JSON.stringify(review)
    });
    return res.json();
  }

  async deleteReview(id) {
    const res = await fetch(`${this.baseUrl}/reviews/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${this.token}` }
    });
    return res.json();
  }

  async uploadImage(file, path = 'products') {
    if (this.db) {
      const storageRef = this.db.storage().ref();
      const fileRef = storageRef.child(`${path}/${Date.now()}_${file.name}`);
      const snapshot = await fileRef.put(file);
      return await snapshot.ref.getDownloadURL();
    }
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${this.baseUrl}/upload/${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.token}` },
      body: formData
    });
    return res.json();
  }

  async getSettings() {
    const res = await fetch(`${this.baseUrl}/settings`, {
      headers: { Authorization: `Bearer ${this.token}` }
    });
    return res.json();
  }

  async saveSettings(settings) {
    const res = await fetch(`${this.baseUrl}/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`
      },
      body: JSON.stringify(settings)
    });
    return res.json();
  }
}

const api = new DashboardAPI();

function handleLoginForm(formId) {
  const form = document.getElementById(formId);
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = form.querySelector('#email').value;
    const password = form.querySelector('#password').value;
    try {
      await api.login(email, password);
      api.redirectToDashboard();
    } catch (err) {
      const errorEl = form.querySelector('.error-message');
      if (errorEl) errorEl.textContent = err.message || 'Login failed';
    }
  });
}

function handleLogout(btnId) {
  if (btnId && document.getElementById(btnId)) {
    document.getElementById(btnId).addEventListener('click', () => api.logout());
  } else {
    api.logout();
  }
}

function loadDashboardStats() {
  api.getDashboardStats().then(stats => {
    Object.keys(stats).forEach(key => {
      const el = document.getElementById(`stat-${key}`);
      if (el) el.textContent = stats[key];
    });
  }).catch(console.error);
}

function loadProductsTable(tableBodyId, page = 1) {
  const tbody = document.getElementById(tableBodyId);
  if (!tbody) return;
  api.getProducts(page).then(data => {
    tbody.innerHTML = data.products.map(p => `
      <tr>
        <td>${p.id}</td>
        <td><img src="${p.image || '/images/placeholder.svg'}" alt="${p.name}" width="50"/></td>
        <td>${p.name}</td>
        <td>${p.price}</td>
        <td>${p.category}</td>
        <td>
          <button onclick="editProduct(${p.id})">Edit</button>
          <button onclick="deleteProduct(${p.id})">Delete</button>
        </td>
      </tr>
    `).join('');
  }).catch(console.error);
}

function loadCategoriesList(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  api.getCategories().then(data => {
    container.innerHTML = data.categories.map(c => `
      <div class="category-item">
        <span>${c.name}</span>
        <button onclick="deleteCategory(${c.id})">Delete</button>
      </div>
    `).join('');
  }).catch(console.error);
}

function loadBannersList(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  api.getBanners().then(data => {
    container.innerHTML = data.banners.map(b => `
      <div class="banner-item">
        <img src="${b.image}" alt="${b.title}" width="200"/>
        <span>${b.title}</span>
        <button onclick="deleteBanner(${b.id})">Delete</button>
      </div>
    `).join('');
  }).catch(console.error);
}

function loadReviewsList(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  api.getReviews().then(data => {
    container.innerHTML = data.reviews.map(r => `
      <div class="review-item">
        <strong>${r.userName}</strong>
        <p>${r.comment}</p>
        <small>${r.rating}/5</small>
        <button onclick="deleteReview(${r.id})">Delete</button>
      </div>
    `).join('');
  }).catch(console.error);
}

function editProduct(id) {
  window.location.href = `/dashboard/product-form.html?id=${id}`;
}

function deleteProduct(id) {
  if (confirm('Delete this product?')) {
    api.deleteProduct(id).then(() => loadProductsTable('products-table-body')).catch(console.error);
  }
}

function deleteCategory(id) {
  if (confirm('Delete this category?')) {
    api.deleteCategory(id).then(() => loadCategoriesList('categories-list')).catch(console.error);
  }
}

function deleteBanner(id) {
  if (confirm('Delete this banner?')) {
    api.deleteBanner(id).then(() => loadBannersList('banners-list')).catch(console.error);
  }
}

function deleteReview(id) {
  if (confirm('Delete this review?')) {
    api.deleteReview(id).then(() => loadReviewsList('reviews-list')).catch(console.error);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  handleLoginForm('loginForm');
  handleLogout('logoutBtn');
});