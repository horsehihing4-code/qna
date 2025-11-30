# Firebase 연동 가이드

## 📋 단계별 설정 가이드

### 1단계: Firebase 프로젝트 생성

1. **Firebase 콘솔 접속**
   - https://console.firebase.google.com/ 접속
   - Google 계정으로 로그인

2. **프로젝트 추가**
   - "프로젝트 추가" 클릭
   - 프로젝트 이름 입력 (예: "highschool-qna")
   - Google Analytics 설정 (선택사항)
   - "프로젝트 만들기" 클릭

3. **프로젝트 생성 완료 대기**
   - 약 1-2분 소요

---

### 2단계: Firestore 데이터베이스 생성

1. **Firestore Database 생성**
   - Firebase 콘솔에서 왼쪽 메뉴에서 "Firestore Database" 클릭
   - "데이터베이스 만들기" 클릭

2. **보안 규칙 설정**
   - **테스트 모드로 시작** 선택 (개발 단계)
   - 위치 선택: `asia-northeast3` (서울) 또는 `us-central` (미국)
   - "사용 설정" 클릭

3. **보안 규칙 확인**
   - Firestore Database 페이지로 이동
   - "규칙" 탭 클릭
   - 다음 규칙이 설정되어 있는지 확인:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if true;
       }
     }
   }
   ```
   ⚠️ **주의**: 이 규칙은 모든 사용자가 읽기/쓰기 가능합니다. 프로덕션에서는 인증을 추가해야 합니다.

---

### 3단계: 웹 앱 등록

1. **웹 앱 추가**
   - Firebase 콘솔에서 프로젝트 개요 페이지로 이동
   - 왼쪽 상단의 톱니바퀴 아이콘 클릭 → "프로젝트 설정"
   - 아래로 스크롤하여 "내 앱" 섹션에서 `</>` (웹) 아이콘 클릭

2. **앱 등록**
   - 앱 닉네임 입력 (예: "QnA Web App")
   - "Firebase Hosting도 설정" 체크 해제 (GitHub Pages 사용 중이므로)
   - "앱 등록" 클릭

3. **Firebase 설정 정보 복사**
   - 다음 화면에서 `firebaseConfig` 객체가 표시됩니다
   - 예시:
     ```javascript
     const firebaseConfig = {
       apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
       authDomain: "your-project-id.firebaseapp.com",
       projectId: "your-project-id",
       storageBucket: "your-project-id.appspot.com",
       messagingSenderId: "123456789012",
       appId: "1:123456789012:web:abcdef123456"
     };
     ```
   - 이 정보를 복사해두세요 (다음 단계에서 사용)

---

### 4단계: Firebase 설정 파일 수정

1. **firebase-config.js 파일 열기**
   - 프로젝트 루트에 있는 `firebase-config.js` 파일을 엽니다
   - 현재는 예시 값(`YOUR_API_KEY_HERE` 등)이 들어있습니다

2. **실제 설정 값으로 교체**
   - 3단계에서 복사한 Firebase 설정 정보를 붙여넣습니다
   - `YOUR_API_KEY_HERE` → 실제 apiKey 값
   - `YOUR_PROJECT_ID` → 실제 projectId 값
   - 나머지 값들도 모두 실제 값으로 교체합니다

3. **최종 파일 예시**
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
     authDomain: "highschool-qna.firebaseapp.com",
     projectId: "highschool-qna",
     storageBucket: "highschool-qna.appspot.com",
     messagingSenderId: "123456789012",
     appId: "1:123456789012:web:abcdef123456"
   };
   ```

4. **파일 저장**
   - 수정한 파일을 저장합니다

---

### 5단계: 코드 확인 (이미 완료됨)

✅ **코드는 이미 수정되어 있습니다!**

다음 파일들이 Firebase를 사용하도록 업데이트되었습니다:
- `index.html`: Firebase SDK 추가됨
- `script.js`: Firestore를 사용하도록 변경됨
- `firebase-config.js`: 설정 파일 생성됨

**추가 작업 불필요**: 코드는 이미 준비되어 있으므로, 4단계에서 `firebase-config.js`만 수정하면 됩니다.

---

### 6단계: GitHub에 푸시 및 배포

