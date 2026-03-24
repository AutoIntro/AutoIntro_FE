# Git 협업 규칙

## 1. 커밋 유형 (Commit Type)

커밋은 다음과 같이 분류하여 메시지를 작성한다.

- **`feat`** : 기능 개발
- **`fix`** : 버그 수정
- **`style`** : UI 스타일 수정 (CSS, Tailwind class, 디자인 토큰 값 변경 등 **기능 변경 없음**)
- **`docs`** : 문서 작업 (주로 `main` 에서 `README.md` 작성)
- **`refactor`** : 리팩토링 (기능 변경 없이 **구조/설계 개선**, 함수 추출, 클래스 구조 변경 등)
- **`chore`** : 설정 변경, 파일 이동/이름 변경, 주석 추가 등 빌드/기능에 영향 없는 작업

---

## 2. 커밋 메시지 작성 규칙

커밋 메시지는 다음과 같은 형태로 작성한다. (띄어쓰기 및 형식 준수)

### 📌 규칙

- 커밋 유형은 **반드시 영문 소문자**로 작성한다.
- 커밋 메시지는 **기본적으로 한글**로 작성하되, 라이브러리명/기술 용어/에러 메시지는 **영어 사용을 허용**한다.
- 필요 시 커밋 메시지 가장 앞에 **이슈 번호**를 추가한다.
- 커밋은 **“논리적으로 독립적인 작업”** 단위로 작성한다.
    - 독립적으로 **빌드 및 테스트**가 가능한 단위
    - 롤백 시 **최소한의 영향**을 주는 단위

> **`[태그] #이슈번호: 설명`**

- `[FEAT] #12: 구글 소셜 로그인 Service 구현`
- `[FIX] #15: 회원가입 시 중복 이메일 에러 수정`
- `[DOCS] #20: README.md 컨벤션 정리`
- `[CHORE] #0: 빌드 설정 변경 (build.gradle)`

---

## 3. 브랜치 전략 (Branch Strategy)

### `main` : 배포용 브랜치
- 실제 서비스에 배포되는 코드만 포함
- 직접 개발하지 않고 `dev` 또는 `fix` 등의 브랜치를 이용하여 병합하여 사용

### `develop` : 개발 통합 브랜치
- `main` 브랜치에서 분기
- 여러 기능이 개발되고 통합되는 브랜치
- `feature` 브랜치에서 작업한 기능들을 이 곳으로 병합
- 충분히 테스트한 후 `main`으로 배포

### `feat/#이슈번호-아이디` : 신규 기능 개발 브랜치
- `dev` 브랜치에서 분기되어 기능 단위로 개발
- 개발 완료 후 `dev`로 병합
- 브랜치명은 `kebab-case` 사용

### `fix/#이슈번호-아이디` : 버그 수정용 브랜치
- `dev` 또는 `main`에서 분기하여 버그 수정
- **dev에서 분기** : 개발 중 발견된 버그 수정
    - 기능 구현에 대한 버그 수정 시, 반드시 해당 기능 브랜치가 `dev`와 병합되어 있는지 확인 후 수정 진행
    - 수정 완료 후 `dev`로 병합

### `hotfix/#이슈번호-아이디` : 긴급 수정 브랜치
- 운영 환경(`main`)에서 발생한 긴급 버그 수정
- `main`에서 분기하여 수정 후 `main`과 `dev`에 모두 병합

---

## 4. 브랜치 규칙 (Branching Rule)

1. 기능 개발은 반드시 `feature` 브랜치에서 개발한다.
2. 개발 완료 시 `dev` 브랜치로 합병한다.
3. 브랜치명은 `kebab-case`를 사용한다.
4. 모든 QA 및 버그 수정 완료 시 `main`으로 병합한다.
5. 긴급 수정은 `hotfix` 브랜치에서 진행 후 `main`과 `dev`에 병합한다.


