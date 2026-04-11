# ✈️ 여행 플래너

개인 여행 계획 & 기록 웹앱. PC + 모바일 브라우저 동일 URL로 사용.

## 기술 스택

| 역할 | 기술 |
|------|------|
| 프론트엔드 | React 18 + Vite |
| DB / 실시간 | Supabase (PostgreSQL) |
| 지도 | Google Maps API |
| 배포 | Vercel (무료) |

---

## 🚀 시작 방법

### 1. 프로젝트 설치

```bash
npm install
```

### 2. Supabase 설정

1. [supabase.com](https://supabase.com) 에서 새 프로젝트 생성
2. **SQL Editor** 에서 `supabase/schema.sql` 파일 내용 전체 실행
3. **Settings → API** 에서 URL과 anon key 복사

### 3. Google Maps API 설정

1. [Google Cloud Console](https://console.cloud.google.com) 접속
2. 새 프로젝트 생성 후 **Maps JavaScript API**, **Places API** 활성화
3. 사용자 인증 정보 → API 키 생성 (HTTP 리퍼러 제한 권장)

### 4. 환경변수 설정

```bash
cp .env.example .env.local
```

`.env.local` 파일을 열어 값 입력:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_GOOGLE_MAPS_API_KEY=AIza...
```

### 5. 로컬 실행

```bash
npm run dev
```

→ `http://localhost:5173` 에서 확인

---

## 📱 Vercel 배포 (PC + 모바일 동시 접속)

```bash
npm install -g vercel
vercel
```

배포 후 Vercel 대시보드 → **Environment Variables** 에서 `.env.local` 값 동일하게 입력.

이후 `vercel --prod` 로 배포하면 어디서든 접속 가능한 URL 생성.

---

## 📂 파일 구조

```
src/
├── pages/
│   ├── Home.jsx          # 여행 목록 (홈)
│   ├── TripDetail.jsx    # 일차별 타임라인
│   ├── MapView.jsx       # 지도 + GPS
│   ├── CostSummary.jsx   # 비용 정산
│   └── Checklist.jsx     # 준비물
├── components/
│   ├── Layout.jsx         # 하단 네비게이션
│   └── AddScheduleModal.jsx  # 일정 추가/수정 모달
├── hooks/
│   ├── useTrips.js        # 여행 CRUD
│   ├── useSchedules.js    # 일정 CRUD
│   └── useGeolocation.js  # GPS
└── lib/
    └── supabase.js        # DB 클라이언트
```

---

## 💡 주요 기능

- **여행 관리**: 여행별 통화·환율·예산 설정
- **일정 타임라인**: 시간/장소/비용/이동수단/카드·현금 기록
- **장소 검색**: Google Places 자동완성으로 장소 추가 → 좌표 자동 저장
- **지도 뷰**: 일정 핀 표시, GPS 현재 위치 추적, 일차별 필터
- **비용 정산**: 카테고리·일자별 차트, 예산 대비 현황
- **준비물 체크리스트**: 기본 항목 불러오기, 카테고리별 관리

여행 목록 화면
→ Home.jsx
여행 데이터 저장 / 삭제
→ useTrips.js
일정 화면
→ TripDetail.jsx
일정 추가 / 수정 / 삭제
→ useSchedules.js
일정 입력 창
→ AddScheduleModal.jsx
지도 표시
→ MapView.jsx
비용 계산
→ CostSummary.jsx
준비물 목록
→ Checklist.jsx
DB 연결
→ supabase.js

앞으로 파일 위치 찾는 공식 (이게 제일 중요)
이 규칙 하나만 기억하면 됩니다.

화면 → pages
동작 → hooks
작은 UI → components
외부 연결 → lib

예:
버튼 보인다
→ pages
버튼 누르면 저장
→ hooks
팝업 창
→ components
DB 연결
→ lib

예: 삭제 기능 추가
생각 순서:
삭제 버튼은 어디에 보이지?
→ 일정 화면
그 화면 파일?
→ TripDetail.jsx
실제 삭제는 누가 하지?
→ useSchedules.js