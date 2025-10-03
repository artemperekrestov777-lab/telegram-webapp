const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs').promises;
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = process.env.ADMIN_ID;
const WEBAPP_URL = process.env.WEBAPP_URL;

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://telegram.org"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:", "blob:"],
            connectSrc: ["'self'", "https://api.telegram.org", "https://artemperekrestov777-lab.github.io"]
        }
    }
}));

app.use(compression());
app.use(cors({
    origin: [WEBAPP_URL, 'https://artemperekrestov777-lab.github.io'],
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: 'Слишком много запросов. Попробуйте позже.'
});

app.use('/api', limiter);
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('combined'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/webapp', express.static(path.join(__dirname, 'webapp')));
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// Initialize bot
const bot = new TelegramBot(BOT_TOKEN, {
    polling: false,
    webHook: true
});

// Order counter storage
let orderCounter = { lastOrderNumber: 0 };
const COUNTER_FILE = path.join(__dirname, 'data', 'orderCounter.json');

// Load order counter
async function loadOrderCounter() {
    try {
        await fs.mkdir(path.join(__dirname, 'data'), { recursive: true });
        const data = await fs.readFile(COUNTER_FILE, 'utf8');
        orderCounter = JSON.parse(data);
    } catch (error) {
        console.log('Creating new order counter');
        await saveOrderCounter();
    }
}

// Save order counter
async function saveOrderCounter() {
    try {
        await fs.mkdir(path.join(__dirname, 'data'), { recursive: true });
        await fs.writeFile(COUNTER_FILE, JSON.stringify(orderCounter, null, 2));
    } catch (error) {
        console.error('Error saving order counter:', error);
    }
}

// Generate order number
async function generateOrderNumber() {
    orderCounter.lastOrderNumber++;
    await saveOrderCounter();
    return `T${orderCounter.lastOrderNumber}`;
}

// User sessions storage
const userSessions = new Map();
const cartStorage = new Map();

// Bot commands
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    // Initialize user session
    if (!userSessions.has(userId)) {
        userSessions.set(userId, {
            userId: userId,
            userName: msg.from.first_name,
            cart: [],
            userData: null,
            createdAt: new Date()
        });
    }

    const welcomeMessage = `Привет, это МАКТАБАК!

Рады видеть вас в онлайн-магазине МакТабак.

Здесь вы найдете каталог с нашими товарами и сможете оформить заказ за пару минут, выбрать удобный для вас способ оплаты и воспользоваться сервисом Доставки.

Чтобы приступить к покупкам, перейдите в «Каталог».

Приятных покупок!`;

    const keyboard = {
        inline_keyboard: [[
            {
                text: 'Каталог',
                web_app: { url: `${WEBAPP_URL}?userId=${userId}` }
            }
        ]]
    };

    await bot.sendMessage(chatId, welcomeMessage, {
        reply_markup: keyboard
    });

    // Check for abandoned cart
    const session = userSessions.get(userId);
    if (session.cart && session.cart.length > 0) {
        setTimeout(async () => {
            await bot.sendMessage(chatId,
                `⚠️ У вас есть товары в корзине!\n` +
                `Количество: ${session.cart.length} товаров\n` +
                `⏰ Доступность товаров ограничена по времени.`,
                { reply_markup: keyboard }
            );
        }, 2000);
    }
});

// Handle callback queries (button presses)
bot.on('callback_query', async (callbackQuery) => {
    const action = callbackQuery.data;
    const msg = callbackQuery.message;

    if (action.startsWith('order_processed_')) {
        const orderNumber = action.replace('order_processed_', '');

        // Update message
        const updatedText = msg.text + '\n\n✅ <b>ЗАКАЗ ОБРАБОТАН</b>';

        await bot.editMessageText(updatedText, {
            chat_id: msg.chat.id,
            message_id: msg.message_id,
            parse_mode: 'HTML'
        });

        // Send confirmation alert
        await bot.answerCallbackQuery(callbackQuery.id, {
            text: `✅ Заказ ${orderNumber} отмечен как обработанный`,
            show_alert: true
        });
    }
});

// Admin command
bot.onText(/\/admin/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    console.log(`Admin command from user ${userId}`);

    // Check admin rights - replace with your admin ID
    const ADMIN_IDS = [parseInt(ADMIN_ID)]; // Using ADMIN_ID from .env

    if (!ADMIN_IDS.includes(userId)) {
        await bot.sendMessage(chatId, '❌ У вас нет прав администратора');
        return;
    }

    const adminMessage = `🔧 Панель администратора

Нажмите кнопку ниже для открытия админ-панели:`;

    const keyboard = {
        inline_keyboard: [[
            {
                text: '🔧 Открыть админ-панель',
                web_app: { url: `${WEBAPP_URL}?admin=true` }
            }
        ]]
    };

    await bot.sendMessage(chatId, adminMessage, {
        reply_markup: keyboard
    });
});

