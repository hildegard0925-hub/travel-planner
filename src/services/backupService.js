import JSZip from 'jszip'

const DB_NAME = 'jellytravel_photos'
const STORE_NAME = 'photos'

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)

    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME, {
        keyPath: 'id'
      })
    }

    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function getAllPhotos() {
  const db = await openDB()

  return new Promise((resolve, reject) => {

    const tx = db.transaction(STORE_NAME)
    const req = tx.objectStore(STORE_NAME).getAll()

    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)

  })
}

async function savePhotoRecord(photo) {

  const db = await openDB()

  return new Promise((resolve, reject) => {

    const tx = db.transaction(STORE_NAME, 'readwrite')

    tx.objectStore(STORE_NAME).put(photo)

    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)

  })

}

export async function exportBackup() {

  const zip = new JSZip()

  // 사진
  const photos = await getAllPhotos()

  const photoFolder = zip.folder('photos')

  for (const photo of photos) {

    photoFolder.file(
      `${photo.id}.jpg`,
      photo.blob
    )

  }

  const blob = await zip.generateAsync({
    type: 'blob'
  })

  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')

  const today =
    new Date()
      .toISOString()
      .slice(0, 10)

  a.href = url
  a.download =
    `jellytravel_photos_${today}.zip`

  a.click()

  URL.revokeObjectURL(url)
}

export async function importBackup(file) {

  try {

    // ZIP 백업
    const zip = await JSZip.loadAsync(file)

    // photos
    const photoFiles =
      Object.keys(zip.files)
        .filter(name =>
          name.startsWith('photos/')
        )

    for (const filename of photoFiles) {

      const blob =
        await zip.files[filename]
          .async('blob')

      const id =
        filename
          .replace('photos/', '')
          .replace('.jpg', '')

      await savePhotoRecord({
        id,
        blob
      })

    }

    return true

  } catch (err) {

    console.error(err)

    return false

  }

}