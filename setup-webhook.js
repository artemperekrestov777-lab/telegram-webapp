const axios = require('axios');
require('dotenv').config();

const BOT_TOKEN = process.env.BOT_TOKEN;
const SERVER_URL = process.env.SERVER_URL || 'http://85.198.83.41:3000';

async function setupWebhook() {
    const webhookUrl = `${SERVER_URL}/bot${BOT_TOKEN}`;

    console.log('🔧 Настройка webhook для Telegram бота...');
    console.log(`📍 Webhook URL: ${webhookUrl}`);

    try {
        // Удаляем старый webhook
        console.log('🗑️  Удаление старого webhook...');
        await axios.get(`https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook`);

        // Устанавливаем новый webhook
        console.log('📌 Установка нового webhook...');
        const response = await axios.post(
            `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`,
            {
                url: webhookUrl,
                allowed_updates: ['message', 'callback_query', 'web_app_data']
            }
        );

        if (response.data.ok) {
            console.log('✅ Webhook успешно установлен!');

            // Проверяем информацию о webhook
            const info = await axios.get(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`);
            console.log('\n📊 Информация о webhook:');
            console.log(`   URL: ${info.data.result.url}`);
            console.log(`   Pending updates: ${info.data.result.pending_update_count}`);
            console.log(`   Max connections: ${info.data.result.max_connections || 40}`);

            if (info.data.result.last_error_message) {
                console.log(`   ⚠️  Последняя ошибка: ${info.data.result.last_error_message}`);
            }
        } else {
            console.error('❌ Ошибка установки webhook:', response.data);
        }
    } catch (error) {
        console.error('❌ Ошибка:', error.message);
        if (error.response) {
            console.error('Ответ сервера:', error.response.data);
        }
    }
}

// Запускаем установку
setupWebhook();