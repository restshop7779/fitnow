# FitNow 개발 환경 설정

이 문서는 새 PC나 다른 자리에서 FitNow 프로젝트를 이어서 작업할 때 필요한 최소 설정을 정리합니다.

## 1. 기본 위치

프로젝트 폴더:

```text
C:\Users\PC\OneDrive\문서\FitNow 앱개발
```

GitHub 저장소:

```text
https://github.com/restshop7779/fitnow
```

배포 주소:

```text
https://restshop7779.github.io/fitnow/index.react.html
```

## 2. 필요한 프로그램

- Node.js
- Git for Windows
- Chrome
- PowerShell

이 PC에는 이미 로컬 실행 스크립트와 `node_modules`가 준비되어 있습니다.

## 3. 가장 쉬운 실행 방법

파일 탐색기에서 아래 파일 중 하나를 더블클릭합니다.

| 파일 | 용도 |
| --- | --- |
| `01_DEV_SERVER_HOT_RELOAD.bat` | 개발용. 코드 수정 후 화면을 바로 확인할 때 사용 |
| `02_PREVIEW_BUILD_AND_OPEN.bat` | 최신 빌드 후 확인용 서버와 Chrome을 함께 실행 |
| `03_PREVIEW_SERVER_ONLY.bat` | 최신 빌드 후 서버만 실행 |

개발용 주소:

```text
http://127.0.0.1:5173/index.react.html
```

확인용 주소:

```text
http://127.0.0.1:4173/index.react.html
```

## 4. 명령어로 실행

개발 서버:

```powershell
& "C:\Program Files\nodejs\npm.cmd" run dev:local
```

최신 빌드:

```powershell
& "C:\Program Files\nodejs\npm.cmd" run build:local
```

검증:

```powershell
& "C:\Program Files\nodejs\npm.cmd" run check:preflight
```

## 5. 문제가 생겼을 때

- 화면이 예전처럼 보이면 `02_PREVIEW_BUILD_AND_OPEN.bat`를 다시 실행합니다.
- 로컬 서버가 이미 켜져 있으면 기존 서버 창을 닫고 다시 실행합니다.
- GitHub Pages 반영은 푸시 후 GitHub Actions가 성공해야 완료됩니다.
- Supabase 연결 문제는 [SUPABASE_SETUP.md](SUPABASE_SETUP.md)를 확인합니다.
