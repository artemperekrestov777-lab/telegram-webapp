#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MacTabak Shop Bot - Полноценный магазин табачной продукции
Версия: 1.0
"""

import asyncio
import logging
import json
import os
from datetime import datetime
import random
import string
from typing import Dict, List, Optional

from aiogram import Bot, Dispatcher, F
from aiogram.types import (
    Message, CallbackQuery, ReplyKeyboardMarkup, KeyboardButton,
    InlineKeyboardMarkup, InlineKeyboardButton, FSInputFile,
    ReplyKeyboardRemove, WebAppInfo
)
from aiogram.filters import CommandStart, Command
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.fsm.storage.memory import MemoryStorage

# ==================== КОНФИГУРАЦИЯ ====================
BOT_TOKEN = "8271280984:AAEixRlC_gkioi6xetwzUnIew4_KPtS0Sgc"
ADMIN_ID = 827456169
MANAGER_ID = 827456169  # ID менеджера для клиентов из Москвы
SUPPORT_EMAIL = "chek_qr@bk.ru"
QR_CODE_PATH = "payment_qr.jpg"  # Путь к файлу с QR-кодом
WEBAPP_URL = "https://mactabak-webapp.pages.dev"  # URL вашего WebApp (нужно будет заменить)

# Файл для хранения базы товаров
PRODUCTS_FILE = "products_db.json"

# ==================== БАЗА ТОВАРОВ ====================
DEFAULT_PRODUCTS = {
    "new_mactabak": {
        "name": "🆕 Новинки от МАК ТАБАК",
        "products": [
            {"id": 1, "name": "🚬 Зажигалка для трубки SPUNK-BAOFA (3)", "price": 800, "stock": 10},
            {"id": 2, "name": "🚬 Зажигалка для трубки HONEST (3)", "price": 900, "stock": 8},
            {"id": 3, "name": "Премиум гильзы OCB 500 Black (1)", "price": 600, "stock": 15},
            {"id": 4, "name": "МАШИНКА НАБИВОЧНАЯ LED 1 (3)", "price": 3000, "stock": 5},
            {"id": 5, "name": "Сумка кожаная MUXIANG № 013 (1099) (1)", "price": 4800, "stock": 3}
        ]
    },
    "standard_blends": {
        "name": "🚬 Стандартные бленды",
        "products": [
            {"id": 6, "name": "ШТОРМ Storm", "price": 1700, "stock": 20},
            {"id": 7, "name": "ЛЕГЕНДА legend", "price": 1700, "stock": 20},
            {"id": 8, "name": "КРАСНЫЙ ДРАКОН RED DRAGON", "price": 1700, "stock": 15},
            {"id": 9, "name": "МАРШАЛ MARSHAL", "price": 1700, "stock": 18},
            {"id": 10, "name": "MAC - ВИНСТОН WINSTON", "price": 1950, "stock": 12}
        ]
    },
    "aroma_blends": {
        "name": "🌸 Ароматизированные бленды",
        "products": [
            {"id": 11, "name": "МАК МИКС", "price": 2200, "stock": 10},
            {"id": 12, "name": "БЛЕНД - ЮБИЛЕЙНЫЙ", "price": 2200, "stock": 10},
            {"id": 13, "name": "Х - БЛЕНД", "price": 2200, "stock": 10},
            {"id": 14, "name": "КОФЕ coffee", "price": 2200, "stock": 12}
        ]
    },
    "pipe_blends": {
        "name": "🚬 Трубочные бленды",
        "products": [
            {"id": 15, "name": "CAPTAIN BLACK CREAM", "price": 1200, "stock": 8},
            {"id": 16, "name": "CAPTAIN BLACK PLATINUM", "price": 1200, "stock": 8},
            {"id": 17, "name": "МОНАРХ MONARCH", "price": 1200, "stock": 10},
            {"id": 18, "name": "ТРУБОЧНЫЙ МАК ТАБАК", "price": 1000, "stock": 15}
        ]
    },
    "cigarette_tubes": {
        "name": "📦 Сигаретные гильзы",
        "products": [
            {"id": 19, "name": "Гильзы MASCOTTE X-Long (200 шт)", "price": 350, "stock": 30},
            {"id": 20, "name": "Гильзы MASCOTTE Carbon (200 шт)", "price": 400, "stock": 25},
            {"id": 21, "name": "Гильзы MASCOTTE Classic (200 шт)", "price": 300, "stock": 35},
            {"id": 22, "name": "Гильзы American Aviator Slim", "price": 200, "stock": 40}
        ]
    },
    "custom_set": {
        "name": "🎁 Собрать свой набор",
        "products": [
            {"id": 23, "name": "КОФЕ", "price": 800, "stock": 20},
            {"id": 24, "name": "ЗВАР", "price": 880, "stock": 20},
            {"id": 25, "name": "ХАЛФЗВАР", "price": 880, "stock": 20}
        ]
    },
    "mactabak_products": {
        "name": "⭐ Продукция от МАКТАБАК",
        "products": [
            {"id": 26, "name": "Mac LUXURY №3", "price": 1500, "stock": 10},
            {"id": 27, "name": "Mac LUXURY", "price": 1500, "stock": 10},
            {"id": 28, "name": "СТИЛЬНЫЙ ПОРТСИГАР- Х2", "price": 1800, "stock": 8},
            {"id": 29, "name": "СТИЛЬНЫЙ ПОРТСИГАР- Х3", "price": 1800, "stock": 8}
        ]
    },
    "smoking_pipes": {
        "name": "🗿 Курительные трубки",
        "products": [
            {"id": 30, "name": "ТРУБКА MR Burning 220", "price": 3500, "stock": 5},
            {"id": 31, "name": "MUXANG BRIAR № 888", "price": 8000, "stock": 3},
            {"id": 32, "name": "MR.BROG №63 Zurek 9мм", "price": 2000, "stock": 7},
            {"id": 33, "name": "Трубка MUXIANG BULLDOG", "price": 5500, "stock": 4}
        ]
    },
    "filling_machines": {
        "name": "⚙️ Машинки для набивки",
        "products": [
            {"id": 34, "name": "Машинка OCB EASY SLIDE", "price": 4000, "stock": 6},
            {"id": 35, "name": "МАШИНКА INJECTORMATIC 2", "price": 2500, "stock": 8},
            {"id": 36, "name": "МАШИНКА НАБИВОЧНАЯ LED", "price": 3000, "stock": 7},
            {"id": 37, "name": "МАШИНКА INJECTORMATIC 2 серебро", "price": 2500, "stock": 8}
        ]
    },
    "chinese_tea": {
        "name": "🍵 Китайский чай",
        "products": [
            {"id": 38, "name": "Шу пуэр Линьцанский 2017", "price": 1000, "stock": 12},
            {"id": 39, "name": "Улун Да Хун Пао", "price": 1800, "stock": 10},
            {"id": 40, "name": "Фуцзянь Хун Ча 500г", "price": 2300, "stock": 8},
            {"id": 41, "name": "Шу пуэр Золотой павлин 357г", "price": 2200, "stock": 9}
        ]
    },
    "tamper": {
        "name": "🔨 Тампер",
        "products": [
            {"id": 42, "name": "ТАМПЕР №1", "price": 1500, "stock": 10}
        ]
    }
}

# ==================== СОСТОЯНИЯ FSM ====================
class OrderStates(StatesGroup):
    waiting_for_phone = State()
    waiting_for_name = State()
    waiting_for_city = State()
    waiting_for_delivery = State()
    waiting_for_address = State()
    waiting_for_confirmation = State()

class AdminStates(StatesGroup):
    waiting_for_category = State()
    waiting_for_product = State()
    waiting_for_product_name = State()
    waiting_for_product_price = State()
    waiting_for_product_stock = State()
    edit_product_field = State()
    delete_product_confirm = State()
    broadcast_message = State()

# ==================== УТИЛИТЫ ====================
def generate_order_id():
    """Генерация уникального номера заказа"""
    return ''.join(random.choices(string.digits, k=5))

def load_products():
    """Загрузка товаров из файла"""
    if os.path.exists(PRODUCTS_FILE):
        with open(PRODUCTS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    else:
        save_products(DEFAULT_PRODUCTS)
        return DEFAULT_PRODUCTS

def save_products(products):
    """Сохранение товаров в файл"""
    with open(PRODUCTS_FILE, 'w', encoding='utf-8') as f:
        json.dump(products, f, ensure_ascii=False, indent=2)

def get_all_products():
    """Получить все товары списком"""
    products = load_products()
    all_items = []
    for category in products.values():
        all_items.extend(category["products"])
    return all_items

def get_product_by_id(product_id: int):
    """Получить товар по ID"""
    for product in get_all_products():
        if product["id"] == product_id:
            return product
    return None

# ==================== КЛАВИАТУРЫ ====================
def main_keyboard():
    """Главное меню с Web App"""
    keyboard = ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(
                text="🛍 Открыть каталог",
                web_app=WebAppInfo(url=f"{WEBAPP_URL}/webapp.html")
            )],
            [KeyboardButton(text="📋 Мои заказы"), KeyboardButton(text="📞 Контакты")],
            [KeyboardButton(text="ℹ️ О магазине")]
        ],
        resize_keyboard=True
    )
    return keyboard

def admin_keyboard():
    """Админ меню"""
    keyboard = ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="➕ Добавить товар"), KeyboardButton(text="✏️ Редактировать товар")],
            [KeyboardButton(text="❌ Удалить товар"), KeyboardButton(text="📊 Статистика")],
            [KeyboardButton(text="📨 Рассылка"), KeyboardButton(text="🔙 Выход из админки")]
        ],
        resize_keyboard=True
    )
    return keyboard

def categories_keyboard():
    """Клавиатура категорий"""
    products = load_products()
    keyboard = []

    # Кнопка "Все товары"
    keyboard.append([InlineKeyboardButton(text="📦 Все товары", callback_data="cat_all")])

    # Категории
    for cat_id, category in products.items():
        keyboard.append([InlineKeyboardButton(
            text=category["name"],
            callback_data=f"cat_{cat_id}"
        )])

    return InlineKeyboardMarkup(inline_keyboard=keyboard)

def products_keyboard(category_id: str, page: int = 0):
    """Клавиатура товаров в категории"""
    products = load_products()
    keyboard = []

    if category_id == "all":
        # Показать все товары
        all_products = get_all_products()
        items_per_page = 5
        start_idx = page * items_per_page
        end_idx = start_idx + items_per_page

        for product in all_products[start_idx:end_idx]:
            keyboard.append([InlineKeyboardButton(
                text=f"🚬 {product['name'][:27]}... - {product['price']}₽",
                callback_data=f"prod_{product['id']}"
            )])

        # Навигация
        nav_buttons = []
        if page > 0:
            nav_buttons.append(InlineKeyboardButton(text="◀️", callback_data=f"page_all_{page-1}"))
        if end_idx < len(all_products):
            nav_buttons.append(InlineKeyboardButton(text="▶️", callback_data=f"page_all_{page+1}"))
        if nav_buttons:
            keyboard.append(nav_buttons)
    else:
        # Товары конкретной категории
        if category_id in products:
            for product in products[category_id]["products"]:
                text = f"🚬 {product['name'][:27]}... - {product['price']}₽"
                if product.get("stock", 0) == 0:
                    text += " ❌"
                keyboard.append([InlineKeyboardButton(
                    text=text,
                    callback_data=f"prod_{product['id']}"
                )])

    keyboard.append([InlineKeyboardButton(text="🔙 Назад к категориям", callback_data="back_to_categories")])

    return InlineKeyboardMarkup(inline_keyboard=keyboard)

def cart_keyboard():
    """Клавиатура корзины"""
    keyboard = [
        [InlineKeyboardButton(text="✅ Оформить заказ", callback_data="checkout")],
        [InlineKeyboardButton(text="🗑 Очистить корзину", callback_data="clear_cart")],
        [InlineKeyboardButton(text="🔙 Продолжить покупки", callback_data="continue_shopping")]
    ]
    return InlineKeyboardMarkup(inline_keyboard=keyboard)

def delivery_keyboard():
    """Клавиатура выбора доставки"""
    keyboard = [
        [InlineKeyboardButton(text="📦 СДЭК (500₽)", callback_data="delivery_cdek")],
        [InlineKeyboardButton(text="✉️ Почта России (600₽)", callback_data="delivery_post")]
    ]
    return InlineKeyboardMarkup(inline_keyboard=keyboard)

def confirm_order_keyboard():
    """Подтверждение заказа"""
    keyboard = [
        [InlineKeyboardButton(text="✅ Подтвердить заказ", callback_data="confirm_order")],
        [InlineKeyboardButton(text="❌ Отменить", callback_data="cancel_order")]
    ]
    return InlineKeyboardMarkup(inline_keyboard=keyboard)

# ==================== ИНИЦИАЛИЗАЦИЯ ====================
logging.basicConfig(level=logging.INFO)
bot = Bot(token=BOT_TOKEN)
dp = Dispatcher(storage=MemoryStorage())

# ==================== ОБРАБОТЧИКИ КОМАНД ====================
@dp.message(CommandStart())
async def start_command(message: Message, state: FSMContext):
    """Обработка команды /start"""
    await state.clear()

    # Проверка на админа
    if message.from_user.id == ADMIN_ID:
        await message.answer(
            f"👋 Добро пожаловать, Администратор!\n"
            f"🛍 Магазин *MacTabak*\n\n"
            f"Используйте /admin для входа в админ-панель",
            reply_markup=main_keyboard(),
            parse_mode="Markdown"
        )
    else:
        await message.answer(
            f"👋 Добро пожаловать в магазин *MacTabak*!\n\n"
            f"🚬 У нас вы найдете:\n"
            f"• Табачные смеси высшего качества\n"
            f"• Трубки и аксессуары\n"
            f"• Машинки для набивки\n"
            f"• Элитный китайский чай\n\n"
            f"Выберите действие из меню ниже 👇",
            reply_markup=main_keyboard(),
            parse_mode="Markdown"
        )

@dp.message(Command("admin"))
async def admin_command(message: Message):
    """Вход в админ-панель"""
    if message.from_user.id == ADMIN_ID:
        await message.answer(
            "🔐 *Админ-панель MacTabak*\n\n"
            "Доступные функции:\n"
            "• Добавление товаров\n"
            "• Редактирование цен и остатков\n"
            "• Удаление товаров\n"
            "• Просмотр статистики\n"
            "• Массовая рассылка",
            reply_markup=admin_keyboard(),
            parse_mode="Markdown"
        )
    else:
        await message.answer("❌ У вас нет доступа к админ-панели")

# ==================== ОБРАБОТЧИК WEB APP ====================
@dp.message(F.web_app_data)
async def handle_web_app_data(message: Message, state: FSMContext):
    """Обработка данных из Web App"""
    try:
        # Парсим данные из Web App
        data = json.loads(message.web_app_data.data)

        # Сохраняем корзину и переходим к оформлению
        cart = {}
        for item in data.get("items", []):
            cart[str(item["id"])] = {"quantity": item["quantity"]}

        await state.update_data(cart=cart)

        # Начинаем оформление заказа
        await message.answer(
            f"✅ Получен заказ на сумму: {data['total']} ₽\n\n"
            f"📱 Введите ваш номер телефона:\n"
            f"(Формат: +7XXXXXXXXXX)",
            reply_markup=ReplyKeyboardRemove()
        )
        await state.set_state(OrderStates.waiting_for_phone)

    except Exception as e:
        await message.answer(f"❌ Ошибка обработки заказа: {str(e)}")

# ==================== ОБРАБОТЧИКИ ГЛАВНОГО МЕНЮ ====================
@dp.message(F.text == "🛍 Каталог")
async def show_catalog(message: Message):
    """Показать каталог - теперь через Web App"""
    await message.answer(
        "📱 Используйте кнопку 'Открыть каталог' для просмотра товаров в удобном интерфейсе",
        reply_markup=main_keyboard()
    )

@dp.message(F.text == "🛒 Корзина")
async def show_cart(message: Message, state: FSMContext):
    """Показать корзину"""
    data = await state.get_data()
    cart = data.get("cart", {})

    if not cart:
        await message.answer("🛒 Ваша корзина пуста\n\nДобавьте товары из каталога")
        return

    text = "🛒 *Ваша корзина:*\n\n"
    total = 0

    for product_id, item_data in cart.items():
        product = get_product_by_id(int(product_id))
        if product:
            item_total = product["price"] * item_data["quantity"]
            total += item_total
            text += f"• {product['name']}\n"
            text += f"  {item_data['quantity']} шт × {product['price']}₽ = {item_total}₽\n\n"

    text += f"💰 *Итого: {total}₽*"

    await message.answer(text, reply_markup=cart_keyboard(), parse_mode="Markdown")

@dp.message(F.text == "📋 Мои заказы")
async def show_orders(message: Message, state: FSMContext):
    """Показать историю заказов"""
    data = await state.get_data()
    orders = data.get("orders", [])

    if not orders:
        await message.answer("📋 У вас пока нет заказов\n\nОформите первый заказ в нашем магазине!")
        return

    text = "📋 *Ваши заказы:*\n\n"
    for order in orders[-5:]:  # Показываем последние 5 заказов
        text += f"Заказ №{order['id']} от {order['date']}\n"
        text += f"Статус: {order['status']}\n"
        text += f"Сумма: {order['total']}₽\n\n"

    await message.answer(text, parse_mode="Markdown")

@dp.message(F.text == "📞 Контакты")
async def show_contacts(message: Message):
    """Показать контакты"""
    await message.answer(
        "📞 *Контакты MacTabak*\n\n"
        "📧 Email для чеков: chek_qr@bk.ru\n"
        "⏰ Режим работы: Пн-Вс 9:00-21:00\n\n"
        "❓ По всем вопросам обращайтесь в поддержку",
        parse_mode="Markdown"
    )

@dp.message(F.text == "ℹ️ О магазине")
async def show_about(message: Message):
    """О магазине"""
    await message.answer(
        "ℹ️ *О магазине MacTabak*\n\n"
        "🚬 Мы специализируемся на продаже:\n"
        "• Качественного табака собственного производства\n"
        "• Трубок и аксессуаров для курения\n"
        "• Машинок для набивки сигарет\n"
        "• Элитного китайского чая\n\n"
        "✅ Гарантируем:\n"
        "• 100% оригинальную продукцию\n"
        "• Быструю доставку по всей России\n"
        "• Конфиденциальность заказов\n\n"
        "🏆 Работаем с 2020 года",
        parse_mode="Markdown"
    )

# ==================== ОБРАБОТЧИКИ КАТАЛОГА ====================
@dp.callback_query(F.data.startswith("cat_"))
async def show_category_products(callback: CallbackQuery):
    """Показать товары категории"""
    category_id = callback.data.replace("cat_", "")

    if category_id == "all":
        text = "📦 *Все товары:*"
    else:
        products = load_products()
        if category_id in products:
            text = f"{products[category_id]['name']}"
        else:
            await callback.answer("❌ Категория не найдена")
            return

    await callback.message.edit_text(
        text,
        reply_markup=products_keyboard(category_id),
        parse_mode="Markdown"
    )

@dp.callback_query(F.data.startswith("prod_"))
async def show_product_detail(callback: CallbackQuery, state: FSMContext):
    """Показать детали товара"""
    product_id = int(callback.data.replace("prod_", ""))
    product = get_product_by_id(product_id)

    if not product:
        await callback.answer("❌ Товар не найден")
        return

    # Сохраняем текущий товар и количество
    await state.update_data(current_product=product_id, current_quantity=1)

    text = f"📦 *{product['name']}*\n\n"
    text += f"💰 Цена: *{product['price']}₽*\n"

    if product.get("stock", 0) > 0:
        text += f"✅ В наличии: {product['stock']} шт.\n\n"
        text += "Выберите количество и нажмите 'Добавить в корзину'"

        keyboard = [
            [
                InlineKeyboardButton(text="➖", callback_data=f"qty_minus_{product_id}"),
                InlineKeyboardButton(text="1", callback_data="qty_current"),
                InlineKeyboardButton(text="➕", callback_data=f"qty_plus_{product_id}")
            ],
            [InlineKeyboardButton(text="🛒 Добавить в корзину", callback_data=f"add_to_cart_{product_id}")],
            [InlineKeyboardButton(text="🔙 Назад", callback_data="back_to_products")]
        ]
    else:
        text += "❌ *Товар временно отсутствует*"
        keyboard = [
            [InlineKeyboardButton(text="🔙 Назад", callback_data="back_to_products")]
        ]

    await callback.message.edit_text(
        text,
        reply_markup=InlineKeyboardMarkup(inline_keyboard=keyboard),
        parse_mode="Markdown"
    )

@dp.callback_query(F.data.startswith("qty_"))
async def change_quantity(callback: CallbackQuery, state: FSMContext):
    """Изменить количество товара"""
    data = await state.get_data()
    current_quantity = data.get("current_quantity", 1)
    product_id = data.get("current_product")

    if callback.data.startswith("qty_plus_"):
        product = get_product_by_id(product_id)
        if product and current_quantity < product.get("stock", 1):
            current_quantity += 1
        else:
            await callback.answer("❌ Достигнуто максимальное количество")
            return
    elif callback.data.startswith("qty_minus_"):
        if current_quantity > 1:
            current_quantity -= 1
        else:
            await callback.answer("❌ Минимальное количество - 1")
            return

    await state.update_data(current_quantity=current_quantity)

    # Обновляем клавиатуру
    keyboard = [
        [
            InlineKeyboardButton(text="➖", callback_data=f"qty_minus_{product_id}"),
            InlineKeyboardButton(text=str(current_quantity), callback_data="qty_current"),
            InlineKeyboardButton(text="➕", callback_data=f"qty_plus_{product_id}")
        ],
        [InlineKeyboardButton(text="🛒 Добавить в корзину", callback_data=f"add_to_cart_{product_id}")],
        [InlineKeyboardButton(text="🔙 Назад", callback_data="back_to_products")]
    ]

    await callback.message.edit_reply_markup(
        reply_markup=InlineKeyboardMarkup(inline_keyboard=keyboard)
    )

@dp.callback_query(F.data.startswith("add_to_cart_"))
async def add_to_cart(callback: CallbackQuery, state: FSMContext):
    """Добавить товар в корзину"""
    product_id = callback.data.replace("add_to_cart_", "")

    data = await state.get_data()
    cart = data.get("cart", {})
    quantity = data.get("current_quantity", 1)

    # Добавляем или обновляем товар в корзине
    if product_id in cart:
        cart[product_id]["quantity"] += quantity
    else:
        cart[product_id] = {"quantity": quantity}

    await state.update_data(cart=cart)

    product = get_product_by_id(int(product_id))
    await callback.answer(f"✅ {product['name']} добавлен в корзину ({quantity} шт.)")

    # Возвращаемся к категориям
    await callback.message.edit_text(
        "📂 Выберите категорию товаров:",
        reply_markup=categories_keyboard()
    )

@dp.callback_query(F.data == "back_to_categories")
async def back_to_categories(callback: CallbackQuery):
    """Вернуться к категориям"""
    await callback.message.edit_text(
        "📂 Выберите категорию товаров:",
        reply_markup=categories_keyboard()
    )

@dp.callback_query(F.data == "back_to_products")
async def back_to_products(callback: CallbackQuery):
    """Вернуться к списку товаров"""
    await callback.message.edit_text(
        "📂 Выберите категорию товаров:",
        reply_markup=categories_keyboard()
    )

@dp.callback_query(F.data == "continue_shopping")
async def continue_shopping(callback: CallbackQuery):
    """Продолжить покупки"""
    await callback.message.answer(
        "📂 Выберите категорию товаров:",
        reply_markup=categories_keyboard()
    )

# ==================== ОБРАБОТЧИКИ КОРЗИНЫ ====================
@dp.callback_query(F.data == "clear_cart")
async def clear_cart(callback: CallbackQuery, state: FSMContext):
    """Очистить корзину"""
    await state.update_data(cart={})
    await callback.answer("🗑 Корзина очищена")
    await callback.message.edit_text("🛒 Ваша корзина пуста")

@dp.callback_query(F.data == "checkout")
async def start_checkout(callback: CallbackQuery, state: FSMContext):
    """Начать оформление заказа"""
    data = await state.get_data()
    cart = data.get("cart", {})

    if not cart:
        await callback.answer("❌ Корзина пуста")
        return

    await callback.message.answer(
        "📱 Введите ваш номер телефона:\n"
        "(Формат: +7XXXXXXXXXX)",
        reply_markup=ReplyKeyboardRemove()
    )
    await state.set_state(OrderStates.waiting_for_phone)

# ==================== ОБРАБОТЧИКИ ОФОРМЛЕНИЯ ЗАКАЗА ====================
@dp.message(OrderStates.waiting_for_phone)
async def process_phone(message: Message, state: FSMContext):
    """Обработка номера телефона"""
    phone = message.text.strip()

    # Простая валидация
    if not phone.startswith("+7") or len(phone) != 12:
        await message.answer("❌ Неверный формат номера. Используйте формат: +7XXXXXXXXXX")
        return

    await state.update_data(phone=phone)
    await message.answer("👤 Введите ваше имя:")
    await state.set_state(OrderStates.waiting_for_name)

@dp.message(OrderStates.waiting_for_name)
async def process_name(message: Message, state: FSMContext):
    """Обработка имени"""
    await state.update_data(name=message.text)
    await message.answer("🏙 Введите ваш город:")
    await state.set_state(OrderStates.waiting_for_city)

@dp.message(OrderStates.waiting_for_city)
async def process_city(message: Message, state: FSMContext):
    """Обработка города"""
    city = message.text.lower()
    await state.update_data(city=message.text)

    # Проверяем, Москва ли это
    is_moscow = ("москв" in city or
                 city.startswith("мо ") or
                 city == "мо" or
                 "московская область" in city or
                 city == "мск" or
                 "moscow" in city)
    await state.update_data(is_moscow=is_moscow)

    await message.answer(
        "🚚 Выберите способ доставки:",
        reply_markup=delivery_keyboard()
    )
    await state.set_state(OrderStates.waiting_for_delivery)

@dp.callback_query(OrderStates.waiting_for_delivery)
async def process_delivery(callback: CallbackQuery, state: FSMContext):
    """Обработка способа доставки"""
    delivery_type = "СДЭК" if callback.data == "delivery_cdek" else "Почта России"
    delivery_cost = 500 if callback.data == "delivery_cdek" else 600

    await state.update_data(delivery_type=delivery_type, delivery_cost=delivery_cost)

    await callback.message.answer("📍 Введите полный адрес доставки:")
    await state.set_state(OrderStates.waiting_for_address)

@dp.message(OrderStates.waiting_for_address)
async def process_address(message: Message, state: FSMContext):
    """Обработка адреса и показ итогового заказа"""
    await state.update_data(address=message.text)

    # Получаем все данные
    data = await state.get_data()
    cart = data.get("cart", {})

    # Генерируем номер заказа
    order_id = generate_order_id()
    await state.update_data(order_id=order_id)

    # Формируем текст заказа
    text = f"📋 *Заказ №{order_id}*\n\n"
    text += f"👤 Имя: {data['name']}\n"
    text += f"📱 Телефон: {data['phone']}\n"
    text += f"🏙 Город: {data['city']}\n"
    text += f"📍 Адрес: {data['address']}\n"
    text += f"🚚 Доставка: {data['delivery_type']} ({data['delivery_cost']}₽)\n\n"
    text += "*Товары:*\n"

    total = 0
    for product_id, item_data in cart.items():
        product = get_product_by_id(int(product_id))
        if product:
            item_total = product["price"] * item_data["quantity"]
            total += item_total
            text += f"• {product['name']}\n"
            text += f"  {item_data['quantity']} шт × {product['price']}₽ = {item_total}₽\n"

    total += data['delivery_cost']
    text += f"\n💰 *Итого с доставкой: {total}₽*"

    await state.update_data(total=total)

    await message.answer(
        text,
        reply_markup=confirm_order_keyboard(),
        parse_mode="Markdown"
    )
    await state.set_state(OrderStates.waiting_for_confirmation)

@dp.callback_query(F.data == "confirm_order", OrderStates.waiting_for_confirmation)
async def confirm_order(callback: CallbackQuery, state: FSMContext):
    """Подтверждение заказа и отправка платежной информации"""
    data = await state.get_data()

    # Проверяем, из Москвы ли клиент
    if data.get("is_moscow", False):
        # Для Москвы - переводим на менеджера
        await callback.message.answer(
            f"✅ *Заказ №{data['order_id']} подтвержден!*\n\n"
            f"Для клиентов из Москвы и Московской области действует особый порядок оплаты.\n\n"
            f"🔹 Наш менеджер свяжется с вами для предоставления реквизитов.\n"
            f"🔹 Контакт менеджера: @manager_mactabak\n\n"
            f"Ожидайте сообщения от менеджера.",
            parse_mode="Markdown",
            reply_markup=main_keyboard()
        )

        # Уведомляем менеджера
        manager_text = f"🆕 *Новый заказ из Москвы!*\n\n"
        manager_text += f"Заказ №{data['order_id']}\n"
        manager_text += f"Клиент: {data['name']}\n"
        manager_text += f"Телефон: {data['phone']}\n"
        manager_text += f"Город: {data['city']}\n"
        manager_text += f"Адрес: {data['address']}\n"
        manager_text += f"Сумма: {data['total']}₽\n\n"
        manager_text += f"Свяжитесь с клиентом для предоставления реквизитов!"

        try:
            await bot.send_message(MANAGER_ID, manager_text, parse_mode="Markdown")
        except:
            pass
    else:
        # Для остальных регионов - отправляем QR
        payment_message = f"""
