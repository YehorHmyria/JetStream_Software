// src/services/appsFlyerSender.js
const axios = require('axios');
const {
  registerJob,
  incrementSent,
  markFinished
} = require('./jobsStore');
const {
  logJobStart,
  logJobFinished,
  logSendError
} = require('./telegramLogger');
const { addLog } = require('./logStore');

function formatEventTime(date) {
  const pad = (n, z = 2) => ('00' + n).slice(-z);
  return (
    date.getFullYear() +
    '-' +
    pad(date.getMonth() + 1) +
    '-' +
    pad(date.getDate()) +
    ' ' +
    pad(date.getHours()) +
    ':' +
    pad(date.getMinutes()) +
    ':' +
    pad(date.getSeconds()) +
    '.' +
    pad(date.getMilliseconds(), 3)
  );
}

/**
 * records – масив рядків CSV:
 * advertising_id, appsflyer_id, android_id, country, user_ip, eventname, eventtime, rn
 */
function createJobAndStart({ bundle, devKey, days, records, fileName }) {
  const total = records.length;
  
  const totalSeconds = days * 24 * 60 * 60;
  const intervalMs = (totalSeconds * 1000) / total;

  const job = {
    id: Date.now().toString() + '-' + Math.random().toString(36).slice(2, 6),
    bundle,
    devKey,
    records,
    fileName,
    intervalMs,
    index: 0,
    timer: null,
    createdAt: new Date(),
    total
  };

  // очікувана дата завершення
  const expectedEnd = new Date(Date.now() + totalSeconds * 1000);
  job.expectedEndAt = expectedEnd;

  registerJob(job);

  addLog({
    level: 'info',
    type: 'job_start',
    jobId: job.id,
    bundle: job.bundle,
    message: `Job started for bundle=${job.bundle}, file=${job.fileName}, total=${job.total}, days=${days}, interval=${(
      intervalMs / 1000
    ).toFixed(2)}s`,
    meta: { fileName, total, days, intervalSec: intervalMs / 1000 }
  });

  logJobStart(job, days, intervalMs, expectedEnd).catch(() => {});

  job.timer = setInterval(() => {
    sendSingleRecord(job).catch((err) => {
      console.error(`[JOB ${job.id}] Unexpected error:`, err.message);
      addLog({
        level: 'error',
        type: 'send_error',
        jobId: job.id,
        bundle: job.bundle,
        message: `Unexpected error: ${err.message}`,
        meta: {}
      });
    });
  }, intervalMs);

  return { jobId: job.id, total, intervalMs };
}

async function sendSingleRecord(job) {
  if (job.index >= job.total || job.status === 'stopped') {
    finishJob(job);
    return;
  }

  const currentIndex = job.index + 1;
  const row = job.records[job.index];

  const appsflyer_id = row.appsflyer_id;
  const advertising_id = row.advertising_id;
  const android_id = row.android_id || undefined;
  const country = row.country;
  const user_ip = row.user_ip;
  const eventName = row.eventname || 'confirmed';
  const eventTime = row.eventtime || formatEventTime(new Date());

  const payload = {
    appsflyer_id,
    advertising_id,
    country,
    android_id,
    eventName,
    eventTime,
    eventValue: JSON.stringify({ af_revenue: '70', af_currency: 'USD' }),
    ip: user_ip
  };

  const url = `https://api2.appsflyer.com/inappevent/${encodeURIComponent(
    job.bundle
  )}`;

  addLog({
    level: 'info',
    type: 'send_attempt',
    jobId: job.id,
    bundle: job.bundle,
    message: `Attempt ${currentIndex}/${job.total} to ${url}`,
    meta: { index: currentIndex, total: job.total, eventName, advertising_id }
  });

  try {
    await axios.post(url, payload, {
      headers: {
        authentication: job.devKey,
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });

    job.index += 1;
    incrementSent(job);

    console.log(
      `[JOB ${job.id}] Sent ${job.index}/${job.total} for bundle=${job.bundle}, file=${job.fileName}`
    );

    addLog({
      level: 'info',
      type: 'send_success',
      jobId: job.id,
      bundle: job.bundle,
      message: `Success ${currentIndex}/${job.total}`,
      meta: { index: currentIndex, total: job.total, eventName }
    });
  } catch (err) {
    const status = err.response?.status;
    const data = err.response?.data;
    const msgText =
      typeof data === 'string'
        ? data
        : data && typeof data === 'object'
        ? JSON.stringify(data)
        : err.message;

    console.error(
      `[JOB ${job.id}] Error sending for bundle=${job.bundle}:`,
      status,
      msgText
    );

    addLog({
      level: 'error',
      type: 'send_error',
      jobId: job.id,
      bundle: job.bundle,
      message: `Error ${currentIndex}/${job.total}: status=${
        status ?? 'n/a'
      } msg=${msgText}`,
      meta: {
        index: currentIndex,
        total: job.total,
        status,
        data: msgText.slice(0, 300)
      }
    });

    // Телеграм тільки для першої помилки по джобу, щоб не спамити
    if (!job._firstErrorNotified) {
      job._firstErrorNotified = true;
      logSendError(job, currentIndex, status, msgText).catch(() => {});
    }

    // пропускаємо запис та йдемо далі
    job.index += 1;
  }
}

function finishJob(job) {
  if (job.timer) {
    clearInterval(job.timer);
    job.timer = null;
  }
  markFinished(job);
  console.log(`[JOB ${job.id}] Finished. Total: ${job.total}`);

  addLog({
    level: 'info',
    type: 'job_finish',
    jobId: job.id,
    bundle: job.bundle,
    message: `Job finished for bundle=${job.bundle}, file=${job.fileName}, total=${job.total}`,
    meta: { total: job.total }
  });

  logJobFinished(job).catch(() => {});
}

module.exports = {
  createJobAndStart
};