> **`타입/이슈번호-깃허브아이디`**

- **기능 개발**: `feat/12-greaming`
- **버그 수정**: `fix/15-greaming`
- **문서 작업**: `docs/20-greaming`

## 🏃‍♂️ 로컬 개발 환경 설정 

이 프로젝트는 보안을 위해 환경변수(`.env`)와 로컬 설정 파일(`application-local.yml`)을 Git에 올리지 않습니다.
프로젝트를 실행하려면 아래 순서대로 설정을 진행해 주세요.

### 1. 환경변수 설정 파일 생성
프로젝트 루트 폴더에서 `.env` 파일을 생성합니다.

```bash
# 프로젝트 루트에서 실행
cp .env.example .env
```

### 2. 환경변수 값 설정
생성된 `.env` 파일을 열고 본인의 로컬 환경에 맞게 값을 설정합니다.

```env
# 데이터베이스 설정
SPRING_DATASOURCE_URL=jdbc:mysql://localhost:3306/greaming_local?serverTimezone=Asia/Seoul&characterEncoding=UTF-8
SPRING_DATASOURCE_USERNAME=root
SPRING_DATASOURCE_PASSWORD=your_password_here

# JWT 설정
JWT_SECRET=your-256-bit-secret-key-here-must-be-at-least-32-characters-long

# OAuth2 설정 (Google)
OAUTH2_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
OAUTH2_GOOGLE_CLIENT_SECRET=your-google-client-secret

# OAuth2 설정 (Kakao)
OAUTH2_KAKAO_CLIENT_ID=your-kakao-rest-api-key
OAUTH2_KAKAO_CLIENT_SECRET=your-kakao-client-secret

# OAuth2 리다이렉트 URI
OAUTH2_REDIRECT_URI=http://localhost:3000/oauth/callback
```

### 3. application-local.yml 생성
`src/main/resources` 폴더에서 설정 파일을 생성합니다.

```bash
# src/main/resources 폴더에서 실행
cp application-local.yml.example application-local.yml
```

> ⚠️ `application-local.yml`은 환경변수를 참조하므로 직접 수정할 필요가 없습니다.

### 4. IntelliJ IDEA에서 환경변수 로드

#### 방법 1: EnvFile 플러그인 사용 (권장)

1. **플러그인 설치**
   - `Settings (⌘,)` > `Plugins` > `Marketplace`
   - "EnvFile" 검색 후 Install

2. **Run Configuration 설정**
   - `Run` > `Edit Configurations...`
   - `EnvFile` 탭 선택
   - `Enable EnvFile` 체크
   - `+` 버튼 클릭하여 `.env` 파일 추가

3. **애플리케이션 실행**

#### 방법 2: 터미널에서 실행

```bash
# macOS/Linux
export $(cat .env | xargs) && ./gradlew bootRun

# Windows PowerShell
Get-Content .env | ForEach-Object { $var = $_.Split('='); [Environment]::SetEnvironmentVariable($var[0], $var[1]) }
.\gradlew.bat bootRun
```

### 5. 데이터베이스 생성 (MySQL)

```sql
CREATE DATABASE greaming_local CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 6. OAuth2 설정 (선택)

소셜 로그인 기능을 사용하려면 각 플랫폼에서 앱을 등록하고 발급받은 정보를 `.env` 파일에 입력하세요.

- **Google**: [Google Cloud Console](https://console.cloud.google.com/)
- **Kakao**: [Kakao Developers](https://developers.kakao.com/)

자세한 설정 방법은 `SOCIAL_LOGIN_GUIDE.md` 파일을 참고하세요.

---

## 📁 설정 파일 구조

```
greaming_BE/
├── .env                          # 환경변수 (Git 미포함)
├── .env.example                  # 환경변수 예시 (Git 포함)
└── src/main/resources/
    ├── application.yml           # 공통 설정
    ├── application-local.yml     # 로컬 개발 설정 (Git 미포함)
    ├── application-local.yml.example  # 로컬 설정 예시 (Git 포함)
    ├── application-dev.yml       # 개발 서버 설정
    └── application-prod.yml      # 운영 서버 설정
