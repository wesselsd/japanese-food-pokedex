import { expect, test } from '@playwright/test'

const cropFixture = {
  name: 'food-photo.svg',
  mimeType: 'image/svg+xml',
  buffer: Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
      <rect width="1200" height="675" fill="#f4d6a0"/>
      <circle cx="600" cy="337" r="240" fill="#df6f52"/>
      <circle cx="520" cy="270" r="45" fill="#fff3d6"/>
      <circle cx="680" cy="270" r="45" fill="#fff3d6"/>
      <path d="M470 390 Q600 500 730 390" fill="none" stroke="#fff3d6" stroke-width="24"/>
    </svg>
  `)
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Food Pokedex.' })).toBeVisible()
})

test('checks in a root food and persists unlocked variations', async ({ page }) => {
  const search = page.getByPlaceholder('Search foods...')
  await search.fill('sushi')
  await expect(page.locator('.food-card')).toHaveCount(1)

  await page.getByRole('button', { name: 'Mark eaten' }).click()
  await page.getByRole('button', { name: 'Save check-in' }).click()
  await expect(page.getByRole('dialog', { name: 'Check in food' })).toBeHidden()

  await search.fill('')
  await expect(page.getByText('23 variations awaiting a parent check-in.')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Uni gunkan' })).toBeVisible()

  await page.reload()

  await expect(page.getByRole('button', { name: 'Eaten again!' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Uni gunkan' })).toBeVisible()
})

test('crops, saves, selects, and removes an uploaded photo', async ({ page }) => {
  const search = page.getByPlaceholder('Search foods...')
  await search.fill('sushi')
  const foodCard = page.locator('.food-card')
  const photoInput = foodCard.locator('input[type="file"]')
  await photoInput.setInputFiles(cropFixture)

  await expect(page.getByRole('dialog', { name: 'Crop image' })).toBeVisible()
  await expect(page.locator('.cropper canvas')).toHaveCount(2)
  const useCrop = page.getByRole('button', { name: 'Use this crop' })
  await expect(useCrop).toBeEnabled()
  await useCrop.click()
  await expect(page.getByRole('dialog', { name: 'Crop image' })).toBeHidden()

  await foodCard.click()
  const detailDialog = page.getByRole('dialog', { name: 'Sushi details' })
  const uploadedPhoto = detailDialog.locator('.photo-choice').filter({ hasText: 'Uploaded' })
  await expect(uploadedPhoto).toBeVisible()
  await expect(uploadedPhoto).toHaveClass(/selected/)

  await page.reload()
  await page.getByPlaceholder('Search foods...').fill('sushi')
  await page.locator('.food-card').click()
  const reloadedDetailDialog = page.getByRole('dialog', { name: 'Sushi details' })
  await expect(reloadedDetailDialog.locator('.photo-choice').filter({ hasText: 'Uploaded' })).toBeVisible()

  await reloadedDetailDialog.getByRole('button', { name: 'Original' }).click()
  await expect(reloadedDetailDialog.locator('.photo-choice').filter({ hasText: 'Original' })).toHaveClass(/selected/)
  await reloadedDetailDialog.getByRole('button', { name: 'Remove uploaded image' }).click()
  await expect(reloadedDetailDialog.getByRole('button', { name: 'Remove uploaded image' })).toBeHidden()
  await expect(reloadedDetailDialog.locator('.photo-choice').filter({ hasText: 'Uploaded' })).toBeHidden()
})
