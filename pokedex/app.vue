<script setup lang="ts">
import { foods } from '~/data/foods'

const eatenFoods = ref<string[]>([])
const photos = ref<Record<string, string>>({})
const searchTerm = ref('')
const selectedCategory = ref('All')

const categories = ['All', ...new Set(foods.map((food) => food.category))]
const filteredFoods = computed(() => {
  const search = searchTerm.value.trim().toLowerCase()
  return foods.filter((food) => {
    const matchesSearch = !search || food.name.toLowerCase().includes(search) || food.japaneseName.includes(search) || food.category.toLowerCase().includes(search)
    return matchesSearch && (selectedCategory.value === 'All' || food.category === selectedCategory.value)
  })
})
const eatenCount = computed(() => eatenFoods.value.length)

function toggleEaten(id: string) {
  eatenFoods.value = eatenFoods.value.includes(id) ? eatenFoods.value.filter((foodId) => foodId !== id) : [...eatenFoods.value, id]
}

function savePhoto(id: string, event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.addEventListener('load', () => {
    if (typeof reader.result === 'string') photos.value = { ...photos.value, [id]: reader.result }
  })
  reader.readAsDataURL(file)
}

onMounted(() => {
  const savedEaten = localStorage.getItem('pokedex-eaten')
  const savedPhotos = localStorage.getItem('pokedex-photos')
  if (savedEaten) eatenFoods.value = JSON.parse(savedEaten)
  if (savedPhotos) photos.value = JSON.parse(savedPhotos)
})

watch(eatenFoods, (value) => localStorage.setItem('pokedex-eaten', JSON.stringify(value)), { deep: true })
watch(photos, (value) => localStorage.setItem('pokedex-photos', JSON.stringify(value)), { deep: true })
</script>

<template>
  <main class="shell">
    <header class="hero">
      <div class="eyebrow">おいしい図鑑 <span>•</span> Food adventure</div>
      <h1>Your Japanese<br /><em>food pokedex.</em></h1>
      <p class="intro">Discover classic dishes, mark the ones you have tried, and keep a photo of every delicious memory.</p>
      <div class="progress-row">
        <div><strong>{{ eatenCount }}</strong><span> / {{ foods.length }} foods tried</span></div>
        <div class="progress-track"><div class="progress-fill" :style="{ width: `${(eatenCount / foods.length) * 100}%` }" /></div>
      </div>
    </header>

    <section class="controls" aria-label="Food filters">
      <label class="search"><span aria-hidden="true">⌕</span><input v-model="searchTerm" type="search" placeholder="Search foods..." /></label>
      <div class="categories">
        <button v-for="category in categories" :key="category" class="category" :class="{ active: selectedCategory === category }" @click="selectedCategory = category">{{ category }}</button>
      </div>
    </section>

    <section class="food-grid" aria-live="polite">
      <article v-for="food in filteredFoods" :key="food.id" class="food-card">
        <div class="food-art" :style="{ '--accent': food.color }">
          <img v-if="photos[food.id]" :src="photos[food.id]" :alt="`${food.name} photo`" />
          <span v-else class="food-emoji" aria-hidden="true">{{ food.emoji }}</span>
          <span class="number">#{{ food.number }}</span>
          <span v-if="eatenFoods.includes(food.id)" class="tried-badge">✓ Tried</span>
        </div>
        <div class="card-body">
          <div class="card-heading">
            <div><h2>{{ food.name }}</h2><p class="japanese">{{ food.japaneseName }}</p></div>
            <span class="category-label">{{ food.category }}</span>
          </div>
          <p class="description">{{ food.description }}</p>
          <div class="card-actions">
            <button class="try-button" :class="{ selected: eatenFoods.includes(food.id) }" @click="toggleEaten(food.id)">{{ eatenFoods.includes(food.id) ? 'Eaten!' : 'Mark as eaten' }}</button>
            <label class="photo-button" :title="photos[food.id] ? 'Replace photo' : 'Add a photo'"><span aria-hidden="true">▧</span><input type="file" accept="image/*" capture="environment" @change="savePhoto(food.id, $event)" /></label>
          </div>
        </div>
      </article>
    </section>
    <p v-if="filteredFoods.length === 0" class="empty">No foods found. Try another search.</p>
  </main>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;700&family=Playfair+Display:ital,wght@0,600;1,600;1,700&display=swap');
