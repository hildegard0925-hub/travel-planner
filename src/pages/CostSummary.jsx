import { useParams, useNavigate } from 'react-router-dom'
import { useTrip } from '../hooks/useTrips.js'
import { useRecords } from '../hooks/useRecords.js'
import { addDays, format } from 'date-fns'
import { ko } from 'date-fns/locale'

const CAT_EMOJI = { food: '🍜', transport: '🛣️', shopping: '🛍️', activity: '⭐', lodging: '💒', etc: '📌' }
const CAT_LABEL = { food: '식사', transport: '이동', shopping: '쇼핑', activity: '관광', lodging: '숙소', etc: '기타' }

export default function CostSummary() {
  const { tripId } = useParams()
  const navigate = useNavigate()
  const { trip } = useTrip(tripId)
  const { records, byDay } = useRecords(tripId)

  if (!trip) return null

  const totalDays = Math.ceil((new Date(trip.end_date) - new Date(trip.start_date)) / 86400000) + 1
  const totalKrw = records.reduce((s, i) => s + (i.cost_krw || 0), 0)
  const totalLocal = records.reduce((s, i) => s + (i.cost_local || 0), 0)
  const cardTotal = records.filter(i => i.payment_method === 'card').reduce((s, i) => s + (i.cost_krw || 0), 0)
  const cashTotal = records.filter(i => i.payment_method === 'cash').reduce((s, i) => s + (i.cost_krw || 0), 0)
  const budgetLeft = trip.budget_krw ? trip.budget_krw - totalKrw : null
  const budgetPct = trip.budget_krw ? Math.min((totalKrw / trip.budget_krw) * 100, 100) : 0

  // 카테고리별 합계
  const byCat = records.reduce((acc, s) => {
    const k = s.category || 'etc'
    if (!acc[k]) acc[k] = { krw: 0, local: 0, count: 0 }
    acc[k].krw += s.cost_krw || 0
    acc[k].local += s.cost_local || 0
    acc[k].count++
    return acc
  }, {})

  return (
    <div>
      <div className="top-header">
        <button className="btn-ghost" onClick={() => navigate(`/trip/${tripId}`)}>←</button>
        <h1>비용 정산</h1>
      </div>

      <div style={{ padding: '9px 16px 16px', display: 'flex', flexDirection: 'column', gap: 9 }}>

        {/* 총계 카드 */}
        <div className="card" style={{ padding: '10px 16px' }}>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 1 }}>총 지출</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 30 }}>
            {totalKrw.toLocaleString()}<span style={{ fontSize: 16 }}>원</span>
          </div>
          {totalLocal > 0 && (
            <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 1 }}>
              {totalLocal.toLocaleString()} {trip.currency} · 환율 {trip.exchange_rate}원
            </div>
          )}

          {trip.budget_krw > 0 && (
            <div style={{ marginTop: 2 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text3)', marginBottom: 6 }}>
                <span>예산 {trip.budget_krw.toLocaleString()}원</span>
                <span style={{ color: budgetLeft >= 0 ? 'var(--success)' : '#e53935' }}>
                  {budgetLeft >= 0 ? `${budgetLeft.toLocaleString()}원 남음` : `${Math.abs(budgetLeft).toLocaleString()}원 초과`}
                </span>
              </div>
              <div style={{ height: 8, background: 'var(--bg2)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${budgetPct}%`,
                  background: budgetPct > 90 ? '#e53935' : budgetPct > 70 ? 'var(--warning)' : 'var(--success)',
                  borderRadius: 4,
                  transition: 'width .4s',
                }} />
              </div>
            </div>
          )}
        </div>

        {/* 결제 수단별 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="card" style={{ padding: '8px 14px' }}>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>💳 카드</div>
            <div style={{ fontSize: 18, fontWeight: 600, marginTop: 1 }}>{cardTotal.toLocaleString()}원</div>
          </div>
          <div className="card" style={{ padding: '8px 14px' }}>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>💵 현금</div>
            <div style={{ fontSize: 18, fontWeight: 600, marginTop: 1 }}>{cashTotal.toLocaleString()}원</div>
          </div>
        </div>

        {/* 카테고리별 */}
        <div className="card" style={{ padding: '10px 16px' }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text2)' }}>카테고리별</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {Object.entries(byCat)
              .sort((a, b) => b[1].krw - a[1].krw)
              .map(([cat, v]) => {
                const pct = totalKrw > 0 ? (v.krw / totalKrw * 100) : 0
                return (
                  <div key={cat}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                      <span style={{ fontSize: 13 }}>{CAT_EMOJI[cat]} {CAT_LABEL[cat] ?? cat}</span>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{v.krw.toLocaleString()}원</span>
                        <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 6 }}>{Math.round(pct)}%</span>
                      </div>
                    </div>
                    <div style={{ height: 5, background: 'var(--bg2)', borderRadius: 3 }}>
                      <div style={{
                        height: '100%', width: `${pct}%`,
                        background: 'var(--accent)', borderRadius: 3,
                      }} />
                    </div>
                  </div>
                )
              })}
          </div>
        </div>

        {/* 일별 지출 */}
        <div className="card" style={{ padding: '10px 16px' }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text2)' }}>일자별</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Array.from({ length: totalDays }, (_, i) => {
              const dayItems = byDay[i] || []
              const dayKrw = dayItems.reduce((s, item) => s + (item.cost_krw || 0), 0)
              const dayLocal = dayItems.reduce((s, item) => s + (item.cost_local || 0), 0)
              const d = addDays(new Date(trip.start_date), i)
              const pct = totalKrw > 0 ? (dayKrw / totalKrw * 100) : 0
              return (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, color: 'var(--text2)' }}>
                      {i + 1}일차 {format(d, 'M/d', { locale: ko })}
                    </span>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{dayKrw.toLocaleString()}원</span>
                      {dayLocal > 0 && <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 6 }}>{dayLocal.toLocaleString()} {trip.currency}</span>}
                    </div>
                  </div>
                  <div style={{ height: 5, background: 'var(--bg2)', borderRadius: 3 }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: 'var(--accent2)', borderRadius: 3 }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 내역 목록 */}
        <div className="card" style={{ padding: '10px 16px' }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text2)' }}>전체 내역</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {records.filter(s => s.cost_krw > 0).sort((a, b) => b.cost_krw - a.cost_krw).map(item => (
              <div key={item.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '4px 0', borderBottom: '1px solid var(--border)',
              }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span>{CAT_EMOJI[item.category] ?? '📌'}</span>
                  <div>
                    <div style={{ fontSize: 13 }}>{item.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                      {item.day_index + 1}일차 · {item.payment_method === 'card' ? '💳' : '💵'}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {item.cost_local > 0 && <div style={{ fontSize: 11, color: 'var(--text3)' }}>{item.cost_local.toLocaleString()} {trip.currency}</div>}
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{item.cost_krw.toLocaleString()}원</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
