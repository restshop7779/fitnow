# FitNow

FitNow는 패션 상품을 빠르게 탐색하고, 주문/배송/반품 흐름까지 확인할 수 있는 쇼핑 앱 프로토타입입니다.

## 실행 파일 구분

작업할 때는 아래 번호가 붙은 파일을 기준으로 실행하세요.

| 파일 | 용도 | 주소 |
| --- | --- | --- |
| `01_DEV_SERVER_HOT_RELOAD.bat` | 개발용. 코드 수정 후 화면이 바로 갱신됩니다. | `http://127.0.0.1:5173/index.react.html` |
| `02_PREVIEW_BUILD_AND_OPEN.bat` | 확인용. 최신 빌드 후 서버를 열고 Chrome까지 띄웁니다. | `http://127.0.0.1:4173/index.react.html` |
| `03_PREVIEW_SERVER_ONLY.bat` | 확인용. 최신 빌드 후 서버만 켭니다. 브라우저는 직접 열 때 사용합니다. | `http://127.0.0.1:4173/index.react.html` |

기존 파일인 `START_FITNOW_LOCALHOST.bat`, `START_FITNOW_SERVER_ONLY.bat`, `OPEN_FITNOW_IN_CHROME.bat`는 호환용으로 남겨뒀고, 내부에서 새 번호 파일을 실행합니다.

## 언제 무엇을 누르면 되나

- 앱 화면이나 기능을 계속 수정할 때: `01_DEV_SERVER_HOT_RELOAD.bat`
- 친구나 테스트 사용자에게 보여주기 전 최종 확인할 때: `02_PREVIEW_BUILD_AND_OPEN.bat`
- 이미 브라우저를 열어둔 상태에서 서버만 다시 켤 때: `03_PREVIEW_SERVER_ONLY.bat`

`02`, `03`은 실행할 때마다 먼저 최신 빌드를 만들기 때문에 예전 `dist` 화면이 뜨는 문제를 줄입니다.

## 명령어로 실행

개발 서버:

```powershell
& "C:\Program Files\nodejs\npm.cmd" run dev:local
```

최신 빌드:

```powershell
& "C:\Program Files\nodejs\npm.cmd" run build:local
```

배포/홈 클릭 점검:

```powershell
& "C:\Program Files\nodejs\npm.cmd" run check:deploy
& "C:\Program Files\nodejs\npm.cmd" run check:e2e
```

## 저장 위치

- 원본 코드: `C:\Users\PC\OneDrive\문서\FitNow 앱개발`
- 빌드 결과: `C:\Users\PC\OneDrive\문서\FitNow 앱개발\dist`
- GitHub 저장소: `https://github.com/restshop7779/fitnow`
- 배포 주소: `https://restshop7779.github.io/fitnow/index.react.html`
