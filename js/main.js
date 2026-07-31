const SITE_CONFIG = {
  name: 'Sweet Accessories',
  whatsapp: '+201022222222',
  currency: 'جنيه',
  shipping: 30,
  freeShippingMin: 500,
  shippingByGov: {}
};

async function loadSiteConfig() {
  try {
    const snap = await db.collection('settings').limit(1).get();
    if (!snap.empty) {
      const s = snap.docs[0].data();
      if (s.whatsapp) SITE_CONFIG.whatsapp = s.whatsapp;
      if (s.shipping) {
        if (s.shipping.freeMin) SITE_CONFIG.freeShippingMin = s.shipping.freeMin;
        if (s.shipping.default) SITE_CONFIG.shipping = s.shipping.default;
        if (s.shipping.governorates) SITE_CONFIG.shippingByGov = s.shipping.governorates;
      }
    }
  } catch(e) { console.error('Config load error:', e); }
}
function getShippingCost(governorate) {
  if (!governorate) return SITE_CONFIG.shipping;
  return SITE_CONFIG.shippingByGov[governorate] || SITE_CONFIG.shipping;
}

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
  add(product, el) {
    const items = this.get();
    const existing = items.find(i => i.id === product.id && (i.color || '') === (product.color || '') && (i.size || '') === (product.size || ''));
    if (existing) existing.quantity += product.quantity || 1;
    else items.push({ ...product, quantity: product.quantity || 1 });
    this.save(items);
    if (el) this.flyToCart(el);
    this.showToast('تمت إضافة المنتج للسلة', 'success');
  },

  flyToCart(el) {
    const cartIcon = document.querySelector('.header-actions button[aria-label="السلة"]');
    if (!el || !cartIcon) return;
    const btnRect = el.getBoundingClientRect();
    const cartRect = cartIcon.getBoundingClientRect();
    const clone = el.cloneNode(true);
    clone.style.cssText = `position:fixed;z-index:9999;top:${btnRect.top}px;left:${btnRect.left}px;width:${btnRect.width}px;height:${btnRect.height}px;pointer-events:none;transition:all 0.6s cubic-bezier(0.4,0,0.2,1);border-radius:8px;font-size:12px;padding:8px 16px;background:var(--secondary);color:white;border:none;display:flex;align-items:center;justify-content:center;`;
    document.body.appendChild(clone);
    requestAnimationFrame(() => {
      clone.style.top = `${cartRect.top + cartRect.height/2 - btnRect.height/2}px`;
      clone.style.left = `${cartRect.left + cartRect.width/2 - btnRect.width/2}px`;
      clone.style.width = '30px';
      clone.style.height = '30px';
      clone.style.borderRadius = '50%';
      clone.style.opacity = '0.3';
    });
    setTimeout(() => clone.remove(), 700);
    cartIcon.style.transform = 'scale(1.2)';
    setTimeout(() => cartIcon.style.transform = '', 200);
    const badge = document.querySelector('.cart-badge');
    if (badge) { badge.classList.add('pulse'); setTimeout(() => badge.classList.remove('pulse'), 300); }
  },
  remove(id, color, size) {
    this.save(this.get().filter(i => !(i.id === id && (i.color || '') === (color || '') && (i.size || '') === (size || ''))));
  },
  updateQuantity(id, color, size, qty) {
    const items = this.get();
    const item = items.find(i => i.id === id && (i.color || '') === (color || '') && (i.size || '') === (size || ''));
    if (item) { item.quantity = Math.max(1, qty); this.save(items); }
  },
  coupon: null,
  clear() { this.coupon = null; this.save([]); },
  getTotal() { return this.get().reduce((sum, i) => sum + (i.price * i.quantity), 0); },
  getCount() { return this.get().reduce((sum, i) => sum + i.quantity, 0); },
  getDiscount() {
    if (!this.coupon) return 0;
    const subtotal = this.getTotal();
    if (this.coupon.minOrder && subtotal < this.coupon.minOrder) return 0;
    return this.coupon.type === 'fixed' ? this.coupon.value : Math.round(subtotal * this.coupon.value / 100);
  },
  async applyCoupon() {
    const input = document.getElementById('couponInput');
    if (!input) return;
    const code = input.value.trim().toUpperCase();
    if (!code) { Cart.showToast('أدخل كود الخصم', 'error'); return; }
    try {
      const snap = await db.collection('coupons').where('code', '==', code).get();
      if (snap.empty) { Cart.showToast('كود خصم غير صالح', 'error'); return; }
      const doc = snap.docs[0];
      const c = doc.data();
      if (!c.active) { Cart.showToast('كود الخصم غير نشط', 'error'); return; }
      if (c.expiry && new Date(c.expiry) < new Date()) { Cart.showToast('انتهت صلاحية الكود', 'error'); return; }
      if (c.maxUses && c.uses >= c.maxUses) { Cart.showToast('تم استنفاذ عدد استخدامات الكود', 'error'); return; }
      const subtotal = Cart.getTotal();
      if (c.minOrder && subtotal < c.minOrder) { Cart.showToast(`أقل قيمة للطلب ${c.minOrder} جنيه`, 'error'); return; }
      Cart.coupon = { code: c.code, type: c.type, value: c.value, id: doc.id, uses: c.uses || 0, maxUses: c.maxUses, minOrder: c.minOrder };
      Cart.updateSummary();
      Cart.showToast(`تم تطبيق الخصم!`, 'success');
    } catch(e) { Cart.showToast('خطأ في التحقق من الكود', 'error'); }
  },
  updateBadge() {
    document.querySelectorAll('.cart-badge').forEach(el => {
      el.textContent = this.getCount();
      el.style.display = 'inline';
      el.style.opacity = '1';
    });
  },
  updateCartUI() {
    const container = document.querySelector('.cart-items');
    const summary = document.querySelector('.cart-summary');
    if (!container) return;
    const items = this.get();
    if (items.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="icon">🛒</div><h3>سلتك فارغة</h3><a href="/products.html" class="btn btn-primary">تسوق الآن</a></div>';
      if (summary) summary.style.display = 'none';
      return;
    }
    if (summary) summary.style.display = 'block';
    container.innerHTML = items.map((item, idx) => `
      <div class="cart-item" data-idx="${idx}">
        <img src="${item.image || '/images/placeholder.svg'}" alt="${item.name.replace(/['"]/g, '')}" loading="lazy">
        <div class="info">
          <h4>${item.name.replace(/['"]/g, '')}</h4>
          ${item.color ? `<p style="font-size:0.85rem;color:var(--text-lighter)">اللون: ${item.color.replace(/['"]/g, '')}</p>` : ''}
          ${item.size ? `<p style="font-size:0.85rem;color:var(--text-lighter)">المقاس: ${item.size.replace(/['"]/g, '')}</p>` : ''}
          <div class="price">${item.price} ${SITE_CONFIG.currency}</div>
          <div class="quantity" style="margin-top:8px">
            <div class="controls" style="display:inline-flex;border:1px solid var(--primary);border-radius:8px;overflow:hidden">
              <button class="cart-qty-btn" data-action="dec" data-idx="${idx}" style="width:30px;height:30px">−</button>
              <input type="text" value="${item.quantity}" readonly style="width:36px;height:30px;text-align:center;border:none;border-left:1px solid var(--primary);border-right:1px solid var(--primary);font-weight:700">
              <button class="cart-qty-btn" data-action="inc" data-idx="${idx}" style="width:30px;height:30px">+</button>
            </div>
          </div>
          <span class="remove" data-action="remove" data-idx="${idx}">🗑️ حذف</span>
        </div>
        <div style="font-weight:700;color:var(--secondary);font-size:1.1rem">${item.price * item.quantity} ${SITE_CONFIG.currency}</div>
      </div>
    `).join('');
    this.updateSummary();
  },
  updateSummary(checkout) {
    const totalEl = document.querySelector('.cart-total');
    if (!totalEl) return;
    const subtotal = this.getTotal();
    const discount = this.getDiscount();
    const afterDiscount = subtotal - discount;
    const shippingEl = document.querySelector('.cart-shipping');
    let shipping = 0;
    if (shippingEl) {
      const isCheckout = document.querySelector('#checkoutGovernorate');
      if (!isCheckout) {
        shippingEl.textContent = 'حسب المدينة';
      } else {
        const gov = document.querySelector('#checkoutGovernorate')?.value;
        if (!gov) {
          shippingEl.textContent = 'يرجى تحديد المحافظة';
        } else {
          shipping = subtotal >= SITE_CONFIG.freeShippingMin ? 0 : getShippingCost(gov);
          shippingEl.textContent = shipping === 0 ? 'مجاني' : `${shipping} ${SITE_CONFIG.currency}`;
        }
      }
    }
    document.querySelector('.cart-subtotal').textContent = `${subtotal} ${SITE_CONFIG.currency}`;
    const discEl = document.querySelector('.cart-discount');
    if (discEl) discEl.textContent = discount > 0 ? `-${discount} ${SITE_CONFIG.currency}` : '0';
    totalEl.textContent = `${Math.max(0, afterDiscount + shipping)} ${SITE_CONFIG.currency}`;
  },
  showToast(msg, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = msg;
    document.body.appendChild(toast);
    setTimeout(() => { toast.classList.add('removing'); setTimeout(() => toast.remove(), 400); }, 3000);
  },
  setupCartEvents() {
    document.querySelector('.cart-items')?.addEventListener('click', e => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const idx = parseInt(btn.dataset.idx);
      const items = Cart.get();
      if (isNaN(idx) || idx >= items.length) return;
      const item = items[idx];
      const action = btn.dataset.action;
      if (action === 'inc') {
        item.quantity = (item.quantity || 1) + 1;
        Cart.save(items);
      } else if (action === 'dec') {
        item.quantity = Math.max(1, (item.quantity || 1) - 1);
        Cart.save(items);
      } else if (action === 'remove') {
        items.splice(idx, 1);
        Cart.save(items);
      }
    });
  }
};

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
    if (idx > -1) { items.splice(idx, 1); Cart.showToast('تمت إزالة المنتج من المفضلة', 'info'); }
    else { items.push(product); Cart.showToast('تمت إضافة المنتج إلى المفضلة', 'success'); }
    this.save(items);
  },
  isFavorite(id) { return this.get().some(i => i.id === id); },
  updateUI() {
    document.querySelectorAll('.wishlist-btn').forEach(btn => btn.classList.toggle('active', this.isFavorite(btn.dataset.id)));
    const container = document.querySelector('.favorites-grid');
    if (!container) return;
    const items = this.get();
    if (items.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="icon">💔</div><h3>قائمة المفضلة فارغة</h3><a href="/products.html" class="btn btn-primary">تصفح المنتجات</a></div>';
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
            <img src="${p.images?.[0] || p.image || '/images/placeholder.svg'}" alt="${p.name}">
          <div class="info">
            <h4>${p.name}</h4>
            <div class="price">${p.price} ${SITE_CONFIG.currency}</div>
          </div>
        </a>
      `).join('');
    } catch (e) { console.error('Search error:', e); }
  }
};

const UI = {
  init() {
    this.headerScroll();
    this.mobileMenu();
    this.setupSearch();
    this.renderCategories();
    this.loadMobileMenuCategories();
    this.updateBadgeAlways();
  },

  updateBadgeAlways() {
    const badge = document.querySelector('.cart-badge');
    if (badge) {
      const items = Cart.get();
      badge.textContent = items.reduce((s, i) => s + i.quantity, 0);
      badge.style.display = 'inline';
      badge.style.opacity = '1';
    }
  },

  loadMobileMenuCategories() {
    const container = document.getElementById('mobileMenuCategories');
    if (!container) return;
    try {
      db.collection('categories').orderBy('name').get().then(snap => {
        container.innerHTML = snap.docs.map(d => {
          const c = d.data();
          return `<a href="/products.html?category=${encodeURIComponent(d.id)}" style="font-size:0.9rem;padding:8px 25px">${c.image ? `<img src="${c.image}" style="width:20px;height:20px;border-radius:50%;vertical-align:middle;margin-left:6px;object-fit:cover;">` : ''}${c.name}</a>`;
        }).join('');
      });
    } catch(e) {}
  },

  headerScroll() {
    const header = document.querySelector('.header');
    if (!header) return;
    window.addEventListener('scroll', () => header.classList.toggle('scrolled', window.scrollY > 50));
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
    menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      btn.classList.remove('active');
      menu.classList.remove('open');
      document.body.style.overflow = '';
    }));
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

  async renderCategories() {
    const grid = document.querySelector('.categories-grid');
    if (!grid) return;
    try {
      const categories = await getCollection('categories');
      const cats = categories.length > 0 ? categories : [
        { id: 'سلاسل', name: 'سلاسل', icon: '📿' },
        { id: 'اسورة', name: 'اسورة', icon: '💍' },
        { id: 'انسيالات', name: 'انسيالات', icon: '✨' },
        { id: 'خواتم', name: 'خواتم', icon: '💍' },
        { id: 'اطقم', name: 'اطقم', icon: '👑' },
        { id: 'طرح', name: 'طرح', icon: '🧣' },
        { id: 'ساعات', name: 'ساعات', icon: '⌚' }
      ];
      grid.innerHTML = cats.map(c => `
        <a href="/products.html?category=${c.id}" class="category-card">
          ${c.image ? `<img src="${c.image}" alt="${c.name}" loading="lazy">` : `<div class="icon">${c.icon || '📦'}</div>`}
          <span>${c.name}</span>
        </a>
      `).join('');
    } catch (e) { console.error('Categories error:', e); }
  },

  productCardHTML(p) {
    const badges = [];
    if (p.discount) badges.push(`<span class="badge badge-sale">-${p.discount}%</span>`);
    if (p.bestseller) badges.push('<span class="badge badge-bestseller">الأكثر مبيعًا</span>');
    const outOfStock = p.stock !== undefined && p.stock === 0;
    if (outOfStock) badges.push('<span class="badge badge-lowstock">نفذ من المخزون</span>');
    return `
      <div class="product-card">
        <div class="image-wrap">
          <a href="/product.html?id=${p.id}">
          <img src="${p.images?.[0] || p.image || '/images/placeholder.svg'}" alt="${p.name}">
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
        </div>
        <div style="padding:0 20px 20px">
          ${outOfStock ? '<button class="add-cart" style="background:#eee;color:#999;cursor:not-allowed" disabled>نفذ من المخزون</button>' : `<button class="add-cart" onclick="Cart.add({id:&quot;${p.id}&quot;,name:&quot;${p.name?.replace(/"/g,"\\\"")}&quot;,price:${p.price},image:&quot;${p.images?.[0]||''}&quot;},this)">🛒 إضافة للسلة</button>`}
        </div>
      </div>`;
  },

  setupWishlistButtons() {
    document.querySelectorAll('.wishlist-btn').forEach(btn => btn.classList.toggle('active', Favorites.isFavorite(btn.dataset.id)));
  }
};

const ProductDetail = {
  currentImageIndex: 0,
  images: [],
  slideInterval: null,

  async load() {
    const container = document.querySelector('.product-detail');
    if (!container) return;
    const id = new URLSearchParams(window.location.search).get('id');
    if (!id) { container.innerHTML = '<div style="text-align:center;padding:60px"><h2>المنتج غير موجود</h2><a href="/products.html" class="btn btn-primary">عرض المنتجات</a></div>'; return; }
    try {
      const product = await getDocument('products', id);
      if (!product) { container.innerHTML = '<div style="text-align:center;padding:60px"><h2>المنتج غير موجود</h2><a href="/products.html" class="btn btn-primary">عرض المنتجات</a></div>'; return; }
      this.render(product);
    } catch (e) {
      console.error('Product detail error:', e);
      container.innerHTML = '<div style="text-align:center;padding:60px"><h2>حدث خطأ</h2><p>يرجى المحاولة مرة أخرى</p></div>';
    }
  },

  render(product) {
    const container = document.querySelector('.product-detail .container');
    this.images = product.images && product.images.length > 0 ? product.images : ['/images/placeholder.svg'];
    this.currentImageIndex = 0;
    const discount = product.oldPrice ? Math.round((1 - product.price / product.oldPrice) * 100) : 0;
    const colors = product.colors && product.colors.length ? product.colors : null;
    const sizes = product.sizes && product.sizes.length ? product.sizes : null;
    const outOfStock = product.stock !== undefined && product.stock === 0;
    const hasMultiple = this.images.length > 1;
    document.title = `${product.name} - Sweet Accessories`;
    const desc = `${product.name} بسعر ${product.price} ${SITE_CONFIG.currency} من Sweet Accessories. ${product.desc || ''}`;
    document.querySelector('meta[name="description"]')?.setAttribute('content', desc);
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', `${product.name} - Sweet Accessories`);
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', desc);
    document.querySelector('meta[property="og:image"]')?.setAttribute('content', this.images[0]);
    document.querySelector('meta[name="twitter:image"]')?.setAttribute('content', this.images[0]);
    container.innerHTML = `
      <div class="product-gallery">
        <div class="gallery-slider" ${hasMultiple ? '' : ''}>
          <div class="gallery-track" id="galleryTrack">
            ${this.images.map(img => `<div class="gallery-slide"><img src="${img}" alt="${product.name}" loading="lazy"></div>`).join('')}
          </div>
          ${hasMultiple ? `
          <button class="gallery-btn gallery-prev" onclick="ProductDetail.prevImage()">❮</button>
          <button class="gallery-btn gallery-next" onclick="ProductDetail.nextImage()">❯</button>
          <div class="gallery-dots">${this.images.map((_, i) => `<span class="gallery-dot${i===0?' active':''}" onclick="ProductDetail.goToImage(${i})"></span>`).join('')}</div>
          ` : ''}
        </div>
        ${this.images.length > 1 ? `<div class="gallery-thumbs">${this.images.map((img, i) => `<img src="${img}" alt="" class="${i===0?'active':''}" onclick="ProductDetail.goToImage(${i})" loading="lazy">`).join('')}</div>` : ''}
      </div>
      <div class="product-info">
        <div class="category">${product.categoryName || product.category || ''}</div>
        <h1>${product.name}</h1>
        <div class="price-row">
          <span class="price">${product.price} ${SITE_CONFIG.currency}</span>
          ${product.oldPrice ? `<span class="old-price">${product.oldPrice} ${SITE_CONFIG.currency}</span><span class="discount">-${discount}%</span>` : ''}
        </div>
        <div class="meta">
          <div class="item">📦 الحالة: ${outOfStock ? '<span style="color:#b91c1c;font-weight:700;">غير متوفر</span>' : '<span style="color:#047857;font-weight:700;">متوفر</span>'}</div>
        </div>
        ${colors ? `<div class="options"><label>اللون:</label><div class="color-options">${colors.map((c, i) => `<span class="color-swatch${i===0?' active':''}" style="background:${c.hex||'#ccc'}" data-color="${c.name||c}" onclick="ProductDetail.selectColor(this,'${c.name||c}')" title="${c.name||c}"></span>`).join('')}</div></div>` : ''}
        ${sizes ? `<div class="options"><label>المقاس:</label><div class="size-options">${sizes.map((s, i) => `<span class="size-opt${i===0?' active':''}" onclick="ProductDetail.selectSize(this,'${s}')">${s}</span>`).join('')}</div></div>` : ''}
        <div class="options"><label>الكمية:</label><div class="qty-selector"><button onclick="ProductDetail.qty(-1)">−</button><span id="productQty">1</span><button onclick="ProductDetail.qty(1)">+</button></div></div>
        <div class="actions">
          <button class="btn btn-primary btn-lg" onclick="ProductDetail.addToCart('${product.id}')" id="addToCartBtn" ${outOfStock ? 'disabled style="background:#ccc;cursor:not-allowed"' : ''}>${outOfStock ? 'نفذ من المخزون' : '🛒 إضافة للسلة'}</button>
        </div>
        <div class="description">
          <h3>الوصف</h3>
          <p>${product.desc || 'لا يوجد وصف'}</p>
        </div>
        <div class="review-submit">
          <h3>📝 أضف تقييمك</h3>
          <form onsubmit="ProductDetail.submitReview(event,'${product.id}')">
            <div class="form-row">
              <div class="form-group"><input type="text" id="revNameInput" placeholder="اسمك" required></div>
              <div class="form-group"><input type="email" id="revEmailInput" placeholder="بريدك الإلكتروني (اختياري)"></div>
            </div>
            <div class="form-group star-picker" id="starPicker">
              <span onclick="ProductDetail.setRating(1)">☆</span><span onclick="ProductDetail.setRating(2)">☆</span><span onclick="ProductDetail.setRating(3)">☆</span><span onclick="ProductDetail.setRating(4)">☆</span><span onclick="ProductDetail.setRating(5)">☆</span>
            </div>
            <div class="form-group"><textarea id="revCommentInput" rows="3" placeholder="اكتب رأيك عن المنتج" required></textarea></div>
            <button type="submit" class="btn btn-primary">إرسال التقييم</button>
          </form>
        </div>
      </div>`;
    Cart.updateBadge();
    ProductDetail.reviewRating = 0;
    if (hasMultiple) this.startAutoSlide();
    const similarGrid = document.querySelector('.products-grid[data-type="similar"]');
    if (similarGrid && product.category) {
      similarGrid.dataset.category = product.category;
      ProductsPage.load();
    }
  },

  goToImage(index) {
    const track = document.getElementById('galleryTrack');
    if (!track) return;
    this.currentImageIndex = Math.max(0, Math.min(index, this.images.length - 1));
    track.style.transform = `translateX(-${this.currentImageIndex * 100}%)`;
    document.querySelectorAll('.gallery-dot').forEach((d, i) => d.classList.toggle('active', i === this.currentImageIndex));
    document.querySelectorAll('.gallery-thumbs img').forEach((t, i) => t.classList.toggle('active', i === this.currentImageIndex));
    this.restartAutoSlide();
  },

  nextImage() { this.goToImage(this.currentImageIndex + 1); },
  prevImage() { this.goToImage(this.currentImageIndex - 1); },

  startAutoSlide() {
    this.stopAutoSlide();
    this.slideInterval = setInterval(() => {
      const next = (this.currentImageIndex + 1) % this.images.length;
      this.goToImage(next);
    }, 4000);
  },

  stopAutoSlide() {
    if (this.slideInterval) { clearInterval(this.slideInterval); this.slideInterval = null; }
  },

  restartAutoSlide() {
    this.stopAutoSlide();
    this.startAutoSlide();
  },

  reviewRating: 0,
  selectedColor: null,
  selectedSize: null,

  selectColor(el, name) {
    document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
    el.classList.add('active');
    this.selectedColor = name;
  },
  selectSize(el, size) {
    document.querySelectorAll('.size-opt').forEach(s => s.classList.remove('active'));
    el.classList.add('active');
    this.selectedSize = size;
  },
  qty(delta) {
    const el = document.getElementById('productQty');
    if (!el) return;
    const val = parseInt(el.textContent) || 1;
    el.textContent = Math.max(1, val + delta);
  },
  setRating(r) {
    this.reviewRating = r;
    document.querySelectorAll('#starPicker span').forEach((s, i) => s.textContent = i < r ? '★' : '☆');
  },
  async submitReview(e, productId) {
    e.preventDefault();
    const name = document.getElementById('revNameInput')?.value;
    const email = document.getElementById('revEmailInput')?.value;
    const comment = document.getElementById('revCommentInput')?.value;
    const rating = this.reviewRating;
    if (!name || !comment || !rating) { Cart.showToast('الرجاء إكمال جميع الحقول', 'error'); return; }
    try {
      await db.collection('reviews').add({
        name, email, comment, rating, productId,
        approved: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      Cart.showToast('شكراً! تم إرسال تقييمك وسيتم نشره بعد المراجعة', 'success');
      e.target.reset();
      this.reviewRating = 0;
      document.querySelectorAll('#starPicker span').forEach(s => s.textContent = '☆');
    } catch(err) { Cart.showToast('حدث خطأ، حاول مرة أخرى', 'error'); }
  },

  addToCart(id) {
    const product = { id };
    product.name = document.querySelector('.product-info h1')?.textContent || '';
    const priceText = document.querySelector('.product-info .price')?.textContent || '0';
    product.price = parseFloat(priceText.replace(/[^0-9.]/g, ''));
    product.image = document.querySelector('#zoomImg')?.src || '';
    product.quantity = parseInt(document.getElementById('productQty')?.textContent || '1');
    const activeColor = document.querySelector('.color-swatch.active');
    if (activeColor) product.color = activeColor.dataset.color || activeColor.title;
    const activeSize = document.querySelector('.size-opt.active');
    if (activeSize) product.size = activeSize.textContent;
    Cart.add(product, document.getElementById('addToCartBtn'));
  }
};

const ProductsPage = {
  async load(container) {
    const containers = container ? [container] : document.querySelectorAll('.products-grid');
    if (!containers.length) return;
    const catFilter = new URLSearchParams(window.location.search).get('category');
    containers.forEach(c => { if (!c.dataset._loading) { c.innerHTML = '<div class="loading-spinner" style="text-align:center;padding:40px;grid-column:1/-1"><div class="spinner"></div><p style="color:#999;margin-top:10px">جاري تحميل المنتجات...</p></div>'; c.dataset._loading = '1'; } });
    try {
      let products = await getCollection('products');
      products = products.filter(p => p.available !== false);
      containers.forEach(c => {
        delete c.dataset._loading;
        const type = c.dataset.type;
        const categoryId = c.dataset.category;
        let filtered = [...products];
        if (type === 'featured') filtered = filtered.filter(p => p.featured).slice(0, 8);
        else if (type === 'bestseller') filtered = filtered.filter(p => p.bestseller).slice(0, 8);
        else if (type === 'similar' && categoryId) filtered = filtered.filter(p => p.category === categoryId || p.categoryName === categoryId).slice(0, 8);
        if (catFilter) filtered = filtered.filter(p => p.category === catFilter || p.categoryName === catFilter);
        const sort = document.querySelector('#sortFilter')?.value;
        if (sort === 'price-asc') filtered.sort((a,b) => a.price - b.price);
        else if (sort === 'price-desc') filtered.sort((a,b) => b.price - a.price);
        else if (sort === 'newest') filtered.sort((a,b) => ((b.createdAt?.toMillis?.()||b.createdAt?.seconds*1000||0)) - ((a.createdAt?.toMillis?.()||a.createdAt?.seconds*1000||0)));
        c.innerHTML = filtered.length ? filtered.map(p => UI.productCardHTML(p)).join('') : '<div style="text-align:center;padding:40px;grid-column:1/-1;color:#999;">لا توجد منتجات</div>';
      });
      UI.setupWishlistButtons();
    } catch (e) {
      console.error('Products page error:', e);
      containers.forEach(c => { delete c.dataset._loading; c.innerHTML = '<div style="text-align:center;padding:40px;grid-column:1/-1"><p style="color:#b91c1c;font-weight:600;margin-bottom:15px;">❌ حدث خطأ في تحميل المنتجات</p><p style="color:#999;margin-bottom:15px;font-size:0.85rem">' + e.message + '</p><button class="btn btn-primary" onclick="ProductsPage.load()">🔄 إعادة المحاولة</button></div>'; });
    }
  }
};

const Checkout = {
  async submit() {
    const cart = Cart.get();
    if (cart.length === 0) { Cart.showToast('سلتك فارغة', 'error'); return; }
    const name = document.querySelector('#checkoutName')?.value?.trim();
    const phone = document.querySelector('#checkoutPhone')?.value?.trim();
    const governorate = document.querySelector('#checkoutGovernorate')?.value?.trim();
    const city = document.querySelector('#checkoutCity')?.value?.trim();
    const address = document.querySelector('#checkoutAddress')?.value?.trim();
    const notes = document.querySelector('#checkoutNotes')?.value?.trim();
    if (!name || !phone || !governorate || !city || !address) {
      Cart.showToast('يرجى ملء جميع الحقول المطلوبة', 'error');
      return;
    }
    const subtotal = Cart.getTotal();
    const discount = Cart.getDiscount();
    const shippingCost = subtotal >= SITE_CONFIG.freeShippingMin ? 0 : getShippingCost(governorate);
    const afterDiscount = subtotal - discount;
    const total = Math.max(0, afterDiscount + shippingCost);
    let orderId;
    const orderData = {
      customer: { name, phone, governorate, city, address, notes },
      items: cart.map(i => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity, color: i.color || '', size: i.size || '', image: i.image || '' })),
      subtotal,
      discount,
      shipping: shippingCost,
      total,
      status: 'جديد',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    if (Cart.coupon) orderData.couponCode = Cart.coupon.code;
    try {
      const ref = await db.collection('orders').add(orderData);
      orderId = ref.id;
      for (const item of cart) {
        const prodSnap = await db.collection('products').doc(item.id).get();
        if (prodSnap.exists) {
          const prod = prodSnap.data();
          if (prod.stock !== undefined) {
            await db.collection('products').doc(item.id).update({ stock: Math.max(0, prod.stock - item.quantity) });
          }
        }
      }
      if (Cart.coupon && Cart.coupon.id) {
        await db.collection('coupons').doc(Cart.coupon.id).update({ uses: (Cart.coupon.uses || 0) + 1 });
      }
    } catch(e) { console.error('Order save error:', e); }
    let productsList = cart.map(i => `• ${i.name} ×${i.quantity}${i.color ? ` (${i.color})` : ''}${i.size ? ` (${i.size})` : ''}`).join('\n');
    const message = `🛍️ طلب جديد من ${SITE_CONFIG.name}\n\n👤 الاسم: ${name}\n📱 الهاتف: ${phone}\n📍 المحافظة: ${governorate}\n🏙️ المدينة: ${city}\n🏠 العنوان: ${address}\n${notes ? `📝 ملاحظات: ${notes}\n` : ''}\n📦 المنتجات:\n${productsList}\n${discount > 0 ? `\n🏷️ الخصم: -${discount} ${SITE_CONFIG.currency}\n` : ''}\n💰 الإجمالي: ${total} ${SITE_CONFIG.currency}\n🚚 الشحن: ${shippingCost === 0 ? 'مجاني' : shippingCost + ' ' + SITE_CONFIG.currency}`;
    window.open(`https://wa.me/${SITE_CONFIG.whatsapp}?text=${encodeURIComponent(message)}`, '_blank');
    Cart.clear();
    window.location.href = `/order-confirmation.html?id=${orderId}`;
  }
};

