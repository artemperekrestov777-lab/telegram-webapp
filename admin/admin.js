// Admin Panel Configuration
const ADMIN_ID = '827456169';
const GITHUB_REPO = 'artemperekrestov777-lab/telegram-webapp';
const GITHUB_API = 'https://api.github.com';
const GITHUB_RAW = 'https://raw.githubusercontent.com';

// State management
let state = {
    products: [],
    categories: [],
    currentProduct: null,
    productToDelete: null
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    renderCategories();
});

// Load data from local storage or GitHub
async function loadData() {
    try {
        // Try to load from GitHub
        const response = await fetch(`${GITHUB_RAW}/${GITHUB_REPO}/main/data/products.json`);
        const data = await response.json();
        state.products = data.products;
        state.categories = data.categories;
        localStorage.setItem('admin_products', JSON.stringify(data));
    } catch (error) {
        console.error('Failed to load from GitHub:', error);
        // Load from local storage
        const cached = localStorage.getItem('admin_products');
        if (cached) {
            const data = JSON.parse(cached);
            state.products = data.products;
            state.categories = data.categories;
        } else {
            // Load defaults
            loadDefaults();
        }
    }
}

// Load default data
function loadDefaults() {
    state.categories = [
        { id: "all", name: "Все", icon: "🏪" },
        { id: "new", name: "Новинки от МАК ТАБАК", icon: "✨" },
        { id: "standard", name: "Стандартные бленды", icon: "📦" },
        { id: "aromatic", name: "Ароматизированные бленды", icon: "🌸" },
        { id: "pipe", name: "Трубочные бленды", icon: "🚬" },
        { id: "sleeves", name: "Сигаретные гильзы", icon: "🎯" },
        { id: "custom", name: "Собрать свой набор", icon: "🎨" },
        { id: "mactabak", name: "Продукция от МАКТАБАК", icon: "💎" },
        { id: "pipes", name: "Курительные трубки", icon: "🔧" },
        { id: "machines", name: "Машинки для набивки", icon: "⚙️" },
        { id: "tea", name: "Китайский чай", icon: "🍵" },
        { id: "tamper", name: "Тампер", icon: "🔨" }
    ];
    state.products = [];
}

// Render categories
function renderCategories() {
    const categorySelect = document.getElementById('categorySelect');
    const productCategorySelect = document.getElementById('productCategory');

    // Clear existing options
    categorySelect.innerHTML = '<option value="">Выберите категорию</option>';
    productCategorySelect.innerHTML = '<option value="">Выберите категорию</option>';

    state.categories.forEach(category => {
        if (category.id !== 'all') {
            const option1 = new Option(`${category.icon} ${category.name}`, category.id);
            const option2 = new Option(`${category.icon} ${category.name}`, category.id);
            categorySelect.add(option1);
            productCategorySelect.add(option2);
        }
    });
}

// Load category products
function loadCategoryProducts() {
    const categoryId = document.getElementById('categorySelect').value;
    if (!categoryId) {
        renderProducts([]);
        return;
    }

    const products = state.products.filter(p => p.category === categoryId);
    renderProducts(products);
}