// WebApp data handler
bot.on('web_app_data', async (msg) => {
    const chatId = msg.chat.id;
    const data = JSON.parse(msg.web_app_data.data);

    try {
        switch(data.action) {
            case 'order':
                // Check if this is a Moscow order that needs special manager notification
                if (data.isFromMoscow && data.managerMessage) {
                    // Send enhanced notification to manager
                    const MANAGER_CHAT_ID = ADMIN_ID;

                    // Formatted message for manager
                    const managerNotification = `
🔔 <b>НОВЫЙ ЗАКАЗ ИЗ МОСКВЫ!</b>

📦 <b>Заказ №:</b> ${data.orderNumber}
👤 <b>Клиент:</b> ${data.userData.fullName}
📱 <b>Телефон:</b> ${data.userData.phone}
📧 <b>Email:</b> ${data.userData.email}
🏠 <b>Адрес:</b> ${data.userData.city}, ${data.userData.address}

🛒 <b>Товары:</b>
${data.cart.map(item => `• ${item.name} - ${item.quantity} ${item.unit === 'weight' ? 'г' : 'шт'} x ${item.price}₽`).join('\n')}

💰 <b>Итого:</b> ${data.totalAmount} ₽
🚚 <b>Доставка:</b> ${data.deliveryMethod}

📝 <b>Комментарий:</b> ${data.userData.comment || 'Отсутствует'}

⚡ <b>Требуется связаться с клиентом для выставления счета!</b>
                    `;

                    // Quick action buttons
                    const keyboard = {
                        inline_keyboard: [
                            [
                                {
                                    text: '📞 Позвонить',
                                    url: `tel:${data.userData.phone}`
                                },
                                {
                                    text: '✉️ Написать на email',
                                    url: `mailto:${data.userData.email}`
                                }
                            ],
                            [
                                {
                                    text: '✅ Заказ обработан',
                                    callback_data: `order_processed_${data.orderNumber}`
                                }
                            ]
                        ]
                    };

                    try {
                        // Send notification to manager
                        await bot.sendMessage(MANAGER_CHAT_ID, managerNotification, {
                            parse_mode: 'HTML',
                            reply_markup: keyboard
                        });

                        // Confirm to client
                        await bot.sendMessage(chatId,
                            `✅ Ваш заказ ${data.orderNumber} принят!\n\n` +
                            `Менеджер свяжется с вами в ближайшее время для выставления счета.\n` +
                            `📧 Email для связи: ${process.env.MANAGER_EMAIL}`
                        );
                    } catch (error) {
                        console.error('Error sending manager notification:', error);
                        await bot.sendMessage(chatId, '❌ Произошла ошибка при отправке заказа. Попробуйте позже.');
                    }
                } else {
                    // Regular order processing
                    await processOrder(chatId, msg.from.id, data);
                }
                break;
            case 'saveCart':
                saveUserCart(msg.from.id, data.cart);
                break;
            case 'getUserData':
                sendUserData(chatId, msg.from.id);
                break;
        }
    } catch (error) {
        console.error('Error processing webapp data:', error);
        await bot.sendMessage(chatId, '❌ Произошла ошибка. Попробуйте позже.');
    }
});

