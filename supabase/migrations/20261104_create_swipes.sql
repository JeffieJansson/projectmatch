-- Every swipe (right and left) a user makes in Explore.
-- Used to hide already-swiped projects, independently of the interests table
-- (whose rows are deleted when the project owner matches or dismisses).

create table if not exists public.swipes (
  user_id    uuid        not null references auth.users (id)      on delete cascade,
  project_id uuid        not null references public.projects (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint swipes_user_project_unique primary key (user_id, project_id)
);

-- ── Row Level Security: users may only read and create their own rows ──────
alter table public.swipes enable row level security;

create policy "Users can read their own swipes"
  on public.swipes for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can create their own swipes"
  on public.swipes for insert
  to authenticated
  with check (auth.uid() = user_id);

-- No update/delete policies: with RLS enabled those operations are denied.

-- ── Backfill: projects users have already swiped right on ─────────────────
-- Pending requests still in interests…
insert into public.swipes (user_id, project_id, created_at)
select user_id, project_id, created_at
from public.interests
on conflict (user_id, project_id) do nothing;

-- …and requests that were already accepted (interest row deleted, match remains).
insert into public.swipes (user_id, project_id, created_at)
select requester_id, project_id, created_at
from public.matches
on conflict (user_id, project_id) do nothing;
