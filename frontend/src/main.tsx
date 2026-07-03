if (import.meta.env.DEV) {
  import("react-grab");
}

import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HeroUIProvider } from '@heroui/system'
import { App } from './App'
import './styles/globals.css'
// Web-safe font aliases (Courier New=Cousine, Arial=Arimo, …) so the on-screen
// editor/preview renders the same bundled fonts the PDF embeds.
import './styles/contract-fonts.css'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

const container = document.getElementById('root')!

declare global {
  interface Window { __reactRoot?: ReactDOM.Root }
}

const root = window.__reactRoot ?? (window.__reactRoot = ReactDOM.createRoot(container))

root.render(
  <React.StrictMode>
    <HeroUIProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </HeroUIProvider>
  </React.StrictMode>,
)
