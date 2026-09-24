import React, { createContext, useContext, useState, useEffect } from 'react';
import { login as apiLogin, logout as apiLogout, getMe } from '../services/api';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const data = await getMe();
        setUser(data.user);
      } catch (error) {
        setUser(null);
        localStorage.removeItem('nexflow_token');
      } finally {
        setLoading(false);
      }
    };
    checkSession();
  }, []);

  const login = async (username, password) => {
    try {
      const data = await apiLogin({ username, password });
      if (data.token) {
        localStorage.setItem('nexflow_token', data.token);
      }
      setUser(data.user);
      // Role-based redirect after login
      const role = data.user?.role;
      if (role === 'super_admin') {
        window.location.replace('/');
      } else if (role === 'shop_admin') {
        window.location.replace('/');
      } else if (role === 'customer') {
        window.location.replace('/shop');
      } else {
        window.location.replace('/');
      }
      return data.user;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  };

  const logout = async () => {
    try {
      await apiLogout();
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setUser(null);
      localStorage.removeItem('nexflow_token');
      localStorage.removeItem('nexflow_shift');
    }
  };


  const isSuperAdmin = () => {
    if (!user) return false;
    const role = (user.role || '').toLowerCase();
    return role === 'super_admin';
  };

  const isShopAdmin = () => {
    if (!user) return false;
    const role = (user.role || '').toLowerCase();
    return role === 'shop_admin' || role === 'admin' || role === 'owner';
  };

  const isCustomer = () => {
    if (!user) return true;
    const role = (user.role || '').toLowerCase();
    return role === 'customer';
  };

  return (
    <UserContext.Provider value={{ user, login, logout, isSuperAdmin, isShopAdmin, isCustomer, loading }}>
      {!loading && children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    return {
      user: null,
      login: async () => {},
      logout: async () => {},
      isSuperAdmin: () => false,
      isShopAdmin: () => false,
      isCustomer: () => true,
      loading: false
    };
  }
  return context;
};
