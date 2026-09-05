create table public.foods (
  id text primary key,
  number text not null unique,
  name text not null,
  japanese_name text not null,
  category text not null,
  description text not null,
  emoji text not null,
  color text not null
);

alter table public.foods enable row level security;

create policy "Foods are publicly readable"
  on public.foods
  for select
  using (true);

insert into public.foods (id, number, name, japanese_name, category, description, emoji, color)
values
  ('ramen', '001', 'Ramen', 'ラーメン', 'Noodles', 'A comforting bowl of noodles in a rich, savoury broth.', '🍜', '#e8c4a5'),
  ('sushi', '002', 'Sushi', '寿司', 'Seafood', 'Vinegared rice paired with fresh fish, vegetables, or egg.', '🍣', '#f1c1b3'),
  ('okonomiyaki', '003', 'Okonomiyaki', 'お好み焼き', 'Street food', 'A savoury cabbage pancake topped with sauce and bonito.', '🥞', '#d4c49e'),
  ('onigiri', '004', 'Onigiri', 'おにぎり', 'Snacks', 'Hand-shaped rice triangles, often wrapped in crisp nori.', '🍙', '#c6d8bd'),
  ('takoyaki', '005', 'Takoyaki', 'たこ焼き', 'Street food', 'Golden batter balls filled with tender pieces of octopus.', '🐙', '#e4bf9b'),
  ('matcha', '006', 'Matcha parfait', '抹茶パフェ', 'Sweets', 'Layered green tea dessert with cream, jelly, and mochi.', '🍵', '#c4d0ad');
