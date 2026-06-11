const API_URL = window.location.origin + '/backend/api.php?action=';
const IMG_BASE = window.location.origin + '/backend/';

// ===================== STATE =====================
let user = null;
let products = [];
let categories = [];
let cart = [];
let chartVentas = null;
let chartCategorias = null;
let chartTopProductos = null;
let searchDebounceTimer = null;

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

// ===================== LOADING STATES =====================
function setButtonLoading(btn, loading) {
    const textEl = btn.querySelector('.btn-text');
    const loadingEl = btn.querySelector('.btn-loading');
    if (textEl && loadingEl) {
        if (loading) {
            textEl.classList.add('hidden');
            loadingEl.classList.remove('hidden');
            btn.disabled = true;
        } else {
            textEl.classList.remove('hidden');
            loadingEl.classList.add('hidden');
            btn.disabled = false;
        }
    }
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

    if (sectionId === 'dashboard') loadDashboard();
    if (sectionId === 'inventario') loadInventory();
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

// ===================== SIDEBAR TOGGLE =====================
document.getElementById('btn-toggle-sidebar').addEventListener('click', () => {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('collapsed');
    const icon = document.querySelector('#btn-toggle-sidebar i');
    if (sidebar.classList.contains('collapsed')) {
        icon.className = 'ri-menu-unfold-line';
    } else {
        icon.className = 'ri-menu-fold-line';
    }
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

// ===================== KEYBOARD SHORTCUTS =====================
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        // Close any open modal
        document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active'));
        document.getElementById('confirm-dialog').classList.remove('active');
        document.getElementById('lightbox').classList.remove('active');
    }
    if (e.key === 'Enter' && document.getElementById('confirm-dialog').classList.contains('active')) {
        document.getElementById('confirm-accept').click();
    }
});

// ===================== IMAGE UPLOAD HANDLER =====================
function setupImageUpload(fileInputId, previewId, removeButtonId, areaId) {
    const fileInput = document.getElementById(fileInputId);
    const preview = document.getElementById(previewId);
    const removeBtn = document.getElementById(removeButtonId);
    const area = document.getElementById(areaId);

    // Click to select
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            previewImage(fileInput.files[0], preview, removeBtn);
        }
    });

    // Drag and drop
    area.addEventListener('dragover', (e) => {
        e.preventDefault();
        area.classList.add('drag-over');
    });
    area.addEventListener('dragleave', () => {
        area.classList.remove('drag-over');
    });
    area.addEventListener('drop', (e) => {
        e.preventDefault();
        area.classList.remove('drag-over');
        if (e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            if (file.type.startsWith('image/')) {
                // Set file to input
                const dt = new DataTransfer();
                dt.items.add(file);
                fileInput.files = dt.files;
                previewImage(file, preview, removeBtn);
            } else {
                showToast('Solo se permiten archivos de imagen.', 'warning');
            }
        }
    });

    // Remove button
    removeBtn.addEventListener('click', () => {
        fileInput.value = '';
        resetImagePreview(preview, removeBtn);
        // For edit form, mark removal
        const removeInput = document.getElementById('edit-prod-remove-img');
        if (removeInput) removeInput.value = '1';
    });
}

function previewImage(file, previewEl, removeBtn) {
    if (file.size > 2 * 1024 * 1024) {
        showToast('La imagen no debe exceder 2MB.', 'warning');
        return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
        previewEl.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
        previewEl.classList.add('has-image');
        removeBtn.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
}

function resetImagePreview(previewEl, removeBtn) {
    previewEl.innerHTML = `
        <i class="ri-image-add-line"></i>
        <span>Clic o arrastra una imagen</span>
        <small>JPEG, PNG o WebP — máx. 2MB</small>
    `;
    previewEl.classList.remove('has-image');
    removeBtn.classList.add('hidden');
}

// Setup both modals
setupImageUpload('prod-imagen', 'prod-imagen-preview', 'prod-remove-imagen', 'prod-imagen-area');
setupImageUpload('edit-prod-imagen', 'edit-prod-imagen-preview', 'edit-prod-remove-imagen', 'edit-prod-imagen-area');

// ===================== LIGHTBOX =====================
function openLightbox(imgSrc) {
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    lightboxImg.src = imgSrc;
    lightbox.classList.add('active');
}

document.getElementById('lightbox-close').addEventListener('click', () => {
    document.getElementById('lightbox').classList.remove('active');
});
document.getElementById('lightbox').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
        e.currentTarget.classList.remove('active');
    }
});

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

