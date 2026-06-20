import { useState, useEffect } from 'react'
import { loadData, saveData } from '../services/storage.js'

export function useSchedules(tripId) {
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tripId) return
    fetchSchedules()
  }, [tripId])

  async function fetchSchedules() {

    setLoading(true)

    const data = loadData()

    const schedules =
      data.schedules
        .filter(
          s => s.trip_id === tripId
        )
        .sort(byDayTime)

    setSchedules(schedules)

    setLoading(false)

  }

  async function addSchedule(values) {

    const data = loadData()

    const newSchedule = {
      id: crypto.randomUUID(),
      trip_id: tripId,
      ...values
    }

    data.schedules.push(newSchedule)

    saveData(data)

    setSchedules(prev =>
      [...prev, newSchedule].sort(byDayTime)
    )

    return {
      data: newSchedule,
      error: null
    }

  }

  async function updateSchedule(id, values) {

    const data = loadData()

    data.schedules =
      data.schedules.map(s =>
        s.id === id
          ? {
              ...s,
              ...values
            }
          : s
      )

    saveData(data)

    setSchedules(prev =>
      prev
        .map(s =>
          s.id === id
            ? {
                ...s,
                ...values
              }
            : s
        )
        .sort(byDayTime)
    )

    return {
      data:
        data.schedules.find(
          s => s.id === id
        ),
      error: null
    }

  }

  async function deleteSchedule(id) {

    const data = loadData()

    data.schedules =
      data.schedules.filter(
        s => s.id !== id
      )

    saveData(data)

    setSchedules(prev =>
      prev.filter(
        s => s.id !== id
      )
    )

    return {
      error: null
    }

  }

  async function toggleDone(id, current) {
    return updateSchedule(id, { is_done: !current })
  }

  // 일차별로 그룹핑
  const byDay = schedules.reduce((acc, s) => {
    const key = s.day_index
    if (!acc[key]) acc[key] = []
    acc[key].push(s)
    return acc
  }, {})

  return {
    schedules,
    byDay,
    loading,
    addSchedule,
    updateSchedule,
    deleteSchedule,
    toggleDone
  }
}
export async function recalculateAllCosts(
  tripId,
  newRate
) {

  const data = loadData()

  data.schedules =
    data.schedules.map(item => {

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

function byDayTime(a, b) {
  if (a.day_index !== b.day_index) return a.day_index - b.day_index
  if (!a.start_time) return 1
  if (!b.start_time) return -1
  return a.start_time.localeCompare(b.start_time)
}
