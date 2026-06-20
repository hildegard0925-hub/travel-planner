const STORAGE_KEY = 'jellytravel_data'

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
 */
export function saveData(data) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        trips: data.trips || [],
        schedules: data.schedules || [],
        records: data.records || [],
        checklists: data.checklists || []
      })
    )
  } catch (err) {
    console.error('saveData 오류:', err)
  }
}

/**
 * 전체 초기화
 */
export function resetData() {
  localStorage.removeItem(STORAGE_KEY)
}

