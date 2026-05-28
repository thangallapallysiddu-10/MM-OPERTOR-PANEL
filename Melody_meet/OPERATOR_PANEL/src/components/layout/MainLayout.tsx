import React, { useState } from 'react';
import { View, Dimensions, Platform } from 'react-native';
import Sidebar from './Sidebar';

const { width } = Dimensions.get('window');
const isMobile = width < 768;

interface MainLayoutProps {
  children: React.ReactNode;
  currentScreen: string;
  navigation: any;
  isDarkMode: boolean;
}

const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  currentScreen,
  navigation,
  isDarkMode,
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleNavigate = (screen: string) => {
    if (screen === currentScreen) return;
    navigation.navigate(screen);
  };

  return (
    <View className={`flex-1 ${isDarkMode ? 'bg-[#121212]' : 'bg-[#F5F5F5]'}`}>
      <View 
        className="flex-1"
        style={!isMobile && { marginLeft: sidebarCollapsed ? 70 : 220 }}
      >
        {children}
      </View>
      
      <Sidebar 
        currentScreen={currentScreen}
        onNavigate={handleNavigate}
        onCollapseChange={setSidebarCollapsed}
        isDarkMode={isDarkMode}
      />
    </View>
  );
};

export default MainLayout;