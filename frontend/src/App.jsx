import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ChatProvider } from './context/ChatContext';
import { UploadProvider } from './context/UploadContext';
import { StatsProvider } from './context/StatsContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppShell from './components/layout/AppShell';
import HomePage from './pages/HomePage';
import ChatPage from './pages/ChatPage';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

/**
 * Wrapper that redirects unauthenticated users to /login.
 */
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent-from/30 border-t-accent-from rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

/**
 * Wrapper that redirects authenticated users away from auth pages.
 */
function GuestRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent-from/30 border-t-accent-from rounded-full animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/app" replace />;
  }

  return children;
}

function App() {
  return (
    <BrowserRouter>
      <StatsProvider>
        <AuthProvider>
          <ChatProvider>
            <UploadProvider>
              <Routes>
                {/* Public */}
                <Route path="/" element={<LandingPage />} />

                {/* Auth (guest only) */}
                <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
                <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />

                {/* Protected app routes */}
                <Route path="/app" element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
                  <Route index element={<HomePage />} />
                  <Route path="chat/:chatId" element={<ChatPage />} />
                </Route>
              </Routes>
            </UploadProvider>
          </ChatProvider>
        </AuthProvider>
      </StatsProvider>
    </BrowserRouter>
  );
}

export default App;
