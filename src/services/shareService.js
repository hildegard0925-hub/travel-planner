import { loadData } from './storage'
import { getPhoto } from './photoStorage'

const API_URL =
  'https://jellytravel-share.the-jelly-atelier.workers.dev'

export const APP_URL =
  'https://sweetjelly-travel-planner.vercel.app'

export async function createShare(data) {

  // 1. shareCode만 발급
  const codeResponse = await fetch(
    `${API_URL}/share/code`,
    {
      method: 'POST'
    }
  )

  if (!codeResponse.ok) {
    throw new Error('공유 코드 생성 실패')
  }

  const { code } = await codeResponse.json()

  try {

    // 2. 사진 업로드
    const photoIds = getUniquePhotoIds(data.records)

    for (const photoId of photoIds) {
      await uploadSharePhoto(code, photoId)
    }

    // 3. 모든 사진 업로드 성공 후 KV commit
    const response = await fetch(
      `${API_URL}/share/${code}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      }
    )

    if (!response.ok) {
      throw new Error('공유 데이터 저장 실패')
    }

    return response.json()

  } catch (error) {

    console.error(
      '공유 생성 실제 오류:',
      error
    )

    // 4. 생성 실패 → R2 사진 롤백
    try {

      await deleteSharePhotos(code)

    } catch (cleanupError) {

      console.error(
        '공유 생성 실패 후 사진 정리 실패:',
        cleanupError
      )
    }

    throw error
  }
}

function getUniquePhotoIds(records = []) {

  return [
    ...new Set(
      records
        .map(record => record.photo_id)
        .filter(Boolean)
    )
  ]
}

async function uploadSharePhoto(code, photoId) {

  const blob = await getPhoto(photoId)

  if (!blob) {
    throw new Error(
      `사진을 찾을 수 없습니다: ${photoId}`
    )
  }

  const response = await fetch(
    `${API_URL}/share/${code}/photos/${photoId}`,
    {
      method: 'POST',
      headers: {
        'Content-Type':
          blob.type || 'application/octet-stream'
      },
      body: blob
    }
  )

  if (!response.ok) {
    throw new Error(
      `사진 업로드 실패: ${photoId}`
    )
  }
}

async function deleteSharePhotos(code) {

  const response = await fetch(
    `${API_URL}/share/${code}/photos`,
    {
      method: 'DELETE'
    }
  )

  if (!response.ok) {
    throw new Error('공유 사진 정리 실패')
  }
}

export async function getShare(code) {

  const response = await fetch(
    `${API_URL}/share/${code}`
  )

  if (!response.ok) {
    throw new Error('공유 데이터 없음')
  }

  return response.json()
}

export async function deleteShare(code) {

  const response = await fetch(
    `${API_URL}/share/${code}`,
    {
      method: 'DELETE'
    }
  )

  if (!response.ok) {
    throw new Error('공유 삭제 실패')
  }

  return response.json()
}

export async function createTripShare(tripId) {

  const data = loadData()

  const trip =
    data.trips.find(
      t => t.id === tripId
    )

  // 이미 공유 중이면 기존 코드 재사용
  if (trip?.share_code) {
    return {
      code: trip.share_code
    }
  }

  const schedules =
    data.schedules.filter(
      s => s.trip_id === tripId
    )

  const records =
    data.records.filter(
      r => r.trip_id === tripId
    )

  const checklists =
    data.checklists.filter(
      c => c.trip_id === tripId
    )

  const result = await createShare({
    trip,
    schedules,
    records,
    checklists
  })

  return result
}

export async function updateTripShare(tripId) {

  const data = loadData()

  const trip =
    data.trips.find(
      t => t.id === tripId
    )

  if (!trip?.share_code) {
    return
  }

  const schedules =
    data.schedules.filter(
      s => s.trip_id === tripId
    )

  const records =
    data.records.filter(
      r => r.trip_id === tripId
    )

  const checklists =
    data.checklists.filter(
      c => c.trip_id === tripId
    )

  const code = trip.share_code

  try {

    // 1. 현재 여행의 사진을 먼저 R2에 업로드
    const photoIds = getUniquePhotoIds(records)

    for (const photoId of photoIds) {
      await uploadSharePhoto(code, photoId)
    }

    // 2. 모든 사진 업로드 성공 후 KV 갱신
    const response = await fetch(
      `${API_URL}/share/${code}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          trip,
          schedules,
          records,
          checklists
        })
      }
    )

    if (!response.ok) {
      throw new Error('공유 갱신 실패')
    }

    return response.json()

  } catch (error) {

    // 갱신 실패 시 기존 사진은 삭제하지 않는다.
    // 다음 정상 갱신에서 Worker가 orphan을 정리한다.
    throw new Error('공유 갱신 실패')
  }

}