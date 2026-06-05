const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const repoRoot = path.resolve(__dirname, '..');
const node = process.execPath;

const run = (args, options = {}) => spawnSync(node, args, {
  cwd: repoRoot,
  encoding: 'utf8',
  env: {
    ...process.env,
    ...options.env,
  },
});

test('naver login reports missing userid before browser launch', () => {
  const result = run(['bin/naver.js']);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /필수값이 없습니다: --userid/);
});

test('naver manual login does not require userid before browser launch', () => {
  const result = run(['bin/naver.js', '--manual', '--help']);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /--manual/);
});

test('naver-blog requires images', () => {
  const result = run([
    'bin/naver-blog.js',
    '--blog-name',
    '테스트 식당',
    '--restaurant-address',
    '서울',
  ]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /필수값이 없습니다: --images/);
});

test('naver-blog rejects an empty image glob before calling Naver', () => {
  const result = run([
    'bin/naver-blog.js',
    '--blog-name',
    '테스트 식당',
    '--restaurant-address',
    '서울',
    '--images',
    './no-such/*.jpg',
  ]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /업로드할 이미지 파일을 찾지 못했습니다/);
});

test('naver-blog dry-run validates local images and prints payload', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'naver-ai-blogger-'));
  const imagePath = path.join(tempDir, 'photo.jpg');
  const contentPath = path.join(tempDir, 'post.html');
  fs.writeFileSync(imagePath, 'fake image bytes');
  fs.writeFileSync(contentPath, '<h2>테스트 식당</h2><p>테스트 후기입니다.</p>');

  const result = run([
    'bin/naver-blog.js',
    '--blog-name',
    '테스트 식당',
    '--restaurant-address',
    '서울',
    '--images',
    imagePath,
    '--content-file',
    contentPath,
    '--tags',
    '맛집,테스트',
    '--dry-run',
  ]);

  assert.equal(result.status, 0);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.status, 'dry_run');
  assert.equal(payload.title, '테스트 식당 방문 후기');
  assert.equal(payload.imageCount, 1);
  assert.deepEqual(payload.imagePaths, [imagePath]);
  assert.equal(payload.tags, '맛집,테스트');
  assert.match(payload.content, /테스트 후기/);
});

test('naver-blog dry-run keeps glob images in natural filename order', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'naver-ai-blogger-order-'));
  ['10-menu.jpg', '02-inside.jpg', '01-outside.jpg'].forEach((fileName) => {
    fs.writeFileSync(path.join(tempDir, fileName), 'fake image bytes');
  });

  const result = run([
    'bin/naver-blog.js',
    '--blog-name',
    '테스트 식당',
    '--restaurant-address',
    '서울',
    '--images',
    path.join(tempDir, '*.jpg'),
    '--dry-run',
  ]);

  assert.equal(result.status, 0);
  const payload = JSON.parse(result.stdout);
  assert.deepEqual(payload.imagePaths.map((imagePath) => path.basename(imagePath)), [
    '01-outside.jpg',
    '02-inside.jpg',
    '10-menu.jpg',
  ]);
});

test('init-prompt creates a customizable prompt file and protects it', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'naver-ai-blogger-prompt-'));
  const promptPath = path.join(tempDir, 'naver-blog-prompt.md');

  const createResult = run([
    'bin/naver-ai-blogger.js',
    'init-prompt',
    '--output',
    promptPath,
  ]);
  assert.equal(createResult.status, 0);
  assert.match(fs.readFileSync(promptPath, 'utf8'), /네이버 맛집 블로그/);

  const secondResult = run([
    'bin/naver-ai-blogger.js',
    'init-prompt',
    '--output',
    promptPath,
  ]);
  assert.equal(secondResult.status, 1);
  assert.match(secondResult.stderr, /이미 있습니다/);

  const forceResult = run([
    'bin/naver-ai-blogger.js',
    'init-prompt',
    '--output',
    promptPath,
    '--force',
  ]);
  assert.equal(forceResult.status, 0);
});

