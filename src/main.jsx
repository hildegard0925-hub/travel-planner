import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { APIProvider } from '@vis.gl/react-google-maps'
import App from './App.jsx'
import './index.css'

const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <APIProvider apiKey={MAPS_KEY} libraries={['places']}>
        <App />
      </APIProvider>
    </BrowserRouter>
  </React.StrictMode>
)
