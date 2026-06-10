const crypto = require('crypto');

const seId = () => `SE-${crypto.randomUUID()}`;

const decodeHtmlEntities = (text) => String(text || '')
  .replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'");

const stripTags = (html) => decodeHtmlEntities(String(html || '').replace(/<[^>]*>/g, '')).trim();

const blockTagPattern = /<(p|h[1-6]|li)\b([^>]*)>([\s\S]*?)<\/\1>/gi;

const parseStyle = (attrs = '') => {
  const styleMatch = String(attrs).match(/\sstyle=(["'])(.*?)\1/i);
  if (!styleMatch) return {};
  return styleMatch[2]
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((style, declaration) => {
      const [property, ...valueParts] = declaration.split(':');
      if (!property || valueParts.length === 0) return style;
      style[property.trim().toLowerCase()] = valueParts.join(':').trim().toLowerCase();
      return style;
    }, {});
};

const parseHtmlBlocks = (html) => {
  const source = String(html || '');
  const blocks = [];
  let match = null;

  while ((match = blockTagPattern.exec(source)) !== null) {
    blocks.push({
      tag: match[1].toLowerCase(),
      attrs: match[2] || '',
      html: match[3] || '',
    });
  }

  if (blocks.length) return blocks;
  return source.split('\n').map((line) => ({
    tag: 'p',
    attrs: '',
    html: line,
  }));
};

const blockText = (html) => stripTags(String(html || '').replace(/<br\s*\/?>/gi, '\n'));

const normalizeColor = (color) => {
  const value = String(color || '').trim();
  const hex = value.match(/^#?([0-9a-fA-F]{6})$/);
  return hex ? `#${hex[1].toLowerCase()}` : null;
};

const styleFromAttrs = (attrs = {}) => {
  const style = parseStyle(attrs);
  const classColor = String(attrs).match(/\bse-fc-([0-9a-fA-F]{6})\b/)?.[1];
  const classSize = String(attrs).match(/\bse-fs-([a-zA-Z0-9]+)\b/)?.[1];
  return {
    fontColor: normalizeColor(style.color) || normalizeColor(classColor),
    fontSize: classSize || null,
    bold: /\bfont-weight\s*:\s*(bold|[6-9]00)\b/i.test(String(attrs)) ||
      /\b(se-bold|__se_node_bold)\b/i.test(String(attrs)),
  };
};

const parseInlineSegments = (html, defaults = {}) => {
  const source = String(html || '').replace(/<br\s*\/?>/gi, ' ');
  const segments = [];
  const spanPattern = /<span\b([^>]*)>([\s\S]*?)<\/span>/gi;
  let cursor = 0;
  let match = null;

  const pushText = (raw, style = {}) => {
    const text = stripTags(raw).replace(/\s+/g, ' ').trim();
    if (!text) return;
    segments.push({
      text,
      fontColor: style.fontColor || defaults.fontColor,
      fontSize: style.fontSize || defaults.fontSize,
      bold: Boolean(defaults.bold || style.bold),
    });
  };

  while ((match = spanPattern.exec(source)) !== null) {
    pushText(source.slice(cursor, match.index), defaults);
    pushText(match[2], styleFromAttrs(match[1]));
    cursor = match.index + match[0].length;
  }

  pushText(source.slice(cursor), defaults);
  return segments;
};

const isSpacerBlock = (html) => {
  const source = String(html || '').trim();
  if (!source) return false;
  return /^(?:<br\s*\/?>|&nbsp;|\s)+$/i.test(source);
};

const splitSentences = (text) => {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return [];
  return normalized.match(/[^.!?。！？]+[.!?。！？]+(?:["'”’])?|[^.!?。！？]+$/g)
    ?.map((sentence) => sentence.trim())
    .filter(Boolean) || [normalized];
};

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

const richTextComponent = (segments, opts = {}) => ({
  id: seId(),
  layout: 'default',
  value: [{
    id: seId(),
    nodes: segments.map((segment) => ({
      id: seId(),
      value: segment.text,
      style: {
        fontColor: segment.fontColor || opts.fontColor || '#333333',
        fontSizeCode: segment.fontSize || opts.fontSize || 'fs16',
        bold: Boolean(opts.bold || segment.bold),
        '@ctype': 'nodeStyle',
      },
      '@ctype': 'textNode',
    })),
    style: {
      align: opts.align || 'left',
      lineHeight: opts.lineHeight || '1.8',
      '@ctype': 'paragraphStyle',
    },
    '@ctype': 'paragraph',
  }],
  '@ctype': opts.ctype || 'text',
});

const textComponent = (text, opts = {}) => richTextComponent([{
  text,
  fontColor: opts.fontColor,
  fontSize: opts.fontSize,
  bold: opts.bold,
}], opts);

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
  const components = [];
  parseHtmlBlocks(html).forEach((block, index) => {
    const part = blockText(block.html);
    const style = parseStyle(block.attrs);
    const align = style['text-align'] || 'center';
    if (!part) {
      if (isSpacerBlock(block.html)) {
        components.push(textComponent(' ', { align, lineHeight: '1.0' }));
      }
      return;
    }

    const isHeading = /^h[1-6]$/.test(block.tag);

    if (isPhotoPlaceholder(part)) {
      components.push(textComponent(part, { align }));
      return;
    }

    if (isHeading) {
      const segments = parseInlineSegments(block.html, {
        fontSize: block.tag === 'h1' || block.tag === 'h2' ? 'fs28' : 'fs24',
        bold: true,
      });
      components.push(richTextComponent(segments, {
        fontSize: block.tag === 'h1' || block.tag === 'h2' ? 'fs28' : 'fs24',
        bold: true,
        align,
        ctype: block.tag === 'h1' || block.tag === 'h2' ? 'text' : 'quotation',
      }));
      return;
    }

    const segments = parseInlineSegments(block.html);
    const hasInlineStyle = segments.some((segment) => segment.fontColor || segment.fontSize || segment.bold);
    if (hasInlineStyle) {
      components.push(richTextComponent(segments, { align }));
      return;
    }

    splitSentences(part).forEach((sentence) => {
      components.push(textComponent(sentence, {
        align,
        ctype: index === 0 && sentence.length < 34 ? 'quotation' : 'text',
      }));
    });
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
  richTextComponent,
  textComponent,
};