test('draft-prompt creates a Codex-ready prompt from restaurant inputs', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'naver-ai-blogger-draft-'));
  const imageDir = path.join(tempDir, 'photos');
  const outputPath = path.join(tempDir, 'draft.md');
  const contentPath = path.join(tempDir, 'post.html');
  fs.mkdirSync(imageDir);
  ['02-menu.jpg', '01-outside.jpg'].forEach((fileName) => {
    fs.writeFileSync(path.join(imageDir, fileName), 'fake image bytes');
  });

  const result = run([
    'bin/naver-ai-blogger.js',
    'draft-prompt',
    '--blog-name',
    '테스트 식당',
    '--restaurant-address',
    '서울시 테스트구',
    '--images',
    path.join(imageDir, '*.jpg'),
    '--notes',
    '대표 메뉴는 파스타',
    '--tags',
    '맛집,후기',
    '--content-file',
    contentPath,
    '--output',
    outputPath,
  ]);

  assert.equal(result.status, 0);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.status, 'created');
  assert.equal(payload.outputPath, outputPath);
  assert.equal(payload.contentFile, contentPath);
  assert.equal(payload.imageCount, 2);
  assert.deepEqual(payload.imagePaths.map((imagePath) => path.basename(imagePath)), [
    '01-outside.jpg',
    '02-menu.jpg',
  ]);

  const draft = fs.readFileSync(outputPath, 'utf8');
  assert.match(draft, /Naver Blog Draft Task/);
  assert.match(draft, /테스트 식당/);
  assert.match(draft, /대표 메뉴는 파스타/);
  assert.match(draft, /\[외관 사진\]/);
  assert.match(draft, new RegExp(contentPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('draft-prompt uses a custom prompt file when present', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'naver-ai-blogger-draft-'));
  const imagePath = path.join(tempDir, 'photo.jpg');
  const promptPath = path.join(tempDir, 'prompt.md');
  const outputPath = path.join(tempDir, 'draft.md');
  fs.writeFileSync(imagePath, 'fake image bytes');
  fs.writeFileSync(promptPath, '커스텀 맛집 프롬프트');

  const result = run([
    'bin/naver-ai-blogger.js',
    'draft-prompt',
    '--blog-name',
    '테스트 식당',
    '--restaurant-address',
    '서울',
    '--images',
    imagePath,
    '--prompt-file',
    promptPath,
    '--output',
    outputPath,
  ]);

  assert.equal(result.status, 0);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.promptSource, promptPath);
  assert.match(fs.readFileSync(outputPath, 'utf8'), /커스텀 맛집 프롬프트/);
});

test('doctor reports ready when inputs and session are present', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'naver-ai-blogger-doctor-'));
  const imagePath = path.join(tempDir, 'photo.jpg');
  const contentPath = path.join(tempDir, 'post.html');
  const sessionPath = path.join(tempDir, 'session.json');
  fs.writeFileSync(imagePath, 'fake image bytes');
  fs.writeFileSync(contentPath, '<h2>테스트 식당</h2>');
  fs.writeFileSync(sessionPath, JSON.stringify({
    cookies: [{ name: 'NID_AUT', value: 'aut-cookie', domain: '.naver.com' }],
  }));

  const result = run([
    'bin/naver-ai-blogger.js',
    'doctor',
    '--blog-name',
    '테스트 식당',
    '--restaurant-address',
    '서울',
    '--images',
    imagePath,
    '--content-file',
    contentPath,
    '--session',
    sessionPath,
  ], {
    env: {
      NAVER_SESSION_JSON: '',
      NAVER_SESSION_BASE64: '',
    },
  });

  assert.equal(result.status, 0);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.status, 'ok');
  assert.equal(payload.ready, true);
  assert.deepEqual(payload.errors, []);
  assert.equal(payload.imageCount, 1);
  assert.equal(payload.sessionSource, sessionPath);
});

