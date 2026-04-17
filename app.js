/* ============================================
   WARDA POS v2 - Application Logic
   Role-based: Admin, Kasir, Konsumen
   ============================================ */

// ============= DATA STORE =============
let products = JSON.parse(localStorage.getItem('warda_products') || '[]');
let trx = JSON.parse(localStorage.getItem('warda_trx') || '[]');
let customers = JSON.parse(localStorage.getItem('warda_customers') || '[]');

let kasirCart = [];       // Kasir's cart
let konsumenCart = [];    // Konsumen's cart
let currentUser = null;
let selectedRole = 'admin';
let activeCategory = 'all';

// Default user accounts
const accounts = [
  { username: 'admin', password: 'admin123', role: 'admin', name: 'Administrator' },
  { username: 'kasir', password: 'kasir123', role: 'kasir', name: 'Kasir 1' },
  { username: 'toko', password: 'toko123', role: 'konsumen', name: 'Pelanggan' }
];

// Navigation menus per role
const roleMenus = {
  admin: [
    { id: 'adminDashboard', icon: '📊', label: 'Dashboard' }
  ],
  kasir: [
    { id: 'kasirProduk', icon: '📦', label: 'Kelola Produk' },
    { id: 'kasirPOS', icon: '🛒', label: 'Transaksi' },
    { id: 'kasirHistory', icon: '🧾', label: 'Riwayat' }
  ],
  konsumen: [
    { id: 'konsumenShop', icon: '🛍️', label: 'Belanja' },
    { id: 'konsumenReceipts', icon: '🧾', label: 'Bukti Transaksi' }
  ]
};

// ============= SAVE =============
function save() {
  localStorage.setItem('warda_products', JSON.stringify(products));
  localStorage.setItem('warda_trx', JSON.stringify(trx));
  localStorage.setItem('warda_customers', JSON.stringify(customers));
}

// ============= TOAST =============
function showToast(message, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || '📢'}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}

// ============= SPLASH SCREEN =============
function initSplash() {
  const particleContainer = document.getElementById('splashParticles');
  if (particleContainer) {
    for (let i = 0; i < 20; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      p.style.left = Math.random() * 100 + '%';
      p.style.top = (50 + Math.random() * 50) + '%';
      p.style.width = (2 + Math.random() * 6) + 'px';
      p.style.height = p.style.width;
      p.style.animationDelay = Math.random() * 3 + 's';
      p.style.animationDuration = (2 + Math.random() * 2) + 's';
      const colors = ['#38bdf8', '#6366f1', '#a855f7', '#ec4899', '#34d399'];
      p.style.background = colors[Math.floor(Math.random() * colors.length)];
      particleContainer.appendChild(p);
    }
  }

  setTimeout(() => {
    const splash = document.getElementById('splashScreen');
    splash.classList.add('fade-out');
    setTimeout(() => {
      splash.style.display = 'none';
      document.getElementById('loginScreen').style.display = 'flex';
    }, 800);
  }, 3500);
}

// ============= LOGIN =============
function selectRole(role, btn) {
  selectedRole = role;
  document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  const map = {
    admin: ['admin', 'admin123'],
    kasir: ['kasir', 'kasir123'],
    konsumen: ['toko', 'toko123']
  };
  document.getElementById('loginUsername').value = map[role][0];
  document.getElementById('loginPassword').value = map[role][1];
}

function doLogin() {
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value.trim();
  const errorEl = document.getElementById('loginError');

  if (!username || !password) {
    errorEl.textContent = '⚠️ Masukkan username dan password!';
    return;
  }

  const account = accounts.find(a =>
    a.username === username && a.password === password && a.role === selectedRole
  );

  if (!account) {
    errorEl.textContent = '❌ Username/password salah atau role tidak sesuai!';
    shakeLogin();
    return;
  }

  currentUser = { ...account };
  errorEl.textContent = '';

  const loginScreen = document.getElementById('loginScreen');
  loginScreen.style.opacity = '0';
  loginScreen.style.transform = 'scale(1.05)';
  loginScreen.style.transition = 'all 0.5s ease';

  setTimeout(() => {
    loginScreen.style.display = 'none';
    initApp();
  }, 500);
}

