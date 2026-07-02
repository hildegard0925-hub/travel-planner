import { useRef } from 'react'
import {
  getLastSyncedAt
} from '../services/syncService'

export default function DataManageModal({
  open,
  onClose,
  onBackup,
  onRestore
}) {
  const fileInputRef = useRef(null)

  const lastSynced = getLastSyncedAt()

  const formattedSyncTime =
    lastSynced
      ? new Date(lastSynced).toLocaleString('ko-KR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        })
      : '-'

  if (!open) return null

  function handleRestoreClick() {
    fileInputRef.current?.click()
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return

    onRestore(file)

    // 같은 파일 다시 선택 가능하도록
    e.target.value = ''
  }

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div
          className="modal-sheet"
          onClick={e => e.stopPropagation()}
        >
          <div className="modal-handle" />

          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 20,
              marginBottom: 20
            }}
          >
            데이터 관리
          </h2>

          <div
            style={{
              border: '1px solid #e5e5e5',
              borderRadius: 10,
              padding: 14,
              marginBottom: 18,
              background: '#fafafa'
            }}
          >
            <div
              style={{
                fontWeight: 700,
                marginBottom: 12
              }}
            >
              ☁️ Cloud 자동 동기화
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 8
              }}
            >
              <span>상태</span>

              <strong>
                🟢 정상
              </strong>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between'
              }}
            >
              <span>마지막 Cloud 저장</span>

              <strong>
                {formattedSyncTime}
              </strong>
            </div>

            <div
              style={{
                marginTop: 12,
                fontSize: 13,
                color: '#777',
                lineHeight: 1.5
              }}
            >
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10
            }}
          >
            <button
              className="btn"
              onClick={() => {
                onBackup()
                onClose()
              }}
            >
              💾 사진 백업
            </button>

            <button
              className="btn"
              onClick={handleRestoreClick}
            >
              🖼️ 사진 복원
            </button>

            <button
              className="btn"
              onClick={onClose}
            >
              닫기
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".zip"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>
      </div>
    </>
  )
}