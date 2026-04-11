export default function PhotoViewer({
  photoUrl,
  onClose
}) {
  if (!photoUrl) return null

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
    >
      <img
        src={photoUrl}
        alt="사진"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '95%',
          maxHeight: '90%',
          borderRadius: 8,
          objectFit: 'contain',
          background: '#000',
        }}
      />

      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: 'rgba(0,0,0,.6)',
          color: '#fff',
          border: 'none',
          fontSize: 18,
          cursor: 'pointer',
        }}
      >
        ×
      </button>
    </div>
  )
}