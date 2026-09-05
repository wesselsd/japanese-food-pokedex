alter table public.foods
  alter column category type text[]
  using array[category];

alter table public.foods rename column category to categories;

update public.foods
set categories = case id
  when 'ramen' then array['Noodles']
  when 'sushi' then array['Seafood', 'Rice']
  when 'okonomiyaki' then array['Street food', 'Snacks']
  when 'onigiri' then array['Rice', 'Snacks']
  when 'takoyaki' then array['Seafood', 'Street food', 'Snacks']
  when 'matcha' then array['Desserts', 'Sweets']
end;

insert into public.foods (id, number, name, japanese_name, categories, description, emoji, color)
values
  ('soba', '007', 'Soba', 'そば', array['Noodles'], 'Nutty buckwheat noodles served hot or cold.', '🍜', '#d4b99d'),
  ('udon', '008', 'Udon', 'うどん', array['Noodles'], 'Thick, chewy wheat noodles in a delicate broth.', '🍲', '#e9d8bb'),
  ('tsukemen', '009', 'Tsukemen', 'つけ麺', array['Noodles'], 'Ramen noodles served separately with a concentrated dipping broth.', '🥢', '#d9b78c'),
  ('hiyashi-chuka', '010', 'Hiyashi chuka', '冷やし中華', array['Noodles', 'Summer'], 'Chilled ramen noodles with colourful toppings and dressing.', '🥗', '#e7cf9d'),
  ('tempura', '011', 'Tempura', '天ぷら', array['Seafood', 'Fried'], 'Seafood and vegetables coated in a light, crisp batter.', '🍤', '#f0c88f'),
  ('tonkatsu', '012', 'Tonkatsu', 'とんかつ', array['Meat', 'Fried'], 'A breaded and fried pork cutlet served with tangy sauce.', '🥩', '#d69b78'),
  ('karaage', '013', 'Karaage', 'からあげ', array['Meat', 'Fried', 'Snacks'], 'Japanese-style marinated fried chicken with a crisp coating.', '🍗', '#e3b16d'),
  ('yakitori', '014', 'Yakitori', '焼き鳥', array['Meat', 'Izakaya', 'Street food'], 'Chicken pieces grilled over charcoal and brushed with tare.', '🍢', '#c98f62'),
  ('chicken-nanban', '015', 'Chicken nanban', 'チキン南蛮', array['Meat', 'Fried'], 'Fried chicken glazed with sweet vinegar and tartar sauce.', '🍗', '#dfad76'),
  ('kushikatsu', '016', 'Kushikatsu', '串カツ', array['Meat', 'Fried', 'Street food'], 'Breaded meat and vegetables fried on skewers.', '🍡', '#d8a36d'),
  ('sukiyaki', '017', 'Sukiyaki', 'すき焼き', array['Meat', 'Hot pot'], 'Thinly sliced beef and vegetables simmered in a sweet soy broth.', '🍲', '#b87558'),
  ('shabu-shabu', '018', 'Shabu-shabu', 'しゃぶしゃぶ', array['Meat', 'Hot pot'], 'Thin slices of meat swished through a bubbling hot pot.', '🥘', '#d9b19a'),
  ('gyutan', '019', 'Gyūtan', '牛タン', array['Meat', 'Grilled'], 'Thinly sliced grilled beef tongue, especially associated with Sendai.', '🥩', '#c48b72'),
  ('motsunabe', '020', 'Motsunabe', 'もつ鍋', array['Meat', 'Hot pot'], 'Fukuoka-style hot pot with offal, cabbage, and garlic chives.', '🍲', '#a9b98a'),
  ('katsudon', '021', 'Katsudon', 'カツ丼', array['Rice', 'Meat', 'Fried'], 'Breaded pork cutlet and egg served over a bowl of rice.', '🍚', '#e2c18c'),
  ('gyudon', '022', 'Gyūdon', '牛丼', array['Rice', 'Meat'], 'Thinly sliced beef and onions simmered over steamed rice.', '🍚', '#c99c73'),
  ('oyakodon', '023', 'Oyakodon', '親子丼', array['Rice', 'Meat'], 'Chicken and softly cooked egg served over rice.', '🍳', '#e6c888'),
  ('tendon', '024', 'Tendon', '天丼', array['Rice', 'Seafood', 'Fried'], 'Tempura served over rice with a sweet soy-based sauce.', '🍤', '#e7bd7a'),
  ('kaisendon', '025', 'Kaisendon', '海鮮丼', array['Rice', 'Seafood'], 'A bowl of sushi rice topped with an assortment of sashimi.', '🐟', '#b8d6d7'),
  ('omurice', '026', 'Omurice', 'オムライス', array['Rice', '洋食'], 'Seasoned rice wrapped in a soft omelette and finished with ketchup.', '🍳', '#edc36f'),
  ('ochazuke', '027', 'Ochazuke', 'お茶漬け', array['Rice', 'Snacks'], 'Rice topped with savoury ingredients and covered in green tea.', '🍵', '#c6d1a3'),
  ('takikomi-gohan', '028', 'Takikomi gohan', '炊き込みご飯', array['Rice'], 'Rice cooked together with vegetables, mushrooms, and savoury seasonings.', '🍚', '#c9b58c'),
  ('curry-rice', '029', 'Japanese curry rice', 'カレーライス', array['Curry', 'Rice'], 'A rich, mildly spiced curry served over Japanese rice.', '🍛', '#d19a5b'),
  ('katsu-curry', '030', 'Katsu curry', 'カツカレー', array['Curry', 'Rice', 'Fried'], 'Japanese curry rice topped with a crispy pork cutlet.', '🍛', '#c89055'),
  ('curry-pan', '031', 'Curry pan', 'カレーパン', array['Curry', 'Fried', 'Snacks'], 'A filled bread roll with Japanese curry inside and a crisp crust.', '🥐', '#d9a15d'),
  ('gyoza', '032', 'Gyoza', '餃子', array['Meat', 'Fried', 'Izakaya'], 'Juicy dumplings filled with pork, cabbage, and aromatics.', '🥟', '#d4b184'),
  ('chahan', '033', 'Chahan', 'チャーハン', array['Rice', 'Chinese-Japanese'], 'Japanese-style fried rice with egg, vegetables, and savoury seasonings.', '🍳', '#e2c27e'),
  ('nikuman', '034', 'Nikuman', '肉まん', array['Meat', 'Snacks', 'Convenience store'], 'A fluffy steamed bun filled with seasoned meat.', '🥯', '#e9c9a4'),
  ('shumai', '035', 'Shumai', '焼売', array['Seafood', 'Chinese-Japanese'], 'Steamed open-topped dumplings filled with pork or shrimp.', '🥟', '#dfc4a8'),
  ('edamame', '036', 'Edamame', '枝豆', array['Izakaya', 'Snacks'], 'Young soybeans steamed or boiled in their pods.', '🫛', '#a9c27e'),
  ('agedashi-tofu', '037', 'Agedashi tofu', '揚げ出し豆腐', array['Fried', 'Izakaya'], 'Crisp tofu served in a delicate dashi broth.', '🧈', '#e4d1a7'),
  ('nikujaga', '038', 'Nikujaga', '肉じゃが', array['Meat', 'Home cooking'], 'A comforting stew of meat, potatoes, onions, and sweet soy broth.', '🥔', '#c6a878'),
  ('taiyaki', '039', 'Taiyaki', 'たい焼き', array['Street food', 'Desserts'], 'Fish-shaped cake traditionally filled with sweet red bean paste.', '🐟', '#e3aa68'),
  ('dango', '040', 'Dango', '団子', array['Street food', 'Desserts'], 'Chewy rice-flour dumplings served on a skewer.', '🍡', '#f0d6ac'),
  ('kakigori', '041', 'Kakigori', 'かき氷', array['Street food', 'Desserts'], 'Fluffy shaved ice covered with colourful syrup and toppings.', '🍧', '#b8d9e7'),
  ('mochi', '042', 'Mochi', '餅', array['Desserts', 'Snacks'], 'Soft, chewy rice cakes enjoyed plain or with sweet fillings.', '🍡', '#f0e3ce'),
  ('daifuku', '043', 'Daifuku', '大福', array['Desserts'], 'Mochi filled with sweet red bean paste, cream, or fruit.', '🍓', '#f2c3c3'),
  ('ichigo-daifuku', '044', 'Ichigo daifuku', 'いちご大福', array['Desserts'], 'A whole strawberry wrapped in red bean paste and soft mochi.', '🍓', '#f3b6b4'),
  ('warabi-mochi', '045', 'Warabi mochi', 'わらび餅', array['Desserts'], 'Jiggly, translucent rice cakes dusted with roasted soybean flour.', '🍡', '#d8c7a7'),
  ('dorayaki', '046', 'Dorayaki', 'どら焼き', array['Desserts', 'Snacks'], 'Two fluffy pancakes sandwiched around sweet red bean paste.', '🥞', '#c9945f'),
  ('castella', '047', 'Castella', 'カステラ', array['Desserts'], 'A moist, softly textured sponge cake with a golden top.', '🍰', '#e7bd70'),
  ('anmitsu', '048', 'Anmitsu', 'あんみつ', array['Desserts'], 'A colourful dessert of agar jelly, fruit, red bean paste, and syrup.', '🍨', '#d3b9d4'),
  ('melon-pan', '049', 'Melon pan', 'メロンパン', array['Snacks', 'Convenience store'], 'Sweet bread covered in a crisp cookie crust.', '🍈', '#d6d28f'),
  ('senbei', '050', 'Senbei', 'せんべい', array['Snacks', 'Street food'], 'Crisp rice crackers grilled and seasoned with soy sauce or salt.', '🍘', '#d5b47e')
on conflict (id) do update set
  number = excluded.number,
  name = excluded.name,
  japanese_name = excluded.japanese_name,
  categories = excluded.categories,
  description = excluded.description,
  emoji = excluded.emoji,
  color = excluded.color;
