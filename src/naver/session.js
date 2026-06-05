const fs = require('fs');
const path = require('path');

const NAVER_COOKIE_URLS = [
  'https://www.naver.com',
  'https://nid.naver.com',
  'https://blog.naver.com',
];

const normalizeCookies = (session) => {
  const raw = Array.isArray(session) ? session : session?.cookies;
  return Array.isArray(raw) ? raw.filter((cookie) =>
    cookie?.name && cookie.value !== undefined &&
    (!cookie.domain || String(cookie.domain).includes('naver.com'))) : [];
};

const parseSessionFromEnv = () => {
  if (process.env.NAVER_SESSION_JSON) {
    try {
      return JSON.parse(process.env.NAVER_SESSION_JSON);
    } catch (error) {
      throw new Error(`NAVER_SESSION_JSON 파싱에 실패했습니다: ${error.message}`);
    }
  }

  if (process.env.NAVER_SESSION_BASE64) {
    try {
      const json = Buffer.from(process.env.NAVER_SESSION_BASE64, 'base64').toString('utf8');
      return JSON.parse(json);
    } catch (error) {
      throw new Error(`NAVER_SESSION_BASE64 파싱에 실패했습니다: ${error.message}`);
    }
  }

  return null;
};

const readSessionPayload = (sessionPath) => {
  const envSession = parseSessionFromEnv();
  if (envSession) return envSession;

  if (!fs.existsSync(sessionPath)) {
    throw new Error(`세션 파일이 없습니다. 먼저 login을 실행하거나 NAVER_SESSION_JSON/NAVER_SESSION_BASE64를 설정하세요: ${sessionPath}`);
  }

  return JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
};

const cookiesToHeader = (sessionPath) => {
  const parsed = readSessionPayload(sessionPath);
  const cookies = normalizeCookies(parsed);
  if (!cookies.length) throw new Error('네이버 세션에 유효한 쿠키가 없습니다.');
  return cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ');
};

const persistSession = async (context, sessionPath) => {
  const cookies = [];
  for (const url of NAVER_COOKIE_URLS) {
    cookies.push(...await context.cookies(url));
  }

  const seen = new Set();
  const unique = cookies
    .filter((cookie) => cookie.domain?.includes('naver.com'))
    .filter((cookie) => {
      const key = `${cookie.name}@${cookie.domain}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  await fs.promises.mkdir(path.dirname(sessionPath), { recursive: true });
  await fs.promises.writeFile(sessionPath, JSON.stringify({
    cookies: unique,
    updatedAt: new Date().toISOString(),
  }, null, 2));
};

const hasLoginCookies = async (context) => {
  const cookies = [];
  for (const url of NAVER_COOKIE_URLS) {
    cookies.push(...await context.cookies(url));
  }
  return cookies.some((cookie) =>
    cookie.domain?.includes('naver.com') &&
    ['NID_AUT', 'NID_SES'].includes(cookie.name) &&
    cookie.value);
};

module.exports = {
  cookiesToHeader,
  hasLoginCookies,
  persistSession,
};
