const fs = require('fs');
const path = require('path');
const { Command, Option } = require('commander');
const { loginNaver } = require('./naver/auth');
const { createNaverClient } = require('./naver/client');
const { uploadImages } = require('./naver/images');
const { htmlToComponents } = require('./naver/editor');
const {
  createDefaultSessionPath,
  getCredentials,
  parseList,
  promptValue,
  requireValue,
  resolveImageInputs,
  writeJson,
} = require('./naver/utils');

const readContent = (opts) => {
  if (opts.contentFile) {
    return fs.readFileSync(path.resolve(opts.contentFile), 'utf8');
  }
  return opts.content || '';
};

const buildRestaurantHtml = ({ blogName, restaurantAddress, notes }) => {
  const lines = [
    `<h2>${blogName}</h2>`,
    `<p>${restaurantAddress}</p>`,
    '<p>사진으로 남겨둔 분위기와 방문 정보를 바탕으로 간단히 정리한 후기입니다.</p>',
    '<h3>분위기</h3>',
    '<p>공간은 방문 목적에 맞춰 편하게 머무르기 좋은 인상입니다. 자세한 분위기는 함께 올린 사진을 참고하면 좋습니다.</p>',
    '<h3>음식과 경험</h3>',
    '<p>메뉴와 식사 흐름은 사진 중심으로 확인할 수 있도록 구성했습니다. 직접 방문 전 위치와 운영 정보를 함께 확인해 보세요.</p>',
    '<h3>방문 팁</h3>',
    '<p>방문 전에는 영업시간, 예약 가능 여부, 주차 정보를 한 번 더 확인하는 것을 추천합니다.</p>',
  ];
  if (notes) lines.push(`<p>${notes}</p>`);
  return lines.join('\n');
};

const runLogin = async (opts) => {
  const credentials = getCredentials(opts);
  const username = opts.manual ? credentials.username : credentials.username ||
    await promptValue('네이버 아이디');
  const password = opts.manual ? credentials.password : credentials.password ||
    await promptValue('네이버 비밀번호', { secret: true });
  if (!opts.manual) {
    requireValue(username, 'userid', 'NAVER_USERID 또는 NAVER_USERNAME');
    requireValue(password, 'userpw', 'NAVER_USERPW 또는 NAVER_PASSWORD');
  }
  const sessionPath = createDefaultSessionPath(opts.session);

  const result = await loginNaver({
    username,
    password,
    sessionPath,
    headless: Boolean(opts.headless),
    manual: Boolean(opts.manual),
  });

  writeJson(result);
};

const runStatus = async (opts) => {
  const sessionPath = createDefaultSessionPath(opts.session);
  const client = createNaverClient({ sessionPath });
  const blogId = await client.initBlog();
  writeJson({
    provider: 'naver',
    loggedIn: true,
    blogId,
    blogUrl: `https://blog.naver.com/${blogId}`,
    sessionPath,
  });
};

const runBlog = async (opts) => {
  const blogName = opts.blogName ||
    await promptValue('식당 이름');
  const restaurantAddress = opts.restaurantAddress || opts.address ||
    await promptValue('식당 주소');
  const imageInput = opts.images || opts.image ||
    await promptValue('사진 경로 또는 glob');
  requireValue(blogName, 'blog-name');
  requireValue(restaurantAddress, 'restaurant-address');
  requireValue(imageInput, 'images');
  const sessionPath = createDefaultSessionPath(opts.session);
  const client = createNaverClient({ sessionPath });

  const imagePaths = resolveImageInputs(imageInput);
  if (imagePaths.length === 0) {
    throw new Error(`업로드할 이미지 파일을 찾지 못했습니다: ${imageInput}`);
  }

  const content = readContent(opts) || buildRestaurantHtml({
    blogName,
    restaurantAddress,
    notes: opts.notes,
  });
  const title = opts.title || `${blogName} 방문 후기`;
  const tags = parseList(opts.tags).join(',');

  if (opts.dryRun) {
    writeJson({
      provider: 'naver',
      mode: 'blog',
      status: 'dry_run',
      title,
      blogName,
      restaurantAddress,
      imageCount: imagePaths.length,
      imagePaths,
      tags,
      private: Boolean(opts.private),
      content,
    });
    return;
  }

  await client.initBlog();
  const categoryNo = opts.category || await client.getDefaultCategoryNo();
  const token = await client.getToken(categoryNo);
  const uploadedImages = await uploadImages(client, imagePaths, token);
  if (uploadedImages.components.length === 0) {
    throw new Error(`네이버에 업로드된 이미지가 없습니다: ${uploadedImages.errors.map((item) => item.error).join(', ')}`);
  }
  const components = await htmlToComponents(client, content, uploadedImages.components);
  const result = await client.publishPost({
    title,
    content: components,
    categoryNo,
    tags,
    openType: opts.private ? 0 : 2,
  });

  writeJson({
    provider: 'naver',
    mode: 'blog',
    status: 'published',
    title,
    blogName,
    restaurantAddress,
    imageCount: uploadedImages.components.length,
    imageErrors: uploadedImages.errors,
    url: result.entryUrl,
    raw: result,
  });
};

const addSharedOptions = (cmd) => cmd
  .option('--session <path>', 'Path to the Naver cookie session JSON file')
  .option('--headless', 'Run browser login in headless mode', false);

const runCli = async (argv = process.argv) => {
  const program = new Command();
  program
    .name('naver-ai-blogger')
    .description('Login to Naver and publish Codex-written restaurant posts to Naver Blog.')
    .version('0.1.0');

  const login = program.command('login')
    .description('Login to Naver and persist cookies for future publishing.')
    .option('--userid <id>', 'Naver user id')
    .option('--userpw <password>', 'Naver password')
    .option('--username <id>', 'Alias for --userid')
    .option('--password <password>', 'Alias for --userpw')
    .option('--manual', 'Open browser and let the user complete login manually', false);
  addSharedOptions(login);
  login.action(runLogin);

  const status = program.command('status')
    .description('Verify the saved Naver session.')
    .option('--session <path>', 'Path to the Naver cookie session JSON file');
  status.action(runStatus);

  const blog = program.command('blog')
    .description('Publish a restaurant blog post to Naver Blog.')
    .option('--blog-name <name>', 'Restaurant or post subject name')
    .addOption(new Option('--restaurant-address <address>', 'Restaurant address').conflicts('address'))
    .option('--address <address>', 'Alias for --restaurant-address')
    .option('--images <paths>', 'Comma-separated local image paths or glob patterns')
    .option('--image <paths>', 'Alias for --images')
    .option('--title <title>', 'Post title')
    .option('--content <html>', 'HTML content to publish')
    .option('--content-file <path>', 'Path to an HTML content file')
    .option('--notes <text>', 'Additional notes to include when default content is used')
    .option('--tags <tags>', 'Comma-separated tags')
    .option('--category <id>', 'Naver Blog category id')
    .option('--private', 'Publish as private', false)
    .option('--dry-run', 'Validate inputs and print the publish payload without calling Naver', false)
    .option('--session <path>', 'Path to the Naver cookie session JSON file');
  blog.action(runBlog);

  await program.parseAsync(argv);
};

module.exports = {
  runCli,
};
