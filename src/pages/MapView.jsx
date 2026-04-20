import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { Map, AdvancedMarker, Polyline, useMap } from '@vis.gl/react-google-maps'
import { useTrip } from '../hooks/useTrips.js'
import { useSchedules } from '../hooks/useSchedules.js'
import { useGeolocation } from '../hooks/useGeolocation.js'
import { addDays, format } from 'date-fns'
import { ko } from 'date-fns/locale'

const CAT_COLOR = {
  food: '#d4622a', transport: '#2a6dd4', shopping: '#9b2ad4',
  activity: '#2a9d6d', lodging: '#d4972a', etc: '#6b6560',
}

export default function MapView() {
  const { tripId } = useParams()
  const navigate = useNavigate()
  const { trip } = useTrip(tripId)
  const { schedules, byDay } = useSchedules(tripId)
  const {
    position,
    heading,
    watching,
    startWatch,
    stopWatch,
    error
  } = useGeolocation()
  const [selectedDay, setSelectedDay] = useState(0) // 기본: 1일차
  const location = useLocation()
  const params = new URLSearchParams(location.search)

  const focusLat = params.get('lat')
  const focusLng = params.get('lng')
  const focusDay = params.get('day')
  useEffect(() => {
    if (focusDay !== null) {
      setSelectedDay(Number(focusDay))
    }
  }, [focusDay])

  const [selectedItem, setSelectedItem] = useState(null)

  if (!trip) return null

  const totalDays = Math.ceil((new Date(trip.end_date) - new Date(trip.start_date)) / 86400000) + 1
  const displayItems = (selectedDay === null ? schedules : (byDay[selectedDay] || []))
    .filter(s =>
      s.lat !== null &&
      s.lng !== null &&
      !isNaN(Number(s.lat)) &&
      !isNaN(Number(s.lng))
    )

  const isValidFocus =
    focusLat !== null &&
    focusLng !== null &&
    !isNaN(Number(focusLat)) &&
    !isNaN(Number(focusLng))

  useEffect(() => {
      if (!isValidFocus) return
      if (displayItems.length === 0) return

      const found = displayItems.find(
        s =>
          String(s.lat) === String(focusLat) &&
          String(s.lng) === String(focusLng)
      )

      if (found && selectedItem?.id !== found.id) {
        setSelectedItem(found)
      }
    }, [displayItems, focusLat, focusLng])

  const defaultCenter =
    isValidFocus
      ? {
          lat: Number(focusLat),
          lng: Number(focusLng),
        }
      : displayItems.length > 0
        ? {
            lat: Number(displayItems[0].lat),
            lng: Number(displayItems[0].lng),
          }
        : {
          lat: 35.1796,
          lng: 129.0756,
        }

    

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      <div className="top-header">
        <button className="btn-ghost" onClick={() => navigate(`/trip/${tripId}`)}>←</button>
        <h1>지도</h1>
        <button onClick={watching ? stopWatch : startWatch}
          style={{
            padding: '6px 12px', borderRadius: 999, fontSize: 12,
            background: watching ? 'var(--accent)' : 'var(--bg2)',
            color: watching ? '#fff' : 'var(--text2)',
            border: 'none', cursor: 'pointer',
          }}>
          {watching ? '📍 추적 중' : '📍 내 위치'}
        </button>
      </div>

      {/* 일차 필터 */}
      <div style={{
        display: 'flex', overflowX: 'auto', padding: '5px 12px', gap: 6,
        background: 'var(--surface)', borderBottom: '1px solid var(--border)',
        scrollbarWidth: 'none',
      }}>
        {Array.from({ length: totalDays }, (_, i) => (
          <button key={i} onClick={() => setSelectedDay(i)}
            style={pillStyle(selectedDay === i)}>
            {i + 1}일차
          </button>
        ))}

        <button onClick={() => setSelectedDay(null)}
          style={pillStyle(selectedDay === null)}>
          전체
        </button>
      </div>

      {/* 지도 */}
      <div style={{ flex: 1, position: 'relative' }}>
        {error && (
          <div style={{
            position: 'absolute',
            top: 70,
            left: 16,
            right: 16,
            padding: 10,
            background: '#ffe0e0',
            color: '#c62828',
            fontSize: 12,
            borderRadius: 8,
            zIndex: 20
          }}>
            위치 오류: {error}
          </div>
        )}
        <Map
          key={`${defaultCenter.lat}-${defaultCenter.lng}`}
          center={defaultCenter}
          defaultZoom={14}
          mapId="travel-planner-map"
          style={{ width: '100%', height: '100%' }}
          gestureHandling="greedy"
          disableDefaultUI={false}
          clickableIcons={false}
        >
          {/* 현재 위치 */}
          {position && (
            <AdvancedMarker position={position}>
              <div style={{
                width: 0,
                height: 0,
                borderLeft: '10px solid transparent',
                borderRight: '10px solid transparent',
                borderBottom: '20px solid #2a6dd4',
                transform: `rotate(${heading || 0}deg)`,
                transformOrigin: 'center',
              }} />
            </AdvancedMarker>
          )}
          {displayItems.length > 1 && (
            <Polyline
              path={displayItems.map(item => ({
                lat: item.lat,
                lng: item.lng,
              }))}
              options={{
                strokeColor: '#2a6dd4',
                strokeOpacity: 0.8,
                strokeWeight: 4,
              }}
            />
          )}
          <MoveToMyLocation
            position={position}
            watching={watching}
          />
          {/* 일정 핀 */}
          {displayItems.map((item, idx) => {
            const pos = offsetPosition(displayItems, item, idx)

            return (
              <AdvancedMarker key={item.id}
                position={pos}
                onClick={() => setSelectedItem(item === selectedItem ? null : item)}
              >
                <div style={{
                  background: CAT_COLOR[item.category] ?? '#6b6560',
                  color: '#fff',
                  borderRadius: '50% 50% 50% 0',
                  transform: 'rotate(-45deg)',
                  width: 32, height: 32,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(0,0,0,.25)',
                  border: '2px solid white',
                  cursor: 'pointer',
                }}>
                  <span style={{ transform: 'rotate(45deg)', fontSize: 13, fontWeight: 700 }}>
                    {idx + 1}
                  </span>
                </div>
              </AdvancedMarker>
            )
          })}
        </Map>

        {/* 선택된 장소 카드 */}
        {selectedItem && (
          <div className="card" style={{
            position: 'absolute', bottom: 'calc(var(--nav-h) + env(safe-area-inset-bottom) + 2px)', left: 12, right: 12,
            padding: 10, zIndex: 10,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                
                <div style={{ fontWeight: 500 }}>{displayItems.findIndex(i => i.id === selectedItem.id) + 1}번 {selectedItem.title}</div>
                {selectedItem.address && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{selectedItem.address}</div>}
                {selectedItem.start_time && <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 0 }}>{selectedItem.start_time?.slice(0, 5)}</div>}
              </div>
              <button onClick={() => setSelectedItem(null)} style={{ fontSize: 18, color: 'var(--text3)', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
            </div>
            
          </div>
        )}
      </div>
    </div>
  )
}
function offsetPosition(items, item, index) {
  const offset = 0.00015

  // 같은 좌표를 가진 항목들 찾기
  const sameLocationItems = items.filter(
    i => i.lat === item.lat && i.lng === item.lng
  )

  // 하나뿐이면 이동 없음
  if (sameLocationItems.length <= 1) {
    return {
      lat: item.lat,
      lng: item.lng,
    }
  }

  // 같은 위치 내에서 몇 번째인지 계산
  const sameIndex = sameLocationItems.findIndex(i => i.id === item.id)

  return {
    lat: Number(item.lat) + offset * sameIndex,
    lng: Number(item.lng) + offset * sameIndex,
  }
}
function MoveToMyLocation({ position, watching }) {
  const map = useMap()

  if (!map || !position || !watching) return null

  map.panTo(position)

  return null
}
const pillStyle = (active) => ({
  flexShrink: 0,
  padding: '4px 12px',
  borderRadius: 999,
  fontSize: 12,
  cursor: 'pointer',
  background: active ? 'var(--accent)' : 'var(--bg2)',
  color: active ? '#fff' : 'var(--text2)',
  border: 'none',
  whiteSpace: 'nowrap',
})
