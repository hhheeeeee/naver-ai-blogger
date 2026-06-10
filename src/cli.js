const fs = require('fs');
const path = require('path');
const { Command, Option } = require('commander');
const { loginNaver } = require('./naver/auth');
const { createNaverClient } = require('./naver/client');
const { uploadImages } = require('./naver/images');
const { htmlToComponents } = require('./naver/editor');
const { normalizeCookies } = require('./naver/session');
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

const defaultPromptPath = () => path.resolve(__dirname, '..', 'prompts', 'restaurant-review.md');

const readWritingPrompt = (opts = {}) => {
  const promptPath = path.resolve(opts.promptFile || 'work/naver-blog-prompt.md');
  const source = fs.existsSync(promptPath) ? promptPath : defaultPromptPath();
  return {
    source,
    prompt: fs.readFileSync(source, 'utf8'),
  };
};

const readSessionForDoctor = (sessionPath) => {
  if (process.env.NAVER_SESSION_JSON) {
    return {
      source: 'NAVER_SESSION_JSON',
      payload: JSON.parse(process.env.NAVER_SESSION_JSON),
    };
  }

  if (process.env.NAVER_SESSION_BASE64) {
    return {
      source: 'NAVER_SESSION_BASE64',
      payload: JSON.parse(Buffer.from(process.env.NAVER_SESSION_BASE64, 'base64').toString('utf8')),
    };
  }

  if (!fs.existsSync(sessionPath)) {
    return {
      source: sessionPath,
      payload: null,
    };
  }

  return {
    source: sessionPath,
    payload: JSON.parse(fs.readFileSync(sessionPath, 'utf8')),
  };
};

const runDoctor = async (opts) => {
  const errors = [];
  const warnings = [];
  const blogName = opts.blogName;
  const restaurantAddress = opts.restaurantAddress || opts.address;
  const imageInput = opts.images || opts.image;
  const sessionPath = createDefaultSessionPath(opts.session);

  if (!blogName) errors.push('missing blog-name');
  if (!restaurantAddress) errors.push('missing restaurant-address');
  if (!imageInput) errors.push('missing images');

  const imagePaths = imageInput ? resolveImageInputs(imageInput) : [];
  if (imageInput && imagePaths.length === 0) {
    errors.push(`no images matched: ${imageInput}`);
  }

  let contentFile = null;
  if (opts.contentFile) {
    contentFile = path.resolve(opts.contentFile);
    if (!fs.existsSync(contentFile)) {
      errors.push(`content file not found: ${contentFile}`);
    } else if (!fs.readFileSync(contentFile, 'utf8').trim()) {
      errors.push(`content file is empty: ${contentFile}`);
    }
  } else {
    warnings.push('content-file not provided; publish will use short fallback HTML');
  }

  let session = null;
  try {
    session = readSessionForDoctor(sessionPath);
    const cookies = normalizeCookies(session.payload);
    if (cookies.length === 0) {
      errors.push(`no Naver cookies found in session source: ${session.source}`);
    }
  } catch (error) {
    errors.push(`session parse failed: ${error.message}`);
  }

  writeJson({
    status: errors.length ? 'error' : 'ok',
    ready: errors.length === 0,
    errors,
    warnings,
    blogName: blogName || null,
    restaurantAddress: restaurantAddress || null,
    imageInput: imageInput || null,
    imageCount: imagePaths.length,
    imagePaths,
    contentFile,
    sessionSource: session?.source || sessionPath,
  });
};

