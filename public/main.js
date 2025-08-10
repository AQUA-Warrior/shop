let allItems = [];
let cart = [];
let filteredItems = [];
let currentPage = 1;
const ITEMS_PER_PAGE = 8;
let categories = [];
let maxPrice = 1000;
let currentSearchQuery = '';

function loadCartFromStorage() {
  try {
    const saved = localStorage.getItem('cart');
    if (saved) cart = JSON.parse(saved);
  } catch (e) {
    console.error("Failed to load cart from storage:", e);
  }
}

function saveCartToStorage() {
  localStorage.setItem('cart', JSON.stringify(cart));
}

function showNotif(msg) {
  const notif = document.createElement('div');
  notif.className = 'notif-msg';
  notif.textContent = msg;
  const area = document.getElementById('notif-area');
  if (area) {
    area.appendChild(notif);
    setTimeout(() => {
      notif.style.opacity = 0;
      setTimeout(() => notif.remove(), 400);
    }, 1200);
  } else {
    console.warn("Notification area not found. Message:", msg);
  }
}

async function loadItems() {
  showSkeletonLoader(true);
  try {
    const res = await fetch('/api/items');
    if (!res.ok) {
      const errText = await res.text();
      throw new Error('Failed to load items: ' + errText);
    }
    allItems = await res.json();
    allItems = allItems.map(i => {
      let price = Number(i.price);
      if (!isNaN(price) && price > 1000) price = price / 100;
      else if (isNaN(price)) price = 0;
      return { ...i, price };
    });
    categories = [...new Set(allItems.map(i => i.category).filter(Boolean))];
    maxPrice = Math.max(100, ...allItems.map(i => i.price || 0));
    setupCategoryFilter();
    setupPriceFilter();
    applyFiltersAndRender();
  } catch (err) {
    console.error('Error loading items:', err);
    showNotif('Could not load items. ' + (err.message || 'Please try again later.'));
  } finally {
    showSkeletonLoader(false);
  }
}

function showSkeletonLoader(show) {
  const skeleton = document.getElementById('skeleton-loader');
  const itemsDiv = document.getElementById('items');
  if (!skeleton || !itemsDiv) return;

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
  if (!sel) return;
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
  const priceValueDisplay = document.getElementById('filter-price-value');
  if (!priceInput || !priceValueDisplay) return;

  priceInput.max = Math.ceil(maxPrice);
  priceInput.value = priceInput.max;
  priceValueDisplay.textContent = '\$0 - $' + priceInput.max;

  priceInput.addEventListener('input', () => {
    priceValueDisplay.textContent = `\$0 - $${parseFloat(priceInput.value).toFixed(2)}`;
  });
}

function applyFiltersAndRender() {
  let items = allItems.slice();
  const catElement = document.getElementById('filter-category');
  const priceElement = document.getElementById('filter-price');
  const searchInputElement = document.getElementById('filter-input');
  const sortElement = document.getElementById('sort-select');

  const cat = catElement ? catElement.value : '';
  if (cat) items = items.filter(i => i.category === cat);

  const priceMax = priceElement ? parseFloat(priceElement.value) : maxPrice;
  items = items.filter(i => i.price <= priceMax);

  const q = searchInputElement ? searchInputElement.value.trim().toLowerCase() : '';
  currentSearchQuery = q;
  if (q) {
    items = items.filter(item =>
      item.name.toLowerCase().includes(q) ||
      (item.description && item.description.toLowerCase().includes(q))
    );
  }

  const sort = sortElement ? sortElement.value : '';
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
  if (!itemsDiv) return;
  itemsDiv.innerHTML = '';
  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE;
  const pageItems = filteredItems.slice(start, end);

  if (pageItems.length === 0) {
    itemsDiv.innerHTML = '<p style="text-align:center;padding:20px;">No items found matching your criteria.</p>';
    renderPagination();
    return;
  }

  pageItems.forEach(item => {
    const div = document.createElement('div');
    div.className = 'item';

    let imgHtml = '';
    if (item.image) {
      let imgSrc = item.image;
      if (/^https:\/\/images-api\.printify\.com\//.test(imgSrc)) {
        imgSrc = `/api/proxy-image?url=${encodeURIComponent(imgSrc)}`;
      }
      imgHtml = `<img src="${imgSrc}" alt="${item.name}" class="product-img" loading="lazy">`;
    }

    div.innerHTML = `
      ${imgHtml}
      <h3>${highlightMatch(item.name)}</h3>
      <p><b>\$${item.price.toFixed(2)}</b></p>
      <div class="item-actions">
        <input type="number" min="1" value="1" class="item-qty-input" id="qty-${item._id}">
        <button class="add-to-cart-btn" data-id="${item._id}">Add to Cart</button>
        <button class="quick-view-btn" data-id="${item._id}">Quick View</button>
      </div>
    `;
    itemsDiv.appendChild(div);
  });

  itemsDiv.querySelectorAll('.add-to-cart-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const id = this.getAttribute('data-id');
      const item = allItems.find(i => i._id === id);
      const qtyInput = document.getElementById('qty-' + id);
      const qty = qtyInput ? parseInt(qtyInput.value, 10) : 1;
      if (item) window.addToCart(item, qty);
    });
  });

  itemsDiv.querySelectorAll('.quick-view-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const id = this.getAttribute('data-id');
      const item = allItems.find(i => i._id === id);
      if (item) window.showQuickView(item);
    });
  });

  renderPagination();
}

