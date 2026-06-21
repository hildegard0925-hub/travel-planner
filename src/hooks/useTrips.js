import { useState, useEffect } from 'react'
import { loadData, saveData } from '../services/storage.js'
import { useShare } from '../contexts/ShareContext'
import { recalculateAllCosts } from './useSchedules.js'
import { recalculateAllRecordCosts } from './useRecords.js'
import { updateTripShare } from '../services/shareService'

export function useTrips() {
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTrips()
  }, [])

  async function fetchTrips() {
    setLoading(true)

    const data = loadData()

    setTrips(
      [...data.trips].sort(
        (a, b) =>
          new Date(b.start_date) -
          new Date(a.start_date)
      )
    )

    setLoading(false)
  }

  async function createTrip(values) {

    const data = loadData()

    const newTrip = {
      id: crypto.randomUUID(),
      share_code: '',
      ...values
    }

    data.trips.unshift(newTrip)

    saveData(data)

    setTrips(prev => [newTrip, ...prev])

    return {
      data: newTrip,
      error: null
    }
  }

  async function updateTrip(id, values) {

    const cleanValues = {
      ...values,
      exchange_rate: Number(values.exchange_rate)
    }

    const data = loadData()

    data.trips = data.trips.map(t =>
      t.id === id
        ? {
            ...t,
            ...cleanValues
          }
        : t
    )

    saveData(data)

    setTrips(prev =>
      prev.map(t =>
        t.id === id
          ? {
              ...t,
              ...cleanValues
            }
          : t
      )
    )

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

    await updateTripShare(id)

    await fetchTrips()

    return {
      data: data.trips.find(t => t.id === id),
      error: null
    }

  }

  async function deleteTrip(id) {

    try {

      const data = loadData()

      data.trips =
        data.trips.filter(
          t => t.id !== id
        )

      data.schedules =
        data.schedules.filter(
          s => s.trip_id !== id
        )

      data.records =
        data.records.filter(
          r => r.trip_id !== id
        )

      data.checklists =
        data.checklists.filter(
          c => c.trip_id !== id
        )

      saveData(data)

      setTrips(prev =>
        prev.filter(
          t => t.id !== id
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
  async function updateTripShareCode(id, shareCode) {

    const data = loadData()

    data.trips = data.trips.map(t =>
      t.id === id
        ? {
            ...t,
            share_code: shareCode
          }
        : t
    )

    saveData(data)

    await fetchTrips()

  }

  return {
    trips,
    loading,
    createTrip,
    updateTrip,
    updateTripShareCode,
    deleteTrip,
    refresh: fetchTrips
  }
}

export function useTrip(tripId) {

  const sharedData = useShare()

  const [trip, setTrip] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {

    const data =
      sharedData || loadData()

    if (sharedData?.trip) {

      setTrip(sharedData.trip)
      setLoading(false)
      return

    }

    if (!tripId) {
      setLoading(false)
      return
    }

    const trip =
      data.trips.find(
        t => t.id === tripId
      )

    setTrip(trip || null)

    setLoading(false)

  }, [tripId, sharedData])

  return { trip, loading }
}
