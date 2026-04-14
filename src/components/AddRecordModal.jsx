import { useState, useRef, useEffect } from 'react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { readPhotoDate } from '../utils/exif.js'
import { compressImage } from '../utils/imageUtils'
import { extractAmountsFromReceipt, cancelOCR } from '../utils/ocr.js'
import { uploadRecordPhoto } from '../services/storage.js'
import { deleteRecordPhoto } from '../services/storage.js'
import { supabase } from '../lib/supabase.js'

const CATEGORIES = [
  { value: 'food', label: '🍜 식사' },
  { value: 'transport', label: '🛣️ 이동' },
  { value: 'shopping', label: '🛍️ 쇼핑' },
  { value: 'activity', label: '⭐ 관광' },
  { value: 'lodging', label: '💒 숙소' },
  { value: 'etc', label: '📌 기타' },
]

export default function AddRecordModal({ trip, initial, onClose, onSave }) {
  const [form, setForm] = useState({
    title: initial?.title ?? '',
    category: initial?.category ?? 'food',
    description: initial?.description ?? '',
    address: initial?.address ?? '',
    cost_local: initial?.cost_local ?? '',
    cost_krw: initial?.cost_krw ?? '',
    payment_method: initial?.payment_method ?? 'card',
    memo: initial?.memo ?? '',
    photo_url: initial?.photo_url ?? '',
    actual_datetime: initial?.actual_datetime ?? null,
    day_index: initial?.day_index ?? 0,
  })

  // 수정 모달: 기존 사진을 초기값으로 바로 세팅
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(initial?.photo_url ?? null)
  const [exifDate, setExifDate] = useState(
    initial?.actual_datetime ? new Date(initial.actual_datetime) : null
  )
  const [saving, setSaving] = useState(false)

  // OCR 상태
  const [ocrState, setOcrState] = useState('idle')
  const [ocrProgress, setOcrProgress] = useState(0)
  const [ocrAmounts, setOcrAmounts] = useState([])

  const photoInputRef = useRef()
  const receiptInputRef = useRef()
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // 사진 선택 → 미리보기 + EXIF 읽기
  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 기존 시간 먼저 초기화 (핵심)
    setExifDate(null)
    set('actual_datetime', null)

    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))

    const date = await readPhotoDate(file)

    if (!date) {
      alert('촬영 시간이 없는 사진입니다.\n다른 사진을 선택해 주세요.')
      return
    }

    setExifDate(date)
    set('actual_datetime', date.toISOString())
    set('start_time', format(date, 'HH:mm'))
    set('time_source', 'photo')
  }

  // 영수증 OCR
  const handleReceiptOCR = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setOcrState('loading')
    setOcrProgress(0)
    try {
      const { text, amounts } = await extractAmountsFromReceipt(file, setOcrProgress)
      setOcrAmounts(amounts)
      setOcrState('done')
    } catch (err) {
      console.error('OCR 실패:', err)
      setOcrState('idle')
      alert('OCR 처리 중 오류가 발생했습니다.')
    }
  }

  const selectOcrAmount = (amount) => {
    set('cost_krw', amount)
    if (trip.exchange_rate && trip.exchange_rate > 0) {
      set('cost_local', Math.round(amount / trip.exchange_rate))
    }
    setOcrState('idle')
  }

  const handleCostLocal = (v) => {
    set('cost_local', v)
    if (trip.exchange_rate && v) {
      set('cost_krw', Math.round(parseFloat(v) * trip.exchange_rate))
    }
  }

  const handleSave = async () => {
    if (!form.title) return

    setSaving(true)

    try {
      // 1. record 저장 (photo_url은 현재 form 값 그대로)
      const finalDatetime =
        photoFile
          ? (exifDate
              ? exifDate.toISOString()
              : null)
          : form.actual_datetime

      const result = await onSave({
        ...form,

        start_time: exifDate
          ? format(exifDate, 'HH:mm')
          : (form.start_time === '' || form.start_time == null
            ? initial?.start_time
            : form.start_time),

        actual_datetime: finalDatetime,

        cost_local: parseFloat(form.cost_local) || 0,
        cost_krw: parseInt(form.cost_krw) || 0,
      })

      if (result?.error) {
        alert('저장 실패: ' + result.error.message)
        setSaving(false)
        return
      }

      const savedRecord =
        Array.isArray(result?.data)
          ? result.data[0]
          : result?.data

        // 2. 새 사진 파일이 있을 때만 업로드
        if (photoFile && savedRecord?.id) {

          // 기존 사진이 있으면 먼저 삭제
          if (initial?.photo_url) {
            await deleteRecordPhoto(initial.photo_url)
          }

          let fileToUpload = photoFile

          // 500KB 이상이면 압축
          if (photoFile.size > 500 * 1024) {
            fileToUpload = await compressImage(photoFile)
          }

          const url = await uploadRecordPhoto(
            fileToUpload,
            trip.id,
            savedRecord.id
          )

          if (!url) {
            alert('사진 업로드 실패')
            setSaving(false)
            return
          }

          await supabase
          .from('records')
          .update({
            photo_url: url,
            actual_datetime: finalDatetime
          })
          .eq('id', savedRecord.id)
        }

      // 3. 사진을 지웠을 때 (photoPreview=null, 기존 photo_url이 있었을 때)
      if (!photoFile && !photoPreview && initial?.photo_url && savedRecord?.id) {

        // 1. 스토리지 파일 삭제
        await deleteRecordPhoto(initial.photo_url)

        // 2. DB 업데이트
        await supabase
          .from('records')
          .update({ photo_url: null })
          .eq('id', savedRecord.id)
      }

      onClose()
      window.location.reload()
    } catch (err) {
      console.error(err)
      alert('저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, marginBottom: 12 }}>
          {initial?.id ? '기록 수정' : '기록 추가'}
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* 제목 */}
          <div className="form-group">
            <label className="form-label">제목 *</label>
            <input className="form-input" value={form.title} onChange={e => set('title', e.target.value)} />
          </div>

          {/* 카테고리 */}
          <div className="form-group">
            <label className="form-label">카테고리</label>
            <div style={{ display: 'flex', flexWrap: 'nowrap', gap: 4 }}>
              {CATEGORIES.map(c => (
                <button key={c.value} onClick={() => set('category', c.value)} style={{
                  flex: 1, padding: '4px 0', borderRadius: 999, fontSize: 11, cursor: 'pointer',
                  whiteSpace: 'nowrap', textAlign: 'center',
                  background: form.category === c.value ? 'var(--accent)' : 'var(--bg2)',
                  color: form.category === c.value ? '#fff' : 'var(--text2)', border: 'none',
                }}>{c.label}</button>
              ))}
            </div>
          </div>

          {/* 사진 */}
          <div className="form-group">
            <label className="form-label">사진 (1장)</label>
            <input ref={photoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />

            {photoPreview ? (
              <div style={{ position: 'relative' }}>
                <img src={photoPreview} alt="기록 사진"
                  style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 8, display: 'block' }} />
                <button onClick={() => { setPhotoFile(null); setPhotoPreview(null); set('photo_url', '') }}
                  style={{
                    position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: '50%',
                    background: 'rgba(0,0,0,.5)', color: '#fff', fontSize: 14, display: 'flex',
                    alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer',
                  }}>×</button>
                {exifDate && (
                  <div style={{
                    position: 'absolute', bottom: 6, left: 6,
                    background: 'rgba(0,0,0,.55)', color: '#fff', fontSize: 11, padding: '2px 8px',
                    borderRadius: 4,
                  }}>
                    📷 {format(exifDate, 'M/d HH:mm', { locale: ko })} (EXIF)
                  </div>
                )}
              </div>
            ) : (
              <button onClick={() => photoInputRef.current?.click()}
                style={{
                  width: '100%', padding: '28px 0', borderRadius: 8,
                  border: '1.5px dashed var(--border)', background: 'var(--bg2)',
                  color: 'var(--text3)', fontSize: 13, cursor: 'pointer',
                }}>
                📷 사진 추가
              </button>
            )}
          </div>

          {/* 비용 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
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

          {/* 영수증 OCR */}
          <input ref={receiptInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleReceiptOCR} />

          {ocrState === 'idle' && (
            <button onClick={() => receiptInputRef.current?.click()}
              style={{
                padding: '8px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
                background: 'var(--bg2)', color: 'var(--text2)',
                border: '1px dashed var(--border)', width: '100%',
              }}>
              🧾 영수증 OCR로 금액 불러오기
            </button>
          )}

          {ocrState === 'loading' && (
            <div style={{
              padding: 12, borderRadius: 8, background: 'var(--bg2)',
              fontSize: 13, color: 'var(--text2)', textAlign: 'center',
            }}>
              <div style={{ marginBottom: 8 }}>영수증 분석 중... {ocrProgress}%</div>
              <div style={{ height: 4, background: 'var(--border)', borderRadius: 2 }}>
                <div style={{ height: '100%', width: `${ocrProgress}%`, background: 'var(--accent)', borderRadius: 2, transition: 'width .3s' }} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>
                일본어 OCR은 15~30초 정도 걸릴 수 있어요
              </div>
              <button onClick={async () => { await cancelOCR(); setOcrState('idle'); setOcrProgress(0) }}
                style={{ marginTop: 10, padding: '6px 12px', fontSize: 12, borderRadius: 6, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}>
                취소
              </button>
            </div>
          )}

          {ocrState === 'done' && (
            <div style={{ padding: 12, borderRadius: 8, background: 'var(--bg2)', fontSize: 13 }}>
              <div style={{ fontWeight: 500, marginBottom: 8, color: 'var(--text2)' }}>
                금액 후보 (탭하면 입력)
              </div>
              {ocrAmounts.length === 0 ? (
                <div style={{ color: 'var(--text3)' }}>금액을 인식하지 못했어요. 직접 입력해 주세요.</div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {ocrAmounts.map(amt => (
                    <button key={amt} onClick={() => selectOcrAmount(amt)}
                      style={{ padding: '6px 12px', borderRadius: 999, fontSize: 13, cursor: 'pointer', background: 'var(--accent)', color: '#fff', border: 'none' }}>
                      {amt.toLocaleString()}원
                    </button>
                  ))}
                </div>
              )}
              <button onClick={() => setOcrState('idle')}
                style={{ marginTop: 8, fontSize: 11, color: 'var(--text3)', background: 'none', border: 'none', cursor: 'pointer' }}>
                닫기
              </button>
            </div>
          )}

          {/* 결제 수단 */}
          <div className="form-group">
            <label className="form-label">결제 수단</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['card', 'cash'].map(m => (
                <button key={m} onClick={() => set('payment_method', m)} style={{
                  flex: 1, padding: '7px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
                  background: form.payment_method === m ? 'var(--accent)' : 'var(--bg2)',
                  color: form.payment_method === m ? '#fff' : 'var(--text2)', border: 'none',
                }}>{m === 'card' ? '💳 카드' : '💵 현금'}</button>
              ))}
            </div>
          </div>

          {/* 내용 / 메모 */}
          <div className="form-group">
            <label className="form-label">내용</label>
            <textarea className="form-input" rows={1} value={form.description} onChange={e => set('description', e.target.value)}
              style={{ resize: 'vertical' }} />
          </div>
          <div className="form-group">
            <label className="form-label">메모</label>
            <textarea className="form-input" rows={1} value={form.memo} onChange={e => set('memo', e.target.value)}
              tyle={{ resize: 'vertical' }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>취소</button>
          <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSave} disabled={saving || !form.title}>
            {saving ? '저장 중...' : initial?.id ? '수정 완료' : '기록 저장'}
          </button>
        </div>
      </div>
    </div>
  )
}

