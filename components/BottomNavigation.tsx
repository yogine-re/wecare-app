import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export type TabType = 'home' | 'upload' | 'share' | 'ask' | 'profile';

interface BottomNavigationProps {
  activeTab: TabType;
  onTabPress: (tab: TabType) => void;
}

interface TabItem {
  key: TabType;
  label: string;
  icon: string;
}

const tabs: TabItem[] = [
  { key: 'home', label: 'Home', icon: '🏠' },
  { key: 'upload', label: 'Upload', icon: '📤' },
  { key: 'share', label: 'Share', icon: '📤' },
  { key: 'ask', label: 'Ask', icon: '💬' },
  { key: 'profile', label: 'Profile', icon: '👤' },
];

export default function BottomNavigation({ activeTab, onTabPress }: BottomNavigationProps) {
  return (
    <View style={styles.container}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[styles.tab, activeTab === tab.key && styles.activeTab]}
          onPress={() => onTabPress(tab.key)}
        >
          <Text style={[styles.tabIcon, activeTab === tab.key && styles.activeTabIcon]}>
            {tab.icon}
          </Text>
          <Text style={[styles.tabLabel, activeTab === tab.key && styles.activeTabLabel]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    paddingBottom: 20, // Extra padding for safe area
    paddingTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  activeTab: {
    // Active state styling
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 4,
    opacity: 0.6,
  },
  activeTabIcon: {
    opacity: 1,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
    textAlign: 'center',
  },
  activeTabLabel: {
    color: '#007AFF',
    fontWeight: '600',
  },
}); 