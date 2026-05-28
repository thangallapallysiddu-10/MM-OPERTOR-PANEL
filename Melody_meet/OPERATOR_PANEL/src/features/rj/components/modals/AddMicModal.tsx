import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface AddMicModalProps {
  visible: boolean;
  isDarkMode: boolean;
  colors: any;
  onClose: () => void;
  onAddMic: (name: string) => boolean;
}

export const AddMicModal: React.FC<AddMicModalProps> = ({
  visible,
  isDarkMode,
  colors,
  onClose,
  onAddMic,
}) => {
  const [localName, setLocalName] = useState("");
  
  const handleAddMic = () => {
    if (!localName.trim()) {
      Alert.alert("Error", "Please enter a name");
      return;
    }
    if (onAddMic(localName)) {
      setLocalName("");
      onClose();
    }
  };
  
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' }}>
        <View style={{
          width: '90%',
          maxWidth: 420,
          borderRadius: 16,
          borderWidth: 1,
          padding: 20,
          backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
          borderColor: isDarkMode ? '#374151' : '#E5E7EB',
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: isDarkMode ? '#FFFFFF' : '#000000' }}>Add New Mic 🎙️</Text>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={24} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
            </TouchableOpacity>
          </View>
          <Text style={{ fontSize: 12, textAlign: 'center', marginBottom: 16, color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>Enter name for the new mic</Text>
          <TextInput
            style={{
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 12,
              fontSize: 14,
              marginBottom: 20,
              backgroundColor: isDarkMode ? '#374151' : '#F9FAFB',
              borderWidth: 1,
              borderColor: isDarkMode ? '#4B5563' : '#E5E7EB',
              color: isDarkMode ? '#FFFFFF' : '#000000',
            }}
            placeholder="e.g., GUEST MIC"
            placeholderTextColor={isDarkMode ? "#6B7280" : "#9CA3AF"}
            value={localName}
            onChangeText={setLocalName}
            autoFocus
          />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity 
              onPress={onClose} 
              style={{ flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: isDarkMode ? '#4B5563' : '#E5E7EB' }}
            >
              <Text style={{ textAlign: 'center', fontSize: 14, fontWeight: '600', color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handleAddMic} 
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12, backgroundColor: isDarkMode ? '#FFFFFF' : '#000000' }}
            >
              <Feather name="plus" size={16} color={isDarkMode ? "#000000" : "#FFFFFF"} />
              <Text style={{ fontSize: 14, fontWeight: '600', color: isDarkMode ? '#000000' : '#FFFFFF' }}>Add Mic</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};