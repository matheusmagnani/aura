import { AppRoutes } from './routes/AppRoutes'
import { Toast } from './shared/components/Toast'
import { GlobalLoading } from './shared/components/GlobalLoading'

export function App() {
  return (
    <>
      <AppRoutes />
      <Toast />
      <GlobalLoading />
    </>
  )
}
