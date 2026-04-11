import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

export function useChecklist(tripId) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (tripId) {
      fetchItems()
    }
  }, [tripId])

  async function fetchItems() {
    setLoading(true)

    const { data, error } = await supabase
      .from('checklists')
      .select('*')
      .eq('trip_id', tripId)
      .order('category')
      .order('created_at')

    if (!error) {
      setItems(data || [])
    }

    setLoading(false)
  }

  async function addDefaults(DEFAULT_ITEMS) {
    const rows = []

    for (const [cat, list] of Object.entries(DEFAULT_ITEMS)) {
      for (const item of list) {
        rows.push({
          trip_id: tripId,
          category: cat,
          item,
          is_checked: false
        })
      }
    }

    await supabase
      .from('checklists')
      .insert(rows)

    fetchItems()
  }

  async function toggle(id, checked) {
    await supabase
      .from('checklists')
      .update({ is_checked: !checked })
      .eq('id', id)

    setItems(prev =>
      prev.map(i =>
        i.id === id
          ? { ...i, is_checked: !checked }
          : i
      )
    )
  }

  async function addItem(text, category) {
    if (!text.trim()) return

    const { data } = await supabase
      .from('checklists')
      .insert({
        trip_id: tripId,
        category,
        item: text.trim()
      })
      .select()
      .single()

    if (data) {
      setItems(prev => [...prev, data])
    }
  }

  async function deleteItem(id) {
    await supabase
      .from('checklists')
      .delete()
      .eq('id', id)

    setItems(prev =>
      prev.filter(i => i.id !== id)
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