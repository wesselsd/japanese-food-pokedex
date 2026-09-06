# Dish variations and catalogue clarity

Updated 2026-09-07.

## Goal

Some catalogue entries are broad base dishes, while others are specific variations. The
catalogue should make that distinction visible and support an unlock path:

```text
Base dish -> variation
```

Initially, only the base dish is visible. After the user checks in the base dish, its
variations become visible. The model should support deeper chains later:

```text
Sushi -> Gunkan -> Ikura Gunkan
```

Standalone foods remain visible without participating in an evolution chain.

## Recommended first chains

These relationships are clear enough to use as the initial two-tier system:

| Base | Variations |
| --- | --- |
| Sushi (`sushi`) | Uni gunkan (`uni-gunkan`), Ikura gunkan (`ikura-gunkan`), Anago nigiri (`anago-nigiri`), Hotate nigiri (`hotate-nigiri`), Engawa nigiri (`engawa-nigiri`), Kani maki (`kani-maki`) |
| Udon (`udon`) | Curry udon (`curry-udon`), Yaki-udon (`yaki-udon`), Sara udon (`sara-udon`) |
| Mochi (`mochi`) | Daifuku (`daifuku`) |
| Dango (`dango`) | Mitarashi dango (`mitarashi-dango`) |
| Yakitori (`yakitori`) | Tsukune (`tsukune`) |
| Unagi kabayaki (`unagi-kabayaki`) | Unadon (`unadon`) |
| Japanese curry rice (`curry-rice`) | Katsu curry (`katsu-curry`) |
| Shōchū (`shochu`) | Imo Shōchū (`imo-shochu`), Mugi Shōchū (`mugi-shochu`) |
| Ramen (`ramen`) | Tsukemen (`tsukemen`), Hiyashi chuka (`hiyashi-chuka`) |

The strongest future three-tier chain currently present in the data is:

```text
Mochi -> Daifuku -> Ichigo daifuku
```

The Sushi chain now uses explicit preparation names rather than treating ingredients
such as `Ikura` as if they were already complete sushi dishes. `Hamachi sashimi` is
not included because sashimi is distinct from sushi; it can remain standalone unless
a future `Sashimi` base is added.

## Ingredient-like entries to clarify

These entries currently name an ingredient, protein, or topping rather than a complete
prepared dish. The proposed replacement names make the preparation explicit.

| Previous ID | Previous name | New dish name | New ID |
| --- | --- | --- | --- |
| `uni` | Uni | Uni gunkan | `uni-gunkan` |
| `ikura` | Ikura | Ikura gunkan | `ikura-gunkan` |
| `anago` | Anago | Anago nigiri | `anago-nigiri` |
| `hotate` | Hotate | Hotate nigiri | `hotate-nigiri` |
| `hamachi` | Hamachi | Hamachi sashimi | `hamachi-sashimi` |
| `kani` | Kani | Kani maki | `kani-maki` |
| `unagi` | Unagi | Unagi kabayaki | `unagi-kabayaki` |
| `gyutan` | Gyūtan | Grilled gyūtan | `grilled-gyutan` |

`Unagi` and `Gyūtan` were commonly used as shorthand for prepared dishes, so these were
less urgent than `Uni` and `Ikura`. They now use explicit preparation names as well.

## Sushi-specific future additions

The current catalogue now contains enough explicit seafood preparations to make Sushi
the strongest first evolution base:

```text
Sushi -> Anago nigiri
Sushi -> Hotate nigiri
Sushi -> Engawa nigiri
Sushi -> Kani maki
Sushi -> Ikura gunkan
Sushi -> Uni gunkan
```

For a future three-tier model:

```text
Sushi -> Nigiri -> Maguro nigiri
Sushi -> Gunkan -> Ikura gunkan
```

Because there are no existing check-ins, these entries can use the new IDs directly.
If this changes after release, the old IDs will need an explicit alias or migration.

## Broad or format-based entries

These are not ingredient-like, but they are broader than a single dish:

| Current ID | Current name | Issue | Possible clarification |
| --- | --- | --- | --- |
| `wagashi` | Wagashi | Umbrella term for traditional Japanese sweets | Rename to Nerikiri (`nerikiri`) |
| `ekiben` | Ekiben | Meal format rather than one dish | Use a specific example such as Makunouchi bento, or keep it as an intentional meal-format entry |

`Sushi`, `Ramen`, `Tempura`, `Yakiniku`, and `Mochi` are also broad terms, but they
work well as base nodes for an unlock system and should remain as base dishes.

## Entries that should remain standalone

The catalogue also contains drinks and branded products. They are not dishes, but that
is intentional because the product covers Japanese food and drinks:

- Natto, Grilled gyūtan, and Nerikiri should remain standalone for now.
- Green Tea, Hojicha, Mugicha, Pocari Sweat, and Calpis
- Nama Beer, Hoppy Set, Lemon Sour, High Ball, and Chūhai
- Sake styles, Shōchū styles, Awamori, and Umeshu
- Famichiki as a named convenience-store product

These should not be forced into the dish-variation system unless a separate drink or
brand hierarchy is designed.

## Data and migration considerations

- `food.id` is the stable link used by localStorage and Supabase progress records.
- Prefer changing display names while retaining existing IDs for renamed entries.
- If an entry is replaced by a new ID, provide an explicit migration or alias map so
  existing check-ins do not become orphaned.
- The current artwork lookup derives filenames from the display name. New artwork needs
  to be generated for renamed entries; until then they use the emoji fallback.
- A future catalogue model should represent `parentId` or an equivalent relationship,
  with room for more than two levels.
- The unlock rule should be based on at least one check-in for the parent food.
- Whether locked children count toward the total progress denominator remains a
  product decision; it should be settled before implementing the UI.
