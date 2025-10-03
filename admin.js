// Admin Panel for МакТабак Store
const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

// State management
let state = {
    products: {},
    currentCategory: '',
    editingProduct: null,
    productToDelete: null
};

// Categories
const CATEGORIES = [
    { id: "new", name: "Новинки от МАК ТАБАК", icon: "✨" },
    { id: "standard", name: "Стандартные бленды", icon: "📦" },
    { id: "burley", name: "BURLEY", icon: "🍂" },
    { id: "medium", name: "Средняя крепость", icon: "⚖️" },
    { id: "strong", name: "Крепкий табак", icon: "💪" },
    { id: "superstrong", name: "Очень крепкий табак", icon: "🔥" },
    { id: "musthave", name: "MUSTHAVE", icon: "⭐" },
    { id: "darkside", name: "DARKSIDE", icon: "🌑" },
    { id: "blackburn", name: "BLACKBURN", icon: "🖤" },
    { id: "spectrum", name: "SPECTRUM", icon: "🌈" },
    { id: "element", name: "ELEMENT", icon: "💧" },
    { id: "tangiers", name: "TANGIERS", icon: "🌴" }
];

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await loadProducts();
    renderCategories();
});

// Load products from storage
async function loadProducts() {
    try {
        // Try to load from GitHub
        const response = await fetch(`https://raw.githubusercontent.com/artemperekrestov777-lab/telegram-webapp/main/products.json?t=${Date.now()}`);

        if (response.ok) {
            const data = await response.json();
            state.products = data || {};
        } else {
            // Load from local storage if GitHub fails
            const stored = localStorage.getItem('admin_products');
            if (stored) {
                state.products = JSON.parse(stored);
            } else {
                // Initialize empty structure
                state.products = {};
                CATEGORIES.forEach(cat => {
                    state.products[cat.id] = [];
                });
            }
        }
    } catch (error) {
        console.error('Error loading products:', error);
        // Initialize empty structure on error
        state.products = {};
        CATEGORIES.forEach(cat => {
            state.products[cat.id] = [];
        });
    }
}

// Render categories dropdown
function renderCategories() {
    const categorySelect = document.getElementById('categorySelect');
    const productCategory = document.getElementById('productCategory');

    categorySelect.innerHTML = '<option value="">Выберите категорию</option>';
    productCategory.innerHTML = '<option value="">Выберите категорию</option>';

    CATEGORIES.forEach(cat => {
        categorySelect.innerHTML += `<option value="${cat.id}">${cat.icon} ${cat.name}</option>`;
        productCategory.innerHTML += `<option value="${cat.id}">${cat.icon} ${cat.name}</option>`;
    });
}

// Load products for selected category
function loadCategoryProducts() {
    const category = document.getElementById('categorySelect').value;

    if (!category) {
        document.getElementById('productsList').innerHTML = '<div class="empty-state"><div class="empty-state-icon">📦</div><p>Выберите категорию</p></div>';
        return;
    }

    state.currentCategory = category;
    const products = state.products[category] || [];

    if (products.length === 0) {
        document.getElementById('productsList').innerHTML = '<div class="empty-state"><div class="empty-state-icon">📦</div><p>В этой категории нет товаров</p></div>';
        return;
    }

    const productsList = document.getElementById('productsList');
    productsList.innerHTML = products.map((product, index) => `
        <div class="product-card" data-index="${index}">
            <div class="product-image">
                ${product.image ? `<img src="${product.image}" alt="${product.name}">` : '<div class="no-image">Нет фото</div>'}
            </div>
            <div class="product-info">
                <h3>${product.name}</h3>
                <p class="product-description">${product.description || 'Без описания'}</p>
                <div class="product-details">
                    <span class="product-price">${product.price} ₽</span>
                    ${product.weight ? `<span class="product-weight">${product.weight}г</span>` : '<span class="product-unit">За штуку</span>'}
                </div>
            </div>
            <div class="product-actions">
                <button class="btn-edit" onclick="editProduct(${index})">✏️ Изменить</button>
                <button class="btn-delete" onclick="deleteProduct(${index})">🗑️ Удалить</button>
            </div>
        </div>
    `).join('');
}

// Open add product modal
function openAddProduct() {
    state.editingProduct = null;
    document.getElementById('modalTitle').textContent = 'Добавить товар';
    document.getElementById('productForm').reset();
    document.getElementById('imagePreview').innerHTML = '';
    document.getElementById('productModal').classList.remove('hidden');
}

