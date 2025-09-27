import asyncio
import json
import logging
from datetime import datetime
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command, StateFilter
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.fsm.storage.memory import MemoryStorage
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, ReplyKeyboardMarkup, KeyboardButton, ReplyKeyboardRemove

# Настройки
BOT_TOKEN = "8271280984:AAEixRlC_gkioi6xetwzUnIew4_KPtS0Sgc"
ADMIN_ID = 827456169
MANAGER_ID = 706541536
SUPPORT_EMAIL = "chek_qr@bk.ru"

# Логирование
logging.basicConfig(level=logging.INFO)

# Инициализация бота
bot = Bot(token=BOT_TOKEN)
storage = MemoryStorage()
dp = Dispatcher(storage=storage)

# FSM состояния
class OrderStates(StatesGroup):
    choosing_category = State()
    choosing_product = State()
    entering_quantity = State()
    cart_menu = State()
    entering_name = State()
    entering_phone = State()
    entering_city = State()
    choosing_delivery = State()
    entering_address = State()
    confirming_order = State()

# Загрузка базы товаров
def load_products():
    try:
        with open('products_db.json', 'r', encoding='utf-8') as f:
            return json.load(f)
    except:
        return {"categories": {}, "products": {}}

# Сохранение заказов
def save_order(order_data):
    try:
        with open('orders.json', 'r', encoding='utf-8') as f:
            orders = json.load(f)
    except:
        orders = []

    orders.append(order_data)

    with open('orders.json', 'w', encoding='utf-8') as f:
        json.dump(orders, f, ensure_ascii=False, indent=2)

# Клавиатуры
def get_main_menu():
    keyboard = ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="🛍 Каталог"), KeyboardButton(text="🛒 Корзина")],
            [KeyboardButton(text="📦 Мои заказы"), KeyboardButton(text="ℹ️ О нас")],
            [KeyboardButton(text="📞 Поддержка")]
        ],
        resize_keyboard=True
    )
    return keyboard

def get_categories_keyboard():
    products_db = load_products()
    keyboard = []
    row = []

    for category in products_db.get("categories", {}).keys():
        row.append(InlineKeyboardButton(text=category, callback_data=f"cat_{category}"))
        if len(row) == 2:
            keyboard.append(row)
            row = []

    if row:
        keyboard.append(row)

    keyboard.append([InlineKeyboardButton(text="🔙 Главное меню", callback_data="main_menu")])

    return InlineKeyboardMarkup(inline_keyboard=keyboard)

def get_products_keyboard(category):
    products_db = load_products()
    keyboard = []

    category_products = products_db.get("categories", {}).get(category, [])
    for product_id in category_products:
        product = products_db.get("products", {}).get(str(product_id))
        if product:
            keyboard.append([InlineKeyboardButton(
                text=f"{product['name']} - {product['price']}₽",
                callback_data=f"prod_{product_id}"
            )])

    keyboard.append([InlineKeyboardButton(text="🔙 К категориям", callback_data="back_to_categories")])

    return InlineKeyboardMarkup(inline_keyboard=keyboard)

def get_quantity_keyboard():
    keyboard = []
    row = []
    for i in range(1, 11):
        row.append(InlineKeyboardButton(text=str(i), callback_data=f"qty_{i}"))
        if i % 5 == 0:
            keyboard.append(row)
            row = []

    keyboard.append([InlineKeyboardButton(text="❌ Отмена", callback_data="cancel_product")])

    return InlineKeyboardMarkup(inline_keyboard=keyboard)

def get_cart_keyboard():
    keyboard = [
        [InlineKeyboardButton(text="✅ Оформить заказ", callback_data="checkout")],
        [InlineKeyboardButton(text="🗑 Очистить корзину", callback_data="clear_cart")],
        [InlineKeyboardButton(text="➕ Добавить товар", callback_data="add_more")],
        [InlineKeyboardButton(text="🔙 Главное меню", callback_data="main_menu")]
    ]
    return InlineKeyboardMarkup(inline_keyboard=keyboard)

def get_delivery_keyboard():
    keyboard = [
        [InlineKeyboardButton(text="СДЭК (500₽)", callback_data="delivery_sdek")],
        [InlineKeyboardButton(text="Почта России (600₽)", callback_data="delivery_post")],
        [InlineKeyboardButton(text="❌ Отмена", callback_data="cancel_order")]
    ]
    return InlineKeyboardMarkup(inline_keyboard=keyboard)