function shakeLogin() {
  const card = document.querySelector('.login-card');
  card.style.animation = 'none';
  setTimeout(() => { card.style.animation = 'loginShake 0.5s ease'; }, 10);
}

const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
  @keyframes loginShake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-10px); }
    40% { transform: translateX(10px); }
    60% { transform: translateX(-6px); }
    80% { transform: translateX(6px); }
  }
`;
document.head.appendChild(shakeStyle);

function doLogout() {
  currentUser = null;
  kasirCart = [];
  konsumenCart = [];
  activeCategory = 'all';

  const app = document.getElementById('mainApp');
  app.style.display = 'none';

  const loginScreen = document.getElementById('loginScreen');
  loginScreen.style.display = 'flex';
  loginScreen.style.opacity = '1';
  loginScreen.style.transform = 'scale(1)';

  document.getElementById('loginUsername').value = '';
  document.getElementById('loginPassword').value = '';
  document.getElementById('loginError').textContent = '';

  // Reset views
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
}

// ============= INIT APP (after login) =============
function initApp() {
  const app = document.getElementById('mainApp');
  app.style.display = 'flex';
  document.body.style.overflow = 'hidden';

  // Update sidebar user info
  const roleIcons = { admin: '🛡️', kasir: '💼', konsumen: '🛒' };
  const roleNames = { admin: 'Administrator', kasir: 'Kasir', konsumen: 'Konsumen' };
  document.getElementById('sidebarUserName').textContent = currentUser.name;
  document.getElementById('sidebarUserRole').textContent = roleNames[currentUser.role];
  document.getElementById('userAvatar').textContent = roleIcons[currentUser.role];

  // Build sidebar nav based on role
  buildSidebarNav();

  // Show the first view for this role
  const firstView = roleMenus[currentUser.role][0].id;
  showView(firstView);

  showToast(`Selamat datang, ${currentUser.name}! 👋`, 'success');
}

function buildSidebarNav() {
  const navContainer = document.getElementById('sidebarNavButtons');
  navContainer.innerHTML = '';

  const menus = roleMenus[currentUser.role];
  menus.forEach((m, i) => {
    const btn = document.createElement('button');
    btn.className = 'nav-btn' + (i === 0 ? ' active' : '');
    btn.id = 'nav_' + m.id;
    btn.onclick = () => showView(m.id);
    btn.innerHTML = `<span class="nav-icon">${m.icon}</span><span>${m.label}</span>`;
    navContainer.appendChild(btn);
  });
}

function showView(id) {
  // Hide all views
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));

  // Show target
  const target = document.getElementById(id);
  if (target) target.classList.add('active');

  // Update nav active
  document.querySelectorAll('.sidebar-nav .nav-btn').forEach(b => b.classList.remove('active'));
  const navBtn = document.getElementById('nav_' + id);
  if (navBtn) navBtn.classList.add('active');

  // Render the relevant content
  renderAll();
}

function renderAll() {
  if (!currentUser) return;
  if (currentUser.role === 'admin') renderAdmin();
  if (currentUser.role === 'kasir') renderKasir();
  if (currentUser.role === 'konsumen') renderKonsumen();
}

// ============= FORMAT HELPERS =============
function formatNumber(n) {
  return new Intl.NumberFormat('id-ID').format(n || 0);
}

function shortNumber(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'jt';
  if (n >= 1000) return (n / 1000).toFixed(0) + 'rb';
  return (n || 0).toString();
}

// ============================================================
//  ADMIN: Dashboard Analytics
// ============================================================
function renderAdmin() {
  renderAdminStats();
  renderRevenueChart();
  renderTrxChart();
  renderTopProducts();
  renderRecentTrx();
}

function renderAdminStats() {
  const el = (id) => document.getElementById(id);
  if (el('statTotalProduk')) el('statTotalProduk').textContent = products.length;
  if (el('statTotalTrx')) el('statTotalTrx').textContent = trx.length;

  const revenue = trx.reduce((s, t) => s + (t.total || 0), 0);
  if (el('statTotalRevenue')) el('statTotalRevenue').textContent = 'Rp ' + formatNumber(revenue);

  // Count unique customer names
  const uniqueCustomers = new Set(trx.map(t => t.customer).filter(c => c && c !== 'Umum'));
  if (el('statTotalCustomers')) el('statTotalCustomers').textContent = uniqueCustomers.size;
}

function renderRevenueChart() {
  drawBarChart('revenueChart', trx, 'total', '#38bdf8', '#6366f1', 'Rp');
}

function renderTrxChart() {
  drawBarChart('trxChart', trx, 'count', '#a855f7', '#ec4899', '');
}

function drawBarChart(canvasId, data, mode, color1, color2, prefix) {
  const c = document.getElementById(canvasId);
  if (!c) return;
  const ctx = c.getContext('2d');

  c.width = c.parentElement.offsetWidth - 40;
  c.height = 220;
  ctx.clearRect(0, 0, c.width, c.height);

  if (data.length === 0) {
    ctx.fillStyle = '#64748b';
    ctx.font = '14px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Belum ada data', c.width / 2, c.height / 2);
    return;
  }

  // Group by date
  const daily = {};
  data.forEach(t => {
    const day = new Date(t.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
    if (mode === 'total') {
      daily[day] = (daily[day] || 0) + (t.total || 0);
    } else {
      daily[day] = (daily[day] || 0) + 1;
    }
  });

  const labels = Object.keys(daily).slice(-7);
  const values = labels.map(l => daily[l]);
  const maxVal = Math.max(...values, 1);

  const barW = Math.min(55, (c.width - 80) / labels.length - 12);
  const chartH = c.height - 50;
  const startX = 50;

  // Grid lines
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    const y = 15 + (chartH / 4) * i;
    ctx.beginPath();
    ctx.moveTo(startX, y);
    ctx.lineTo(c.width - 20, y);
    ctx.stroke();
  }

  labels.forEach((label, i) => {
    const x = startX + i * ((c.width - 80) / labels.length);
    const h = (values[i] / maxVal) * chartH;
    const y = 15 + chartH - h;

    const grad = ctx.createLinearGradient(x, y, x, 15 + chartH);
    grad.addColorStop(0, color1);
    grad.addColorStop(1, color2);

    // Shadow
    ctx.fillStyle = color1 + '1a';
    ctx.beginPath();
    ctx.roundRect(x + 3, y + 3, barW, h, [8, 8, 0, 0]);
    ctx.fill();

    // Bar
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(x, y, barW, h, [8, 8, 0, 0]);
    ctx.fill();

    // Label
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, x + barW / 2, c.height - 5);

    // Value
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 11px Inter, sans-serif';
    const valText = prefix ? prefix + shortNumber(values[i]) : values[i].toString();
    ctx.fillText(valText, x + barW / 2, y - 8);
  });
}

function renderTopProducts() {
  const el = document.getElementById('topProducts');
  if (!el) return;

  // Count product sales
  const salesMap = {};
  trx.forEach(t => {
    (t.items || []).forEach(item => {
      if (!salesMap[item.name]) {
        salesMap[item.name] = { name: item.name, emoji: item.emoji, qty: 0, revenue: 0 };
      }
      salesMap[item.name].qty += item.qty || 1;
      salesMap[item.name].revenue += (item.price || 0) * (item.qty || 1);
    });
  });

  const sorted = Object.values(salesMap).sort((a, b) => b.qty - a.qty).slice(0, 5);

  if (sorted.length === 0) {
    el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📦</div><div class="empty-state-text">Belum ada data penjualan</div></div>';
    return;
  }

  el.innerHTML = sorted.map((p, i) => `
    <div class="top-product-item">
      <div class="top-product-rank">${i + 1}</div>
      <span style="font-size:1.5rem;">${p.emoji || '📦'}</span>
      <div class="top-product-info">
        <div class="top-product-name">${p.name}</div>
        <div class="top-product-sold">${p.qty} terjual</div>
      </div>
      <div class="top-product-revenue">Rp ${formatNumber(p.revenue)}</div>
    </div>
  `).join('');
}

function renderRecentTrx() {
  const el = document.getElementById('recentTrx');
  if (!el) return;

  const recent = trx.slice().reverse().slice(0, 5);

  if (recent.length === 0) {
    el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🧾</div><div class="empty-state-text">Belum ada transaksi</div></div>';
    return;
  }

  el.innerHTML = recent.map(t => {
    const total = t.total || 0;
    const itemCount = (t.items || []).reduce((s, i) => s + (i.qty || 1), 0);
    return `
      <div class="recent-trx-item">
        <div class="recent-trx-info">
          <span class="recent-trx-icon">🧾</span>
          <div>
            <div class="recent-trx-id">${t.id || '-'}</div>
            <div class="recent-trx-date">${new Date(t.date).toLocaleString('id-ID')} • ${itemCount} item • ${t.customer || 'Umum'}</div>
          </div>
        </div>
        <span class="recent-trx-amount">Rp ${formatNumber(total)}</span>
      </div>`;
  }).join('');
}

// ============================================================
//  KASIR: Kelola Produk
// ============================================================
function renderKasir() {
  renderKasirProduk();
  renderKasirPOSGrid();
  renderKasirCart();
  renderKasirHistory();
  renderKasirCustomerSelect();
}

function addProduct() {
  const n = document.getElementById('prodName').value.trim();
  const p = document.getElementById('prodPrice').value.trim();
  const e = document.getElementById('prodEmoji').value.trim() || '📦';
  const c = document.getElementById('prodCategory').value.trim() || 'Umum';
  const s = parseInt(document.getElementById('prodStock').value) || 99;

  if (!n || !p) {
    showToast('Nama dan harga produk wajib diisi!', 'error');
    return;
  }

  products.push({ name: n, price: parseInt(p), emoji: e, category: c, stock: s });
  save();

  document.getElementById('prodName').value = '';
  document.getElementById('prodPrice').value = '';
  document.getElementById('prodEmoji').value = '';
  document.getElementById('prodCategory').value = '';
  document.getElementById('prodStock').value = '';

  showToast(`Produk "${n}" berhasil ditambahkan! 🎉`, 'success');
  renderAll();
}

function renderKasirProduk() {
  const el = document.getElementById('kasirProductList');
  if (!el) return;

  const search = (document.getElementById('searchProdukKasir')?.value || '').toLowerCase();
  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search) ||
    (p.category && p.category.toLowerCase().includes(search))
  );

  if (filtered.length === 0) {
    el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📦</div><div class="empty-state-text">Belum ada produk</div></div>';
    return;
  }

  el.innerHTML = filtered.map((p, i) => {
    const origIdx = products.indexOf(p);
    return `
      <div class="product-card">
        <div class="product-emoji">${p.emoji}</div>
        <div class="product-name">${p.name}</div>
        <div class="product-price">Rp ${formatNumber(p.price)}</div>
        <div class="product-stock ${(p.stock || 0) <= 5 ? 'low' : ''}">Stok: ${p.stock || 0}</div>
        ${p.category ? `<span class="product-category">${p.category}</span>` : ''}
        <button class="product-delete-btn" onclick="delProduct(${origIdx})">🗑️ Hapus</button>
      </div>`;
  }).join('');
}

function delProduct(i) {
  const name = products[i].name;
  products.splice(i, 1);
  save();
  showToast(`Produk "${name}" dihapus`, 'info');
  renderAll();
}

// ============================================================
//  KASIR: POS (process transaction)
// ============================================================
function renderKasirPOSGrid() {
  const el = document.getElementById('kasirPOSGrid');
  if (!el) return;

  const search = (document.getElementById('searchPOSProduct')?.value || '').toLowerCase();
  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search) ||
    (p.category && p.category.toLowerCase().includes(search))
  );

  el.innerHTML = filtered.map((p) => {
    const origIdx = products.indexOf(p);
    const outOfStock = (p.stock || 0) <= 0;
    return `
      <div class="product-card ${outOfStock ? 'out-of-stock' : ''}" onclick="${outOfStock ? '' : `addToKasirCart(${origIdx})`}" style="${outOfStock ? 'opacity:0.4;cursor:not-allowed;' : ''}">
        <div class="product-emoji">${p.emoji}</div>
        <div class="product-name">${p.name}</div>
        <div class="product-price">Rp ${formatNumber(p.price)}</div>
        <div class="product-stock ${outOfStock ? 'low' : ''}">Stok: ${p.stock || 0}</div>
      </div>`;
  }).join('');
}

function addToKasirCart(i) {
  const prod = products[i];
  if ((prod.stock || 0) <= 0) {
    showToast('Stok habis!', 'error');
    return;
  }
  const existing = kasirCart.find(c => c.name === prod.name);
  if (existing) {
    if (existing.qty >= (prod.stock || 0)) {
      showToast('Stok tidak cukup!', 'error');
      return;
    }
    existing.qty++;
  } else {
    kasirCart.push({ ...prod, qty: 1, productIndex: i });
  }
  renderKasirCart();
  showToast(`${prod.emoji} ${prod.name} ditambahkan`, 'success');
}

function renderKasirCart() {
  const el = document.getElementById('kasirCart');
  if (!el) return;

  let total = 0;
  el.innerHTML = '';

  kasirCart.forEach((c, i) => {
    const sub = c.price * c.qty;
    total += sub;
    el.innerHTML += `
      <div class="cart-item">
        <div class="cart-item-info">
          <span class="cart-item-emoji">${c.emoji}</span>
          <div>
            <div class="cart-item-name">${c.name}</div>
            <div class="cart-item-price">Rp ${formatNumber(c.price)} × ${c.qty} = Rp ${formatNumber(sub)}</div>
          </div>
        </div>
        <div class="cart-item-qty">
          <button class="qty-btn" onclick="changeKasirQty(${i},-1)">−</button>
          <span>${c.qty}</span>
          <button class="qty-btn" onclick="changeKasirQty(${i},1)">+</button>
        </div>
      </div>`;
  });

  const totalEl = document.getElementById('kasirTotal');
  if (totalEl) totalEl.textContent = 'Rp ' + formatNumber(total);
}

function changeKasirQty(i, delta) {
  kasirCart[i].qty += delta;
  if (kasirCart[i].qty <= 0) kasirCart.splice(i, 1);
  renderKasirCart();
}

function clearCart() {
  kasirCart = [];
  renderKasirCart();
  showToast('Keranjang dikosongkan', 'info');
}

function renderKasirCustomerSelect() {
  const sel = document.getElementById('kasirCartCustomer');
  if (!sel) return;
  const cur = sel.value;
  sel.innerHTML = '<option value="">-- Umum --</option>';
  customers.forEach((c, i) => {
    sel.innerHTML += `<option value="${i}" ${cur == i ? 'selected' : ''}>${c.name}</option>`;
  });
}

function kasirCheckout() {
  if (kasirCart.length === 0) {
    showToast('Keranjang masih kosong!', 'error');
    return;
  }

  const total = kasirCart.reduce((s, c) => s + c.price * c.qty, 0);
  const payInput = document.getElementById('kasirPayAmount');
  const paid = parseInt(payInput.value) || 0;

  if (paid > 0 && paid < total) {
    showToast('Pembayaran kurang!', 'error');
    return;
  }

  const custSel = document.getElementById('kasirCartCustomer');
  const customerName = custSel.value !== '' ? customers[parseInt(custSel.value)].name : 'Umum';

  const trxData = {
    id: 'TRX-' + Date.now(),
    items: kasirCart.map(c => ({ name: c.name, emoji: c.emoji, price: c.price, qty: c.qty })),
    total,
    paid: paid || total,
    change: (paid || total) - total,
    date: new Date().toISOString(),
    cashier: currentUser.name,
    customer: customerName
  };

  trx.push(trxData);

  // Reduce stock
  kasirCart.forEach(c => {
    const prod = products.find(p => p.name === c.name);
    if (prod) prod.stock = Math.max(0, (prod.stock || 0) - c.qty);
  });

  kasirCart = [];
  if (payInput) payInput.value = '';
  save();
  renderAll();

  showToast('Transaksi berhasil! 🎉', 'success');
  showReceipt(trxData);
}

// ============================================================
//  KASIR: History
// ============================================================
function renderKasirHistory() {
  const el = document.getElementById('kasirHistoryList');
  if (!el) return;

  const filterDate = document.getElementById('kasirFilterDate')?.value;
  const searchText = (document.getElementById('kasirSearchTrx')?.value || '').toLowerCase();

  let filtered = trx.slice().reverse();

  if (filterDate) {
    filtered = filtered.filter(t => new Date(t.date).toISOString().split('T')[0] === filterDate);
  }
  if (searchText) {
    filtered = filtered.filter(t =>
      (t.customer || '').toLowerCase().includes(searchText) ||
      (t.id || '').toLowerCase().includes(searchText)
    );
  }

  // Stats
  const countEl = document.getElementById('kasirTrxCount');
  const revEl = document.getElementById('kasirTrxRevenue');
  if (countEl) countEl.textContent = filtered.length;
  if (revEl) revEl.textContent = 'Rp ' + formatNumber(filtered.reduce((s, t) => s + (t.total || 0), 0));

  if (filtered.length === 0) {
    el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🧾</div><div class="empty-state-text">Tidak ada transaksi</div></div>';
    return;
  }

  el.innerHTML = filtered.map(t => {
    const itemCount = (t.items || []).reduce((s, i) => s + (i.qty || 1), 0);
    return `
      <div class="history-card">
        <div class="history-info">
          <div class="history-icon">🧾</div>
          <div class="history-text">
            <h4>${t.id || 'TRX'}</h4>
            <p>${new Date(t.date).toLocaleString('id-ID')} • ${itemCount} item • 👤 ${t.customer || 'Umum'}</p>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          <span class="history-amount">Rp ${formatNumber(t.total)}</span>
          <button class="history-receipt-btn" onclick='showReceipt(${JSON.stringify(t).replace(/'/g, "\\'")})'>🖨️ Struk</button>
        </div>
      </div>`;
  }).join('');
}

function clearKasirFilter() {
  const d = document.getElementById('kasirFilterDate');
  const s = document.getElementById('kasirSearchTrx');
  if (d) d.value = '';
  if (s) s.value = '';
  renderKasirHistory();
}

// ============================================================
//  KONSUMEN: Shopping
// ============================================================
function renderKonsumen() {
  renderKonsumenShop();
  renderKonsumenCart();
  renderKonsumenReceipts();
  renderCategoryChips();
}

function renderCategoryChips() {
  const el = document.getElementById('categoryChips');
  if (!el) return;

  const categories = [...new Set(products.map(p => p.category || 'Umum'))];

  el.innerHTML = `<button class="chip ${activeCategory === 'all' ? 'active' : ''}" onclick="filterCategory('all', this)">🏷️ Semua</button>`;
  categories.forEach(cat => {
    el.innerHTML += `<button class="chip ${activeCategory === cat ? 'active' : ''}" onclick="filterCategory('${cat}', this)">${cat}</button>`;
  });
}

function filterCategory(cat, btn) {
  activeCategory = cat;
  renderKonsumenShop();
  renderCategoryChips();
}

function renderKonsumenShop() {
  const el = document.getElementById('konsumenProductGrid');
  if (!el) return;

  const search = (document.getElementById('searchKonsumen')?.value || '').toLowerCase();

  let filtered = products.filter(p =>
    p.name.toLowerCase().includes(search) ||
    (p.category && p.category.toLowerCase().includes(search))
  );

  if (activeCategory !== 'all') {
    filtered = filtered.filter(p => (p.category || 'Umum') === activeCategory);
  }

  if (filtered.length === 0) {
    el.innerHTML = '<div class="empty-state" style="grid-column:1/-1;"><div class="empty-state-icon">🛒</div><div class="empty-state-text">Tidak ada produk ditemukan</div></div>';
    return;
  }

  el.innerHTML = filtered.map((p) => {
    const origIdx = products.indexOf(p);
    const outOfStock = (p.stock || 0) <= 0;
    return `
      <div class="konsumen-product-card">
        <div class="konsumen-product-emoji">${p.emoji}</div>
        <div class="konsumen-product-name">${p.name}</div>
        <div class="konsumen-product-price">Rp ${formatNumber(p.price)}</div>
        <div class="konsumen-product-stock ${outOfStock ? 'empty' : ''}">
          ${outOfStock ? '❌ Stok Habis' : `✅ Tersedia (${p.stock})`}
        </div>
        <button class="konsumen-add-btn" onclick="addToKonsumenCart(${origIdx})" ${outOfStock ? 'disabled' : ''}>
          ${outOfStock ? 'Habis' : '🛒 Tambah ke Keranjang'}
        </button>
      </div>`;
  }).join('');
}

function addToKonsumenCart(i) {
  const prod = products[i];
  if ((prod.stock || 0) <= 0) {
    showToast('Maaf, stok habis!', 'error');
    return;
  }
  const existing = konsumenCart.find(c => c.name === prod.name);
  if (existing) {
    if (existing.qty >= (prod.stock || 0)) {
      showToast('Stok tidak mencukupi!', 'error');
      return;
    }
    existing.qty++;
  } else {
    konsumenCart.push({ ...prod, qty: 1, productIndex: i });
  }
  renderKonsumenCart();
  showToast(`${prod.emoji} ${prod.name} ditambahkan ke keranjang!`, 'success');
}

function renderKonsumenCart() {
  const el = document.getElementById('konsumenCart');
  if (!el) return;

  let total = 0;
  el.innerHTML = '';

  if (konsumenCart.length === 0) {
    el.innerHTML = '<div class="empty-state" style="padding:30px 10px;"><div class="empty-state-icon">🛒</div><div class="empty-state-text">Keranjang kosong</div></div>';
  } else {
    konsumenCart.forEach((c, i) => {
      const sub = c.price * c.qty;
      total += sub;
      el.innerHTML += `
        <div class="cart-item">
          <div class="cart-item-info">
            <span class="cart-item-emoji">${c.emoji}</span>
            <div>
              <div class="cart-item-name">${c.name}</div>
              <div class="cart-item-price">Rp ${formatNumber(c.price)} × ${c.qty} = Rp ${formatNumber(sub)}</div>
            </div>
          </div>
          <div class="cart-item-qty">
            <button class="qty-btn" onclick="changeKonsumenQty(${i},-1)">−</button>
            <span>${c.qty}</span>
            <button class="qty-btn" onclick="changeKonsumenQty(${i},1)">+</button>
          </div>
        </div>`;
    });
  }

  const totalEl = document.getElementById('konsumenTotal');
  if (totalEl) totalEl.textContent = 'Rp ' + formatNumber(total);
}

function changeKonsumenQty(i, delta) {
  konsumenCart[i].qty += delta;
  if (konsumenCart[i].qty <= 0) konsumenCart.splice(i, 1);
  renderKonsumenCart();
}

function clearKonsumenCart() {
  konsumenCart = [];
  renderKonsumenCart();
  showToast('Keranjang dikosongkan', 'info');
}

function konsumenCheckout() {
  if (konsumenCart.length === 0) {
    showToast('Keranjang masih kosong!', 'error');
    return;
  }

  const total = konsumenCart.reduce((s, c) => s + c.price * c.qty, 0);
  const payInput = document.getElementById('konsumenPayAmount');
  const paid = parseInt(payInput.value) || 0;

  if (paid > 0 && paid < total) {
    showToast('Pembayaran kurang!', 'error');
    return;
  }

  const trxData = {
    id: 'TRX-' + Date.now(),
    items: konsumenCart.map(c => ({ name: c.name, emoji: c.emoji, price: c.price, qty: c.qty })),
    total,
    paid: paid || total,
    change: (paid || total) - total,
    date: new Date().toISOString(),
    cashier: 'Self-Checkout',
    customer: currentUser.name
  };

  trx.push(trxData);

  // Reduce stock
  konsumenCart.forEach(c => {
    const prod = products.find(p => p.name === c.name);
    if (prod) prod.stock = Math.max(0, (prod.stock || 0) - c.qty);
  });

  konsumenCart = [];
  if (payInput) payInput.value = '';
  save();
  renderAll();

  showToast('Pesanan berhasil! Lihat bukti transaksi Anda 🎉', 'success');
  showReceipt(trxData);
}

// ============================================================
//  KONSUMEN: Receipts / Bukti Transaksi
// ============================================================
function renderKonsumenReceipts() {
  const el = document.getElementById('konsumenReceiptList');
  if (!el || !currentUser) return;

  // Filter transactions for this customer
  const myTrx = trx.filter(t => t.customer === currentUser.name).reverse();

  // Summary
  const totalOrders = myTrx.length;
  const totalSpent = myTrx.reduce((s, t) => s + (t.total || 0), 0);
  const lastOrder = myTrx.length > 0 ? new Date(myTrx[0].date).toLocaleDateString('id-ID') : '-';

  const el1 = document.getElementById('myTotalOrders');
  const el2 = document.getElementById('myTotalSpent');
  const el3 = document.getElementById('myLastOrder');
  if (el1) el1.textContent = totalOrders;
  if (el2) el2.textContent = 'Rp ' + formatNumber(totalSpent);
  if (el3) el3.textContent = lastOrder;

  if (myTrx.length === 0) {
    el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🧾</div><div class="empty-state-text">Anda belum memiliki transaksi.<br>Mulai belanja sekarang!</div></div>';
    return;
  }

  el.innerHTML = myTrx.map(t => {
    const itemCount = (t.items || []).reduce((s, i) => s + (i.qty || 1), 0);
    const itemTags = (t.items || []).map(i =>
      `<span class="receipt-card-item-tag">${i.emoji} ${i.name} ×${i.qty || 1}</span>`
    ).join('');

    return `
      <div class="receipt-card">
        <div class="receipt-card-header">
          <span class="receipt-card-id">🧾 ${t.id}</span>
          <span class="receipt-card-date">📅 ${new Date(t.date).toLocaleString('id-ID')}</span>
        </div>
        <div class="receipt-card-body">
          <div class="receipt-card-items">${itemTags}</div>
          <div style="font-size:0.8rem;color:#94a3b8;">
            ${itemCount} item • Kasir: ${t.cashier}
          </div>
        </div>
        <div class="receipt-card-footer">
          <span class="receipt-card-total">Rp ${formatNumber(t.total)}</span>
          <button class="receipt-card-btn" onclick='showReceipt(${JSON.stringify(t).replace(/'/g, "\\'")})'>🖨️ Lihat Struk</button>
        </div>
      </div>`;
  }).join('');
}

// ============================================================
//  RECEIPT MODAL (shared)
// ============================================================
function showReceipt(data) {
  document.getElementById('receiptDate').textContent = '📅 ' + new Date(data.date).toLocaleString('id-ID');
  document.getElementById('receiptNo').textContent = 'No: ' + data.id;
  document.getElementById('receiptCashier').textContent = 'Kasir: ' + (data.cashier || '-');
  document.getElementById('receiptCustomer').textContent = 'Pelanggan: ' + (data.customer || 'Umum');

  const itemsEl = document.getElementById('receiptItems');
  itemsEl.innerHTML = '';

  (data.items || []).forEach(item => {
    itemsEl.innerHTML += `
      <div class="receipt-item">
        <span class="receipt-item-name">${item.emoji || ''} ${item.name}</span>
        <span class="receipt-item-qty">x${item.qty || 1}</span>
        <span class="receipt-item-total">Rp ${formatNumber((item.price || 0) * (item.qty || 1))}</span>
      </div>`;
  });

  document.getElementById('receiptSubtotal').textContent = 'Rp ' + formatNumber(data.total);
  document.getElementById('receiptTotal').textContent = 'Rp ' + formatNumber(data.total);
  document.getElementById('receiptPaid').textContent = 'Rp ' + formatNumber(data.paid);
  document.getElementById('receiptChange').textContent = 'Rp ' + formatNumber(data.change);

  document.getElementById('receiptModal').style.display = 'flex';
}

function closeReceipt() {
  document.getElementById('receiptModal').style.display = 'none';
}

function printReceipt() {
  window.print();
}

// ============================================================
//  EVENT LISTENERS
// ============================================================
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && document.getElementById('loginScreen').style.display !== 'none') {
    doLogin();
  }
  if (e.key === 'Escape') {
    closeReceipt();
  }
});

document.addEventListener('click', (e) => {
  if (e.target.id === 'receiptModal') closeReceipt();
});

// ============================================================
//  INIT
// ============================================================
window.onload = function () {
  initSplash();
};
