let token = '';
let feedbackTimeout;

function showFeedback(selector, msg, type = 'error') {
  clearTimeout(feedbackTimeout);
  const el = document.querySelector(selector);
  el.textContent = msg;
  el.className = type === 'success' ? 'success-msg' : 'error-msg';
  if (msg) {
    el.style.display = 'block';
    feedbackTimeout = setTimeout(() => {
      el.textContent = '';
      el.style.display = 'none';
    }, type === 'success' ? 1800 : 3000);
  } else {
    el.style.display = 'none';
  }
}

async function login(e) {
  if (e) e.preventDefault();
  const username = document.getElementById('admin-username').value;
  const password = document.getElementById('admin-password').value;
  showFeedback('#login-error', '');
  const res = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();
  if (data.token) {
    token = data.token;
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('admin-section').style.display = '';
    loadItems();
  } else {
    showFeedback('#login-error', data.error || 'Login failed');
  }
}

document.getElementById('login-form').onsubmit = login;

document.getElementById('add-item-form').onsubmit = async function(e) {
  e.preventDefault();
  const name = document.getElementById('item-name').value.trim();
  const description = document.getElementById('item-desc').value.trim();
  const price = parseFloat(document.getElementById('item-price').value);
  const category = document.getElementById('item-category').value.trim();
  let image = document.getElementById('item-image').value.trim();
  const inStock = !!document.getElementById('item-instock').checked;
  const isNew = !!document.getElementById('item-isnew').checked;
  const onSale = !!document.getElementById('item-onsale').checked;
  if (!name || isNaN(price)) {
    showFeedback('#item-error', 'Name and valid price are required.');
    return;
  }
  if (image && !/^https?:\/\/.+\..+/.test(image)) {
    showFeedback('#item-error', 'Image URL must be valid (start with http(s)://)');
    return;
  }
  if (!image) image = '';
  showFeedback('#item-error', '<span class="spinner"></span>', 'success');
  const res = await fetch('/api/admin/items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ name, description, price, category, image, inStock, isNew, onSale })
  });
  if (res.ok) {
    showFeedback('#item-error', 'Item added!', 'success');
    document.getElementById('add-item-form').reset();
    loadItems();
  } else {
    const data = await res.json().catch(() => ({}));
    showFeedback('#item-error', data.error || 'Failed to add item.');
  }
}

async function loadItems() {
  const res = await fetch('/api/items');
  const items = await res.json();
  const ul = document.getElementById('admin-items');
  ul.innerHTML = '';
  items.forEach(item => {
    const li = document.createElement('li');
    li.className = 'admin-item-row';
    li.dataset.id = item._id;
    li.innerHTML = `
      <div class="item-info">
        <span class="item-name">${item.name}</span>
        <span class="item-desc">${item.description || ''}</span>
        <span class="item-price">$${item.price.toFixed(2)}</span>
      </div>
      <div class="admin-item-actions">
        <button class="primary-btn edit-btn">Edit</button>
        <button class="danger-btn delete-btn">Delete</button>
      </div>
    `;
    li.querySelector('.edit-btn').onclick = () => startEditItem(li, item);
    li.querySelector('.delete-btn').onclick = async () => {
      if (confirm(`Delete "${item.name}"?`)) {
        await deleteItem(item._id);
      }
    };
    ul.appendChild(li);
  });
}