Добрый день!
Пожалуйста, прочитайте всю информацию до конца ‼️‼️‼️👇🏻👇🏻👇🏻

Заказ *{data['order_id']}* подтвержден.
Предварительная дата отправки вашего заказа через 1-3 дня!
Сроки могут сдвигаться от 1 до 7 дней!

‼️*ВНИМАНИЕ❗️ВАЖНО*‼️
После оплаты заказа ОТПРАВЬТЕ ЧЕК на почту: *{SUPPORT_EMAIL}*
и в письме УКАЖИТЕ НОМЕР ЗАКАЗА!!!

🚫ПИСЬМО С ЧЕКОМ ДОСТАТОЧНО ОТПРАВИТЬ ОДИН РАЗ‼️‼️

📌В КОММЕНТАРИЯХ К ПЛАТЕЖУ НИЧЕГО ПИСАТЬ НЕ НУЖНО‼️‼️‼️

*Сумма к оплате: {data['total']}₽*
"""

        await callback.message.answer(
            payment_message,
            parse_mode="Markdown",
            reply_markup=main_keyboard()
        )

        # Отправляем QR-код
        if os.path.exists(QR_CODE_PATH):
            try:
                qr_file = FSInputFile(QR_CODE_PATH)
                await callback.message.answer_photo(
                    photo=qr_file,
                    caption=f"📱 QR-код для оплаты заказа №{data['order_id']}\n\n💰 Сумма: {data['total']}₽"
                )
            except Exception as e:
                await callback.message.answer(f"⚠️ Ошибка отправки QR-кода: {str(e)}")
        else:
            await callback.message.answer("⚠️ QR-код временно недоступен. Свяжитесь с поддержкой.")

    # Уведомляем админа
    admin_text = f"🆕 *Новый заказ №{data['order_id']}*\n\n"
    admin_text += f"Клиент: {data['name']}\n"
    admin_text += f"Телефон: {data['phone']}\n"
    admin_text += f"Город: {data['city']}\n"
    admin_text += f"Адрес: {data['address']}\n"
    admin_text += f"Доставка: {data['delivery_type']}\n"
    admin_text += f"Сумма: {data['total']}₽\n"

    if data.get("is_moscow", False):
        admin_text += f"\n⚠️ Клиент из Москвы - направлен к менеджеру"
    else:
        admin_text += f"\n✅ Клиенту отправлен QR для оплаты"

    try:
        await bot.send_message(ADMIN_ID, admin_text, parse_mode="Markdown")
    except:
        pass

    # Сохраняем заказ в историю
    orders = data.get("orders", [])
    orders.append({
        "id": data['order_id'],
        "date": datetime.now().strftime("%d.%m.%Y %H:%M"),
        "total": data['total'],
        "status": "Ожидает оплаты"
    })
    await state.update_data(orders=orders)

    # Очищаем корзину
    await state.update_data(cart={})
    await state.set_state(None)

@dp.callback_query(F.data == "cancel_order", OrderStates.waiting_for_confirmation)
async def cancel_order(callback: CallbackQuery, state: FSMContext):
    """Отмена заказа"""
    await callback.answer("❌ Заказ отменен")
    await callback.message.answer(
        "Заказ отменен. Вы можете продолжить покупки.",
        reply_markup=main_keyboard()
    )
    await state.set_state(None)

# ==================== АДМИН-ПАНЕЛЬ ====================
@dp.message(F.text == "➕ Добавить товар")
async def admin_add_product(message: Message, state: FSMContext):
    """Добавление товара"""
    if message.from_user.id != ADMIN_ID:
        return

    products = load_products()
    text = "Выберите категорию для добавления товара:\n\n"

    for idx, (cat_id, category) in enumerate(products.items(), 1):
        text += f"{idx}. {category['name']}\n"

    await message.answer(text)
    await state.set_state(AdminStates.waiting_for_category)

@dp.message(F.text == "📊 Статистика")
async def admin_stats(message: Message, state: FSMContext):
    """Показать статистику"""
    if message.from_user.id != ADMIN_ID:
        return

    data = await state.get_data()
    orders = data.get("all_orders", [])

    text = "📊 *Статистика магазина:*\n\n"
    text += f"Всего заказов: {len(orders)}\n"

    if orders:
        total_sum = sum(order.get("total", 0) for order in orders)
        text += f"Общая сумма: {total_sum}₽\n"
        text += f"Средний чек: {total_sum // len(orders)}₽\n"

    # Статистика по товарам
    products = load_products()
    total_products = sum(len(cat["products"]) for cat in products.values())
    text += f"\nТоваров в каталоге: {total_products}\n"

    await message.answer(text, parse_mode="Markdown")

@dp.message(F.text == "🔙 Выход из админки")
async def admin_exit(message: Message):
    """Выход из админ-панели"""
    if message.from_user.id != ADMIN_ID:
        return

    await message.answer(
        "Вы вышли из админ-панели",
        reply_markup=main_keyboard()
    )

# ==================== ЗАПУСК БОТА ====================
async def main():
    """Главная функция запуска бота"""
    print("🚀 Запуск MacTabak Shop Bot...")
    print(f"✅ Админ ID: {ADMIN_ID}")
    print(f"✅ Менеджер ID: {MANAGER_ID}")

    # Проверяем наличие файлов
    if not os.path.exists(PRODUCTS_FILE):
        save_products(DEFAULT_PRODUCTS)
        print("✅ База товаров создана")

    if not os.path.exists(QR_CODE_PATH):
        print("⚠️ Внимание: QR-код не найден! Добавьте файл payment_qr.jpg")

    # Запускаем бота
    try:
        await dp.start_polling(bot)
    except Exception as e:
        print(f"❌ Ошибка: {e}")

if __name__ == "__main__":
    asyncio.run(main())