<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { foods, foodLabels } from './data/foods'
import type { Checkin, FoodLocation } from './adapter/supabase/progress'
import { useFoodPokedex } from './composables/useFoodPokedex'
import { useAuth } from './composables/useAuth'
import { getSupabaseClient } from './adapter/supabase/client'
import { createSupabaseProgressAdapter } from './adapter/supabase/progress'
import ImageCropDialog from './components/ImageCropDialog.vue'
import LocationPicker from './components/LocationPicker.vue'

const { user, initialized, isConfigured, error: authError, message: authMessage, signIn, signUp, signOut } = useAuth()
const config = useRuntimeConfig()
const cloudProgress = isConfigured.value
  ? createSupabaseProgressAdapter(getSupabaseClient(config.public.supabaseUrl, config.public.supabaseAnonKey))
  : null
const {
  eatenFoods,
  checkins,
  photos,
  selectedPhotos,
  searchTerm,
  selectedCategory,
  selectedLabel,
  eatenFilter,
  categories,
  labels,
  filteredFoods,
  eatenCount,
  checkIn,
  updateCheckin,
  deleteCheckin,
  toggleEaten,
  savePhoto,
  removePhoto,
  selectPhoto,
  syncError
} = useFoodPokedex(foods, user, cloudProgress)
const isFiltering = computed(() => Boolean(searchTerm.value.trim()) || selectedCategory.value !== 'All' || selectedLabel.value !== 'All' || eatenFilter.value !== 'all')
const categorySections = computed(() => isFiltering.value
  ? [{ category: '', foods: filteredFoods.value, totalCount: 0, eatenCount: 0 }]
  : categories.slice(1).map((category) => ({
  category,
  foods: filteredFoods.value.filter((food) => food.category === category && !food.essential),
  totalCount: foods.filter((food) => food.category === category).length,
  eatenCount: foods.filter((food) => food.category === category && eatenFoods.value.includes(food.id)).length
})).filter((section) => section.foods.length))
const essentialFoods = computed(() => isFiltering.value ? [] : filteredFoods.value.filter((food) => food.essential))
const selectedFood = ref<(typeof foods)[number] | null>(null)
const checkinFood = ref<(typeof foods)[number] | null>(null)
const editingCheckin = ref<Checkin | null>(null)
const checkinRating = ref(3)
const checkinLocation = ref('')
const checkinLocationDetails = ref<FoodLocation | undefined>()
const locationPickerOpen = ref(false)
const locationError = ref('')
const authMode = ref<'signIn' | 'signUp'>('signIn')
const authOpen = ref(false)
const email = ref('')
const password = ref('')
const cropFoodId = ref<string | null>(null)
const cropSource = ref('')

function formatEatenDate(date: string) {
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(date))
}

function openCheckin(food: (typeof foods)[number]) {
  checkinFood.value = food
  checkinRating.value = 3
  checkinLocation.value = ''
  checkinLocationDetails.value = undefined
  locationPickerOpen.value = false
  locationError.value = ''
}

function openEditCheckin(checkin: Checkin) {
  editingCheckin.value = checkin
  checkinRating.value = checkin.rating
  checkinLocation.value = checkin.location
  checkinLocationDetails.value = checkin.locationDetails
  locationPickerOpen.value = false
  locationError.value = ''
}

function highestRating(foodId: string) {
  return Math.max(...checkins.value.filter((checkin) => checkin.foodId === foodId).map((checkin) => checkin.rating))
}

function ratingStars(foodId: string) {
  const rating = highestRating(foodId)
  return `${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}`
}

function displayedPhoto(food: (typeof foods)[number]) {
  const selectedId = selectedPhotos.value[food.id]
  return photos.value[food.id]?.find((photo) => photo.id === selectedId)?.url ?? food.image
}

function foodPhotos(foodId: string) {
  return photos.value[foodId] ?? []
}

async function submitCheckin() {
  if (editingCheckin.value) {
    await updateCheckin(editingCheckin.value, checkinRating.value, checkinLocation.value.trim(), checkinLocationDetails.value)
    editingCheckin.value = null
    return
  }
  if (!checkinFood.value) return
  await checkIn(checkinFood.value.id, checkinRating.value, checkinLocation.value.trim(), checkinLocationDetails.value)
  checkinFood.value = null
}

