// Initialize Telegram WebApp
const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

// State management
let state = {
    products: [],
    categories: [],
    cart: [],
    currentCategory: 'all',
    currentSort: 'default',
    userData: null,
    currentProductModal: null
};

// API Configuration
const API_BASE = 'https://artemperekrestov777-lab.github.io/telegram-webapp/api';

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await loadProducts();
    await loadUserData();
    renderCategories();
    renderProducts();
    updateCartBadge();

    // Load saved cart
    loadCart();

    // Set theme
    document.body.style.backgroundColor = tg.themeParams.bg_color || '#F5F7FA';
});

// Load products from API or local storage
async function loadProducts() {
    try {
        // Try to load from GitHub Pages API
        const response = await fetch(`${API_BASE}/products.json`);
        const data = await response.json();
        state.products = data.products;
        state.categories = data.categories;
        localStorage.setItem('products_cache', JSON.stringify(data));
    } catch (error) {
        console.error('Failed to load products from API:', error);
        // Fallback to cached data
        const cached = localStorage.getItem('products_cache');
        if (cached) {
            const data = JSON.parse(cached);
            state.products = data.products;
            state.categories = data.categories;
        } else {
            // Fallback to hardcoded products
            loadDefaultProducts();
        }
    }
}

// Load default products (fallback)
function loadDefaultProducts() {
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

    // Products would be loaded here
}

// Load user data
async function loadUserData() {
    const userId = tg.initDataUnsafe?.user?.id;
    if (!userId) return;

    try {
        const response = await fetch(`${API_BASE}/user/${userId}`);
        const data = await response.json();
        if (data.userData) {
            state.userData = data.userData;
            fillUserForm();
        }
    } catch (error) {
        console.error('Failed to load user data:', error);
        // Try local storage
        const saved = localStorage.getItem(`userData_${userId}`);
        if (saved) {
            state.userData = JSON.parse(saved);
            fillUserForm();
        }
    }
}

// Save user data
function saveUserData() {
    const userId = tg.initDataUnsafe?.user?.id;
    if (!userId) return;

    const formData = new FormData(document.getElementById('checkoutForm'));
    const userData = {
        fullName: formData.get('fullName'),
        phone: formData.get('phone'),
        email: formData.get('email'),
        city: formData.get('city'),
        address: formData.get('address')
    };

    state.userData = userData;
    localStorage.setItem(`userData_${userId}`, JSON.stringify(userData));

    // Send to server
    fetch(`${API_BASE}/user/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userData })
    }).catch(console.error);
}

// Fill user form with saved data
function fillUserForm() {
    if (!state.userData) return;

    const form = document.getElementById('checkoutForm');
    if (!form) return;

    form.fullName.value = state.userData.fullName || '';
    form.phone.value = state.userData.phone || '';
    form.email.value = state.userData.email || '';
    form.city.value = state.userData.city || '';
    form.address.value = state.userData.address || '';
}

// Cart management
function loadCart() {
    const saved = localStorage.getItem('cart');
    if (saved) {
        state.cart = JSON.parse(saved);
        updateCartBadge();
        renderCart();
    }
}

function saveCart() {
    localStorage.setItem('cart', JSON.stringify(state.cart));
    updateCartBadge();

    // Send to server
    const userId = tg.initDataUnsafe?.user?.id;
    if (userId) {
        fetch(`${API_BASE}/cart/${userId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cart: state.cart })
        }).catch(console.error);
    }
}

function addToCart(productId) {
    const product = state.products.find(p => p.id === productId);
    if (!product) return;

    const existing = state.cart.find(item => item.id === productId);
    if (existing) {
        existing.quantity++;
    } else {
        state.cart.push({
            ...product,
            quantity: 1
        });
    }

    saveCart();
    renderCart();

    // Show notification
    tg.HapticFeedback.notificationOccurred('success');
    showNotification('Товар добавлен в корзину');
}

function removeFromCart(productId) {
    state.cart = state.cart.filter(item => item.id !== productId);
    saveCart();
    renderCart();
}

function updateQuantity(productId, change) {
    const item = state.cart.find(item => item.id === productId);
    if (!item) return;

    item.quantity += change;
    if (item.quantity <= 0) {
        removeFromCart(productId);
    } else {
        saveCart();
        renderCart();
    }
}