// ===================== DASHBOARD =====================
async function loadDashboard() {
    try {
        const res = await fetch(API_URL + 'get_dashboard_stats');
        const data = await res.json();
        if (data.success) {
            renderDashboard(data.data);
        }
    } catch(e) { console.error(e); }
}

function renderDashboard(stats) {
    // Animate stat cards
    animateCountUp('stat-ventas-hoy', stats.ventas_hoy.total, '$');
    document.getElementById('stat-ventas-hoy-count').textContent = `${stats.ventas_hoy.count} transacciones`;

    animateCountUp('stat-ventas-semana', stats.ventas_semana.total, '$');
    document.getElementById('stat-ventas-semana-count').textContent = `${stats.ventas_semana.count} transacciones`;

    animateCountUp('stat-valor-inventario', stats.valor_inventario, '$');
    document.getElementById('stat-productos-total').textContent = `${stats.productos_total} productos`;

    animateCountUp('stat-alertas-stock', stats.productos_stock_bajo + stats.productos_agotados, '', true);
    document.getElementById('stat-agotados').textContent = `${stats.productos_agotados} agotados`;

    // Charts
    renderVentas7DiasChart(stats.ventas_7_dias);
    renderCategoriasChart(stats.productos_por_categoria);
    renderTopProductosChart(stats.top_productos);
}

function animateCountUp(elementId, targetValue, prefix = '', isInt = false) {
    const el = document.getElementById(elementId);
    const duration = 1200;
    const startTime = performance.now();
    const startValue = 0;

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const currentValue = startValue + (targetValue - startValue) * eased;

        if (isInt) {
            el.textContent = `${prefix}${Math.round(currentValue)}`;
        } else {
            el.textContent = `${prefix}${currentValue.toFixed(2)}`;
        }

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    requestAnimationFrame(update);
}

// Chart colors
const chartColors = {
    primary: '#6366F1',
    primaryLight: 'rgba(99, 102, 241, 0.2)',
    secondary: '#10B981',
    secondaryLight: 'rgba(16, 185, 129, 0.2)',
    palette: ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316']
};

function renderVentas7DiasChart(data) {
    const ctx = document.getElementById('chart-ventas-7dias').getContext('2d');
    if (chartVentas) chartVentas.destroy();

    const labels = data.map(d => {
        const date = new Date(d.fecha + 'T00:00:00');
        return date.toLocaleDateString('es-SV', { weekday: 'short', day: 'numeric' });
    });

    chartVentas = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Ventas ($)',
                data: data.map(d => d.total),
                borderColor: chartColors.primary,
                backgroundColor: chartColors.primaryLight,
                fill: true,
                tension: 0.4,
                borderWidth: 3,
                pointBackgroundColor: chartColors.primary,
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#F8FAFC',
                    bodyColor: '#94A3B8',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    cornerRadius: 8,
                    padding: 12,
                    callbacks: {
                        label: ctx => `$${ctx.parsed.y.toFixed(2)}`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#94A3B8', callback: v => `$${v}` }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#94A3B8' }
                }
            }
        }
    });
}

function renderCategoriasChart(data) {
    const ctx = document.getElementById('chart-categorias').getContext('2d');
    if (chartCategorias) chartCategorias.destroy();

    if (!data || data.length === 0) {
        ctx.font = '14px Outfit';
        ctx.fillStyle = '#94A3B8';
        ctx.textAlign = 'center';
        ctx.fillText('Sin datos de categorías', ctx.canvas.width / 2, ctx.canvas.height / 2);
        return;
    }

    chartCategorias = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.map(d => d.nombre),
            datasets: [{
                data: data.map(d => d.total),
                backgroundColor: chartColors.palette.slice(0, data.length),
                borderColor: 'rgba(15, 23, 42, 0.8)',
                borderWidth: 3,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#94A3B8',
                        padding: 15,
                        usePointStyle: true,
                        font: { family: 'Outfit', size: 12 }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#F8FAFC',
                    bodyColor: '#94A3B8',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    cornerRadius: 8,
                    padding: 12
                }
            }
        }
    });
}