```

---

## 🌐 개발/운영 서버 배포 가이드

### 환경별 실행 방법

동일한 `.env` 파일을 사용하되, Spring Profile을 변경하여 환경을 전환합니다.

```bash
# 로컬 환경 (기본값)
./gradlew bootRun

# 개발 환경
export SPRING_PROFILES_ACTIVE=dev
./gradlew bootRun

# 운영 환경
export SPRING_PROFILES_ACTIVE=prod
./gradlew bootRun
```

### DEV 환경 배포

개발 서버에 배포할 때는 `.env` 파일의 값을 개발 서버에 맞게 수정합니다.

```bash
# 1. .env 파일 생성 및 값 수정
cp .env.example .env
vim .env  # 개발 서버 정보 입력 (포트: 8081, DB URL 등)

# 2. dev 프로필로 실행
export SPRING_PROFILES_ACTIVE=dev
export $(cat .env | xargs) && ./gradlew bootRun
```

#### Docker Compose 사용 시
```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    image: greaming-backend:latest
    env_file:
      - .env
    environment:
      - SPRING_PROFILES_ACTIVE=dev
    ports:
      - "8081:8081"
```

### PROD 환경 배포

운영 서버에 배포할 때는 **보안을 최우선**으로 고려해야 합니다.

#### ⚠️ 보안 권고사항
1. `.env` 파일을 서버에 직접 업로드하지 마세요
2. **환경변수 직접 설정** 또는 **Secret Manager** 사용을 권장합니다:
   - AWS: Secrets Manager, Systems Manager Parameter Store
   - GCP: Secret Manager
   - Azure: Key Vault
   - Kubernetes: Secrets

#### 방법 1: 환경변수 직접 설정
```bash
# 서버에서 환경변수 직접 설정
export SERVER_PORT=8080
export SPRING_DATASOURCE_URL="jdbc:mysql://prod-db:3306/greaming_prod?serverTimezone=Asia/Seoul&characterEncoding=UTF-8"
export SPRING_DATASOURCE_USERNAME="prod_user"
export SPRING_DATASOURCE_PASSWORD="strong_password"
export JWT_SECRET="your-strong-jwt-secret"
export OAUTH2_GOOGLE_CLIENT_ID="your-google-client-id"
export OAUTH2_GOOGLE_CLIENT_SECRET="your-google-client-secret"
export OAUTH2_KAKAO_CLIENT_ID="your-kakao-client-id"
export OAUTH2_KAKAO_CLIENT_SECRET="your-kakao-client-secret"
export OAUTH2_REDIRECT_URI="https://yourdomain.com/oauth/callback"
export SPRING_PROFILES_ACTIVE=prod

./gradlew bootRun
```

#### 방법 2: AWS Secrets Manager 사용
```bash
# Secrets 생성
aws secretsmanager create-secret \
  --name greaming/prod/db \
  --secret-string '{"url":"jdbc:mysql://...","username":"prod_user","password":"strong_password"}'
```

#### 방법 3: Kubernetes Secrets 사용
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: greaming-secrets
type: Opaque
stringData:
  SPRING_DATASOURCE_URL: jdbc:mysql://prod-db:3306/greaming_prod
  SPRING_DATASOURCE_USERNAME: prod_user
  SPRING_DATASOURCE_PASSWORD: strong_password
  JWT_SECRET: your-strong-jwt-secret
  OAUTH2_GOOGLE_CLIENT_ID: your-google-client-id
  OAUTH2_GOOGLE_CLIENT_SECRET: your-google-client-secret
  OAUTH2_KAKAO_CLIENT_ID: your-kakao-client-id
  OAUTH2_KAKAO_CLIENT_SECRET: your-kakao-client-secret
```

