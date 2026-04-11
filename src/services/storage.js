import { supabase } from '../lib/supabase.js'

export async function uploadSchedulePhoto(file, tripId, scheduleId) {
  try {
    if (!file) return null
    const ext = file.name.split('.').pop()
    const path = `${tripId}/${scheduleId}.${ext}`
    const { error } = await supabase.storage.from('schedule-photos').upload(path, file, { upsert: true })
    if (error) { console.error('업로드 실패:', error.message); return null }
    const { data: { publicUrl } } = supabase.storage.from('schedule-photos').getPublicUrl(path)
    return publicUrl
  } catch (err) {
    console.error('사진 업로드 오류:', err)
    return null
  }
}

/**
 * 기록 사진 업로드
 * Supabase Storage → record-photos 버킷 (Public)
 */
export async function uploadRecordPhoto(file, tripId, recordId) {
  try {
    if (!file) return null
    const ext = file.name.split('.').pop().toLowerCase()
    const path = `${tripId}/${recordId}_${Date.now()}.${ext}`
    const { error } = await supabase.storage
      .from('record-photos')
      .upload(path, file, { upsert: true, contentType: file.type })
    if (error) { console.error('기록 사진 업로드 실패:', error.message); return null }
    const { data: { publicUrl } } = supabase.storage.from('record-photos').getPublicUrl(path)
    return publicUrl
  } catch (err) {
    console.error('기록 사진 업로드 오류:', err)
    return null
  }
}
export async function deleteRecordPhoto(photoUrl) {
  if (!photoUrl) return

  try {
    // URL → 파일 경로 추출
    // 예:
    // https://xxx.supabase.co/storage/v1/object/public/record-photos/abc/123.jpg
    // →
    // abc/123.jpg

    const url = new URL(photoUrl)

    const pathParts = url.pathname.split('/record-photos/')

    if (pathParts.length < 2) {
      console.error('파일 경로 추출 실패')
      return
    }

    const filePath = pathParts[1]

    console.log('삭제 시도:', filePath)

    const { error } = await supabase.storage
      .from('record-photos')
      .remove([filePath])

    if (error) {
      console.error('사진 삭제 실패:', error.message)
    } else {
      console.log('사진 삭제 성공')
    }

  } catch (err) {
    console.error('사진 삭제 오류:', err)
  }
}