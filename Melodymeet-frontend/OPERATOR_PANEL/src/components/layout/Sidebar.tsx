import React, { useState } from 'react';
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
const SIDEBAR_WIDTH = 224;
const COLLAPSED_WIDTH = 68;

// ─── Design tokens aligned with MelodyMeet system ────────────────────────────
const lightTheme = {
  background: "#FFFFFF",
  border: "#E2E8F0",
  text: "#0F172A",
  textSec: "#475569",
  textMuted: "#94A3B8",
  activeBg: "transparent",
  activeText: "#4F6AF0",
  activeIndicator: "#4F6AF0",
  hoverBg: "#F8FAFC",
  iconBg: "#F1F5F9",
  logoBg: "#F1F5F9",
  logoText: "#4F6AF0",
};

const darkTheme = {
  background: "#080A10",
  border: "#1B2234",
  text: "#F8FAFC",
  textSec: "#94A3B8",
  textMuted: "#64748B",
  activeBg: "transparent",
  activeText: "#A78BFA",
  activeIndicator: "#7C3AED",
  hoverBg: "#111625",
  iconBg: "#111625",
  logoBg: "#111625",
  logoText: "#A78BFA",
};

interface SidebarProps {
  currentScreen: string;
  onNavigate: (screen: string) => void;
  onCollapseChange?: (collapsed: boolean) => void;
  isDarkMode?: boolean;
}

const menuItems = [
  { name: 'Dashboard',  icon: 'home' as const,       label: 'Dashboard' },
  { 
    name: 'PodcastGroup',    
    icon: 'headphones' as const,  
    label: 'Podcast',
    subItems: [
      { name: 'Podcast', label: 'Studio', icon: 'mic' as const },
      { name: 'EpisodeManager', label: 'Episode Manager', icon: 'folder' as const }
    ]
  },
  { name: 'RJStudio',   icon: 'mic' as const,         label: 'RJ Studio' },
  { name: 'OpenConnect', icon: 'server' as const,      label: 'OpenConnect' },
  { name: 'Profile',    icon: 'user' as const,        label: 'Profile' },
];


