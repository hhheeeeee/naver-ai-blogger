const { chromium } = require('playwright');
const { createNaverClient } = require('./client');
const { delay } = require('./utils');
const { hasLoginCookies, persistSession } = require('./session');

const LOGIN_URL = 'https://nid.naver.com/nidlogin.login';

const waitForLogin = async (page, context, timeoutMs) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await hasLoginCookies(context)) return true;
    const url = page.url();
    if (url.includes('naver.com') && !url.includes('nidlogin')) return true;
    await delay(1000);
  }
  return false;
};

const typeByScript = async (page, selector, value) => {
  await page.evaluate(({ selector: targetSelector, value: targetValue }) => {
    const element = document.querySelector(targetSelector);
    if (!element) return;
    element.value = targetValue;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }, { selector, value });
};

const loginNaver = async ({ username, password, sessionPath, headless = false, manual = false }) => {
  const browser = await chromium.launch({ headless });
  const context = await browser.newContext({
    locale: 'ko-KR',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  try {
    await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded' });
    await delay(700);

    if (manual) {
      console.error('브라우저에서 네이버 로그인을 완료해 주세요. 최대 5분간 기다립니다.');
      const ok = await waitForLogin(page, context, 300000);
      if (!ok) throw new Error('네이버 수동 로그인 확인에 실패했습니다.');
    } else {
      await typeByScript(page, '#id', username);
      await delay(300);
      await typeByScript(page, '#pw', password);
      await delay(300);
      const keep = await page.$('#keep');
      if (keep) await keep.click().catch(() => {});
      const submit = await page.$('#log\\.login, button[type="submit"], input[type="submit"]');
      if (submit) await submit.click();
      else await page.keyboard.press('Enter');

      await delay(2500);
      const content = await page.content();
      if (content.includes('자동입력 방지') || content.toLowerCase().includes('captcha')) {
        throw new Error('네이버 캡차가 감지됐습니다. --manual로 다시 로그인하세요.');
      }
      if (content.includes('비밀번호') && content.includes('일치하지')) {
        throw new Error('네이버 아이디 또는 비밀번호가 올바르지 않습니다.');
      }
      const ok = await waitForLogin(page, context, 45000);
      if (!ok) throw new Error('네이버 로그인 확인에 실패했습니다. --manual을 시도해 주세요.');
    }

    await persistSession(context, sessionPath);
    const client = createNaverClient({ sessionPath });
    const blogId = await client.initBlog();
    return {
      provider: 'naver',
      loggedIn: true,
      blogId,
      blogUrl: `https://blog.naver.com/${blogId}`,
      sessionPath,
    };
  } finally {
    await browser.close().catch(() => {});
  }
};

module.exports = {
  loginNaver,
};
