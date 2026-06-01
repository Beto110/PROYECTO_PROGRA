const API_URL = 'http://localhost:8000/backend/api.php?action=';

// ===================== STATE =====================
let user = null;
let products = [];
let categories = [];
let cart = [];

// ===================== DOM =====================
const views = document.querySelectorAll('.view');
const sections = document.querySelectorAll('.section');
const navItems = document.querySelectorAll('.nav-item');

// ===================== TOAST NOTIFICATIONS =====================
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icons = { success: 'ri-check-line', error: 'ri-error-warning-line', warning: 'ri-alarm-warning-line' };
    toast.innerHTML = `<i class="${icons[type] || icons.success}"></i><span class="toast-msg">${message}</span>`;
    container.appendChild(toast);

    const removeToast = () => {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 300);
    };

    toast.addEventListener('click', removeToast);
    setTimeout(removeToast, 4000);
}

// ===================== CONFIRM DIALOG =====================
let confirmCallback = null;

function showConfirm(title, message, onConfirm) {
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-message').textContent = message;
    document.getElementById('confirm-dialog').classList.add('active');
    confirmCallback = onConfirm;
}

document.getElementById('confirm-cancel').addEventListener('click', () => {
    document.getElementById('confirm-dialog').classList.remove('active');
    confirmCallback = null;
});

document.getElementById('confirm-accept').addEventListener('click', () => {
    document.getElementById('confirm-dialog').classList.remove('active');
    if (confirmCallback) confirmCallback();
    confirmCallback = null;
});

// ===================== FORM VALIDATION =====================
function clearErrors(formId) {
    const form = document.getElementById(formId);
    form.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
    form.querySelectorAll('.field-error-msg').forEach(el => {
        el.textContent = '';
        el.classList.remove('visible');
    });
}

function showFieldError(inputId, errorId, message) {
    const input = document.getElementById(inputId);
    const error = document.getElementById(errorId);
    if (input) input.classList.add('input-error');
    if (error) {
        error.textContent = message;
        error.classList.add('visible');
    }
}

function validateProductForm(prefix = '') {
    const p = prefix;
    let valid = true;

    const codigo = document.getElementById(`${p}prod-codigo`).value.trim();
    const nombre = document.getElementById(`${p}prod-nombre`).value.trim();
    const categoria = document.getElementById(`${p}prod-categoria`).value;
    const precio = document.getElementById(`${p}prod-precio`).value;
    const stock = document.getElementById(`${p}prod-stock`).value;

    if (!codigo) {
        showFieldError(`${p}prod-codigo`, `error-${p}prod-codigo`, 'El código de barras es requerido.');
        valid = false;
    }
    if (!nombre) {
        showFieldError(`${p}prod-nombre`, `error-${p}prod-nombre`, 'El nombre es requerido.');
        valid = false;
    } else if (nombre.length < 3) {
        showFieldError(`${p}prod-nombre`, `error-${p}prod-nombre`, 'Mínimo 3 caracteres.');
        valid = false;
    }
    if (!categoria) {
        showFieldError(`${p}prod-categoria`, `error-${p}prod-categoria`, 'Seleccione una categoría.');
        valid = false;
    }
    if (!precio || isNaN(precio) || parseFloat(precio) <= 0) {
        showFieldError(`${p}prod-precio`, `error-${p}prod-precio`, 'Ingrese un precio mayor a 0.');
        valid = false;
    }
    if (stock === '' || isNaN(stock) || parseInt(stock) < 0) {
        showFieldError(`${p}prod-stock`, `error-${p}prod-stock`, 'Ingrese un stock válido (≥ 0).');
        valid = false;
    }

    return valid;
}

function validateCategoriaForm(prefix = '') {
    const p = prefix;
    let valid = true;

    const nombre = document.getElementById(`${p}cat-nombre`).value.trim();
    if (!nombre) {
        showFieldError(`${p}cat-nombre`, `error-${p}cat-nombre`, 'El nombre es requerido.');
        valid = false;
    } else if (nombre.length < 2) {
        showFieldError(`${p}cat-nombre`, `error-${p}cat-nombre`, 'Mínimo 2 caracteres.');
        valid = false;
    }

    return valid;
}

// ===================== NAVIGATION =====================
function switchView(viewId) {
    views.forEach(v => v.classList.remove('active'));
    document.getElementById(`view-${viewId}`).classList.add('active');
}

