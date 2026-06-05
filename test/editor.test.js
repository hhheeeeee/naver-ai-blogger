const assert = require('node:assert/strict');
const test = require('node:test');
const {
  fallbackHtmlToComponents,
  htmlToComponents,
  isPhotoPlaceholder,
  mergeImageComponentsIntoPlaceholders,
  textComponent,
} = require('../src/naver/editor');

const fakeImage = (fileName) => ({
  '@ctype': 'image',
  fileName,
});

const componentText = (component) => JSON.stringify(component);

const multiParagraphComponent = (paragraphs) => ({
  ...textComponent('seed'),
  value: paragraphs.map((text) => textComponent(text).value[0]),
});

test('photo placeholder detection accepts Naver blog image markers', () => {
  assert.equal(isPhotoPlaceholder('[외관 사진]'), true);
  assert.equal(isPhotoPlaceholder('[추가 사진 필요: 주차장 사진]'), true);
  assert.equal(isPhotoPlaceholder('[대표 메뉴 사진]'), true);
  assert.equal(isPhotoPlaceholder('[사진 -> 짧은 후기]'), true);
  assert.equal(isPhotoPlaceholder('대표 메뉴 사진'), false);
  assert.equal(isPhotoPlaceholder('[총평]'), false);
});

test('fallback HTML conversion replaces photo placeholders with uploaded images', () => {
  const components = fallbackHtmlToComponents([
    '<h2>테스트 식당</h2>',
    '<p>[외관 사진]</p>',
    '<p>외관은 깔끔한 편이라 첫인상이 좋았습니다.</p>',
    '<p>[대표 메뉴 사진]</p>',
    '<p>대표 메뉴는 보기에도 먹음직스러웠습니다.</p>',
  ].join('\n'), [
    fakeImage('outside.jpg'),
    fakeImage('main.jpg'),
  ]);

  assert.equal(components[0]['@ctype'], 'text');
  assert.equal(components[1]['@ctype'], 'image');
  assert.equal(components[1].fileName, 'outside.jpg');
  assert.match(componentText(components[2]), /외관은 깔끔/);
  assert.equal(components[3]['@ctype'], 'image');
  assert.equal(components[3].fileName, 'main.jpg');
  assert.match(componentText(components[4]), /대표 메뉴는/);
});

test('converted SmartEditor components keep old prepend behavior without placeholders', () => {
  const merged = mergeImageComponentsIntoPlaceholders([
    textComponent('테스트 식당 후기'),
  ], [
    fakeImage('outside.jpg'),
  ]);

  assert.equal(merged[0]['@ctype'], 'image');
  assert.equal(merged[1]['@ctype'], 'text');
});

test('unused images are appended after all placeholder replacements', () => {
  const merged = mergeImageComponentsIntoPlaceholders([
    textComponent('[외관 사진]'),
    textComponent('짧은 후기입니다.'),
  ], [
    fakeImage('outside.jpg'),
    fakeImage('inside.jpg'),
  ]);

  assert.deepEqual(merged.map((component) => component.fileName || component['@ctype']), [
    'outside.jpg',
    'text',
    'inside.jpg',
  ]);
});

test('placeholder replacement preserves text paragraphs grouped in one component', () => {
  const merged = mergeImageComponentsIntoPlaceholders([
    multiParagraphComponent([
      '[외관 사진]',
      '외관은 깔끔했고 입구가 찾기 쉬웠습니다.',
      '처음 방문해도 부담 없는 분위기였습니다.',
      '[대표 메뉴 사진]',
      '대표 메뉴는 보기에도 먹음직스러웠습니다.',
      '양도 적당해서 점심으로 괜찮았습니다.',
      '[마무리 사진]',
    ]),
  ], [
    fakeImage('outside.jpg'),
    fakeImage('main.jpg'),
    fakeImage('finish.jpg'),
  ]);

  assert.deepEqual(merged.map((component) => component.fileName || component['@ctype']), [
    'outside.jpg',
    'text',
    'main.jpg',
    'text',
    'finish.jpg',
  ]);
  assert.match(componentText(merged[1]), /외관은 깔끔/);
  assert.match(componentText(merged[1]), /부담 없는 분위기/);
  assert.match(componentText(merged[3]), /대표 메뉴는/);
  assert.match(componentText(merged[3]), /점심으로 괜찮/);
  assert.doesNotMatch(componentText(merged), /\[외관 사진\]/);
  assert.doesNotMatch(componentText(merged), /\[대표 메뉴 사진\]/);
});

test('HTML conversion falls back when converted components lose publish text', async () => {
  const components = await htmlToComponents({
    convertHtmlToComponents: async () => [
      textComponent('[외관 사진]'),
    ],
  }, [
    '<p>[외관 사진]</p>',
    '<p>외관은 깔끔했고 입구가 찾기 쉬웠습니다.</p>',
    '<p>[대표 메뉴 사진]</p>',
    '<p>대표 메뉴는 보기에도 먹음직스러웠습니다.</p>',
  ].join('\n'), [
    fakeImage('outside.jpg'),
    fakeImage('main.jpg'),
  ]);

  assert.deepEqual(components.map((component) => component.fileName || component['@ctype']), [
    'outside.jpg',
    'quotation',
    'main.jpg',
    'quotation',
  ]);
  assert.match(componentText(components), /외관은 깔끔/);
  assert.match(componentText(components), /대표 메뉴는/);
});
