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

export async function savePhoto(file) {

  const db = await openDB()

  const id = crypto.randomUUID()

  return new Promise((resolve, reject) => {

    const tx = db.transaction(STORE_NAME, 'readwrite')

    tx.objectStore(STORE_NAME).put({
      id,
      blob: file
    })

    tx.oncomplete = () => resolve(id)
    tx.onerror = () => reject(tx.error)

  })
}

export async function getPhoto(id) {

  const db = await openDB()

  return new Promise((resolve, reject) => {

    const tx = db.transaction(STORE_NAME)

    const req =
      tx.objectStore(STORE_NAME)
        .get(id)

    req.onsuccess = () =>
      resolve(req.result?.blob || null)

    req.onerror = () =>
      reject(req.error)

  })

}

export async function deletePhoto(id) {

  const db = await openDB()

  return new Promise((resolve, reject) => {

    const tx =
      db.transaction(
        STORE_NAME,
        'readwrite'
      )

    tx.objectStore(STORE_NAME)
      .delete(id)

    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)

  })

}
export async function getPhotoUrl(id) {

  const blob = await getPhoto(id)

  if (!blob) {
    return null
  }

  return URL.createObjectURL(blob)

}