function switchSection(sectionId) {
    sections.forEach(s => s.classList.remove('active'));
    document.getElementById(`section-${sectionId}`).classList.add('active');

    navItems.forEach(n => n.classList.remove('active'));
    const navTarget = document.querySelector(`.nav-item[data-target="${sectionId}"]`);
    if (navTarget) navTarget.classList.add('active');

    if (sectionId === 'dashboard') loadInventory();
    if (sectionId === 'categorias') loadCategoriasTable();
    if (sectionId === 'pos') renderPOSProducts();
    if (sectionId === 'ventas') loadVentas();
}

navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        switchSection(item.dataset.target);
    });
});

// ===================== MODALS =====================
document.querySelectorAll('.close-btn[data-close]').forEach(btn => {
    btn.addEventListener('click', () => {
        const modalId = btn.getAttribute('data-close');
        document.getElementById(modalId).classList.remove('active');
    });
});

// Close modals when clicking outside
document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
    });
});

function openModal(id) {
    document.getElementById(id).classList.add('active');
}
function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

// ===================== AUTH =====================
document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors('form-login');

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    let valid = true;

    if (!email) {
        showFieldError('login-email', 'error-login-email', 'El correo es requerido.');
        valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showFieldError('login-email', 'error-login-email', 'Formato de correo no válido.');
        valid = false;
    }
    if (!password) {
        showFieldError('login-password', 'error-login-password', 'La contraseña es requerida.');
        valid = false;
    }

    if (!valid) return;

    try {
        const res = await fetch(API_URL + 'login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (data.success) {
            user = data.user;
            document.getElementById('user-name').innerText = user.nombre;
            switchView('main');
            loadCategories();
            switchSection('dashboard');
            showToast(`¡Bienvenido, ${user.nombre}!`);
        } else {
            document.getElementById('login-error').innerText = data.message;
        }
    } catch (err) {
        document.getElementById('login-error').innerText = "Error de conexión con el servidor.";
    }
});

document.getElementById('btn-logout').addEventListener('click', () => {
    showConfirm('Cerrar Sesión', '¿Deseas cerrar sesión?', () => {
        user = null;
        cart = [];
        switchView('login');
        showToast('Sesión cerrada.', 'warning');
    });
});

// ===================== INVENTORY =====================
async function loadInventory() {
    try {
        const res = await fetch(API_URL + 'get_productos');
        const data = await res.json();
        products = data.data || [];
        renderTable();
        updateStats();
        renderPOSProducts();
    } catch(e) { console.error(e); }
}

async function loadCategories() {
    try {
        const res = await fetch(API_URL + 'get_categorias');
        const data = await res.json();
        categories = data.data || [];
        const html = categories.map(c => `<option value="${c.id_categoria}">${c.nombre}</option>`).join('');
        document.getElementById('prod-categoria').innerHTML = html;
        document.getElementById('edit-prod-categoria').innerHTML = html;
        document.getElementById('stat-total-categorias').innerText = categories.length;
    } catch(e) { console.error(e); }
}

function updateStats() {
    document.getElementById('stat-total-products').innerText = products.length;
    document.getElementById('stat-low-stock').innerText = products.filter(p => p.stock < 10).length;
}

function renderTable() {
    const tbody = document.querySelector('#table-products tbody');
    if (products.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><i class="ri-inbox-line"></i><p>No hay productos registrados aún.</p></div></td></tr>`;
        return;
    }
    tbody.innerHTML = products.map(p => `
        <tr>
            <td><code>${p.codigo_barras}</code></td>
            <td>${p.nombre}</td>
            <td><span class="badge">${p.categoria_nombre || 'Sin categoría'}</span></td>
            <td>$${parseFloat(p.precio).toFixed(2)}</td>
            <td>
                <span class="badge ${p.stock < 10 ? (p.stock === 0 ? 'low' : 'warning') : ''}">${p.stock}</span>
            </td>
            <td>
                <div class="actions-cell">
                    <button class="btn-icon-edit" title="Editar" onclick="openEditModal(${p.id_producto})"><i class="ri-edit-line"></i></button>
                    <button class="btn-icon-delete" title="Eliminar" onclick="deleteProducto(${p.id_producto}, '${p.nombre.replace(/'/g, "\\'")}')"><i class="ri-delete-bin-line"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Add Product
document.getElementById('btn-new-product').addEventListener('click', () => {
    clearErrors('form-product');
    document.getElementById('form-product').reset();
    openModal('modal-product');
});

document.getElementById('form-product').addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors('form-product');

    if (!validateProductForm('')) return;

    const payload = {
        codigo_barras: document.getElementById('prod-codigo').value.trim(),
        nombre: document.getElementById('prod-nombre').value.trim(),
        id_categoria: document.getElementById('prod-categoria').value,
        precio: document.getElementById('prod-precio').value,
        stock: document.getElementById('prod-stock').value
    };

    try {
        const res = await fetch(API_URL + 'add_producto', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
            closeModal('modal-product');
            e.target.reset();
            loadInventory();
            showToast('Producto agregado exitosamente.');
        } else {
            showToast(data.message, 'error');
        }
    } catch(err) {
        showToast('Error de conexión con el servidor.', 'error');
    }
});