test('doctor reports missing publish requirements without calling Naver', () => {
  const result = run([
    'bin/naver-ai-blogger.js',
    'doctor',
    '--session',
    '/tmp/no-session-file.json',
  ], {
    env: {
      NAVER_SESSION_JSON: '',
      NAVER_SESSION_BASE64: '',
    },
  });

  assert.equal(result.status, 0);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.status, 'error');
  assert.equal(payload.ready, false);
  assert.match(payload.errors.join('\n'), /missing blog-name/);
  assert.match(payload.errors.join('\n'), /missing restaurant-address/);
  assert.match(payload.errors.join('\n'), /missing images/);
  assert.match(payload.errors.join('\n'), /no Naver cookies/);
});

test('doctor accepts NAVER_SESSION_BASE64 for remote Codex readiness checks', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'naver-ai-blogger-doctor-'));
  const imagePath = path.join(tempDir, 'photo.jpg');
  fs.writeFileSync(imagePath, 'fake image bytes');
  const sessionPayload = {
    cookies: [{ name: 'NID_SES', value: 'ses-cookie', domain: '.naver.com' }],
  };

  const result = run([
    'bin/naver-ai-blogger.js',
    'doctor',
    '--blog-name',
    '테스트 식당',
    '--restaurant-address',
    '서울',
    '--images',
    imagePath,
  ], {
    env: {
      NAVER_SESSION_JSON: '',
      NAVER_SESSION_BASE64: Buffer.from(JSON.stringify(sessionPayload)).toString('base64'),
    },
  });

  assert.equal(result.status, 0);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.status, 'ok');
  assert.equal(payload.sessionSource, 'NAVER_SESSION_BASE64');
  assert.deepEqual(payload.warnings, ['content-file not provided; publish will use short fallback HTML']);
});

test('export-session emits a base64 remote secret from a saved session file', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'naver-ai-blogger-session-'));
  const sessionPath = path.join(tempDir, 'naver-session.json');
  const payload = {
    cookies: [{
      name: 'NID_AUT',
      value: 'aut-cookie',
      domain: '.naver.com',
    }, {
      name: 'OTHER',
      value: 'other-cookie',
      domain: '.example.com',
    }],
  };
  fs.writeFileSync(sessionPath, JSON.stringify(payload));

  const result = run([
    'bin/naver-ai-blogger.js',
    'export-session',
    '--session',
    sessionPath,
    '--format',
    'json',
  ]);

  assert.equal(result.status, 0);
  const exported = JSON.parse(result.stdout);
  assert.equal(exported.env, 'NAVER_SESSION_BASE64');
  assert.equal(exported.cookieCount, 1);
  assert.equal(exported.sessionPath, sessionPath);
  assert.deepEqual(JSON.parse(Buffer.from(exported.value, 'base64').toString('utf8')), payload);
});

test('export-session rejects a session without Naver cookies', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'naver-ai-blogger-session-'));
  const sessionPath = path.join(tempDir, 'naver-session.json');
  fs.writeFileSync(sessionPath, JSON.stringify({
    cookies: [{ name: 'SID', value: 'not-naver', domain: '.example.com' }],
  }));

  const result = run([
    'bin/naver-ai-blogger.js',
    'export-session',
    '--session',
    sessionPath,
  ]);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /네이버 쿠키가 없는 세션 파일/);
});

test('invalid NAVER_SESSION_JSON fails without reading a session file', () => {
  const result = run([
    'bin/naver-ai-blogger.js',
    'status',
    '--session',
    '/tmp/no-session-file.json',
  ], {
    env: {
      NAVER_SESSION_JSON: 'not-json',
      NAVER_SESSION_BASE64: '',
    },
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /NAVER_SESSION_JSON 파싱에 실패했습니다/);
});
