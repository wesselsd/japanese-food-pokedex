alter table public.user_foods
  add column if not exists selected_photo_id text;

create table if not exists public.user_food_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  food_id text not null,
  photo_path text not null,
  created_at timestamptz not null default now()
);

alter table public.user_food_photos enable row level security;

create policy "Users can view their food photos"
  on public.user_food_photos for select
  using (auth.uid() = user_id);

create policy "Users can add their food photos"
  on public.user_food_photos for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their food photos"
  on public.user_food_photos for delete
  using (auth.uid() = user_id);

create policy "Users can delete their stored food photos"
  on storage.objects for delete
  using (bucket_id = 'food-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