def get_confirm_keyboard():
    keyboard = [
        [InlineKeyboardButton(text="✅ Подтвердить", callback_data="confirm_order")],
        [InlineKeyboardButton(text="❌ Отменить", callback_data="cancel_order")]
    ]
    return InlineKeyboardMarkup(inline_keyboard=keyboard)

# Обработчики команд
@dp.message(Command("start"))
async def start_command(message: types.Message, state: FSMContext):
    await state.clear()
    await state.update_data(cart={})

    await message.answer(
        "🚬 Добро пожаловать в MacTabak!\n\n"
        "Лучший табачный магазин в вашем телефоне.\n"
        "Выберите действие:",
        reply_markup=get_main_menu()
    )

@dp.message(Command("admin"))
async def admin_command(message: types.Message):
    if message.from_user.id != ADMIN_ID:
        await message.answer("❌ У вас нет доступа к админ-панели")
        return

    try:
        with open('orders.json', 'r', encoding='utf-8') as f:
            orders = json.load(f)

        if not orders:
            await message.answer("📭 Заказов пока нет")
            return

        stats = f"📊 Статистика:\n"
        stats += f"Всего заказов: {len(orders)}\n"
        total_sum = sum(order.get('total', 0) for order in orders)
        stats += f"Общая сумма: {total_sum}₽\n\n"

        stats += "📦 Последние 5 заказов:\n"
        for order in orders[-5:]:
            stats += f"#{order.get('order_id', 'N/A')} - {order.get('customer_name', 'N/A')} - {order.get('total', 0)}₽\n"

        await message.answer(stats)
    except:
        await message.answer("📭 Заказов пока нет")

# Обработчики текстовых сообщений
@dp.message(F.text == "🛍 Каталог")
async def show_catalog(message: types.Message, state: FSMContext):
    await state.set_state(OrderStates.choosing_category)
    await message.answer("Выберите категорию:", reply_markup=get_categories_keyboard())

@dp.message(F.text == "🛒 Корзина")
async def show_cart(message: types.Message, state: FSMContext):
    data = await state.get_data()
    cart = data.get('cart', {})

    if not cart:
        await message.answer("🛒 Ваша корзина пуста")
        return

    products_db = load_products()
    cart_text = "🛒 Ваша корзина:\n\n"
    total = 0

    for product_id, quantity in cart.items():
        product = products_db.get("products", {}).get(str(product_id))
        if product:
            subtotal = product['price'] * quantity
            total += subtotal
            cart_text += f"• {product['name']} x{quantity} = {subtotal}₽\n"

    cart_text += f"\n💰 Итого: {total}₽"

    await state.set_state(OrderStates.cart_menu)
    await message.answer(cart_text, reply_markup=get_cart_keyboard())

@dp.message(F.text == "📦 Мои заказы")
async def show_orders(message: types.Message):
    user_id = message.from_user.id

    try:
        with open('orders.json', 'r', encoding='utf-8') as f:
            orders = json.load(f)

        user_orders = [o for o in orders if o.get('user_id') == user_id]

        if not user_orders:
            await message.answer("📭 У вас пока нет заказов")
            return

        orders_text = "📦 Ваши заказы:\n\n"
        for order in user_orders[-5:]:
            orders_text += f"Заказ #{order['order_id']}\n"
            orders_text += f"Дата: {order['date']}\n"
            orders_text += f"Сумма: {order['total']}₽\n"
            orders_text += f"Статус: {order.get('status', 'В обработке')}\n\n"

        await message.answer(orders_text)
    except:
        await message.answer("📭 У вас пока нет заказов")

@dp.message(F.text == "ℹ️ О нас")
async def about_us(message: types.Message):
    await message.answer(
        "🚬 MacTabak - ваш надежный поставщик табачной продукции\n\n"
        "✅ Только оригинальная продукция\n"
        "🚚 Доставка по всей России\n"
        "💰 Доступные цены\n"
        "🔒 Безопасная оплата\n\n"
        "Работаем для вас с 2020 года!"
    )

@dp.message(F.text == "📞 Поддержка")
async def support(message: types.Message):
    await message.answer(
        "📞 Служба поддержки\n\n"
        f"Email: {SUPPORT_EMAIL}\n"
        "Telegram: @mactabak_support\n\n"
        "Мы работаем ежедневно с 10:00 до 22:00"
    )

