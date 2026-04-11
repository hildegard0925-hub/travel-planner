import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { addDays, format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { linkify } from '../utils/linkify'

export default function TripTableView({
  byDay,
  tripId,
  trip,
  setViewMode
}) {
  const navigate = useNavigate()

  const DEFAULT_WIDTHS = {
    date: 70,
    time: 110,
    title: 120,
    description: 150,
    local: 100,
    krw: 110,
    payment: 80,
    memo: 120
  }

  const [colWidths, setColWidths] = useState(DEFAULT_WIDTHS)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

    useEffect(() => {
        const handleResize = () => {
          setIsMobile(window.innerWidth < 768)
        }

        window.addEventListener('resize', handleResize)

        return () => {
          window.removeEventListener('resize', handleResize)
        }
      }, [])

  useEffect(() => {
    const saved = localStorage.getItem('tripTableWidths')

    if (saved) {
      setColWidths(JSON.parse(saved))
    }
  }, [])

  const cellStyle = {
    border: '1px solid #ddd',
    padding: '4px 8px',
    whiteSpace: 'nowrap'
    }
  const headerStyle = {
    ...cellStyle,
    background: '#f5f5f5',
    position: 'sticky',
    top: 0,
    zIndex: 5,
    textAlign: 'center'
  }

  // 전체 일정 합치기 + 정렬
  const allSchedules = Object.entries(byDay)
    .flatMap(([dayIndex, items]) =>
      items.map(item => ({
        ...item,
        day_index: Number(dayIndex)
      }))
    )
    .sort((a, b) => {
      if (a.day_index !== b.day_index)
        return a.day_index - b.day_index

      return (a.start_time || '').localeCompare(b.start_time || '')
    })
  const updateWidth = (key, width) => {
    const updated = {
      ...colWidths,
      [key]: width
    }

    setColWidths(updated)

    localStorage.setItem(
      'tripTableWidths',
      JSON.stringify(updated)
    )
  }
  const startResize = (e, key) => {
    const startX = e.clientX
    const startWidth = colWidths[key]

    const onMouseMove = (moveEvent) => {
      const newWidth =
        startWidth +
        (moveEvent.clientX - startX)

      if (newWidth > 40) {
        updateWidth(key, newWidth)
      }
    }

    const onMouseUp = () => {
      document.removeEventListener(
        'mousemove',
        onMouseMove
      )
      document.removeEventListener(
        'mouseup',
        onMouseUp
      )
    }

    document.addEventListener(
      'mousemove',
      onMouseMove
    )

    document.addEventListener(
      'mouseup',
      onMouseUp
    )
  }
  const totalKrw = allSchedules.reduce(
    (sum, s) => sum + (s.cost_krw || 0),
    0
  )

  return (
    <div>

        <div className="top-header">
        <button
            className="btn-ghost"
            onClick={() => setViewMode('timeline')}
        >
            ← 타임라인
        </button>

        <h1>{trip.title}</h1>
        </div>

        <div style={{ padding: 16, overflowX: 'auto' }}>
      
    
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 11,
          minWidth: isMobile ? 'auto' : 900,
          background: '#fff',
          tableLayout: isMobile ? 'auto' : 'fixed'
        }}
      >
        <th
          style={{
            ...headerStyle,
            width: colWidths.date,
            position: 'relative'
          }}
        >
          일자

          <div
            onMouseDown={(e) =>
              startResize(e, 'date')
            }
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              width: 6,
              height: '100%',
              cursor: 'col-resize'
            }}
          />
        </th>
        <th
          style={{
            ...headerStyle,
            width: colWidths.time,
            position: 'relative'
          }}
        >
          시간

          <div
            onMouseDown={(e) =>
              startResize(e, 'time')
            }
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              width: 6,
              height: '100%',
              cursor: 'col-resize'
            }}
          />
        </th>
        <th
          style={{
            ...headerStyle,
            width: colWidths.title,
            position: 'relative'
          }}
        >
          일정

          <div
            onMouseDown={(e) =>
              startResize(e, 'title')
            }
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              width: 6,
              height: '100%',
              cursor: 'col-resize'
            }}
          />
        </th>
        <th
          style={{
            ...headerStyle,
            width: colWidths.description,
            position: 'relative'
          }}
        >
          내용

          <div
            onMouseDown={(e) =>
              startResize(e, 'description')
            }
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              width: 6,
              height: '100%',
              cursor: 'col-resize'
            }}
          />
        </th>
        <th
          style={{
            ...headerStyle,
            width: colWidths.local,
            position: 'relative'
          }}
        >
          현지

          <div
            onMouseDown={(e) =>
              startResize(e, 'local')
            }
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              width: 6,
              height: '100%',
              cursor: 'col-resize'
            }}
          />
        </th>
        <th
          style={{
            ...headerStyle,
            width: colWidths.krw,
            position: 'relative'
          }}
        >
          원화

          <div
            onMouseDown={(e) =>
              startResize(e, 'krw')
            }
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              width: 6,
              height: '100%',
              cursor: 'col-resize'
            }}
          />
        </th>
        <th
          style={{
            ...headerStyle,
            width: colWidths.payment,
            position: 'relative'
          }}
        >
          결제

          <div
            onMouseDown={(e) =>
              startResize(e, 'payment')
            }
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              width: 6,
              height: '100%',
              cursor: 'col-resize'
            }}
          />
        </th>
        <th
          style={{
            ...headerStyle,
            width: colWidths.memo,
            position: 'relative'
          }}
        >
          메모

          <div
            onMouseDown={(e) =>
              startResize(e, 'memo')
            }
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              width: 6,
              height: '100%',
              cursor: 'col-resize'
            }}
          />
        </th>
        
        <tbody>
          {allSchedules.map(item => (
            <tr
              key={item.id}
              onDoubleClick={() => {
                navigate(
                  `/trip/${tripId}?day=${item.day_index}&focus=${item.id}`
                )
              }}
              style={{
                cursor: 'pointer'
              }}
            >
              <td style={{ ...cellStyle, width: 70, textAlign: 'center' }}>
                {format(
                    addDays(
                    new Date(trip.start_date),
                    item.day_index
                    ),
                    'M/d',
                    { locale: ko }
                )}
                </td>

              <td style={{ ...cellStyle, width: 110, textAlign: 'center' }}>
                {item.start_time
                  ? `${item.start_time.slice(0, 5)}${
                      item.end_time
                        ? `~${item.end_time.slice(0, 5)}`
                        : ''
                    }`
                  : ''}
              </td>

              <td style={{ ...cellStyle, textAlign: 'left' }}>
                {item.title}
              </td>

              <td
                style={{
                  ...cellStyle,
                  whiteSpace: isMobile ? 'normal' : 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {item.description}
              </td>
              <td style={{ ...cellStyle, textAlign: 'right' }}>
                {item.cost_local
                  ? item.cost_local.toLocaleString()
                  : ''}
              </td>

              <td style={{ ...cellStyle, textAlign: 'right' }}>
                {item.cost_krw
                  ? item.cost_krw.toLocaleString()
                  : ''}
              </td>

              <td style={{ ...cellStyle, textAlign: 'center' }}>{item.payment_method}</td>

              <td style={{ ...cellStyle, textAlign: 'left' }}>
                {linkify(item.memo)}
                </td>
            </tr>
          ))}

          <tr>
            <td
                colSpan={5}
                style={{
                    ...cellStyle,
                    textAlign: 'right',
                    fontWeight: 600
                }}
                >
              합계
            </td>

            <td style={{
                ...cellStyle,
                fontWeight: 600,
                textAlign: 'right'
                }}>
              {totalKrw.toLocaleString()} 원
            </td>

            <td colSpan={2}></td>
          </tr>
        </tbody>
      </table>
    </div>
   </div>
  )
}