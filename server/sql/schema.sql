create extension if not exists pgcrypto;

create table if not exists assessment_collections (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  grade text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (subject, grade)
);

create table if not exists assessment_versions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references assessment_collections(id) on delete cascade,
  version_number integer not null,
  status text not null check (status in ('draft', 'published')),
  payload jsonb not null,
  created_by text,
  created_at timestamptz not null default now(),
  published_at timestamptz,
  unique (assessment_id, version_number)
);

create table if not exists student_attempts (
  id uuid primary key default gen_random_uuid(),
  assessment_version_id uuid references assessment_versions(id) on delete set null,
  subject text not null,
  grade text not null,
  student_profile jsonb not null,
  responses jsonb not null,
  score_summary jsonb,
  submitted_at timestamptz not null default now()
);

create index if not exists idx_assessment_versions_lookup
  on assessment_versions (assessment_id, status, created_at desc);

create index if not exists idx_student_attempts_lookup
  on student_attempts (subject, grade, submitted_at desc);