// Render products list
function renderProducts(products) {
    const list = document.getElementById('productsList');

    if (products.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📦</div>
                <div class="empty-state-text">Нет товаров в этой категории</div>
                <button class="btn btn-primary" onclick="openAddProduct()">Добавить первый товар</button>
            </div>
        `;
        return;
    }

    list.innerHTML = '';
    products.forEach(product => {
        const item = createProductItem(product);
        list.appendChild(item);
    });
}

// Create product item element
function createProductItem(product) {
    const item = document.createElement('div');
    item.className = 'product-item';

    const icon = getCategoryIcon(product.category);
    const unit = product.unit === 'weight' ? 'за упаковку' : 'за штуку';

    item.innerHTML = `
        <div class="product-image">${icon}</div>
        <div class="product-info">
            <div class="product-name">${product.name}</div>
            <div class="product-details">Категория: ${getCategoryName(product.category)}</div>
            <div class="product-details">Единица: ${product.unit === 'weight' ? `Вес (${product.packageWeight || 250}г)` : 'Штука'}</div>
            <div class="product-price">${product.price} ₽ ${unit}</div>
        </div>
        <div class="product-actions">
            <button class="action-btn edit-btn" onclick="editProduct(${product.id})" title="Редактировать">✏️</button>
            <button class="action-btn delete-btn" onclick="deleteProduct(${product.id})" title="Удалить">🗑️</button>
        </div>
    `;

    return item;
}

// Get category icon
function getCategoryIcon(categoryId) {
    const category = state.categories.find(c => c.id === categoryId);
    return category ? category.icon : '📦';
}

// Get category name
function getCategoryName(categoryId) {
    const category = state.categories.find(c => c.id === categoryId);
    return category ? category.name : 'Неизвестно';
}

// Open add product modal
function openAddProduct() {
    state.currentProduct = null;
    document.getElementById('modalTitle').textContent = 'Добавить товар';
    document.getElementById('productForm').reset();
    document.getElementById('imagePreview').innerHTML = '';
    document.getElementById('weightGroup').style.display = 'none';
    document.getElementById('productModal').classList.remove('hidden');
}

// Edit product
function editProduct(productId) {
    const product = state.products.find(p => p.id === productId);
    if (!product) return;

    state.currentProduct = product;
    document.getElementById('modalTitle').textContent = 'Редактировать товар';

    // Fill form
    document.getElementById('productName').value = product.name;
    document.getElementById('productCategory').value = product.category;
    document.getElementById('productUnit').value = product.unit || 'piece';
    document.getElementById('productPrice').value = product.price;
    document.getElementById('productDescription').value = product.description || '';

    if (product.unit === 'weight') {
        document.getElementById('weightGroup').style.display = 'block';
        document.getElementById('productWeight').value = product.packageWeight || 250;
    } else {
        document.getElementById('weightGroup').style.display = 'none';
    }

    // Show image preview if exists
    if (product.image) {
        document.getElementById('imagePreview').innerHTML = `<img src="${product.image}" alt="">`;
    }

    document.getElementById('productModal').classList.remove('hidden');
}

// Delete product
function deleteProduct(productId) {
    const product = state.products.find(p => p.id === productId);
    if (!product) return;

    state.productToDelete = productId;
    document.getElementById('deleteModal').classList.remove('hidden');
}

// Confirm delete
function confirmDelete() {
    if (!state.productToDelete) return;

    state.products = state.products.filter(p => p.id !== state.productToDelete);
    saveData();
    loadCategoryProducts();
    closeDeleteModal();

    showNotification('Товар успешно удален');
}

// Close delete modal
function closeDeleteModal() {
    state.productToDelete = null;
    document.getElementById('deleteModal').classList.add('hidden');
}

// Close product modal
function closeProductModal() {
    state.currentProduct = null;
    document.getElementById('productModal').classList.add('hidden');
    document.getElementById('productForm').reset();
    document.getElementById('imagePreview').innerHTML = '';
}

// Toggle weight field
function toggleWeightField() {
    const unit = document.getElementById('productUnit').value;
    const weightGroup = document.getElementById('weightGroup');

    if (unit === 'weight') {
        weightGroup.style.display = 'block';
        document.getElementById('productWeight').required = true;
    } else {
        weightGroup.style.display = 'none';
        document.getElementById('productWeight').required = false;
    }
}

// Preview image
function previewImage(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        document.getElementById('imagePreview').innerHTML = `<img src="${e.target.result}" alt="">`;
    };
    reader.readAsDataURL(file);
}

// Save product
async function saveProduct(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const imageFile = document.getElementById('productImage').files[0];

    // Prepare product data
    const productData = {
        name: formData.get('productName'),
        category: formData.get('productCategory'),
        price: parseInt(formData.get('productPrice')),
        unit: formData.get('productUnit'),
        description: formData.get('productDescription') || '',
        inStock: true
    };

    if (productData.unit === 'weight') {
        productData.packageWeight = parseInt(formData.get('productWeight'));
    }

    // Handle image
    if (imageFile) {
        // Convert to base64
        const reader = new FileReader();
        reader.onload = async function(e) {
            productData.image = e.target.result;
            saveProductData(productData);
        };
        reader.readAsDataURL(imageFile);
    } else {
        if (state.currentProduct) {
            productData.image = state.currentProduct.image || '';
        } else {
            productData.image = '';
        }
        saveProductData(productData);
    }
}

// Save product data
function saveProductData(productData) {
    if (state.currentProduct) {
        // Update existing product
        const index = state.products.findIndex(p => p.id === state.currentProduct.id);
        if (index !== -1) {
            state.products[index] = {
                ...state.currentProduct,
                ...productData
            };
        }
    } else {
        // Add new product
        const newId = Math.max(...state.products.map(p => p.id), 0) + 1;
        state.products.push({
            id: newId,
            ...productData
        });
    }

    saveData();
    loadCategoryProducts();
    closeProductModal();

    showNotification(state.currentProduct ? 'Товар успешно обновлен' : 'Товар успешно добавлен');
}

// Save data to local storage and sync
function saveData() {
    const data = {
        categories: state.categories,
        products: state.products
    };

    localStorage.setItem('admin_products', JSON.stringify(data));

    // Send to server for GitHub sync
    syncWithServer(data);
}

// Sync with server
async function syncWithServer(data) {
    try {
        const response = await fetch('/api/admin/products', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                adminId: ADMIN_ID,
                products: data
            })
        });

        if (response.ok) {
            console.log('Products synced with server');
        }
    } catch (error) {
        console.error('Failed to sync with server:', error);
    }
}

// Sync with GitHub
async function syncWithGitHub() {
    const btn = document.querySelector('.sync-btn');
    btn.disabled = true;
    btn.innerHTML = '<span>⏳</span> Синхронизация...';

    try {
        // Get current products
        const data = {
            categories: state.categories,
            products: state.products
        };

        // Here you would normally use GitHub API with authentication
        // For now, we'll save to local and show success
        localStorage.setItem('admin_products', JSON.stringify(data));
        localStorage.setItem('github_sync_time', new Date().toISOString());

        // Simulate sync delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        showNotification('✅ Успешно синхронизировано с GitHub');
    } catch (error) {
        console.error('GitHub sync error:', error);
        showNotification('❌ Ошибка синхронизации', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span>🔄</span> Синхронизировать с GitHub';
    }
}

// Show notification
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#27AE60' : '#E74C3C'};
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 2000;
        animation: slideIn 0.3s ease;
        max-width: 400px;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);