# Обработчики callback-запросов
@dp.callback_query(F.data.startswith("cat_"))
async def category_selected(callback: types.CallbackQuery, state: FSMContext):
    category = callback.data.replace("cat_", "")
    await state.update_data(current_category=category)
    await state.set_state(OrderStates.choosing_product)

    await callback.message.edit_text(
        f"Категория: {category}\nВыберите товар:",
        reply_markup=get_products_keyboard(category)
    )

@dp.callback_query(F.data.startswith("prod_"))
async def product_selected(callback: types.CallbackQuery, state: FSMContext):
    product_id = callback.data.replace("prod_", "")
    products_db = load_products()
    product = products_db.get("products", {}).get(product_id)

    if not product:
        await callback.answer("❌ Товар не найден")
        return

    await state.update_data(current_product=product_id)
    await state.set_state(OrderStates.entering_quantity)

    await callback.message.edit_text(
        f"📦 {product['name']}\n"
        f"💰 Цена: {product['price']}₽\n"
        f"📝 {product.get('description', 'Описание отсутствует')}\n\n"
        "Выберите количество:",
        reply_markup=get_quantity_keyboard()
    )

@dp.callback_query(F.data.startswith("qty_"))
async def quantity_selected(callback: types.CallbackQuery, state: FSMContext):
    quantity = int(callback.data.replace("qty_", ""))
    data = await state.get_data()
    product_id = data.get('current_product')
    cart = data.get('cart', {})

    if product_id in cart:
        cart[product_id] += quantity
    else:
        cart[product_id] = quantity

    await state.update_data(cart=cart)

    products_db = load_products()
    product = products_db.get("products", {}).get(product_id)

    await callback.answer(f"✅ {product['name']} x{quantity} добавлен в корзину")
    await callback.message.edit_text(
        "Товар добавлен в корзину!\n\nЧто дальше?",
        reply_markup=InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="🛒 Перейти в корзину", callback_data="go_to_cart")],
            [InlineKeyboardButton(text="➕ Добавить еще", callback_data="add_more")],
            [InlineKeyboardButton(text="🔙 Главное меню", callback_data="main_menu")]
        ])
    )

@dp.callback_query(F.data == "go_to_cart")
async def go_to_cart(callback: types.CallbackQuery, state: FSMContext):
    data = await state.get_data()
    cart = data.get('cart', {})

    if not cart:
        await callback.message.edit_text("🛒 Ваша корзина пуста")
        return

    products_db = load_products()
    cart_text = "🛒 Ваша корзина:\n\n"
    total = 0

    for product_id, quantity in cart.items():
        product = products_db.get("products", {}).get(str(product_id))
        if product:
            subtotal = product['price'] * quantity
            total += subtotal
            cart_text += f"• {product['name']} x{quantity} = {subtotal}₽\n"

    cart_text += f"\n💰 Итого: {total}₽"

    await state.set_state(OrderStates.cart_menu)
    await callback.message.edit_text(cart_text, reply_markup=get_cart_keyboard())

@dp.callback_query(F.data == "checkout")
async def start_checkout(callback: types.CallbackQuery, state: FSMContext):
    await state.set_state(OrderStates.entering_name)
    await callback.message.edit_text(
        "📝 Оформление заказа\n\nВведите ваше имя:",
        reply_markup=None
    )

@dp.message(StateFilter(OrderStates.entering_name))
async def process_name(message: types.Message, state: FSMContext):
    await state.update_data(customer_name=message.text)
    await state.set_state(OrderStates.entering_phone)
    await message.answer("📱 Введите ваш телефон:")

@dp.message(StateFilter(OrderStates.entering_phone))
async def process_phone(message: types.Message, state: FSMContext):
    phone = message.text.strip()

    # Простая валидация телефона
    if len(phone) < 10 or not any(c.isdigit() for c in phone):
        await message.answer("❌ Неверный формат телефона. Попробуйте еще раз:")
        return

    await state.update_data(customer_phone=phone)
    await state.set_state(OrderStates.entering_city)
    await message.answer("🏙 Введите ваш город:")

