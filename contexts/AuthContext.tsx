import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { googleDriveService } from '../utils/googleDriveService';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  userToken: string | null;
  userInfo: { name: string; email: string } | null;
  login: (token: string, refreshToken?: string, userInfo?: { name: string; email: string }) => Promise<void>;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<{ name: string; email: string } | null>(null);

  const attemptTokenRefresh = async (): Promise<boolean> => {
    try {
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      if (!refreshToken) {
        return false;
      }

      const newToken = await googleDriveService.refreshAccessToken(refreshToken);
      if (newToken) {
        await AsyncStorage.setItem('userToken', newToken);
        setUserToken(newToken);
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  };

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const storedUserInfo = await AsyncStorage.getItem('userInfo');

      if (token && storedUserInfo) {
        try {
          const userInfo = JSON.parse(storedUserInfo);
          setUserInfo(userInfo);
          setUserToken(token);

          googleDriveService.setAccessToken(token);

          const isValid = await googleDriveService.validateToken();
          if (!isValid) {
            const refreshSuccess = await attemptTokenRefresh();
            if (!refreshSuccess) {
              await logout();
              return;
            }
          }

          try {
            await googleDriveService.initializeFolderStructure();
          } catch (error) {
            // Folder initialization failed, but don't block the app
          }

          setIsAuthenticated(true);
        } catch (error) {
          await logout();
        }
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      await logout();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (token: string, refreshToken?: string, userInfo?: { name: string; email: string }) => {
    try {
      await AsyncStorage.setItem('userToken', token);
      if (refreshToken) {
        await AsyncStorage.setItem('refreshToken', refreshToken);
      }
      if (userInfo) {
        await AsyncStorage.setItem('userInfo', JSON.stringify(userInfo));
      }

      setUserToken(token);
      if (userInfo) {
        setUserInfo(userInfo);
      }
      setIsAuthenticated(true);

      googleDriveService.setAccessToken(token);

      try {
        await googleDriveService.initializeFolderStructure();
      } catch (error) {
        // Folder initialization failed, but don't block the app
      }
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.multiRemove(['userToken', 'refreshToken', 'userInfo']);
      googleDriveService.clearAccessToken();
      setUserToken(null);
      setUserInfo(null);
      setIsAuthenticated(false);
    } catch (error) {
      // Handle logout error silently
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      isLoading,
      userToken,
      userInfo,
      login,
      logout,
      checkAuthStatus,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

 