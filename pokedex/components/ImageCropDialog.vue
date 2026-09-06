<script setup lang="ts">
import { ref } from 'vue'
import { Cropper } from 'vue-advanced-cropper'
import 'vue-advanced-cropper/dist/style.css'

defineProps<{ src: string }>()
const emit = defineEmits<{
  cancel: []
  crop: [file: File]
}>()

const cropper = ref<{ getResult: () => { canvas: HTMLCanvasElement | null } } | null>(null)

function confirmCrop() {
  const canvas = cropper.value?.getResult().canvas
  if (!canvas) return
  canvas.toBlob((blob) => {
    if (blob) emit('crop', new File([blob], 'food-photo.jpg', { type: 'image/jpeg' }))
  }, 'image/jpeg', 0.92)
}
</script>

<template>
  <div class="detail-backdrop crop-backdrop" role="dialog" aria-modal="true" aria-label="Crop image" @click.self="emit('cancel')">
    <form class="crop-dialog" @submit.prevent="confirmCrop">
      <button type="button" class="detail-close" aria-label="Cancel crop" @click="emit('cancel')">×</button>
      <h2>Crop picture</h2>
      <p class="crop-help">Resize and drag the frame to choose a 16:9 part of the image.</p>
      <Cropper
        ref="cropper"
        class="cropper"
        :src="src"
        :stencil-props="{ aspectRatio: 16 / 9 }"
        :canvas="true"
        :check-orientation="true"
      />
      <div class="crop-actions">
        <button type="button" class="text-button" @click="emit('cancel')">Cancel</button>
        <button class="auth-button" type="submit">Use this crop</button>
      </div>
    </form>
  </div>
</template>
