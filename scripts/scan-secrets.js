#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');

const trackedFiles = execFileSync('git', ['ls-files'], {
  cwd: root,
  encoding: 'utf8',
}).split('\n').filter(Boolean);

const rules = [{
  name: 'Naver session env assignment',
  pattern: /NAVER_SESSION_(?:JSON|BASE64)[ \t]*=[ \t]*['"]?(?![$<({"])([A-Za-z0-9+/=._:-]{20,})/g,
}, {
  name: 'Naver credential env assignment',
  pattern: /NAVER_(?:USERID|USERNAME|USERPW|PASSWORD|ID|PW|USER)[ \t]*=[ \t]*['"]?(?![$<({"])([^\s'"]{4,})/g,
}, {
  name: 'Naver cookie header value',
  pattern: /NID_(?:AUT|SES)[ \t]*=[ \t]*([^\s;'"`]{8,})/g,
}];

const skipBinary = (buffer) => buffer.includes(0);
const findings = [];

for (const relativePath of trackedFiles) {
  const filePath = path.join(root, relativePath);
  const buffer = fs.readFileSync(filePath);
  if (skipBinary(buffer)) continue;

  const text = buffer.toString('utf8');
  for (const rule of rules) {
    for (const match of text.matchAll(rule.pattern)) {
      const before = text.slice(0, match.index);
      const line = before.split('\n').length;
      findings.push({
        file: relativePath,
        line,
        rule: rule.name,
      });
    }
  }
}

if (findings.length > 0) {
  process.stderr.write('Potential secrets found in tracked files:\n');
  findings.forEach((finding) => {
    process.stderr.write(`- ${finding.file}:${finding.line} ${finding.rule}\n`);
  });
  process.stderr.write('Remove real credentials/session values before publishing.\n');
  process.exitCode = 1;
} else {
  process.stdout.write('No obvious Naver secrets found in tracked files.\n');
}
