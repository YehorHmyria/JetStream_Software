// src/services/logStore.js

const MAX_LOGS = 5000;

let logs = [];

/**
 * entry: {
 *   level: 'info' | 'error',
 *   type: 'job_start' | 'job_finish' | 'send_attempt' | 'send_success' | 'send_error',
 *   jobId,
 *   bundle,
 *   message,
 *   meta: {}
 * }
 */
function addLog(entry) {
  const log = {
    ts: new Date().toISOString(),
    ...entry
  };

  logs.push(log);
  if (logs.length > MAX_LOGS) {
    logs = logs.slice(-MAX_LOGS);
  }

  // паралельно залишаємо в консолі
  const prefix = `[${log.ts}] [${log.level.toUpperCase()}] [${log.type}]`;
  console.log(prefix, log.bundle ? `bundle=${log.bundle}` : '', '-', log.message);
}

function getLogs({ bundle, limit }) {
  let result = logs;

  if (bundle) {
    result = result.filter((l) => l.bundle === bundle);
  }

  if (limit && !Number.isNaN(limit)) {
    result = result.slice(-limit);
  }

  return result;
}

module.exports = {
  addLog,
  getLogs
};
