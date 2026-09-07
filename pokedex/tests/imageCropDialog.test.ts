import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ImageCropDialog from '../components/ImageCropDialog.vue'

describe('ImageCropDialog', () => {
  it('emits cancel from the close control', async () => {
    const wrapper = mount(ImageCropDialog, {
      props: { src: 'blob:image' },
      global: {
        stubs: {
          Cropper: { template: '<div />' }
        }
      }
    })

    await wrapper.find('button[aria-label="Cancel crop"]').trigger('click')

    expect(wrapper.emitted('cancel')).toHaveLength(1)
  })

  it('emits a JPEG file from the crop canvas', async () => {
    const cropCanvas = {
      toBlob: (callback: BlobCallback) => callback(new Blob(['cropped'], { type: 'image/jpeg' }))
    }
    const wrapper = mount(ImageCropDialog, {
      props: { src: 'blob:image' },
      global: {
        stubs: {
          Cropper: {
            template: '<div />',
            methods: {
              getResult: () => ({ canvas: cropCanvas })
            }
          }
        }
      }
    })

    await wrapper.find('form').trigger('submit')

    const cropEvent = wrapper.emitted('crop')
    expect(cropEvent).toHaveLength(1)
    expect(cropEvent?.[0][0]).toMatchObject({ name: 'food-photo.jpg', type: 'image/jpeg' })
  })
})
