import exifr from 'exifr'

/**
 * 이미지 파일에서 EXIF 촬영 일시를 읽어옵니다.
 * @param {File} file
 * @returns {Date|null}
 */
export async function readPhotoDate(file) {
  try {
    const data = await exifr.parse(file, {
      pick: ['DateTimeOriginal', 'CreateDate', 'DateTime'],
    })
    if (!data) return null
    const raw = data.DateTimeOriginal || data.CreateDate || data.DateTime
    if (!raw) return null
    // exifr가 Date 객체로 반환하는 경우
    if (raw instanceof Date) return raw
    // 문자열 "2025:07:23 14:30:00" 파싱
    if (typeof raw === 'string') {
      const normalized = raw.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3')
      const d = new Date(normalized)
      return isNaN(d.getTime()) ? null : d
    }
    return null
  } catch {
    return null
  }
}
