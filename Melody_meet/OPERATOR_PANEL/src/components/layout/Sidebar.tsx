import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const isMobile = width < 768;
const SIDEBAR_WIDTH = 220;
const COLLAPSED_WIDTH = 70;

// Dashboard Clean Black & White Theme
const lightTheme = {
  background: "#FFFFFF",
  surface: "#FFFFFF",
  card: "#FFFFFF",
  cardBorder: "#000000",
  text: "#000000",
  textSecondary: "#000000",
  textMuted: "#000000",
  primary: "#000000",
  secondary: "#000000",
  accent: "#000000",
  success: "#000000",
  warning: "#000000",
  danger: "#000000",
};

const darkTheme = {
  background: "#000000",
  surface: "#000000",
  card: "#000000",
  cardBorder: "#FFFFFF",
  text: "#FFFFFF",
  textSecondary: "#FFFFFF",
  textMuted: "#FFFFFF",
  primary: "#FFFFFF",
  secondary: "#FFFFFF",
  accent: "#FFFFFF",
  success: "#FFFFFF",
  warning: "#FFFFFF",
  danger: "#FFFFFF",
};

interface SidebarProps {
  currentScreen: string;
  onNavigate: (screen: string) => void;
  onCollapseChange?: (collapsed: boolean) => void;
  isDarkMode?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({
  currentScreen,
  onNavigate,
  onCollapseChange,
  isDarkMode = false,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [sidebarWidth] = useState(new Animated.Value(SIDEBAR_WIDTH));
  const colors = isDarkMode ? darkTheme : lightTheme;

  const toggleSidebar = () => {
    const newCollapsedState = !isCollapsed;
    Animated.timing(sidebarWidth, {
      toValue: newCollapsedState ? COLLAPSED_WIDTH : SIDEBAR_WIDTH,
      duration: 250,
      useNativeDriver: false,
    }).start();
    setIsCollapsed(newCollapsedState);
    if (onCollapseChange) {
      onCollapseChange(newCollapsedState);
    }
  };

  const menuItems = [
    { name: 'Dashboard', icon: 'home', color: colors.text },
    { name: 'Podcast', icon: 'headphones', color: colors.textSecondary },
    { name: 'RJStudio', displayName: 'RJ Studio', icon: 'mic', color: colors.textSecondary },

    { name: 'Profile', icon: 'user', color: colors.textSecondary },
  ];

  // On mobile, always show bottom navigation instead
  if (isMobile) {
    return (
      <View style={[styles.mobileBottomNav, { backgroundColor: colors.background, borderTopColor: colors.cardBorder }]}>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.name}
            style={[
              styles.mobileNavItem,
              currentScreen === item.name && [styles.mobileNavItemActive, { backgroundColor: `${colors.text}15` }],
            ]}
            onPress={() => onNavigate(item.name)}
            activeOpacity={0.7}
          >
            <Feather
              name={item.icon as any}
              size={22}
              color={currentScreen === item.name ? colors.text : colors.textMuted}
            />
            <Text
              style={[
                styles.mobileNavLabel,
                { color: currentScreen === item.name ? colors.text : colors.textMuted },
              ]}
            >
              {item.displayName || item.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  // Desktop: Collapsible sidebar
  return (
    <Animated.View style={[styles.desktopSidebar, { width: sidebarWidth, backgroundColor: colors.background, borderRightColor: colors.cardBorder }]}>
      {/* Toggle Button */}
      <TouchableOpacity 
        style={[styles.toggleButton, { backgroundColor: colors.background, borderColor: colors.cardBorder }]} 
        onPress={toggleSidebar}
      >
        <Feather name={isCollapsed ? 'chevron-right' : 'chevron-left'} size={20} color={colors.textSecondary} />
      </TouchableOpacity>

      {/* Logo */}
      <View style={[styles.logoContainer, { borderBottomColor: `${colors.text}10` }]}>
        <View style={[styles.logoIcon, { backgroundColor: `${colors.text}15` }]}>
          <Feather name="radio" size={isCollapsed ? 24 : 28} color={colors.text} />
        </View>
        {!isCollapsed && <Text style={[styles.logoText, { color: colors.text }]}>Operator Panel</Text>}
      </View>

      {/* Menu Items */}
      <View style={styles.menuContainer}>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.name}
            style={[
              styles.menuItem,
              currentScreen === item.name && [styles.menuItemActive, { backgroundColor: `${colors.text}10` }],
              isCollapsed && styles.menuItemCollapsed,
            ]}
            onPress={() => onNavigate(item.name)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: `${item.color}15` }]}>
              <Feather name={item.icon as any} size={20} color={item.color} />
            </View>
            {!isCollapsed && (
              <Text
                style={[
                  styles.menuText,
                  { color: currentScreen === item.name ? colors.text : colors.textSecondary },
                  currentScreen === item.name && styles.menuTextActive,
                ]}
              >
                {item.displayName || item.name}
              </Text>
            )}
            {currentScreen === item.name && !isCollapsed && (
              <View style={[styles.activeIndicator, { backgroundColor: colors.text }]} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      <View style={[styles.bottomSection, { borderTopColor: `${colors.text}10` }]} />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  // Desktop Sidebar
  desktopSidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRightWidth: 1,
    paddingTop: Platform.OS === 'web' ? 20 : 50,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  toggleButton: {
    position: 'absolute',
    right: -12,
    top: 30,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 101,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
    borderBottomWidth: 1,
    marginBottom: 24,
  },
  logoIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 12,
  },
  menuContainer: {
    flex: 1,
    paddingHorizontal: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
    position: 'relative',
  },
  menuItemCollapsed: {
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  menuItemActive: {
    backgroundColor: '#F3F4F6',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 12,
  },
  menuTextActive: {
    fontWeight: '600',
  },
  activeIndicator: {
    position: 'absolute',
    right: 12,
    width: 4,
    height: 24,
    borderRadius: 2,
  },
  bottomSection: {
    paddingHorizontal: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    paddingTop: 16,
  },

  // Mobile Bottom Navigation
  mobileBottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    zIndex: 100,
  },
  mobileNavItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  mobileNavItemActive: {
    borderRadius: 8,
    marginHorizontal: 4,
  },
  mobileNavLabel: {
    fontSize: 10,
    marginTop: 4,
    fontWeight: '500',
  },
});

export default Sidebar;