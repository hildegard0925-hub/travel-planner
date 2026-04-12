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
    date: 100,
    time: 110,
    title: 250,
    local: 130,
    krw: 130,
    payment: 120
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
  const centerCell = {
    ...cellStyle,
    textAlign: 'center'
  }

  const rightCell = {
    ...cellStyle,
    textAlign: 'right'
  }

  const leftCell = {
    ...cellStyle,
    textAlign: 'left'
  }

  const wrapLeftCell = {
    ...cellStyle,
    whiteSpace: 'normal',
    textAlign: 'left'
  }

  // 전체 일정 합치기 + 정렬
  const allrecords = Object.entries(byDay)
    .flatMap(([dayIndex, items]) =>
      items.map(item => ({
        ...item,
        day_index: Number(dayIndex)
      }))
    )
    .sort((a, b) => {
      if (a.day_index !== b.day_index)
        return a.day_index - b.day_index

      const ta = a.start_time || a.schedule_time || '99:99'
      const tb = b.start_time || b.schedule_time || '99:99'

      return ta.localeCompare(tb)
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
  const totalKrw = allrecords.reduce(
    (sum, s) => sum + (s.cost_krw || 0),
    0
  )
  if (isMobile) {
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

        <div
          style={{
            overflowX: 'auto',
            padding: '4px 16px 16px'
          }}
        >

          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 11,
              minWidth: 'max-content',
              tableLayout: 'auto',
              background: '#fff'
            }}
          >

            <thead>
              <tr>
                <th style={headerStyle}>일자</th>
                <th style={headerStyle}>시간</th>
                <th style={headerStyle}>일정</th>
                <th style={headerStyle}>내용</th>
                <th style={headerStyle}>현지</th>
                <th style={headerStyle}>원화</th>
                <th style={headerStyle}>결제</th>
                <th style={headerStyle}>메모</th>
              </tr>
            </thead>

            <tbody>
              {allrecords.map(item => (
                <tr
                  key={item.id}
                >

                  <td style={centerCell}>
                    {format(
                      addDays(
                        new Date(trip.start_date),
                        item.day_index
                      ),
                      'M/d',
                      { locale: ko }
                    )}
                  </td>

                  <td style={centerCell}>
                    {(item.start_time || item.schedule_time)
                      ? `${(item.start_time || item.schedule_time).slice(0, 5)}${
                          item.end_time
                            ? `~${item.end_time.slice(0, 5)}`
                            : ''
                        }`
                      : ''}
                  </td>

                  <td style={leftCell}>
                    {item.title}
                  </td>

                  <td
                    style={{
                      ...wrapLeftCell,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {item.description}
                  </td>

                  <td style={rightCell}>
                    {item.cost_local
                      ? item.cost_local.toLocaleString()
                      : ''}
                  </td>

                  <td style={rightCell}>
                    {item.cost_krw
                      ? item.cost_krw.toLocaleString()
                      : ''}
                  </td>

                  <td style={centerCell}>
                    {item.payment_method}
                  </td>

                  <td style={leftCell}>
                    {linkify(item.memo)}
                  </td>

                </tr>
              ))}
            </tbody>

          </table>

        </div>

      </div>
    )
  }

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

        <div style={{ padding: '4px 16px 16px', overflowX: 'auto' }}>
      <table
        style={{
          width: 'calc(100% - 4px)',
          borderCollapse: 'collapse',
          fontSize: 11,
          minWidth: isMobile ? 'auto' : 900,
          background: '#fff',
          tableLayout: isMobile ? 'auto' : 'fixed'
        }}
      >
        <thead>
          <tr>
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
          </tr>
        </thead>
        
        <tbody>
          {allrecords.map(item => (
            <tr
              key={item.id}
            >
              <td style={centerCell}>
                {format(
                    addDays(
                    new Date(trip.start_date),
                    item.day_index
                    ),
                    'M/d',
                    { locale: ko }
                )}
                </td>

              <td style={{ ...cellStyle, textAlign: 'center' }}>
                {(item.start_time || item.schedule_time)
                  ? `${(item.start_time || item.schedule_time).slice(0, 5)}${
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