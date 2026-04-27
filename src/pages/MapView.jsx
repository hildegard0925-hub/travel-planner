import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { Map, AdvancedMarker, Polyline, useMap } from '@vis.gl/react-google-maps'
import { useTrip } from '../hooks/useTrips.js'
import { useSchedules } from '../hooks/useSchedules.js'
import { useRecords } from '../hooks/useRecords.js'
import { useGeolocation } from '../hooks/useGeolocation.js'
import { addDays, format } from 'date-fns'
import { ko } from 'date-fns/locale'

const CAT_COLOR = {
  food: '#d4622a', transport: '#2a6dd4', shopping: '#9b2ad4',
  activity: '#2a9d6d', lodging: '#d4972a', etc: '#6b6560',
}
const CAT_LABEL = {
  food: '식사', transport: '이동', shopping: '쇼핑',
  activity: '관광', lodging: '숙소', etc: '기타',
}
export default function MapView() {
  const { tripId } = useParams()
  const navigate = useNavigate()
  const { trip } = useTrip(tripId)
  const { schedules, byDay } = useSchedules(tripId)
  const { records } = useRecords(tripId)
  const [selectedDay, setSelectedDay] = useState(0) // 기본: 1일차

  const photoRecords = (selectedDay === null
    ? records
    : records.filter(r => r.day_index === selectedDay)
  ).filter(r =>
    r.photo_url &&
    r.lat != null &&
    r.lng != null &&
    !isNaN(Number(r.lat)) &&
    !isNaN(Number(r.lng))
  )
  const {
    position,
    heading,
    watching,
    startWatch,
    stopWatch,
    error
  } = useGeolocation()
  
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
  useEffect(() => {
    if (focusLat && focusLng) {
      const found = schedules.find(
        s =>
          String(s.lat) === String(focusLat) &&
          String(s.lng) === String(focusLng)
      )

      if (found) {
        setSelectedItem(found)
      }
    }
  }, [focusLat, focusLng, schedules])
  const [selectedItem, setSelectedItem] = useState(null)
  const [fullPhoto, setFullPhoto] = useState(null)
  const [layer, setLayer] = useState('schedule') // 'schedule' | 'record' | 'all'

  if (!trip) return null

  const totalDays = Math.ceil((new Date(trip.end_date) - new Date(trip.start_date)) / 86400000) + 1
  const displayItems = (selectedDay === null ? schedules : (byDay[selectedDay] || []))
    .filter(s =>
      s.lat !== null &&
      s.lng !== null &&
      !isNaN(Number(s.lat)) &&
      !isNaN(Number(s.lng))
    )

  // place_id 또는 lat/lng 기준으로 그룹화
  const groupedItems = Object.values(
    displayItems.reduce((acc, item, idx) => {
      const key = item.place_id || `${item.lat},${item.lng}`
      if (!acc[key]) acc[key] = { ...item, indices: [] }
      acc[key].indices.push(idx + 1)
      return acc
    }, {})
  )

  const isValidFocus =
    focusLat !== null &&
    focusLng !== null &&
    !isNaN(Number(focusLat)) &&
    !isNaN(Number(focusLng))

  const allCoords = [
    ...schedules.filter(s => s.lat && s.lng),
    ...records.filter(r => r.lat && r.lng),
  ]

  const centerCoord =
    schedules.find(s => s.category === 'lodging' && s.lat && s.lng) // 숙소 우선
    ?? allCoords[0] // 없으면 첫 번째 좌표

  const defaultCenter =
    isValidFocus
      ? { lat: Number(focusLat), lng: Number(focusLng) }
      : centerCoord
        ? { lat: Number(centerCoord.lat), lng: Number(centerCoord.lng) }
        : { lat: 35.1796, lng: 129.0756 }

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

      {/* 일차 필터 + 레이어 토글 */}
      <div style={{
        display: 'flex', padding: '5px 12px', gap: 6,
        background: 'var(--surface)', borderBottom: '1px solid var(--border)',
      }}>
        {/* 일차 버튼 - 가로 스크롤 */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', flex: 1 }}>
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

        {/* 구분선 + 토글 고정 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <div style={{ width: 1, background: 'var(--border)', alignSelf: 'stretch', margin: '2px 4px 2px 0' }} />
          <button
            onClick={() => setLayer(l => l === 'schedule' ? 'record' : 'schedule')}
            style={pillStyle(true)}
          >
            {layer === 'schedule' ? '일정' : '기록'}
          </button>
        </div>
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
          defaultCenter={defaultCenter}
          defaultZoom={14}
          mapId="travel-planner-map"
          style={{ width: '100%', height: '100%' }}
          gestureHandling="greedy"
          disableDefaultUI={false}
          clickableIcons={false}
          onClick={() => setSelectedItem(null)}
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
          
          <MoveToMyLocation
            position={position}
            watching={watching}
          />
          <CenterOnLoad coord={!isValidFocus ? centerCoord : null} />

          {/* 일정 핀 */}
          {(layer === 'all' || layer === 'schedule') && groupedItems.map((item) => {
            return (
              <AdvancedMarker key={item.id}
                position={{ lat: Number(item.lat), lng: Number(item.lng) }}
                zIndex={item.id === selectedItem?.id ? 999999 : Math.round((90 - Number(item.lat)) * 1000)}
                onClick={() => setSelectedItem(item === selectedItem ? null : item)}
              >
                <div style={{
                  background: CAT_COLOR[item.category] ?? '#6b6560',
                  color: '#fff',
                  borderRadius: 999,
                  padding: '4px 8px',
                  display: 'flex', alignItems: 'center', gap: 4,
                  boxShadow: '0 2px 8px rgba(0,0,0,.25)',
                  border: '2px solid white',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{item.indices.join(', ')}</span>
                  <span style={{ fontSize: 11 }}>{CAT_LABEL[item.category] ?? '기타'}</span>
                </div>
              </AdvancedMarker>
            )
          })}
          
          {/* 사진 핀 (기록) */}
          {(layer === 'all' || layer === 'record') && photoRecords.map((record, idx) => {
            const pos = offsetPosition(photoRecords, record, idx, 0.00035)

            return (
              <AdvancedMarker
                key={`photo-${record.id}`}
                position={pos}
                zIndex={record.id === selectedItem?.id ? 999999 : Math.round((90 - Number(record.lat)) * 1000)}
                onClick={() => setSelectedItem(record)}
              >
                <div
                  onDoubleClick={(e) => {
                    e.stopPropagation()
                    setFullPhoto(record.photo_url)
                  }}
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: '50%',
                    border: '3px solid white',
                    overflow: 'hidden',
                    boxShadow: '0 2px 8px rgba(0,0,0,.35)',
                    cursor: 'pointer',
                  }}
                >
                  <img
                    src={record.photo_url}
                    alt={record.title}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                </div>
              </AdvancedMarker>
            )
          })}

        </Map>

        {/* 사진 풀스크린 */}
        {fullPhoto && (
          <div
            onClick={() => setFullPhoto(null)}
            style={{
              position: 'absolute', inset: 0, zIndex: 50,
              background: 'rgba(0,0,0,.85)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <img src={fullPhoto} alt="사진"
              style={{ maxWidth: '95%', maxHeight: '90%', borderRadius: 12, objectFit: 'contain' }} />
            <button onClick={() => setFullPhoto(null)}
              style={{
                position: 'absolute', top: 16, right: 16,
                background: 'rgba(255,255,255,.2)', border: 'none', color: '#fff',
                fontSize: 24, width: 40, height: 40, borderRadius: '50%', cursor: 'pointer',
              }}>×</button>
          </div>
        )}
        {/* 선택된 장소 카드 */}
        {selectedItem && (
          <div className="card" style={{
            position: 'absolute', bottom: 'calc(var(--nav-h) + env(safe-area-inset-bottom) + 2px)', left: 12, right: 12,
            padding: 10, zIndex: 10,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                
                <div style={{ fontWeight: 500 }}>
                  {selectedItem.photo_url
                    ? (selectedItem.start_time?.slice(0, 5) + ' ')
                    : selectedItem.indices
                      ? selectedItem.indices.join(', ') + '번 '
                      : (displayItems.findIndex(i => i.id === selectedItem.id) + 1) + '번 '
                  }
                  {selectedItem.title}
                </div>
                {selectedItem.address && (
                  <div
                    onClick={() => {
                      const origin = position
                        ? `${position.lat},${position.lng}`
                        : ''

                      if (selectedItem.lat && selectedItem.lng) {
                        window.open(
                          `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${selectedItem.lat},${selectedItem.lng}&travelmode=walking&dirflg=w`,
                          '_blank'
                        )
                      } else if (selectedItem.place_id) {
                        window.open(
                          `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${encodeURIComponent(selectedItem.title)}&destination_place_id=${selectedItem.place_id}&travelmode=walking&dirflg=w`,
                          '_blank'
                        )
                      } else {
                        window.open(
                          `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${encodeURIComponent(selectedItem.address)}&travelmode=walking&dirflg=w`,
                          '_blank'
                        )
                      }
                    }}
                    style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2, cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    {selectedItem.address}
                  </div>
                )}
                {selectedItem.start_time && <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 0 }}>{selectedItem.start_time?.slice(0, 5)}</div>}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {selectedItem.photo_url && (
                  <button onClick={() => setFullPhoto(selectedItem.photo_url)}
                    style={{ fontSize: 18, background: 'none', border: 'none', cursor: 'pointer' }}>📷</button>
                )}
                <button onClick={() => setSelectedItem(null)}
                  style={{ fontSize: 18, color: 'var(--text3)', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
              </div>
            </div>
            
          </div>
        )}
      </div>
    </div>
  )
}
function offsetPosition(items, item, index, offsetValue = 0.00015) {
  const offset = offsetValue

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

function CenterOnLoad({ coord }) {
  const map = useMap()
  const didCenter = useRef(false)

  useEffect(() => {
    if (map && coord && !didCenter.current) {
      map.panTo({ lat: Number(coord.lat), lng: Number(coord.lng) })
      didCenter.current = true
    }
  }, [map, coord])

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
