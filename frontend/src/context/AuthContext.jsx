import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiClient } from '../lib/apiClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const refreshMe = useCallback(async (signal) => {
    const token = localStorage.getItem('carflow_token');
    if (!token) {
      if (!signal?.aborted) {
        setUser(null);
        setAuthLoading(false);
      }
      return;
    }
    try {
      const res = await apiClient('/api/v1/auth/me', { signal });
      if (!signal?.aborted) {
        setUser(res.user);
      }
    } catch (err) {
      if (err.name !== 'AbortError' && !signal?.aborted) {
        localStorage.removeItem('carflow_token');
        setUser(null);
      }
    } finally {
      if (!signal?.aborted) {
        setAuthLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    refreshMe(controller.signal);
    return () => controller.abort();
  }, [refreshMe]);

  const login = async (email, password) => {
    const res = await apiClient('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem('carflow_token', res.token);
    setUser(res.user);
    return res.user;
  };

  const register = async (payload) => {
    const res = await apiClient('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    localStorage.setItem('carflow_token', res.token);
    setUser(res.user);
    return res.user;
  };

  const logout = () => {
    localStorage.removeItem('carflow_token');
    setUser(null);
  };

  const linkWallet = async (walletAddress) => {
    const res = await apiClient('/api/v1/users/wallet', {
      method: 'PUT',
      body: JSON.stringify({ wallet_address: walletAddress }),
    });
    setUser(res.user);
    return res.user;
  };

  const submitKycRequest = async (identityNumber, countryCode = 'VN') => {
    const res = await apiClient('/api/v1/users/kyc-request', {
      method: 'POST',
      body: JSON.stringify({ identityNumber, countryCode }),
    });
    setUser(res.user);
    return res.user;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        authLoading,
        login,
        register,
        logout,
        linkWallet,
        submitKycRequest,
        refreshMe,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
