# 🚀 Инструкция по развертыванию МакТабак бота на TimeWeb

## 📋 Информация о сервере
- **IP адрес:** 85.198.83.41
- **Порт бота:** 3000
- **SSH доступ:** ssh root@85.198.83.41

## 🔧 Пошаговая установка

### Шаг 1: Подключитесь к серверу
```bash
ssh root@85.198.83.41
```

### Шаг 2: Скачайте и запустите скрипт установки
```bash
# Создайте директорию для проекта
mkdir -p ~/mactabak-bot
cd ~/mactabak-bot

# Скачайте скрипт установки (загрузите через SFTP или создайте вручную)
nano install-server.sh
# Вставьте содержимое файла install-server.sh и сохраните

# Сделайте скрипт исполняемым
chmod +x install-server.sh

# Запустите установку
./install-server.sh
```

### Шаг 3: Загрузите файлы проекта
Используйте SFTP или SCP для загрузки файлов:

```bash
# С вашего локального компьютера:
scp -r ~/Desktop/МакТабак_магазин_телега/* root@85.198.83.41:~/mactabak-bot/
```

Или используйте FileZilla/другой FTP клиент.

### Шаг 4: Установите зависимости
```bash
cd ~/mactabak-bot
npm install
```

### Шаг 5: Настройте переменные окружения
```bash
nano .env
```

Убедитесь, что следующие параметры установлены:
```
BOT_TOKEN=8161768212:AAFz1W4UXplKt624niRLcBnbVVVodvIvYhA
ADMIN_ID=827456169
MANAGER_EMAIL=chek_qr@bk.ru
WEBAPP_URL=https://artemperekrestov777-lab.github.io/telegram-webapp/
PORT=3000
SERVER_URL=http://85.198.83.41:3000
```

### Шаг 6: Запустите бота через PM2
```bash
# Запуск с конфигурацией
pm2 start ecosystem.config.js

# Или простой запуск
pm2 start bot.js --name mactabak-bot

# Сохраните процесс для автозапуска
pm2 save
pm2 startup
```

### Шаг 7: Настройте webhook
```bash
node setup-webhook.js
```

### Шаг 8: Настройте фаервол
```bash
# Откройте необходимые порты
sudo ufw allow 3000/tcp
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## ✅ Проверка работы

### 1. Проверьте статус бота:
```bash
pm2 status
pm2 logs mactabak-bot
```

### 2. Проверьте webhook:
```bash
curl http://85.198.83.41:3000/health
```

### 3. Протестируйте бота в Telegram:
- Откройте @MacTabak_Shop_Bot
- Отправьте команду /start
- Нажмите кнопку "Каталог"

## 🛠️ Управление ботом

### Команды PM2:
```bash
pm2 list              # Список процессов
pm2 logs mactabak-bot # Просмотр логов
pm2 restart mactabak-bot # Перезапуск
pm2 stop mactabak-bot    # Остановка
pm2 delete mactabak-bot  # Удаление процесса
pm2 monit            # Мониторинг в реальном времени
```

### Обновление бота:
```bash
cd ~/mactabak-bot
git pull  # или загрузите новые файлы
pm2 restart mactabak-bot
```

## 🔍 Диагностика проблем

### Если бот не отвечает:
1. Проверьте логи: `pm2 logs mactabak-bot`
2. Проверьте webhook: `node setup-webhook.js`
3. Проверьте порты: `sudo netstat -tlnp | grep 3000`
4. Проверьте фаервол: `sudo ufw status`

### Если не приходят заказы менеджеру:
1. Убедитесь, что ADMIN_ID правильный: `827456169`
2. Проверьте подключение к Telegram API
3. Проверьте логи на наличие ошибок

## 📞 Контакты для поддержки

При возникновении проблем проверьте:
1. Логи бота: `pm2 logs mactabak-bot`
2. Системные логи: `journalctl -xe`
3. Статус сервера в панели TimeWeb

## 🔒 Безопасность

1. **Измените пароль root после первого входа**
2. **Настройте SSH ключи вместо паролей**
3. **Регулярно обновляйте систему:** `apt update && apt upgrade`
4. **Делайте резервные копии:**
   ```bash
   tar -czf backup-$(date +%Y%m%d).tar.gz ~/mactabak-bot
   ```

## 📊 Мониторинг

Для проверки работы бота используйте:
- PM2 Web Dashboard: `pm2 web`
- Системный мониторинг: `htop`
- Логи в реальном времени: `pm2 logs mactabak-bot --lines 100`

---

## ✨ Дополнительные настройки

### Nginx (опционально, для HTTPS):
```bash
sudo apt install nginx
sudo nano /etc/nginx/sites-available/mactabak-bot

# Конфигурация:
server {
    listen 80;
    server_name 85.198.83.41;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

sudo ln -s /etc/nginx/sites-available/mactabak-bot /etc/nginx/sites-enabled
sudo nginx -t
sudo systemctl restart nginx
```

### SSL сертификат (для HTTPS):
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d ваш-домен.ru
```

---

**После выполнения всех шагов ваш бот МакТабак будет полностью работать на сервере!** 🎉