1. **변경된 파일 확인**
   - `firebase-config.js` 파일이 수정되었는지 확인
   - 다른 파일들(`index.html`, `script.js`)도 확인

2. **Git에 추가 및 커밋**
   ```bash
   git add firebase-config.js index.html script.js FIREBASE_SETUP.md
   git commit -m "Firebase Firestore 연동 추가"
   git push origin main
   ```

3. **배포 확인**
   - GitHub Pages에서 자동으로 배포됩니다 (약 1-2분 소요)
   - 배포 완료 후 사이트 접속
   - 질문을 작성하여 Firebase에 저장되는지 확인

4. **Firebase 콘솔에서 데이터 확인**
   - Firebase 콘솔 → Firestore Database → 데이터 탭
   - `questions` 컬렉션이 생성되고 데이터가 저장되는지 확인
   - 구조: `questions/{subjectId}/items/{questionId}`

---

### 7단계: 데이터 확인

1. **Firebase 콘솔에서 확인**
   - Firestore Database → 데이터 탭
   - `questions` 컬렉션이 생성되고 데이터가 저장되는지 확인

---

## 🔒 보안 규칙 (프로덕션용)

프로덕션 환경에서는 다음 규칙을 사용하세요:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /questions/{subjectId}/{document=**} {
      allow read: if true;
      allow write: if request.auth != null; // 인증된 사용자만 쓰기 가능
    }
  }
}
```

---

## 🐛 문제 해결

### 문제: "Firebase: Error (auth/unauthorized-domain)"
- **원인**: GitHub Pages 도메인이 Firebase 승인된 도메인에 등록되지 않음
- **해결**: 
  1. Firebase 콘솔 → 인증 → 설정 → 승인된 도메인
  2. "도메인 추가" 클릭
  3. GitHub Pages 도메인 추가 (예: `username.github.io`)

### 문제: "Firebase: Error (permission-denied)"
- **원인**: Firestore 보안 규칙이 읽기/쓰기를 허용하지 않음
- **해결**: 
  1. Firebase 콘솔 → Firestore Database → 규칙 탭
  2. 다음 규칙이 있는지 확인:
     ```
     rules_version = '2';
     service cloud.firestore {
       match /databases/{database}/documents {
         match /{document=**} {
           allow read, write: if true;
         }
       }
     }
     ```
  3. "게시" 버튼 클릭

### 문제: 데이터가 저장되지 않음
- **원인**: `firebase-config.js` 파일의 설정 값이 잘못됨
- **해결**: 
  1. 브라우저 개발자 도구(F12) → 콘솔 탭에서 오류 확인
  2. `firebase-config.js` 파일의 모든 값이 올바른지 확인
  3. Firebase 콘솔에서 설정 정보를 다시 복사하여 붙여넣기

### 문제: "firebase is not defined"
- **원인**: Firebase SDK가 로드되지 않음
- **해결**: 
  1. 인터넷 연결 확인
  2. 브라우저 개발자 도구 → 네트워크 탭에서 Firebase SDK 로드 확인
  3. `index.html`의 Firebase SDK 스크립트 태그 확인

### 문제: 실시간 업데이트가 작동하지 않음
- **원인**: Firestore 실시간 리스너 설정 오류
- **해결**: 
  1. 브라우저 콘솔에서 오류 확인
  2. Firestore 보안 규칙 확인
  3. 페이지 새로고침

## 📝 추가 참고사항

### 데이터 구조
Firestore의 데이터 구조는 다음과 같습니다:
```
questions/
  ├── korean/
  │   └── items/
  │       └── {questionId}/
  │           ├── title: "질문 제목"
  │           ├── content: "질문 내용"
  │           ├── createdAt: Timestamp
  │           └── answers: [
  │                 {
  │                   id: "답변ID",
  │                   content: "답변 내용",
  │                   createdAt: Timestamp
  │                 }
  │               ]
  ├── english/
  ├── math/
  └── science/
```

### 실시간 동기화
- Firestore는 실시간으로 데이터를 동기화합니다
- 한 사용자가 질문을 작성하면 다른 사용자도 즉시 볼 수 있습니다
- 페이지 새로고침 없이도 자동으로 업데이트됩니다