const buildDraftPrompt = ({
  blogName,
  restaurantAddress,
  imagePaths,
  notes,
  title,
  tags,
  contentFile,
  prompt,
}) => [
  '# Naver Blog Draft Task',
  '',
  prompt.trim(),
  '',
  '## 이번 포스팅 입력값',
  '',
  `- 식당명: ${blogName}`,
  `- 지역/주소: ${restaurantAddress}`,
  `- 사진 수: ${imagePaths.length}`,
  '- 사진 파일:',
  ...imagePaths.map((imagePath, index) => `  ${index + 1}. ${imagePath}`),
  `- 사용자 메모: ${notes || '제공 없음'}`,
  `- 희망 제목: ${title || 'Codex가 제목 후보 10개 중 최종 제목 1개를 선택'}`,
  `- 희망 태그: ${tags || '본문 마지막 해시태그 25개를 참고해 자연스럽게 구성'}`,
  '',
  '## Codex 작업',
  '',
  `1. 위 입력값과 사진 파일명을 참고해 최종 발행용 HTML 본문을 작성한다.`,
  `2. 발행 전 식당명과 주소로 네이버 지도 링크, 영업시간, 브레이크타임, 라스트오더, 정기휴무, 예약/주차 가능 여부를 검색해 확인 가능한 정보만 본문 첫머리에 채운다.`,
  `3. 본문 첫머리는 반드시 <h3 style="text-align:center;">📍 위치 정보</h3>, 네이버 지도 링크, <h3 style="text-align:center;">🕒 영업 정보</h3> 순서로 작성한다.`,
  `4. 모든 일반 문장은 <p style="text-align:center;">문장.</p>처럼 한 문장당 한 문단으로 나누고, 답답하지 않게 <p><br></p>를 중간중간 넣는다.`,
  `5. 말투는 개인 네이버 맛집 블로그처럼 자연스러운 1인칭 구어체로 쓰고, AI 티 나는 보고서식 표현은 피한다.`,
  `6. 핵심 단어는 <span style="color:#ff0010;">문구</span>, <span style="color:#f28c00;">문구</span>처럼 8~12곳 정도만 색상 강조한다.`,
  `7. 사진 위치는 <p>[외관 사진]</p>처럼 독립 문단으로 두고, 업로드 사진 순서와 자연스럽게 맞춘다.`,
  `8. 최종 HTML만 ${contentFile} 파일에 저장한다.`,
  `9. 사용자에게 제목 후보 10개, 최종 제목 1개, 추천 태그를 별도로 알려준다.`,
  `10. 확인 후 아래 publish 명령을 실행할 수 있게 준비한다.`,
  '',
  '```bash',
  `npx naver-ai-blogger blog \\`,
  `  --blog-name "${blogName}" \\`,
  `  --restaurant-address "${restaurantAddress}" \\`,
  `  --images "${imagePaths.join(',')}" \\`,
  `  --content-file ${contentFile}${title ? ` \\\n  --title "${title}"` : ''}${tags ? ` \\\n  --tags "${tags}"` : ''}`,
  '```',
  '',
].join('\n');

const buildRestaurantHtml = ({ blogName, restaurantAddress, notes }) => {
  const lines = [
    '<h3 style="text-align:center;">📍 위치 정보</h3>',
    `<p style="text-align:center;">${restaurantAddress}</p>`,
    '<p style="text-align:center;">네이버 지도 링크는 발행 전 확인해 넣어 주세요.</p>',
    '<p><br></p>',
    '<h3 style="text-align:center;">🕒 영업 정보</h3>',
    '<p style="text-align:center;"><span style="color:#ff0010;">영업시간</span>, 브레이크타임, 라스트오더, 정기휴무는 방문 전 네이버 지도에서 한 번 더 확인하는 것을 추천합니다.</p>',
    '<p><br></p>',
    `<h2 style="text-align:center;">${blogName}</h2>`,
    '<p style="text-align:center;">사진으로 남겨둔 분위기랑 방문 정보를 바탕으로 가볍게 정리해봤어요.</p>',
    '<p><br></p>',
    '<h3 style="text-align:center;">✨ 분위기</h3>',
    '<p style="text-align:center;">공간은 생각보다 <span style="color:#f28c00;">편하게 머무르기 좋은 느낌</span>이었어요.</p>',
    '<p style="text-align:center;">자세한 분위기는 같이 올린 사진을 참고해 주세요.</p>',
    '<p><br></p>',
    '<h3 style="text-align:center;">🍽️ 음식과 경험</h3>',
    '<p style="text-align:center;">메뉴랑 식사 흐름은 사진 보면서 자연스럽게 볼 수 있게 넣어뒀어요.</p>',
    '<p style="text-align:center;">직접 방문 전에는 위치랑 운영 정보를 한 번 더 확인해 보시면 좋아요.</p>',
    '<p><br></p>',
    '<h3 style="text-align:center;">💡 방문 팁</h3>',
    '<p style="text-align:center;">방문 전에는 영업시간, 예약 가능 여부, 주차 정보를 한 번 더 확인하는 것을 추천합니다.</p>',
  ];
  if (notes) lines.push(`<p style="text-align:center;">${notes}</p>`);
  return lines.join('\n');
};

