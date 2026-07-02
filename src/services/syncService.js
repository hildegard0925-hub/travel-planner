const API_URL =
  'https://jellytravel-share.the-jelly-atelier.workers.dev'

const SYNC_KEY = import.meta.env.VITE_SYNC_KEY

console.log('SYNC_KEY =', SYNC_KEY)
const LAST_SYNCED_KEY = 'jellytravel_last_synced_at'

const DEBOUNCE_MS = 800

let debounceTimer = null

// --- 동기화 ID 관리 ---

export function getLastSyncedAt() {
  return localStorage.getItem(LAST_SYNCED_KEY)
}

function setLastSyncedAt(iso) {
  localStorage.setItem(LAST_SYNCED_KEY, iso)
}

// --- Cloud 통신 ---

export async function pushToCloud(data) {
  console.log('SYNC_KEY in pushToCloud =', SYNC_KEY)

  const updatedAt = new Date().toISOString()

  const response = await fetch(
    `${API_URL}/sync/${SYNC_KEY}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        updatedAt,
        data
      })
    }
  )

  if (!response.ok) {
    throw new Error('Cloud 저장 실패')
  }

  setLastSyncedAt(updatedAt)

  return updatedAt

}

export async function pullFromCloud() {

  const response = await fetch(
    `${API_URL}/sync/${SYNC_KEY}`
  )

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error('Cloud 조회 실패')
  }

  return response.json() // { updatedAt, data }

}

/**
 * 앱 실행 시 1회 호출
 * Cloud가 로컬보다 최신이면 data를 반환, 아니면 null
 */
export async function checkAndPull(localUpdatedAt) {

  const cloud = await pullFromCloud()

  if (!cloud) {
    return null
  }

  const cloudIsNewer =
    !localUpdatedAt ||
    new Date(cloud.updatedAt) > new Date(localUpdatedAt)

  if (cloudIsNewer) {
    setLastSyncedAt(cloud.updatedAt)
    return cloud.data
  }

  return null

}

// --- 디바운스된 자동 업로드 ---

/**
 * saveData() 내부에서 호출.
 * 짧은 시간에 여러 번 호출돼도 마지막 호출만 실제 전송된다.
 */
export function queueCloudSync(data) {

  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }

  debounceTimer = setTimeout(() => {

    pushToCloud(data).catch(err => {
      console.error('자동 동기화 실패:', err)
    })

  }, DEBOUNCE_MS)

}