// Process order
async function processOrder(chatId, userId, orderData) {
    const orderNumber = await generateOrderNumber();
    const { cart, userData, totalAmount, deliveryMethod } = orderData;

    // Check minimum weight for weight-based products
    const weightProducts = cart.filter(item => item.unit === 'weight');
    const totalWeight = weightProducts.reduce((sum, item) => sum + (item.quantity * item.packageWeight), 0);

    if (weightProducts.length > 0 && totalWeight < 1000) {
        await bot.sendMessage(chatId,
            '⚠️ Минимальный объём заказа по весовым товарам от 1 кг\n' +
            `Текущий вес: ${totalWeight}г`
        );
        return;
    }

    // Save user data for future orders
    const session = userSessions.get(userId);
    if (session) {
        session.userData = userData;
        userSessions.set(userId, session);
    }

    // Check if Moscow region
    const isMoscowRegion = checkMoscowRegion(userData.city);

    if (isMoscowRegion) {
        // Send to manager
        await sendOrderToManager(orderNumber, userData, cart, totalAmount, deliveryMethod);
        await bot.sendMessage(chatId,
            `✅ Заказ ${orderNumber} принят!\n\n` +
            `С вами в ближайшее время свяжется менеджер для выставления счёта.\n\n` +
            `📧 Email: ${process.env.MANAGER_EMAIL}`
        );
    } else {
        // Generate QR code and payment instructions
        const qrCodeUrl = generateQRCode(totalAmount);
        const paymentMessage = `
Добрый день! Пожалуйста, прочитайте всю информацию до конца ‼️‼️‼️👇🏻👇🏻👇🏻

Заказ ${orderNumber} подтвержден.
Предварительная дата отправки вашего заказа: через 3-7 дней!
Сроки могут сдвигаться от 1 до 7 дней!

(Рассылка трек номеров в течении 2х дней после отправки!)

‼️ВНИМАНИЕ❗️ВАЖНО‼️
После оплаты заказа ОТПРАВЬТЕ ЧЕК на почту: ${process.env.MANAGER_EMAIL}
и в письме УКАЖИТЕ НОМЕР ЗАКАЗА!!!

🚫ПИСЬМО С ЧЕКОМ ДОСТАТОЧНО ОТПРАВИТЬ ОДИН РАЗ‼️‼️
(не нужно присылать один и тот же чек несколько раз!)

📌В КОММЕНТАРИЯХ К ПЛАТЕЖУ НИЧЕГО ПИСАТЬ НЕ НУЖНО‼️‼️‼️

Сумма к оплате: ${totalAmount} руб.

(!ВАЖНО! НЕ ДЕЛАТЬ проверочные платежи 1,2,3, 10 рублей!!! Вводите полную сумму!)`;

        await bot.sendPhoto(chatId, qrCodeUrl, {
            caption: paymentMessage,
            parse_mode: 'HTML'
        });
    }

    // Clear cart after order
    const updatedSession = userSessions.get(userId);
    if (updatedSession) {
        updatedSession.cart = [];
        userSessions.set(userId, updatedSession);
    }
}

// Check Moscow region
function checkMoscowRegion(city) {
    const moscowRegions = [
        'москва', 'moscow', 'мск',
        'московская область', 'подмосковье',
        'балашиха', 'химки', 'подольск', 'королёв', 'мытищи',
        'люберцы', 'красногорск', 'электросталь', 'коломна', 'одинцово',
        'домодедово', 'серпухов', 'щёлково', 'раменское', 'орехово-зуево',
        'долгопрудный', 'реутов', 'жуковский', 'пушкино', 'ногинск',
        'сергиев посад', 'дмитров', 'видное', 'лобня', 'ивантеевка',
        'клин', 'дубна', 'егорьевск', 'чехов', 'наро-фоминск'
    ];

    const normalizedCity = city.toLowerCase().trim();
    return moscowRegions.some(region => normalizedCity.includes(region));
}

// Send order to manager
async function sendOrderToManager(orderNumber, userData, cart, totalAmount, deliveryMethod) {
    const orderDetails = cart.map(item =>
        `• ${item.name} - ${item.quantity} ${item.unit === 'weight' ? 'г' : 'шт'} x ${item.price}₽ = ${item.quantity * item.price}₽`
    ).join('\n');

    const message = `
📦 НОВЫЙ ЗАКАЗ ${orderNumber}

👤 Клиент:
ФИО: ${userData.fullName}
Телефон: ${userData.phone}
Email: ${userData.email}
Город: ${userData.city}
Адрес: ${userData.address}

🛒 Состав заказа:
${orderDetails}

💰 Итого: ${totalAmount}₽
🚚 Доставка: ${deliveryMethod}

Комментарий: ${userData.comment || 'Нет'}
    `;

    await bot.sendMessage(ADMIN_ID, message);
}

