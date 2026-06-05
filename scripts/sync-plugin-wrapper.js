#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const wrapperRoot = path.join(root, 'plugins', 'naver-ai-blogger');

const copyDir = (source, target) => {
  fs.rmSync(target, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.cpSync(source, target, { recursive: true });
};

copyDir(path.join(root, '.codex-plugin'), path.join(wrapperRoot, '.codex-plugin'));
copyDir(path.join(root, 'skills'), path.join(wrapperRoot, 'skills'));
copyDir(path.join(root, 'prompts'), path.join(wrapperRoot, 'prompts'));

process.stdout.write(`Synced Codex plugin wrapper: ${path.relative(root, wrapperRoot)}\n`);