---

## 🔐 환경별 환경변수 예시

하나의 `.env` 파일로 모든 환경을 관리합니다. 환경에 따라 값만 변경하면 됩니다.

### Local 환경
```env
SERVER_PORT=8080
SPRING_DATASOURCE_URL=jdbc:mysql://localhost:3306/greaming_local?serverTimezone=Asia/Seoul&characterEncoding=UTF-8
SPRING_DATASOURCE_USERNAME=root
SPRING_DATASOURCE_PASSWORD=local_password
SPRING_JPA_HIBERNATE_DDL_AUTO=update
SPRING_JPA_SHOW_SQL=true
JWT_SECRET=local-jwt-secret-key-at-least-32-characters
OAUTH2_REDIRECT_URI=http://localhost:3000/oauth/callback
```

### Dev 환경
```env
SERVER_PORT=8081
SPRING_DATASOURCE_URL=jdbc:mysql://dev-db-server:3306/greaming_dev?serverTimezone=Asia/Seoul&characterEncoding=UTF-8
SPRING_DATASOURCE_USERNAME=dev_user
SPRING_DATASOURCE_PASSWORD=dev_password
SPRING_JPA_HIBERNATE_DDL_AUTO=update
SPRING_JPA_SHOW_SQL=true
JWT_SECRET=dev-jwt-secret-key-at-least-32-characters
OAUTH2_REDIRECT_URI=https://dev.yourdomain.com/oauth/callback
```

### Prod 환경
```env
SERVER_PORT=8080
SPRING_DATASOURCE_URL=jdbc:mysql://prod-db-server:3306/greaming_prod?serverTimezone=Asia/Seoul&characterEncoding=UTF-8
SPRING_DATASOURCE_USERNAME=prod_user
SPRING_DATASOURCE_PASSWORD=strong_prod_password
SPRING_JPA_HIBERNATE_DDL_AUTO=validate
SPRING_JPA_SHOW_SQL=false
JWT_SECRET=prod-strong-jwt-secret-key-at-least-32-characters
OAUTH2_REDIRECT_URI=https://yourdomain.com/oauth/callback
```

---

## 💡 환경 전환 방법

```bash
# 로컬 환경 실행
export $(cat .env | xargs)
./gradlew bootRun

# 개발 환경 실행
export SPRING_PROFILES_ACTIVE=dev
export $(cat .env | xargs)
./gradlew bootRun

# 운영 환경 실행
export SPRING_PROFILES_ACTIVE=prod
export $(cat .env | xargs)
./gradlew bootRun
```

---

## 🚀 CI/CD 파이프라인 예시

GitHub Actions를 사용한 배포 자동화 예시입니다.

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up JDK 17
        uses: actions/setup-java@v3
        with:
          java-version: '17'
          
      - name: Build with Gradle
        run: ./gradlew build
        env:
          SPRING_PROFILES_ACTIVE: prod
          SPRING_DATASOURCE_URL: ${{ secrets.PROD_DB_URL }}
          SPRING_DATASOURCE_USERNAME: ${{ secrets.PROD_DB_USERNAME }}
          SPRING_DATASOURCE_PASSWORD: ${{ secrets.PROD_DB_PASSWORD }}
          JWT_SECRET: ${{ secrets.PROD_JWT_SECRET }}
          OAUTH2_GOOGLE_CLIENT_ID: ${{ secrets.PROD_GOOGLE_CLIENT_ID }}
          OAUTH2_GOOGLE_CLIENT_SECRET: ${{ secrets.PROD_GOOGLE_CLIENT_SECRET }}
          OAUTH2_KAKAO_CLIENT_ID: ${{ secrets.PROD_KAKAO_CLIENT_ID }}
          OAUTH2_KAKAO_CLIENT_SECRET: ${{ secrets.PROD_KAKAO_CLIENT_SECRET }}
```