// Generate QR code URL
function generateQRCode(amount) {
    const paymentData = `ST00012|Name=${process.env.PAYMENT_RECEIVER}|PersonalAcc=${process.env.PAYMENT_ACCOUNT}|BankName=|BIC=${process.env.PAYMENT_BIK}|CorrespAcc=|Sum=${amount}00`;
    const encodedData = encodeURIComponent(paymentData);
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodedData}`;
}

// Save user cart
function saveUserCart(userId, cart) {
    const session = userSessions.get(userId);
    if (session) {
        session.cart = cart;
        userSessions.set(userId, session);
    }
}

// Send user data
async function sendUserData(chatId, userId) {
    const session = userSessions.get(userId);
    if (session && session.userData) {
        await bot.sendMessage(chatId, JSON.stringify({
            action: 'userData',
            data: session.userData
        }));
    }
}

// API endpoints for WebApp
app.get('/api/products', async (req, res) => {
    try {
        const productsPath = path.join(__dirname, 'data', 'products.json');
        const productsData = await fs.readFile(productsPath, 'utf8');
        res.json(JSON.parse(productsData));
    } catch (error) {
        console.error('Error loading products:', error);
        res.status(500).json({ error: 'Failed to load products' });
    }
});

app.post('/api/order', async (req, res) => {
    try {
        const orderData = req.body;
        const orderNumber = await generateOrderNumber();

        // Process order logic
        res.json({
            success: true,
            orderNumber: orderNumber,
            message: 'Order processed successfully'
        });
    } catch (error) {
        console.error('Error processing order:', error);
        res.status(500).json({ error: 'Failed to process order' });
    }
});

app.get('/api/user/:userId', (req, res) => {
    const userId = parseInt(req.params.userId);
    const session = userSessions.get(userId);

    if (session && session.userData) {
        res.json({ userData: session.userData });
    } else {
        res.json({ userData: null });
    }
});

app.post('/api/cart/:userId', (req, res) => {
    const userId = parseInt(req.params.userId);
    const { cart } = req.body;

    saveUserCart(userId, cart);
    res.json({ success: true });
});

// API endpoint for manager notifications (backup method)
app.post('/api/notify-manager', async (req, res) => {
    try {
        const { orderNumber, clientName, phone, email, city, address, cart, totalAmount, deliveryMethod, comment, message } = req.body;
        const MANAGER_CHAT_ID = ADMIN_ID;

        // Formatted message for manager
        let managerNotification;
        if (message) {
            managerNotification = message;
        } else {
            managerNotification = `
🔔 <b>НОВЫЙ ЗАКАЗ!</b>

📦 <b>Заказ №:</b> ${orderNumber}
👤 <b>Клиент:</b> ${clientName}
📱 <b>Телефон:</b> ${phone}
📧 <b>Email:</b> ${email}
🏠 <b>Адрес:</b> ${city}, ${address}

💰 <b>Сумма:</b> ${totalAmount} ₽

⚡ <b>Требуется связаться с клиентом!</b>
            `;
        }

        // Quick action buttons
        const keyboard = {
            inline_keyboard: [
                [
                    { text: '📞 Позвонить', url: `tel:${phone}` },
                    { text: '✉️ Написать на email', url: `mailto:${email}` }
                ],
                [
                    { text: '✅ Заказ обработан', callback_data: `order_processed_${orderNumber}` }
                ]
            ]
        };

        // Send notification to manager
        await bot.sendMessage(MANAGER_CHAT_ID, managerNotification, {
            parse_mode: 'HTML',
            reply_markup: keyboard
        });

        res.json({ success: true, message: 'Manager notified' });
    } catch (error) {
        console.error('Error notifying manager:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Admin API endpoints
app.post('/api/admin/products', async (req, res) => {
    // Verify admin
    if (req.body.adminId !== ADMIN_ID) {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    try {
        const productsPath = path.join(__dirname, 'data', 'products.json');
        await fs.writeFile(productsPath, JSON.stringify(req.body.products, null, 2));
        res.json({ success: true });
    } catch (error) {
        console.error('Error saving products:', error);
        res.status(500).json({ error: 'Failed to save products' });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
    });
});

process.on('SIGINT', async () => {
    console.log('SIGINT signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
    });
});

// Prevent multiple instances
const lockFile = path.join(__dirname, 'bot.lock');

async function acquireLock() {
    try {
        await fs.writeFile(lockFile, process.pid.toString());
        return true;
    } catch (error) {
        const existingPid = await fs.readFile(lockFile, 'utf8');
        try {
            process.kill(existingPid, 0);
            console.log('Bot is already running with PID:', existingPid);
            return false;
        } catch (e) {
            console.log('Removing stale lock file');
            await fs.unlink(lockFile);
            return acquireLock();
        }
    }
}

async function releaseLock() {
    try {
        await fs.unlink(lockFile);
    } catch (error) {
        console.error('Error releasing lock:', error);
    }
}

// Start server
let server;

async function startBot() {
    const hasLock = await acquireLock();
    if (!hasLock) {
        console.log('Bot is already running. Exiting...');
        process.exit(0);
    }

    await loadOrderCounter();

    server = app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
        console.log(`WebApp URL: ${WEBAPP_URL}`);
        console.log(`Bot started successfully!`);
    });

    // Set webhook
    const webhookUrl = `${process.env.SERVER_URL || `http://localhost:${PORT}`}/bot${BOT_TOKEN}`;
    await bot.setWebHook(webhookUrl);

    app.post(`/bot${BOT_TOKEN}`, (req, res) => {
        bot.processUpdate(req.body);
        res.sendStatus(200);
    });
}

// Cleanup on exit
process.on('exit', async () => {
    await releaseLock();
});

startBot().catch(console.error);