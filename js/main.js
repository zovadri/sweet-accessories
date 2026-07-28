// ============================================================
// Sweet Accessories - Main Application Script
// ============================================================

const SITE_CONFIG = {
  name: 'Sweet Accessories',
  whatsapp: '+2010XXXXXXXX',
  email: 'info@sweet-accessories.com',
  currency: 'جنيه',
  shipping: 30,
  freeShippingMin: 500,
  social: {
    facebook: '#',
    instagram: '#',
    tiktok: '#',
    twitter: '#'
  }
};

// ============================================================
// Cart Module
// ============================================================
const Cart = {
  key: 'sweet-cart',
  get() {
    try { return JSON.parse(localStorage.getItem(this.key)) || []; } catch { return []; }
  },
  save(items) {
    localStorage.setItem(this.key, JSON.stringify(items));
    this.updateBadge();
    this.updateCartUI();
  },
  add(product) {
    const items = this.get();
    const existing = items.find(i => i.id === product.id && i.color === product.color && i.size === product.size);
    if (existing) {
      existing.quantity += product.quantity || 1;
    } else {
      items.push({ ...product, quantity: product.quantity || 1 });
    }
    this.save(items);
    this.showToast('تمت إضافة المنتج إلى السلة', 'success');
  },
  remove(id, color, size) {
    let items = this.get();
    items = items.filter(i => !(i.id === id && i.color === color && i.size === size));
    this.save(items);
  },
  updateQuantity(id, color, size, qty) {
    const items = this.get();
    const item = items.find(i => i.id === id && i.color === color && i.size === size);
    if (item) {
      item.quantity = Math.max(1, qty);
      this.save(items);
    }
  },
  clear() {
    this.save([]);
  },
  getTotal() {
    return this.get().reduce((sum, i) => sum + (i.price * i.quantity), 0);
  },
  getCount() {
    return this.get().reduce((sum, i) => sum + i.quantity, 0);
  },
  updateBadge() {
    document.querySelectorAll('.cart-badge').forEach(el => {
      el.textContent = this.getCount();
      el.style.display = this.getCount() > 0 ? 'flex' : 'none';
    });
  },
  updateCartUI() {
    const container = document.querySelector('.cart-items');
    const summary = document.querySelector('.cart-summary');
    if (!container) return;
    const items = this.get();
    if (items.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="icon">🛒</div><h3>سلتك فارغة</h3><p>تصفح المنتجات وأضف ما يعجبك</p><a href="/products.html" class="btn btn-primary">تسوق الآن</a></div>';
      if (summary) summary.style.display = 'none';
      return;
    }
    if (summary) summary.style.display = 'block';
    container.innerHTML = items.map((item, idx) => `
      <div class="cart-item" data-index="${idx}">
        <img src="${item.image || '/images/placeholder.svg'}" alt="${item.name}" loading="lazy">
        <div class="info">
          <h4>${item.name}</h4>
          ${item.color ? `<p style="font-size:0.85rem;color:var(--text-lighter)">اللون: ${item.color}</p>` : ''}
          ${item.size ? `<p style="font-size:0.85rem;color:var(--text-lighter)">المقاس: ${item.size}</p>` : ''}
          <div class="price">${item.price} ${SITE_CONFIG.currency}</div>
          <div class="quantity" style="margin-top:8px">
            <div class="controls" style="display:inline-flex;border:1px solid var(--primary);border-radius:8px;overflow:hidden">
              <button onclick="Cart.updateQuantity('${item.id}','${item.color||''}','${item.size||''}',${item.quantity-1})" style="width:30px;height:30px">−</button>
              <input type="text" value="${item.quantity}" readonly style="width:36px;height:30px;text-align:center;border:none;border-left:1px solid var(--primary);border-right:1px solid var(--primary);font-weight:700">
              <button onclick="Cart.updateQuantity('${item.id}','${item.color||''}','${item.size||''}',${item.quantity+1})" style="width:30px;height:30px">+</button>
            </div>
          </div>
          <span class="remove" onclick="Cart.remove('${item.id}','${item.color||''}','${item.size||''}')">🗑️ حذف</span>
        </div>
        <div style="font-weight:700;color:var(--secondary);font-size:1.1rem">${item.price * item.quantity} ${SITE_CONFIG.currency}</div>
      </div>
    `).join('');
    this.updateSummary();
  },
  updateSummary() {
    const totalEl = document.querySelector('.cart-total');
    if (!totalEl) return;
    const items = this.get();
    const subtotal = this.getTotal();
    const shipping = subtotal >= SITE_CONFIG.freeShippingMin ? 0 : SITE_CONFIG.shipping;
    const total = subtotal + shipping;
    document.querySelector('.cart-subtotal').textContent = `${subtotal} ${SITE_CONFIG.currency}`;
    document.querySelector('.cart-shipping').textContent = shipping === 0 ? 'مجاني' : `${shipping} ${SITE_CONFIG.currency}`;
    totalEl.textContent = `${total} ${SITE_CONFIG.currency}`;
    const discountEl = document.querySelector('.cart-discount');
    if (discountEl) {
      const discount = parseInt(localStorage.getItem('sweet-coupon-discount') || '0');
      discountEl.textContent = discount > 0 ? `- ${discount} ${SITE_CONFIG.currency}` : '0';
    }
  },
  showToast(msg, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = msg;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('removing');
      setTimeout(() => toast.remove(), 400);
    }, 3000);
  }
};

