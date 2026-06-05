# Naver AI Blogger

Codex에서 네이버 블로그 식당 후기를 작성하고 발행하기 위한 MVP 플러그인 겸 CLI입니다.

## 무엇을 하나요?

- `naver` skill: 네이버 로그인 후 쿠키 세션을 저장합니다.
- `naver-blog` skill: 식당 이름, 주소, 사진을 바탕으로 Codex가 글을 쓰고 CLI가 네이버 블로그에 발행합니다.
- `naver-ai-blogger` CLI: 네이버 로그인, 세션 확인, 이미지 업로드, SmartEditor 문서 발행을 실행합니다.

네이버 자동화 방식은 [viruagent-cli](https://github.com/greekr4/viruagent-cli)의 Naver provider 구현을 참고했습니다. 핵심 흐름은 Playwright 로그인으로 쿠키를 저장한 뒤, `blog.naver.com`과 `platform.editor.naver.com` 엔드포인트를 사용해 SmartEditor 토큰, 이미지 업로드 세션, `RabbitWrite.naver` 발행을 처리하는 방식입니다.

## 설치

```bash
git clone https://github.com/hhheeeeee/naver-ai-blogger.git
cd naver-ai-blogger
npm install
```

Codex 플러그인으로 사용하려면 이 repo를 marketplace로 추가합니다.

```bash
codex plugin marketplace add hhheeeeee/naver-ai-blogger
```

그 다음 Codex를 재시작하고 `/plugins`에서 `Naver AI Blogger`를 설치/활성화하세요.

## CLI 사용

이 repo를 clone한 상태에서는 `npx naver-ai-blogger ...`를 쓰면 됩니다.

아무 workspace에서나 GitHub의 최신 코드를 바로 실행하려면 아래 형태를 쓰세요.

```bash
npm exec --yes --package github:hhheeeeee/naver-ai-blogger -- naver-ai-blogger --help
```

로그인:

```bash
npx naver-ai-blogger login --userid "<naver-id>" --userpw "<naver-password>"
```

필수값을 빼먹으면 CLI가 어떤 값이 필요한지 에러로 알려줍니다. 환경변수로도 넣을 수 있습니다.

```bash
export NAVER_USERID="<naver-id>"
export NAVER_USERPW="<naver-password>"
npx naver-ai-blogger login
```

캡차나 2FA가 나오면 수동 모드를 사용합니다.

```bash
npx naver-ai-blogger login --manual
```

세션 확인:

```bash
npx naver-ai-blogger status
```

글 발행:

```bash
npx naver-ai-blogger blog \
  --blog-name "식당 이름" \
  --restaurant-address "서울시 ..." \
  --images "./photos/*.jpg" \
  --content-file work/naver-blog-post.html \
  --tags "맛집,방문후기"
```

기본 세션 파일은 `~/.naver-ai-blogger/naver-session.json`입니다. 다른 경로를 쓰려면 `--session <path>`를 붙이세요.

## Codex에서 쓰는 법

Codex에서 아래처럼 요청합니다.

```text
/naver --userid <id> --userpw <password>
```

또는:

```text
/naver-blog 블로그이름: 식당 이름
주소: 서울시 ...
사진: ./photos/*.jpg
태그: 맛집,점심
```

현재 Codex 플러그인은 임의의 새 slash command 실행기를 직접 등록하기보다 skill을 설치해 Codex가 해당 workflow를 따르게 하는 구조입니다. 따라서 실제 실행은 skill 지침에 따라 `npx naver-ai-blogger ...` CLI로 수행됩니다.

## 원격 Codex에서의 주의점

원격 Codex에서도 발행은 가능합니다. 다만 다음 두 가지가 필요합니다.

- 사진 파일이 원격 Codex workspace 안에 있어야 합니다.
- 네이버 세션 파일이 원격 환경에 있거나, 원격 환경에서 로그인을 완료할 수 있어야 합니다.

브라우저 로그인이나 2FA가 원격에서 어렵다면 로컬에서 로그인 후 세션 파일을 안전한 secret 또는 workspace 파일로 전달하고 `--session`으로 지정하세요.

## 개발

```bash
npm run check
node bin/naver-ai-blogger.js --help
```

## Slash command처럼 쓰고 싶을 때

Codex의 권장 재사용 단위는 skills입니다. 그래도 CLI/IDE에서 `/naver`, `/naver-blog`와 비슷한 입력 경험이 필요하면 prompt 템플릿을 설치할 수 있습니다.

```bash
./scripts/install-prompts.sh
```

Codex를 재시작한 뒤 `/prompts:naver`, `/prompts:naver-blog`를 사용하세요. Codex 문서상 custom prompts는 deprecated라 장기적으로는 skills를 기본 사용 경로로 유지하는 것이 좋습니다.
