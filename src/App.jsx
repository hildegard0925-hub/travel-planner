import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import TripDetail from './pages/TripDetail.jsx'
import MapView from './pages/MapView.jsx'
import CostSummary from './pages/CostSummary.jsx'
import Checklist from './pages/Checklist.jsx'
import Records from './pages/Records.jsx'
import ShareTrip from './pages/ShareTrip.jsx'
import ShareLayout from './pages/ShareLayout.jsx'
import { useEffect } from 'react'

import {
  checkAndPull
} from './services/syncService.js'

import {
  saveData,
  getLocalUpdatedAt
} from './services/storage.js'

export default function App() {
    useEffect(() => {

      async function initCloud() {

        try {

          const cloudData = await checkAndPull(
            getLocalUpdatedAt()
          )

          if (cloudData) {
            saveData(cloudData, false)
          }

        } catch (err) {
          console.error('Cloud 동기화 실패:', err)
        }

      }

      initCloud()

    }, [])
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />

        <Route path="trip/:tripId" element={<TripDetail />} />
        <Route path="trip/:tripId/map" element={<MapView />} />
        <Route path="trip/:tripId/cost" element={<CostSummary />} />
        <Route path="trip/:tripId/checklist" element={<Checklist />} />
        <Route path="trip/:tripId/records" element={<Records />} />

        <Route path="share/:code" element={<ShareLayout />}>
          <Route index element={<ShareTrip />} />
          <Route path="map" element={<MapView />} />
          <Route path="cost" element={<CostSummary />} />
          <Route path="checklist" element={<Checklist />} />
          <Route path="records" element={<Records />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
     </Routes>
  )
}