// ============================================================
// Favorites Module
// ============================================================
const Favorites = {
  key: 'sweet-favorites',
  get() {
    try { return JSON.parse(localStorage.getItem(this.key)) || []; } catch { return []; }
  },
  save(items) {
    localStorage.setItem(this.key, JSON.stringify(items));
    this.updateUI();
  },
  toggle(product) {
    const items = this.get();
    const idx = items.findIndex(i => i.id === product.id);
    if (idx > -1) {
      items.splice(idx, 1);
      Cart.showToast('تمت إزالة المنتج من المفضلة', 'info');
    } else {
      items.push(product);
      Cart.showToast('تمت إضافة المنتج إلى المفضلة', 'success');
    }
    this.save(items);
  },
  isFavorite(id) {
    return this.get().some(i => i.id === id);
  },
  updateUI() {
    document.querySelectorAll('.wishlist-btn').forEach(btn => {
      const id = btn.dataset.id;
      btn.classList.toggle('active', this.isFavorite(id));
    });
    const container = document.querySelector('.favorites-grid');
    if (!container) return;
    const items = this.get();
    if (items.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="icon">💔</div><h3>قائمة المفضلة فارغة</h3><p>أضف منتجاتك المفضلة هنا</p><a href="/products.html" class="btn btn-primary">تصفح المنتجات</a></div>';
      return;
    }
    container.innerHTML = items.map(p => `
      <div class="product-card">
        <div class="image-wrap">
          <img src="${p.image || '/images/placeholder.svg'}" alt="${p.name}" loading="lazy">
          <div class="badges">${p.discount ? `<span class="badge badge-sale">-${p.discount}%</span>` : ''}</div>
          <button class="wishlist-btn active" onclick='Favorites.toggle({id:"${p.id}"})'>❤️</button>
        </div>
        <div class="info">
          <div class="category">${p.category || ''}</div>
          <h3>${p.name}</h3>
          <div class="price-row">
            <span class="price">${p.price} ${SITE_CONFIG.currency}</span>
            ${p.oldPrice ? `<span class="old-price">${p.oldPrice} ${SITE_CONFIG.currency}</span>` : ''}
          </div>
          <button class="add-cart" onclick='Cart.add({id:"${p.id}",name:"${p.name?.replace(/"/g,"\\\"")}",price:${p.price},image:"${p.image||''}"})'>🛒 إضافة للسلة</button>
        </div>
      </div>
    `).join('');
  }
};

