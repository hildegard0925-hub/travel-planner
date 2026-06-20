import { useRef } from 'react'

export default function DataManageModal({
  open,
  onClose,
  onBackup,
  onRestore
}) {
  const fileInputRef = useRef(null)

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
              💾 데이터 백업
            </button>

            <button
              className="btn"
              onClick={handleRestoreClick}
            >
              📂 데이터 복원
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
            accept=".zip,.json"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>
      </div>
    </>
  )
}