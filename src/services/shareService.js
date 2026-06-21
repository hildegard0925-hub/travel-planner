import { loadData } from './storage'

const API_URL =
  'https://jellytravel-share.the-jelly-atelier.workers.dev'

export const APP_URL =
  'https://sweetjelly-travel-planner.vercel.app'

export async function createShare(data) {

  const response = await fetch(
    `${API_URL}/share`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    }
  )

  if (!response.ok) {
    throw new Error('공유 생성 실패')
  }

  return response.json()
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

  const response = await fetch(
    `${API_URL}/share/${trip.share_code}`,
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

}