// ============================================================
// Search Module
// ============================================================
const Search = {
  open() {
    document.querySelector('.search-overlay').classList.add('open');
    document.querySelector('.search-modal').classList.add('open');
    setTimeout(() => document.querySelector('.search-modal input').focus(), 300);
    document.body.style.overflow = 'hidden';
  },
  close() {
    document.querySelector('.search-overlay').classList.remove('open');
    document.querySelector('.search-modal').classList.remove('open');
    document.body.style.overflow = '';
  },
  async search(query) {
    const container = document.querySelector('.search-results');
    if (query.length < 2) { container.innerHTML = ''; return; }
    try {
      const products = await getCollection('products');
      const results = products.filter(p =>
        p.name?.toLowerCase().includes(query.toLowerCase()) ||
        p.category?.toLowerCase().includes(query.toLowerCase())
      );
      if (results.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-lighter)">لا توجد نتائج</div>';
        return;
      }
      container.innerHTML = results.slice(0, 8).map(p => `
        <a href="/product.html?id=${p.id}" class="search-result-item" onclick="Search.close()">
          <img src="${p.images?.[0] || '/images/placeholder.svg'}" alt="${p.name}" loading="lazy">
          <div class="info">
            <h4>${p.name}</h4>
            <div class="price">${p.price} ${SITE_CONFIG.currency}</div>
          </div>
        </a>
      `).join('');
    } catch (e) {
      console.error('Search error:', e);
    }
  }
};

