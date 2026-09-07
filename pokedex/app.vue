<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { foods, foodLabels } from './data/foods'
import type { Checkin, FoodLocation, ProgressStore } from './domain/progress'
import { useFoodPokedex } from './composables/useFoodPokedex'
import { useAuth } from './composables/useAuth'
import { getSupabaseClient } from './adapter/supabase/client'
import { createSupabaseAuthAdapter } from './adapter/supabase/auth'
import { bindProgressAdapter, createSupabaseProgressAdapter } from './adapter/supabase/progress'
import { createLocalProgressStore } from './adapter/localProgress'
import ImageCropDialog from './components/ImageCropDialog.vue'
import LocationPicker from './components/LocationPicker.vue'
import { highestRating, ratingStars } from './domain/checkins'
import { categorySections as getCategorySections, evolutionGroups as getEvolutionGroups } from './domain/foodCatalog'

const config = useRuntimeConfig()
const configuredAuthAdapter = config.public.supabaseUrl && config.public.supabaseAnonKey
  ? createSupabaseAuthAdapter(getSupabaseClient(config.public.supabaseUrl, config.public.supabaseAnonKey))
  : null
const { user, initialized, isConfigured, error: authError, message: authMessage, signIn, signUp, signOut } = useAuth(configuredAuthAdapter)
const cloudProgressAdapter = isConfigured.value
  ? createSupabaseProgressAdapter(getSupabaseClient(config.public.supabaseUrl, config.public.supabaseAnonKey))
  : null
const localProgress = createLocalProgressStore()
const progressStore = computed<ProgressStore | null>(() => user.value && cloudProgressAdapter
  ? bindProgressAdapter(cloudProgressAdapter, user.value.id)
  : localProgress)
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
  visibleFoods,
  filteredFoods,
  essentialCount,
  progressCount,
  progressTotal,
  checkIn,
  updateCheckin,
  deleteCheckin,
  toggleEaten,
  savePhoto,
  removePhoto,
  selectPhoto,
  syncError
} = useFoodPokedex(foods, progressStore)
const isLabelFiltering = computed(() => selectedLabel.value !== 'All')
const categorySections = computed(() => getCategorySections(
  filteredFoods.value,
  visibleFoods.value,
  categories,
  new Set(eatenFoods.value),
  isLabelFiltering.value
))
const currentView = ref<'pokedex' | 'evolutions'>('pokedex')
const evolutionGroups = computed(() => getEvolutionGroups(foods).filter((group) => group.evolutions.length))
const foodById = new Map(foods.map((food) => [food.id, food]))
const unlockedFoodIds = computed(() => new Set(visibleFoods.value.map((food) => food.id)))
const evolutionSections = computed(() => [
  {
    id: 'undiscovered',
    title: 'Undiscovered',
    groups: evolutionGroups.value.map((group) => ({
      ...group,
      evolutions: group.evolutions.filter((food) => !isEvolutionFoodUnlocked(food))
    })).filter((group) => group.evolutions.length)
  },
  {
    id: 'discovered',
    title: 'Discovered',
    groups: evolutionGroups.value.map((group) => ({
      ...group,
      evolutions: group.evolutions.filter((food) => isEvolutionFoodUnlocked(food))
    })).filter((group) => group.evolutions.length)
  }
])
const essentialFoods = computed(() => isLabelFiltering.value ? [] : filteredFoods.value.filter((food) => food.essential))
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

function displayedPhoto(food: (typeof foods)[number]) {
  const selectedId = selectedPhotos.value[food.id]
  return photos.value[food.id]?.find((photo) => photo.id === selectedId)?.url ?? food.image
}

function foodPhotos(foodId: string) {
  return photos.value[foodId] ?? []
}

function isEvolutionFoodUnlocked(food: (typeof foods)[number]) {
  return unlockedFoodIds.value.has(food.id)
}

function evolutionImage(food: (typeof foods)[number]) {
  if (isEvolutionFoodUnlocked(food)) return displayedPhoto(food)
  const parent = food.parentId ? foodById.get(food.parentId) : undefined
  return parent ? displayedPhoto(parent) : food.image
}

