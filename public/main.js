let allItems = [];
let cart = [];
let filteredItems = [];
let currentPage = 1;
const ITEMS_PER_PAGE = 8;
let categories = [];
let maxPrice = 1000;

function loadCartFromStorage() {
  try {
    const saved = localStorage.getItem('cart');
    if (saved) cart = JSON.parse(saved);
  } catch {}
}

function saveCartToStorage() {
  localStorage.setItem('cart', JSON.stringify(cart));
}

function showNotif(msg) {
  const notif = document.createElement('div');
  notif.className = 'notif-msg';
  notif.textContent = msg;
  const area = document.getElementById('notif-area');
  area.appendChild(notif);
  setTimeout(() => {
    notif.style.opacity = 0;
    setTimeout(() => notif.remove(), 400);
  }, 1200);
}

async function loadItems() {
  showSkeletonLoader(true);
  try {
    const res = await fetch('/api/items');
    if (!res.ok) throw new Error('Failed to load items');
    allItems = await res.json();
    categories = [...new Set(allItems.map(i => i.category).filter(Boolean))];
    maxPrice = Math.max(100, ...allItems.map(i => i.price || 0));
    setupCategoryFilter();
    setupPriceFilter();
    applyFiltersAndRender();
  } catch (err) {
    showNotif('Could not load items. Please try again later.');
  } finally {
    showSkeletonLoader(false);
  }
}

function showSkeletonLoader(show) {
  const skeleton = document.getElementById('skeleton-loader');
  const itemsDiv = document.getElementById('items');
  if (show) {
    skeleton.style.display = '';
    itemsDiv.style.display = 'none';
    skeleton.innerHTML = '';
    for (let i = 0; i < ITEMS_PER_PAGE; ++i) {
      const div = document.createElement('div');
      div.className = 'skeleton-card';
      skeleton.appendChild(div);
    }
  } else {
    skeleton.style.display = 'none';
    itemsDiv.style.display = '';
  }
}

function setupCategoryFilter() {
  const sel = document.getElementById('filter-category');
  sel.innerHTML = '<option value="">All</option>';
  categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    sel.appendChild(opt);
  });
}

function setupPriceFilter() {
  const priceInput = document.getElementById('filter-price');
  priceInput.max = Math.ceil(maxPrice);
  priceInput.value = priceInput.max;
  document.getElementById('filter-price-value').textContent = '$0 - $' + priceInput.max;
}

function applyFiltersAndRender() {
  let items = allItems.slice();
  const cat = document.getElementById('filter-category').value;
  if (cat) items = items.filter(i => i.category === cat);
  const priceMax = parseFloat(document.getElementById('filter-price').value);
  items = items.filter(i => i.price <= priceMax);
  const q = document.getElementById('filter-input').value.trim().toLowerCase();
  if (q) {
    items = items.filter(item =>
      item.name.toLowerCase().includes(q) ||
      (item.description && item.description.toLowerCase().includes(q))
    );
  }
  const sort = document.getElementById('sort-select').value;
  if (sort === 'price-asc') items.sort((a, b) => a.price - b.price);
  else if (sort === 'price-desc') items.sort((a, b) => b.price - a.price);
  else if (sort === 'alpha') items.sort((a, b) => a.name.localeCompare(b.name));
  else if (sort === 'bestselling') items.sort((a, b) => (b.sold || 0) - (a.sold || 0));
  else items.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  filteredItems = items;
  currentPage = 1;
  renderItemsPage();
}

function renderItemsPage() {
  const itemsDiv = document.getElementById('items');
  itemsDiv.innerHTML = '';
  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE;
  const pageItems = filteredItems.slice(start, end);
  pageItems.forEach(item => {
    const div = document.createElement('div');
    div.className = 'item';
    let label = '';
    if (item.isNew) label = '<span class="label new">New</span>';
    else if (item.onSale) label = '<span class="label sale">Sale</span>';
    let img = `<img class="product-img" src="${item.image || 'https://via.placeholder.com/320x160?text=No+Image'}" alt="${item.name}">`;
    div.innerHTML = `
      ${label}
      ${img}
      <h3>${highlightMatch(item.name)}</h3>
      <p>${highlightMatch(item.description || '')}</p>
      <p><b>$${item.price.toFixed(2)}</b></p>
      <div class="item-actions">
        <input type="number" min="1" value="1" class="item-qty-input" id="qty-${item._id}">
        <button class="add-to-cart-btn" data-id="${item._id}">Add to Cart</button>
        <button class="view-btn" data-id="${item._id}">View</button>
      </div>
    `;
    itemsDiv.appendChild(div);
  });

  itemsDiv.querySelectorAll('.add-to-cart-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const id = this.getAttribute('data-id');
      const item = allItems.find(i => i._id === id);
      const qtyInput = document.getElementById('qty-' + id);
      const qty = qtyInput ? qtyInput.value : 1;
      if (item) window.addToCart(item, qty);
    });
  });
  itemsDiv.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const id = this.getAttribute('data-id');
      const item = allItems.find(i => i._id === id);
      if (item) window.showQuickView(item);
    });
  });

  renderPagination();
}

