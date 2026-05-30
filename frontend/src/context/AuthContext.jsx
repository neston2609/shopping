import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, setToken } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { user } = await api.get('/auth/me');
      setUser(user);
    } catch (e) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (localStorage.getItem('rc_token')) refresh();
    else setLoading(false);
  }, [refresh]);

  // identifier may be an email OR a username
  const login = async (identifier, password) => {
    const { token, user } = await api.post('/auth/login', { identifier, password }, { auth: false });
    setToken(token);
    setUser(user);
    return user;
  };

  const updateCredentials = async (payload) => {
    const { user } = await api.patch('/auth/credentials', payload);
    setUser(user);
    return user;
  };

  const register = async (payload) => {
    const { token, user } = await api.post('/auth/register', payload, { auth: false });
    setToken(token);
    setUser(user);
    return user;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      /* ignore */
    }
    setToken(null);
    setUser(null);
  };

  const updateProfile = async (payload) => {
    const { user } = await api.patch('/auth/profile', payload);
    setUser(user);
    return user;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateProfile, updateCredentials, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
