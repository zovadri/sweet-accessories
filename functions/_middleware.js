const PROJECT = 'sweet-accessories-158cb';
const API_KEY = 'AIzaSyA89LR9cPidk96OuoyWNmo2ey6-_c1pqVE';
const SITE = 'https://sweet-accessories.pages.dev';

async function fetchDoc(collection, id) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${collection}/${id}?key=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  return { id, ...parseFields(data.fields) };
}

function parseFields(fields) {
  const obj = {};
  for (const [key, val] of Object.entries(fields)) {
    if (val.stringValue !== undefined) obj[key] = val.stringValue;
    else if (val.integerValue !== undefined) obj[key] = Number(val.integerValue);
    else if (val.doubleValue !== undefined) obj[key] = Number(val.doubleValue);
    else if (val.booleanValue !== undefined) obj[key] = val.booleanValue;
    else if (val.arrayValue) obj[key] = val.arrayValue.values?.map(v => v.stringValue || '');
    else if (val.timestampValue) obj[key] = val.timestampValue;
    else obj[key] = val.mapValue ? parseFields(val.mapValue.fields) : null;
  }
  return obj;
}

function isBot(request) {
  const ua = request.headers.get('User-Agent') || '';
  return /Googlebot|Bingbot|Slurp|DuckDuckBot|Baiduspider|YandexBot|facebot|facebookexternalhit|Twitterbot|LinkedInBot|Pinterestbot|WhatsApp/i.test(ua);
}

function html(title, desc, image, body) {
  return `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><meta name="description" content="${desc}"><meta property="og:title" content="${title}"><meta property="og:description" content="${desc}"><meta property="og:image" content="${image}"><meta property="og:type" content="website"><meta property="og:locale" content="ar_EG"><meta name="twitter:card" content="summary_large_image"><link rel="canonical" href="${SITE}"><link rel="icon" type="image/svg+xml" href="/images/favicon.svg"><link rel="stylesheet" href="/css/style.min.css"><style>body{font-family:'Cairo',sans-serif;background:#fff;color:#2E2E2E;direction:rtl;padding:20px;max-width:1200px;margin:auto}h1{color:#8B0D32}.product{display:flex;gap:30px;flex-wrap:wrap}.product img{max-width:400px;border-radius:12px}.info{flex:1}.price{font-size:24px;color:#8B0D32;font-weight:700}.btn{display:inline-block;background:#8B0D32;color:#fff;padding:12px 30px;border-radius:8px;text-decoration:none;margin-top:20px}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:20px}.card{border-radius:12px;overflow:hidden;border:1px solid #F8D9E5;background:#fff}.card img{width:100%;height:200px;object-fit:cover}.card-body{padding:15px}.card-body h3{margin:0 0 5px;font-size:16px;color:#8B0D32}.card-body .p{color:#8B0D32;font-weight:700}</style></head><body>${body}</body></html>`;
}

const productHTML = (p) => html(
  `${p.name} - Sweet Accessories`,
  `${p.name} بسعر ${p.price} جنيه من Sweet Accessories. ${p.desc || ''}`,
  p.images?.[0] || p.image || `${SITE}/images/logo.jpeg`,
  `<a href="/" style="color:#8B0D32;font-weight:700;text-decoration:none">← Sweet Accessories</a>
   <div class="product">
     <img src="${p.images?.[0] || p.image || '/images/placeholder.svg'}" alt="${p.name}">
     <div class="info">
       <h1>${p.name}</h1>
       <div class="price">${p.price} جنيه</div>
       ${p.oldPrice ? `<div style="text-decoration:line-through;color:#999">${p.oldPrice} جنيه</div>` : ''}
       <p style="margin:20px 0;line-height:1.8">${p.desc || 'منتجاتنا عالية الجودة من Sweet Accessories'}</p>
       <a href="${SITE}/product.html?id=${p.id}" class="btn">عرض المنتج</a>
     </div>
   </div>`
);

const productsHTML = (products) => html(
  'منتجات Sweet Accessories - اكسسوارات نسائية فاخرة',
  'تصفحي تشكيلتنا الواسعة من الإكسسوارات النسائية الفاخرة: سلاسل، خواتم، أساور، أطقم، وأكثر.',
  `${SITE}/images/logo.jpeg`,
  `<h1 style="margin-bottom:10px">🛍️ منتجات Sweet Accessories</h1>
   <p style="color:#666;margin-bottom:30px">تشكيلتنا الواسعة من الإكسسوارات النسائية الفاخرة</p>
   <div class="grid">
     ${products.map(p => `
       <div class="card">
         <a href="${SITE}/product.html?id=${p.id}">
           <img src="${p.images?.[0] || p.image || '/images/placeholder.svg'}" alt="${p.name}">
           <div class="card-body">
             <h3>${p.name}</h3>
             <div class="p">${p.price} جنيه</div>
           </div>
         </a>
       </div>
     `).join('')}
   </div>`
);

export const onRequest = async (context) => {
  const { request, next } = context;
  const url = new URL(request.url);

  if (!isBot(request)) return next();

  // Product detail page
  if (url.pathname === '/product.html' && url.searchParams.has('id')) {
    const product = await fetchDoc('products', url.searchParams.get('id'));
    if (product) {
      return new Response(productHTML(product), { headers: { 'Content-Type': 'text/html;charset=utf-8' } });
    }
  }

  // Products listing page
  if (url.pathname === '/products.html') {
    const res = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/products?key=${API_KEY}`);
    if (res.ok) {
      const data = await res.json();
      const products = (data.documents || []).map(d => ({ id: d.name.split('/').pop(), ...parseFields(d.fields) }));
      return new Response(productsHTML(products.filter(p => p.available !== false)), { headers: { 'Content-Type': 'text/html;charset=utf-8' } });
    }
  }

  return next();
};
