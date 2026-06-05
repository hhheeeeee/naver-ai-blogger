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

const cookiesToHeader = (sessionPath) => {
  if (!fs.existsSync(sessionPath)) {
    throw new Error(`세션 파일이 없습니다. 먼저 login을 실행하세요: ${sessionPath}`);
  }
  const parsed = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
  const cookies = normalizeCookies(parsed);
  if (!cookies.length) throw new Error('세션 파일에 유효한 네이버 쿠키가 없습니다.');
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
