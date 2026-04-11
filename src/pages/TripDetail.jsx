import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useTrip, useTrips } from '../hooks/useTrips.js'
import { useSchedules } from '../hooks/useSchedules.js'
import { useRecords } from '../hooks/useRecords.js'
import { addDays, format } from 'date-fns'
import { ko } from 'date-fns/locale'
import AddScheduleModal from '../components/AddScheduleModal.jsx'
import TripTableView from './TripTableView.jsx'
import { linkify } from '../utils/linkify'

const CAT_EMOJI = { food: '🍜', transport: '🚇', shopping: '🛍️', activity: '📍', lodging: '🏨', etc: '📌' }
const CAT_LABEL = { food: '식사', transport: '이동', shopping: '쇼핑', activity: '액티비티', lodging: '숙소', etc: '기타' }
const METHOD_ICON = { 도보: '🚶', 지하철: '🚇', 버스: '🚌', 택시: '🚕', 자차: '🚗' }
const PAYMENT_LABEL = { card: '카드', cash: '현금' }

export default function TripDetail() {
  const { tripId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { trip, loading: tripLoading } = useTrip(tripId)
  const { deleteTrip, updateTrip } = useTrips()
  const { byDay, loading: schLoading, addSchedule, updateSchedule, deleteSchedule, toggleDone } = useSchedules(tripId)
  const { copyFromSchedule } = useRecords(tripId)
  const [selectedDay, setSelectedDay] = useState(0)
  const [viewMode, setViewMode] = useState('timeline')
  const [showAdd, setShowAdd] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [copyNotice, setCopyNotice] = useState(null) // { text, id }
  const [showMenu, setShowMenu] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showEditTrip, setShowEditTrip] = useState(false)

  const params = new URLSearchParams(location.search)
  const focusDay = params.get('day')

  useEffect(() => {
    if (focusDay !== null) setSelectedDay(Number(focusDay))
  }, [focusDay])

  if (tripLoading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>로딩 중...</div>
  if (!trip) return null

  const totalDays = Math.ceil((new Date(trip.end_date) - new Date(trip.start_date)) / 86400000) + 1
  const dayItems = byDay[selectedDay] || []
  const dayDate = addDays(new Date(trip.start_date), selectedDay)
  const dayTotal = dayItems.reduce((s, i) => s + (i.cost_krw || 0), 0)

  /**
   * 완료 토글 → 완료 시 기록으로 자동 복사
   */
  const handleToggleDone = async (item) => {
    await toggleDone(item.id, item.is_done)
    // 완료 상태로 변경될 때만 복사 (현재 is_done=false → true가 됨)
    if (!item.is_done) {
      const { alreadyExists, error } = await copyFromSchedule(item)
      if (!error) {
        const msg = alreadyExists ? '이미 기록에 있어요' : '기록에 복사됐어요 📷'
        setCopyNotice({ text: msg, id: item.id })
        setTimeout(() => setCopyNotice(null), 2500)
      }
    }
  }

  if (viewMode === 'table') {
    return (
      <TripTableView byDay={byDay} tripId={tripId} trip={trip} setViewMode={setViewMode} />
    )
  }

  return (
    <div>
      <div className="top-header">
        <div style={{
          display: 'flex',
          gap: 0,
          flexShrink: 0,
          width: 'auto'
        }}>
          <button className="btn-ghost" onClick={() => setViewMode('timeline')} style={{ fontSize: 12 }}>타임라인</button>
          <button className="btn-ghost" onClick={() => setViewMode('table')} style={{ fontSize: 12 }}>표</button>
        </div>
        <button className="btn-ghost" onClick={() => navigate('/')}>←</button>
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
        <button
          className="btn-ghost"
          style={{ fontSize: 18 }}
          onClick={() => setShowMenu(true)}
        >
          ⋯
        </button>
      </div>

      {/* 일차 탭 */}
      <div style={{
        display: 'flex', overflowX: 'auto', padding: '5px 12px', gap: 8,
        background: 'var(--surface)', borderBottom: '1px solid var(--border)',
        scrollbarWidth: 'none',
      }}>
        {Array.from({ length: totalDays }, (_, i) => {
          const d = addDays(new Date(trip.start_date), i)
          const isActive = selectedDay === i
          const count = (byDay[i] || []).length
          return (
            <button key={i} onClick={() => setSelectedDay(i)} style={{
              flexShrink: 0, padding: '6px 12px', borderRadius: 999, fontSize: 14,
              fontWeight: isActive ? 600 : 400,
              background: isActive ? 'var(--accent)' : 'var(--bg2)',
              color: isActive ? '#fff' : 'var(--text2)',
              border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
            }}>
              {i + 1}일차 {format(d, 'M/d', { locale: ko })}
              {count > 0 && <span style={{ marginLeft: 4, fontSize: 11, opacity: .8 }}>({count})</span>}
            </button>
          )
        })}
      </div>

      {/* 일정 헤더 */}
      <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 500 }}>{format(dayDate, 'M월 d일 (EEE)', { locale: ko })}</div>
          {dayTotal > 0 && <div style={{ fontSize: 12, color: 'var(--text3)' }}>오늘 지출 {dayTotal.toLocaleString()}원</div>}
        </div>
        <button className="btn btn-primary" style={{ padding: '8px 14px', fontSize: 13 }}
          onClick={() => setShowAdd(true)}>+ 추가</button>
      </div>

      {/* 복사 알림 토스트 */}
      {copyNotice && (
        <div style={{
          margin: '0 16px 8px',
          padding: '8px 14px', borderRadius: 8,
          background: 'var(--accent)', color: '#fff',
          fontSize: 13, textAlign: 'center',
          animation: 'fadeIn .2s',
        }}>
          {copyNotice.text}
          <span style={{ marginLeft: 8, cursor: 'pointer', opacity: .8 }}
            onClick={() => navigate(`/trip/${tripId}/records`)}>→ 기록 보기</span>
        </div>
      )}

      {/* 타임라인 */}
      <div style={{ padding: '0 16px 16px' }}>
        {dayItems.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text3)', fontSize: 14 }}>
            이 날 일정이 없어요.<br />+ 추가를 눌러 일정을 만들어보세요.
          </div>
        )}
        <div style={{ position: 'relative' }}>
          {dayItems.map((item, idx) => (
            <ScheduleRow
              key={item.id}
              item={item}
              trip={trip}
              navigate={navigate}
              isLast={idx === dayItems.length - 1}
              onToggle={() => handleToggleDone(item)}
              onEdit={() => setEditItem(item)}
              onDelete={() => deleteSchedule(item.id)}
            />
          ))}
        </div>
      </div>

      {showAdd && (
        <AddScheduleModal trip={trip} dayIndex={selectedDay}
          onClose={() => setShowAdd(false)}
          onSave={async (v) => {
            const result = await addSchedule(v)
            if (!result?.error) setShowAdd(false)
            return result
          }}
        />
      )}
      {editItem && (
        <AddScheduleModal trip={trip} dayIndex={selectedDay} initial={editItem}
          onClose={() => setEditItem(null)}
          onSave={async (v) => {
            const result = await updateSchedule(editItem.id, v)
            if (!result?.error) setEditItem(null)
            return result
          }}
        />
      )}
      {showMenu && (
        <div
          className="modal-overlay"
          onClick={() => setShowMenu(false)}
        >
          <div
            className="modal-sheet"
            onClick={e => e.stopPropagation()}
          >

            <button
              className="btn btn-secondary"
              style={{ width: '100%', marginBottom: 8 }}
              onClick={() => {
                setShowMenu(false)
                setShowEditTrip(true)
              }}
            >
              환율 수정
            </button>

            <button
              className="btn"
              style={{
                width: '100%',
                color: '#e53935',
                border: '1px solid #ffcdd2'
              }}
              onClick={async () => {
                if (!confirm('이 여행을 삭제할까요?\n일정도 함께 삭제됩니다.')) return

                const { error } = await deleteTrip(tripId)

                if (!error) navigate('/')
                else alert('삭제 중 오류가 발생했습니다.')
              }}
            >
              여행 삭제
            </button>

          </div>
        </div>
      )}
    {showEditTrip && (
      <EditTripModal
        trip={trip}
        onClose={() => setShowEditTrip(false)}
        onSave={async (values) => {
          await updateTrip(tripId, values)
          window.location.reload()   // 이 줄 추가
          setShowEditTrip(false)
        }}
      />
    )}
    {showDeleteConfirm && (
      <div
        className="modal-overlay"
        onClick={() => setShowDeleteConfirm(false)}
      >
        <div
          className="modal-sheet"
          onClick={e => e.stopPropagation()}
        >

          <p style={{ marginBottom: 16 }}>
            이 여행을 삭제할까요?<br />
            일정도 함께 삭제됩니다.
          </p>

          <div style={{ display: 'flex', gap: 8 }}>

            <button
              className="btn btn-secondary"
              style={{ flex: 1 }}
              onClick={() => setShowDeleteConfirm(false)}
            >
              취소
            </button>

            <button
              className="btn"
              style={{
                flex: 1,
                color: '#e53935',
                border: '1px solid #ffcdd2'
              }}
              onClick={async () => {
                const { error } = await deleteTrip(tripId)

                if (!error) navigate('/')
                else alert('삭제 중 오류가 발생했습니다.')
              }}
            >
              삭제
            </button>

          </div>

        </div>
      </div>
    )}
    </div>
  )
}