// ============================================================
// UI Utilities
// ============================================================
const UI = {
  init() {
    this.headerScroll();
    this.mobileMenu();
    this.smoothScroll();
    this.animateOnScroll();
    this.countdownTimer();
    this.scrollTop();
    this.welcomePopup();
    this.setupSearch();
    this.loadSettings();
    this.renderProducts();
    this.renderCategories();
    this.renderReviews();
    this.renderCounts();
  },

  async loadSettings() {
    try {
      const all = await getCollection('settings');
      if (all.length === 0) return;
      const s = all[0];

      // Announcement bar
      const bar = document.getElementById('announcementBar');
      if (bar && s.announcement && s.announcement.active && s.announcement.text) {
        bar.style.display = 'block';
        bar.style.background = s.announcement.bg || 'var(--secondary)';
        bar.style.color = s.announcement.color || 'var(--white)';
        bar.innerHTML = `${s.announcement.text} <button class="close-announcement" onclick="this.parentElement.style.display='none'">✕</button>`;
      }

      // WhatsApp
      if (s.whatsapp) {
        const num = s.whatsapp.replace(/[^0-9]/g, '');
        if (num) {
          SITE_CONFIG.whatsapp = num;
          document.querySelectorAll('a[href*="wa.me"]').forEach(el => {
            el.href = `https://wa.me/${num}`;
          });
        }
      }

      // Social links
      if (s.instagram) document.querySelector('.footer-social a[aria-label="إنستجرام"]')?.setAttribute('href', s.instagram);
      if (s.facebook) document.querySelector('.footer-social a[aria-label="فيسبوك"]')?.setAttribute('href', s.facebook);
      if (s.twitter) document.querySelector('.footer-social a[aria-label="تويتر"]')?.setAttribute('href', s.twitter);

      // Email
      if (s.email) {
        SITE_CONFIG.email = s.email;
        document.querySelectorAll('[data-email]').forEach(el => {
          el.href = `mailto:${s.email}`;
          el.textContent = s.email;
        });
      }

      // Store info
      if (s.address) document.querySelector('[data-address]') && (document.querySelector('[data-address]').textContent = s.address);
    } catch (e) { console.warn('Settings load error:', e); }
  },

  headerScroll() {
    const header = document.querySelector('.header');
    if (!header) return;
    window.addEventListener('scroll', () => {
      header.classList.toggle('scrolled', window.scrollY > 50);
    });
  },

  mobileMenu() {
    const btn = document.querySelector('.mobile-menu-btn');
    const menu = document.querySelector('.mobile-menu');
    if (!btn || !menu) return;
    btn.addEventListener('click', () => {
      btn.classList.toggle('active');
      menu.classList.toggle('open');
      document.body.style.overflow = menu.classList.contains('open') ? 'hidden' : '';
    });
    menu.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        btn.classList.remove('active');
        menu.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  },

  smoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener('click', e => {
        const href = a.getAttribute('href');
        if (href === '#') return;
        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });
  },

  animateOnScroll() {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));
  },

  countdownTimer() {
    const el = document.querySelector('.countdown');
    if (!el) return;
    const endTime = new Date();
    endTime.setDate(endTime.getDate() + 7);
    function update() {
      const diff = endTime - new Date();
      if (diff <= 0) return;
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      document.querySelector('.countdown-days').textContent = String(d).padStart(2,'0');
      document.querySelector('.countdown-hours').textContent = String(h).padStart(2,'0');
      document.querySelector('.countdown-mins').textContent = String(m).padStart(2,'0');
      document.querySelector('.countdown-secs').textContent = String(s).padStart(2,'0');
    }
    update();
    setInterval(update, 1000);
  },

  scrollTop() {
    const btn = document.querySelector('.scroll-top');
    if (!btn) return;
    window.addEventListener('scroll', () => {
      btn.classList.toggle('visible', window.scrollY > 500);
    });
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  },

  welcomePopup() {
    if (localStorage.getItem('sweet-welcome-shown')) return;
    const popup = document.querySelector('.welcome-popup');
    if (!popup) return;
    setTimeout(() => {
      popup.classList.add('open');
      document.body.style.overflow = 'hidden';
    }, 1500);
    popup.querySelectorAll('.close-popup').forEach(btn => {
      btn.addEventListener('click', () => {
        popup.classList.remove('open');
        document.body.style.overflow = '';
        localStorage.setItem('sweet-welcome-shown', 'true');
      });
    });
  },

  setupSearch() {
    const input = document.querySelector('.search-modal input');
    if (!input) return;
    let timeout;
    input.addEventListener('input', () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => Search.search(input.value), 300);
    });
    document.querySelector('.search-overlay')?.addEventListener('click', Search.close);
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') Search.close();
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); Search.open(); }
    });
  },

  async renderProducts() {
    const grids = document.querySelectorAll('.products-grid');
    if (grids.length === 0) return;
    try {
      const products = await getCollection('products');
      grids.forEach(grid => {
        const type = grid.dataset.type || 'all';
        let filtered = products.filter(p => p.available !== false);
        if (type === 'new') filtered = filtered.sort((a,b) => (b.createdAt?.toMillis()||0) - (a.createdAt?.toMillis()||0)).slice(0, 8);
        else if (type === 'bestseller') filtered = filtered.filter(p => p.bestseller).slice(0, 8);
        else if (type === 'featured') filtered = filtered.filter(p => p.featured).slice(0, 8);
        else if (type === 'offers') filtered = filtered.filter(p => p.discount > 0).slice(0, 8);
        else if (type === 'category') {
          const cat = grid.dataset.category;
          if (cat) filtered = filtered.filter(p => p.category === cat);
        }
        if (filtered.length === 0) {
          grid.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-lighter);grid-column:1/-1">لا توجد منتجات</div>';
          return;
        }
        grid.innerHTML = filtered.map(p => this.productCardHTML(p)).join('');
      });
      this.setupWishlistButtons();
    } catch (e) {
      console.error('Render products error:', e);
      grids.forEach(g => g.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-lighter);grid-column:1/-1">عذراً، حدث خطأ في تحميل المنتجات</div>');
    }
  },

  productCardHTML(p) {
    const badges = [];
    if (p.isNew) badges.push('<span class="badge badge-new">جديد</span>');
    if (p.discount) badges.push(`<span class="badge badge-sale">-${p.discount}%</span>`);
    if (p.bestseller) badges.push('<span class="badge badge-bestseller">الأكثر مبيعًا</span>');
    if (p.lowStock) badges.push('<span class="badge badge-lowstock">نفد قريبًا</span>');
    return `
      <div class="product-card">
        <div class="image-wrap">
          <a href="/product.html?id=${p.id}">
            <img src="${p.images?.[0] || '/images/placeholder.svg'}" alt="${p.name}" loading="lazy">
          </a>
          ${badges.length ? `<div class="badges">${badges.join('')}</div>` : ''}
          <button class="wishlist-btn ${Favorites.isFavorite(p.id) ? 'active' : ''}" data-id="${p.id}" onclick='Favorites.toggle({id:"${p.id}",name:"${p.name?.replace(/"/g,"\\\"")}",price:${p.price},image:"${p.images?.[0]||""}",category:"${p.category||""}",discount:${p.discount||0}})'>${Favorites.isFavorite(p.id) ? '❤️' : '🤍'}</button>
          <a href="/product.html?id=${p.id}" class="quick-view">🔍 عرض سريع</a>
        </div>
        <div class="info">
          <div class="category">${p.categoryName || p.category || ''}</div>
          <a href="/product.html?id=${p.id}"><h3>${p.name}</h3></a>
          <div class="price-row">
            <span class="price">${p.price} ${SITE_CONFIG.currency}</span>
            ${p.oldPrice ? `<span class="old-price">${p.oldPrice} ${SITE_CONFIG.currency}</span>` : ''}
            ${p.discount ? `<span class="discount">-${p.discount}%</span>` : ''}
          </div>
          <div class="rating">⭐ ${p.rating || '0'} <span>(${p.reviews || 0})</span></div>
        </div>
        <div style="padding:0 20px 20px">
          <button class="add-cart" onclick='Cart.add({id:"${p.id}",name:"${p.name?.replace(/"/g,"\\\"")}",price:${p.price},image:"${p.images?.[0]||''}"})'>🛒 إضافة للسلة</button>
        </div>
      </div>`;
  },

  setupWishlistButtons() {
    document.querySelectorAll('.wishlist-btn').forEach(btn => {
      const id = btn.dataset.id;
      btn.classList.toggle('active', Favorites.isFavorite(id));
    });
  },

  async renderCategories() {
    const grid = document.querySelector('.categories-grid');
    if (!grid) return;
    try {
      const categories = await getCollection('categories');
      if (categories.length === 0) {
        const defaultCats = ['📿','💍','✨','💍','👑','🧣','⌚'];
        const defaultNames = ['سلاسل','اسورة','انسيالات','خواتم','اطقم','طرح','ساعات'];
        grid.innerHTML = defaultCats.map((icon, i) => `
          <a href="/products.html?category=${defaultNames[i]}" class="category-card">
            <div class="icon">${icon}</div>
            <span>${defaultNames[i]}</span>
          </a>
        `).join('');
        return;
      }
      grid.innerHTML = categories.map(c => `
        <a href="/products.html?category=${c.id}" class="category-card">
          ${c.image ? `<img src="${c.image}" alt="${c.name}" loading="lazy">` : `<div class="icon">${c.icon || '📦'}</div>`}
          <span>${c.name}</span>
        </a>
      `).join('');
    } catch (e) {
      console.error('Categories error:', e);
    }
  },

  async renderReviews() {
    const grid = document.querySelector('.reviews-grid');
    if (!grid) return;
    try {
      const reviews = await getCollection('reviews');
      const approved = reviews.filter(r => r.approved).slice(0, 6);
      if (approved.length === 0) {
        const defaultReviews = [
          { name: 'سارة أحمد', stars: 5, image: '/images/reviews/user1.svg', text: 'منتجات رائعة وجودة ممتازة! التوصيل كان سريع جداً والتغليف جميل. أنصح الجميع بالتعامل مع Sweet Accessories ❤️' },
          { name: 'نورا محمد', stars: 5, image: '/images/reviews/user2.svg', text: 'أكثر من رائع! الخواتم والسلاسل جميلة جداً والخامات عالية الجودة. سعيدة جداً بتجاربي معاهم 🤍' },
          { name: 'مريم علي', stars: 4, image: '/images/reviews/user3.svg', text: 'أسعار مناسبة ومنتجات جميلة. الشحن سريع والتغليف راقي. بالتوفيق 🌸' },
          { name: 'هدى أحمد', stars: 5, image: '/images/reviews/user1.svg', text: 'أول مرة أطلب وكانت تجربة رائعة! المنتج زي الصورة بالضبط والتوصيل أسرع من المتوقع. هطلب تاني أكيد 💕' },
          { name: 'رنا سعيد', stars: 5, image: '/images/reviews/user2.svg', text: 'الشنطة جميلة جداً والخامة فاخرة. سعرها مناسب جداً مقارنة بالجودة. تسلم ايديكم 🎀' },
          { name: 'دينا محمود', stars: 4, image: '/images/reviews/user3.svg', text: 'تشكيلة جميلة ومتنوعة. الطلب وصل بسرعه والتغليف كان أنيق جداً. أنصح بالتسوق من هنا 💝' },
        ];
        grid.innerHTML = defaultReviews.map(r => `
          <div class="review-card">
            <div class="review-stars">${'⭐'.repeat(r.stars)}</div>
            <p class="review-text">"${r.text}"</p>
            <div class="review-author">
              <img src="${r.image}" alt="${r.name}" loading="lazy">
              <div>
                <div class="name">${r.name}</div>
                <div class="title">عميلة مميزة</div>
              </div>
            </div>
          </div>
        `).join('');
        return;
      }
      grid.innerHTML = approved.map(r => `
        <div class="review-card">
          <div class="review-stars">${'⭐'.repeat(r.stars || 5)}</div>
          <p class="review-text">"${r.text}"</p>
          <div class="review-author">
            <img src="${r.image || '/images/reviews/user1.svg'}" alt="${r.name}" loading="lazy">
            <div>
              <div class="name">${r.name}</div>
              <div class="title">عميلة مميزة</div>
            </div>
          </div>
        </div>
      `).join('');
    } catch (e) {
      console.error('Reviews error:', e);
    }
  },



  async renderCounts() {
    try {
      const products = await getCollection('products');
      const count = products.filter(p => p.available !== false).length;
      document.querySelectorAll('.product-count').forEach(el => { el.textContent = count; });
    } catch (e) {}
  }
};