// Edit Product
function openEditModal(id) {
    const product = products.find(p => p.id_producto == id);
    if (!product) return;

    clearErrors('form-edit-product');
    document.getElementById('edit-prod-id').value = product.id_producto;
    document.getElementById('edit-prod-codigo').value = product.codigo_barras;
    document.getElementById('edit-prod-nombre').value = product.nombre;
    document.getElementById('edit-prod-categoria').value = product.id_categoria;
    document.getElementById('edit-prod-precio').value = product.precio;
    document.getElementById('edit-prod-stock').value = product.stock;

    openModal('modal-edit-product');
}

document.getElementById('form-edit-product').addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors('form-edit-product');

    if (!validateProductForm('edit-')) return;

    const payload = {
        id_producto: document.getElementById('edit-prod-id').value,
        codigo_barras: document.getElementById('edit-prod-codigo').value.trim(),
        nombre: document.getElementById('edit-prod-nombre').value.trim(),
        id_categoria: document.getElementById('edit-prod-categoria').value,
        precio: document.getElementById('edit-prod-precio').value,
        stock: document.getElementById('edit-prod-stock').value
    };

    try {
        const res = await fetch(API_URL + 'edit_producto', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
            closeModal('modal-edit-product');
            loadInventory();
            showToast('Producto actualizado exitosamente.');
        } else {
            showToast(data.message, 'error');
        }
    } catch(err) {
        showToast('Error de conexión con el servidor.', 'error');
    }
});

// Delete Product
function deleteProducto(id, nombre) {
    showConfirm('Eliminar Producto', `¿Eliminar el producto "${nombre}"? Esta acción no se puede deshacer.`, async () => {
        try {
            const res = await fetch(API_URL + 'delete_producto', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_producto: id })
            });
            const data = await res.json();
            if (data.success) {
                loadInventory();
                showToast('Producto eliminado.');
            } else {
                showToast(data.message, 'error');
            }
        } catch(err) {
            showToast('Error de conexión con el servidor.', 'error');
        }
    });
}

// ===================== CATEGORIAS =====================
async function loadCategoriasTable() {
    try {
        const res = await fetch(API_URL + 'get_categorias');
        const data = await res.json();
        categories = data.data || [];
        renderCategoriasTable();
        // Also update the select dropdowns
        const html = categories.map(c => `<option value="${c.id_categoria}">${c.nombre}</option>`).join('');
        document.getElementById('prod-categoria').innerHTML = html;
        document.getElementById('edit-prod-categoria').innerHTML = html;
        document.getElementById('stat-total-categorias').innerText = categories.length;
    } catch(e) { console.error(e); }
}

function renderCategoriasTable() {
    const tbody = document.querySelector('#table-categorias tbody');
    if (categories.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><i class="ri-folder-open-line"></i><p>No hay categorías registradas aún.</p></div></td></tr>`;
        return;
    }
    tbody.innerHTML = categories.map(c => `
        <tr>
            <td>${c.id_categoria}</td>
            <td><strong>${c.nombre}</strong></td>
            <td>${c.descripcion || '<span style="color:var(--text-muted)">—</span>'}</td>
            <td><span class="badge">${c.total_productos || 0}</span></td>
            <td>
                <div class="actions-cell">
                    <button class="btn-icon-edit" title="Editar" onclick="openEditCategoriaModal(${c.id_categoria})"><i class="ri-edit-line"></i></button>
                    <button class="btn-icon-delete" title="Eliminar" onclick="deleteCategoria(${c.id_categoria}, '${c.nombre.replace(/'/g, "\\'")}')"><i class="ri-delete-bin-line"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Add Categoria
document.getElementById('btn-new-categoria').addEventListener('click', () => {
    clearErrors('form-categoria');
    document.getElementById('form-categoria').reset();
    openModal('modal-categoria');
});

document.getElementById('form-categoria').addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors('form-categoria');

    if (!validateCategoriaForm('')) return;

    const payload = {
        nombre: document.getElementById('cat-nombre').value.trim(),
        descripcion: document.getElementById('cat-descripcion').value.trim()
    };

    try {
        const res = await fetch(API_URL + 'add_categoria', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
            closeModal('modal-categoria');
            e.target.reset();
            loadCategoriasTable();
            showToast('Categoría creada exitosamente.');
        } else {
            showToast(data.message, 'error');
        }
    } catch(err) {
        showToast('Error de conexión con el servidor.', 'error');
    }
});

