import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

interface TopHeaderProps {
  userName?: string;
}

export default function TopHeader({ userName = 'User' }: TopHeaderProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const { logout } = useAuth();

  const handleLogout = async () => {
    console.log('🚪 TopHeader: Logout button clicked');
    setShowDropdown(false);
    
    // Platform-aware logout handling
    if (typeof window !== 'undefined') {
      // Web environment - direct logout
      console.log('🚪 TopHeader: Direct logout for web environment');
      await performLogout();
    } else {
      // Mobile environment - show confirmation dialog
      console.log('🚪 TopHeader: Showing confirmation dialog for mobile');
      Alert.alert(
        'Logout',
        'Are you sure you want to logout? This will clear all cached data.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Logout', 
            style: 'destructive', 
            onPress: async () => {
              console.log('🚪 TopHeader: User confirmed logout on mobile');
              await performLogout();
            }
          }
        ]
      );
    }
  };

  const performLogout = async () => {
    try {
      console.log('🚪 TopHeader: Starting performLogout...');
      console.log('🚪 TopHeader: About to call AuthContext logout...');
      await logout();
      console.log('✅ TopHeader: Logout completed successfully');
    } catch (error) {
      console.error('❌ TopHeader: Error during logout:', error);
      if (typeof window !== 'undefined') {
        window.alert('Failed to logout: ' + (error as Error).message);
      } else {
        Alert.alert('Error', 'Failed to logout: ' + (error as Error).message);
      }
    }
  };

  const handleProfile = () => {
    setShowDropdown(false);
    console.log('👤 TopHeader: Profile clicked');
    // TODO: Navigate to profile screen
  };

  const handleSettings = () => {
    setShowDropdown(false);
    console.log('⚙️ TopHeader: Settings clicked');
    // TODO: Navigate to settings screen
  };

  return (
    <View style={styles.container}>
      {/* Left side - User name */}
      <View style={styles.leftSection}>
        <Text style={styles.userName}>Welcome, {userName}</Text>
      </View>

      {/* Right side - User logo with dropdown */}
      <View style={styles.rightSection}>
        <TouchableOpacity 
          style={styles.userLogo} 
          onPress={() => setShowDropdown(!showDropdown)}
        >
          <Text style={styles.userLogoText}>
            {userName.charAt(0).toUpperCase()}
          </Text>
        </TouchableOpacity>

        {/* Dropdown Menu */}
        {showDropdown && (
          <View style={styles.dropdown}>
            <TouchableOpacity 
              style={styles.dropdownItem} 
              onPress={handleProfile}
              activeOpacity={0.7}
            >
              <Text style={styles.dropdownItemText}>👤 Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.dropdownItem} 
              onPress={handleSettings}
              activeOpacity={0.7}
            >
              <Text style={styles.dropdownItemText}>⚙️ Settings</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.dropdownItem, styles.logoutItem]} 
              onPress={() => {
                console.log('🚪 TopHeader: Logout button pressed in dropdown');
                handleLogout();
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.dropdownItemText, styles.logoutText]}>🚪 Logout</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Modal overlay to close dropdown when clicking outside */}
      {showDropdown && (
        <TouchableOpacity 
          style={styles.overlay} 
          onPress={() => setShowDropdown(false)}
          activeOpacity={1}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    position: 'relative',
    zIndex: 10000,
  },
  leftSection: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  rightSection: {
    position: 'relative',
    zIndex: 10001,
  },
  userLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userLogoText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dropdown: {
    position: 'absolute',
    top: 50,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 0,
    minWidth: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 12,
    zIndex: 9999,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  logoutText: {
    color: '#dc3545',
  },
  logoutItem: {
    borderBottomWidth: 0, // No bottom border for the last item
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 9998,
  },
}); 