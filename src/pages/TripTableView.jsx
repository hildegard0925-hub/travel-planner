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
  const [headerOffset, setHeaderOffset] = useState(0)

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

  useEffect(() => {
    const updateOffset = () => {
      const header = document.querySelector('.top-header')

      if (header) {
        setHeaderOffset(header.offsetHeight)
      }
    }

    updateOffset()

    window.addEventListener('resize', updateOffset)

    return () => {
      window.removeEventListener('resize', updateOffset)
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

  const wrapCell = {
    ...cellStyle,
    whiteSpace: 'normal'
  }

  const wrapLeftCell = {
    ...cellStyle,
    whiteSpace: 'normal',
    textAlign: 'left'
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
              {allSchedules.map(item => (
                <tr key={item.id}>

                  {/* 일자 */}
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

                  {/* 시간 */}
                  <td style={centerCell}>
                    {item.start_time
                      ? `${item.start_time.slice(0, 5)}${
                          item.end_time
                            ? `~${item.end_time.slice(0, 5)}`
                            : ''
                        }`
                      : ''}
                  </td>

                  {/* 일정 */}
                  <td style={leftCell}>
                    {item.title}
                  </td>

                  {/* 내용 */}
                  <td style={wrapLeftCell}>
                    {item.description}
                  </td>

                  {/* 현지 */}
                  <td style={rightCell}>
                    {item.cost_local?.toLocaleString()}
                  </td>

                  {/* 원화 */}
                  <td style={rightCell}>
                    {item.cost_krw?.toLocaleString()}
                  </td>

                  {/* 결제 */}
                  <td style={centerCell}>
                    {item.payment_method}
                  </td>

                  {/* 메모 */}
                  <td style={wrapLeftCell}>
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

        <div style={{ padding: '4px 16px 0' }}>

          {/* header table */}
          <table
            style={{
              width: 'calc(100% - 4px)',
              borderCollapse: 'collapse',
              fontSize: 11,
              minWidth: isMobile ? 'auto' : 900,
              background: '#f5f5f5',
              tableLayout: 'fixed',
            }}
          >

            <colgroup>
              <col style={{ width: colWidths.date }} />
              <col style={{ width: colWidths.time }} />
              <col style={{ width: colWidths.title }} />
              <col style={{ width: colWidths.description }} />
              <col style={{ width: colWidths.local }} />
              <col style={{ width: colWidths.krw }} />
              <col style={{ width: colWidths.payment }} />
              <col style={{ width: colWidths.memo }} />
            </colgroup>

            <thead>
              <tr>
                <th style={{ ...headerStyle, width: colWidths.date }}>일자</th>
                <th style={{ ...headerStyle, width: colWidths.time }}>시간</th>
                <th style={{ ...headerStyle, width: colWidths.title }}>일정</th>
                <th style={{ ...headerStyle, width: colWidths.description }}>내용</th>
                <th style={{ ...headerStyle, width: colWidths.local }}>현지</th>
                <th style={{ ...headerStyle, width: colWidths.krw }}>원화</th>
                <th style={{ ...headerStyle, width: colWidths.payment }}>결제</th>
                <th style={{ ...headerStyle, width: colWidths.memo }}>메모</th>
              </tr>
            </thead>
          </table>

        </div>


        {/* body scroll 영역 */}
        
        <div
          style={{
            height: 'calc(100vh - var(--header-h) - var(--nav-h) - 45px)',
            overflow: 'auto',
            padding: '0 16px 16px',
            overflowX: isMobile ? 'auto' : 'hidden'
          }}
        >

          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 11,
              minWidth: isMobile ? 'auto' : 900,
              background: '#fff',
              tableLayout: 'fixed'
            }}
          >

            <colgroup>
              <col style={{ width: colWidths.date }} />
              <col style={{ width: colWidths.time }} />
              <col style={{ width: colWidths.title }} />
              <col style={{ width: colWidths.description }} />
              <col style={{ width: colWidths.local }} />
              <col style={{ width: colWidths.krw }} />
              <col style={{ width: colWidths.payment }} />
              <col style={{ width: colWidths.memo }} />
            </colgroup>
            <tbody>

              {allSchedules.map(item => (
                <tr
                  key={item.id}
                >
                  <td style={{ ...cellStyle, width: colWidths.date, textAlign: 'center' }}>
                    {format(
                      addDays(
                        new Date(trip.start_date),
                        item.day_index
                      ),
                      'M/d',
                      { locale: ko }
                    )}
                  </td>

                  <td style={{ ...cellStyle, width: colWidths.time, textAlign: 'center' }}>
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

                  <td style={{ ...cellStyle, textAlign: 'center' }}>
                    {item.payment_method}
                  </td>

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

                <td
                  style={{
                    ...cellStyle,
                    fontWeight: 600,
                    textAlign: 'right'
                  }}
                >
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