// ============================================================
// Product Detail Page
// ============================================================
const ProductDetail = {
  async load() {
    const container = document.querySelector('.product-detail');
    if (!container) return;
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (!id) { container.innerHTML = '<div style="text-align:center;padding:60px"><h2>المنتج غير موجود</h2><a href="/products.html" class="btn btn-primary mt-3">عرض المنتجات</a></div>'; return; }
    try {
      const product = await getDocument('products', id);
      if (!product) {
        container.innerHTML = '<div style="text-align:center;padding:60px"><h2>المنتج غير موجود</h2><a href="/products.html" class="btn btn-primary mt-3">عرض المنتجات</a></div>';
        return;
      }
      this.render(product);
    } catch (e) {
      console.error('Product detail error:', e);
      container.innerHTML = '<div style="text-align:center;padding:60px"><h2>حدث خطأ</h2><p>يرجى المحاولة مرة أخرى</p></div>';
    }
  },

  render(product) {
    const container = document.querySelector('.product-detail .container');
    const images = product.images && product.images.length > 0 ? product.images : ['/images/placeholder.svg'];
    const discount = product.oldPrice ? Math.round((1 - product.price / product.oldPrice) * 100) : 0;
    container.innerHTML = `
      <div class="product-gallery">
        <div class="main-image" id="mainImage">
          <img src="${images[0]}" alt="${product.name}" id="zoomImg">
        </div>
        <div class="thumbs">${images.map((img, i) => `<img src="${img}" alt="" class="${i===0?'active':''}" onclick="ProductDetail.switchImage(this,'${img}')" loading="lazy">`).join('')}</div>
      </div>
      <div class="product-info">
        <div class="category">${product.categoryName || product.category || ''}</div>
        <h1>${product.name}</h1>
        <div class="rating-row">
          <span class="stars">${'⭐'.repeat(Math.round(product.rating || 5))}</span>
          <span>(${product.reviews || 0} تقييم)</span>
          <span>👁️ ${product.views || 0} مشاهدة</span>
          <span>❤️ ${product.likes || 0} إعجاب</span>
        </div>
        <div class="price-row">
          <span class="price">${product.price} ${SITE_CONFIG.currency}</span>
          ${product.oldPrice ? `<span class="old-price">${product.oldPrice} ${SITE_CONFIG.currency}</span><span class="discount">-${discount}%</span>` : ''}
        </div>
        <div class="meta">
          <div class="item">📦 الحالة: ${product.available !== false ? 'متوفر' : 'غير متوفر'}</div>
          ${product.quantity ? `<div class="item">📊 الكمية: ${product.quantity}</div>` : ''}
        </div>
        ${product.colors ? `
        <div class="colors">
          <label>الألوان:</label>
          <div class="options">${product.colors.map(c => `<div class="color-option" style="background:${c.hex||c}" onclick="ProductDetail.selectColor(this,'${c.name||c}')" title="${c.name||c}"></div>`).join('')}</div>
        </div>` : ''}
        ${product.sizes ? `
        <div class="sizes">
          <label>المقاسات:</label>
          <div class="options">${product.sizes.map(s => `<div class="size-option" onclick="ProductDetail.selectSize(this,'${s}')">${s}</div>`).join('')}</div>
        </div>` : ''}
        ${product.available !== false ? `
        <div class="quantity">
          <label>الكمية:</label>
          <div class="controls">
            <button onclick="ProductDetail.changeQty(-1)">−</button>
            <input type="text" value="1" id="productQty" readonly>
            <button onclick="ProductDetail.changeQty(1)">+</button>
          </div>
        </div>` : ''}
        <div class="actions">
          <button class="btn btn-primary btn-lg" onclick="ProductDetail.addToCart('${product.id}')" ${product.available === false ? 'disabled' : ''}>🛒 إضافة للسلة</button>
          <button class="btn btn-outline btn-lg" onclick="Favorites.toggle({id:'${product.id}',name:'${product.name?.replace(/'/g,"\\'")}',price:${product.price},image:'${images[0]}'})">❤️</button>
        </div>
        <div class="description">
          <h3>الوصف</h3>
          <p>${product.description || 'لا يوجد وصف متاح'}</p>
        </div>
        <div class="share">
          <span>مشاركة:</span>
          <a href="https://wa.me/${SITE_CONFIG.whatsapp}?text=${encodeURIComponent('شاهد هذا المنتج: '+product.name)}" target="_blank">📱</a>
          <a href="https://facebook.com/sharer.php?u=${encodeURIComponent(window.location.href)}" target="_blank">📘</a>
          <a href="#" onclick="navigator.clipboard.writeText(window.location.href);Cart.showToast('تم نسخ الرابط','success')">🔗</a>
        </div>
      </div>`;
    Cart.updateBadge();
  },

  switchImage(el, src) {
    document.querySelectorAll('.thumbs img').forEach(i => i.classList.remove('active'));
    el.classList.add('active');
    document.querySelector('#zoomImg').src = src;
  },

  selectColor(el, color) {
    document.querySelectorAll('.color-option').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    window._selectedColor = color;
  },

  selectSize(el, size) {
    document.querySelectorAll('.size-option').forEach(s => s.classList.remove('active'));
    el.classList.add('active');
    window._selectedSize = size;
  },

  changeQty(delta) {
    const input = document.querySelector('#productQty');
    if (!input) return;
    const val = parseInt(input.value) + delta;
    input.value = Math.max(1, val);
  },

  addToCart(id) {
    const product = { id };
    product.name = document.querySelector('.product-info h1')?.textContent || '';
    const priceText = document.querySelector('.product-info .price')?.textContent || '0';
    product.price = parseFloat(priceText.replace(/[^0-9.]/g, ''));
    product.image = document.querySelector('#zoomImg')?.src || '';
    product.quantity = parseInt(document.querySelector('#productQty')?.value || '1');
    product.color = window._selectedColor || '';
    product.size = window._selectedSize || '';
    Cart.add(product);
  }
};