function clearCart() {
    if (!confirm('Очистить корзину?')) return;
    state.cart = [];
    saveCart();
    renderCart();
    closeCart();
}

function updateCartBadge() {
    const badge = document.getElementById('cartBadge');
    const count = state.cart.reduce((sum, item) => sum + item.quantity, 0);
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
}

// Render functions
function renderCategories() {
    const container = document.getElementById('categoriesContainer');
    const scrollContainer = document.getElementById('categoriesScroll');
    container.innerHTML = '';

    state.categories.forEach((category, index) => {
        const btn = document.createElement('button');
        btn.className = 'category-btn';
        btn.setAttribute('data-category-id', category.id);
        if (category.id === state.currentCategory) {
            btn.classList.add('active');
        }
        btn.innerHTML = `${category.icon} ${category.name}`;
        btn.onclick = () => selectCategory(category.id);
        container.appendChild(btn);
    });

    // Scroll to active category after rendering
    setTimeout(() => {
        const activeBtn = container.querySelector('.category-btn.active');
        if (activeBtn && scrollContainer) {
            const scrollLeft = activeBtn.offsetLeft - (scrollContainer.offsetWidth / 2) + (activeBtn.offsetWidth / 2);
            scrollContainer.scrollTo({
                left: Math.max(0, scrollLeft),
                behavior: 'smooth'
            });
        }
    }, 100);
}

function renderProducts() {
    const grid = document.getElementById('productsGrid');
    grid.innerHTML = '';

    let products = [...state.products];

    // Filter by category
    if (state.currentCategory !== 'all') {
        products = products.filter(p => p.category === state.currentCategory);
    }

    // Sort
    switch (state.currentSort) {
        case 'priceAsc':
            products.sort((a, b) => a.price - b.price);
            break;
        case 'priceDesc':
            products.sort((a, b) => b.price - a.price);
            break;
        case 'new':
            products = products.filter(p => p.category === 'new');
            break;
    }

    // Render product cards
    products.forEach(product => {
        const card = createProductCard(product);
        grid.appendChild(card);
    });
}

function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.onclick = () => openProductModal(product);

    // Show real image if available, otherwise show icon
    let imageContent;
    if (product.image && product.image.trim() !== '') {
        imageContent = `<img src="${product.image}" alt="${product.name}" style="width: 100%; height: 100%; object-fit: cover;">`;
    } else {
        const icon = getProductIcon(product);
        imageContent = `<div style="font-size: 48px; display: flex; align-items: center; justify-content: center; height: 100%;">${icon}</div>`;
    }

    card.innerHTML = `
        <div class="product-image">${imageContent}</div>
        <div class="product-info">
            <div class="product-name">${product.name}</div>
            <div class="product-price">${product.price} ₽</div>
            <button class="add-to-cart" onclick="event.stopPropagation(); addToCart(${product.id})">
                Добавить в корзину
            </button>
        </div>
    `;

    return card;
}

function getProductIcon(product) {
    const icons = {
        new: '✨',
        standard: '📦',
        aromatic: '🌸',
        pipe: '🚬',
        sleeves: '🎯',
        custom: '🎨',
        mactabak: '💎',
        pipes: '🔧',
        machines: '⚙️',
        tea: '🍵',
        tamper: '🔨'
    };
    return icons[product.category] || '📦';
}

function renderCart() {
    const cartEmpty = document.getElementById('cartEmpty');
    const cartContent = document.getElementById('cartContent');
    const cartItems = document.getElementById('cartItems');

    if (state.cart.length === 0) {
        cartEmpty.classList.remove('hidden');
        cartContent.classList.add('hidden');
        return;
    }

    cartEmpty.classList.add('hidden');
    cartContent.classList.remove('hidden');

    cartItems.innerHTML = '';
    let total = 0;

    state.cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;

        const icon = getProductIcon(item);
        const unit = item.unit === 'weight' ? 'г' : 'шт';

        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.innerHTML = `
            <div class="cart-item-image">${icon}</div>
            <div class="cart-item-info">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-price">${item.price} ₽ × ${item.quantity} ${unit}</div>
            </div>
            <div class="cart-item-quantity">
                <button class="quantity-btn" onclick="updateQuantity(${item.id}, -1)">-</button>
                <span class="quantity-value">${item.quantity}</span>
                <button class="quantity-btn" onclick="updateQuantity(${item.id}, 1)">+</button>
            </div>
        `;
        cartItems.appendChild(cartItem);
    });

    document.getElementById('cartTotal').textContent = `${total} ₽`;
    document.getElementById('checkoutTotal').textContent = `${total} ₽`;
}

