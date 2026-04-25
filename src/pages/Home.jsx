import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTrips } from '../hooks/useTrips.js'
import { format, differenceInDays } from 'date-fns'
import { ko } from 'date-fns/locale'

const CURRENCY_FLAG = {
  KRW: '🇰🇷',
  JPY: '🇯🇵',
  USD: '🇺🇸',
  EUR: '🇪🇺',
  MYR: '🇲🇾',
  THB: '🇹🇭',
  TWD: '🇹🇼',
  VND: '🇻🇳',
  PHP: '🇵🇭'
}

export default function Home() {
  const { trips, loading, createTrip } = useTrips()
  const [showForm, setShowForm] = useState(false)
  const [avgRatings, setAvgRatings] = useState({})
  const navigate = useNavigate()

  useEffect(() => {
    if (trips.length === 0) return
    import('../lib/supabase.js').then(({ supabase }) => {
      supabase.from('records').select('trip_id, rating').not('rating', 'is', null)
        .then(({ data }) => {
          if (!data) return
          const map = {}
          data.forEach(r => {
            if (!map[r.trip_id]) map[r.trip_id] = []
            map[r.trip_id].push(r.rating)
          })
          const avgs = {}
          Object.entries(map).forEach(([id, ratings]) => {
            avgs[id] = (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
          })
          setAvgRatings(avgs)
        })
    })
  }, [trips])

  return (
    <div>
      <div className="top-header">
        <h1 style={{ fontWeight: 700 }}>Travel Planner</h1>
        <button className="btn btn-primary" style={{ padding: '8px 14px', fontSize: 13 }}
          onClick={() => {
            setShowForm(true)
          }}
        >
          + 새 여행
        </button>
      </div>

      <div style={{ padding: '9px 16px 16px', display: 'flex', flexDirection: 'column', gap: 9 }}>
        {loading && <p style={{ color: 'var(--text3)', textAlign: 'center', padding: 40 }}>불러오는 중...</p>}

        {!loading && trips.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text3)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✈️</div>
            <p style={{ fontSize: 14 }}>아직 여행이 없어요.<br />첫 여행을 추가해보세요!</p>
          </div>
        )}

        {trips.map(trip => {
          const nights = differenceInDays(new Date(trip.end_date), new Date(trip.start_date))
          const flag = CURRENCY_FLAG[trip.currency] ?? '🌏'
          const isPast = new Date(trip.end_date) < new Date()
          const isOngoing = new Date(trip.start_date) <= new Date() && new Date(trip.end_date) >= new Date()

          return (
            <div key={trip.id} className="card"
              style={{ padding: '6px 16px 10px', cursor: 'pointer', transition: 'transform .12s' }}
              onClick={() => {
                const params = window.location.search
                navigate(`/trip/${trip.id}${params}`)
              }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
              onMouseUp={e => e.currentTarget.style.transform = ''}
              onTouchStart={e => e.currentTarget.style.transform = 'scale(0.98)'}
              onTouchEnd={e => e.currentTarget.style.transform = ''}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 22 }}>{flag}</span>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 18 }}>{trip.title}</span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text2)' }}>{trip.destination}</p>
                </div>
                <span className="badge" style={{
                  background: isOngoing ? '#fff3e0' : isPast ? 'var(--bg2)' : '#e8f5e9',
                  color: isOngoing ? '#e65100' : isPast ? 'var(--text3)' : '#2e7d32',
                }}>
                  {isOngoing ? '여행 중' : isPast ? '완료' : '예정'}
                </span>
              </div>

              <div style={{ marginTop: 8, display: 'flex', gap: 12, fontSize: 13, color: 'var(--text2)' }}>
                <span>📅 {format(new Date(trip.start_date), 'M.d', { locale: ko })} ~ {format(new Date(trip.end_date), 'M.d', { locale: ko })}</span>
                <span>🌙 {nights}박 {nights + 1}일</span>
                {trip.exchange_rate && <span>💱 {trip.exchange_rate}원/{trip.currency}</span>}
                {avgRatings[trip.id] && <span>⭐ {avgRatings[trip.id]}</span>}
              </div>

              {trip.budget_krw > 0 && (
                <div style={{ marginTop: 4, fontSize: 13, color: 'var(--text3)' }}>
                  예산 {trip.budget_krw.toLocaleString()}원
                </div>
              )}
            </div>
          )
        })}
      </div>

      {showForm && <NewTripModal onClose={() => setShowForm(false)} onCreate={async (v) => {
        const { data } = await createTrip(v)
        if (data) { setShowForm(false); navigate(`/trip/${data.id}`) }
      }} />}
    </div>
  )
}

function NewTripModal({ onClose, onCreate }) {
  const [form, setForm] = useState({
    title: '', destination: '', start_date: '', end_date: '',
    currency: 'JPY', exchange_rate: '', budget_krw: ''
  })
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    if (!form.title || !form.start_date || !form.end_date) return

    setSaving(true)
    await onCreate({
      title: form.title,
      destination: form.destination,
      start_date: form.start_date,
      end_date: form.end_date,
      currency: form.currency,
      exchange_rate: parseFloat(form.exchange_rate) || 1,
      budget_krw: parseInt(form.budget_krw) || 0,
    })
    setSaving(false)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 20 }}>새 여행 추가</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="form-group">
            <label className="form-label">여행 이름 *</label>
            <input className="form-input" value={form.title} onChange={e => set('title', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">목적지</label>
            <input className="form-input" placeholder="도시, 나라" value={form.destination} onChange={e => set('destination', e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div className="form-group">
              <label className="form-label">출발일 *</label>
              <input type="date" className="form-input" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">귀국일 *</label>
              <input type="date" className="form-input" value={form.end_date} onChange={e => set('end_date', e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8 }}>
            <div className="form-group">
              <label className="form-label">통화</label>
              <select className="form-input" value={form.currency} onChange={e => set('currency', e.target.value)}>
                <option value="KRW">KRW 🇰🇷</option>
                <option value="JPY">JPY 🇯🇵</option>
                <option value="USD">USD 🇺🇸</option>
                <option value="EUR">EUR 🇪🇺</option>
                <option value="MYR">MYR 🇲🇾</option>
                <option value="THB">THB 🇹🇭</option>
                <option value="TWD">TWD 🇹🇼</option>
                <option value="VND">VND 🇻🇳</option>
                <option value="PHP">PHP 🇵🇭</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">환율 (1{form.currency} = ?원)</label>
              <input type="number" className="form-input" value={form.exchange_rate} onChange={e => set('exchange_rate', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">예산 (원)</label>
            <input type="number" className="form-input" value={form.budget_krw} onChange={e => set('budget_krw', e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>취소</button>
          <button className="btn btn-primary" style={{ flex: 2 }} onClick={submit} disabled={saving}>
            {saving ? '저장 중...' : '여행 추가 →'}
          </button>
        </div>
      </div>
    </div>
  )
}