const runInitPrompt = async (opts) => {
  const target = path.resolve(opts.output || 'work/naver-blog-prompt.md');
  const source = defaultPromptPath();
  if (fs.existsSync(target) && !opts.force) {
    throw new Error(`프롬프트 파일이 이미 있습니다. 덮어쓰려면 --force를 사용하세요: ${target}`);
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
  writeJson({
    status: 'created',
    promptPath: target,
    source,
  });
};

const runDraftPrompt = async (opts) => {
  const blogName = opts.blogName ||
    await promptValue('식당 이름');
  const restaurantAddress = opts.restaurantAddress || opts.address ||
    await promptValue('식당 주소');
  const imageInput = opts.images || opts.image ||
    await promptValue('사진 경로 또는 glob');
  requireValue(blogName, 'blog-name');
  requireValue(restaurantAddress, 'restaurant-address');
  requireValue(imageInput, 'images');

  const imagePaths = resolveImageInputs(imageInput);
  if (imagePaths.length === 0) {
    throw new Error(`초안에 사용할 이미지 파일을 찾지 못했습니다: ${imageInput}`);
  }

  const outputPath = path.resolve(opts.output || 'work/naver-blog-draft-prompt.md');
  const contentFile = opts.contentFile || 'work/naver-blog-post.html';
  const { source, prompt } = readWritingPrompt(opts);
  const draft = buildDraftPrompt({
    blogName,
    restaurantAddress,
    imagePaths,
    notes: opts.notes,
    title: opts.title,
    tags: opts.tags,
    contentFile,
    prompt,
  });

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, draft);
  writeJson({
    status: 'created',
    outputPath,
    contentFile,
    promptSource: source,
    blogName,
    restaurantAddress,
    imageCount: imagePaths.length,
    imagePaths,
  });
};

const runExportSession = async (opts) => {
  const sessionPath = createDefaultSessionPath(opts.session);
  if (!fs.existsSync(sessionPath)) {
    throw new Error(`세션 파일이 없습니다. 먼저 login을 실행하세요: ${sessionPath}`);
  }

  const payload = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
  const cookies = normalizeCookies(payload);
  if (cookies.length === 0) {
    throw new Error(`네이버 쿠키가 없는 세션 파일입니다: ${sessionPath}`);
  }

  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64');
  if (opts.format === 'base64') {
    process.stdout.write(`${encoded}\n`);
    return;
  }

  if (opts.format === 'json') {
    writeJson({
      env: 'NAVER_SESSION_BASE64',
      value: encoded,
      cookieCount: cookies.length,
      sessionPath,
    });
    return;
  }

  process.stdout.write(`export NAVER_SESSION_BASE64='${encoded}'\n`);
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

  const doctor = program.command('doctor')
    .description('Check local inputs and session readiness before publishing.')
    .option('--blog-name <name>', 'Restaurant or post subject name')
    .addOption(new Option('--restaurant-address <address>', 'Restaurant address').conflicts('address'))
    .option('--address <address>', 'Alias for --restaurant-address')
    .option('--images <paths>', 'Comma-separated local image paths or glob patterns')
    .option('--image <paths>', 'Alias for --images')
    .option('--content-file <path>', 'Path to an HTML content file')
    .option('--session <path>', 'Path to the Naver cookie session JSON file');
  doctor.action(runDoctor);

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

  const initPrompt = program.command('init-prompt')
    .description('Copy the default restaurant review prompt for customization.')
    .option('--output <path>', 'Prompt file path to create', 'work/naver-blog-prompt.md')
    .option('--force', 'Overwrite an existing prompt file', false);
  initPrompt.action(runInitPrompt);

  const draftPrompt = program.command('draft-prompt')
    .description('Create a Codex-ready prompt file for drafting a Naver Blog post.')
    .option('--blog-name <name>', 'Restaurant or post subject name')
    .addOption(new Option('--restaurant-address <address>', 'Restaurant address').conflicts('address'))
    .option('--address <address>', 'Alias for --restaurant-address')
    .option('--images <paths>', 'Comma-separated local image paths or glob patterns')
    .option('--image <paths>', 'Alias for --images')
    .option('--title <title>', 'Preferred final post title')
    .option('--tags <tags>', 'Preferred comma-separated tags')
    .option('--notes <text>', 'Additional notes to feed into the draft prompt')
    .option('--prompt-file <path>', 'Custom writing prompt file', 'work/naver-blog-prompt.md')
    .option('--content-file <path>', 'Target HTML content file for Codex to create', 'work/naver-blog-post.html')
    .option('--output <path>', 'Draft prompt file to create', 'work/naver-blog-draft-prompt.md');
  draftPrompt.action(runDraftPrompt);

  const exportSession = program.command('export-session')
    .description('Export the saved Naver session for remote Codex secrets.')
    .option('--session <path>', 'Path to the Naver cookie session JSON file')
    .addOption(new Option('--format <format>', 'Output format')
      .choices(['shell', 'base64', 'json'])
      .default('shell'));
  exportSession.action(runExportSession);

  await program.parseAsync(argv);
};

module.exports = {
  runCli,
};