// UI interactions
function openCatalog() {
    document.getElementById('welcomeScreen').classList.add('hidden');
    document.getElementById('mainShop').classList.remove('hidden');
}

function goBack() {
    const cart = document.getElementById('cart');
    const checkout = document.getElementById('checkout');
    const search = document.getElementById('searchModal');
    const productModal = document.getElementById('productModal');

    if (!checkout.classList.contains('hidden')) {
        backToCart();
    } else if (!cart.classList.contains('hidden')) {
        closeCart();
    } else if (!search.classList.contains('hidden')) {
        closeSearch();
    } else if (!productModal.classList.contains('hidden')) {
        closeProductModal();
    } else {
        // Go to welcome screen
        document.getElementById('mainShop').classList.add('hidden');
        document.getElementById('welcomeScreen').classList.remove('hidden');
    }
}

function selectCategory(categoryId) {
    state.currentCategory = categoryId;
    renderCategories();
    renderProducts();
}

function openSortMenu() {
    const menu = document.getElementById('sortMenu');
    menu.classList.toggle('hidden');
}

function sortProducts(sort) {
    state.currentSort = sort;
    document.getElementById('sortMenu').classList.add('hidden');
    renderProducts();
}

function openSearch() {
    document.getElementById('searchModal').classList.remove('hidden');
    document.getElementById('searchInput').focus();
}

function closeSearch() {
    document.getElementById('searchModal').classList.add('hidden');
    document.getElementById('searchInput').value = '';
    document.getElementById('searchResults').innerHTML = '';
}

function searchProducts() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const results = document.getElementById('searchResults');

    if (query.length < 2) {
        results.innerHTML = '';
        return;
    }

    const found = state.products.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query)
    );

    results.innerHTML = '';
    found.forEach(product => {
        const card = createProductCard(product);
        results.appendChild(card);
    });

    if (found.length === 0) {
        results.innerHTML = '<p style="text-align:center; color:#7F8C8D; padding:20px;">Ничего не найдено</p>';
    }
}

function openProductModal(product) {
    state.currentProductModal = product;
    const modal = document.getElementById('productModal');

    // Show real image if available, otherwise show icon
    const imageContainer = document.getElementById('modalProductImage');
    if (product.image && product.image.trim() !== '') {
        imageContainer.style.background = '#F5F7FA';
        imageContainer.innerHTML = `<img src="${product.image}" alt="${product.name}" style="width: 100%; height: 100%; object-fit: contain;">`;
    } else {
        const icon = getProductIcon(product);
        imageContainer.style.background = '#F5F7FA';
        imageContainer.innerHTML = `<div style="font-size:60px;text-align:center;padding:40px;">${icon}</div>`;
    }

    document.getElementById('modalProductName').textContent = product.name;
    document.getElementById('modalProductDescription').textContent = product.description || '';
    document.getElementById('modalProductPrice').textContent = `${product.price} ₽`;

    modal.classList.remove('hidden');
}

function closeProductModal() {
    document.getElementById('productModal').classList.add('hidden');
    state.currentProductModal = null;
}

function addToCartFromModal() {
    if (state.currentProductModal) {
        addToCart(state.currentProductModal.id);
        closeProductModal();
    }
}

function openCart() {
    document.getElementById('cart').classList.remove('hidden');
    renderCart();
}

function closeCart() {
    document.getElementById('cart').classList.add('hidden');
    // Clear cart after closing
    setTimeout(() => {
        state.cart = [];
        saveCart();
        renderCart();
    }, 500);
}

