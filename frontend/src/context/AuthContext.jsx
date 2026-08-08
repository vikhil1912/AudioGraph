import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { setAuthFetch } from '../services/api';

const AuthContext = createContext(null);

const TOKEN_KEY = 'audiograph_access_token';
const REFRESH_KEY = 'audiograph_refresh_token';
const USER_KEY = 'audiograph_user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem(USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [refreshToken, setRefreshToken] = useState(() => localStorage.getItem(REFRESH_KEY));
  const [loading, setLoading] = useState(true);

  const isAuthenticated = !!accessToken && !!user;

  // Save tokens to localStorage whenever they change
  useEffect(() => {
    if (accessToken) localStorage.setItem(TOKEN_KEY, accessToken);
    else localStorage.removeItem(TOKEN_KEY);
  }, [accessToken]);

  useEffect(() => {
    if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
    else localStorage.removeItem(REFRESH_KEY);
  }, [refreshToken]);

  useEffect(() => {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  }, [user]);

  // Validate existing token on mount
  useEffect(() => {
    const validateToken = async () => {
      if (!accessToken) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        });
        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
        } else if (res.status === 401 && refreshToken) {
          // Try refreshing
          const refreshed = await tryRefresh();
          if (!refreshed) {
            logout();
          }
        } else {
          logout();
        }
      } catch {
        // Network error — keep existing state
      } finally {
        setLoading(false);
      }
    };
    validateToken();
  }, []); // Only on mount

  const refreshPromiseRef = useRef(null);

  const tryRefresh = useCallback(async () => {
    if (!refreshToken) return null;
    
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    refreshPromiseRef.current = (async () => {
      try {
        const res = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
        if (res.ok) {
          const data = await res.json();
          setAccessToken(data.access_token);
          setRefreshToken(data.refresh_token);
          // Re-fetch user
          const meRes = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${data.access_token}` },
          });
          if (meRes.ok) {
            const userData = await meRes.json();
            setUser(userData);
          }
          return data.access_token;
        }
        return null;
      } catch {
        return null;
      } finally {
        refreshPromiseRef.current = null;
      }
    })();

    return refreshPromiseRef.current;
  }, [refreshToken]);

  const login = useCallback(async (email, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || 'Login failed');
    }
    const data = await res.json();
    setAccessToken(data.access_token);
    setRefreshToken(data.refresh_token);
    // Fetch user profile
    const meRes = await fetch('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${data.access_token}` },
    });
    if (meRes.ok) {
      const userData = await meRes.json();
      setUser(userData);
    }
    return data;
  }, []);

  const register = useCallback(async (email, password) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || 'Registration failed');
    }
    const data = await res.json();
    setAccessToken(data.access_token);
    setRefreshToken(data.refresh_token);
    // Fetch user profile
    const meRes = await fetch('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${data.access_token}` },
    });
    if (meRes.ok) {
      const userData = await meRes.json();
      setUser(userData);
    }
    return data;
  }, []);

  const logout = useCallback(() => {
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  }, []);

  // Authenticated fetch wrapper with auto-refresh
  const authFetch = useCallback(async (url, options = {}) => {
    const headers = { ...options.headers };
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    let res = await fetch(url, { ...options, headers });

    // If 401, try refreshing the token and retry once
    if (res.status === 401 && refreshToken) {
      const newToken = await tryRefresh();
      if (newToken) {
        headers['Authorization'] = `Bearer ${newToken}`;
        res = await fetch(url, { ...options, headers });
      } else {
        logout();
      }
    }

    return res;
  }, [accessToken, refreshToken, tryRefresh, logout]);

  // Inject authFetch into the API service layer synchronously so children can use it immediately
  setAuthFetch(authFetch);

  return (
    <AuthContext.Provider value={{
      user,
      accessToken,
      isAuthenticated,
      loading,
      login,
      register,
      logout,
      authFetch,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

export default AuthContext;
