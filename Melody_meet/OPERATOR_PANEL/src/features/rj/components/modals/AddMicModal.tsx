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
          backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
          borderColor: isDarkMode ? '#334155' : '#E2E8F0',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isDarkMode ? 0.3 : 0.08,
          shadowRadius: 16,
          elevation: 8,
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: isDarkMode ? '#F1F5F9' : '#0F172A' }}>Add New Mic 🎙️</Text>
            <TouchableOpacity
              onPress={onClose}
              style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: isDarkMode ? '#263347' : '#F1F5F9', justifyContent: 'center', alignItems: 'center' }}
            >
              <Feather name="x" size={15} color={isDarkMode ? '#94A3B8' : '#475569'} />
            </TouchableOpacity>
          </View>
          <Text style={{ fontSize: 13, textAlign: 'center', marginBottom: 14, color: isDarkMode ? '#64748B' : '#94A3B8' }}>Enter name for the new mic</Text>
          <TextInput
            style={{
              borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11,
              fontSize: 14, marginBottom: 18,
              backgroundColor: isDarkMode ? '#263347' : '#F8FAFC',
              borderWidth: 1, borderColor: isDarkMode ? '#334155' : '#E2E8F0',
              color: isDarkMode ? '#F1F5F9' : '#0F172A',
            }}
            placeholder="e.g., GUEST MIC"
            placeholderTextColor={isDarkMode ? '#64748B' : '#94A3B8'}
            value={localName}
            onChangeText={setLocalName}
            autoFocus
          />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              onPress={onClose}
              style={{ flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: isDarkMode ? '#334155' : '#E2E8F0', alignItems: 'center' }}
            >
              <Text style={{ fontSize: 14, fontWeight: '500', color: isDarkMode ? '#94A3B8' : '#475569' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleAddMic}
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 10, backgroundColor: '#4F6AF0' }}
            >
              <Feather name="plus" size={15} color="#FFFFFF" />
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#FFFFFF' }}>Add Mic</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};