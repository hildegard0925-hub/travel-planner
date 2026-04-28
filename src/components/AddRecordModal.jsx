import { useState, useRef, useEffect } from 'react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { readPhotoDate, readPhotoGps } from '../utils/exif.js'
import { compressImage } from '../utils/imageUtils'

import { uploadRecordPhoto } from '../services/storage.js'
import { deleteRecordPhoto } from '../services/storage.js'
import { supabase } from '../lib/supabase.js'

const CATEGORIES = [
  { value: 'food', label: '🍜 식사' },
  { value: 'transport', label: '🛣️ 이동' },
  { value: 'shopping', label: '🛍️ 쇼핑' },
  { value: 'activity', label: '🧭 관광' },
  { value: 'lodging', label: '💒 숙소' },
  { value: 'etc', label: '📌 기타' },
]

// 시간 선택 옵션 (30분 단위)
const TIME_OPTIONS = []

for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 30) {
    const hh = String(h).padStart(2, '0')
    const mm = String(m).padStart(2, '0')
    TIME_OPTIONS.push(`${hh}:${mm}`)
  }
}

export default function AddRecordModal({ trip, initial, onClose, onSave, onRefresh }) {
  const [form, setForm] = useState({
    title: initial?.title ?? '',
    category: initial?.category ?? 'food',
    start_time: initial?.start_time?.slice(0, 5) ?? '',
    end_time: initial?.end_time?.slice(0, 5) ?? '',
    description: initial?.description ?? '',
    address: initial?.address ?? '',
    cost_local: initial?.cost_local ?? '',
    cost_krw: initial?.cost_krw ?? '',
    payment_method: initial?.payment_method ?? 'card',
    memo: initial?.memo ?? '',
    photo_url: initial?.photo_url ?? '',
    actual_datetime: initial?.actual_datetime ?? null,
    day_index: initial?.day_index ?? 0,
    rating: initial?.rating ?? null,
    lat: initial?.lat ?? null,
    lng: initial?.lng ?? null,
  })

  // 수정 모달: 기존 사진을 초기값으로 바로 세팅
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(initial?.photo_url ?? null)
  const [exifDate, setExifDate] = useState(
    initial?.actual_datetime ? new Date(initial.actual_datetime) : null
  )
  const [exifGps, setExifGps] = useState(null)
  const [gpsConfirmed, setGpsConfirmed] = useState(!!initial?.lat)
  const [saving, setSaving] = useState(false)
  const [gpsUnavailable, setGpsUnavailable] = useState(false)
  const [placeQuery, setPlaceQuery] = useState('')
  const [placeSuggestions, setPlaceSuggestions] = useState([])

  const photoInputRef = useRef()
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handlePlaceSearch = async (query) => {
    setPlaceQuery(query)
    if (!query.trim()) { setPlaceSuggestions([]); return }
    try {
      const { AutocompleteSuggestion } = await window.google.maps.importLibrary('places')
      const request = { input: query }
      const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions(request)
      setPlaceSuggestions(suggestions.map(s => ({
        place_id: s.placePrediction.placeId,
        description: s.placePrediction.text.toString(),
      })))
    } catch {
      setPlaceSuggestions([])
    }
  }

  const handlePlaceSelect = async (placeId, description) => {
    try {
      const { Place } = await window.google.maps.importLibrary('places')
      const place = new Place({ id: placeId })
      await place.fetchFields({ fields: ['location', 'formattedAddress'] })
      const coords = {
        lat: place.location.lat(),
        lng: place.location.lng(),
      }
      setExifGps(coords)
      setGpsConfirmed(true)
      set('lat', coords.lat)
      set('lng', coords.lng)
      set('address', place.formattedAddress || description)
      setGpsUnavailable(false)
      setPlaceSuggestions([])
      setPlaceQuery('')
    } catch {
      alert('장소 정보를 가져오지 못했습니다.')
    }
  }

  // 사진 선택 → 미리보기 + EXIF 읽기
  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setExifDate(null)
    set('actual_datetime', null)
    setExifGps(null)
    setGpsConfirmed(false)
    set('lat', null)
    set('lng', null)

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

    // day_index 자동 계산
    const tripStart = new Date(trip.start_date)
    tripStart.setHours(0, 0, 0, 0)
    const totalDays = Math.ceil((new Date(trip.end_date) - new Date(trip.start_date)) / 86400000) + 1
    const dayIdx = Math.floor((date - tripStart) / 86400000)
    const clampedIdx = Math.max(0, Math.min(dayIdx, totalDays - 1))
    set('day_index', clampedIdx)

    // GPS 읽기 (없어도 진행)
    const gps = await readPhotoGps(file)
    if (gps) {
      setExifGps(gps)
      setGpsUnavailable(false)
    } else {
      setGpsUnavailable(true)
    }
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

        end_time:
          form.end_time === '' || form.end_time == null
            ? initial?.end_time
            : form.end_time,

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

      if (onRefresh) await onRefresh()  // 데이터만 새로 불러오기
      onClose()
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

          {/* 일차 */}
          <div className="form-group">
            <label className="form-label">날짜</label>
            <select
              className="form-input"
              value={form.day_index}
              onChange={e => set('day_index', Number(e.target.value))}
            >
              {Array.from({
                length: Math.ceil((new Date(trip.end_date) - new Date(trip.start_date)) / 86400000) + 1
              }, (_, i) => (
                <option key={i} value={i}>
                  {i + 1}일차 ({format(new Date(new Date(trip.start_date).getTime() + i * 86400000), 'M/d')})
                </option>
              ))}
            </select>
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

          {/* 별점 */}
          <div className="form-group">
            <label className="form-label">별점 (선택)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  onClick={() => set('rating', form.rating === n ? null : n)}
                  style={{
                    fontSize: 24, background: 'none', border: 'none',
                    cursor: 'pointer', padding: '2px 3px',
                    opacity: form.rating >= n ? 1 : 0.2,
                  }}
                >⭐</button>
              ))}
              {form.rating && (
                <span style={{ fontSize: 12, color: 'var(--text3)', marginLeft: 6 }}>
                  {['', '최악', '별로', '보통', '좋음', '최고!'][form.rating]}
                </span>
              )}
            </div>
          </div>

          {/* 사진 */}
          <div className="form-group">
            <label className="form-label">사진 (1장)</label>

            {photoPreview ? (
              <>
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

                {/* GPS 확인 */}
                {exifGps && !gpsConfirmed && (
                  <div style={{ background: 'var(--bg2)', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 6 }}>
                      📍 사진 위치를 지도에 표시할까요?
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8 }}>
                      {exifGps.lat.toFixed(5)}, {exifGps.lng.toFixed(5)}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => { set('lat', exifGps.lat); set('lng', exifGps.lng); setGpsConfirmed(true) }}
                        style={{ flex: 1, padding: '6px', borderRadius: 8, background: 'var(--accent)', color: '#fff', border: 'none', fontSize: 12, cursor: 'pointer' }}>
                        등록
                      </button>
                      <button onClick={() => setExifGps(null)}
                        style={{ flex: 1, padding: '6px', borderRadius: 8, background: 'var(--bg3)', color: 'var(--text2)', border: 'none', fontSize: 12, cursor: 'pointer' }}>
                        건너뛰기
                      </button>
                    </div>
                  </div>
                )}
                {exifGps && gpsConfirmed && (
                  <div style={{ fontSize: 12, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    📍 위치 등록됨
                    <button onClick={() => { setExifGps(null); set('lat', null); set('lng', null); setGpsConfirmed(false) }}
                      style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 11, cursor: 'pointer', textDecoration: 'underline' }}>
                      취소
                    </button>
                  </div>
                )}

                {/* GPS 없을 때 장소 검색 폴백 */}
                {!exifGps && gpsUnavailable && (
                  <div style={{ background: 'var(--bg2)', borderRadius: 8, padding: '10px 12px', marginTop: 8 }}>
                    <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 8 }}>
                      📍 위치를 장소로 검색해서 등록할 수 있어요
                    </div>
                    <input
                      className="form-input"
                      placeholder="장소명 또는 주소 검색"
                      value={placeQuery}
                      onChange={e => handlePlaceSearch(e.target.value)}
                      style={{ marginBottom: placeSuggestions.length ? 4 : 0 }}
                    />
                    {placeSuggestions.length > 0 && (
                      <div style={{
                        background: 'var(--bg1)', borderRadius: 8,
                        border: '1px solid var(--border)', overflow: 'hidden',
                      }}>
                        {placeSuggestions.map(p => (
                          <button
                            key={p.place_id}
                            onClick={() => handlePlaceSelect(p.place_id, p.description)}
                            style={{
                              width: '100%', padding: '8px 12px', textAlign: 'left',
                              background: 'none', border: 'none', borderBottom: '1px solid var(--border)',
                              fontSize: 12, color: 'var(--text1)', cursor: 'pointer',
                            }}
                          >
                            {p.description}
                          </button>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={() => { setGpsUnavailable(false); setPlaceQuery(''); setPlaceSuggestions([]) }}
                      style={{
                        marginTop: 6, width: '100%', padding: '6px', borderRadius: 8,
                        background: 'var(--bg3)', color: 'var(--text2)',
                        border: 'none', fontSize: 12, cursor: 'pointer',
                      }}
                    >
                      건너뛰기
                    </button>
                  </div>
                )}
              </>
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
          <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handlePhotoChange}
            />
          </div> 

          {/* 시간 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
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

