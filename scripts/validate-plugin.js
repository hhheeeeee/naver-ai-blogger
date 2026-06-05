#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

const readJson = (relativePath) => {
  const filePath = path.join(root, relativePath);
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`${relativePath} 파일을 읽거나 파싱하지 못했습니다: ${error.message}`);
  }
};

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const assertSameFile = (left, right) => {
  const leftPath = path.join(root, left);
  const rightPath = path.join(root, right);
  assert(fs.existsSync(leftPath), `${left} 파일이 필요합니다.`);
  assert(fs.existsSync(rightPath), `${right} 파일이 필요합니다.`);
  assert(
    fs.readFileSync(leftPath, 'utf8') === fs.readFileSync(rightPath, 'utf8'),
    `${left}와 ${right} 내용이 일치해야 합니다.`,
  );
};

const plugin = readJson('.codex-plugin/plugin.json');
assert(plugin.name === 'naver-ai-blogger', 'plugin.json name은 naver-ai-blogger여야 합니다.');
assert(plugin.version, 'plugin.json version이 필요합니다.');
assert(plugin.skills === './skills/', 'plugin.json skills는 ./skills/를 가리켜야 합니다.');
assert(plugin.interface?.displayName, 'plugin.json interface.displayName이 필요합니다.');
assert(Array.isArray(plugin.interface?.capabilities), 'plugin.json interface.capabilities 배열이 필요합니다.');

const skillDir = path.join(root, 'skills');
assert(fs.existsSync(path.join(skillDir, 'naver', 'SKILL.md')), 'naver skill이 필요합니다.');
assert(fs.existsSync(path.join(skillDir, 'naver-blog', 'SKILL.md')), 'naver-blog skill이 필요합니다.');

const wrapperDir = path.join(root, 'plugins', 'naver-ai-blogger');
assert(fs.existsSync(path.join(wrapperDir, '.codex-plugin', 'plugin.json')), 'marketplace wrapper plugin.json이 필요합니다.');
assert(fs.existsSync(path.join(wrapperDir, 'skills', 'naver', 'SKILL.md')), 'marketplace wrapper naver skill이 필요합니다.');
assert(fs.existsSync(path.join(wrapperDir, 'skills', 'naver-blog', 'SKILL.md')), 'marketplace wrapper naver-blog skill이 필요합니다.');
assert(fs.existsSync(path.join(wrapperDir, 'prompts', 'restaurant-review.md')), 'marketplace wrapper 기본 프롬프트가 필요합니다.');
assertSameFile('.codex-plugin/plugin.json', 'plugins/naver-ai-blogger/.codex-plugin/plugin.json');
assertSameFile('skills/naver/SKILL.md', 'plugins/naver-ai-blogger/skills/naver/SKILL.md');
assertSameFile('skills/naver-blog/SKILL.md', 'plugins/naver-ai-blogger/skills/naver-blog/SKILL.md');
assertSameFile('prompts/naver.md', 'plugins/naver-ai-blogger/prompts/naver.md');
assertSameFile('prompts/naver-blog.md', 'plugins/naver-ai-blogger/prompts/naver-blog.md');
assertSameFile('prompts/restaurant-review.md', 'plugins/naver-ai-blogger/prompts/restaurant-review.md');

const validateMarketplace = (marketplace, label) => {
  assert(marketplace.name === 'naver-ai-blogger-marketplace', `${label} name이 예상과 다릅니다.`);
  assert(Array.isArray(marketplace.plugins), `${label} plugins 배열이 필요합니다.`);

  const entry = marketplace.plugins.find((item) => item.name === 'naver-ai-blogger');
  assert(entry, `${label}에 naver-ai-blogger entry가 필요합니다.`);
  assert(entry.source?.source === 'local', `${label} source.source는 local이어야 합니다.`);
  assert(entry.source?.path === './plugins/naver-ai-blogger', `${label} source.path는 ./plugins/naver-ai-blogger여야 합니다.`);
  assert(entry.policy?.installation === 'AVAILABLE', `${label} policy.installation은 AVAILABLE이어야 합니다.`);
  assert(entry.policy?.authentication === 'ON_USE', `${label} policy.authentication은 ON_USE여야 합니다.`);
  assert(entry.category === 'Productivity', `${label} category는 Productivity여야 합니다.`);
};

const rootMarketplace = readJson('marketplace.json');
validateMarketplace(rootMarketplace, 'marketplace.json');

const marketplace = readJson('.agents/plugins/marketplace.json');
assert(marketplace.name === 'naver-ai-blogger-marketplace', 'marketplace name이 예상과 다릅니다.');
validateMarketplace(marketplace, '.agents/plugins/marketplace.json');
assert(
  JSON.stringify(rootMarketplace) === JSON.stringify(marketplace),
  'marketplace.json과 .agents/plugins/marketplace.json 내용이 일치해야 합니다.',
);

process.stdout.write('Plugin manifest validation passed.\n');
