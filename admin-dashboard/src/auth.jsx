import { createContext, useContext, useEffect, useState } from 'react';
import { api, setToken, getToken } from './api';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    api.get('/auth/me')
      .then(({ user }) => setUser(user))
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (identifier, password) => {
    const { token, user } = await api.post('/auth/login', { identifier, password });
    if (user.role !== 'admin') {
      throw new Error('This account is not an administrator.');
    }
    setToken(token);
    setUser(user);
    return user;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  const updateCredentials = async (payload) => {
    const { user } = await api.patch('/auth/credentials', payload);
    setUser(user);
    return user;
  };

  return <AuthCtx.Provider value={{ user, loading, login, logout, updateCredentials }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
