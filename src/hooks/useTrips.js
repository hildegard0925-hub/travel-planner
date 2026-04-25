import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { recalculateAllCosts } from './useSchedules.js'
import { deleteRecordPhoto } from '../services/storage.js'
import {
  recalculateAllRecordCosts
} from './useRecords.js'

export function useTrips() {
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTrips()
  }, [])

  async function fetchTrips() {
    setLoading(true)

    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .order('start_date', { ascending: false })

    if (!error) setTrips(data)

    setLoading(false)
  }

  async function createTrip(values) {
    const { data, error } = await supabase
      .from('trips')
      .insert(values)
      .select()
      .single()

    if (!error) {
      setTrips(prev => [data, ...prev])
    }

    return { data, error }
  }

  async function updateTrip(id, values) {
    const cleanValues = {
      ...values,
      exchange_rate: Number(values.exchange_rate)
    }

    const { data, error } = await supabase
      .from('trips')
      .update(cleanValues)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('updateTrip error:', error)
      return { error }
    }

    // trips 상태 업데이트
    setTrips(prev =>
      prev.map(t =>
        t.id === id ? data : t
      )
    )

    // 환율 변경 시 비용 재계산
    if (cleanValues.exchange_rate) {
      await recalculateAllCosts(
        id,
        cleanValues.exchange_rate
      )

      await recalculateAllRecordCosts(
        id,
        cleanValues.exchange_rate
      )
    }

    // 현재 trip 화면 갱신 (중요)
    await fetchTrips()

    return { data }
  }

  async function deleteTrip(id) {
    try {
      // 1. 해당 여행의 기록 사진 목록 가져오기
      const { data: records } = await supabase
        .from('records')
        .select('photo_url')
        .eq('trip_id', id)

      // 2. 사진 파일 먼저 삭제
      if (records && records.length > 0) {
        for (const r of records) {
          if (r.photo_url) {
            await deleteRecordPhoto(r.photo_url)
          }
        }
      }

      // 3. 여행 삭제 (CASCADE로 schedules / records 자동 삭제됨)
      const { error } = await supabase
        .from('trips')
        .delete()
        .eq('id', id)

      if (!error) {
        setTrips(prev =>
          prev.filter(t => t.id !== id)
        )
      }

      return { error }

    } catch (err) {
      console.error(err)
      return { error: err }
    }
  }

  return { trips, loading, createTrip, updateTrip, deleteTrip, refresh: fetchTrips }
}

export function useTrip(tripId) {
  const [trip, setTrip] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tripId) return
    supabase.from('trips').select('*').eq('id', tripId).single()
      .then(({ data, error }) => {
        if (!error) setTrip(data)
        setLoading(false)
      })
  }, [tripId])

  return { trip, loading }
}
