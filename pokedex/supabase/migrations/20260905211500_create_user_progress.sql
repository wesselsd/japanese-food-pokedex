create table public.user_foods (
  user_id uuid references auth.users(id) on delete cascade not null,
  food_id text references public.foods(id) on delete cascade not null,
  eaten_at timestamptz not null default now(),
  photo_path text,
  primary key (user_id, food_id)
);

alter table public.user_foods enable row level security;

create policy "Users can read their own food progress"
  on public.user_foods for select
  using ((select auth.uid()) = user_id);

create policy "Users can insert their own food progress"
  on public.user_foods for insert
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own food progress"
  on public.user_foods for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own food progress"
  on public.user_foods for delete
  using ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public)
values ('food-photos', 'food-photos', false)
on conflict (id) do nothing;

create policy "Users can read their own food photos"
  on storage.objects for select
  using (bucket_id = 'food-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Users can upload their own food photos"
  on storage.objects for insert
  with check (bucket_id = 'food-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Users can update their own food photos"
  on storage.objects for update
  using (bucket_id = 'food-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