// Edit product
function editProduct(index) {
    const category = state.currentCategory;
    const product = state.products[category][index];

    state.editingProduct = { category, index };

    document.getElementById('modalTitle').textContent = 'Редактировать товар';
    document.getElementById('productName').value = product.name;
    document.getElementById('productCategory').value = category;
    document.getElementById('productPrice').value = product.price;
    document.getElementById('productWeight').value = product.weight || '';
    document.getElementById('productDescription').value = product.description || '';

    if (product.image) {
        document.getElementById('imagePreview').innerHTML = `<img src="${product.image}" alt="${product.name}">`;
    }

    document.getElementById('productModal').classList.remove('hidden');
}

// Delete product
function deleteProduct(index) {
    state.productToDelete = { category: state.currentCategory, index };
    document.getElementById('deleteModal').classList.remove('hidden');
}

// Confirm delete
function confirmDelete() {
    if (state.productToDelete) {
        const { category, index } = state.productToDelete;
        state.products[category].splice(index, 1);
        saveToLocalStorage();
        loadCategoryProducts();
        closeDeleteModal();
        showNotification('Товар удален', 'success');
    }
}

// Close delete modal
function closeDeleteModal() {
    state.productToDelete = null;
    document.getElementById('deleteModal').classList.add('hidden');
}

// Close product modal
function closeProductModal() {
    state.editingProduct = null;
    document.getElementById('productModal').classList.add('hidden');
}

// Preview image
function previewImage(event) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('imagePreview').innerHTML = `<img src="${e.target.result}" alt="Preview">`;
        };
        reader.readAsDataURL(file);
    }
}

// Save product
async function saveProduct(event) {
    event.preventDefault();

    const name = document.getElementById('productName').value.trim();
    const category = document.getElementById('productCategory').value;
    const price = parseInt(document.getElementById('productPrice').value);
    const weight = document.getElementById('productWeight').value ? parseInt(document.getElementById('productWeight').value) : null;
    const description = document.getElementById('productDescription').value.trim();

    if (!name || !category || !price) {
        showNotification('Заполните все обязательные поля', 'error');
        return;
    }

    const product = {
        name,
        price,
        description,
        inStock: true
    };

    if (weight) {
        product.weight = weight;
    }

    // Handle image
    const imageFile = document.getElementById('productImage').files[0];
    if (imageFile && imageFile.type.startsWith('image/')) {
        // Convert image to base64
        const reader = new FileReader();
        reader.onload = function(e) {
            product.image = e.target.result;
            saveProductData(category, product);
        };
        reader.readAsDataURL(imageFile);
    } else if (state.editingProduct) {
        // Keep existing image if editing
        const existing = state.products[state.editingProduct.category][state.editingProduct.index];
        if (existing.image) {
            product.image = existing.image;
        }
        saveProductData(category, product);
    } else {
        saveProductData(category, product);
    }
}

// Save product data
function saveProductData(category, product) {
    if (!state.products[category]) {
        state.products[category] = [];
    }

    if (state.editingProduct) {
        const { category: oldCategory, index } = state.editingProduct;

        // If category changed, move product
        if (oldCategory !== category) {
            state.products[oldCategory].splice(index, 1);
            state.products[category].push(product);
        } else {
            state.products[category][index] = product;
        }

        showNotification('Товар обновлен', 'success');
    } else {
        state.products[category].push(product);
        showNotification('Товар добавлен', 'success');
    }

    saveToLocalStorage();
    loadCategoryProducts();
    closeProductModal();
}

// Save to local storage
function saveToLocalStorage() {
    localStorage.setItem('admin_products', JSON.stringify(state.products));
}

// Sync products with GitHub (download JSON)
async function syncProducts() {
    const btn = document.querySelector('.sync-btn');
    btn.disabled = true;
    btn.innerHTML = '<span>⏳</span> Сохранение...';

    try {
        // Save to localStorage first
        saveToLocalStorage();

        // Create JSON file for download
        const dataStr = JSON.stringify(state.products, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);

        // Create download link
        const a = document.createElement('a');
        a.href = url;
        a.download = 'products.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Show success message
        showNotification('📥 Файл products.json скачан. Загрузите его в репозиторий telegram-webapp на GitHub', 'info');

        // Send data to Telegram if needed
        if (tg.initDataUnsafe?.user) {
            tg.sendData(JSON.stringify({
                action: 'products_updated',
                timestamp: Date.now()
            }));
        }
    } catch (error) {
        console.error('Sync error:', error);
        showNotification('Ошибка при сохранении', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span>📤</span> Сохранить изменения';
    }
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('show');
    }, 100);

    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}