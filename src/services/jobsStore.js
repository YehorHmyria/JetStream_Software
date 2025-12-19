// src/services/jobsStore.js

// in-memory стор для джобів
const jobs = new Map();

/**
 * job: {
 *   id, bundle, devKey, records, fileName,
 *   intervalMs, index, timer, createdAt, expectedEndAt,
 *   total, sent, status, finishedAt, stoppedAt
 * }
 */
function registerJob(job) {
  job.sent = job.sent || 0;
  job.status = job.status || 'running';
  jobs.set(job.id, job);
}

function incrementSent(job) {
  job.sent = (job.sent || 0) + 1;
}

function markFinished(job) {
  job.status = 'finished';
  job.finishedAt = new Date();
}

function getJobs() {
  return Array.from(jobs.values());
}

function getJobsSnapshot() {
  return getJobs();
}

function stopJob(jobId) {
  const job = jobs.get(jobId);
  if (!job) return null;

  if (job.timer) {
    clearInterval(job.timer);
    job.timer = null;
  }

  job.status = 'stopped';
  job.stoppedAt = new Date();
  return job;
}

function deleteJob(jobId) {
  const job = jobs.get(jobId);
  if (!job) return null;

  if (job.timer) {
    clearInterval(job.timer);
  }

  jobs.delete(jobId);
  return job;
}

/**
 * Агреговані тотали для heartbeat в Telegram
 */
function getTotals() {
  const all = getJobs();
  let running = 0;
  let finished = 0;
  let stopped = 0;

  for (const job of all) {
    if (job.status === 'running') running += 1;
    else if (job.status === 'finished') finished += 1;
    else if (job.status === 'stopped') stopped += 1;
  }

  return {
    total: all.length,
    running,
    finished,
    stopped,
  };
}

/**
 * Детальний статус по кожній джобі для звітів о 09:00 та 18:00
 */
function getStatusPerJob() {
  return getJobs().map((job) => ({
    id: job.id,
    bundle: job.bundle,
    fileName: job.fileName,
    status: job.status,
    sent: job.sent,
    total: job.total,
    createdAt: job.createdAt,
    expectedEndAt: job.expectedEndAt,
    finishedAt: job.finishedAt,
    stoppedAt: job.stoppedAt,
  }));
}

module.exports = {
  registerJob,
  incrementSent,
  markFinished,
  getJobs,
  getJobsSnapshot,
  getTotals,
  getStatusPerJob,
  stopJob,
  deleteJob,
};
