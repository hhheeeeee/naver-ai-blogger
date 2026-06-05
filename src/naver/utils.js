const fs = require('fs');
const os = require('os');
const path = require('path');

const createDefaultSessionPath = (provided) => {
  if (provided) return path.resolve(provided);
  const base = process.env.NAVER_AI_BLOGGER_HOME ||
    path.join(os.homedir(), '.naver-ai-blogger');
  return path.join(base, 'naver-session.json');
};

const getCredentials = (opts = {}) => ({
  username: opts.userid || opts.username || process.env.NAVER_USERID ||
    process.env.NAVER_USERNAME || process.env.NAVER_ID || process.env.NAVER_USER,
  password: opts.userpw || opts.password || process.env.NAVER_USERPW ||
    process.env.NAVER_PASSWORD || process.env.NAVER_PW,
});

const requireValue = (value, flagName, envName) => {
  const normalized = typeof value === 'string' ? value.trim() : value;
  if (normalized) return normalized;
  const suffix = envName ? ` 또는 ${envName}` : '';
  throw new Error(`필수값이 없습니다: --${flagName}${suffix}`);
};

const promptValue = async (label, { secret = false } = {}) => {
  if (!process.stdin.isTTY || !process.stdout.isTTY) return null;
  if (!secret) {
    const readline = require('readline/promises');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    try {
      const answer = await rl.question(`${label}: `);
      return answer.trim() || null;
    } finally {
      rl.close();
    }
  }

  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    const stdout = process.stdout;
    let value = '';
    const wasRaw = stdin.isRaw;

    stdout.write(`${label}: `);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    const cleanup = () => {
      stdin.setRawMode(Boolean(wasRaw));
      stdin.pause();
      stdin.off('data', onData);
      stdout.write('\n');
    };

    const onData = (char) => {
      if (char === '\u0003') {
        cleanup();
        reject(new Error('입력이 취소됐습니다.'));
        return;
      }
      if (char === '\r' || char === '\n') {
        cleanup();
        resolve(value.trim() || null);
        return;
      }
      if (char === '\u007f') {
        if (value.length > 0) {
          value = value.slice(0, -1);
          stdout.write('\b \b');
        }
        return;
      }
      value += char;
      stdout.write('*');
    };

    stdin.on('data', onData);
  });
};

const parseList = (value) => String(value || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

const comparePathNames = (a, b) => a.localeCompare(b, 'ko', {
  numeric: true,
  sensitivity: 'base',
});

const expandSimpleGlob = (pattern) => {
  if (!pattern.includes('*')) return [pattern];
  const dir = path.resolve(path.dirname(pattern));
  const basename = path.basename(pattern);
  const regex = new RegExp(`^${basename.split('*').map((part) =>
    part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*')}$`);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((entry) => regex.test(entry))
    .sort(comparePathNames)
    .map((entry) => path.join(dir, entry));
};

const resolveImageInputs = (value) => parseList(value)
  .flatMap(expandSimpleGlob)
  .map((item) => path.resolve(item))
  .filter((item) => fs.existsSync(item));

const writeJson = (payload) => {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = {
  createDefaultSessionPath,
  delay,
  getCredentials,
  parseList,
  promptValue,
  requireValue,
  resolveImageInputs,
  writeJson,
};
