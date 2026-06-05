const crypto = require('crypto');

const seId = () => `SE-${crypto.randomUUID()}`;

const stripTags = (html) => String(html || '').replace(/<[^>]*>/g, '').trim();

const isPhotoPlaceholder = (text) => {
  const normalized = String(text || '').trim();
  return /^\[(?:추가 사진 필요:\s*)?[^\]]*사진[^\]]*\]$/.test(normalized);
};

const collectStringValues = (value, strings = []) => {
  if (typeof value === 'string') {
    strings.push(value);
    return strings;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectStringValues(item, strings));
    return strings;
  }
  if (value && typeof value === 'object') {
    Object.values(value).forEach((item) => collectStringValues(item, strings));
  }
  return strings;
};

const componentIsPhotoPlaceholder = (component) => {
  if (component?.['@ctype'] === 'image') return false;
  const textValues = collectStringValues(component);
  return textValues.some(isPhotoPlaceholder);
};

const paragraphText = (paragraph) => {
  if (Array.isArray(paragraph?.nodes)) {
    return paragraph.nodes
      .map((node) => typeof node?.value === 'string' ? node.value : '')
      .join('')
      .trim();
  }
  return collectStringValues(paragraph).join('').trim();
};

const componentParagraphTexts = (component) => {
  if (component?.['@ctype'] === 'image') return [];
  if (Array.isArray(component?.value)) {
    return component.value.map(paragraphText).filter(Boolean);
  }
  return collectStringValues(component).map((value) => value.trim()).filter(Boolean);
};

const hasPublishableText = (components) => components.some((component) =>
  componentParagraphTexts(component).some((text) => !isPhotoPlaceholder(text)));

const cloneComponentWithParagraphs = (component, paragraphs) => ({
  ...component,
  id: seId(),
  value: paragraphs,
});

const splitComponentOnPhotoPlaceholders = (component, imageComponents, state) => {
  if (component?.['@ctype'] === 'image') return [component];

  if (!Array.isArray(component?.value)) {
    if (!componentIsPhotoPlaceholder(component)) return [component];
    const nextImage = imageComponents[state.imageIndex];
    if (!nextImage) return [component];
    state.imageIndex += 1;
    return [nextImage];
  }

  const output = [];
  let bufferedParagraphs = [];
  let replaced = false;

  const flushText = () => {
    if (!bufferedParagraphs.length) return;
    output.push(cloneComponentWithParagraphs(component, bufferedParagraphs));
    bufferedParagraphs = [];
  };

  component.value.forEach((paragraph) => {
    if (!isPhotoPlaceholder(paragraphText(paragraph))) {
      bufferedParagraphs.push(paragraph);
      return;
    }

    flushText();
    replaced = true;
    const nextImage = imageComponents[state.imageIndex];
    if (nextImage) {
      output.push(nextImage);
      state.imageIndex += 1;
    } else {
      output.push(cloneComponentWithParagraphs(component, [paragraph]));
    }
  });

  flushText();
  return replaced ? output : [component];
};

const mergeImageComponentsIntoPlaceholders = (components, imageComponents = []) => {
  if (!imageComponents.length) return components;

  const hasPlaceholders = components.some(componentIsPhotoPlaceholder);
  if (!hasPlaceholders) return [...imageComponents, ...components];

  const merged = [];
  const state = { imageIndex: 0 };

  components.forEach((component) => {
    merged.push(...splitComponentOnPhotoPlaceholders(component, imageComponents, state));
  });

  if (state.imageIndex < imageComponents.length) {
    merged.push(...imageComponents.slice(state.imageIndex));
  }

  return merged;
};

const textComponent = (text, opts = {}) => ({
  id: seId(),
  layout: 'default',
  value: [{
    id: seId(),
    nodes: [{
      id: seId(),
      value: text,
      style: {
        fontColor: '#333333',
        fontSizeCode: opts.fontSize || 'fs16',
        bold: Boolean(opts.bold),
        '@ctype': 'nodeStyle',
      },
      '@ctype': 'textNode',
    }],
    style: {
      align: opts.align || 'left',
      lineHeight: opts.lineHeight || '1.8',
      '@ctype': 'paragraphStyle',
    },
    '@ctype': 'paragraph',
  }],
  '@ctype': opts.ctype || 'text',
});

const imageComponent = (image, represent = false) => ({
  id: seId(),
  layout: 'default',
  align: 'center',
  src: `https://blogfiles.pstatic.net/${image.url}?type=w1`,
  internalResource: 'true',
  represent: represent ? 'true' : 'false',
  path: image.url,
  domain: 'https://blogfiles.pstatic.net',
  fileSize: image.fileSize,
  width: image.width,
  widthPercentage: 0,
  height: image.height,
  originalWidth: image.width,
  originalHeight: image.height,
  fileName: image.fileName,
  caption: null,
  format: 'normal',
  displayFormat: 'normal',
  imageLoaded: 'true',
  contentMode: 'normal',
  origin: { srcFrom: 'local', '@ctype': 'imageOrigin' },
  ai: 'false',
  '@ctype': 'image',
});

const fallbackHtmlToComponents = (html, imageComponents = []) => {
  const parts = String(html || '')
    .replace(/<\/(p|h[1-6]|li)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .split('\n')
    .map(stripTags)
    .filter(Boolean);

  const components = [];
  parts.forEach((part, index) => {
    if (isPhotoPlaceholder(part)) {
      components.push(textComponent(part));
      return;
    }

    const heading = index === 0 || part.length < 34;
    components.push(textComponent(part, heading ? {
      fontSize: index === 0 ? 'fs28' : 'fs24',
      bold: true,
      align: index === 0 ? 'center' : 'left',
      ctype: index === 0 ? 'text' : 'quotation',
    } : {}));
  });
  return mergeImageComponentsIntoPlaceholders(components, imageComponents);
};

const htmlToComponents = async (client, html, imageComponents = []) => {
  const htmlComponents = fallbackHtmlToComponents(html);
  const htmlHasText = hasPublishableText(htmlComponents);
  const converted = await client.convertHtmlToComponents(html);
  if (Array.isArray(converted) && converted.length > 0) {
    const merged = mergeImageComponentsIntoPlaceholders(converted, imageComponents);
    if (!htmlHasText || hasPublishableText(merged)) return merged;
  }
  return fallbackHtmlToComponents(html, imageComponents);
};

module.exports = {
  fallbackHtmlToComponents,
  htmlToComponents,
  imageComponent,
  isPhotoPlaceholder,
  mergeImageComponentsIntoPlaceholders,
  textComponent,
};
