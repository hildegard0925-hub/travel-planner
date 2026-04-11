import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useChecklist } from '../hooks/useChecklist.js'

const DEFAULT_CATEGORIES = ['서류', '의류', '세면도구', '전자기기', '약/비상용품', '기타']
const DEFAULT_ITEMS = {
  '서류': ['여권', '항공권 (인쇄/앱)', '호텔 예약 확인서', '여행자 보험 증서', '비자 서류'],
  '전자기기': ['스마트폰', '보조배터리', '충전기', '변환 플러그', '이어폰'],
  '세면도구': ['칫솔/치약', '면도기', '샴푸/린스', '스킨케어', '선크림'],
  '의류': ['속옷', '잠옷', '겉옷', '신발', '양말'],
  '약/비상용품': ['진통제', '소화제', '지사제', '밴드', '상비약'],
  '기타': ['현금', '지갑', 'esim / 유심'],
}

export default function Checklist() {
  const { tripId } = useParams()
  const {
    items,
    loading,
    addDefaults,
    toggle,
    addItem,
    deleteItem
  } = useChecklist(tripId)
  const navigate = useNavigate()
  const [newItem, setNewItem] = useState({ text: '', cat: '기타' })
  const [adding, setAdding] = useState(false)

  const grouped = items.reduce((acc, i) => {
    if (!acc[i.category]) acc[i.category] = []
    acc[i.category].push(i)
    return acc
  }, {})

  const total = items.length
  const checked = items.filter(i => i.is_checked).length

  return (
    <div>
      <div className="top-header">
        <button className="btn-ghost" onClick={() => navigate(`/trip/${tripId}`)}>←</button>
        <h1>준비물</h1>
        <button className="btn-ghost" style={{ fontSize: 13 }} onClick={() => setAdding(true)}>+ 추가</button>
      </div>

      <div style={{ padding: 16 }}>

        {/* 진행률 */}
        {total > 0 && (
          <div className="card" style={{ padding: 14, marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>체크 완료</span>
              <span style={{ fontSize: 13, color: 'var(--text3)' }}>{checked} / {total}</span>
            </div>
            <div style={{ height: 8, background: 'var(--bg2)', borderRadius: 4 }}>
              <div style={{
                height: '100%',
                width: `${(checked / total) * 100}%`,
                background: checked === total ? 'var(--success)' : 'var(--accent)',
                borderRadius: 4, transition: 'width .3s',
              }} />
            </div>
            {checked === total && total > 0 && (
              <div style={{ textAlign: 'center', marginTop: 10, fontSize: 14 }}>🎉 모든 준비물 완료!</div>
            )}
          </div>
        )}

        {/* 비어있을 때 기본 추가 */}
        {!loading && items.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🧳</div>
            <p style={{ color: 'var(--text3)', fontSize: 14, marginBottom: 20 }}>준비물 목록이 없어요.</p>
            <button
              className="btn btn-primary"
              onClick={() =>
                addDefaults(DEFAULT_ITEMS)
              }
            >기본 준비물 불러오기</button>
          </div>
        )}

        {/* 카테고리별 목록 */}
        {Object.entries(grouped).map(([cat, catItems]) => {
          const catChecked = catItems.filter(i => i.is_checked).length
          return (
            <div key={cat} style={{ marginBottom: 16 }}>
              <div style={{
                fontSize: 12, fontWeight: 600, color: 'var(--text3)',
                letterSpacing: '.06em', textTransform: 'uppercase',
                padding: '0 2px', marginBottom: 8,
                display: 'flex', justifyContent: 'space-between',
              }}>
                <span>{cat}</span>
                <span>{catChecked}/{catItems.length}</span>
              </div>
              <div className="card" style={{ overflow: 'hidden' }}>
                {catItems.map((item, idx) => (
                  <div key={item.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                      borderBottom: idx < catItems.length - 1 ? '1px solid var(--border)' : 'none',
                      opacity: item.is_checked ? 0.5 : 1,
                      cursor: 'pointer',
                    }}
                    onClick={() => toggle(item.id, item.is_checked)}
                  >
                    <div style={{
                      width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                      border: item.is_checked ? 'none' : '2px solid var(--border)',
                      background: item.is_checked ? 'var(--success)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all .15s',
                    }}>
                      {item.is_checked && <span style={{ color: '#fff', fontSize: 12 }}>✓</span>}
                    </div>
                    <span style={{
                      flex: 1, fontSize: 14,
                      textDecoration: item.is_checked ? 'line-through' : 'none',
                    }}>{item.item}</span>
                    <button onClick={e => { e.stopPropagation(); deleteItem(item.id) }}
                      style={{ fontSize: 16, color: 'var(--text3)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px' }}>×</button>
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {items.length > 0 && (
          <div style={{ textAlign: 'center', marginTop: 8 }}>
            <button className="btn btn-ghost" style={{ fontSize: 13 }} onClick={() =>
              addDefaults(DEFAULT_ITEMS)
            }>+ 기본 준비물 추가</button>
          </div>
        )}
      </div>

      {/* 항목 추가 모달 */}
      {adding && (
        <div className="modal-overlay" onClick={() => setAdding(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, marginBottom: 16 }}>준비물 추가</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">카테고리</label>
                <select className="form-input" value={newItem.cat} onChange={e => setNewItem(n => ({ ...n, cat: e.target.value }))}>
                  {DEFAULT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">항목</label>
                <input className="form-input" placeholder="준비물 이름" value={newItem.text}
                  onChange={e => setNewItem(n => ({ ...n, text: e.target.value }))}
                  onKeyDown={e =>
                    e.key === 'Enter' &&
                    addItem(newItem.text, newItem.cat)
                  }
                  autoFocus />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setAdding(false)}>취소</button>
              <button
                className="btn btn-primary"
                style={{ flex: 2 }}
                onClick={() =>
                  addItem(newItem.text, newItem.cat)
                }
              >
                추가
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
