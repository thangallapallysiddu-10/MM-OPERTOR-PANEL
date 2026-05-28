// Profile.tsx - Updated to use Zustand store
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  Dimensions,
  TextInput,
  Image,
  Switch,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAppStore } from '../store/useAppStore';
import { UsersApi } from '../services/api/operatorApi';

const { width } = Dimensions.get('window');
const isMobile = width < 768;

interface User {
  id: number;
  name: string;
  role: 'RJ' | 'Podcast Host' | 'Listener';
  avatar: string;
  avatarImage?: string;
  followers: number;
  isBanned: boolean;
  reports: number;
  joinDate?: string;
  bio?: string;
  email?: string;
  location?: string;
}

// EditProfileModal Component (same as before)
const EditProfileModalComponent = ({ visible, onClose, onSave, user, isDarkMode }: any) => {
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [tempImageUri, setTempImageUri] = useState<string | null>(null);

  useEffect(() => {
    if (user && visible) {
      setEditName(user.name || '');
      setEditBio(user.bio || '');
      setEditEmail(user.email || '');
      setEditLocation(user.location || '');
      setProfileImage(user.avatarImage || null);
      setTempImageUri(null);
    }
  }, [user, visible]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Needed', 'Please grant gallery permission');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      setTempImageUri(result.assets[0].uri);
    }
  };

  const handleSave = () => {
    onSave(editName, editBio, editEmail, editLocation, tempImageUri || profileImage);
  };

  const displayImage = tempImageUri || profileImage;

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View className="items-center justify-center flex-1 bg-black/85">
        <View className={`${isMobile ? 'w-[90%]' : 'w-96'} rounded-3xl border ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-300'} p-5 max-h-[90%]`}>
          <View className="flex-row items-center justify-between mb-4">
            <Text className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>Edit Profile</Text>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={24} color={isDarkMode ? '#999' : '#666'} />
            </TouchableOpacity>
          </View>
          
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <TouchableOpacity className="relative items-center mb-6" onPress={pickImage}>
              {displayImage ? (
                <Image source={{ uri: displayImage }} style={{ width: 100, height: 100, borderRadius: 50 }} />
              ) : (
                <View className={`w-25 h-25 rounded-full justify-center items-center ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                  <Text className={`text-4xl font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>
                    {editName.substring(0, 2).toUpperCase()}
                  </Text>
                </View>
              )}
              <View className={`absolute bottom-0 right-5 w-8 h-8 rounded-full justify-center items-center ${isDarkMode ? 'bg-white' : 'bg-black'}`}>
                <Feather name="camera" size={16} color={isDarkMode ? '#000' : '#fff'} />
              </View>
            </TouchableOpacity>
            
            {tempImageUri && (
              <Text className={`text-center text-xs mb-3 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                ✓ New image selected - click Save to apply
              </Text>
            )}
            
            <View className="mb-5">
              <Text className={`text-sm mb-2 font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Full Name</Text>
              <TextInput
                className={`border rounded-2xl px-4 py-3 text-base ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-black'}`}
                value={editName}
                onChangeText={setEditName}
                placeholder="Enter name"
                placeholderTextColor={isDarkMode ? '#666' : '#999'}
              />
              
              <Text className={`text-sm mt-4 mb-2 font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Email</Text>
              <TextInput
                className={`border rounded-2xl px-4 py-3 text-base ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-black'}`}
                value={editEmail}
                onChangeText={setEditEmail}
                placeholder="Enter email"
                placeholderTextColor={isDarkMode ? '#666' : '#999'}
                keyboardType="email-address"
              />
              
              <Text className={`text-sm mt-4 mb-2 font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Location</Text>
              <TextInput
                className={`border rounded-2xl px-4 py-3 text-base ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-black'}`}
                value={editLocation}
                onChangeText={setEditLocation}
                placeholder="Enter location"
                placeholderTextColor={isDarkMode ? '#666' : '#999'}
              />
              
              <Text className={`text-sm mt-4 mb-2 font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Bio</Text>
              <TextInput
                className={`border rounded-2xl px-4 py-3 text-base min-h-24 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-black'}`}
                value={editBio}
                onChangeText={setEditBio}
                placeholder="Tell about yourself"
                placeholderTextColor={isDarkMode ? '#666' : '#999'}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
            
            <View className="flex-row gap-3 mt-4 mb-4">
              <TouchableOpacity
                className={`flex-1 py-3.5 rounded-xl items-center border ${isDarkMode ? 'border-gray-700' : 'border-gray-300'} bg-transparent`}
                onPress={onClose}
              >
                <Text className={`text-base font-semibold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`flex-1 py-3.5 rounded-xl items-center ${isDarkMode ? 'bg-white' : 'bg-black'}`}
                onPress={handleSave}
              >
                <Text className={`text-base font-bold ${isDarkMode ? 'text-black' : 'text-white'}`}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const Profile = ({ navigation }: any) => {
  // Get from Zustand store
  const {
    rjs,
    hosts,
    recentMembers,
    profileNotifications,
    profileDarkMode,
    profileShowBannedUsers,
    updateRjsUser,
    updateHostsUser,
    updateRecentMember,
    addProfileNotification,
    markProfileNotificationRead,
    markAllProfileNotificationsRead,
    setProfileDarkMode,
    setProfileShowBannedUsers,
  } = useAppStore();

  // Local UI state (doesn't need persistence)
  const [selectedTab, setSelectedTab] = useState<'RJs' | 'Hosts' | 'Recent'>('RJs');
  const [showBanModal, setShowBanModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [showViewProfile, setShowViewProfile] = useState(false);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const isDarkMode = profileDarkMode;
  const unreadCount = profileNotifications.filter(n => !n.read).length;

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const [rjsData, hostsData, listenersData] = await Promise.all([
          UsersApi.getAll('RJ'),
          UsersApi.getAll('Podcast Host'),
          UsersApi.getAll('Listener')
        ]);
        
        // Only update if we actually got data back (backend online)
        if (rjsData.length > 0) useAppStore.getState().setRjs(rjsData as any);
        if (hostsData.length > 0) useAppStore.getState().setHosts(hostsData as any);
        if (listenersData.length > 0) useAppStore.getState().setRecentMembers(listenersData as any);
      } catch (err) {
        console.warn('Backend offline — using local user data', err);
      }
    };
    fetchUsers();
  }, []);

  const getCurrentData = () => {
    let data;
    if (selectedTab === 'RJs') data = [...rjs];
    else if (selectedTab === 'Hosts') data = [...hosts];
    else data = [...recentMembers];
    
    if (!profileShowBannedUsers) {
      data = data.filter(user => !user.isBanned);
    }
    return data;
  };

  const getCounts = () => ({
    rjs: rjs.filter(r => !r.isBanned || profileShowBannedUsers).length,
    hosts: hosts.filter(h => !h.isBanned || profileShowBannedUsers).length,
    recent: recentMembers.filter(m => !m.isBanned || profileShowBannedUsers).length,
  });

  const counts = getCounts();

  const openViewProfile = (user: User) => {
    setViewingUser(user);
    setShowViewProfile(true);
  };

  const openEditProfile = (user: User) => {
    setEditingUser(user);
    setShowEditProfile(true);
  };

  const saveProfileChanges = async (editName: string, editBio: string, editEmail: string, editLocation: string, profileImage: string | null) => {
    if (!editingUser) return;

    try {
      await UsersApi.update(editingUser.id, {
        name: editName,
        bio: editBio,
        email: editEmail,
        location: editLocation,
      });
    } catch (err) {
      console.warn('Backend offline — using local state update');
    }

    const updatedUser = {
      ...editingUser,
      name: editName,
      bio: editBio,
      email: editEmail,
      location: editLocation,
      avatarImage: profileImage || undefined,
      avatar: editName.substring(0, 2).toUpperCase(),
    };

    if (editingUser.role === 'RJ') {
      updateRjsUser(editingUser.id, updatedUser);
    } else if (editingUser.role === 'Podcast Host') {
      updateHostsUser(editingUser.id, updatedUser);
    } else {
      updateRecentMember(editingUser.id, updatedUser);
    }

    if (viewingUser && viewingUser.id === editingUser.id) {
      setViewingUser(updatedUser);
    }

    addProfileNotification({
      title: 'Profile Updated',
      message: 'Profile has been updated successfully',
      type: 'system',
      read: false,
    });
    
    Alert.alert('✅ Success', 'Profile updated successfully!');
    setShowEditProfile(false);
    setEditingUser(null);
  };

  const handleReport = (user: User) => {
    setSelectedUser(user);
    setShowReportModal(true);
  };

  const submitReport = async () => {
    if (selectedUser && reportReason) {
      // Call backend first (best effort)
      try {
        await UsersApi.report(selectedUser.id, reportReason);
      } catch {
        // Backend offline — local state still updated
      }

      const newReports = (selectedUser.reports || 0) + 1;
      if (selectedUser.role === 'RJ') {
        updateRjsUser(selectedUser.id, { reports: newReports });
      } else if (selectedUser.role === 'Podcast Host') {
        updateHostsUser(selectedUser.id, { reports: newReports });
      } else {
        updateRecentMember(selectedUser.id, { reports: newReports });
      }
      addProfileNotification({
        title: 'User Reported',
        message: `${selectedUser.name} has been reported for: ${reportReason}. Total reports: ${newReports}`,
        type: 'report',
        read: false,
      });
      Alert.alert('✅ Reported', `${selectedUser.name} has been reported.`);
      setShowReportModal(false);
      setSelectedUser(null);
      setReportReason('');
    } else if (!reportReason) {
      Alert.alert('⚠️ Error', 'Please select a reason for reporting');
    }
  };

  const handleBan = (user: User) => {
    setSelectedUser(user);
    setShowBanModal(true);
  };

  const confirmBan = async () => {
    if (selectedUser) {
      // Call backend first (best effort)
      try {
        await UsersApi.ban(selectedUser.id);
      } catch {
        // Backend offline — local state still updated
      }

      if (selectedUser.role === 'RJ') {
        updateRjsUser(selectedUser.id, { isBanned: true });
      } else if (selectedUser.role === 'Podcast Host') {
        updateHostsUser(selectedUser.id, { isBanned: true });
      } else {
        updateRecentMember(selectedUser.id, { isBanned: true });
      }
      addProfileNotification({
        title: 'User Banned',
        message: `${selectedUser.name} has been banned from the platform.`,
        type: 'ban',
        read: false,
      });
      if (viewingUser && viewingUser.id === selectedUser.id) {
        setViewingUser({ ...selectedUser, isBanned: true });
      }
      Alert.alert('⛔ Banned', `${selectedUser.name} has been banned.`);
      setShowBanModal(false);
      setSelectedUser(null);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch(type) {
      case 'report': return 'flag';
      case 'ban': return 'slash';
      case 'follow': return 'user-plus';
      default: return 'bell';
    }
  };

  const UserCard = ({ user, index }: { user: User; index: number }) => {
    return (
      <View className={`flex-row items-center p-3.5 rounded-3xl gap-3.5 border shadow-sm ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-300'} ${user.isBanned ? 'opacity-50' : ''}`}>
        <TouchableOpacity onPress={() => openViewProfile(user)} activeOpacity={0.7}>
          {user.avatarImage ? (
            <Image source={{ uri: user.avatarImage }} className="rounded-full w-14 h-14" />
          ) : (
            <View className={`w-14 h-14 rounded-full justify-center items-center ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
              <Text className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>{user.avatar}</Text>
            </View>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity style={{ flex: 1 }} onPress={() => openViewProfile(user)} activeOpacity={0.7}>
          <Text className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-black'}`}>{user.name}</Text>
          <View className={`self-start px-2 py-0.5 rounded-2xl ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <Text className={`text-xs font-medium ${isDarkMode ? 'text-white' : 'text-black'}`}>{user.role}</Text>
          </View>
          {user.role !== 'Listener' && (
            <View className="flex-row items-center gap-1 mt-1">
              <Feather name="users" size={10} color={isDarkMode ? '#888' : '#999'} />
              <Text className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {user.followers.toLocaleString()} followers
              </Text>
            </View>
          )}
          {user.joinDate && (
            <View className="flex-row items-center gap-1">
              <Feather name="calendar" size={10} color={isDarkMode ? '#888' : '#999'} />
              <Text className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Joined: {user.joinDate}
              </Text>
            </View>
          )}
          {user.isBanned && (
            <View className={`mt-1 self-start px-2 py-0.5 rounded-full ${isDarkMode ? 'bg-red-900/50' : 'bg-red-100'}`}>
              <Text className={`text-xs font-semibold ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>Banned</Text>
            </View>
          )}
        </TouchableOpacity>
        
        <View className="relative flex-row items-center gap-2">
          {user.reports > 0 && (
            <View className={`rounded-2xl px-1.5 py-0.5 ${isDarkMode ? 'bg-gray-600' : 'bg-gray-500'}`}>
              <Text className="text-xs font-bold text-white">{user.reports}</Text>
            </View>
          )}
          {!user.isBanned && (
            <>
              <TouchableOpacity 
                className={`w-9.5 h-9.5 rounded-full justify-center items-center ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}
                onPress={() => handleReport(user)}
                activeOpacity={0.7}
              >
                <Feather name="flag" size={16} color={isDarkMode ? '#ccc' : '#4e4b4b'} />
              </TouchableOpacity>
              <TouchableOpacity 
                className={`w-9.5 h-9.5 rounded-full justify-center items-center ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}
                onPress={() => handleBan(user)}
                activeOpacity={0.7}
              >
                <Feather name="slash" size={16} color={isDarkMode ? '#999' : '#666'} />
              </TouchableOpacity>
            </>
          )}
          {user.isBanned && (
            <View className={`px-2.5 py-1.5 rounded-3xl ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
              <Text className={`text-xs font-semibold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Banned</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const TabButton = ({ tab, label, icon, count }: { tab: 'RJs' | 'Hosts' | 'Recent'; label: string; icon: string; count: number }) => (
    <TouchableOpacity
      className={`flex-1 flex-row items-center justify-center gap-2 py-3 rounded-2xl ${selectedTab === tab ? (isDarkMode ? 'bg-gray-700' : 'bg-gray-100') : ''}`}
      onPress={() => setSelectedTab(tab)}
      activeOpacity={0.7}
    >
      <Feather name={icon as any} size={16} color={selectedTab === tab ? (isDarkMode ? '#fff' : '#000') : (isDarkMode ? '#888' : '#999')} />
      <Text className={`text-sm font-semibold ${selectedTab === tab ? (isDarkMode ? 'text-white' : 'text-black') : (isDarkMode ? 'text-gray-400' : 'text-gray-600')}`}>{label}</Text>
      <View className={`px-2 py-0.5 rounded-2xl ${selectedTab === tab ? (isDarkMode ? 'bg-white' : 'bg-black') : ''}`}>
        <Text className={`text-xs font-semibold ${selectedTab === tab ? (isDarkMode ? 'text-black' : 'text-white') : (isDarkMode ? 'text-gray-400' : 'text-gray-600')}`}>{count}</Text>
      </View>
    </TouchableOpacity>
  );

  const ViewProfileModal = () => (
    <Modal visible={showViewProfile} transparent={true} animationType="fade" onRequestClose={() => setShowViewProfile(false)}>
      <View className="items-center justify-center flex-1 bg-black/85">
        <View className={`${isMobile ? 'w-[90%]' : 'w-96'} rounded-3xl border ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-300'} p-6 items-center`}>
          <TouchableOpacity className="absolute z-10 p-2 top-4 right-4" onPress={() => setShowViewProfile(false)}>
            <Feather name="x" size={24} color={isDarkMode ? '#999' : '#666'} />
          </TouchableOpacity>
          
          {viewingUser && (
            <>
              <View className="items-center mb-4">
                {viewingUser.avatarImage ? (
                  <Image source={{ uri: viewingUser.avatarImage }} className="rounded-full w-25 h-25" />
                ) : (
                  <View className={`w-25 h-25 rounded-full justify-center items-center ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                    <Text className={`text-4xl font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>{viewingUser.avatar}</Text>
                  </View>
                )}
                <View className={`px-3 py-1 rounded-full mt-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <Text className={`text-xs font-semibold ${isDarkMode ? 'text-white' : 'text-black'}`}>{viewingUser.role}</Text>
                </View>
                {viewingUser.isBanned && (
                  <View className={`mt-2 px-3 py-1 rounded-full ${isDarkMode ? 'bg-red-900/50' : 'bg-red-100'}`}>
                    <Text className={`text-xs font-semibold ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>Banned User</Text>
                  </View>
                )}
              </View>
              
              <Text className={`text-2xl font-bold mb-2 text-center ${isDarkMode ? 'text-white' : 'text-black'}`}>{viewingUser.name}</Text>
              
              {viewingUser.bio && (
                <Text className={`text-sm text-center mb-5 leading-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{viewingUser.bio}</Text>
              )}
              
              <View className="flex-row justify-center gap-8 mb-5">
                <View className="items-center gap-1">
                  <Feather name="users" size={18} color={isDarkMode ? '#fff' : '#000'} />
                  <Text className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>{viewingUser.followers.toLocaleString()}</Text>
                  <Text className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Followers</Text>
                </View>
                <View className="items-center gap-1">
                  <Feather name="calendar" size={18} color={isDarkMode ? '#ccc' : '#4e4b4b'} />
                  <Text className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>{viewingUser.joinDate || 'N/A'}</Text>
                  <Text className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Joined</Text>
                </View>
                {viewingUser.reports > 0 && (
                  <View className="items-center gap-1">
                    <Feather name="flag" size={18} color={isDarkMode ? '#ccc' : '#4e4b4b'} />
                    <Text className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>{viewingUser.reports}</Text>
                    <Text className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Reports</Text>
                  </View>
                )}
              </View>
              
              {viewingUser.email && (
                <View className="flex-row items-center gap-2.5 mb-3">
                  <Feather name="mail" size={16} color={isDarkMode ? '#888' : '#999'} />
                  <Text className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{viewingUser.email}</Text>
                </View>
              )}
              
              {viewingUser.location && (
                <View className="flex-row items-center gap-2.5 mb-3">
                  <Feather name="map-pin" size={16} color={isDarkMode ? '#888' : '#999'} />
                  <Text className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{viewingUser.location}</Text>
                </View>
              )}
              
              <View className="flex-row w-full gap-3">
                <TouchableOpacity 
                  className={`flex-1 flex-row items-center justify-center gap-2 py-3 rounded-2xl ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
                  onPress={() => {
                    setShowViewProfile(false);
                    openEditProfile(viewingUser);
                  }}
                >
                  <Feather name="edit-2" size={18} color={isDarkMode ? '#fff' : '#000'} />
                  <Text className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-black'}`}>Edit</Text>
                </TouchableOpacity>
                
                {!viewingUser.isBanned && (
                  <>
                    <TouchableOpacity 
                      className={`flex-1 flex-row items-center justify-center gap-2 py-3 rounded-2xl ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
                      onPress={() => {
                        setShowViewProfile(false);
                        handleReport(viewingUser);
                      }}
                    >
                      <Feather name="flag" size={18} color={isDarkMode ? '#ccc' : '#4e4b4b'} />
                      <Text className={`text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Report</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      className={`flex-1 flex-row items-center justify-center gap-2 py-3 rounded-2xl ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
                      onPress={() => {
                        setShowViewProfile(false);
                        handleBan(viewingUser);
                      }}
                    >
                      <Feather name="slash" size={18} color={isDarkMode ? '#999' : '#666'} />
                      <Text className={`text-sm font-semibold ${isDarkMode ? 'text-gray-400' : 'text-gray-700'}`}>Ban</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );

  const NotificationsModal = () => (
    <Modal visible={showNotifications} transparent animationType="fade" onRequestClose={() => setShowNotifications(false)}>
      <View className="items-center justify-center flex-1 bg-black/85">
        <View className={`${isMobile ? 'w-[90%]' : 'w-96'} rounded-3xl border ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-300'} p-5 max-h-[80%]`}>
          <View className="flex-row items-center justify-between mb-4">
            <Text className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>Notifications</Text>
            <TouchableOpacity onPress={() => setShowNotifications(false)}>
              <Feather name="x" size={20} color={isDarkMode ? '#999' : '#666'} />
            </TouchableOpacity>
          </View>
          
          {profileNotifications.filter(n => !n.read).length > 0 && (
            <TouchableOpacity onPress={markAllProfileNotificationsRead} className="self-end mb-3">
              <Text className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Mark all as read</Text>
            </TouchableOpacity>
          )}
          
          <ScrollView style={{ maxHeight: 500 }}>
            {profileNotifications.length === 0 ? (
              <View className="items-center gap-3 py-10">
                <Feather name="bell-off" size={40} color={isDarkMode ? '#666' : '#999'} />
                <Text className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>No notifications</Text>
              </View>
            ) : (
              profileNotifications.map((notif) => (
                <TouchableOpacity 
                  key={notif.id} 
                  className={`flex-row items-start gap-3 py-3 border-b ${!notif.read && (isDarkMode ? 'bg-gray-800' : 'bg-gray-50')} ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}
                  onPress={() => markProfileNotificationRead(notif.id)}
                >
                  <View className={`w-9 h-9 rounded-full justify-center items-center ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                    <Feather name={getNotificationIcon(notif.type)} size={18} color={notif.type === 'report' ? (isDarkMode ? '#ccc' : '#4e4b4b') : notif.type === 'ban' ? (isDarkMode ? '#999' : '#666') : (isDarkMode ? '#fff' : '#000')} />
                  </View>
                  <View className="flex-1 gap-1">
                    <Text className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-black'}`}>{notif.title}</Text>
                    <Text className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{notif.message}</Text>
                    <Text className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                      {new Date(notif.timestamp).toLocaleString()}
                    </Text>
                  </View>
                  {!notif.read && <View className={`w-2 h-2 rounded-full mt-1 ${isDarkMode ? 'bg-white' : 'bg-black'}`} />}
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const SettingsModal = () => (
    <Modal visible={showSettings} transparent animationType="fade" onRequestClose={() => setShowSettings(false)}>
      <View className="items-center justify-center flex-1 bg-black/85">
        <View className={`${isMobile ? 'w-[90%]' : 'w-96'} rounded-3xl border ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-300'} p-5`}>
          <View className="flex-row items-center justify-between mb-4">
            <Text className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>Settings</Text>
            <TouchableOpacity onPress={() => setShowSettings(false)}>
              <Feather name="x" size={20} color={isDarkMode ? '#999' : '#666'} />
            </TouchableOpacity>
          </View>
          
          <ScrollView>
            <View className={`flex-row justify-between items-center py-3.5 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>
              <View className="flex-row items-center gap-3">
                <Feather name="moon" size={18} color={isDarkMode ? '#ccc' : '#4e4b4b'} />
                <Text className={`${isDarkMode ? 'text-white' : 'text-black'}`}>Dark Mode</Text>
              </View>
              <Switch
                value={isDarkMode}
                onValueChange={setProfileDarkMode}
                trackColor={{ false: isDarkMode ? '#333' : '#ddd', true: isDarkMode ? '#ccc' : '#999' }}
                thumbColor="#FFFFFF"
              />
            </View>
            
            <View className={`flex-row justify-between items-center py-3.5 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>
              <View className="flex-row items-center gap-3">
                <Feather name="eye" size={18} color={isDarkMode ? '#ccc' : '#4e4b4b'} />
                <Text className={`${isDarkMode ? 'text-white' : 'text-black'}`}>Show Banned Users</Text>
              </View>
              <Switch
                value={profileShowBannedUsers}
                onValueChange={setProfileShowBannedUsers}
                trackColor={{ false: isDarkMode ? '#333' : '#ddd', true: isDarkMode ? '#ccc' : '#999' }}
                thumbColor="#FFFFFF"
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <View className={`flex-1 ${isDarkMode ? 'bg-gray-950' : 'bg-gray-100'}`} style={{ paddingTop: Platform.OS === 'ios' ? 50 : 40 }}>
      <ScrollView 
        contentContainerStyle={{ 
          padding: isMobile ? 16 : 20, 
          paddingBottom: isMobile ? 100 : 120  
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with Title and Icons */}
        <View className="flex-row items-center justify-between mb-5">
          <View className="px-1 py-2">
            <Text className={`text-3xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-black'}`}>Profile</Text>
            <View className={`w-12 h-0.75 rounded ${isDarkMode ? 'bg-white' : 'bg-black'}`} />
          </View>
          
          <View className="flex-row gap-3">
            <TouchableOpacity className="relative p-2" onPress={() => setShowNotifications(true)}>
              <Feather name="bell" size={22} color={isDarkMode ? '#fff' : '#000'} />
              {unreadCount > 0 && (
                <View className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full justify-center items-center px-1 ${isDarkMode ? 'bg-white' : 'bg-black'}`}>
                  <Text className={`text-[10px] font-bold ${isDarkMode ? 'text-black' : 'text-white'}`}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity className="p-2" onPress={() => setShowSettings(true)}>
              <Feather name="settings" size={22} color={isDarkMode ? '#fff' : '#000'} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Cards */}
        <View className="flex-row gap-3 mb-5">
          <View className={`flex-1 rounded-3xl p-3.5 items-center border shadow-sm ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-300'}`}>
            <Feather name="mic" size={20} color={isDarkMode ? '#fff' : '#000'} />
            <Text className={`text-2xl font-bold mt-2 ${isDarkMode ? 'text-white' : 'text-black'}`}>{counts.rjs}</Text>
            <Text className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Active RJs</Text>
          </View>
          <View className={`flex-1 rounded-3xl p-3.5 items-center border shadow-sm ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-300'}`}>
            <Feather name="headphones" size={20} color={isDarkMode ? '#ccc' : '#4e4b4b'} />
            <Text className={`text-2xl font-bold mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{counts.hosts}</Text>
            <Text className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Active Hosts</Text>
          </View>
          <View className={`flex-1 rounded-3xl p-3.5 items-center border shadow-sm ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-300'}`}>
            <Feather name="users" size={20} color={isDarkMode ? '#999' : '#666'} />
            <Text className={`text-2xl font-bold mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{counts.recent}</Text>
            <Text className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Recent Joiners</Text>
          </View>
        </View>

        {/* Tab Buttons */}
        <View className={`flex-row rounded-3.5 p-1.5 mb-5 gap-1.5 border shadow-sm ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-300'}`}>
          <TabButton tab="RJs" label="RJs" icon="mic" count={counts.rjs} />
          <TabButton tab="Hosts" label="Hosts" icon="headphones" count={counts.hosts} />
          <TabButton tab="Recent" label="Recent" icon="users" count={counts.recent} />
        </View>

        {/* User Lists */}
        <View className="gap-3">
          {getCurrentData().map((user, index) => (
            <UserCard key={user.id} user={user} index={index} />
          ))}
          {getCurrentData().length === 0 && (
            <View className={`items-center py-20 gap-4 rounded-3xl border ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-300'}`}>
              <Feather name="users" size={48} color={isDarkMode ? '#666' : '#999'} />
              <Text className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>No {selectedTab.toLowerCase()} found</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modals */}
      <ViewProfileModal />
      <EditProfileModalComponent 
        visible={showEditProfile}
        onClose={() => {
          setShowEditProfile(false);
          setEditingUser(null);
        }}
        onSave={saveProfileChanges}
        user={editingUser}
        isDarkMode={isDarkMode}
      />
      <NotificationsModal />
      <SettingsModal />

      {/* Report Modal */}
      <Modal visible={showReportModal} transparent={true} animationType="fade" onRequestClose={() => setShowReportModal(false)}>
        <View className="items-center justify-center flex-1 bg-black/85">
          <View className={`${isMobile ? 'w-[90%]' : 'w-96'} rounded-3xl border ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-300'} p-6`}>
            <View className={`w-16 h-16 rounded-full justify-center items-center self-center mb-4 ${isDarkMode ? 'bg-gray-600' : 'bg-gray-500'}`}>
              <Feather name="flag" size={32} color="#fff" />
            </View>
            <Text className={`text-xl font-bold mb-3 text-center ${isDarkMode ? 'text-white' : 'text-black'}`}>Report User</Text>
            <Text className={`text-sm mb-5 text-center leading-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Why are you reporting {selectedUser?.name}?
            </Text>
            <View className="gap-2.5 mb-6">
              {['Inappropriate content', 'Spam', 'Harassment', 'Fake profile', 'Other'].map((reason, idx) => (
                <TouchableOpacity
                  key={idx}
                  className={`flex-row justify-between items-center py-3 px-4 rounded-2xl border ${
                    reportReason === reason 
                      ? (isDarkMode ? 'bg-gray-700 border-white' : 'bg-gray-100 border-black')
                      : (isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-300')
                  }`}
                  onPress={() => setReportReason(reason)}
                  activeOpacity={0.7}
                >
                  <Text className={`text-sm font-medium ${reportReason === reason ? (isDarkMode ? 'text-white' : 'text-black') : (isDarkMode ? 'text-gray-400' : 'text-gray-600')}`}>{reason}</Text>
                  {reportReason === reason && <Feather name="check" size={16} color={isDarkMode ? '#fff' : '#000'} />}
                </TouchableOpacity>
              ))}
            </View>
            <View className="flex-row gap-3">
              <TouchableOpacity
                className={`flex-1 py-3.5 rounded-3.5 items-center border ${isDarkMode ? 'border-gray-700' : 'border-gray-300'} bg-transparent`}
                onPress={() => setShowReportModal(false)}
              >
                <Text className={`text-sm font-semibold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`flex-1 py-3.5 rounded-3.5 items-center ${isDarkMode ? 'bg-white' : 'bg-black'}`}
                onPress={submitReport}
              >
                <Text className={`text-sm font-bold ${isDarkMode ? 'text-black' : 'text-white'}`}>Submit Report</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Ban Modal */}
      <Modal visible={showBanModal} transparent={true} animationType="fade" onRequestClose={() => setShowBanModal(false)}>
        <View className="items-center justify-center flex-1 bg-black/85">
          <View className={`${isMobile ? 'w-[90%]' : 'w-96'} rounded-3xl border ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-300'} p-6`}>
            <View className={`w-16 h-16 rounded-full justify-center items-center self-center mb-4 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-400'}`}>
              <Feather name="alert-triangle" size={32} color="#fff" />
            </View>
            <Text className={`text-xl font-bold mb-3 text-center ${isDarkMode ? 'text-white' : 'text-black'}`}>Ban User</Text>
            <Text className={`text-sm mb-6 text-center leading-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Are you sure you want to ban {selectedUser?.name}? This action cannot be undone.
            </Text>
            <View className="flex-row gap-3">
              <TouchableOpacity
                className={`flex-1 py-3.5 rounded-3.5 items-center border ${isDarkMode ? 'border-gray-700' : 'border-gray-300'} bg-transparent`}
                onPress={() => setShowBanModal(false)}
              >
                <Text className={`text-sm font-semibold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`flex-1 py-3.5 rounded-3.5 items-center ${isDarkMode ? 'bg-white' : 'bg-black'}`}
                onPress={confirmBan}
              >
                <Text className={`text-sm font-bold ${isDarkMode ? 'text-black' : 'text-white'}`}>Confirm Ban</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default Profile;