function startEditItem(li, item) {
  li.style.display = 'flex';
  li.style.justifyContent = 'center';
  li.style.alignItems = 'center';
  li.innerHTML = `
    <form class="admin-item-edit" style="display:flex;flex-direction:column;gap:0.4em;width:100%;">
      <input type="text" value="${item.name}" class="edit-name" required placeholder="Name" style="margin-bottom:0.2em;">
      <input type="text" value="${item.description || ''}" class="edit-desc" placeholder="Description" style="margin-bottom:0.2em;">
      <div style="display:flex;gap:0.4em;">
        <input type="number" value="${item.price}" class="edit-price" min="0" step="0.01" required placeholder="Price" style="flex:1;">
        <input type="text" value="${item.category || ''}" class="edit-category" placeholder="Category" style="flex:1;">
      </div>
      <input type="text" value="${item.image || ''}" class="edit-image" placeholder="Image URL" style="margin-bottom:0.2em;">
      <div style="display:flex;gap:1em;flex-wrap:wrap;margin-bottom:0.2em;">
        <label style="font-size:0.97em;"><input type="checkbox" class="edit-instock" ${item.inStock !== false ? 'checked' : ''}> In Stock</label>
        <label style="font-size:0.97em;"><input type="checkbox" class="edit-isnew" ${item.isNew ? 'checked' : ''}> New</label>
        <label style="font-size:0.97em;"><input type="checkbox" class="edit-onsale" ${item.onSale ? 'checked' : ''}> Sale</label>
      </div>
      <div style="display:flex;gap:0.5em;">
        <button class="success-btn save-btn" type="submit" style="flex:1;">Save</button>
        <button class="neutral-btn cancel-btn" type="button" style="flex:1;">Cancel</button>
        <button class="danger-btn delete-btn" type="button" style="flex:1;">Delete</button>
      </div>
    </form>
  `;
  const form = li.querySelector('.admin-item-edit');
  form.onsubmit = async (e) => {
    e.preventDefault();
    const name = form.querySelector('.edit-name').value.trim();
    const description = form.querySelector('.edit-desc').value.trim();
    const price = parseFloat(form.querySelector('.edit-price').value);
    const category = form.querySelector('.edit-category').value.trim();
    let image = form.querySelector('.edit-image').value.trim();
    const inStock = form.querySelector('.edit-instock').checked;
    const isNew = form.querySelector('.edit-isnew').checked;
    const onSale = form.querySelector('.edit-onsale').checked;
    if (!name || isNaN(price)) {
      showFeedback('#item-error', 'Name and price required');
      return;
    }
    if (image && !/^https?:\/\/.+\..+/.test(image)) {
      showFeedback('#item-error', 'Image URL must be valid and include http(s)://');
      return;
    }
    if (!image) image = '';
    const res = await fetch('/api/admin/items/' + item._id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ name, description, price, category, image, inStock, isNew, onSale })
    });
    if (res.ok) {
      showFeedback('#item-error', 'Item updated!', 'success');
      loadItems();
    } else {
      const data = await res.json();
      if (data.details && Array.isArray(data.details)) {
        const imgErr = data.details.find(d => d.param === 'image');
        if (imgErr) {
          showFeedback('#item-error', 'Image URL must be valid and include http(s)://');
          return;
        }
      }
      showFeedback('#item-error', data.error || 'Failed to update item');
    }
  };
  form.querySelector('.cancel-btn').onclick = () => {
    li.style.display = '';
    li.style.justifyContent = '';
    li.style.alignItems = '';
    loadItems();
  };
  form.querySelector('.delete-btn').onclick = async () => {
    if (confirm(`Delete "${item.name}"?`)) {
      await deleteItem(item._id);
    }
  };
}

async function deleteItem(id) {
  const res = await fetch('/api/admin/items/' + id, {
    method: 'DELETE',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  if (res.ok) {
    showFeedback('#item-error', 'Item deleted!', 'success');
    loadItems();
  } else {
    showFeedback('#item-error', 'Failed to delete item');
  }
}

async function editItem(id, name, description, price, category, image, inStock, isNew, onSale) {
  const res = await fetch('/api/admin/items/' + id, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ name, description, price, category, image, inStock, isNew, onSale })
  });
  if (res.ok) {
    showFeedback('#item-error', 'Item updated!', 'success');
    loadItems();
  } else {
    showFeedback('#item-error', 'Failed to update item');
  }
}

window.deleteItem = deleteItem;
window.editItemPrompt = () => {};

async function loadLogs() {
  const res = await fetch('/api/admin/logs', {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  const logs = await res.json();
  const ul = document.getElementById('logs');
  ul.innerHTML = '';
  logs.slice().reverse().forEach(log => {
    const li = document.createElement('li');
    li.className = 'log-row';
    li.innerHTML = `
      <span class="log-action log-${log.action}">
        <b>${log.action.toUpperCase()}</b>
      </span>
      <span class="log-info">
        <span><b>${log.admin}</b></span>
        <span>${log.item && log.item.name ? `"${log.item.name}"` : log.item}</span>
        <span style="color:#888;">${new Date(log.timestamp).toLocaleString()}</span>
      </span>
    `;
    ul.appendChild(li);
  });
}

function setupExclusiveStatusCheckboxes() {
  const ids = ['item-instock', 'item-isnew', 'item-onsale'];
  ids.forEach(id => {
    const cb = document.getElementById(id);
    cb.addEventListener('change', function() {
      if (this.checked) {
        ids.filter(otherId => otherId !== id).forEach(otherId => {
          document.getElementById(otherId).checked = false;
        });
      }
      updateStatusCheckboxHighlight();
    });
  });
  updateStatusCheckboxHighlight();
}
function updateStatusCheckboxHighlight() {
  const ids = [
    { id: 'item-instock', label: 'item-instock' },
    { id: 'item-isnew', label: 'item-isnew' },
    { id: 'item-onsale', label: 'item-onsale' }
  ];
  ids.forEach(({ id, label }) => {
    const cb = document.getElementById(id);
    const lbl = document.querySelector(`label[for="${label}"]`);
    if (cb.checked) lbl.classList.add('selected');
    else lbl.classList.remove('selected');
  });
}
setupExclusiveStatusCheckboxes();