const Reviews = {
  current: 0,
  interval: null,
  async load() {
    const track = document.getElementById('reviewsTrack');
    const dots = document.getElementById('reviewsDots');
    if (!track) return;
    try {
      const snap = await db.collection('reviews').where('approved', '==', true).orderBy('createdAt', 'desc').limit(10).get();
      if (snap.empty) { track.innerHTML = ''; return; }
      const items = snap.docs.map(d => d.data());
      track.innerHTML = items.map(r => {
        const stars = Array(5).fill('').map((_, i) => `<i class="${i < r.rating ? 'fas' : 'far'} fa-star"></i>`).join('');
        const img = r.images?.[0] || r.image;
        const avatar = img ? `<img src="${img}" class="review-img">` : `<div class="review-img-placeholder">${r.name?.[0] || '?'}</div>`;
        const extraImgs = r.images && r.images.length > 1 ? `<div class="review-images">${r.images.slice(1, 4).map(u => `<img src="${u}">`).join('')}</div>` : '';
        return `<div class="review-slide">
          <div class="review-card">
            ${avatar}
            <div class="review-stars">${stars}</div>
            <p class="review-text">"${r.comment}"</p>
            <div class="review-name">${r.name}</div>
            ${extraImgs}
          </div>
        </div>`;
      }).join('');
      dots.innerHTML = items.map((_, i) => `<button class="dot${i === 0 ? ' active' : ''}" onclick="Reviews.goTo(${i})"></button>`).join('');
      this.startAuto();
    } catch(e) { console.error('Reviews error:', e); }
  },
  goTo(index) {
    const track = document.getElementById('reviewsTrack');
    const dots = document.querySelectorAll('.reviews-dots .dot');
    if (!track || !dots.length) return;
    this.current = Math.max(0, Math.min(index, dots.length - 1));
    track.style.transform = `translateX(-${this.current * 100}%)`;
    dots.forEach((d, i) => d.classList.toggle('active', i === this.current));
  },
  next() { this.goTo(this.current + 1); },
  startAuto() {
    clearInterval(this.interval);
    const dots = document.querySelectorAll('.reviews-dots .dot');
    if (dots.length <= 1) return;
    this.interval = setInterval(() => {
      this.current = (this.current + 1) % dots.length;
      this.goTo(this.current);
    }, 5000);
  }
};