// Edit Categoria
function openEditCategoriaModal(id) {
    const cat = categories.find(c => c.id_categoria == id);
    if (!cat) return;

    clearErrors('form-edit-categoria');
    document.getElementById('edit-cat-id').value = cat.id_categoria;
    document.getElementById('edit-cat-nombre').value = cat.nombre;
    document.getElementById('edit-cat-descripcion').value = cat.descripcion || '';

    openModal('modal-edit-categoria');
}

document.getElementById('form-edit-categoria').addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors('form-edit-categoria');

    if (!validateCategoriaForm('edit-')) return;

    const payload = {
        id_categoria: document.getElementById('edit-cat-id').value,
        nombre: document.getElementById('edit-cat-nombre').value.trim(),
        descripcion: document.getElementById('edit-cat-descripcion').value.trim()
    };

    try {
        const res = await fetch(API_URL + 'edit_categoria', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
            closeModal('modal-edit-categoria');
            loadCategoriasTable();
            showToast('Categoría actualizada exitosamente.');
        } else {
            showToast(data.message, 'error');
        }
    } catch(err) {
        showToast('Error de conexión con el servidor.', 'error');
    }
});

// Delete Categoria
function deleteCategoria(id, nombre) {
    showConfirm('Eliminar Categoría', `¿Eliminar la categoría "${nombre}"? No se podrá eliminar si tiene productos asociados.`, async () => {
        try {
            const res = await fetch(API_URL + 'delete_categoria', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_categoria: id })
            });
            const data = await res.json();
            if (data.success) {
                loadCategoriasTable();
                showToast('Categoría eliminada.');
            } else {
                showToast(data.message, 'error');
            }
        } catch(err) {
            showToast('Error de conexión con el servidor.', 'error');
        }
    });
}

// ===================== POS SYSTEM =====================
function renderPOSProducts() {
    const grid = document.getElementById('pos-product-grid');
    if (products.length === 0) {
        grid.innerHTML = `<div class="empty-state"><i class="ri-shopping-bag-line"></i><p>No hay productos disponibles.</p></div>`;
        return;
    }
    grid.innerHTML = products.map(p => `
        <div class="prod-card ${p.stock <= 0 ? 'out-of-stock' : ''}" onclick="addToCart(${p.id_producto})">
            <h4>${p.nombre}</h4>
            <p>$${parseFloat(p.precio).toFixed(2)}</p>
            <small ${p.stock <= 0 ? 'class="out-of-stock"' : ''}>
                ${p.stock <= 0 ? 'Agotado' : 'Stock: ' + p.stock}
            </small>
        </div>
    `).join('');
}

document.getElementById('pos-search').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const filtered = products.filter(p => p.nombre.toLowerCase().includes(query) || (p.codigo_barras && p.codigo_barras.includes(query)));
    const grid = document.getElementById('pos-product-grid');
    if (filtered.length === 0) {
        grid.innerHTML = `<div class="empty-state"><i class="ri-search-line"></i><p>No se encontraron productos.</p></div>`;
        return;
    }
    grid.innerHTML = filtered.map(p => `
        <div class="prod-card ${p.stock <= 0 ? 'out-of-stock' : ''}" onclick="addToCart(${p.id_producto})">
            <h4>${p.nombre}</h4>
            <p>$${parseFloat(p.precio).toFixed(2)}</p>
            <small ${p.stock <= 0 ? 'class="out-of-stock"' : ''}>
                ${p.stock <= 0 ? 'Agotado' : 'Stock: ' + p.stock}
            </small>
        </div>
    `).join('');
});

function addToCart(id) {
    const product = products.find(p => p.id_producto == id);
    if (!product || product.stock <= 0) {
        showToast('Producto sin stock disponible.', 'warning');
        return;
    }

    const existing = cart.find(c => c.id_producto == id);
    if (existing) {
        if (existing.cantidad < product.stock) {
            existing.cantidad++;
        } else {
            showToast('No hay suficiente stock disponible.', 'warning');
            return;
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
            showToast('No hay suficiente stock disponible.', 'warning');
        }
    }
    renderCart();
}

