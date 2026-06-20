import { useState, useEffect } from 'react'
import { loadData, saveData } from '../services/storage.js'

export function useRecords(tripId) {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tripId) return
    fetchRecords()
  }, [tripId])

  async function fetchRecords() {

    setLoading(true)

    const data = loadData()

    const records =
      data.records
        .filter(
          r => r.trip_id === tripId
        )
        .sort(byDayDate)

    setRecords(records)

    setLoading(false)

  }

  async function addRecord(values) {

    const data = loadData()

    const newRecord = {
      id: crypto.randomUUID(),
      trip_id: tripId,
      created_at: new Date().toISOString(),
      ...values
    }

    data.records.push(newRecord)

    saveData(data)

    setRecords(prev =>
      [...prev, newRecord].sort(byDayDate)
    )

    return {
      data: newRecord,
      error: null
    }

  }

  async function updateRecord(id, values) {

    const data = loadData()

    data.records =
      data.records.map(r =>
        r.id === id
          ? {
              ...r,
              ...values
            }
          : r
      )

    saveData(data)

    setRecords(prev =>
      prev
        .map(r =>
          r.id === id
            ? {
                ...r,
                ...values
              }
            : r
        )
        .sort(byDayDate)
    )

    return {
      data:
        data.records.find(
          r => r.id === id
        ),
      error: null
    }

  }

  async function deleteRecord(id) {

    try {

      const data = loadData()

      data.records =
        data.records.filter(
          r => r.id !== id
        )

      saveData(data)

      setRecords(prev =>
        prev.filter(
          r => r.id !== id
        )
      )

      return {
        error: null
      }

    } catch (err) {

      console.error(err)

      return {
        error: err
      }

    }

  }

  /**
   * 일정에서 기록으로 복사 (완료 체크 시)
   */
  async function copyFromSchedule(schedule) {
    // 이미 이 일정에서 복사된 기록이 있는지 확인
    const exists = records.find(r => r.schedule_id === schedule.id)
    if (exists) return { data: exists, error: null, alreadyExists: true }

    return addRecord({
      schedule_id: schedule.id,
      day_index: schedule.day_index,
      title: schedule.title,
      start_time: schedule.start_time || null,
      schedule_time: schedule.start_time || null,
      time_source: 'schedule',
      category: schedule.category,
      description: schedule.description,
      address: schedule.address,
      lat: schedule.lat,
      lng: schedule.lng,
      cost_local: schedule.cost_local || 0,
      cost_krw: schedule.cost_krw || 0,
      payment_method: schedule.payment_method || 'card',
      memo: schedule.memo,
    })
  }

  // 일차별 그룹
  const byDay = records.reduce((acc, r) => {
    const key = r.day_index
    if (!acc[key]) acc[key] = []
    acc[key].push(r)
    return acc
  }, {})

  return { records, byDay, loading, addRecord, updateRecord, deleteRecord, copyFromSchedule, refresh: fetchRecords }
}

function byDayDate(a, b) {
  if (a.day_index !== b.day_index) return a.day_index - b.day_index
  const da = a.actual_datetime ? new Date(a.actual_datetime) : new Date(a.created_at)
  const db = b.actual_datetime ? new Date(b.actual_datetime) : new Date(b.created_at)
  return da - db
}

export async function recalculateAllRecordCosts(
  tripId,
  newRate
) {

  const data = loadData()

  data.records =
    data.records.map(item => {

      if (
        item.trip_id !== tripId ||
        !item.cost_local
      ) {
        return item
      }

      return {
        ...item,
        cost_krw:
          Math.round(
            item.cost_local * newRate
          )
      }

    })

  saveData(data)

}
