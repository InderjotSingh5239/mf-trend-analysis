import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute } from '@/components/common/ProtectedRoute'
import { Loader } from '@/components/common/Loader'

const Landing = lazy(() => import('@/pages/Landing'))
const Login = lazy(() => import('@/pages/Login'))
const Register = lazy(() => import('@/pages/Register'))
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Explorer = lazy(() => import('@/pages/Explorer'))
const FundDetails = lazy(() => import('@/pages/FundDetails'))
const AIPrediction = lazy(() => import('@/pages/AIPrediction'))
const Analytics = lazy(() => import('@/pages/Analytics'))
const CompareFunds = lazy(() => import('@/pages/CompareFunds'))
const Portfolio = lazy(() => import('@/pages/Portfolio'))
const SipCalculator = lazy(() => import('@/pages/SipCalculator'))
const LumpsumCalculator = lazy(() => import('@/pages/LumpsumCalculator'))
const Watchlist = lazy(() => import('@/pages/Watchlist'))
const News = lazy(() => import('@/pages/News'))
const About = lazy(() => import('@/pages/About'))
const Settings = lazy(() => import('@/pages/Settings'))
const NotFound = lazy(() => import('@/pages/NotFound'))

function PageFallback() {
  return <Loader label="LOADING..." className="min-h-[60vh]" />
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/explore" element={<Explorer />} />
            <Route path="/funds/:id" element={<FundDetails />} />
            <Route path="/predict" element={<AIPrediction />} />
            <Route path="/predict/:id" element={<AIPrediction />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/compare" element={<CompareFunds />} />
            <Route path="/calculators/sip" element={<SipCalculator />} />
            <Route path="/calculators/lumpsum" element={<LumpsumCalculator />} />
            <Route path="/news" element={<News />} />
            <Route path="/about" element={<About />} />
            {/* Account-bound pages: require a signed-in user */}
            <Route element={<ProtectedRoute />}>
              <Route path="/portfolio" element={<Portfolio />} />
              <Route path="/watchlist" element={<Watchlist />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
