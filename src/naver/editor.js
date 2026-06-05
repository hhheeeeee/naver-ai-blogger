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

const mergeImageComponentsIntoPlaceholders = (components, imageComponents = []) => {
  if (!imageComponents.length) return components;

  const hasPlaceholders = components.some(componentIsPhotoPlaceholder);
  if (!hasPlaceholders) return [...imageComponents, ...components];

  let imageIndex = 0;
  const merged = [];

  components.forEach((component) => {
    if (!componentIsPhotoPlaceholder(component)) {
      merged.push(component);
      return;
    }

    const nextImage = imageComponents[imageIndex];
    if (nextImage) {
      merged.push(nextImage);
      imageIndex += 1;
      return;
    }

    merged.push(component);
  });

  if (imageIndex < imageComponents.length) {
    merged.push(...imageComponents.slice(imageIndex));
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
        bold: opts.bold ? 'true' : 'false',
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
  const converted = await client.convertHtmlToComponents(html);
  if (Array.isArray(converted) && converted.length > 0) {
    return mergeImageComponentsIntoPlaceholders(converted, imageComponents);
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
