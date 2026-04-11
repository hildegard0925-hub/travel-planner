export function linkify(text) {
  if (!text) return text

  const urlRegex =
    /(https?:\/\/[^\s]+)/g

  return text.split(urlRegex).map(
    (part, i) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#1976d2',
              textDecoration: 'underline',
              wordBreak: 'break-all'
            }}
            onClick={e =>
              e.stopPropagation()
            }
          >
            {part}
          </a>
        )
      }

      return part
    }
  )
}