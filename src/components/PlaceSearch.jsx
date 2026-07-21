import { useState, useRef } from 'react'

function PlaceSearch({ value, onChange, onSelect }) {
  const [suggestions, setSuggestions] = useState([])
  const [open, setOpen] = useState(false)
  const debounceRef = useRef(null)
  const sessionTokenRef = useRef(null) // ✅ Session Token 보관

  const getOrCreateToken = async () => {
    if (!sessionTokenRef.current) {
      const { AutocompleteSessionToken } = await window.google.maps.importLibrary('places')
      sessionTokenRef.current = new AutocompleteSessionToken()
    }
    return sessionTokenRef.current
  }

  const handleInput = (v) => {
    onChange(v)
    clearTimeout(debounceRef.current)
    if (!v.trim()) { setSuggestions([]); setOpen(false); return }

    // ✅ 300ms → 400ms (IME 입력 안정성)
    debounceRef.current = setTimeout(async () => {
      try {
        const { AutocompleteSuggestion } = await window.google.maps.importLibrary('places')
        const token = await getOrCreateToken() // ✅ 세션 토큰 주입
        const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: v,
          sessionToken: token, // ✅
        })
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
    }, 400)
  }

  const handleSelect = async (item) => {
    onChange(item.main)
    setOpen(false)
    setSuggestions([])
    try {
      const { Place } = await window.google.maps.importLibrary('places')
      const token = sessionTokenRef.current // ✅ 세션 종료용으로 동일 토큰 사용
      sessionTokenRef.current = null        // ✅ 선택 후 토큰 리셋 (다음 검색용)

      const place = new Place({ id: item.place_id })
      await place.fetchFields({
        fields: ['location', 'formattedAddress', 'displayName'],
        sessionToken: token, // ✅ 세션 종료
      })
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

export default PlaceSearch