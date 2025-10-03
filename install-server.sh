#!/bin/bash

echo "==================================="
echo "  МакТабак Bot - Установка на сервер"
echo "  IP сервера: 85.198.83.41"
echo "==================================="

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Шаг 1: Обновление системы...${NC}"
sudo apt-get update -y
sudo apt-get upgrade -y

echo -e "${YELLOW}Шаг 2: Установка Node.js и npm...${NC}"
# Установка Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

echo -e "${GREEN}Node.js версия: $(node -v)${NC}"
echo -e "${GREEN}npm версия: $(npm -v)${NC}"

echo -e "${YELLOW}Шаг 3: Установка PM2 для управления процессами...${NC}"
sudo npm install -g pm2

echo -e "${YELLOW}Шаг 4: Установка git...${NC}"
sudo apt-get install -y git

echo -e "${YELLOW}Шаг 5: Создание директории для бота...${NC}"
mkdir -p ~/mactabak-bot
cd ~/mactabak-bot

echo -e "${YELLOW}Шаг 6: Загрузка файлов проекта...${NC}"
echo -e "${RED}ВАЖНО: Загрузите файлы проекта в папку ~/mactabak-bot${NC}"
echo "Необходимые файлы:"
echo "  - bot.js"
echo "  - package.json"
echo "  - .env"
echo "  - webapp/ (папка)"
echo "  - data/ (папка)"
echo "  - admin/ (папка)"

echo -e "${YELLOW}Шаг 7: После загрузки файлов выполните:${NC}"
echo "cd ~/mactabak-bot"
echo "npm install"
echo ""
echo -e "${YELLOW}Шаг 8: Запуск бота через PM2:${NC}"
echo "pm2 start bot.js --name mactabak-bot"
echo "pm2 save"
echo "pm2 startup"
echo ""
echo -e "${GREEN}Полезные команды PM2:${NC}"
echo "pm2 list - список процессов"
echo "pm2 logs mactabak-bot - просмотр логов"
echo "pm2 restart mactabak-bot - перезапуск"
echo "pm2 stop mactabak-bot - остановка"
echo "pm2 delete mactabak-bot - удаление процесса"
echo ""
echo -e "${YELLOW}Настройка фаервола:${NC}"
echo "sudo ufw allow 3000/tcp"
echo "sudo ufw allow 22/tcp"
echo "sudo ufw enable"
echo ""
echo -e "${GREEN}✅ Установка базовых компонентов завершена!${NC}"