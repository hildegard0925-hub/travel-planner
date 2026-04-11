-- =============================================
-- 여행 플래너 DB 스키마
-- Supabase SQL Editor에 붙여넣고 실행
-- =============================================

-- 여행 테이블
create table trips (
  id uuid primary key default gen_random_uuid(),
  title text not null,                        -- 여행 이름 (예: 2025 후쿠오카)
  destination text not null,                  -- 목적지
  start_date date not null,
  end_date date not null,
  currency text not null default 'JPY',       -- 현지 통화 코드
  exchange_rate numeric(10, 2) default 1,     -- 1 현지통화 = ? 원
  budget_krw integer default 0,               -- 총 예산 (원)
  thumbnail_url text,
  memo text,
  created_at timestamptz default now()
);

-- 일정 항목 테이블
create table schedules (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade not null,
  day_index integer not null,                 -- 0 = 1일차
  start_time time,
  end_time time,
  title text not null,                        -- 장소명 / 활동명
  category text default 'activity',           -- food / transport / shopping / activity / lodging / etc
  place_id text,                              -- Google Places ID
  address text,
  lat numeric(10, 7),
  lng numeric(10, 7),
  cost_local numeric(12, 2) default 0,        -- 현지 통화 금액
  cost_krw integer default 0,                 -- 원화 금액
  payment_method text default 'card',         -- card / cash
  transport text,                             -- 도보 / 지하철 / 버스 / 택시 / 자차
  transport_minutes integer,                  -- 이동 시간 (분)
  memo text,
  is_done boolean default false,              -- 여행 중 완료 체크
  created_at timestamptz default now()
);

-- 준비물 테이블
create table checklists (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade not null,
  category text not null default '기타',      -- 짐 / 서류 / 의류 / 세면도구 / 기타
  item text not null,
  is_checked boolean default false,
  created_at timestamptz default now()
);

-- =============================================
-- 인덱스
-- =============================================
create index on schedules(trip_id, day_index, start_time);
create index on checklists(trip_id, category);

alter table schedules
add column description text;