function renderPagination() {
  const controls = document.getElementById('pagination-controls');
  if (!controls) return;

  if (!filteredItems || filteredItems.length === 0) {
    controls.innerHTML = '';
    return;
  }
  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  if (totalPages <= 1) {
    controls.innerHTML = '';
    return;
  }
  let html = '';
  for (let i = 1; i <= totalPages; ++i) {
    html += `<button class="pagination-btn${i === currentPage ? ' active' : ''}" data-page="${i}">${i}</button>`;
  }
  controls.innerHTML = html;
  controls.querySelectorAll('.pagination-btn').forEach(btn => {
    btn.onclick = function() {
      currentPage = parseInt(this.getAttribute('data-page'), 10);
      renderItemsPage();
    };
  });
}

window.addToCart = function(item, qty) {
  qty = parseInt(qty, 10);
  if (isNaN(qty) || qty < 1) qty = 1;
  const idx = cart.findIndex(ci => ci._id === item._id);
  if (idx >= 0) {
    cart[idx].quantity += qty;
  } else {
    cart.push({ ...item,
      quantity: qty,
      variant_id: item.variant_id || undefined
    });
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
  const totalDisplay = document.getElementById('cart-total');
  const fabCount = document.getElementById('cart-fab-count');

  if (!ul || !totalDisplay) return;

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

  totalDisplay.textContent = '$' + total.toFixed(2);

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

document.addEventListener('DOMContentLoaded', function() {
  loadCartFromStorage();
  renderCart();
  loadItems();

  const emptyCartBtn = document.getElementById('empty-cart-btn');
  if (emptyCartBtn) {
    emptyCartBtn.onclick = function() {
      cart = [];
      saveCartToStorage();
      renderCart();
      showNotif('Cart emptied');
    };
  }

  const checkoutBtn = document.getElementById('checkout-btn');
  if (checkoutBtn) {
    checkoutBtn.onclick = async function() {
      if (cart.length === 0) return showNotif('Cart is empty');
      try {
        const res = await fetch('/api/checkout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            items: cart
          })
        });
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
        } else {
          showNotif('Checkout failed: ' + (data.message || 'Unknown error.'));
        }
      } catch (e) {
        console.error('Checkout error:', e);
        showNotif('Checkout failed: ' + (e.message || 'Please try again.'));
      }
    };
  }

  const filterCategory = document.getElementById('filter-category');
  if (filterCategory) filterCategory.addEventListener('change', applyFiltersAndRender);

  const filterPrice = document.getElementById('filter-price');
  if (filterPrice) filterPrice.addEventListener('input', applyFiltersAndRender);

  const filterInput = document.getElementById('filter-input');
  if (filterInput) filterInput.addEventListener('input', applyFiltersAndRender);

  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) sortSelect.addEventListener('change', applyFiltersAndRender);

  const quickViewModal = document.getElementById('quick-view-modal');
  const quickViewCloseBtn = document.getElementById('close-quick-view');
  if (quickViewModal && quickViewCloseBtn) {
    quickViewCloseBtn.addEventListener('click', () => {
      quickViewModal.style.display = 'none';
    });
    quickViewModal.addEventListener('click', (event) => {
      if (event.target === quickViewModal) {
        quickViewModal.style.display = 'none';
      }
    });
  }
});


function highlightMatch(str) {
  if (!currentSearchQuery) {
    return str;
  }
  const escapedQuery = currentSearchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedQuery})`, 'gi');
  return str.replace(regex, '<span class="highlight">$1</span>');
}

window.showQuickView = function(item) {
  const modal = document.getElementById('quick-view-modal');
  const content = document.getElementById('quick-view-content');
  if (!modal || !content) {
    console.error("Quick view modal or content not found.");
    return;
  }

  let descHtml = '';
  if (item.description) {
    const lines = item.description.split(/\r?\n|•/).map(l => l.trim()).filter(Boolean);
    if (lines.length > 1) {
      descHtml = `<ul class="quick-view-description">` +
        lines.map(l => `<li>${highlightMatch(l)}</li>`).join('') +
        `</ul>`;
    } else {
      descHtml = `<div class="quick-view-description">${highlightMatch(item.description)}</div>`;
    }
  }

  let imgHtml = '';
  if (item.image) {
    let imgSrc = item.image;
    if (/^https:\/\/images-api\.printify\.com\//.test(imgSrc)) {
      imgSrc = `/api/proxy-image?url=${encodeURIComponent(imgSrc)}`;
    }
    imgHtml = `<img src="${imgSrc}" alt="${item.name}" class="product-img" style="max-width:100%;margin-bottom:1em;">`;
  }

  content.innerHTML = `
    <div id="quick-view-parent">
      ${imgHtml}
      <h2>${highlightMatch(item.name)}</h2>
      ${descHtml}
      <p><b>Price: \$${item.price.toFixed(2)}</b></p>
      <div class="quick-view-actions">
        <input type="number" min="1" value="1" class="item-qty-input" id="quick-view-qty">
        <button id="quick-view-add-to-cart">Add to Cart</button>
      </div>
    </div>
  `;
  modal.style.display = 'flex';

  const btn = document.getElementById('quick-view-add-to-cart');
  const qtyInput = document.getElementById('quick-view-qty');
  if (btn) {
    btn.onclick = function() {
      const qty = qtyInput ? parseInt(qtyInput.value, 10) : 1;
      window.addToCart(item, qty);
      modal.style.display = 'none';
    };
  }
};