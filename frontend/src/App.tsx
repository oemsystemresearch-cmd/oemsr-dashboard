import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Component, type ReactNode } from 'react';
import Home from './pages/Home';
import HistoricalData from './pages/HistoricalData';
import MarketNotices from './pages/MarketNotices';
import About from './pages/About';
import MarketDesign from './pages/MarketDesign';

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-primary flex items-center justify-center px-6">
          <div className="card p-8 max-w-md text-center">
            <p className="text-2xl mb-3">⚠️</p>
            <h2 className="text-white font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted text-sm mb-4">
              The page encountered an error. Please refresh and try again.
            </p>
            <button onClick={() => window.location.reload()} className="btn-accent">
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Routes>
          {/* Home manages its own integrated header — no global Navbar */}
          <Route path="/"        element={<ErrorBoundary><Home /></ErrorBoundary>} />
          {/* All other pages use the standard Navbar */}
          <Route path="/data"    element={<ErrorBoundary><HistoricalData /></ErrorBoundary>} />
          <Route path="/notices" element={<ErrorBoundary><MarketNotices /></ErrorBoundary>} />
          <Route path="/market-design" element={<ErrorBoundary><MarketDesign /></ErrorBoundary>} />
          <Route path="/about"        element={<ErrorBoundary><About /></ErrorBoundary>} />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
