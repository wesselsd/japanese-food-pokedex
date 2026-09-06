alter table public.user_foods
  add column if not exists rating integer,
  add column if not exists location text;

alter table public.user_foods
  add constraint user_foods_rating_check check (rating is null or rating between 1 and 5);

create table public.user_food_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  food_id text not null,
  eaten_at timestamptz not null default now(),
  rating integer not null check (rating between 1 and 5),
  location text
);

alter table public.user_food_checkins enable row level security;
create policy "Users can read their own food check-ins" on public.user_food_checkins for select using ((select auth.uid()) = user_id);
create policy "Users can insert their own food check-ins" on public.user_food_checkins for insert with check ((select auth.uid()) = user_id);
create policy "Users can update their own food check-ins" on public.user_food_checkins for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can delete their own food check-ins" on public.user_food_checkins for delete using ((select auth.uid()) = user_id);

insert into public.user_food_checkins (user_id, food_id, eaten_at, rating, location)
select user_id, food_id, eaten_at, coalesce(rating, 5), location
from public.user_foods
on conflict do nothing;
