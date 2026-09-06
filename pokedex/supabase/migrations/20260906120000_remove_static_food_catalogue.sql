alter table public.user_foods
  drop constraint if exists user_foods_food_id_fkey;

drop table if exists public.foods;
