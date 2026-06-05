const crypto = require('crypto');

const seId = () => `SE-${crypto.randomUUID()}`;

const stripTags = (html) => String(html || '').replace(/<[^>]*>/g, '').trim();

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
  components.push(...imageComponents);
  parts.forEach((part, index) => {
    const heading = index === 0 || part.length < 34;
    components.push(textComponent(part, heading ? {
      fontSize: index === 0 ? 'fs28' : 'fs24',
      bold: true,
      align: index === 0 ? 'center' : 'left',
      ctype: index === 0 ? 'text' : 'quotation',
    } : {}));
  });
  return components;
};

const htmlToComponents = async (client, html, imageComponents = []) => {
  const converted = await client.convertHtmlToComponents(html);
  if (Array.isArray(converted) && converted.length > 0) {
    return [...imageComponents, ...converted];
  }
  return fallbackHtmlToComponents(html, imageComponents);
};

module.exports = {
  htmlToComponents,
  imageComponent,
  textComponent,
};
