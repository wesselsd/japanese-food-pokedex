<script setup lang="ts">
import { computed, ref } from 'vue'
import { foods } from './data/foods'
import { useFoodPokedex } from './composables/useFoodPokedex'
import { useAuth } from './composables/useAuth'
import { getSupabaseClient } from './adapter/supabase/client'
import { createSupabaseProgressAdapter } from './adapter/supabase/progress'

const { user, initialized, isConfigured, error: authError, message: authMessage, signIn, signUp, signOut } = useAuth()
const config = useRuntimeConfig()
const cloudProgress = isConfigured.value
  ? createSupabaseProgressAdapter(getSupabaseClient(config.public.supabaseUrl, config.public.supabaseAnonKey))
  : null
const {
  eatenFoods,
  photos,
  searchTerm,
  selectedCategory,
  eatenFilter,
  categories,
  filteredFoods,
  eatenCount,
  toggleEaten,
  savePhoto,
  syncError,
  crop,
  moveCrop,
  setCropZoom,
  cancelCrop,
  confirmCrop
} = useFoodPokedex(foods, user, cloudProgress)
const categorySections = computed(() => categories.slice(1).map((category) => ({
  category,
  foods: filteredFoods.value.filter((food) => food.category === category && !food.essential),
  totalCount: foods.filter((food) => food.category === category).length,
  eatenCount: foods.filter((food) => food.category === category && eatenFoods.value.includes(food.id)).length
})).filter((section) => section.foods.length))
const essentialFoods = computed(() => filteredFoods.value.filter((food) => food.essential))
const authMode = ref<'signIn' | 'signUp'>('signIn')
const email = ref('')
const password = ref('')
let dragging = false
let lastX = 0
let lastY = 0

async function submitAuth() {
  if (authMode.value === 'signIn') await signIn(email.value, password.value)
  else await signUp(email.value, password.value)
}