function evolutionParentName(food: (typeof foods)[number]) {
  return food.parentId ? foodById.get(food.parentId)?.name ?? 'Parent' : 'Root'
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
        <div class="eyebrow">Dimitri's Food Pokédex <span>•</span> とてもアドベンチャーです!</div>
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
      <h1>Tabe<em>dex</em></h1>
      <p v-if="syncError" class="auth-error">{{ syncError }}</p>
      <div class="progress-row">
        <div><strong>{{ progressCount }}</strong><span> / {{ progressTotal }} {{ progressTotal === essentialCount ? 'essential ' : '' }}foods tried</span></div>
        <div class="progress-track"><div class="progress-fill" :style="{ width: `${(progressCount / progressTotal) * 100}%` }" /></div>
      </div>
    </header>

    <nav class="view-tabs" role="tablist" aria-label="Main views">
      <button type="button" role="tab" class="view-tab" :class="{ active: currentView === 'pokedex' }" :aria-selected="currentView === 'pokedex'" @click="currentView = 'pokedex'">Pokedex</button>
      <button type="button" role="tab" class="view-tab" :class="{ active: currentView === 'evolutions' }" :aria-selected="currentView === 'evolutions'" @click="currentView = 'evolutions'">Evolutions</button>
    </nav>

    <section v-if="currentView === 'pokedex'" class="controls" aria-label="Food filters">
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
    <section v-if="currentView === 'pokedex' && essentialFoods.length" class="food-section" aria-live="polite">
      <h2 class="section-title">Essential</h2>
      <div class="food-grid">
      <article v-for="food in essentialFoods" :key="food.id" class="food-card" :class="{ eaten: eatenFoods.includes(food.id) }" tabindex="0" @click="selectedFood = food" @keydown.enter="selectedFood = food" @keydown.space.prevent="selectedFood = food">
        <div class="food-art" :style="{ backgroundColor: food.color }">
          <img v-if="displayedPhoto(food)" :src="displayedPhoto(food)" :alt="`${food.name} photo`" loading="lazy" decoding="async" />
          <span v-else class="food-emoji" aria-hidden="true">{{ food.emoji }}</span>
          <span class="number">#{{ food.number }}</span>
          <span class="art-labels">{{ foodLabels(food).slice(0, 3).join(' · ') }}</span>
          <span v-if="eatenFoods.includes(food.id)" class="tried-badge" aria-label="Eaten">✓</span>
        </div>
        <div class="card-body">
          <div class="card-heading">
            <div><h2>{{ food.name }}</h2><div class="japanese-row"><p class="japanese">{{ food.japaneseName }}</p><span v-if="eatenFoods.includes(food.id)" class="card-rating" :aria-label="`Highest rating: ${highestRating(checkins, food.id)} out of 5`">{{ ratingStars(highestRating(checkins, food.id)) }}</span></div></div>
          </div>
          <div class="card-actions">
            <button class="try-button" :class="{ selected: eatenFoods.includes(food.id) }" @click.stop="openCheckin(food)">{{ eatenFoods.includes(food.id) ? 'Eaten again!' : 'Mark eaten' }}</button>
            <label class="photo-button" :title="photos[food.id] ? 'Replace photo' : 'Add a photo'" @click.stop><span>Add picture</span><input type="file" accept="image/*" capture="environment" @change="openCrop(food.id, $event)" /></label>
          </div>
        </div>
      </article>
      </div>
    </section>
    <template v-if="currentView === 'pokedex'">
    <section v-for="section in categorySections" :key="section.category || 'filtered'" class="food-section" :class="{ 'flat-results': isLabelFiltering }" aria-live="polite">
      <h2 v-if="!isLabelFiltering" class="section-title">{{ section.category }} <span class="category-progress"><span class="category-progress-bar"><span :style="{ width: `${section.eatenCount / section.totalCount * 100}%` }" /></span><small>{{ section.eatenCount }}/{{ section.totalCount }}</small></span></h2>
      <div class="food-grid">
        <article v-for="food in section.foods" :key="food.id" class="food-card" :class="{ eaten: eatenFoods.includes(food.id) }" tabindex="0" @click="selectedFood = food" @keydown.enter="selectedFood = food" @keydown.space.prevent="selectedFood = food">
          <div class="food-art" :style="{ backgroundColor: food.color }">
            <img v-if="displayedPhoto(food)" :src="displayedPhoto(food)" :alt="`${food.name} photo`" loading="lazy" decoding="async" />
            <span v-else class="food-emoji" aria-hidden="true">{{ food.emoji }}</span>
            <span class="number">#{{ food.number }}</span>
            <span class="art-labels">{{ foodLabels(food).slice(0, 3).join(' · ') }}</span>
            <span v-if="eatenFoods.includes(food.id)" class="tried-badge" aria-label="Eaten">✓</span>
          </div>
          <div class="card-body">
            <div class="card-heading"><div><h2>{{ food.name }}</h2><div class="japanese-row"><p class="japanese">{{ food.japaneseName }}</p><span v-if="eatenFoods.includes(food.id)" class="card-rating" :aria-label="`Highest rating: ${highestRating(checkins, food.id)} out of 5`">{{ ratingStars(highestRating(checkins, food.id)) }}</span></div></div></div>
            <div class="card-actions"><button class="try-button" :class="{ selected: eatenFoods.includes(food.id) }" @click.stop="openCheckin(food)">{{ eatenFoods.includes(food.id) ? 'Eaten again!' : 'Mark eaten' }}</button><label class="photo-button" :title="photos[food.id] ? 'Replace photo' : 'Add a photo'" @click.stop><span>Add picture</span><input type="file" accept="image/*" capture="environment" @change="openCrop(food.id, $event)" /></label></div>
          </div>
        </article>
      </div>
    </section>
    </template>
    <section v-else class="evolution-view" aria-labelledby="evolutions-heading">
      <div class="evolution-intro">
        <h2 id="evolutions-heading">Evolution paths</h2>
        <p>Catch a basic food to reveal varieties</p>
      </div>
      <section v-for="section in evolutionSections" :key="section.id" class="evolution-section" :aria-labelledby="`${section.id}-heading`">
        <h2 :id="`${section.id}-heading`" class="section-title">{{ section.title }}</h2>
        <div v-for="group in section.groups" :key="`${section.id}-${group.root.id}`" class="evolution-path">
          <div class="evolution-root">
            <article class="food-card evolution-card" :class="{ eaten: eatenFoods.includes(group.root.id) }" tabindex="0" @click="selectedFood = group.root" @keydown.enter="selectedFood = group.root" @keydown.space.prevent="selectedFood = group.root">
              <div class="food-art" :style="{ backgroundColor: group.root.color }">
                <img v-if="displayedPhoto(group.root)" :src="displayedPhoto(group.root)" :alt="`${group.root.name} photo`" loading="lazy" decoding="async" />
                <span v-else class="food-emoji" aria-hidden="true">{{ group.root.emoji }}</span>
                <span class="number">#{{ group.root.number }}</span>
                <span class="art-labels">{{ foodLabels(group.root).slice(0, 3).join(' · ') }}</span>
                <span v-if="eatenFoods.includes(group.root.id)" class="tried-badge" aria-label="Eaten">✓</span>
              </div>
              <div class="card-body">
                <span class="evolution-parent">Root</span>
                <div class="card-heading"><div><h2>{{ group.root.name }}</h2><div class="japanese-row"><p class="japanese">{{ group.root.japaneseName }}</p><span v-if="eatenFoods.includes(group.root.id)" class="card-rating" :aria-label="`Highest rating: ${highestRating(checkins, group.root.id)} out of 5`">{{ ratingStars(highestRating(checkins, group.root.id)) }}</span></div></div></div>
                <div class="card-actions"><button class="try-button" :class="{ selected: eatenFoods.includes(group.root.id) }" @click.stop="openCheckin(group.root)">{{ eatenFoods.includes(group.root.id) ? 'Eaten again!' : 'Mark eaten' }}</button><label class="photo-button" :title="photos[group.root.id] ? 'Replace photo' : 'Add a photo'" @click.stop><span>Add picture</span><input type="file" accept="image/*" capture="environment" @change="openCrop(group.root.id, $event)" /></label></div>
              </div>
            </article>
          </div>
          <div class="evolution-arrow" aria-hidden="true">→</div>
          <div class="evolution-steps">
            <article v-for="food in group.evolutions" :key="food.id" class="food-card evolution-card" :class="{ eaten: eatenFoods.includes(food.id), 'is-locked': !isEvolutionFoodUnlocked(food) }" :tabindex="isEvolutionFoodUnlocked(food) ? 0 : undefined" @click="isEvolutionFoodUnlocked(food) ? selectedFood = food : undefined" @keydown.enter="isEvolutionFoodUnlocked(food) ? selectedFood = food : undefined" @keydown.space.prevent="isEvolutionFoodUnlocked(food) ? selectedFood = food : undefined">
              <div class="food-art" :class="{ 'locked-art': !isEvolutionFoodUnlocked(food) }" :style="{ backgroundColor: isEvolutionFoodUnlocked(food) ? food.color : '#fff' }">
                <img :src="evolutionImage(food)" :class="{ 'locked-image': !isEvolutionFoodUnlocked(food) }" :alt="isEvolutionFoodUnlocked(food) ? `${food.name} photo` : `${food.japaneseName} evolution hint`" loading="lazy" decoding="async" />
                <span v-if="!isEvolutionFoodUnlocked(food)" class="locked-question" aria-hidden="true">?</span>
                <span class="number">#{{ food.number }}</span>
                <span class="art-labels">{{ foodLabels(food).slice(0, 3).join(' · ') }}</span>
                <span v-if="eatenFoods.includes(food.id)" class="tried-badge" aria-label="Eaten">✓</span>
              </div>
              <div class="card-body">
                <span class="evolution-parent">From {{ evolutionParentName(food) }}</span>
                <div class="card-heading"><div><h2 v-if="isEvolutionFoodUnlocked(food)">{{ food.name }}</h2><h2 v-else class="locked-name-placeholder" aria-hidden="true">&nbsp;</h2><div class="japanese-row"><p class="japanese">{{ food.japaneseName }}</p><span v-if="eatenFoods.includes(food.id)" class="card-rating" :aria-label="`Highest rating: ${highestRating(checkins, food.id)} out of 5`">{{ ratingStars(highestRating(checkins, food.id)) }}</span></div></div></div>
                <div v-if="isEvolutionFoodUnlocked(food)" class="card-actions"><button class="try-button" :class="{ selected: eatenFoods.includes(food.id) }" @click.stop="openCheckin(food)">{{ eatenFoods.includes(food.id) ? 'Eaten again!' : 'Mark eaten' }}</button><label class="photo-button" :title="photos[food.id] ? 'Replace photo' : 'Add a photo'" @click.stop><span>Add picture</span><input type="file" accept="image/*" capture="environment" @change="openCrop(food.id, $event)" /></label></div>
                <div v-else class="card-actions locked-actions-placeholder" aria-hidden="true"><span class="try-button"></span><span class="photo-button"></span></div>
              </div>
            </article>
          </div>
        </div>
        <p v-if="!section.groups.length" class="empty">{{ section.id === 'undiscovered' ? 'All evolutions discovered.' : 'No evolutions discovered yet.' }}</p>
      </section>
    </section>
    <ImageCropDialog v-if="cropSource" :src="cropSource" @cancel="closeCrop" @crop="finishCrop" />
    <p v-if="currentView === 'pokedex' && filteredFoods.length === 0" class="empty">No foods found. Try another search.</p>
    <div v-if="selectedFood" class="detail-backdrop" role="dialog" aria-modal="true" :aria-label="`${selectedFood.name} details`" @click.self="selectedFood = null">
      <article class="detail-dialog">
        <button class="detail-close" aria-label="Close details" @click="selectedFood = null">×</button>
        <div class="detail-art" :style="{ backgroundColor: selectedFood.color }">
          <img v-if="displayedPhoto(selectedFood)" :src="displayedPhoto(selectedFood)" :alt="`${selectedFood.name} photo`" loading="lazy" decoding="async" />
          <span v-else class="food-emoji" aria-hidden="true">{{ selectedFood.emoji }}</span>
        </div>
        <div class="detail-body">
          <p class="number">#{{ selectedFood.number }}</p>
          <h2>{{ selectedFood.name }}</h2>
          <p class="japanese">{{ selectedFood.japaneseName }}</p>
          <div class="photo-library">
            <span class="detail-labels-title">Images</span>
            <button type="button" class="photo-choice" :class="{ selected: !selectedPhotos[selectedFood.id] || selectedPhotos[selectedFood.id] === 'default' }" @click="selectPhoto(selectedFood.id, 'default')">
              <img v-if="selectedFood.image" :src="selectedFood.image" :alt="`${selectedFood.name} predefined image`" loading="lazy" decoding="async" />
              <span>Original</span>
            </button>
            <div v-for="photo in foodPhotos(selectedFood.id)" :key="photo.id" class="photo-choice-wrap">
              <button type="button" class="photo-choice" :class="{ selected: selectedPhotos[selectedFood.id] === photo.id }" @click="selectPhoto(selectedFood.id, photo.id)">
                <img :src="photo.url" :alt="`${selectedFood.name} uploaded photo`" loading="lazy" decoding="async" />
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
