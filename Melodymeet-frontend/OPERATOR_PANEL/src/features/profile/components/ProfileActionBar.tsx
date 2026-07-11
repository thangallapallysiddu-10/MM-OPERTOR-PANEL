import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';

interface Props {
  isEditing: boolean;
  saving: boolean;
  isDark: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
}

const ProfileActionBar: React.FC<Props> = ({ isEditing, saving, isDark, onEdit, onSave, onCancel }) => {
  const bg = isDark ? 'bg-[#111625] border-[#1B2234]' : 'bg-white border-[#E2E8F0]';
  const textTitle = isDark ? 'text-[#F8FAFC]' : 'text-gray-800';

  if (!isEditing) {
    return (
      <View className={`absolute bottom-0 left-0 right-0 p-5 border-t ${bg} flex-row justify-end items-center`}>
        <TouchableOpacity
          onPress={onEdit}
          className="bg-[#4F6AF0] px-8 py-3 rounded-xl flex-row items-center justify-center"
        >
          <Text className="font-semibold text-white">Edit Profile</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className={`absolute bottom-0 left-0 right-0 p-5 border-t ${bg}`}>
      <View className="flex-row items-center justify-between mb-3">
        <Text className={`text-sm font-semibold text-amber-500`}>Unsaved changes</Text>
      </View>
      <View className="flex-row justify-end items-center gap-3">
        <TouchableOpacity
          onPress={onCancel}
          disabled={saving}
          className={`px-6 py-3 rounded-xl border ${isDark ? 'border-[#334155]' : 'border-gray-300'}`}
        >
          <Text className={`font-semibold ${textTitle}`}>Cancel</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={onSave}
          disabled={saving}
          className="bg-green-600 px-8 py-3 rounded-xl flex-row items-center justify-center min-w-[120px]"
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text className="font-semibold text-white">Save Changes</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default ProfileActionBar;
