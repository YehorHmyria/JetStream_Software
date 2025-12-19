// src/config.js
require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,

  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
  telegramChatId: process.env.TELEGRAM_CHAT_ID || '',

  // логін
  adminUsername: process.env.ADMIN_USERNAME || 'admin',
  adminPassword: process.env.ADMIN_PASSWORD || '',
  adminPasswordHash: process.env.ADMIN_PASSWORD_HASH || '',

  sessionSecret: process.env.SESSION_SECRET || 'very_secret_session_key',

  // ключ для шифрування нотаток
  notesEncryptionKey:
    process.env.NOTE_ENCRYPTION_KEY ||
    'dev-notes-key-change-me-please'
};