function renderTopProductosChart(data) {
    const ctx = document.getElementById('chart-top-productos').getContext('2d');
    if (chartTopProductos) chartTopProductos.destroy();

    if (!data || data.length === 0) {
        ctx.font = '14px Outfit';
        ctx.fillStyle = '#94A3B8';
        ctx.textAlign = 'center';
        ctx.fillText('Sin datos de ventas', ctx.canvas.width / 2, ctx.canvas.height / 2);
        return;
    }

    chartTopProductos = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => d.nombre),
            datasets: [{
                label: 'Unidades vendidas',
                data: data.map(d => d.total_vendido),
                backgroundColor: chartColors.palette.slice(0, data.length).map(c => c + '99'),
                borderColor: chartColors.palette.slice(0, data.length),
                borderWidth: 2,
                borderRadius: 8,
                barPercentage: 0.6
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#F8FAFC',
                    bodyColor: '#94A3B8',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    cornerRadius: 8,
                    padding: 12
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#94A3B8' }
                },
                y: {
                    grid: { display: false },
                    ticks: { color: '#F8FAFC', font: { family: 'Outfit', weight: '600' } }
                }
            }
        }
    });
}

// ===================== INVENTORY =====================
async function loadInventory() {
    try {
        const res = await fetch(API_URL + 'get_productos');
        const data = await res.json();
        products = data.data || [];
        renderTable();
        updateStats();
        populateFilterCategories();
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

function populateFilterCategories() {
    const sel = document.getElementById('filter-categoria');
    sel.innerHTML = '<option value="">Todas las categorías</option>';
    const cats = [...new Set(products.map(p => p.categoria_nombre).filter(Boolean))];
    cats.forEach(c => {
        sel.innerHTML += `<option value="${c}">${c}</option>`;
    });
}

function getFilteredProducts() {
    const searchVal = document.getElementById('inv-search').value.toLowerCase().trim();
    const catVal = document.getElementById('filter-categoria').value;
    const stockVal = document.getElementById('filter-stock').value;

    let filtered = [...products];

    if (searchVal) {
        filtered = filtered.filter(p =>
            p.nombre.toLowerCase().includes(searchVal) ||
            (p.codigo_barras && p.codigo_barras.toLowerCase().includes(searchVal))
        );
    }
    if (catVal) {
        filtered = filtered.filter(p => p.categoria_nombre === catVal);
    }
    if (stockVal === 'low') {
        filtered = filtered.filter(p => p.stock > 0 && p.stock < 10);
    } else if (stockVal === 'out') {
        filtered = filtered.filter(p => p.stock === 0 || p.stock === '0');
    } else if (stockVal === 'normal') {
        filtered = filtered.filter(p => parseInt(p.stock) >= 10);
    }

    return filtered;
}

function highlightText(text, query) {
    if (!query) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
}

function renderTable(filteredList) {
    const tbody = document.querySelector('#table-products tbody');
    const data = filteredList || getFilteredProducts();
    const searchQuery = document.getElementById('inv-search').value.trim();

    // Update filter results count
    const resultsEl = document.getElementById('filter-results');
    if (searchQuery || document.getElementById('filter-categoria').value || document.getElementById('filter-stock').value) {
        resultsEl.textContent = `${data.length} de ${products.length} productos`;
    } else {
        resultsEl.textContent = '';
    }

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><i class="ri-inbox-line"></i><p>No hay productos registrados aún.</p></div></td></tr>`;
        return;
    }
    tbody.innerHTML = data.map(p => {
        const imgHtml = p.imagen
            ? `<img src="${IMG_BASE}${p.imagen}" alt="${p.nombre}" class="table-thumb" onclick="openLightbox('${IMG_BASE}${p.imagen}')">`
            : `<div class="table-thumb-placeholder"><i class="ri-image-line"></i></div>`;

        return `
        <tr>
            <td>${imgHtml}</td>
            <td><code>${highlightText(p.codigo_barras || '', searchQuery)}</code></td>
            <td>${highlightText(p.nombre, searchQuery)}</td>
            <td><span class="badge">${p.categoria_nombre || 'Sin categoría'}</span></td>
            <td>$${parseFloat(p.precio).toFixed(2)}</td>
            <td>
                <span class="badge ${p.stock < 10 ? (p.stock == 0 ? 'low' : 'warning') : ''}">${p.stock}</span>
            </td>
            <td>
                <div class="actions-cell">
                    <button class="btn-icon-edit" title="Editar" onclick="openEditModal(${p.id_producto})"><i class="ri-edit-line"></i></button>
                    <button class="btn-icon-delete" title="Eliminar" onclick="deleteProducto(${p.id_producto}, '${p.nombre.replace(/'/g, "\\'").replace(/"/g, '&quot;')}')"><i class="ri-delete-bin-line"></i></button>
                </div>
            </td>
        </tr>
    `}).join('');
}

// Inventory filters
document.getElementById('inv-search').addEventListener('input', () => {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => renderTable(), 200);
});
document.getElementById('filter-categoria').addEventListener('change', () => renderTable());
document.getElementById('filter-stock').addEventListener('change', () => renderTable());

// Add Product
document.getElementById('btn-new-product').addEventListener('click', () => {
    clearErrors('form-product');
    document.getElementById('form-product').reset();
    resetImagePreview(document.getElementById('prod-imagen-preview'), document.getElementById('prod-remove-imagen'));
    openModal('modal-product');
});

document.getElementById('form-product').addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors('form-product');

    if (!validateProductForm('')) return;

    const submitBtn = e.target.querySelector('.btn-submit');
    setButtonLoading(submitBtn, true);

    const formData = new FormData();
    formData.append('codigo_barras', document.getElementById('prod-codigo').value.trim());
    formData.append('nombre', document.getElementById('prod-nombre').value.trim());
    formData.append('id_categoria', document.getElementById('prod-categoria').value);
    formData.append('precio', document.getElementById('prod-precio').value);
    formData.append('stock', document.getElementById('prod-stock').value);

    const imgInput = document.getElementById('prod-imagen');
    if (imgInput.files.length > 0) {
        formData.append('imagen', imgInput.files[0]);
    }

    try {
        const res = await fetch(API_URL + 'add_producto', {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        if (data.success) {
            closeModal('modal-product');
            e.target.reset();
            resetImagePreview(document.getElementById('prod-imagen-preview'), document.getElementById('prod-remove-imagen'));
            loadInventory();
            showToast('Producto agregado exitosamente.');
        } else {
            showToast(data.message, 'error');
        }
    } catch(err) {
        showToast('Error de conexión con el servidor.', 'error');
    } finally {
        setButtonLoading(submitBtn, false);
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
    document.getElementById('edit-prod-remove-img').value = '0';

    // Set image preview
    const preview = document.getElementById('edit-prod-imagen-preview');
    const removeBtn = document.getElementById('edit-prod-remove-imagen');
    if (product.imagen) {
        preview.innerHTML = `<img src="${IMG_BASE}${product.imagen}" alt="Preview">`;
        preview.classList.add('has-image');
        removeBtn.classList.remove('hidden');
    } else {
        resetImagePreview(preview, removeBtn);
    }

    // Clear file input
    document.getElementById('edit-prod-imagen').value = '';

    openModal('modal-edit-product');
}

document.getElementById('form-edit-product').addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors('form-edit-product');

    if (!validateProductForm('edit-')) return;

    const submitBtn = e.target.querySelector('.btn-submit');
    setButtonLoading(submitBtn, true);

    const formData = new FormData();
    formData.append('id_producto', document.getElementById('edit-prod-id').value);
    formData.append('codigo_barras', document.getElementById('edit-prod-codigo').value.trim());
    formData.append('nombre', document.getElementById('edit-prod-nombre').value.trim());
    formData.append('id_categoria', document.getElementById('edit-prod-categoria').value);
    formData.append('precio', document.getElementById('edit-prod-precio').value);
    formData.append('stock', document.getElementById('edit-prod-stock').value);
    formData.append('remove_imagen', document.getElementById('edit-prod-remove-img').value);

    const imgInput = document.getElementById('edit-prod-imagen');
    if (imgInput.files.length > 0) {
        formData.append('imagen', imgInput.files[0]);
    }

    try {
        const res = await fetch(API_URL + 'edit_producto', {
            method: 'POST',
            body: formData
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
    } finally {
        setButtonLoading(submitBtn, false);
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

// Export CSV
document.getElementById('btn-export-csv').addEventListener('click', () => {
    window.open(API_URL + 'export_productos', '_blank');
    showToast('Exportando inventario a CSV...');
});

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
                    <button class="btn-icon-delete" title="Eliminar" onclick="deleteCategoria(${c.id_categoria}, '${c.nombre.replace(/'/g, "\\'").replace(/"/g, '&quot;')}')"><i class="ri-delete-bin-line"></i></button>
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

    const submitBtn = e.target.querySelector('.btn-submit');
    setButtonLoading(submitBtn, true);

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
    } finally {
        setButtonLoading(submitBtn, false);
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

    const submitBtn = e.target.querySelector('.btn-submit');
    setButtonLoading(submitBtn, true);

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
    } finally {
        setButtonLoading(submitBtn, false);
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
    grid.innerHTML = products.map(p => {
        const imgHtml = p.imagen
            ? `<div class="pos-card-img"><img src="${IMG_BASE}${p.imagen}" alt="${p.nombre}"></div>`
            : `<div class="pos-card-img placeholder"><i class="ri-tools-line"></i></div>`;
        return `
        <div class="prod-card ${p.stock <= 0 ? 'out-of-stock' : ''}" onclick="addToCart(${p.id_producto})">
            ${imgHtml}
            <h4>${p.nombre}</h4>
            <p>$${parseFloat(p.precio).toFixed(2)}</p>
            <small ${p.stock <= 0 ? 'class="out-of-stock"' : ''}>
                ${p.stock <= 0 ? 'Agotado' : 'Stock: ' + p.stock}
            </small>
        </div>
    `}).join('');
}

document.getElementById('pos-search').addEventListener('input', (e) => {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
        const query = e.target.value.toLowerCase();
        const filtered = products.filter(p => p.nombre.toLowerCase().includes(query) || (p.codigo_barras && p.codigo_barras.includes(query)));
        const grid = document.getElementById('pos-product-grid');
        if (filtered.length === 0) {
            grid.innerHTML = `<div class="empty-state"><i class="ri-search-line"></i><p>No se encontraron productos.</p></div>`;
            return;
        }
        grid.innerHTML = filtered.map(p => {
            const imgHtml = p.imagen
                ? `<div class="pos-card-img"><img src="${IMG_BASE}${p.imagen}" alt="${p.nombre}"></div>`
                : `<div class="pos-card-img placeholder"><i class="ri-tools-line"></i></div>`;
            return `
            <div class="prod-card ${p.stock <= 0 ? 'out-of-stock' : ''}" onclick="addToCart(${p.id_producto})">
                ${imgHtml}
                <h4>${p.nombre}</h4>
                <p>$${parseFloat(p.precio).toFixed(2)}</p>
                <small ${p.stock <= 0 ? 'class="out-of-stock"' : ''}>
                    ${p.stock <= 0 ? 'Agotado' : 'Stock: ' + p.stock}
                </small>
            </div>
        `}).join('');
    }, 250);
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
                // Show ticket
                showTicket(data.id_venta, cart, total);
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

// ===================== TICKET =====================
function showTicket(ventaId, items, total) {
    document.getElementById('ticket-num').textContent = `#${String(ventaId).padStart(4, '0')}`;
    document.getElementById('ticket-fecha').textContent = new Date().toLocaleString('es-SV', { dateStyle: 'medium', timeStyle: 'short' });
    document.getElementById('ticket-cajero').textContent = user ? user.nombre : 'N/A';
    document.getElementById('ticket-total').textContent = `$${total.toFixed(2)}`;

    const tbody = document.getElementById('ticket-items-body');
    tbody.innerHTML = items.map(item => {
        const subtotal = item.precio * item.cantidad;
        return `
            <tr>
                <td>${item.nombre}</td>
                <td>${item.cantidad}</td>
                <td>$${parseFloat(item.precio).toFixed(2)}</td>
                <td>$${subtotal.toFixed(2)}</td>
            </tr>
        `;
    }).join('');

    openModal('modal-ticket');
}

document.getElementById('btn-print-ticket').addEventListener('click', () => {
    window.print();
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
