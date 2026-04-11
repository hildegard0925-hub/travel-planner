-- =============================================
-- 기록 테이블 추가 마이그레이션
-- Supabase SQL Editor에서 실행
-- =============================================

create table records (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade not null,
  schedule_id uuid references schedules(id) on delete set null, -- 원본 일정 참조
  day_index integer not null default 0,
  title text not null,
  category text default 'activity',
  description text,
  address text,
  lat numeric(10, 7),
  lng numeric(10, 7),
  cost_local numeric(12, 2) default 0,
  cost_krw integer default 0,
  payment_method text default 'card',
  photo_url text,                          -- Supabase Storage URL
  actual_datetime timestamptz,             -- EXIF에서 읽은 실제 촬영 시각
  memo text,
  created_at timestamptz default now()
);

create index on records(trip_id, day_index);
create index on records(schedule_id);

-- =============================================
-- Supabase Storage 버킷 생성 (대시보드에서도 가능)
-- Storage → New bucket → 이름: record-photos → Public 체크
-- =============================================

-- Storage 정책 (record-photos 버킷 public 설정 후)
-- insert policy: allow all (개인 앱이므로 간단하게)
-- select policy: allow all (public bucket이면 불필요)
