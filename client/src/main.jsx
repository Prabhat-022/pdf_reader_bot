import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const Base_URL = import.meta.env.PROD
  ? 'https://pdf-reader-bot-backend.vercel.app/'
  : 'http://localhost:3000';
  

// Make Base_URL available globally or pass it to your App component
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

export { Base_URL };
