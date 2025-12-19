// src/services/notesStore.js
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('../config');

const dataDir = path.join(__dirname, '..', '..', 'data');
const notesFile = path.join(dataDir, 'notes.enc');

let cache = null;

function ensureDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
  }
}

function getKey() {
  // з рядка NOTE_ENCRYPTION_KEY робимо 32-байтовий ключ
  return crypto
    .createHash('sha256')
    .update(config.notesEncryptionKey, 'utf8')
    .digest();
}

function encrypt(text) {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let enc = cipher.update(text, 'utf8', 'base64');
  enc += cipher.final('base64');
  const tag = cipher.getAuthTag();
  return JSON.stringify({
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    data: enc
  });
}

function decrypt(payload) {
  const key = getKey();
  const obj = JSON.parse(payload);
  const iv = Buffer.from(obj.iv, 'base64');
  const tag = Buffer.from(obj.tag, 'base64');
  const data = obj.data;

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  let dec = decipher.update(data, 'base64', 'utf8');
  dec += decipher.final('utf8');
  return dec;
}

function getNotes() {
  if (cache !== null) return cache;

  try {
    if (!fs.existsSync(notesFile)) {
      cache = '';
      return cache;
    }
    const payload = fs.readFileSync(notesFile, 'utf8');
    const text = decrypt(payload);
    cache = text;
    return text;
  } catch (e) {
    console.error('Failed to read notes:', e.message);
    cache = '';
    return '';
  }
}

function saveNotes(text) {
  ensureDir();
  try {
    const payload = encrypt(text || '');
    fs.writeFileSync(notesFile, payload, 'utf8');
    cache = text || '';
    return true;
  } catch (e) {
    console.error('Failed to save notes:', e.message);
    return false;
  }
}

module.exports = {
  getNotes,
  saveNotes
};
