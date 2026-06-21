import { useState, useEffect } from 'react'
import { loadData, saveData } from '../services/storage.js'
import { useShare } from '../contexts/ShareContext'

export function useChecklist(tripId) {

  const sharedData = useShare()

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {

    if (!tripId && !sharedData) return

    fetchItems()

  }, [tripId, sharedData])

  async function fetchItems() {

    setLoading(true)

    const data =
      sharedData || loadData()

    const items =
      sharedData
        ? (data.checklists || []).sort((a, b) => {

            if (a.category !== b.category) {
              return a.category.localeCompare(b.category)
            }

            return new Date(a.created_at) - new Date(b.created_at)

          })
        : (data.checklists || [])
            .filter(
              item => item.trip_id === tripId
            )
            .sort((a, b) => {

              if (a.category !== b.category) {
                return a.category.localeCompare(b.category)
              }

              return new Date(a.created_at) - new Date(b.created_at)

            })

    setItems(items)

    setLoading(false)

  }

  async function addDefaults(DEFAULT_ITEMS) {

    const data = loadData()

    const rows = []

    for (const [cat, list] of Object.entries(DEFAULT_ITEMS)) {

      for (const item of list) {

        rows.push({
          id: crypto.randomUUID(),
          trip_id: tripId,
          category: cat,
          item,
          is_checked: false,
          created_at: new Date().toISOString()
        })

      }

    }

    data.checklists.push(...rows)

    saveData(data)

    fetchItems()

  }

  async function toggle(id, checked) {

    const data = loadData()

    data.checklists =
      data.checklists.map(i =>
        i.id === id
          ? {
              ...i,
              is_checked: !checked
            }
          : i
      )

    saveData(data)

    setItems(prev =>
      prev.map(i =>
        i.id === id
          ? {
              ...i,
              is_checked: !checked
            }
          : i
      )
    )

  }

  async function addItem(text, category) {

    if (!text.trim()) return

    const data = loadData()

    const newItem = {
      id: crypto.randomUUID(),
      trip_id: tripId,
      category,
      item: text.trim(),
      is_checked: false,
      created_at: new Date().toISOString()
    }

    data.checklists.push(newItem)

    saveData(data)

    setItems(prev => [...prev, newItem])

  }

  async function deleteItem(id) {

    const data = loadData()

    data.checklists =
      data.checklists.filter(
        i => i.id !== id
      )

    saveData(data)

    setItems(prev =>
      prev.filter(
        i => i.id !== id
      )
    )

  }

  return {
    items,
    loading,
    fetchItems,
    addDefaults,
    toggle,
    addItem,
    deleteItem
  }
}