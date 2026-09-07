alter table public.user_food_photos
  add column if not exists is_selected boolean not null default false;

create unique index if not exists user_food_photos_one_selected_per_food
  on public.user_food_photos (user_id, food_id)
  where is_selected;

create policy "Users can update their food photos"
  on public.user_food_photos for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

insert into public.user_food_checkins (user_id, food_id, eaten_at, rating, location)
select legacy.user_id,
       legacy.food_id,
       legacy.eaten_at,
       coalesce(legacy.rating, 5),
       legacy.location
from public.user_foods as legacy
where not exists (
  select 1
  from public.user_food_checkins as checkin
  where checkin.user_id = legacy.user_id
    and checkin.food_id = legacy.food_id
    and checkin.eaten_at = legacy.eaten_at
);

insert into public.user_food_photos (user_id, food_id, photo_path, is_selected)
select legacy.user_id,
       legacy.food_id,
       legacy.photo_path,
       false
from public.user_foods as legacy
where legacy.photo_path is not null
  and not exists (
    select 1
    from public.user_food_photos as photo
    where photo.user_id = legacy.user_id
      and photo.food_id = legacy.food_id
      and photo.photo_path = legacy.photo_path
  );

update public.user_food_photos as photo
set is_selected = (
  legacy.selected_photo_id is not null
  and (
    legacy.selected_photo_id = photo.id::text
    or legacy.selected_photo_id = photo.photo_path
  )
)
from public.user_foods as legacy
where photo.user_id = legacy.user_id
  and photo.food_id = legacy.food_id;

drop table if exists public.user_foods;