const Banners = {
  current: 0,
  interval: null,
  async load() {
    const track = document.getElementById('heroTrack');
    const dots = document.getElementById('heroDots');
    if (!track) return;
    try {
      const snap = await db.collection('banners').where('active', '==', true).orderBy('createdAt', 'desc').get();
      if (snap.empty) {
        document.getElementById('heroSlider').style.display = 'none';
        return;
      }
      const items = snap.docs.map(d => d.data());
      track.innerHTML = items.map(b => `
        <div class="hero-slide">
          <img src="${b.image || '/images/placeholder.svg'}" alt="${b.title}">
          <div class="hero-overlay"></div>
          <div class="hero-content">
            <h2>${b.title}</h2>
            ${b.text ? `<p>${b.text}</p>` : ''}
            ${b.link ? `<a href="${b.link}">تسوق الآن</a>` : ''}
          </div>
        </div>
      `).join('');
      dots.innerHTML = items.map((_, i) => `<button class="dot${i === 0 ? ' active' : ''}" onclick="Banners.goTo(${i})"></button>`).join('');
      this.startAuto();
    } catch(e) { console.error('Banners error:', e); }
  },
  goTo(index) {
    const track = document.getElementById('heroTrack');
    const dots = document.querySelectorAll('.hero-dots .dot');
    if (!track || !dots.length) return;
    this.current = Math.max(0, Math.min(index, dots.length - 1));
    track.style.transform = `translateX(-${this.current * 100}%)`;
    dots.forEach((d, i) => d.classList.toggle('active', i === this.current));
  },
  next() { this.goTo(this.current + 1); },
  prev() { this.goTo(this.current - 1); },
  startAuto() {
    clearInterval(this.interval);
    const dots = document.querySelectorAll('.hero-dots .dot');
    if (dots.length <= 1) { document.querySelector('.hero-arrow-prev').style.display = 'none'; document.querySelector('.hero-arrow-next').style.display = 'none'; return; }
    this.interval = setInterval(() => {
      this.current = (this.current + 1) % dots.length;
      this.goTo(this.current);
    }, 5000);
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  UI.init();
  Cart.updateBadge();
  ProductDetail.load();
  ProductsPage.load();
  Cart.updateCartUI();
  Cart.setupCartEvents();
  Reviews.load();
  Banners.load();
  await loadSiteConfig();

  document.querySelectorAll('a[href*="wa.me/"]').forEach(a => {
    const num = SITE_CONFIG.whatsapp.replace(/[^0-9]/g, '');
    if (num) a.href = `https://wa.me/${num}`;
  });

  const floatBtn = document.querySelector('.whatsapp-float');
  if (floatBtn && SITE_CONFIG.whatsapp) floatBtn.title = SITE_CONFIG.whatsapp;

  document.querySelector('#sortFilter')?.addEventListener('change', ProductsPage.load);

  document.querySelector('#checkoutGovernorate')?.addEventListener('change', () => Cart.updateSummary(true));

  document.querySelector('#checkoutForm')?.addEventListener('submit', e => {
    e.preventDefault();
    Checkout.submit();
  });
});
