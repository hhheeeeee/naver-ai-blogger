# Naver AI Blogger

Codex에서 네이버 블로그 식당 후기를 작성하고 발행하기 위한 MVP 플러그인입니다.

## 무엇을 하나요?

- `naver` skill: 네이버 로그인 후 쿠키 세션을 저장합니다.
- `naver-blog` skill: 식당 이름, 주소, 사진을 바탕으로 Codex가 글을 쓰고 네이버 블로그에 발행합니다.

핵심 흐름은 Playwright 로그인으로 쿠키를 저장한 뒤, `blog.naver.com`과 `platform.editor.naver.com` 엔드포인트를 사용해 SmartEditor 토큰, 이미지 업로드 세션, `RabbitWrite.naver` 발행을 처리하는 방식입니다. 참고 구현과 라이선스 표기는 [NOTICE](NOTICE)에 정리되어 있습니다.

## 설치

Codex 플러그인으로 사용하려면 이 repo를 marketplace로 추가합니다.

```bash
codex plugin marketplace add hhheeeeee/naver-ai-blogger
codex plugin add naver-ai-blogger@naver-ai-blogger-marketplace
```

Codex 앱에서는 marketplace 추가 후 `/plugins`에서 `Naver AI Blogger`를 설치/활성화해도 됩니다.

이미 설치한 사용자가 최신 버그픽스를 받으려면 marketplace를 갱신한 뒤 플러그인을 다시 설치합니다.

```bash
codex plugin marketplace upgrade naver-ai-blogger-marketplace
codex plugin remove naver-ai-blogger@naver-ai-blogger-marketplace
codex plugin add naver-ai-blogger@naver-ai-blogger-marketplace
```

그 다음 새 thread를 열거나 Codex를 재시작하세요.

공개 전 전체 점검은 [docs/GO-LIVE-CHECKLIST.md](docs/GO-LIVE-CHECKLIST.md)를 따르세요. 세션과 자격 증명 취급 원칙은 [SECURITY.md](SECURITY.md)에 정리되어 있습니다.

## Codex에서 쓰는 법

Codex에서 skill을 명시하려면 `$naver` 또는 `$naver-blog`로 요청합니다. 앱/CLI에서 `/skills`를 열고 `naver` 또는 `naver-blog`를 선택해도 됩니다.

```text
$naver --userid <id> --userpw <password>
```

또는:

```text
$naver-blog 블로그이름: 식당 이름
주소: 서울시 ...
사진: ./photos/*.jpg
태그: 맛집,점심
```

`/naver`처럼 바로 치는 slash command가 아니라, 설치된 skill을 `$`로 호출하거나 `/skills`에서 선택하는 구조입니다. 플러그인을 막 설치하거나 업데이트했다면 새 thread를 열거나 Codex를 재시작한 뒤 다시 확인하세요.

## 글쓰기 프롬프트 커스터마이즈

기본 맛집 후기 작성 프롬프트는 [prompts/restaurant-review.md](prompts/restaurant-review.md)에 있습니다. 기본값은 네이버 맛집 인플루언서 톤, 2,000~3,000자 내외, 사진과 글이 번갈아 나오는 구성, 제목 후보 10개, 해시태그 25개, 한 줄 총평을 기준으로 합니다. 본문 첫머리에는 `📍 위치 정보`와 `🕒 영업 정보` 소제목을 넣고, 네이버 지도 링크와 확인 가능한 운영 정보를 먼저 정리하도록 되어 있습니다.

일반 본문은 가운데 정렬 HTML 문단으로 작성하며, 한 문장당 하나의 `<p style="text-align:center;">...</p>` 문단을 쓰는 형식을 기본으로 합니다. 문장이 붙어 보이지 않도록 중간중간 `<p><br></p>` 여백 문단도 사용할 수 있습니다.

강조가 필요한 식당명, 메뉴명, 주문 팁 같은 짧은 구절은 `<span style="color:#ff0010;">...</span>`처럼 색상 강조를 사용할 수 있습니다. 발행 변환 fallback에서도 inline `span` 색상과 일부 네이버 span class를 보존합니다.

본문 HTML에 `<p>[외관 사진]</p>`, `<p>[대표 메뉴 사진]</p>`처럼 독립 문단으로 사진 위치를 넣으면, 발행 시 업로드된 사진이 해당 위치에 순서대로 들어갑니다. 사진 위치 표기가 없으면 기존 호환성을 위해 업로드 이미지가 본문 앞쪽에 들어갑니다.

사용자가 프롬프트를 수정하고 싶으면 아래 파일을 만들면 됩니다.

```bash
mkdir -p work
cp prompts/restaurant-review.md work/naver-blog-prompt.md
```

그다음 원하는 스타일로 수정하세요.

```bash
$EDITOR work/naver-blog-prompt.md
```

`naver-blog` skill은 사용자 요청에 직접 포함된 프롬프트를 최우선으로 보고, 그다음 `work/naver-blog-prompt.md`, 마지막으로 기본 `prompts/restaurant-review.md`를 사용합니다.

## 원격 Codex에서의 주의점

원격 Codex에서도 발행은 가능합니다. 다만 다음 두 가지가 필요합니다.

- 사진 파일이 원격 Codex workspace 안에 있어야 합니다.
- 네이버 세션 파일이 원격 환경에 있거나, `NAVER_SESSION_JSON` / `NAVER_SESSION_BASE64` secret이 설정되어 있어야 합니다.

브라우저 로그인이나 2FA가 원격에서 어렵다면 로컬에서 로그인 후 세션 파일을 안전한 secret으로 전달하세요.

## 개발

로컬에서 플러그인을 수정하거나 테스트하려면 repo를 clone한 뒤 의존성을 설치합니다.

```bash
git clone https://github.com/hhheeeeee/naver-ai-blogger.git
cd naver-ai-blogger
npm install
```

```bash
npm run sync:plugin
npm run check
npm test
npm run validate:plugin
```

`skills/`, `prompts/`, `.codex-plugin/`을 수정했다면 `npm run sync:plugin`으로 `plugins/naver-ai-blogger/` marketplace wrapper를 갱신하세요. `npm run validate:plugin`은 root copy와 wrapper copy가 어긋나면 실패합니다.

## 지원 요청

이슈를 열 때는 비밀번호, 쿠키 값, `NAVER_SESSION_JSON`, `NAVER_SESSION_BASE64`를 포함하지 마세요. 발행 문제는 민감정보를 제거한 뒤 공유해 주세요.
