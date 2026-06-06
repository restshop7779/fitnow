# FitNow 개발 도구 설치

이 PC에는 일반 개발용 `node`, `npm`, `git`, `code` 명령이 아직 잡혀 있지 않습니다.

## 자동 설치 스크립트

PowerShell을 일반 사용자 권한으로 열고 프로젝트 폴더에서 실행합니다.

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\INSTALL_TOOLS.ps1
```

설치 후 PowerShell을 닫았다가 다시 열고 확인합니다.

```powershell
node -v
npm -v
git --version
code --version
```

## 설치 대상

- Node.js LTS
- Git for Windows
- Visual Studio Code

## 설치 후 다음 작업

설치가 끝나면 아래 명령으로 React 개발 서버를 실행할 수 있습니다.

```powershell
npm install
npm run dev
```

## 시스템 설치가 막힐 때

현재 Codex 환경에서는 공식 설치 파일 다운로드가 막힐 수 있습니다. 그래도 프로젝트에 포함된 로컬 실행 스크립트로 개발을 계속할 수 있습니다.

```powershell
.\scripts\build-local.ps1
.\scripts\dev-local.ps1
```

개발 서버가 켜지면 브라우저에서 아래 주소를 엽니다.

```text
http://127.0.0.1:5173/index.react.html
```
