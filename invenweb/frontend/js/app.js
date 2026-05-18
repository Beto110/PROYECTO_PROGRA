const API_URL = 'http://localhost:8000/backend/api.php?action=';

// State
let user = null;
let products = [];
let categories = [];
let cart = [];

// DOM Elements
const views = document.querySelectorAll('.view');
const sections = document.querySelectorAll('.section');
const navItems = document.querySelectorAll('.nav-item');

// Navigation
function switchView(viewId) {
    views.forEach(v => v.classList.remove('active'));
    document.getElementById(`view-${viewId}`).classList.add('active');
}

function switchSection(sectionId) {
    sections.forEach(s => s.classList.remove('active'));
    document.getElementById(`section-${sectionId}`).classList.add('active');
    
    navItems.forEach(n => n.classList.remove('active'));
    document.querySelector(`.nav-item[data-target="${sectionId}"]`).classList.add('active');

    if (sectionId === 'dashboard') loadInventory();
    if (sectionId === 'pos') renderPOSProducts();
}

navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        switchSection(item.dataset.target);
    });
});

// Auth
document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const res = await fetch(API_URL + 'login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (data.success) {
            user = data.user;
            document.getElementById('user-name').innerText = user.nombre;
            switchView('main');
            switchSection('dashboard');
            loadCategories();
        } else {
            document.getElementById('login-error').innerText = data.message;
        }
    } catch (err) {
        document.getElementById('login-error').innerText = "Error de conexión con el servidor.";
    }
});

document.getElementById('btn-logout').addEventListener('click', () => {
    user = null;
    switchView('login');
});

// Inventory
async function loadInventory() {
    try {
        const res = await fetch(API_URL + 'get_productos');
        const data = await res.json();
        products = data.data || [];
        renderTable();
        updateStats();
    } catch(e) { console.error(e); }
}

async function loadCategories() {
    try {
        const res = await fetch(API_URL + 'get_categorias');
        const data = await res.json();
        categories = data.data || [];
        const select = document.getElementById('prod-categoria');
        select.innerHTML = categories.map(c => `<option value="${c.id_categoria}">${c.nombre}</option>`).join('');
    } catch(e) { console.error(e); }
}

function updateStats() {
    document.getElementById('stat-total-products').innerText = products.length;
    document.getElementById('stat-low-stock').innerText = products.filter(p => p.stock < 10).length;
}

function renderTable() {
    const tbody = document.querySelector('#table-products tbody');
    tbody.innerHTML = products.map(p => `
        <tr>
            <td>${p.codigo_barras}</td>
            <td>${p.nombre}</td>
            <td><span class="badge">${p.categoria_nombre || '-'}</span></td>
            <td>$${parseFloat(p.precio).toFixed(2)}</td>
            <td>
                <span class="badge ${p.stock < 10 ? 'low' : ''}">${p.stock}</span>
            </td>
            <td>
                <button class="btn-icon" style="color:var(--text-main)"><i class="ri-edit-line"></i></button>
            </td>
        </tr>
    `).join('');
}

// Modal Product
const modalProduct = document.getElementById('modal-product');
document.getElementById('btn-new-product').addEventListener('click', () => modalProduct.classList.add('active'));
document.querySelector('.close-btn').addEventListener('click', () => modalProduct.classList.remove('active'));

document.getElementById('form-product').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        codigo_barras: document.getElementById('prod-codigo').value,
        nombre: document.getElementById('prod-nombre').value,
        id_categoria: document.getElementById('prod-categoria').value,
        precio: document.getElementById('prod-precio').value,
        stock: document.getElementById('prod-stock').value
    };

    const res = await fetch(API_URL + 'add_producto', {
        method: 'POST',
        body: JSON.stringify(payload)
    });
    const data = await res.json();
    if(data.success) {
        modalProduct.classList.remove('active');
        e.target.reset();
        loadInventory();
    } else {
        alert("Error: " + data.message);
    }
});

// POS System
function renderPOSProducts() {
    const grid = document.getElementById('pos-product-grid');
    grid.innerHTML = products.map(p => `
        <div class="prod-card" onclick="addToCart(${p.id_producto})">
            <h4>${p.nombre}</h4>
            <p>$${parseFloat(p.precio).toFixed(2)}</p>
            <small>Stock: ${p.stock}</small>
        </div>
    `).join('');
}

document.getElementById('pos-search').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const filtered = products.filter(p => p.nombre.toLowerCase().includes(query) || p.codigo_barras.includes(query));
    const grid = document.getElementById('pos-product-grid');
    grid.innerHTML = filtered.map(p => `
        <div class="prod-card" onclick="addToCart(${p.id_producto})">
            <h4>${p.nombre}</h4>
            <p>$${parseFloat(p.precio).toFixed(2)}</p>
            <small>Stock: ${p.stock}</small>
        </div>
    `).join('');
});

function addToCart(id) {
    const product = products.find(p => p.id_producto == id);
    if (!product || product.stock <= 0) return alert("Sin stock");
    
    const existing = cart.find(c => c.id_producto == id);
    if (existing) {
        if (existing.cantidad < product.stock) {
            existing.cantidad++;
        } else {
            alert("No hay suficiente stock");
        }
    } else {
        cart.push({ ...product, cantidad: 1 });
    }
    renderCart();
}

function updateCartQty(id, delta) {
    const item = cart.find(c => c.id_producto == id);
    if (item) {
        item.cantidad += delta;
        if (item.cantidad <= 0) {
            cart = cart.filter(c => c.id_producto != id);
        } else if (item.cantidad > products.find(p => p.id_producto == id).stock) {
            item.cantidad--;
            alert("No hay suficiente stock");
        }
    }
    renderCart();
}

function renderCart() {
    const cartEl = document.getElementById('cart-items');
    let total = 0;
    cartEl.innerHTML = cart.map(item => {
        const subtotal = item.precio * item.cantidad;
        total += subtotal;
        return `
            <div class="cart-item">
                <div class="cart-item-info">
                    <h4>${item.nombre}</h4>
                    <p>$${parseFloat(item.precio).toFixed(2)} c/u</p>
                </div>
                <div class="cart-item-controls">
                    <button class="btn-icon" onclick="updateCartQty(${item.id_producto}, -1)"><i class="ri-subtract-line"></i></button>
                    <span>${item.cantidad}</span>
                    <button class="btn-icon" onclick="updateCartQty(${item.id_producto}, 1)"><i class="ri-add-line"></i></button>
                    <span style="margin-left:1rem;font-weight:bold;">$${subtotal.toFixed(2)}</span>
                </div>
            </div>
        `;
    }).join('');
    
    document.getElementById('cart-subtotal').innerText = `$${total.toFixed(2)}`;
    document.getElementById('cart-total').innerText = `$${total.toFixed(2)}`;
}

document.getElementById('btn-checkout').addEventListener('click', async () => {
    if (cart.length === 0) return alert("El carrito está vacío");
    
    const total = cart.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    const payload = {
        user_id: user ? user.id : 1,
        items: cart,
        total: total
    };

    const res = await fetch(API_URL + 'process_venta', {
        method: 'POST',
        body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
        alert("Venta procesada con éxito");
        cart = [];
        renderCart();
        loadInventory(); // Update stock in frontend
    } else {
        alert("Error al procesar la venta: " + data.message);
    }
});