function startCropDrag(event: PointerEvent) {
  event.preventDefault()
  dragging = true
  lastX = event.clientX
  lastY = event.clientY
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

function dragCrop(event: PointerEvent) {
  if (!dragging) return
  moveCrop(event.clientX - lastX, event.clientY - lastY)
  lastX = event.clientX
  lastY = event.clientY
}

function stopCropDrag() {
  dragging = false
}
</script>

<template>
  <main class="shell">
    <header class="hero">
      <div class="hero-top">
        <div class="eyebrow">おいしい図鑑 <span>•</span> Food adventure</div>
        <div v-if="initialized && isConfigured && user" class="account-bar">
          <span>Signed in as {{ user.email }}</span>
          <button class="text-button" @click="signOut">Sign out</button>
        </div>
        <form v-else-if="initialized && isConfigured" class="auth-panel" @submit.prevent="submitAuth">
          <div class="auth-heading">
            <strong>{{ authMode === 'signIn' ? 'Save your progress everywhere' : 'Create your account' }}</strong>
            <button type="button" class="text-button" @click="authMode = authMode === 'signIn' ? 'signUp' : 'signIn'">
              {{ authMode === 'signIn' ? 'Sign up' : 'Sign in' }}
            </button>
          </div>
          <div class="auth-fields">
            <input v-model="email" type="email" placeholder="Email" autocomplete="email" required />
            <input v-model="password" type="password" placeholder="Password" autocomplete="current-password" minlength="6" required />
            <button class="auth-button" type="submit">{{ authMode === 'signIn' ? 'Sign in' : 'Create account' }}</button>
          </div>
          <p v-if="authError" class="auth-error">{{ authError }}</p>
          <p v-if="authMessage" class="auth-message">{{ authMessage }}</p>
        </form>
      </div>
      <h1>Food<br /><em>Pokedex.</em></h1>
      <p class="intro">Discover classic dishes, mark the ones you have tried, and keep a photo of every delicious memory.</p>
      <p v-if="syncError" class="auth-error">{{ syncError }}</p>
      <div class="progress-row">
        <div><strong>{{ eatenCount }}</strong><span> / {{ foods.length }} foods tried</span></div>
        <div class="progress-track"><div class="progress-fill" :style="{ width: `${(eatenCount / foods.length) * 100}%` }" /></div>
      </div>
    </header>

    <section class="controls" aria-label="Food filters">
      <label class="search"><span aria-hidden="true">⌕</span><input v-model="searchTerm" type="search" placeholder="Search foods..." /></label>
      <div class="eaten-filters" aria-label="Eaten status">
        <button v-for="filter in [{ value: 'all', label: 'All' }, { value: 'eaten', label: 'Eaten' }, { value: 'uneaten', label: 'Not eaten' }]" :key="filter.value" class="category" :class="{ active: eatenFilter === filter.value }" @click="eatenFilter = filter.value">{{ filter.label }}</button>
      </div>
      <div class="categories">
        <button v-for="category in categories" :key="category" class="category" :class="{ active: selectedCategory === category }" @click="selectedCategory = category">{{ category }}</button>
      </div>
    </section>

    <section v-if="essentialFoods.length" class="food-section" aria-live="polite">
      <h2 class="section-title">Essential</h2>
      <div class="food-grid">
      <article v-for="food in essentialFoods" :key="food.id" class="food-card">
        <div class="food-art" :style="{ backgroundColor: food.color }">
          <img v-if="photos[food.id]" :src="photos[food.id]" :alt="`${food.name} photo`" />
          <img v-else-if="food.image" :src="food.image" :alt="`${food.name} illustration`" />
          <span v-else class="food-emoji" aria-hidden="true">{{ food.emoji }}</span>
          <span class="number">#{{ food.number }}</span>
          <span v-if="eatenFoods.includes(food.id)" class="tried-badge">✓ Tried</span>
        </div>
        <div class="card-body">
          <div class="card-heading">
            <div><h2>{{ food.name }}</h2><p class="japanese">{{ food.japaneseName }}</p></div>
            <span class="category-label">{{ food.category }} · {{ food.foodTypes.join(' · ') }}</span>
          </div>
          <p class="description">{{ food.description }}</p>
          <div class="card-actions">
            <button class="try-button" :class="{ selected: eatenFoods.includes(food.id) }" @click="toggleEaten(food.id)">{{ eatenFoods.includes(food.id) ? 'Eaten!' : 'Mark as eaten' }}</button>
            <label class="photo-button" :title="photos[food.id] ? 'Replace photo' : 'Add a photo'"><span aria-hidden="true">▧</span><input type="file" accept="image/*" capture="environment" @change="savePhoto(food.id, $event)" /></label>
          </div>
        </div>
      </article>
      </div>
    </section>
    <section v-for="section in categorySections" :key="section.category" class="food-section" aria-live="polite">
      <h2 class="section-title">{{ section.category }} <span class="category-progress"><span class="category-progress-bar"><span :style="{ width: `${section.eatenCount / section.totalCount * 100}%` }" /></span><small>{{ section.eatenCount }}/{{ section.totalCount }}</small></span></h2>
      <div class="food-grid">
        <article v-for="food in section.foods" :key="food.id" class="food-card">
          <div class="food-art" :style="{ backgroundColor: food.color }">
            <img v-if="photos[food.id]" :src="photos[food.id]" :alt="`${food.name} photo`" />
            <img v-else-if="food.image" :src="food.image" :alt="`${food.name} illustration`" />
            <span v-else class="food-emoji" aria-hidden="true">{{ food.emoji }}</span>
            <span class="number">#{{ food.number }}</span>
            <span v-if="eatenFoods.includes(food.id)" class="tried-badge">✓ Tried</span>
          </div>
          <div class="card-body">
            <div class="card-heading"><div><h2>{{ food.name }}</h2><p class="japanese">{{ food.japaneseName }}</p></div><span class="category-label">{{ food.foodTypes.join(' · ') }}</span></div>
            <p class="description">{{ food.description }}</p>
            <div class="card-actions"><button class="try-button" :class="{ selected: eatenFoods.includes(food.id) }" @click="toggleEaten(food.id)">{{ eatenFoods.includes(food.id) ? 'Eaten!' : 'Mark as eaten' }}</button><label class="photo-button" :title="photos[food.id] ? 'Replace photo' : 'Add a photo'"><span aria-hidden="true">▧</span><input type="file" accept="image/*" capture="environment" @change="savePhoto(food.id, $event)" /></label></div>
          </div>
        </article>
      </div>
    </section>
    <p v-if="filteredFoods.length === 0" class="empty">No foods found. Try another search.</p>
    <div v-if="crop" class="crop-backdrop" role="dialog" aria-modal="true" aria-label="Crop photo">
      <div class="crop-dialog">
        <h2>Choose your thumbnail</h2>
        <p>Drag the image to choose which part to keep.</p>
        <div
          class="crop-window"
          @pointerdown.prevent="startCropDrag"
          @pointermove="dragCrop"
          @pointerup="stopCropDrag"
          @pointerleave="stopCropDrag"
          @pointercancel="stopCropDrag"
          @contextmenu.prevent
        >
          <img draggable="false" :src="crop.url" alt="Photo crop preview" :style="{ width: `${crop.width * crop.zoom}px`, height: `${crop.height * crop.zoom}px`, left: `${crop.offsetX}px`, top: `${crop.offsetY}px` }" />
        </div>
        <label class="zoom-control">Zoom <input type="range" min="1" max="3" step=".05" :value="crop.zoom" @input="setCropZoom(Number(($event.target as HTMLInputElement).value))" /></label>
        <div class="crop-actions">
          <button class="text-button" @click="cancelCrop">Cancel</button>
          <button class="auth-button" @click="confirmCrop">Use this crop</button>
        </div>
      </div>
    </div>
  </main>
</template>
