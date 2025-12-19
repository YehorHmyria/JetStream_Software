// src/services/scheduler.js
const { getStatusPerJob, getTotals } = require('./jobsStore');
const { logTwiceDailyStatus, logHeartbeat } = require('./telegramLogger');

/**
 * Обгортка, щоб будь-яка помилка в планувальнику
 * не роняла весь Node-процес.
 */
function safeCall(fn, context) {
  try {
    fn();
  } catch (err) {
    console.error(`[scheduler] Error in ${context}:`, err);
  }
}

function initSchedulers() {
  // Heartbeat кожні 8 годин
  const EIGHT_HOURS = 8 * 60 * 60 * 1000;

  setInterval(() => {
    safeCall(() => {
      const uptimeMs = process.uptime() * 1000;
      const totals = getTotals();
      logHeartbeat(uptimeMs, totals).catch(() => {});
    }, 'heartbeat');
  }, EIGHT_HOURS);

  // Статуси о 09:00 і 18:00 (за системним часом сервера)
  let lastSentDate9 = null;
  let lastSentDate18 = null;

  setInterval(() => {
    safeCall(() => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const dateKey = now.toISOString().slice(0, 10); // YYYY-MM-DD

      if (hours === 9 && minutes === 0 && lastSentDate9 !== dateKey) {
        const status = getStatusPerJob();
        logTwiceDailyStatus('09:00', status).catch(() => {});
        lastSentDate9 = dateKey;
      }

      if (hours === 18 && minutes === 0 && lastSentDate18 !== dateKey) {
        const status = getStatusPerJob();
        logTwiceDailyStatus('18:00', status).catch(() => {});
        lastSentDate18 = dateKey;
      }
    }, 'twice_daily_status');
  }, 60 * 1000); // перевірка раз на хвилину
}

module.exports = {
  initSchedulers,
};
