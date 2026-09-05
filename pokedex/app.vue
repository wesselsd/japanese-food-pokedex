<script setup lang="ts">
import { foods } from './data/foods'
import { useFoodPokedex } from './composables/useFoodPokedex'

const {
  eatenFoods,
  photos,
  searchTerm,
  selectedCategory,
  categories,
  filteredFoods,
  eatenCount,
  toggleEaten,
  savePhoto
} = useFoodPokedex(foods)
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
        <div class="food-art" :style="{ backgroundColor: food.color }">
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
