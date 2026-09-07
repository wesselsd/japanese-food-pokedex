alter table public.user_food_photos
  add column if not exists is_selected boolean not null default false;

create unique index if not exists user_food_photos_one_selected_per_food
  on public.user_food_photos (user_id, food_id)
  where is_selected;

create policy "Users can update their food photos"
  on public.user_food_photos for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop table if exists public.user_foods;
