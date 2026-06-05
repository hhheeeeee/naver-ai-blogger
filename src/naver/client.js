const crypto = require('crypto');
const { cookiesToHeader } = require('./session');

const BLOG_HOST = 'https://blog.naver.com';
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const withTimeout = async (fn) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);
  try {
    return await fn(controller.signal);
  } finally {
    clearTimeout(timeout);
  }
};

const createNaverClient = ({ sessionPath }) => {
  let blogId = null;

  const cookie = () => cookiesToHeader(sessionPath);
  const referer = (id, categoryNo = '0', extra = '') => {
    const base = `${BLOG_HOST}/PostWriteForm.naver?blogId=${encodeURIComponent(id)}&categoryNo=${encodeURIComponent(categoryNo)}`;
    return extra ? `${base}&${extra}` : base;
  };
  const headers = (extra = {}) => ({
    Cookie: cookie(),
    'User-Agent': USER_AGENT,
    Accept: 'application/json',
    ...extra,
  });

  const requestJson = async (url, options = {}) => withTimeout(async (signal) => {
    const response = await fetch(url, { redirect: 'follow', ...options, signal });
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`네이버 요청 실패: ${response.status} ${detail.slice(0, 160)}`);
    }
    return response.json();
  });

  const requestText = async (url, options = {}) => withTimeout(async (signal) => {
    const response = await fetch(url, { redirect: 'follow', ...options, signal });
    if (!response.ok) throw new Error(`네이버 요청 실패: ${response.status}`);
    return response.text();
  });

  const initBlog = async () => {
    if (blogId) return blogId;
    const html = await requestText(`${BLOG_HOST}/MyBlog.naver`, {
      headers: headers({ Referer: BLOG_HOST, Accept: 'text/html' }),
    });
    const match = html.match(/blogId\s*=\s*'([^']+)'/);
    if (!match) {
      if (html.includes('로그인') || html.toLowerCase().includes('login')) {
        throw new Error('네이버 세션이 만료됐습니다. login을 다시 실행하세요.');
      }
      throw new Error('네이버 블로그 ID를 찾지 못했습니다.');
    }
    blogId = match[1];
    return blogId;
  };

  const getToken = async (categoryNo = '0') => {
    const id = blogId || await initBlog();
    const json = await requestJson(
      `${BLOG_HOST}/PostWriteFormSeOptions.naver?blogId=${encodeURIComponent(id)}&categoryNo=${encodeURIComponent(categoryNo)}`,
      { headers: headers({ Referer: referer(id, categoryNo, 'Redirect=Write') }) }
    );
    const token = json?.result?.token;
    if (!token) throw new Error('네이버 SmartEditor 인증 토큰을 가져오지 못했습니다.');
    return token;
  };

  const getDefaultCategoryNo = async () => {
    const id = blogId || await initBlog();
    const json = await requestJson(
      `${BLOG_HOST}/PostWriteFormManagerOptions.naver?blogId=${encodeURIComponent(id)}&categoryNo=0`,
      { headers: headers({ Referer: referer(id, '0') }) }
    );
    return String(json?.result?.formView?.categoryListFormView?.defaultCategoryId || '1');
  };

  const getEditorInfo = async (categoryNo) => {
    const id = blogId || await initBlog();
    const token = await getToken(categoryNo);
    const config = await requestJson('https://platform.editor.naver.com/api/blogpc001/v1/service_config', {
      headers: headers({ Referer: referer(id, categoryNo), 'Se-Authorization': token }),
    });
    const manager = await requestJson(
      `${BLOG_HOST}/PostWriteFormManagerOptions.naver?blogId=${encodeURIComponent(id)}&categoryNo=${encodeURIComponent(categoryNo)}`,
      { headers: headers({ Referer: referer(id, categoryNo) }) }
    );
    const editorId = config?.editorInfo?.id;
    if (!editorId) throw new Error('네이버 SmartEditor ID를 가져오지 못했습니다.');
    return {
      editorId,
      editorSource: manager?.result?.formView?.editorSource || 'blogpc001',
      token,
    };
  };

  const getUploadSessionKey = async (token) => {
    const id = blogId || await initBlog();
    const json = await requestJson('https://platform.editor.naver.com/api/blogpc001/v1/photo-uploader/session-key', {
      headers: headers({ Referer: referer(id, '0'), 'Se-Authorization': token }),
    });
    return json?.sessionKey;
  };

  const uploadImage = async (buffer, filename, token) => {
    const id = blogId || await initBlog();
    const sessionKey = await getUploadSessionKey(token);
    if (!sessionKey) throw new Error('네이버 이미지 업로드 세션 키를 가져오지 못했습니다.');
    const form = new FormData();
    form.append('image', new Blob([buffer], { type: 'image/jpeg' }), filename || 'image.jpg');
    const url = `https://blog.upphoto.naver.com/${sessionKey}/simpleUpload/0?userId=${encodeURIComponent(id)}&extractExif=true&extractAnimatedCnt=true&autorotate=true&extractDominantColor=false&denyAnimatedImage=false&skipXcamFiltering=false`;
    const xml = await withTimeout(async (signal) => {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Cookie: cookie(),
          'User-Agent': USER_AGENT,
          Referer: `${BLOG_HOST}/${encodeURIComponent(id)}`,
        },
        body: form,
        signal,
      });
      if (!response.ok) throw new Error(`네이버 이미지 업로드 실패: ${response.status}`);
      return response.text();
    });
    const tag = (name) => xml.match(new RegExp(`<${name}>([^<]*)</${name}>`))?.[1] || '';
    if (!tag('url')) throw new Error('네이버 이미지 업로드 응답에 URL이 없습니다.');
    return {
      url: tag('url'),
      width: Number(tag('width') || 600),
      height: Number(tag('height') || 400),
      fileName: tag('fileName') || filename || 'image.jpg',
      fileSize: Number(tag('fileSize') || 0),
    };
  };

  const convertHtmlToComponents = async (html) => {
    const id = blogId || await initBlog();
    const wrapped = `<html><body><!--StartFragment-->${html}<!--EndFragment--></body></html>`;
    return withTimeout(async (signal) => {
      const response = await fetch(
        `https://upconvert.editor.naver.com/blog/html/components?documentWidth=886&userId=${encodeURIComponent(id)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'User-Agent': USER_AGENT,
            Cookie: cookie(),
          },
          body: wrapped,
          signal,
        }
      );
      if (!response.ok) return [];
      return response.json();
    }).catch(() => []);
  };

  const publishPost = async ({ title, content, categoryNo, tags = '', openType = 2 }) => {
    const id = blogId || await initBlog();
    const resolvedCategoryNo = categoryNo || await getDefaultCategoryNo();
    const { editorId, editorSource } = await getEditorInfo(resolvedCategoryNo);
    const titleComponent = {
      id: `SE-${crypto.randomUUID()}`,
      layout: 'default',
      title: [{
        id: `SE-${crypto.randomUUID()}`,
        nodes: [{ id: `SE-${crypto.randomUUID()}`, value: title, '@ctype': 'textNode' }],
        '@ctype': 'paragraph',
      }],
      subTitle: null,
      align: 'left',
      '@ctype': 'documentTitle',
    };
    const body = new URLSearchParams({
      blogId: id,
      documentModel: JSON.stringify({
        documentId: '',
        document: {
          version: '2.9.0',
          theme: 'default',
          language: 'ko-KR',
          id: editorId,
          components: [titleComponent, ...content],
        },
      }),
      populationParams: JSON.stringify({
        configuration: {
          openType,
          commentYn: true,
          searchYn: true,
          sympathyYn: true,
          scrapType: 2,
          outSideAllowYn: true,
          twitterPostingYn: false,
          facebookPostingYn: false,
          cclYn: false,
        },
        populationMeta: {
          categoryId: String(resolvedCategoryNo),
          logNo: null,
          directorySeq: 0,
          directoryDetail: null,
          mrBlogTalkCode: null,
          postWriteTimeType: 'now',
          tags,
          moviePanelParticipation: false,
          greenReviewBannerYn: false,
          continueSaved: false,
          noticePostYn: false,
          autoByCategoryYn: false,
          postLocationSupportYn: false,
          postLocationJson: null,
          prePostDate: null,
          thisDayPostInfo: null,
          scrapYn: false,
        },
        editorSource,
      }),
      productApiVersion: 'v1',
    });
    const json = await requestJson(`${BLOG_HOST}/RabbitWrite.naver`, {
      method: 'POST',
      headers: headers({
        'Content-Type': 'application/x-www-form-urlencoded',
        Referer: referer(id, resolvedCategoryNo, 'Redirect=Write'),
      }),
      body: body.toString(),
    });
    if (!json?.isSuccess) throw new Error(`네이버 글 발행 실패: ${JSON.stringify(json).slice(0, 200)}`);
    const redirectUrl = json.result?.redirectUrl || '';
    const finalBlogId = redirectUrl.match(/blogId=([^&]+)/)?.[1] || id;
    const logNo = redirectUrl.match(/logNo=([^&]+)/)?.[1] || '';
    return {
      success: true,
      entryUrl: logNo ? `https://blog.naver.com/${finalBlogId}/${logNo}` : null,
      redirectUrl,
    };
  };

  return {
    convertHtmlToComponents,
    getDefaultCategoryNo,
    getToken,
    initBlog,
    publishPost,
    uploadImage,
  };
};

module.exports = {
  createNaverClient,
};