:root { color: #252321; background: #f7f3ec; font-family: 'DM Sans', sans-serif; }
* { box-sizing: border-box; } body { margin: 0; } button, input { font: inherit; } button { cursor: pointer; }
.shell { width: min(1120px, calc(100% - 40px)); margin: auto; padding: 52px 0 80px; }
.hero { max-width: 650px; } .eyebrow, .number, .category-label { color: #b0492f; font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: .08em; text-transform: uppercase; }
.eyebrow span { color: #d5a34c; margin: 0 8px; } h1 { font-size: clamp(3.25rem, 8vw, 6.5rem); letter-spacing: -.07em; line-height: .91; margin: 22px 0; }
h1 em { color: #b0492f; font-family: 'Playfair Display', serif; font-weight: 600; letter-spacing: -.06em; } .intro { color: #77716b; font-size: 16px; line-height: 1.6; max-width: 475px; }
.progress-row { align-items: center; display: flex; gap: 16px; margin-top: 30px; max-width: 500px; } .progress-row strong { font-size: 22px; } .progress-row span { color: #8b847b; font-size: 13px; }
.progress-track { background: #e5ded3; border-radius: 10px; flex: 1; height: 6px; } .progress-fill { background: #b0492f; border-radius: inherit; height: 100%; transition: width .25s; }
.controls { border-bottom: 1px solid #e3dcd1; border-top: 1px solid #e3dcd1; margin: 60px 0 32px; padding: 18px 0; }
.search { align-items: center; background: #fffdf9; border: 1px solid #e3dcd1; border-radius: 4px; display: flex; gap: 10px; max-width: 340px; padding: 10px 13px; } .search span { color: #b0492f; font-size: 24px; line-height: 15px; }
.search input { background: none; border: 0; min-width: 0; outline: 0; width: 100%; } .categories { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
.category { background: transparent; border: 1px solid #d8d0c5; border-radius: 20px; color: #77716b; font-size: 12px; padding: 7px 13px; } .category.active, .category:hover { background: #252321; border-color: #252321; color: #fff; }
.food-grid { display: grid; gap: 24px; grid-template-columns: repeat(3, 1fr); } .food-card { background: #fffdf9; border: 1px solid #e4ddd2; border-radius: 5px; overflow: hidden; }
.food-art { align-items: center; background: var(--accent); display: flex; height: 180px; justify-content: center; overflow: hidden; position: relative; } .food-art img { height: 100%; object-fit: cover; width: 100%; }
.food-emoji { filter: drop-shadow(0 8px 6px #0002); font-size: 88px; } .number { color: #25232199; left: 14px; position: absolute; top: 13px; }
.tried-badge { background: #252321; border-radius: 20px; color: #fff; font-family: 'DM Mono', monospace; font-size: 10px; padding: 7px 10px; position: absolute; right: 12px; text-transform: uppercase; top: 12px; }
.card-body { padding: 18px; } .card-heading { align-items: flex-start; display: flex; justify-content: space-between; gap: 8px; } h2 { font-size: 22px; letter-spacing: -.04em; margin: 0; }
.japanese { color: #b0492f; font-family: 'Playfair Display', serif; font-size: 15px; font-style: italic; margin: 4px 0 0; } .category-label { color: #9b938a; font-size: 9px; margin-top: 5px; }
.description { color: #77716b; font-size: 13px; line-height: 1.5; min-height: 40px; } .card-actions { align-items: center; display: flex; gap: 8px; margin-top: 18px; }
.try-button { background: #b0492f; border: 0; border-radius: 3px; color: white; flex: 1; font-size: 12px; padding: 11px; } .try-button.selected { background: #252321; }
.photo-button { align-items: center; border: 1px solid #d8d0c5; border-radius: 3px; color: #b0492f; display: flex; font-size: 19px; justify-content: center; padding: 7px 12px; } .photo-button input { display: none; }
.empty { color: #77716b; padding: 30px 0; text-align: center; }
@media (max-width: 800px) { .food-grid { grid-template-columns: repeat(2, 1fr); } } @media (max-width: 540px) { .shell { padding-top: 30px; width: min(100% - 28px, 460px); } .food-grid { grid-template-columns: 1fr; } .food-art { height: 200px; } .controls { margin-top: 42px; } }
</style>
