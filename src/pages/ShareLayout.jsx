import { Outlet, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { ShareProvider } from '../contexts/ShareContext'
import { getShare } from '../services/shareService'

export default function ShareLayout() {

  const { code } = useParams()

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {

    async function load() {

      try {

        const result = await getShare(code)

        setData(result)

      } finally {

        setLoading(false)

      }

    }

    load()

  }, [code])

  if (loading) {
    return <div style={{ padding: 40 }}>불러오는 중...</div>
  }

  if (!data) {
    return <div style={{ padding: 40 }}>공유된 여행이 없습니다.</div>
  }

  return (
    <ShareProvider value={data}>
      <Outlet />
    </ShareProvider>
  )
}