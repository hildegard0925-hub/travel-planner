import { useState, useRef } from 'react'

const CATEGORIES = [
  { value: 'food', label: '🍜 식사' },
  { value: 'transport', label: '🛣️ 이동' },
  { value: 'shopping', label: '🛍️ 쇼핑' },
  { value: 'activity', label: '🧭 관광' },
  { value: 'lodging', label: '💒 숙소' },
  { value: 'etc', label: '📌 기타' },
]
const TRANSPORTS = ['도보', '지하철', '버스', '택시', '비행기', '자차']

// 10분 단위 시간 목록 생성
const TIME_OPTIONS = []

for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 30) {
    const hh = String(h).padStart(2, '0')
    const mm = String(m).padStart(2, '0')
    TIME_OPTIONS.push(`${hh}:${mm}`)
  }
}

export default function AddScheduleModal({ trip, dayIndex, initial, onClose, onSave }) {
  const [form, setForm] = useState({
    title: initial?.title ?? '',
    category: initial?.category ?? 'food',
    start_time: initial?.start_time?.slice(0, 5) ?? '',
    end_time: initial?.end_time?.slice(0, 5) ?? '',
    place_id: initial?.place_id ?? '',
    address: initial?.address ?? '',
    lat: initial?.lat ?? null,
    lng: initial?.lng ?? null,
    cost_local: initial?.cost_local ?? '',
    cost_krw: initial?.cost_krw ?? '',
    payment_method: initial?.payment_method ?? 'card',
    transport: initial?.transport ?? '',
    transport_minutes: initial?.transport_minutes ?? '',
    memo: initial?.memo ?? '',
    day_index: dayIndex,
    description: initial?.description || '',
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // 현지 비용 입력 시 원화 자동 계산
  const handleCostLocal = (v) => {
    set('cost_local', v)
    if (trip.exchange_rate && v) {
      set('cost_krw', Math.round(parseFloat(v) * trip.exchange_rate))
    }
  }

  const handleSave = async () => {
    if (!form.title) return

    setSaving(true)

    const { error } = await onSave({
      ...form,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      cost_local: parseFloat(form.cost_local) || 0,
      cost_krw: parseInt(form.cost_krw) || 0,
      transport_minutes: parseInt(form.transport_minutes) || null,
      lat: form.lat || null,
      lng: form.lng || null,
    })

    setSaving(false)

    if (error) {
      console.error(error)
      alert('저장 실패: ' + error.message)
      return
    }

    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, marginBottom: 16 }}>
          {initial ? '일정 수정' : '일정 추가'}
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* 장소 검색 */}
          <PlaceSearch value={form.title} onSelect={(p) => {
            set('title', p.name)
            set('address', p.address)
            set('place_id', p.place_id)
            set('lat', p.lat)
            set('lng', p.lng)
          }} onChange={(v) => set('title', v)} />

          {/* 카테고리 */}
          <div className="form-group">
            <label className="form-label">카테고리</label>
            <div
              style={{
                display: 'flex',
                flexWrap: 'nowrap',   // 한 줄 고정
                gap: 4
              }}
            >
              {CATEGORIES.map(c => (
                <button key={c.value} onClick={() => set('category', c.value)}
                  style={{
                    flex: 1,                 // 균등 분배 (핵심)
                    padding: '4px 0',        // 좌우 padding 제거
                    borderRadius: 999,
                    fontSize: 11,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    textAlign: 'center',
                    background: form.category === c.value ? 'var(--accent)' : 'var(--bg2)',
                    color: form.category === c.value ? '#fff' : 'var(--text2)',
                    border: 'none',
                  }}>{c.label}</button>
              ))}
            </div>
          </div>

          {/* 시간 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="form-group">
              <label className="form-label">시작 시간</label>
              <select
                className="form-input"
                value={form.start_time}
                onChange={e => set('start_time', e.target.value)}
              >
                <option value="">선택</option>

                {TIME_OPTIONS.map(t => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">종료 시간</label>
              <select
                className="form-input"
                value={form.end_time}
                onChange={e => set('end_time', e.target.value)}
              >
                <option value="">선택</option>

                {TIME_OPTIONS.map(t => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 비용 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="form-group">
              <label className="form-label">금액 ({trip.currency})</label>
              <input type="number" className="form-input" placeholder="0" value={form.cost_local}
                onChange={e => handleCostLocal(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">원화 (₩)</label>
              <input type="number" className="form-input" placeholder="0" value={form.cost_krw}
                onChange={e => set('cost_krw', e.target.value)} />
            </div>
          </div>

          {/* 결제 수단 */}
          <div className="form-group">
            <label className="form-label">결제 수단</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['card', 'cash'].map(m => (
                <button key={m} onClick={() => set('payment_method', m)}
                  style={{
                    flex: 1, padding: '8px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
                    background: form.payment_method === m ? 'var(--accent)' : 'var(--bg2)',
                    color: form.payment_method === m ? '#fff' : 'var(--text2)',
                    border: 'none',
                  }}>{m === 'card' ? '💳 카드' : '💵 현금'}</button>
              ))}
            </div>
          </div>

          {/* 이동 수단 */}
          <div className="form-group">
            <label className="form-label">이동 수단</label>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: 6,
                alignItems: 'center'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  gap: 6,
                  flexWrap: 'nowrap'
                }}
              >
                {TRANSPORTS.map(t => (
                  <button
                    key={t}
                    onClick={() => set('transport', form.transport === t ? '' : t)}
                    style={{
                      flex: 1,
                      padding: '4px 6px',
                      borderRadius: 999,
                      fontSize: 11,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      background: form.transport === t ? 'var(--accent2)' : 'var(--bg2)',
                      color: form.transport === t ? '#fff' : 'var(--text2)',
                      border: 'none',
                      minWidth: 0
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {form.transport && (
                <input
                  type="number"
                  className="form-input"
                  placeholder="분"
                  value={form.transport_minutes}
                  onChange={e => set('transport_minutes', e.target.value)}
                  style={{
                    width: 50,
                    padding: '4px 6px',
                    fontSize: 12
                  }}
                />
              )}
            </div>
          </div>
          {/* 내용 */}
          <div className="form-group">
            <label className="form-label">내용</label>
            <textarea
              className="form-input"
              rows={1}
              value={form.description}
              onChange={e => set('description', e.target.value)}
              style={{
                resize: 'none',
                overflow: 'hidden',
                lineHeight: '1.4',
                minHeight: 38
              }}
              onInput={e => {
                e.target.style.height = 'auto'
                e.target.style.height = e.target.scrollHeight + 'px'
              }}
            />
          </div>
          {/* 메모 */}
          <div className="form-group">
            <label className="form-label">메모</label>
            <textarea
              className="form-input"
              rows={1}
              value={form.memo}
              onChange={e => set('memo', e.target.value)}
              style={{
                resize: 'none',
                overflow: 'hidden',
                lineHeight: '1.4',
                minHeight: 38
              }}
              onInput={e => {
                e.target.style.height = 'auto'
                e.target.style.height = e.target.scrollHeight + 'px'
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>취소</button>
          <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSave} disabled={saving || !form.title}>
            {saving ? '저장 중...' : initial ? '수정 완료' : '일정 추가'}
          </button>
        </div>
      </div>
    </div>
  )
}

function PlaceSearch({ value, onChange, onSelect }) {
  const [suggestions, setSuggestions] = useState([])
  const [open, setOpen] = useState(false)
  const debounceRef = useRef(null)

  const handleInput = (v) => {
    onChange(v)
    clearTimeout(debounceRef.current)
    if (!v.trim()) { setSuggestions([]); setOpen(false); return }
    debounceRef.current = setTimeout(async () => {
      try {
        const { AutocompleteSuggestion } = await window.google.maps.importLibrary('places')
        const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({ input: v })
        const mapped = suggestions.map(s => ({
          place_id: s.placePrediction.placeId,
          main: s.placePrediction.mainText?.toString() ?? '',
          secondary: s.placePrediction.secondaryText?.toString() ?? '',
        }))
        setSuggestions(mapped)
        setOpen(mapped.length > 0)
      } catch {
        setSuggestions([])
      }
    }, 300)
  }

  const handleSelect = async (item) => {
    onChange(item.main)
    setOpen(false)
    setSuggestions([])
    try {
      const { Place } = await window.google.maps.importLibrary('places')
      const place = new Place({ id: item.place_id })
      await place.fetchFields({ fields: ['location', 'formattedAddress', 'displayName'] })
      onSelect({
        name: place.displayName ?? item.main,
        address: place.formattedAddress ?? item.secondary,
        place_id: item.place_id,
        lat: place.location.lat(),
        lng: place.location.lng(),
      })
    } catch {
      alert('장소 정보를 가져오지 못했습니다.')
    }
  }

  return (
    <div className="form-group" style={{ position: 'relative' }}>
      <label className="form-label">장소 / 활동명 *</label>
      <input
        className="form-input"
        placeholder="장소 검색 또는 직접 입력"
        value={value}
        onChange={e => handleInput(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <ul style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 9999,
          margin: '2px 0 0', padding: 0, listStyle: 'none',
          background: 'var(--bg1, #ffffff)', border: '1px solid var(--border)',
          borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,.12)', overflow: 'hidden',
        }}>
          {suggestions.map((s, i) => (
            <li key={s.place_id}>
              <button
                onMouseDown={() => handleSelect(s)}
                style={{
                  width: '100%', padding: '9px 12px', textAlign: 'left',
                  background: 'none', border: 'none',
                  borderBottom: i < suggestions.length - 1 ? '1px solid var(--border)' : 'none',
                  cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 2,
                }}
              >
                <span style={{ fontSize: 13, color: 'var(--text1)', fontWeight: 500 }}>{s.main}</span>
                {s.secondary && <span style={{ fontSize: 11, color: 'var(--text3)' }}>{s.secondary}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}