@dp.message(StateFilter(OrderStates.entering_city))
async def process_city(message: types.Message, state: FSMContext):
    city = message.text.strip()
    await state.update_data(customer_city=city)

    # Проверка на Москву
    is_moscow = city.lower() in ['москва', 'moscow', 'мск']
    await state.update_data(is_moscow=is_moscow)

    if is_moscow:
        # Для Москвы сразу переходим к подтверждению
        data = await state.get_data()
        cart = data.get('cart', {})
        products_db = load_products()

        order_text = "📋 Ваш заказ:\n\n"
        total = 0

        for product_id, quantity in cart.items():
            product = products_db.get("products", {}).get(str(product_id))
            if product:
                subtotal = product['price'] * quantity
                total += subtotal
                order_text += f"• {product['name']} x{quantity} = {subtotal}₽\n"

        order_text += f"\n💰 Итого: {total}₽\n"
        order_text += f"\n👤 Имя: {data['customer_name']}\n"
        order_text += f"📱 Телефон: {data['customer_phone']}\n"
        order_text += f"🏙 Город: {city}\n"
        order_text += "\n⚠️ Доставка по Москве - менеджер свяжется с вами"

        await state.update_data(total=total)
        await state.set_state(OrderStates.confirming_order)
        await message.answer(order_text, reply_markup=get_confirm_keyboard())
    else:
        # Для регионов выбираем способ доставки
        await state.set_state(OrderStates.choosing_delivery)
        await message.answer("🚚 Выберите способ доставки:", reply_markup=get_delivery_keyboard())

@dp.callback_query(F.data.startswith("delivery_"))
async def delivery_selected(callback: types.CallbackQuery, state: FSMContext):
    delivery_type = callback.data.replace("delivery_", "")

    if delivery_type == "sdek":
        delivery_name = "СДЭК"
        delivery_price = 500
    else:
        delivery_name = "Почта России"
        delivery_price = 600

    await state.update_data(delivery_type=delivery_name, delivery_price=delivery_price)
    await state.set_state(OrderStates.entering_address)
    await callback.message.edit_text(f"📍 Введите адрес доставки ({delivery_name}):")

@dp.message(StateFilter(OrderStates.entering_address))
async def process_address(message: types.Message, state: FSMContext):
    await state.update_data(delivery_address=message.text)

    # Формируем итоговый заказ
    data = await state.get_data()
    cart = data.get('cart', {})
    products_db = load_products()

    order_text = "📋 Ваш заказ:\n\n"
    total = 0

    for product_id, quantity in cart.items():
        product = products_db.get("products", {}).get(str(product_id))
        if product:
            subtotal = product['price'] * quantity
            total += subtotal
            order_text += f"• {product['name']} x{quantity} = {subtotal}₽\n"

    delivery_price = data.get('delivery_price', 0)
    total += delivery_price

    order_text += f"\n🚚 Доставка ({data['delivery_type']}): {delivery_price}₽\n"
    order_text += f"\n💰 Итого: {total}₽\n"
    order_text += f"\n👤 Имя: {data['customer_name']}\n"
    order_text += f"📱 Телефон: {data['customer_phone']}\n"
    order_text += f"🏙 Город: {data['customer_city']}\n"
    order_text += f"📍 Адрес: {data['delivery_address']}\n"

    await state.update_data(total=total)
    await state.set_state(OrderStates.confirming_order)
    await message.answer(order_text, reply_markup=get_confirm_keyboard())

