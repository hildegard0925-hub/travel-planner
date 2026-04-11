import { useState, useEffect } from 'react'

export function useGeolocation() {
  const [position, setPosition] = useState(null)
  const [error, setError] = useState(null)
  const [watching, setWatching] = useState(false)
  const [heading, setHeading] = useState(null)

  useEffect(() => {
    if (!watching) return
    if (!navigator.geolocation) {
      setError('이 브라우저는 위치 정보를 지원하지 않습니다.')
      return
    }

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        })

        if (pos.coords.heading !== null) {
          setHeading(pos.coords.heading)
        }
      },
      (err) => setError(err.message),
      { enableHighAccuracy: true, timeout: 10000 }
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [watching])

  function startWatch() {
    setWatching(true)
  }

  function stopWatch() {
    setWatching(false)
  }
  return {
    position,
    heading,
    error,
    watching,
    startWatch,
    stopWatch
  }
}