const Sidebar: React.FC<SidebarProps> = ({
  currentScreen,
  onNavigate,
  onCollapseChange,
  isDarkMode = false,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});
  const [sidebarWidth] = useState(new Animated.Value(SIDEBAR_WIDTH));
  const t = isDarkMode ? darkTheme : lightTheme;

  const toggleSidebar = () => {
    const next = !isCollapsed;
    Animated.timing(sidebarWidth, {
      toValue: next ? COLLAPSED_WIDTH : SIDEBAR_WIDTH,
      duration: 220,
      useNativeDriver: false,
    }).start();
    setIsCollapsed(next);
    onCollapseChange?.(next);
  };

  // ── Mobile: Bottom tab bar ────────────────────────────────────────────────
  if (isMobile) {
    return (
      <View style={[styles.mobileNav, {
        backgroundColor: t.background,
        borderTopColor: t.border,
      }]}>
        {menuItems.map((item) => {
          if (item.subItems) {
            return item.subItems.map(sub => {
              const active = currentScreen === sub.name;
              return (
                <TouchableOpacity
                  key={sub.name}
                  style={styles.mobileNavItem}
                  onPress={() => onNavigate(sub.name)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.mobileIconWrap,
                    active && { backgroundColor: t.activeBg },
                  ]}>
                    <Feather
                      name={sub.icon || item.icon}
                      size={20}
                      color={active ? t.activeText : t.textMuted}
                    />
                  </View>
                  <Text style={[
                    styles.mobileLabel,
                    { color: active ? t.activeText : t.textMuted },
                    active && { fontWeight: '600' },
                  ]}>
                    {sub.label}
                  </Text>
                </TouchableOpacity>
              );
            });
          }

          const active = currentScreen === item.name;
          return (
            <TouchableOpacity
              key={item.name}
              style={styles.mobileNavItem}
              onPress={() => onNavigate(item.name)}
              activeOpacity={0.7}
            >
              <View style={[
                styles.mobileIconWrap,
                active && { backgroundColor: t.activeBg },
              ]}>
                <Feather
                  name={item.icon}
                  size={20}
                  color={active ? t.activeText : t.textMuted}
                />
              </View>
              <Text style={[
                styles.mobileLabel,
                { color: active ? t.activeText : t.textMuted },
                active && { fontWeight: '600' },
              ]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  // ── Desktop: Collapsible sidebar ──────────────────────────────────────────
  return (
    <Animated.View style={[styles.sidebar, {
      width: sidebarWidth,
      backgroundColor: t.background,
      borderRightColor: t.border,
    }]}>
      {/* Collapse toggle */}
      <TouchableOpacity
        style={[styles.toggleBtn, {
          backgroundColor: t.background,
          borderColor: t.border,
        }]}
        onPress={toggleSidebar}
        activeOpacity={0.8}
      >
        <Feather
          name={isCollapsed ? 'chevron-right' : 'chevron-left'}
          size={14}
          color={t.textMuted}
        />
      </TouchableOpacity>

      {/* Logo */}
      <View style={[styles.logoRow, { borderBottomColor: t.border }]}>
        <View style={[styles.logoIcon, { backgroundColor: t.logoBg }]}>
          <Feather name="radio" size={isCollapsed ? 20 : 22} color={t.logoText} />
        </View>
        {!isCollapsed && (
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={[styles.logoTitle, { color: t.text }]}>MelodyMeet</Text>
            <Text style={[styles.logoSub, { color: t.textMuted }]}>Operator</Text>
          </View>
        )}
      </View>

      {/* Menu */}
      <View style={styles.menu}>
        {menuItems.map((item) => {
          const isGroup = !!item.subItems;
          const isGroupExpanded = expandedMenus[item.name];
          const hasActiveSub = isGroup && item.subItems?.some(s => s.name === currentScreen);
          const active = isGroup ? hasActiveSub : currentScreen === item.name;

          return (
            <View key={item.name}>
              <TouchableOpacity
                style={[
                  styles.menuItem,
                  isCollapsed && styles.menuItemCollapsed,
                  active && !isGroup && [styles.menuItemActive, { backgroundColor: t.activeBg }],
                  isGroup && active && !isGroupExpanded && { backgroundColor: t.hoverBg }
                ]}
                onPress={() => {
                  if (isGroup) {
                    if (isCollapsed) toggleSidebar();
                    setExpandedMenus(p => ({ ...p, [item.name]: !p[item.name] }));
                  } else {
                    onNavigate(item.name);
                  }
                }}
                activeOpacity={0.7}
              >
                {/* Active left bar */}
                {active && !isCollapsed && !isGroup && (
                  <View style={[styles.activeBar, { backgroundColor: t.activeIndicator }]} />
                )}

                <View style={[
                  styles.iconWrap,
                  { backgroundColor: active && !isGroup ? 'transparent' : t.iconBg },
                ]}>
                  <Feather
                    name={item.icon}
                    size={18}
                    color={active ? t.activeText : t.textSec}
                  />
                </View>

                {!isCollapsed && (
                  <Text style={[
                    styles.menuLabel,
                    { flex: 1, color: active ? t.activeText : t.textSec },
                    active && { fontWeight: '600' },
                  ]}>
                    {item.label}
                  </Text>
                )}

                {!isCollapsed && isGroup && (
                  <Feather 
                    name={isGroupExpanded ? "chevron-down" : "chevron-right"} 
                    size={16} 
                    color={t.textMuted} 
                    style={{ marginRight: 4 }}
                  />
                )}
              </TouchableOpacity>

              {/* Sub items for VS Code folder style */}
              {isGroup && isGroupExpanded && !isCollapsed && (
                <View style={{ marginLeft: 34, marginTop: 2, marginBottom: 6, borderLeftWidth: 1, borderLeftColor: t.border, paddingLeft: 8 }}>
                  {item.subItems?.map(sub => {
                    const subActive = currentScreen === sub.name;
                    return (
                      <TouchableOpacity
                        key={sub.name}
                        style={[
                          styles.menuItem,
                          { paddingVertical: 8, marginBottom: 1 },
                          subActive && { backgroundColor: t.activeBg }
                        ]}
                        onPress={() => onNavigate(sub.name)}
                        activeOpacity={0.7}
                      >
                        <Feather 
                          name={sub.icon as any} 
                          size={14} 
                          color={subActive ? t.activeText : t.textMuted} 
                          style={{ marginRight: 8, marginLeft: 4 }} 
                        />
                        <Text style={[
                          styles.menuLabel,
                          { fontSize: 13, color: subActive ? t.activeText : t.textSec, marginLeft: 0 },
                          subActive && { fontWeight: '600' }
                        ]}>
                          {sub.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* Bottom filler */}
      <View style={[styles.bottomDivider, { borderTopColor: t.border }]} />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  // Desktop
  sidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRightWidth: 1,
    paddingTop: Platform.OS === 'web' ? 16 : 48,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
  },
  toggleBtn: {
    position: 'absolute',
    right: -12,
    top: 28,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 101,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    marginBottom: 12,
  },
  logoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  logoSub: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  menu: {
    flex: 1,
    paddingHorizontal: 10,
    gap: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  menuItemCollapsed: {
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  menuItemActive: {},
  activeBar: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderRadius: 2,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuLabel: {
    fontSize: 13.5,
    fontWeight: '500',
    marginLeft: 10,
  },
  bottomDivider: {
    paddingHorizontal: 12,
    paddingBottom: 20,
    borderTopWidth: 1,
    paddingTop: 12,
  },

  // Mobile bottom nav
  mobileNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingVertical: 6,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    zIndex: 100,
  },
  mobileNavItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  mobileIconWrap: {
    width: 38,
    height: 30,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  mobileLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
});

export default Sidebar;