// ============================================================
// Products Page with Filters
// ============================================================
const ProductsPage = {
  async load() {
    const container = document.querySelector('.products-grid');
    if (!container) return;
    const params = new URLSearchParams(window.location.search);
    const catFilter = params.get('category');
    try {
      let products = await getCollection('products');
      products = products.filter(p => p.available !== false);
      if (catFilter) products = products.filter(p => p.category === catFilter);
      const sort = document.querySelector('#sortFilter')?.value;
      if (sort === 'price-asc') products.sort((a,b) => a.price - b.price);
      else if (sort === 'price-desc') products.sort((a,b) => b.price - a.price);
      else if (sort === 'newest') products.sort((a,b) => (b.createdAt?.toMillis()||0) - (a.createdAt?.toMillis()||0));
      else if (sort === 'rating') products.sort((a,b) => (b.rating||0) - (a.rating||0));
      else if (sort === 'bestseller') products.sort((a,b) => (b.bestseller ? 1 : 0) - (a.bestseller ? 1 : 0));
      container.innerHTML = products.map(p => UI.productCardHTML(p)).join('');
      UI.setupWishlistButtons();
    } catch (e) {
      console.error('Products page error:', e);
      container.innerHTML = '<div style="text-align:center;padding:60px;grid-column:1/-1"><h3>حدث خطأ</h3><p>يرجى المحاولة مرة أخرى</p></div>';
    }
  }
};

