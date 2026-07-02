import { queueCloudSync } from './syncService.js'

const STORAGE_KEY = 'jellytravel_data'
const UPDATED_AT_KEY = 'jellytravel_updated_at'

const DEFAULT_DATA = {
  trips: [],
  schedules: [],
  records: [],
  checklists: []
}

/**
 * 전체 데이터 읽기
 */
export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)

    if (!raw) {
      return structuredClone(DEFAULT_DATA)
    }

    const data = JSON.parse(raw)

    return {
      trips: data.trips || [],
      schedules: data.schedules || [],
      records: data.records || [],
      checklists: data.checklists || []
    }
  } catch (err) {
    console.error('loadData 오류:', err)

    return structuredClone(DEFAULT_DATA)
  }
}

/**
 * 전체 데이터 저장
 * 로컬 저장은 즉시, Cloud 저장은 디바운스 처리(queueCloudSync)
 */
export function saveData(data, sync = true) {

  const clean = {
    trips: data.trips || [],
    schedules: data.schedules || [],
    records: data.records || [],
    checklists: data.checklists || []
  }

  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(clean)
    )

    localStorage.setItem(
      UPDATED_AT_KEY,
      new Date().toISOString()
    )
  } catch (err) {
    console.error('saveData 오류:', err)
    return
  }

    if (sync) {
      queueCloudSync(clean)
    }
  }

/**
 * 로컬 데이터의 마지막 수정 시각
 * 앱 실행 시 syncService.checkAndPull()에 전달용
 */
export function getLocalUpdatedAt() {
  return localStorage.getItem(UPDATED_AT_KEY)
}

/**
 * 전체 초기화
 */
export function resetData() {
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem(UPDATED_AT_KEY)
}