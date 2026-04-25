import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { deleteRecordPhoto } from '../services/storage.js'

export function useRecords(tripId) {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tripId) return
    fetchRecords()
  }, [tripId])

  async function fetchRecords() {
    setLoading(true)
    const { data, error } = await supabase
      .from('records')
      .select('*')
      .eq('trip_id', tripId)
      .order('day_index')
      .order('start_time', { nullsFirst: false })
      .order('created_at')
    if (!error) setRecords(data || [])
    setLoading(false)
  }

  async function addRecord(values) {
    const { data, error } = await supabase
      .from('records')
      .insert({ ...values, trip_id: tripId })
      .select()
      .single()
    if (!error) setRecords(prev => [...prev, data].sort(byDayDate))
    return { data, error }
  }

  async function updateRecord(id, values) {
    const { data, error } = await supabase
      .from('records')
      .update(values)
      .eq('id', id)
      .select()
      .single()
    if (!error) setRecords(prev => prev.map(r => r.id === id ? data : r).sort(byDayDate))
    return { data, error }
  }

  async function deleteRecord(id) {
    try {
      /*
        1. 삭제할 record 찾기
      */

      const record =
        records.find(r => r.id === id)

      /*
        2. 사진 먼저 삭제
      */

      if (record?.photo_url) {
        await deleteRecordPhoto(
          record.photo_url
        )
      }

      /*
        3. DB 삭제
      */

      const { error } =
        await supabase
          .from('records')
          .delete()
          .eq('id', id)

      if (!error) {
        setRecords(prev =>
          prev.filter(r => r.id !== id)
        )
      }

      return { error }

    } catch (err) {
      console.error(err)
      return { error: err }
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
  const { data, error } = await supabase
    .from('records')
    .select('*')
    .eq('trip_id', tripId)

  if (error || !data) return

  for (const item of data) {
    const newKrw =
      Math.round(
        (item.cost_local || 0) *
        newRate
      )

    await supabase
      .from('records')
      .update({
        cost_krw: newKrw
      })
      .eq('id', item.id)
  }
}
