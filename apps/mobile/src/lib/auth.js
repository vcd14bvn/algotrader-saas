import React, { useState, createContext, useContext } from 'react';
import * as SecureStore from 'expo-secure-store';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  const login = async (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    await SecureStore.setItemAsync('token', authToken);
    await SecureStore.setItemAsync('user', JSON.stringify(userData));
  };

  const logout = async () => {
    setUser(null);
    setToken(null);
    await SecureStore.deleteItemAsync('token');
    await SecureStore.deleteItemAsync('user');
  };

  const restoreSession = async () => {
    const savedToken = await SecureStore.getItemAsync('token');
    const savedUser = await SecureStore.getItemAsync('user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
      return true;
    }
    return false;
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, restoreSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