function highlightMatch(text) {
  const q = document.getElementById('filter-input').value.trim();
  if (!q) return text;
  return text.replace(new RegExp(q, 'ig'), m => `<mark>${m}</mark>`);
}

function renderPagination() {
  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const controls = document.getElementById('pagination-controls');
  controls.innerHTML = '';
  if (totalPages <= 1) return;
  for (let i = 1; i <= totalPages; ++i) {
    const btn = document.createElement('button');
    btn.className = 'pagination-btn' + (i === currentPage ? ' active' : '');
    btn.textContent = i;
    btn.onclick = () => {
      currentPage = i;
      renderItemsPage();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    controls.appendChild(btn);
  }
}

document.getElementById('filter-input').addEventListener('input', debounce(applyFiltersAndRender, 200));
document.getElementById('filter-category').addEventListener('change', applyFiltersAndRender);
document.getElementById('filter-price').addEventListener('input', function() {
  document.getElementById('filter-price-value').textContent = '$0 - $' + this.value;
  applyFiltersAndRender();
});
document.getElementById('sort-select').addEventListener('change', applyFiltersAndRender);
document.getElementById('clear-filters-btn').onclick = function() {
  document.getElementById('filter-category').value = '';
  document.getElementById('filter-price').value = document.getElementById('filter-price').max;
  document.getElementById('filter-input').value = '';
  setupPriceFilter();
  applyFiltersAndRender();
};

function debounce(fn, ms) {
  let t;
  return function(...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), ms);
  };
}

window.showQuickView = function(item) {
  const modal = document.getElementById('quick-view-modal');
  const content = document.getElementById('quick-view-content');
  content.innerHTML = `
    <h2>${item.name}</h2>
    <img src="${item.image || 'https://via.placeholder.com/320x160?text=No+Image'}" style="width:100%;max-width:320px;border-radius:8px;margin-bottom:1em;">
    <p>${item.description || ''}</p>
    <p><b>Price: $${item.price.toFixed(2)}</b></p>
    <button id="quick-view-add-to-cart">Add to Cart</button>
  `;
  modal.style.display = '';
  const btn = document.getElementById('quick-view-add-to-cart');
  if (btn) {
    btn.onclick = function() {
      window.addToCart(item, 1);
      modal.style.display = 'none';
    };
  }
};
document.getElementById('close-quick-view').onclick = function() {
  document.getElementById('quick-view-modal').style.display = 'none';
};
window.onclick = function(event) {
  const modal = document.getElementById('quick-view-modal');
  if (event.target === modal) modal.style.display = 'none';
}

const cartFab = document.getElementById('cart-fab');
const cartDiv = document.getElementById('cart');
function openCartMobile() {
  if (window.innerWidth < 900) {
    cartDiv.classList.add('open');
    setTimeout(() => {
      cartDiv.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 100);
  }
}
function closeCartMobile() {
  if (window.innerWidth < 900) {
    cartDiv.classList.remove('open');
  }
}
cartFab.onclick = function() {
  if (cartDiv.classList.contains('open')) closeCartMobile();
  else openCartMobile();
};
document.addEventListener('click', function(e) {
  if (window.innerWidth >= 900) return;
  if (!cartDiv.contains(e.target) && !cartFab.contains(e.target)) {
    closeCartMobile();
  }
});

window.addToCart = function(item, qty) {
  qty = parseInt(qty, 10);
  if (isNaN(qty) || qty < 1) qty = 1;
  const idx = cart.findIndex(ci => ci._id === item._id);
  if (idx >= 0) {
    cart[idx].quantity += qty;
  } else {
    cart.push({ ...item, quantity: qty });
  }
  saveCartToStorage();
  renderCart();
  showNotif(`Added ${qty} × ${item.name} to cart`);
};

window.removeFromCart = function(id) {
  cart = cart.filter(ci => ci._id !== id);
  saveCartToStorage();
  renderCart();
  showNotif('Removed item from cart');
};

function renderCart() {
  const ul = document.getElementById('cart-items');
  ul.innerHTML = '';
  let total = 0;
  cart.forEach(item => {
    total += item.price * item.quantity;
    const li = document.createElement('li');
    li.innerHTML = `
      <span>${item.name} × ${item.quantity}</span>
      <button class="cart-remove-btn" data-id="${item._id}" style="background:none;border:none;color:#e53935;cursor:pointer;font-size:1.1em;">&times;</button>
    `;
    ul.appendChild(li);
  });
  document.getElementById('cart-total').textContent = '$' + total.toFixed(2);
  const fabCount = document.getElementById('cart-fab-count');
    if (fabCount) {
      fabCount.textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
    }
  ul.querySelectorAll('.cart-remove-btn').forEach(btn => {
    btn.onclick = function() {
      const id = this.getAttribute('data-id');
      window.removeFromCart(id);
    };
  });
}

document.getElementById('empty-cart-btn').onclick = function() {
  cart = [];
  saveCartToStorage();
  renderCart();
  showNotif('Cart emptied');
};

window.addEventListener('DOMContentLoaded', function() {
  loadCartFromStorage();
  renderCart();
  loadItems();
});
