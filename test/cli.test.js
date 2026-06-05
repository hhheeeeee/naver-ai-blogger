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
