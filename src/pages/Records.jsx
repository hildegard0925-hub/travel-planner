import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTrip } from '../hooks/useTrips.js'
import { useRecords } from '../hooks/useRecords.js'
import { addDays, format } from 'date-fns'
import { ko } from 'date-fns/locale'
import AddRecordModal from '../components/AddRecordModal.jsx'
import RecordTableView from './RecordTableView.jsx'
import PhotoViewer from '../components/PhotoViewer.jsx'
import { deleteRecordPhoto } from '../services/storage.js'
import { linkify } from '../utils/linkify'

const CAT_EMOJI = { food: '🍜', transport: '🛣️', shopping: '🛍️', activity: '⭐', lodging: '💒', etc: '📌' }

export default function Records() {
  const { tripId } = useParams()
  const navigate = useNavigate()
  const [currentDay, setCurrentDay] = useState(0)
  const dayRefs = useRef([])
  const { trip } = useTrip(tripId)
  const { records, byDay, loading, addRecord, updateRecord, deleteRecord, refresh } = useRecords(tripId)
  const [viewMode, setViewMode] = useState('timeline')
  useEffect(() => {
    requestAnimationFrame(() => {
      const page = document.querySelector('.page')

      if (page) {
        page.scrollTo({
          top: 0,
          behavior: 'smooth'
        })
      }
    })
  }, [viewMode])

  useEffect(() => {
    const page = document.querySelector('.page')

    if (page) {
      page.scrollTo({
        top: 0
      })
    }
  }, [])
  const [editItem, setEditItem] = useState(null)
  const [showAdd, setShowAdd] = useState(false)

    useEffect(() => {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const index = Number(entry.target.dataset.day)
              setCurrentDay(index)
            }
          })
        },
        {
          root: null,
          rootMargin: '-40% 0px -55% 0px',
          threshold: 0
        }
      )

      dayRefs.current.forEach(el => {
        if (el) observer.observe(el)
      })

      return () => observer.disconnect()
    }, [byDay])

    if (!trip) return null

  const totalDays = Math.ceil((new Date(trip.end_date) - new Date(trip.start_date)) / 86400000) + 1
  const totalKrw = records.reduce((s, r) => s + (r.cost_krw || 0), 0)
  const safeDay = Number.isFinite(currentDay) ? currentDay : 0

  if (viewMode === 'table') {
    return (
      <>
        <RecordTableView byDay={byDay} trip={trip} setViewMode={setViewMode} onEdit={setEditItem} />
        {editItem && (
          <AddRecordModal trip={trip} initial={editItem}
            onClose={() => setEditItem(null)}
            onSave={async (v) => {
              const r = await updateRecord(editItem.id, v)
              if (!r.error) { await refresh(); setEditItem(null) }
              return r
            }}
          />
        )}
      </>
    )
  }

  return (
    <div>
      <div className="top-header">

        {/* 왼쪽: 타임라인 / 표 */}
        <div style={{
          display: 'flex',
          gap: 0,
          flexShrink: 0,
          width: 'auto'
        }}>
          <button
            className="btn-ghost"
            onClick={() => setViewMode('timeline')}
            style={{ fontSize: 12 }}
          >
            타임라인
          </button>

          <button
            className="btn-ghost"
            onClick={() => setViewMode('table')}
            style={{ fontSize: 12 }}
          >
            표
          </button>
        </div>

        {/* 홈(뒤로가기) */}
        <button
          className="btn-ghost"
          onClick={() => {
            const params = window.location.search
            navigate(`/trip/${tripId}${params}`)
          }}
        >
          ←
        </button>

        {/* 제목 */}
        <h1 style={{
          fontSize: 18,
          fontWeight: 600,
          margin: 0,

          flex: 1,
          textAlign: 'center',
          minWidth: 0
        }}>
          {trip.title}
        </h1>

        {/* 추가 버튼 */}
        <button
          className="btn btn-primary"
          style={{ padding: '7px 12px', fontSize: 13 }}
          onClick={() => setShowAdd(true)}
        >
          + 추가
        </button>

      </div>

      {records.length > 0 && (
        <div
          onClick={() => {
            const page = document.querySelector('.page')
            if (page) {
              page.scrollTo({
                top: 0,
                behavior: 'smooth'
              })
            }
          }}
          style={{
            position: 'sticky',
            top: 'var(--header-h)',
            zIndex: 5,
            padding: '8px 14px',
            background: 'var(--surface)',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            fontSize: 14,
            color: 'var(--text2)',
            whiteSpace: 'nowrap',
            cursor: 'pointer'
          }}
        >
          
          <span style={{ fontWeight: 500, flexShrink: 0 }}>
            🗓️ {safeDay + 1}일차{' '}
            {format(
              addDays(new Date(trip.start_date), safeDay),
              'M/d',
              { locale: ko }
            )}
          </span>

          <span>📝 {records.length}개 기록</span>

          <span>💴 {totalKrw.toLocaleString()}원</span>

          <span>📷 {records.filter(r => r.photo_url).length}장 사진</span>
        </div>
      )}

      <div style={{ padding: '12px 16px 16px' }}>
        {loading && <p style={{ textAlign: 'center', color: 'var(--text3)', padding: 40 }}>로딩 중...</p>}

        {!loading && records.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text3)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📖</div>
            <p style={{ fontSize: 14, marginBottom: 8 }}>아직 기록이 없어요.</p>
            <p style={{ fontSize: 12 }}>일정에서 완료 체크를 하거나<br />직접 추가해보세요!</p>
          </div>
        )}

        {Array.from({ length: totalDays }, (_, i) => {
          const dayRecords = byDay[i] || []
          if (dayRecords.length === 0) return null
          const dayDate = addDays(new Date(trip.start_date), i)
          const dayKrw = dayRecords.reduce((s, r) => s + (r.cost_krw || 0), 0)

          return (
            <div
              key={i}
              ref={el => dayRefs.current[i] = el}
              data-day={i}
              style={{ marginBottom: 16 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 16 }}>
                  {i + 1}일차 <span style={{ fontSize: 13, fontWeight: 400 }}>
                    {format(dayDate, 'M월 d일 (EEE)', { locale: ko })}
                  </span>
                </div>
                {dayKrw > 0 && <span style={{ fontSize: 12, color: 'var(--text3)' }}>{dayKrw.toLocaleString()}원</span>}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {dayRecords.map(record => (
                  <RecordCard key={record.id} record={record} trip={trip}
                    onEdit={() => setEditItem(record)}
                    onUpdate={(id, vals) => updateRecord(id, vals)}
                    onDelete={async () => {

                      if (!confirm('이 기록을 삭제할까요?')) return

                      if (record.photo_url) {
                        await deleteRecordPhoto(record.photo_url)
                      }

                      await deleteRecord(record.id)
                    }}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {showAdd && (
        <AddRecordModal trip={trip} initial={{ day_index: 0 }}
          onClose={() => setShowAdd(false)}
          onSave={async (v) => {
            const result = await addRecord(v)
            if (!result.error) { await refresh(); setShowAdd(false) }
            return result
          }}
        />
      )}

      {editItem && (
        <AddRecordModal trip={trip} initial={editItem}
          onClose={() => setEditItem(null)}
          onSave={async (v) => {
            const r = await updateRecord(editItem.id, v)
            if (!r.error) { await refresh(); setEditItem(null) }
            return r
          }}
        />
      )}
    </div>
  )
}

function RecordCard({ record, trip, onEdit, onDelete, onUpdate }) {
  const [viewerUrl, setViewerUrl] = useState(null)
  const [expanded, setExpanded] = useState(false)
  const [showTimeMenu, setShowTimeMenu] = useState(false)
  const emoji = CAT_EMOJI[record.category] ?? '📌'
  const costKrw = record.cost_krw > 0 ? `${record.cost_krw.toLocaleString()}원` : null
  const costLocal = record.cost_local > 0 ? `${record.cost_local.toLocaleString()} ${trip.currency}` : null
  const displayTime =
    record.time_source === 'photo'
      ? record.actual_datetime
        ? format(new Date(record.actual_datetime), 'HH:mm', { locale: ko })
        : null
      : record.start_time
        ? record.start_time.slice(0, 5)
        : null
  const scheduleTime = record.schedule_time
    ? record.schedule_time.slice(0, 5)
    : null
  const photoTime = record.actual_datetime
    ? format(new Date(record.actual_datetime), 'HH:mm', { locale: ko })
    : null

  const handleSelectTime = async (source) => {
    setShowTimeMenu(false)
    try {
      if (source === 'schedule') {
        const t = record.schedule_time

        await onUpdate(record.id, {
          start_time: t,
          time_source: 'schedule'
        })
      } else {
        const t = new Date(record.actual_datetime)
          .toTimeString()
          .slice(0, 5)

        await onUpdate(record.id, {
          start_time: t,
          time_source: 'photo'
        })
      }
    } catch (err) {
      console.error(err)
      alert('시간 변경 중 오류 발생')
    }
  }

  return (
    <div
      className="card"
      style={{ overflow: 'visible', cursor: 'pointer' }}
      onClick={(e) => {
        if (e.target.closest('[data-role="time-area"]')) return
        setExpanded(prev => !prev)
      }}
    >

      {/* 사진: 펼쳐졌을 때만 표시 */}
      {expanded && record.photo_url && (
        <img
          src={record.photo_url}
          alt={record.title}
          onClick={(e) => {
            e.stopPropagation()
            setViewerUrl(record.photo_url)
          }}
          style={{
            width: '100%',
            maxHeight: 260,
            objectFit: 'cover',
            display: 'block',
            cursor: 'zoom-in'
          }}
        />
      )}

      <div style={{ padding: '5px 12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>

          {/* 왼쪽: 제목 + 주소 + 내용 */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* 첫째 줄: 이모지 + 시각 + 제목 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'nowrap' }}>
              <span style={{ fontSize: 13, flexShrink: 0 }}>{emoji}</span>
              {displayTime && (
                <span style={{ fontSize: 11, color: 'var(--text3)', flexShrink: 0 }}>
                  {displayTime}
                </span>
              )}
              <span style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {record.title}
              </span>
              {record.photo_url && !expanded && (
                <span style={{ fontSize: 11, flexShrink: 0 }}>📷</span>
              )}
            </div>

            {/* 둘째 줄: 주소 (바로 아래, 여백 없이) */}
            {record.address && (
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1, paddingLeft: 18 }}>
                {record.address}
              </div>
            )}

            {/* 내용 */}
            {record.description && (
              <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4, lineHeight: 1.4 }}>
                {record.description}
              </p>
            )}
          </div>

          {/* 오른쪽: 비용 */}
          <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 10 }}>
            {costLocal && <div style={{ fontSize: 11, color: 'var(--text3)' }}>{costLocal}</div>}
            {costKrw && (
              <div style={{
                fontSize: 13, fontWeight: 500,
                color: record.payment_method === 'cash' ? 'var(--warning)' : 'var(--accent)',
              }}>{costKrw}</div>
            )}
          </div>
        </div>

        {/* 펼쳐진 상태 */}
        {expanded && (
          <div style={{ marginTop: 10, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
            {record.memo && (
              <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 8 }}>{record.memo}</p>
            )}
            {record.actual_datetime && (
              <div style={{ position: 'relative', display: 'inline-block', marginBottom: 8 }} data-role="time-area">
                <p
                  onClick={(e) => { e.stopPropagation(); setShowTimeMenu(prev => !prev) }}
                  style={{
                    fontSize: 11, color: 'var(--text3)', margin: 0,
                    cursor: 'pointer', textDecoration: 'underline dotted',
                    display: 'inline',
                  }}
                >
                  📷 촬영 {format(new Date(record.actual_datetime), 'M/d HH:mm', { locale: ko })}
                </p>

                {showTimeMenu && (
                  <div
                    onClick={e => e.stopPropagation()}
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      marginTop: 4,
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                      boxShadow: '0 4px 16px rgba(0,0,0,.12)',
                      zIndex: 20,

                      minWidth: 185,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                    }}
                  >
                    <div style={{ padding: '8px 12px 4px', fontSize: 10, color: 'var(--text3)', fontWeight: 600 }}>
                      카드에 표시할 시간
                    </div>
                    <button
                      onClick={() => handleSelectTime('schedule')}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        width: '100%', padding: '8px 12px', fontSize: 12,
                        background: record.time_source !== 'photo' ? 'var(--bg2)' : 'transparent',
                        color: 'var(--text1)', border: 'none', cursor: 'pointer',
                        fontWeight: record.time_source !== 'photo' ? 600 : 400,
                      }}
                    >
                      <span>📅</span>
                      <span>일정 시간{scheduleTime ? ` (${scheduleTime})` : ''}</span>
                      {record.time_source !== 'photo' && <span style={{ marginLeft: 'auto' }}>✓</span>}
                    </button>
                    <button
                      onClick={() => handleSelectTime('photo')}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        width: '100%', padding: '8px 12px', fontSize: 12,
                        background: record.time_source === 'photo' ? 'var(--bg2)' : 'transparent',
                        color: 'var(--text1)', border: 'none', cursor: 'pointer',
                        fontWeight: record.time_source === 'photo' ? 600 : 400,
                        borderTop: '1px solid var(--border)',
                      }}
                    >
                      <span>📷</span>
                      <span>사진 시간{photoTime ? ` (${photoTime})` : ''}</span>
                      {record.time_source === 'photo' && <span style={{ marginLeft: 'auto' }}>✓</span>}
                    </button>
                  </div>
                )}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary" style={{ fontSize: 12, padding: '6px 12px' }}
                onClick={e => { e.stopPropagation(); onEdit() }}>수정</button>
              <button onClick={e => { e.stopPropagation(); onDelete() }}
                style={{ fontSize: 12, padding: '6px 12px', color: '#e53935', background: 'none', border: '1px solid #ffcdd2', borderRadius: 8, cursor: 'pointer' }}>
                삭제
              </button>
            </div>
          </div>
        )}
      </div>
      <PhotoViewer
        photoUrl={viewerUrl}
        onClose={() => setViewerUrl(null)}
      />
    </div>
  )
}