function chooseLocation(location: FoodLocation) {
  checkinLocationDetails.value = location
  checkinLocation.value = location.name
  locationPickerOpen.value = false
  locationError.value = ''
}

async function submitAuth() {
  if (authMode.value === 'signIn') await signIn(email.value, password.value)
  else await signUp(email.value, password.value)
}

function openCrop(foodId: string, event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  cropFoodId.value = foodId
  cropSource.value = URL.createObjectURL(file)
}

function closeCrop() {
  if (cropSource.value) URL.revokeObjectURL(cropSource.value)
  cropSource.value = ''
  cropFoodId.value = null
}

async function finishCrop(file: File) {
  if (!cropFoodId.value) return
  const foodId = cropFoodId.value
  closeCrop()
  try {
    await savePhoto(foodId, file)
  } catch (cause) {
    syncError.value = cause instanceof Error ? cause.message : 'Unable to save photo.'
  }
}

watch([selectedFood, checkinFood, editingCheckin, cropFoodId], (values) => {
  if (typeof document !== 'undefined') document.body.classList.toggle('modal-open', values.some(Boolean))
})

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
        <div v-else-if="initialized && isConfigured && !authOpen" class="account-bar">
          <span>Save your progress</span>
          <button class="text-button" @click="authMode = 'signIn'; authOpen = true">Sign in</button>
          <button class="text-button" @click="authMode = 'signUp'; authOpen = true">Sign up</button>
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
      <h1>Food <em>Pokedex.</em></h1>
      <p v-if="syncError" class="auth-error">{{ syncError }}</p>
      <div class="progress-row">
        <div><strong>{{ eatenCount }}</strong><span> / {{ foods.length }} foods tried</span></div>
        <div class="progress-track"><div class="progress-fill" :style="{ width: `${(eatenCount / foods.length) * 100}%` }" /></div>
      </div>
    </header>

    <section class="controls" aria-label="Food filters">
      <label class="search"><span aria-hidden="true">⌕</span><input v-model="searchTerm" type="search" placeholder="Search foods..." /><button v-if="searchTerm" type="button" class="clear-search" aria-label="Clear search" @click="searchTerm = ''">×</button></label>
      <div class="eaten-filters" aria-label="Eaten status">
        <button v-for="filter in [{ value: 'all', label: 'All' }, { value: 'eaten', label: 'Eaten' }, { value: 'uneaten', label: 'Not eaten' }]" :key="filter.value" class="category" :class="{ active: eatenFilter === filter.value }" @click="eatenFilter = filter.value">{{ filter.label }}</button>
      </div>
      <div class="select-filters">
        <label class="filter-select">
          <span>Filter by Category</span>
          <select v-model="selectedCategory">
            <option v-for="category in categories" :key="category" :value="category">{{ category }}</option>
          </select>
        </label>
        <label class="filter-select">
          <span>Filter by Label</span>
          <select v-model="selectedLabel">
            <option v-for="label in labels" :key="label" :value="label">{{ label }}</option>
          </select>
        </label>
      </div>
    </section>

    <section v-if="essentialFoods.length" class="food-section" aria-live="polite">
      <h2 class="section-title">Essential</h2>
      <div class="food-grid">
      <article v-for="food in essentialFoods" :key="food.id" class="food-card" tabindex="0" @click="selectedFood = food" @keydown.enter="selectedFood = food" @keydown.space.prevent="selectedFood = food">
        <div class="food-art" :style="{ backgroundColor: food.color }">
          <img v-if="displayedPhoto(food)" :src="displayedPhoto(food)" :alt="`${food.name} photo`" />
          <span v-else class="food-emoji" aria-hidden="true">{{ food.emoji }}</span>
          <span class="number">#{{ food.number }}</span>
          <span class="art-labels">{{ foodLabels(food).slice(0, 3).join(' · ') }}</span>
          <span v-if="eatenFoods.includes(food.id)" class="tried-badge" aria-label="Eaten">✓</span>
        </div>
        <div class="card-body">
          <div class="card-heading">
            <div><h2>{{ food.name }}</h2><div class="japanese-row"><p class="japanese">{{ food.japaneseName }}</p><span v-if="eatenFoods.includes(food.id)" class="card-rating" :aria-label="`Highest rating: ${highestRating(food.id)} out of 5`">{{ ratingStars(food.id) }}</span></div></div>
          </div>
          <div class="card-actions">
            <button class="try-button" :class="{ selected: eatenFoods.includes(food.id) }" @click.stop="openCheckin(food)">{{ eatenFoods.includes(food.id) ? 'Eaten again!' : 'Mark eaten' }}</button>
            <label class="photo-button" :title="photos[food.id] ? 'Replace photo' : 'Add a photo'" @click.stop><span>Add picture</span><input type="file" accept="image/*" capture="environment" @change="openCrop(food.id, $event)" /></label>
          </div>
        </div>
      </article>
      </div>
    </section>
    <section v-for="section in categorySections" :key="section.category || 'filtered'" class="food-section" :class="{ 'flat-results': isFiltering }" aria-live="polite">
      <h2 v-if="!isFiltering" class="section-title">{{ section.category }} <span class="category-progress"><span class="category-progress-bar"><span :style="{ width: `${section.eatenCount / section.totalCount * 100}%` }" /></span><small>{{ section.eatenCount }}/{{ section.totalCount }}</small></span></h2>
      <div class="food-grid">
        <article v-for="food in section.foods" :key="food.id" class="food-card" tabindex="0" @click="selectedFood = food" @keydown.enter="selectedFood = food" @keydown.space.prevent="selectedFood = food">
          <div class="food-art" :style="{ backgroundColor: food.color }">
            <img v-if="displayedPhoto(food)" :src="displayedPhoto(food)" :alt="`${food.name} photo`" />
            <span v-else class="food-emoji" aria-hidden="true">{{ food.emoji }}</span>
            <span class="number">#{{ food.number }}</span>
            <span class="art-labels">{{ foodLabels(food).slice(0, 3).join(' · ') }}</span>
            <span v-if="eatenFoods.includes(food.id)" class="tried-badge" aria-label="Eaten">✓</span>
          </div>
          <div class="card-body">
            <div class="card-heading"><div><h2>{{ food.name }}</h2><div class="japanese-row"><p class="japanese">{{ food.japaneseName }}</p><span v-if="eatenFoods.includes(food.id)" class="card-rating" :aria-label="`Highest rating: ${highestRating(food.id)} out of 5`">{{ ratingStars(food.id) }}</span></div></div></div>
            <div class="card-actions"><button class="try-button" :class="{ selected: eatenFoods.includes(food.id) }" @click.stop="openCheckin(food)">{{ eatenFoods.includes(food.id) ? 'Eaten again!' : 'Mark eaten' }}</button><label class="photo-button" :title="photos[food.id] ? 'Replace photo' : 'Add a photo'" @click.stop><span>Add picture</span><input type="file" accept="image/*" capture="environment" @change="openCrop(food.id, $event)" /></label></div>
          </div>
        </article>
      </div>
    </section>
    <ImageCropDialog v-if="cropSource" :src="cropSource" @cancel="closeCrop" @crop="finishCrop" />
    <p v-if="filteredFoods.length === 0" class="empty">No foods found. Try another search.</p>
    <div v-if="selectedFood" class="detail-backdrop" role="dialog" aria-modal="true" :aria-label="`${selectedFood.name} details`" @click.self="selectedFood = null">
      <article class="detail-dialog">
        <button class="detail-close" aria-label="Close details" @click="selectedFood = null">×</button>
        <div class="detail-art" :style="{ backgroundColor: selectedFood.color }">
          <img v-if="displayedPhoto(selectedFood)" :src="displayedPhoto(selectedFood)" :alt="`${selectedFood.name} photo`" />
          <span v-else class="food-emoji" aria-hidden="true">{{ selectedFood.emoji }}</span>
        </div>
        <div class="detail-body">
          <p class="number">#{{ selectedFood.number }}</p>
          <h2>{{ selectedFood.name }}</h2>
          <p class="japanese">{{ selectedFood.japaneseName }}</p>
          <div class="photo-library">
            <span class="detail-labels-title">Images</span>
            <button type="button" class="photo-choice" :class="{ selected: !selectedPhotos[selectedFood.id] || selectedPhotos[selectedFood.id] === 'default' }" @click="selectPhoto(selectedFood.id, 'default')">
              <img v-if="selectedFood.image" :src="selectedFood.image" :alt="`${selectedFood.name} predefined image`" />
              <span>Original</span>
            </button>
            <div v-for="photo in foodPhotos(selectedFood.id)" :key="photo.id" class="photo-choice-wrap">
              <button type="button" class="photo-choice" :class="{ selected: selectedPhotos[selectedFood.id] === photo.id }" @click="selectPhoto(selectedFood.id, photo.id)">
                <img :src="photo.url" :alt="`${selectedFood.name} uploaded photo`" />
                <span>Uploaded</span>
              </button>
              <button type="button" class="remove-photo" aria-label="Remove uploaded image" @click="removePhoto(selectedFood.id, photo.id)">×</button>
            </div>
          </div>
          <div class="detail-labels">
            <span class="detail-labels-title">Labels</span>
            <span v-for="label in foodLabels(selectedFood)" :key="label" class="detail-label">{{ label }}</span>
          </div>
          <div v-if="eatenFoods.includes(selectedFood.id)" class="checkin-list">
            <p v-for="checkin in checkins.filter((item) => item.foodId === selectedFood.id).sort((a, b) => b.eatenAt.localeCompare(a.eatenAt))" :key="checkin.id" class="detail-meta">
              Eaten on {{ formatEatenDate(checkin.eatenAt) }} · {{ checkin.rating }}/5 stars<span v-if="checkin.location"> · <a v-if="checkin.locationDetails" :href="checkin.locationDetails.mapsUrl" target="_blank" rel="noreferrer">{{ checkin.location }}</a><span v-else>{{ checkin.location }}</span></span>
              <button class="edit-checkin" @click="openEditCheckin(checkin)">edit check-in</button>
            </p>
          </div>
          <p v-else class="detail-meta">Not yet eaten</p>
          <p class="description">{{ selectedFood.description }}</p>
        </div>
      </article>
    </div>
    <div v-if="checkinFood || editingCheckin" class="detail-backdrop" role="dialog" aria-modal="true" :aria-label="`Check in ${checkinFood?.name ?? 'food'}`" @click.self="checkinFood = null; editingCheckin = null">
      <form class="checkin-dialog" @submit.prevent="submitCheckin">
        <button type="button" class="detail-close" aria-label="Close check-in" @click="checkinFood = null; editingCheckin = null">×</button>
        <h2>{{ editingCheckin ? 'Edit check-in' : 'Mark eaten' }}</h2>
        <p class="checkin-food">{{ editingCheckin ? foods.find((food) => food.id === editingCheckin.foodId)?.name : checkinFood?.name }}</p>
        <fieldset class="rating-field">
          <legend>Rating <span>(required)</span></legend>
          <label v-for="star in 5" :key="star"><input v-model.number="checkinRating" type="radio" :value="star" required /> {{ star }}★</label>
        </fieldset>
        <label class="location-field">Location <span>(optional)<input v-model="checkinLocation" type="text" maxlength="120" placeholder="Town, region, or restaurant" @input="checkinLocationDetails = undefined" /></span></label>
        <button type="button" class="location-button" @click="locationPickerOpen = !locationPickerOpen">Choose on Google Maps</button>
        <div v-if="checkinLocationDetails" class="selected-location">
          <strong>{{ checkinLocationDetails.name }}</strong>
          <span>{{ checkinLocationDetails.address }}</span>
        </div>
        <div v-if="locationPickerOpen" class="location-picker-panel">
          <LocationPicker @selected="chooseLocation" @error="locationError = $event" />
          <p v-if="locationError" class="auth-error">{{ locationError }}</p>
        </div>
        <div class="crop-actions"><button v-if="editingCheckin" type="button" class="auth-button remove-checkin" @click="deleteCheckin(editingCheckin.id); editingCheckin = null">Remove check-in</button><button class="auth-button" type="submit">Save check-in</button></div>
      </form>
    </div>
  </main>
</template>
