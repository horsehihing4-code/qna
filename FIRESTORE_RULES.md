# Firestore 보안 규칙 가이드

## 📋 Firestore 보안 규칙 작성 방법

### 1단계: Firebase 콘솔 접속

1. Firebase 콘솔 접속: https://console.firebase.google.com/
2. 프로젝트 선택
3. 왼쪽 메뉴에서 **"Firestore Database"** 클릭
4. 상단 탭에서 **"규칙"** 클릭

---

## 🔒 보안 규칙 옵션

### 옵션 1: 테스트 모드 (개발용) ⚠️

**모든 사용자가 읽기/쓰기 가능**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

**사용 시기**: 개발 및 테스트 단계
**주의**: 프로덕션에서는 사용하지 마세요!

---

### 옵션 2: 공개 읽기, 제한된 쓰기 (권장) ✅

**모든 사용자가 읽기 가능, 쓰기는 제한적**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // questions 컬렉션 규칙
    match /questions/{subjectId}/items/{questionId} {
      // 모든 사용자가 읽기 가능
      allow read: if true;
      
      // 쓰기는 제한적 (데이터 검증 포함)
      allow create: if request.resource.data.keys().hasAll(['title', 'content', 'createdAt', 'answers'])
                    && request.resource.data.title is string
                    && request.resource.data.title.size() > 0
                    && request.resource.data.title.size() <= 200
                    && request.resource.data.content is string
                    && request.resource.data.content.size() > 0
                    && request.resource.data.content.size() <= 5000
                    && request.resource.data.answers is list;
      
      // 업데이트는 답변 추가만 허용
      allow update: if request.resource.data.diff(resource.data).affectedKeys().hasOnly(['answers'])
                     && request.resource.data.answers.size() > resource.data.answers.size();
      
      // 삭제는 허용하지 않음
      allow delete: if false;
    }
  }
}
```

**사용 시기**: 프로덕션 환경
**장점**: 
- 모든 사용자가 질문/답변을 읽을 수 있음
- 데이터 무결성 보장 (크기 제한, 필수 필드 검증)
- 악의적인 삭제 방지

---

### 옵션 3: 시간 기반 제한 (고급)

**특정 시간대에만 쓰기 허용**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /questions/{subjectId}/items/{questionId} {
      allow read: if true;
      
      // 오전 9시부터 오후 10시까지만 쓰기 허용
      allow write: if request.time.hour >= 9 && request.time.hour < 22
                   && request.resource.data.keys().hasAll(['title', 'content', 'createdAt', 'answers']);
    }
  }
}
```

---

### 옵션 4: 인증 기반 (가장 안전) 🔐

**로그인한 사용자만 쓰기 가능**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /questions/{subjectId}/items/{questionId} {
      // 모든 사용자가 읽기 가능
      allow read: if true;
      
      // 인증된 사용자만 쓰기 가능
      allow write: if request.auth != null
                   && request.resource.data.keys().hasAll(['title', 'content', 'createdAt', 'answers']);
    }
  }
}
```

**사용 시기**: 사용자 인증 기능이 추가된 경우
**주의**: 이 규칙을 사용하려면 Firebase Authentication을 설정해야 합니다.

---

## 📝 규칙 적용 방법

### 1. 규칙 작성
- Firebase 콘솔 → Firestore Database → 규칙 탭
- 위의 규칙 중 하나를 선택하여 붙여넣기

### 2. 규칙 검증
- "시뮬레이션" 버튼을 클릭하여 규칙 테스트
- 또는 "게시" 버튼을 클릭하여 바로 적용

### 3. 규칙 게시
- "게시" 버튼 클릭
- 확인 메시지에서 "게시" 클릭

---

## 🎯 권장 설정

### 개발 단계
→ **옵션 1 (테스트 모드)** 사용

### 프로덕션 단계
→ **옵션 2 (공개 읽기, 제한된 쓰기)** 사용

---

## ⚠️ 주의사항

1. **테스트 모드 규칙은 프로덕션에서 사용하지 마세요**
   - 모든 사용자가 데이터를 삭제하거나 수정할 수 있습니다
   - 비용이 예상보다 많이 발생할 수 있습니다

2. **규칙 변경 후 테스트**
   - 규칙을 변경한 후 반드시 테스트하세요
   - 브라우저 콘솔에서 오류를 확인하세요

3. **데이터 백업**
   - 규칙을 변경하기 전에 데이터를 백업하세요
   - 잘못된 규칙으로 인해 데이터에 접근하지 못할 수 있습니다

---

## 🔍 규칙 디버깅

### 규칙이 작동하지 않을 때

1. **브라우저 콘솔 확인**
   - F12 → Console 탭
   - 오류 메시지 확인

2. **Firebase 콘솔 로그 확인**
   - Firebase 콘솔 → Firestore Database → 사용량 탭
   - 거부된 요청 확인

3. **규칙 시뮬레이션 사용**
   - 규칙 탭 → 시뮬레이션
   - 다양한 시나리오 테스트

---

## 📚 추가 리소스

- [Firestore 보안 규칙 공식 문서](https://firebase.google.com/docs/firestore/security/get-started)
- [규칙 언어 참조](https://firebase.google.com/docs/reference/rules/rules-language-reference)

