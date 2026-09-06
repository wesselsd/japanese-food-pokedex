alter table public.user_food_checkins
  add column if not exists location_details jsonb;
