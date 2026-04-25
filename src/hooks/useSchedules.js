import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

export function useSchedules(tripId) {
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tripId) return
    fetchSchedules()
  }, [tripId])

  async function fetchSchedules() {
    setLoading(true)
    const { data, error } = await supabase
      .from('schedules')
      .select('*')
      .eq('trip_id', tripId)
      .order('day_index')
      .order('start_time')
    if (!error) setSchedules(data)
    setLoading(false)
  }

  async function addSchedule(values) {
    const { data, error } = await supabase
      .from('schedules')
      .insert({ ...values, trip_id: tripId })
      .select()
      .single()
    if (!error) setSchedules(prev => [...prev, data].sort(byDayTime))
    return { data, error }
  }

  async function updateSchedule(id, values) {
    const { data, error } = await supabase
      .from('schedules')
      .update(values)
      .eq('id', id)
      .select()
      .single()
    if (!error) setSchedules(prev =>
      prev.map(s => s.id === id ? data : s).sort(byDayTime))
    return { data, error }
  }

  async function deleteSchedule(id) {
    const { error } = await supabase.from('schedules').delete().eq('id', id)
    if (!error) setSchedules(prev => prev.filter(s => s.id !== id))
    return { error }
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
export async function recalculateAllCosts(tripId, newRate) {
    const { data, error } = await supabase
      .from('schedules')
      .select('*')
      .eq('trip_id', tripId)

    if (error || !data) return

    for (const item of data) {
      if (
        item.cost_local === null ||
        item.cost_local === undefined ||
        item.cost_local === 0
      ) {
        continue
      }

      const newKrw =
        Math.round(item.cost_local * newRate)

      await supabase
        .from('schedules')
        .update({ cost_krw: newKrw })
        .eq('id', item.id)
    }
  }

function byDayTime(a, b) {
  if (a.day_index !== b.day_index) return a.day_index - b.day_index
  if (!a.start_time) return 1
  if (!b.start_time) return -1
  return a.start_time.localeCompare(b.start_time)
}
