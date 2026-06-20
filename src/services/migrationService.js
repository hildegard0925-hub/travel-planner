import { saveData } from './storage'
import { savePhoto } from './photoStorage'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

async function fetchTable(table) {

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/${table}?select=*`,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`
      }
    }
  )

  if (!res.ok) {
    throw new Error(`${table} 불러오기 실패`)
  }

  return await res.json()
}

async function migratePhotos(records) {

  let count = 0

  for (const record of records) {

    if (!record.photo_url) continue

    try {

      const response = await fetch(record.photo_url)

      if (!response.ok) continue

      const blob = await response.blob()

      const file = new File(
        [blob],
        'photo.jpg',
        {
          type: blob.type
        }
      )

      const photoId = await savePhoto(file)

      record.photo_id = photoId

      delete record.photo_url

      count++

    } catch (err) {

      console.error(
        '사진 이관 실패:',
        record.id,
        err
      )

    }

  }

  return count
}

export async function migrateFromSupabase() {

  try {

    const trips =
      await fetchTable('trips')

    const schedules =
      await fetchTable('schedules')

    const records =
      await fetchTable('records')

    const checklists =
      await fetchTable('checklists')

    const photoCount =
      await migratePhotos(records)

    saveData({
      trips,
      schedules,
      records,
      checklists
    })

    return {
      success: true,
      photoCount
    }

  } catch (err) {

    console.error(err)

    return {
      success: false,
      error: err.message
    }

  }

}