function openCheckout() {
    if (state.cart.length === 0) return;

    // Check minimum weight
    const weightProducts = state.cart.filter(item => item.unit === 'weight');
    const totalWeight = weightProducts.reduce((sum, item) => {
        const weight = item.packageWeight || 250;
        return sum + (item.quantity * weight);
    }, 0);

    if (weightProducts.length > 0 && totalWeight < 1000) {
        alert(`Минимальный объём заказа по весовым товарам от 1 кг\nТекущий вес: ${totalWeight}г`);
        return;
    }

    document.getElementById('cart').classList.add('hidden');
    document.getElementById('checkout').classList.remove('hidden');

    fillUserForm();
    updateCheckoutTotals();
}

function backToCart() {
    document.getElementById('checkout').classList.add('hidden');
    document.getElementById('cart').classList.remove('hidden');
}

function updateDeliveryPrice() {
    updateCheckoutTotals();
}

function updateCheckoutTotals() {
    const delivery = document.getElementById('delivery').value;
    let deliveryPrice = 0;

    if (delivery === 'pochta') deliveryPrice = 500;
    if (delivery === 'cdek') deliveryPrice = 600;

    const subtotal = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const total = subtotal + deliveryPrice;

    document.getElementById('checkoutSubtotal').textContent = `${subtotal} ₽`;
    document.getElementById('deliveryPrice').textContent = `${deliveryPrice} ₽`;
    document.getElementById('finalTotal').textContent = `${total} ₽`;
}

// Form validation
document.getElementById('checkoutForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    // Validate form
    const form = e.target;
    let isValid = true;

    // Check all required fields
    const requiredFields = ['fullName', 'phone', 'email', 'city', 'address', 'delivery'];
    requiredFields.forEach(field => {
        const input = form[field];
        if (!input.value || (input.pattern && !new RegExp(input.pattern).test(input.value))) {
            input.classList.add('error');
            isValid = false;
        } else {
            input.classList.remove('error');
        }
    });

    if (!isValid) {
        alert('Пожалуйста, заполните все обязательные поля корректно');
        return;
    }

    // Check minimum weight for weight-based products (1kg)
    const weightProducts = state.cart.filter(item => item.unit === 'weight');
    if (weightProducts.length > 0) {
        const totalWeight = weightProducts.reduce((sum, item) => {
            const weight = item.packageWeight || 250; // default weight 250g
            return sum + (item.quantity * weight);
        }, 0);

        if (totalWeight < 1000) {
            alert(`⚠️ Минимальный объём заказа по весовым товарам от 1 кг\n\nТекущий вес: ${totalWeight}г`);
            return;
        }
    }

    // Save user data
    saveUserData();

    // Prepare order data
    const formData = new FormData(form);
    const delivery = formData.get('delivery');
    let deliveryPrice = 0;
    let deliveryMethod = '';

    if (delivery === 'pochta') {
        deliveryPrice = 500;
        deliveryMethod = 'Почта России';
    } else if (delivery === 'cdek') {
        deliveryPrice = 600;
        deliveryMethod = 'СДЭК';
    }

    const subtotal = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalAmount = subtotal + deliveryPrice;

    const orderData = {
        action: 'order',
        cart: state.cart,
        userData: {
            fullName: formData.get('fullName'),
            phone: formData.get('phone'),
            email: formData.get('email'),
            city: formData.get('city'),
            address: formData.get('address'),
            comment: formData.get('comment')
        },
        deliveryMethod: deliveryMethod,
        totalAmount: totalAmount
    };

    // Send order to bot
    tg.sendData(JSON.stringify(orderData));

    // Clear cart
    state.cart = [];
    saveCart();

    // Show success message
    document.getElementById('checkout').classList.add('hidden');
    showNotification('Заказ успешно оформлен! Ожидайте информацию в чате.');

    // Return to catalog
    setTimeout(() => {
        document.getElementById('mainShop').classList.add('hidden');
        document.getElementById('welcomeScreen').classList.remove('hidden');
    }, 2000);
});

// Notification
function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #27AE60;
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 1000;
        animation: slideDown 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
@keyframes slideDown {
    from {
        transform: translateX(-50%) translateY(-100%);
        opacity: 0;
    }
    to {
        transform: translateX(-50%) translateY(0);
        opacity: 1;
    }
}
`;
document.head.appendChild(style);