export async function compressImage(file, options = {}) {
  const {
    maxWidth = 1600,
    maxHeight = 1600,
    quality = 0.8,
  } = options

  return new Promise((resolve, reject) => {
    const img = new Image()

    img.onload = () => {
      let width = img.width
      let height = img.height

      // 비율 유지하면서 축소
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(
          maxWidth / width,
          maxHeight / height
        )

        width = width * ratio
        height = height * ratio
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')

      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('이미지 변환 실패'))
            return
          }

          const compressedFile = new File(
            [blob],
            file.name,
            {
              type: 'image/jpeg',
              lastModified: Date.now(),
            }
          )

          resolve(compressedFile)
        },
        'image/jpeg',
        quality
      )
    }

    img.onerror = reject

    img.src = URL.createObjectURL(file)
  })
}