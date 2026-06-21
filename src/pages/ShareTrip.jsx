import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getShare } from '../services/shareService'
import { ShareProvider } from '../contexts/ShareContext'
import TripDetail from './TripDetail'

export default function ShareTrip() {

  const { code } = useParams()

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {

    async function fetchData() {

      try {

        const result = await getShare(code)

        setData(result)

        console.log(result)
        console.log('trip', result.trip)
        console.log('schedules', result.schedules)
        console.log('records', result.records)
        console.log('checklists', result.checklists)

      } catch (err) {

        console.error(err)

      } finally {

        setLoading(false)

      }

    }

    fetchData()

  }, [code])

  if (loading) {
    return (
      <div style={{ padding: 40 }}>
        불러오는 중...
      </div>
    )
  }

  if (!data) {
    return (
      <div style={{ padding: 40 }}>
        공유된 여행이 없습니다.
      </div>
    )
  }

  return (
    <ShareProvider value={data}>
        <TripDetail />
    </ShareProvider>
    )
}