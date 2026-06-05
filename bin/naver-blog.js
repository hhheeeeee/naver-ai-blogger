#!/usr/bin/env node

const { runCli } = require('../src/cli');

const argv = [process.argv[0], process.argv[1], 'blog', ...process.argv.slice(2)];

runCli(argv).catch((error) => {
  console.error(error?.message || error);
  process.exitCode = 1;
});
