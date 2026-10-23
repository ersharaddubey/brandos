/**
 * Simple JSON file store — no Mongo/Postgres required to run.
 * Data lives in server/data/*.json
 */
const fs = require('fs');
const path = require('path');
const { dataDir } = require('./config');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

function filePath(name) {
  return path.join(dataDir, `${name}.json`);
}

function read(name, fallback) {
  const p = filePath(name);
  try {
    if (!fs.existsSync(p)) return structuredClone(fallback);
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return structuredClone(fallback);
  }
}

function write(name, data) {
  const p = filePath(name);
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
}

const store = {
  users: () => read('users', []),
  saveUsers: (arr) => write('users', arr),

  refreshTokens: () => read('refreshTokens', []),
  saveRefreshTokens: (arr) => write('refreshTokens', arr),

  plans: () => read('plans', {}),
  savePlans: (obj) => write('plans', obj),

  profiles: () => read('profiles', {}),
  saveProfiles: (obj) => write('profiles', obj),

  conversations: () => read('conversations', []),
  saveConversations: (arr) => write('conversations', arr),

  messages: () => read('messages', []),
  saveMessages: (arr) => write('messages', arr),
};

module.exports = store;
