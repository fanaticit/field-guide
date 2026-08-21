import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.tsx'
import { initAuth } from './store/authStore.ts'
import './index.css'

// Bootstrap Supabase session listener before the React tree renders.
// This loads any persisted session from localStorage and subscribes
// to auth state changes (sign in, sign out, token refresh) for the
// app's lifetime.
initAuth()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
)