function removeFromCart(id) {
    cart = cart.filter(c => c.id_producto != id);
    renderCart();
}

function renderCart() {
    const cartEl = document.getElementById('cart-items');

    if (cart.length === 0) {
        cartEl.innerHTML = `<div class="cart-empty"><i class="ri-shopping-basket-line"></i>Agrega productos al carrito</div>`;
        document.getElementById('cart-subtotal').innerText = '$0.00';
        document.getElementById('cart-total').innerText = '$0.00';
        return;
    }

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
                    <button class="btn-icon" style="color:var(--text-main)" onclick="updateCartQty(${item.id_producto}, -1)"><i class="ri-subtract-line"></i></button>
                    <span>${item.cantidad}</span>
                    <button class="btn-icon" style="color:var(--text-main)" onclick="updateCartQty(${item.id_producto}, 1)"><i class="ri-add-line"></i></button>
                    <span style="margin-left:0.8rem;font-weight:bold;min-width:60px;text-align:right;">$${subtotal.toFixed(2)}</span>
                    <button class="btn-icon-delete" onclick="removeFromCart(${item.id_producto})" title="Quitar"><i class="ri-close-line"></i></button>
                </div>
            </div>
        `;
    }).join('');

    document.getElementById('cart-subtotal').innerText = `$${total.toFixed(2)}`;
    document.getElementById('cart-total').innerText = `$${total.toFixed(2)}`;
}

document.getElementById('btn-checkout').addEventListener('click', async () => {
    if (cart.length === 0) {
        showToast('El carrito está vacío.', 'warning');
        return;
    }

    showConfirm('Confirmar Venta', `¿Procesar venta por $${cart.reduce((s, i) => s + i.precio * i.cantidad, 0).toFixed(2)}?`, async () => {
        const total = cart.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
        const payload = {
            user_id: user ? user.id : 1,
            items: cart,
            total: total
        };

        try {
            const res = await fetch(API_URL + 'process_venta', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                showToast('¡Venta procesada con éxito!');
                cart = [];
                renderCart();
                loadInventory();
            } else {
                showToast('Error: ' + data.message, 'error');
            }
        } catch(err) {
            showToast('Error de conexión con el servidor.', 'error');
        }
    });
});

// ===================== HISTORIAL DE VENTAS =====================
async function loadVentas() {
    try {
        const res = await fetch(API_URL + 'get_ventas');
        const data = await res.json();
        renderVentasTable(data.data || []);
    } catch(e) { console.error(e); }
}

function renderVentasTable(ventas) {
    const tbody = document.querySelector('#table-ventas tbody');
    if (ventas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><i class="ri-file-list-3-line"></i><p>No hay ventas registradas aún.</p></div></td></tr>`;
        return;
    }
    tbody.innerHTML = ventas.map(v => {
        const fecha = new Date(v.fecha_hora).toLocaleString('es-SV', { dateStyle: 'medium', timeStyle: 'short' });
        const detallesHtml = v.detalles && v.detalles.length > 0
            ? `<div class="venta-detalles" id="detalle-${v.id_venta}">
                <table>
                    <thead><tr><th>Producto</th><th>Cant.</th><th>P. Unit.</th><th>Subtotal</th></tr></thead>
                    <tbody>
                        ${v.detalles.map(d => `
                            <tr>
                                <td>${d.producto_nombre || 'Producto eliminado'}</td>
                                <td>${d.cantidad}</td>
                                <td>$${parseFloat(d.precio_unitario).toFixed(2)}</td>
                                <td>$${(d.cantidad * d.precio_unitario).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
               </div>`
            : '';

        return `
            <tr>
                <td><strong>#${v.id_venta}</strong></td>
                <td>${fecha}</td>
                <td>${v.cajero || 'N/A'}</td>
                <td><strong>$${parseFloat(v.total).toFixed(2)}</strong></td>
                <td>
                    <button class="venta-detail-toggle" onclick="toggleVentaDetail(${v.id_venta})">
                        <i class="ri-eye-line"></i> Ver
                    </button>
                    ${detallesHtml}
                </td>
            </tr>
        `;
    }).join('');
}

function toggleVentaDetail(id) {
    const detail = document.getElementById(`detalle-${id}`);
    if (detail) {
        detail.classList.toggle('visible');
    }
}

// ===================== INIT =====================
// Initial cart render
renderCart();