// ============================================================
// Checkout
// ============================================================
const Checkout = {
  submit() {
    const cart = Cart.get();
    if (cart.length === 0) { Cart.showToast('سلتك فارغة', 'error'); return; }
    const name = document.querySelector('#checkoutName')?.value?.trim();
    const phone = document.querySelector('#checkoutPhone')?.value?.trim();
    const governorate = document.querySelector('#checkoutGovernorate')?.value?.trim();
    const city = document.querySelector('#checkoutCity')?.value?.trim();
    const address = document.querySelector('#checkoutAddress')?.value?.trim();
    if (!name || !phone || !governorate || !city || !address) {
      Cart.showToast('يرجى ملء جميع الحقول المطلوبة', 'error');
      return;
    }
    const subtotal = Cart.getTotal();
    const shipping = subtotal >= SITE_CONFIG.freeShippingMin ? 0 : SITE_CONFIG.shipping;
    const total = subtotal + shipping;
    let productsList = cart.map(i => `• ${i.name} ×${i.quantity}${i.color ? ` (${i.color})` : ''}${i.size ? ` (${i.size})` : ''}`).join('\n');
    const message = `🛍️ طلب جديد من ${SITE_CONFIG.name}

👤 الاسم: ${name}
📱 الهاتف: ${phone}
📍 المحافظة: ${governorate}
🏙️ المدينة: ${city}
🏠 العنوان: ${address}

📦 المنتجات:
${productsList}

💰 الإجمالي: ${total} ${SITE_CONFIG.currency}
🚚 الشحن: ${shipping === 0 ? 'مجاني' : shipping + ' ' + SITE_CONFIG.currency}`;
    const url = `https://wa.me/${SITE_CONFIG.whatsapp}?text=${encodeURIComponent(message)}`;
    Cart.clear();
    window.open(url, '_blank');
    Cart.showToast('تم إرسال الطلب! سيتم التواصل معك قريباً', 'success');
  }
};

// ============================================================
// Init
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  UI.init();
  Cart.updateBadge();
  ProductDetail.load();
  ProductsPage.load();
  Cart.updateCartUI();

  document.querySelector('#sortFilter')?.addEventListener('change', ProductsPage.load);

  document.querySelector('#checkoutForm')?.addEventListener('submit', e => {
    e.preventDefault();
    Checkout.submit();
  });
});