function ScheduleRow({
  item,
  trip,
  navigate,
  isLast,
  onToggle,
  onEdit,
  onDelete
}) {
  const [expanded, setExpanded] = useState(false)
  const emoji = CAT_EMOJI[item.category] ?? '📌'
  const costLocal = item.cost_local > 0 ? `${item.cost_local.toLocaleString()} ${trip.currency}` : null
  const costKrw = item.cost_krw > 0 ? `${item.cost_krw.toLocaleString()}원` : null

  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: isLast ? 0 : 4 }}>
      {/* 타임라인 선 */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 26, flexShrink: 0 }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: item.is_done ? 'var(--success)' : `color-mix(in srgb, var(--accent) 15%, transparent)`,
          border: `2px solid ${item.is_done ? 'var(--success)' : 'var(--accent)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, flexShrink: 0, transition: 'all .2s',
        }}>
          {item.is_done ? '✓' : emoji}
        </div>
        {!isLast && <div style={{ flex: 1, width: 2, background: 'var(--border)', minHeight: 20 }} />}
      </div>

      {/* 카드 */}
      <div className="card" style={{
        flex: 1, padding: '5px 12px', marginBottom: 5,
        opacity: item.is_done ? 0.6 : 1, cursor: 'pointer',
        transition: 'opacity .2s',
      }} onClick={() => setExpanded(e => !e)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              {item.start_time && <span style={{ fontSize: 12, color: 'var(--text3)', fontVariantNumeric: 'tabular-nums' }}>{item.start_time?.slice(0, 5)}</span>}
              <span style={{ fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>{item.title}</span>
              {item.is_done && <span style={{ fontSize: 10, color: 'var(--success)', background: '#e8f5e9', padding: '1px 6px', borderRadius: 999 }}>완료</span>}
            </div>
            {(item.transport || item.transport_minutes || item.description) && (
              <p
                style={{
                  fontSize: 13,
                  marginTop: 4,
                  color: 'var(--text2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  flexWrap: 'wrap'
                }}
              >
                {item.transport && (
                  <span style={{ flexShrink: 0 }}>
                    {METHOD_ICON[item.transport] ?? '🚌'}
                  </span>
                )}

                {item.transport_minutes != null && (
                  <span
                    style={{
                      fontSize: 12,
                      color: 'var(--text3)',
                      flexShrink: 0
                    }}
                  >
                    {item.transport_minutes}분 | 
                  </span>
                )}

                <span>
                  {item.description}
                </span>
              </p>
            )}
            
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 8 }}>
            {costLocal && <div style={{ fontSize: 12, color: 'var(--text2)' }}>{costLocal}</div>}
            {costKrw && <div style={{ fontSize: 13, fontWeight: 500, color: item.payment_method === 'cash' ? 'var(--warning)' : 'var(--accent)' }}>{costKrw}</div>}
          </div>
        </div>

        {expanded && (
          <div style={{ marginTop: 6, borderTop: '1px solid var(--border)', paddingTop: 6 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
               {item.address && (
                <p
                  style={{
                    fontSize: 12,
                    color: 'var(--accent)',
                    marginBottom: 4,
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate(
                      `/trip/${trip.id}/map?day=${item.day_index}&lat=${item.lat}&lng=${item.lng}`
                    )
                  }}
                >
                  {item.address}
                </p>
              )}
              {item.transport && <span className="badge" style={{ background: 'color-mix(in srgb, var(--accent2) 25%, white)', color: 'var(--text)' }}> 이동 / {item.transport}</span>}
              {item.payment_method && <span className="badge" style={{ background: 'color-mix(in srgb, var(--accent2) 25%, white)', color: 'var(--text)' }}> 결제 / {PAYMENT_LABEL[item.payment_method]}</span>}
              <span className="badge" style={{ background: 'color-mix(in srgb, var(--accent2) 25%, white)', color: 'var(--text)' }}>{CAT_LABEL[item.category] ?? item.category}</span>
            </div>
            {item.memo && <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 8 }}>{linkify(item.memo)}</p>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary" style={{ fontSize: 12, padding: '6px 12px' }}
                onClick={e => { e.stopPropagation(); onToggle() }}>
                {item.is_done ? '↩ 되돌리기' : '✓ 완료'}
              </button>
              <button className="btn btn-secondary" style={{ fontSize: 12, padding: '6px 12px' }}
                onClick={e => { e.stopPropagation(); onEdit() }}>수정</button>
              <button onClick={e => { e.stopPropagation(); if (confirm('삭제할까요?')) onDelete() }}
                style={{ fontSize: 12, padding: '6px 12px', color: '#e53935', background: 'none', border: '1px solid #ffcdd2', borderRadius: 8, cursor: 'pointer' }}>삭제</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
function EditTripModal({ trip, onClose, onSave }) {
  const [form, setForm] = useState({
    title: trip.title,
    destination: trip.destination,
    start_date: trip.start_date,
    end_date: trip.end_date,
    currency: trip.currency,
    exchange_rate: trip.exchange_rate,
    budget_krw: trip.budget_krw
  })

  const set = (k, v) =>
    setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    await onSave({
      ...form,
      exchange_rate: parseFloat(form.exchange_rate) || 1
    })
  }

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
    >
      <div
        className="modal-sheet"
        onClick={e => e.stopPropagation()}
      >

        <h2 style={{ marginBottom: 16 }}>
          환율 수정
        </h2>

        <div className="form-group">
          <label>환율 (1{form.currency} = ?원)</label>
          <input
            type="number"
            className="form-input"
            value={form.exchange_rate}
            onChange={e =>
              set('exchange_rate', e.target.value)
            }
          />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>

          <button
            className="btn btn-secondary"
            style={{ flex: 1 }}
            onClick={onClose}
          >
            취소
          </button>

          <button
            className="btn btn-primary"
            style={{ flex: 2 }}
            onClick={submit}
          >
            저장
          </button>

        </div>

      </div>
    </div>
  )
}