@dp.callback_query(F.data == "confirm_order")
async def confirm_order(callback: types.CallbackQuery, state: FSMContext):
    data = await state.get_data()

    # Создаем заказ
    order_id = int(datetime.now().timestamp())
    order_data = {
        "order_id": order_id,
        "user_id": callback.from_user.id,
        "date": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "customer_name": data.get('customer_name'),
        "customer_phone": data.get('customer_phone'),
        "customer_city": data.get('customer_city'),
        "delivery_address": data.get('delivery_address', ''),
        "delivery_type": data.get('delivery_type', ''),
        "cart": data.get('cart'),
        "total": data.get('total'),
        "status": "В обработке"
    }

    # Сохраняем заказ
    save_order(order_data)

    # Формируем сообщение для отправки
    products_db = load_products()
    order_message = f"🆕 Новый заказ #{order_id}\n\n"
    order_message += f"👤 {data['customer_name']}\n"
    order_message += f"📱 {data['customer_phone']}\n"
    order_message += f"🏙 {data['customer_city']}\n"

    if not data.get('is_moscow'):
        order_message += f"📍 {data.get('delivery_address', '')}\n"
        order_message += f"🚚 {data.get('delivery_type', '')}\n"

    order_message += "\n📦 Товары:\n"

    for product_id, quantity in data['cart'].items():
        product = products_db.get("products", {}).get(str(product_id))
        if product:
            order_message += f"• {product['name']} x{quantity}\n"

    order_message += f"\n💰 Сумма: {data['total']}₽"

    # Отправка в зависимости от города
    if data.get('is_moscow'):
        # Отправляем менеджеру для Москвы
        try:
            await bot.send_message(MANAGER_ID, order_message)
            await callback.message.edit_text(
                "✅ Заказ успешно оформлен!\n\n"
                f"Номер заказа: #{order_id}\n\n"
                "Наш менеджер свяжется с вами в ближайшее время для уточнения деталей доставки по Москве.",
                reply_markup=InlineKeyboardMarkup(inline_keyboard=[
                    [InlineKeyboardButton(text="🔙 В главное меню", callback_data="main_menu")]
                ])
            )
        except Exception as e:
            logging.error(f"Ошибка отправки менеджеру: {e}")
            await callback.answer("⚠️ Заказ оформлен, но возникла ошибка. Свяжитесь с поддержкой.")
    else:
        # Для регионов - QR-код оплаты
        await callback.message.edit_text(
            "✅ Заказ успешно оформлен!\n\n"
            f"Номер заказа: #{order_id}\n\n"
            f"💳 Для оплаты заказа переведите {data['total']}₽ по QR-коду:\n\n"
            "[QR-код для оплаты]\n\n"
            f"После оплаты отправьте чек на: {SUPPORT_EMAIL}",
            reply_markup=InlineKeyboardMarkup(inline_keyboard=[
                [InlineKeyboardButton(text="🔙 В главное меню", callback_data="main_menu")]
            ])
        )

    # Отправляем админу
    try:
        await bot.send_message(ADMIN_ID, f"🔔 {order_message}")
    except Exception as e:
        logging.error(f"Ошибка отправки админу: {e}")

    # Очищаем корзину
    await state.update_data(cart={})
    await state.set_state(None)

@dp.callback_query(F.data == "clear_cart")
async def clear_cart(callback: types.CallbackQuery, state: FSMContext):
    await state.update_data(cart={})
    await callback.answer("🗑 Корзина очищена")
    await callback.message.edit_text(
        "Корзина очищена. Выберите действие:",
        reply_markup=InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="🛍 К каталогу", callback_data="back_to_categories")],
            [InlineKeyboardButton(text="🔙 Главное меню", callback_data="main_menu")]
        ])
    )

@dp.callback_query(F.data == "add_more")
async def add_more_products(callback: types.CallbackQuery, state: FSMContext):
    await state.set_state(OrderStates.choosing_category)
    await callback.message.edit_text("Выберите категорию:", reply_markup=get_categories_keyboard())

@dp.callback_query(F.data == "back_to_categories")
async def back_to_categories(callback: types.CallbackQuery, state: FSMContext):
    await state.set_state(OrderStates.choosing_category)
    await callback.message.edit_text("Выберите категорию:", reply_markup=get_categories_keyboard())

@dp.callback_query(F.data == "main_menu")
async def back_to_main(callback: types.CallbackQuery, state: FSMContext):
    await state.set_state(None)
    await callback.message.delete()
    await callback.message.answer("Выберите действие:", reply_markup=get_main_menu())

@dp.callback_query(F.data == "cancel_product")
async def cancel_product(callback: types.CallbackQuery, state: FSMContext):
    data = await state.get_data()
    category = data.get('current_category')
    await state.set_state(OrderStates.choosing_product)
    await callback.message.edit_text(
        f"Категория: {category}\nВыберите товар:",
        reply_markup=get_products_keyboard(category)
    )

@dp.callback_query(F.data == "cancel_order")
async def cancel_order(callback: types.CallbackQuery, state: FSMContext):
    await state.update_data(cart={})
    await state.set_state(None)
    await callback.message.edit_text(
        "❌ Заказ отменен",
        reply_markup=InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="🔙 В главное меню", callback_data="main_menu")]
        ])
    )

# Запуск бота
async def main():
    logging.info("Бот запущен")
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())