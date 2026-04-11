import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import TripDetail from './pages/TripDetail.jsx'
import MapView from './pages/MapView.jsx'
import CostSummary from './pages/CostSummary.jsx'
import Checklist from './pages/Checklist.jsx'
import Records from './pages/Records.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="trip/:tripId" element={<TripDetail />} />
        <Route path="trip/:tripId/map" element={<MapView />} />
        <Route path="trip/:tripId/cost" element={<CostSummary />} />
        <Route path="trip/:tripId/checklist" element={<Checklist />} />
        <Route path="trip/:tripId/records" element={<Records />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
