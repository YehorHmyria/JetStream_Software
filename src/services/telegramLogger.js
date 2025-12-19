// src/services/telegramLogger.js
const axios = require('axios');
const config = require('../config');

async function sendTelegram(message) {
  if (!config.telegramBotToken || !config.telegramChatId) return;

  const url = `https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`;

  await axios.post(url, {
    chat_id: config.telegramChatId,
    text: message,
    parse_mode: 'Markdown'
  });
}

async function logServerStart(port) {
  const text = `✅ *JetStream server started*\nPort: \`${port}\``;
  await sendTelegram(text);
}

async function logJobStart(job, days, intervalMs, expectedEnd) {
  const text =
    `▶️ *Sharing started*\n` +
    `Bundle: \`${job.bundle}\`\n` +
    `File: \`${job.fileName}\`\n` +
    `Records: *${job.total}*\n` +
    `Days: *${days}*\n` +
    `Interval: ~*${(intervalMs / 1000).toFixed(2)}s*\n` +
    `Expected end: \`${expectedEnd.toISOString()}\`\n` +
    `Job ID: \`${job.id}\``;

  await sendTelegram(text);
}

async function logJobFinished(job) {
  const text =
    `✅ *Sharing finished*\n` +
    `Bundle: \`${job.bundle}\`\n` +
    `File: \`${job.fileName}\`\n` +
    `Sent: *${job.sent || 0}* / *${job.total}*\n` +
    `Job ID: \`${job.id}\``;

  await sendTelegram(text);
}

async function logStatusReport(summaryLines) {
  if (!summaryLines.length) return;

  const text =
    `📊 *JetStream status report*\n` +
    summaryLines.map((l) => `• ${l}`).join('\n');

  await sendTelegram(text);
}

async function logHeartbeat() {
  const text = `🟢 *JetStream heartbeat*\nServer is alive and processing jobs.`;
  await sendTelegram(text);
}

/**
 * Телеграм-пуш при помилці від AppsFlyer (з назвою файлу).
 */
async function logSendError(job, index, status, message) {
  const shortMsg = (message || '').toString().slice(0, 400);

  const text =
    `❌ *AppsFlyer error*\n` +
    `Bundle: \`${job.bundle}\`\n` +
    `File: \`${job.fileName}\`\n` +
    `Job ID: \`${job.id}\`\n` +
    `Record: *${index}* / *${job.total}*\n` +
    `Status: *${status ?? 'n/a'}*\n` +
    `Message:\n` +
    '```' +
    shortMsg +
    '```';

  await sendTelegram(text);
}

module.exports = {
  sendTelegram,
  logServerStart,
  logJobStart,
  logJobFinished,
  logStatusReport,
  logHeartbeat,
  logSendError
};
