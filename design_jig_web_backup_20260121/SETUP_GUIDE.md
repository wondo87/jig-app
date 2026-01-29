# 디자인지그 외부 서비스 연동 가이드

이 문서는 Cloudinary, Notion, Google Sheets 연동 방법을 안내합니다.

---

## 📷 1. Cloudinary 설정 (이미지 저장)

### 1-1. 회원가입
1. https://cloudinary.com 접속
2. "Sign Up For Free" 클릭
3. 이메일로 가입 (Google 계정 연동 가능)

### 1-2. Cloud Name 확인
1. 로그인 후 Dashboard 이동
2. 상단에 표시된 **Cloud Name** 확인 (예: `dab1234xyz`)

### 1-3. 이미지 업로드
1. 좌측 메뉴 → **Media Library**
2. **Upload** 버튼 클릭
3. 이미지 드래그 앤 드롭

### 1-4. 이미지 URL 복사
업로드 후 이미지 클릭 → URL 복사

```
기본 URL 형식:
https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/파일명.jpg

최적화 URL (권장):
https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/w_800,q_auto/파일명.jpg
```

**URL 옵션:**
- `w_800` : 가로 800px로 리사이즈
- `q_auto` : 품질 자동 최적화
- `f_auto` : 포맷 자동 변환 (WebP 등)

---

## 📝 2. 칼럼 관리 (columns-data.json)

### 칼럼 추가 방법

`columns-data.json` 파일을 열고 `posts` 배열에 새 항목 추가:

```json
{
    "id": 4,
    "title": "새 칼럼 제목",
    "date": "2024-12-25",
    "thumbnail": "https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/썸네일.jpg",
    "summary": "칼럼 요약 (2줄 정도)",
    "tag": "카테고리",
    "content": "<p>본문 내용</p><h2>소제목</h2><p>내용...</p>"
}
```

### content 작성 팁

HTML 태그 사용 가능:
- `<p>문단</p>` : 일반 텍스트
- `<h2>제목</h2>` : 소제목
- `<h3>제목</h3>` : 소소제목
- `<strong>굵게</strong>` : 강조
- `<br>` : 줄바꿈
- `<img src="URL">` : 이미지 삽입
- `<pre><code>코드</code></pre>` : 코드 블록

### 예시

```json
{
    "id": 5,
    "title": "욕실 타일 선택 가이드",
    "date": "2024-12-28",
    "thumbnail": "https://res.cloudinary.com/designjig/image/upload/w_600/bathroom_tile.jpg",
    "summary": "욕실 타일 종류별 장단점과 관리 방법을 알려드립니다.",
    "tag": "자재안내",
    "content": "<p>욕실 타일은 방수성과 내구성이 중요합니다.</p><h2>포세린 타일</h2><p>흡수율 0.5% 미만으로 방수에 강합니다.</p><img src='https://res.cloudinary.com/designjig/image/upload/w_800/porcelain.jpg'><h2>세라믹 타일</h2><p>가격이 저렴하고 다양한 디자인이 있습니다.</p>"
}
```

---

## 🖼️ 3. 포트폴리오 관리 (portfolio-data.json)

### 프로젝트 추가 방법

`portfolio-data.json` 파일을 열고 `projects` 배열에 새 항목 추가:

```json
{
    "id": 4,
    "title": "프로젝트 이름",
    "category": "apartment",
    "location": "용인시 수지구",
    "size": "32평",
    "duration": "6주",
    "year": "2024",
    "description": "프로젝트 설명...",
    "thumbnail": "https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/w_800/메인이미지.jpg",
    "images": [
        "https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/w_1200/이미지1.jpg",
        "https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/w_1200/이미지2.jpg",
        "https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/w_1200/이미지3.jpg"
    ]
}
```

### category 값
- `apartment` : 아파트
- `villa` : 빌라/주택
- `partial` : 부분 시공

---

## 📊 4. Google Sheets 연동 (고객/견적 관리)

### 4-1. 스프레드시트 생성
1. https://sheets.google.com 접속
2. 새 스프레드시트 생성
3. 시트 이름 설정:
   - `고객관리`
   - `견적서`
   - `계약서`

### 4-2. 고객관리 시트 열 구성
| A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|
| ID | 이름 | 연락처 | 이메일 | 주소 | 상태 | 메모 | 등록일 |

### 4-3. 견적서 시트 열 구성
| A | B | C | D | E | F | G |
|---|---|---|---|---|---|---|
| ID | 고객ID | 공종 | 품목 | 수량 | 단가 | 금액 |

### 4-4. API 연동 (선택사항)
완전한 양방향 연동을 원하시면 Google Apps Script 또는 서버 설정이 필요합니다.
현재는 관리자 페이지에서 JSON 내보내기/불러오기로 데이터 관리가 가능합니다.

---

## 🔄 5. 작업 흐름 요약

### 칼럼 작성
```
1. Cloudinary에 이미지 업로드 → URL 복사
2. columns-data.json에 새 항목 추가
3. GitHub에 커밋 & 푸시
4. 자동 배포 완료
```

### 포트폴리오 추가
```
1. Cloudinary에 프로젝트 이미지들 업로드
2. portfolio-data.json에 새 프로젝트 추가
3. GitHub에 커밋 & 푸시
4. 자동 배포 완료
```

### 고객/견적 관리
```
1. designjig.com/adminwonpro 접속
2. 비밀번호 입력 (Dufan170531!@)
3. 고객 등록, 견적서 작성
4. 필요 시 JSON 내보내기로 백업
```

---

## ❓ FAQ

### Q: 이미지가 안 보여요
A: Cloudinary URL이 정확한지 확인하세요. `YOUR_CLOUD_NAME` 부분이 실제 Cloud Name으로 교체되어야 합니다.

### Q: 칼럼이 안 나와요
A: `columns-data.json` 파일의 JSON 형식이 올바른지 확인하세요. 쉼표, 따옴표 등 오타가 있으면 오류가 발생합니다.

### Q: 코드를 수정했는데 데이터가 사라졌어요
A: 외부 서비스(Cloudinary, Google Sheets)의 데이터는 안전합니다. JSON 파일만 복원하면 됩니다.

---

## 📞 도움이 필요하면

Claude에게 질문하세요:
- "칼럼 데이터 추가해줘"
- "포트폴리오 JSON 만들어줘"
- "Cloudinary 설정 도와줘"
