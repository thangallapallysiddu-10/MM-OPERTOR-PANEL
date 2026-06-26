import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Platform,
  Alert,
  Switch,
  Dimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ScheduledEvent {
  id: string;
  title: string;
  description: string;
  date: Date;
  duration: number;
  isActive: boolean;
  notificationSent: boolean;
}

interface ScheduleModalProps {
  visible: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  colors: any;
  onScheduleEvent: (event: ScheduledEvent) => void;
  scheduledEvents: ScheduledEvent[];
  onCancelEvent: (eventId: string) => void;
  rjName: string;
}

// ─── Custom Calendar ──────────────────────────────────────────────────────────
const CustomCalendar = ({
  selectedDate,
  onSelectDate,
  isDarkMode,
}: {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  isDarkMode: boolean;
}) => {
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth());

  const textPrimary = isDarkMode ? '#F0F6FC' : '#1E293B';
  const textMuted   = isDarkMode ? '#8B949E' : '#94A3B8';
  const accent      = '#4F6AF0';

  const today = new Date(); today.setHours(0, 0, 0, 0);

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const DAYS   = ['S','M','T','W','T','F','S'];

  const getDays      = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDay  = (y: number, m: number) => new Date(y, m, 1).getDay();

  const prevMonth = () => viewMonth === 0 ? (setViewMonth(11), setViewYear(y => y - 1)) : setViewMonth(m => m - 1);
  const nextMonth = () => viewMonth === 11 ? (setViewMonth(0),  setViewYear(y => y + 1)) : setViewMonth(m => m + 1);

  const cells: (number | null)[] = [
    ...Array(getFirstDay(viewYear, viewMonth)).fill(null),
    ...Array.from({ length: getDays(viewYear, viewMonth) }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const isSame = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();

  const isPast = (day: number) => {
    const d = new Date(viewYear, viewMonth, day); d.setHours(0, 0, 0, 0);
    return d < today;
  };

  const isBeforeNow =
    viewYear < today.getFullYear() ||
    (viewYear === today.getFullYear() && viewMonth < today.getMonth());

  const cellSize = Math.min(36, (SCREEN_WIDTH - 80) / 7);

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <TouchableOpacity onPress={prevMonth} disabled={isBeforeNow}
          style={{ padding: 6, opacity: isBeforeNow ? 0.25 : 1 }}>
          <Feather name="chevron-left" size={18} color={textPrimary} />
        </TouchableOpacity>
        <Text style={{ fontSize: 13, fontWeight: '700', color: textPrimary }}>
          {MONTHS[viewMonth]} {viewYear}
        </Text>
        <TouchableOpacity onPress={nextMonth} style={{ padding: 6 }}>
          <Feather name="chevron-right" size={18} color={textPrimary} />
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: 'row', marginBottom: 4 }}>
        {DAYS.map((d, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 10, fontWeight: '600', color: textMuted }}>{d}</Text>
          </View>
        ))}
      </View>

      {Array.from({ length: cells.length / 7 }, (_, row) => (
        <View key={row} style={{ flexDirection: 'row', marginBottom: 2 }}>
          {cells.slice(row * 7, row * 7 + 7).map((day, col) => {
            if (!day) return <View key={col} style={{ flex: 1 }} />;
            const cellDate  = new Date(viewYear, viewMonth, day);
            const isSelected = isSame(cellDate, selectedDate);
            const isToday    = isSame(cellDate, today);
            const past       = isPast(day);

            return (
              <TouchableOpacity
                key={col}
                onPress={() => {
                  if (past) return;
                  const nd = new Date(selectedDate);
                  nd.setFullYear(viewYear, viewMonth, day);
                  onSelectDate(nd);
                }}
                disabled={past}
                style={{ flex: 1, alignItems: 'center', paddingVertical: 2 }}
              >
                <View style={{
                  width: cellSize, height: cellSize, borderRadius: cellSize / 2,
                  alignItems: 'center', justifyContent: 'center',
                  backgroundColor: isSelected ? accent : isToday ? `${accent}20` : 'transparent',
                }}>
                  <Text style={{
                    fontSize: 12,
                    fontWeight: isSelected || isToday ? '700' : '400',
                    color: isSelected ? '#FFF' : past ? textMuted : textPrimary,
                    opacity: past ? 0.3 : 1,
                  }}>
                    {day}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
};

// ─── SIMPLE WORKING TIME PICKER ──────────────────────────────────────────────
const SimpleTimePicker = ({
  selectedDate,
  onSelectTime,
  isDarkMode,
}: {
  selectedDate: Date;
  onSelectTime: (hour: number, minute: number) => void;
  isDarkMode: boolean;
}) => {
  const [tempHour, setTempHour] = useState(selectedDate.getHours());
  const [tempMinute, setTempMinute] = useState(selectedDate.getMinutes());

  const accent = '#4F6AF0';
  const textPrimary = isDarkMode ? '#F0F6FC' : '#1E293B';
  const textMuted = isDarkMode ? '#8B949E' : '#94A3B8';

  const displayHour = tempHour % 12 === 0 ? 12 : tempHour % 12;
  const ampm = tempHour >= 12 ? 'PM' : 'AM';

  const changeHour = (delta: number) => {
    let newHour = tempHour + delta;
    if (newHour < 0) newHour = 23;
    if (newHour > 23) newHour = 0;
    setTempHour(newHour);
    onSelectTime(newHour, tempMinute);
  };

  const changeMinute = (delta: number) => {
    let newMinute = tempMinute + delta;
    if (newMinute < 0) newMinute = 59;
    if (newMinute > 59) newMinute = 0;
    setTempMinute(newMinute);
    onSelectTime(tempHour, newMinute);
  };

  const setHourDirect = (hour12: number, isAmPm: string) => {
    let newHour = hour12;
    if (isAmPm === 'PM' && hour12 !== 12) newHour = hour12 + 12;
    if (isAmPm === 'AM' && hour12 === 12) newHour = 0;
    setTempHour(newHour);
    onSelectTime(newHour, tempMinute);
  };

  const setMinuteDirect = (minute: number) => {
    setTempMinute(minute);
    onSelectTime(tempHour, minute);
  };

  return (
    <View style={{ gap: 20 }}>
      <View>
        <Text style={{ fontSize: 11, color: textMuted, textAlign: 'center', marginBottom: 8 }}>Hour</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
          <TouchableOpacity onPress={() => changeHour(-1)} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: `${accent}15`, alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="chevron-left" size={22} color={accent} />
          </TouchableOpacity>
          <Text style={{ fontSize: 32, fontWeight: '700', color: textPrimary, minWidth: 60, textAlign: 'center' }}>{displayHour}</Text>
          <TouchableOpacity onPress={() => changeHour(1)} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: `${accent}15`, alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="chevron-right" size={22} color={accent} />
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 15, marginTop: 8 }}>
          <TouchableOpacity onPress={() => setHourDirect(displayHour, 'AM')}>
            <Text style={{ fontSize: 14, fontWeight: ampm === 'AM' ? '700' : '400', color: ampm === 'AM' ? accent : textMuted }}>AM</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setHourDirect(displayHour, 'PM')}>
            <Text style={{ fontSize: 14, fontWeight: ampm === 'PM' ? '700' : '400', color: ampm === 'PM' ? accent : textMuted }}>PM</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View>
        <Text style={{ fontSize: 11, color: textMuted, textAlign: 'center', marginBottom: 8 }}>Minute</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
          <TouchableOpacity onPress={() => changeMinute(-5)} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: `${accent}15`, alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="chevron-left" size={22} color={accent} />
          </TouchableOpacity>
          <Text style={{ fontSize: 32, fontWeight: '700', color: textPrimary, minWidth: 60, textAlign: 'center' }}>{tempMinute.toString().padStart(2, '0')}</Text>
          <TouchableOpacity onPress={() => changeMinute(5)} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: `${accent}15`, alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="chevron-right" size={22} color={accent} />
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
          {[0, 15, 30, 45].map(min => (
            <TouchableOpacity key={min} onPress={() => setMinuteDirect(min)} style={{ paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, backgroundColor: tempMinute === min ? accent : `${accent}10` }}>
              <Text style={{ fontSize: 12, fontWeight: '500', color: tempMinute === min ? '#FFF' : accent }}>{min.toString().padStart(2, '0')}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
};

// ─── Main Modal ───────────────────────────────────────────────────────────────
export const ScheduleModal: React.FC<ScheduleModalProps> = ({
  visible,
  onClose,
  isDarkMode,
  colors,
  onScheduleEvent,
  scheduledEvents,
  onCancelEvent,
  rjName,
}) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
    return d;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [duration, setDuration] = useState(60);
  const [sendNotification, setSendNotification] = useState(true);
  
  // IMPORTANT: Local state for events - this makes X button work instantly
  const [localEvents, setLocalEvents] = useState<ScheduledEvent[]>([]);

  // Update localEvents when scheduledEvents prop changes (when new event is added)
  useEffect(() => {
    setLocalEvents(scheduledEvents);
  }, [scheduledEvents]);

  const bg = isDarkMode ? '#0D1117' : '#FFFFFF';
  const surface = isDarkMode ? '#161B22' : '#F8FAFC';
  const cardSurface = isDarkMode ? '#1A2030' : '#F1F5F9';
  const border = isDarkMode ? '#21262D' : '#E8EDF5';
  const textPrimary = isDarkMode ? '#F0F6FC' : '#1E293B';
  const textMuted = isDarkMode ? '#8B949E' : '#64748B';
  const accent = '#4F6AF0';
  const danger = '#EF4444';

  // Filter upcoming events from localEvents
  const upcomingEvents = localEvents
    .filter(e => e.isActive && new Date(e.date) > new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const resetForm = () => {
    setEventTitle('');
    setEventDescription('');
    const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(10, 0, 0, 0);
    setSelectedDate(d);
    setDuration(60);
    setSendNotification(true);
    setShowDatePicker(false);
    setShowTimePicker(false);
  };

  const handleCreateEvent = () => {
    if (!eventTitle.trim()) {
      Alert.alert('Required', 'Please enter an event title');
      return;
    }
    if (selectedDate.getTime() <= Date.now()) {
      Alert.alert('Invalid time', 'Please select a future date and time');
      return;
    }
    const newEvent: ScheduledEvent = {
      id: Date.now().toString(),
      title: eventTitle.trim(),
      description: eventDescription.trim(),
      date: new Date(selectedDate),
      duration,
      isActive: true,
      notificationSent: sendNotification,
    };
    onScheduleEvent(newEvent);
    resetForm();
    setShowCreateForm(false);
    Alert.alert('Success', `"${eventTitle}" scheduled!`);
  };

  // FIXED: Remove from local state immediately, then notify parent
  const handleRemoveEvent = (eventId: string, title: string) => {
    Alert.alert(
      'Cancel Event',
      `Cancel "${title}"?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: () => {
            // Remove from local state immediately - this makes the X button work instantly
            setLocalEvents(prev => prev.filter(e => e.id !== eventId));
            // Also tell parent to update its state
            onCancelEvent(eventId);
          },
        },
      ]
    );
  };

  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  const formatTime = (date: Date) =>
    new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const hPad = Math.min(16, SCREEN_WIDTH * 0.04);
  const formWidth = Math.min(SCREEN_WIDTH - hPad * 2, 480);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: bg }}>

        {/* Header */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingTop: Platform.OS === 'ios' ? 50 : 36,
          paddingHorizontal: hPad, paddingBottom: 12,
          borderBottomWidth: 1, borderBottomColor: border, backgroundColor: surface,
        }}>
          <TouchableOpacity onPress={onClose} style={{ padding: 6 }}>
            <Feather name="arrow-left" size={22} color={textPrimary} />
          </TouchableOpacity>
          <Text style={{ fontSize: 16, fontWeight: '700', color: textPrimary }}>Schedule Live Show</Text>
          <TouchableOpacity
            onPress={() => { if (showCreateForm) resetForm(); setShowCreateForm(!showCreateForm); }}
            style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: showCreateForm ? '#64748B' : accent, alignItems: 'center', justifyContent: 'center' }}
          >
            <Feather name={showCreateForm ? 'x' : 'plus'} size={18} color="#FFF" />
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: hPad, alignItems: 'center' }} keyboardShouldPersistTaps="handled">
          <View style={{ width: '100%', maxWidth: formWidth }}>

            {/* Create Form */}
            {showCreateForm && (
              <View style={{ backgroundColor: surface, borderRadius: 12, borderWidth: 1, borderColor: border, padding: 14, marginBottom: 18 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: textPrimary, marginBottom: 14 }}>New Event</Text>

                <Text style={{ fontSize: 11, fontWeight: '600', color: textMuted, marginBottom: 5 }}>TITLE *</Text>
                <TextInput
                  value={eventTitle}
                  onChangeText={setEventTitle}
                  placeholder="e.g., Evening Mix Session"
                  placeholderTextColor={textMuted}
                  style={{ backgroundColor: bg, borderRadius: 8, borderWidth: 1, borderColor: border, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: textPrimary, marginBottom: 12 }}
                />

                <Text style={{ fontSize: 11, fontWeight: '600', color: textMuted, marginBottom: 5 }}>DESCRIPTION</Text>
                <TextInput
                  value={eventDescription}
                  onChangeText={setEventDescription}
                  placeholder="What's this show about?"
                  placeholderTextColor={textMuted}
                  multiline
                  numberOfLines={2}
                  style={{ backgroundColor: bg, borderRadius: 8, borderWidth: 1, borderColor: border, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: textPrimary, marginBottom: 14, minHeight: 60, textAlignVertical: 'top' }}
                />

                {/* Date row */}
                <TouchableOpacity
                  onPress={() => { setShowTimePicker(false); setShowDatePicker(!showDatePicker); }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: showDatePicker ? `${accent}12` : bg, borderRadius: 8, borderWidth: 1, borderColor: showDatePicker ? accent : border, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8 }}>
                  <Feather name="calendar" size={16} color={accent} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 10, color: textMuted }}>Date</Text>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: textPrimary }}>{formatDate(selectedDate)}</Text>
                  </View>
                  <Feather name={showDatePicker ? 'chevron-up' : 'chevron-down'} size={14} color={textMuted} />
                </TouchableOpacity>

                {showDatePicker && (
                  <View style={{ backgroundColor: cardSurface, borderRadius: 10, borderWidth: 1, borderColor: border, padding: 10, marginBottom: 8 }}>
                    <CustomCalendar selectedDate={selectedDate} onSelectDate={d => setSelectedDate(d)} isDarkMode={isDarkMode} />
                    <TouchableOpacity onPress={() => setShowDatePicker(false)} style={{ marginTop: 10, paddingVertical: 9, borderRadius: 7, backgroundColor: accent, alignItems: 'center' }}>
                      <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13 }}>Confirm Date</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Time row */}
                <TouchableOpacity
                  onPress={() => { setShowDatePicker(false); setShowTimePicker(!showTimePicker); }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: showTimePicker ? `${accent}12` : bg, borderRadius: 8, borderWidth: 1, borderColor: showTimePicker ? accent : border, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8 }}>
                  <Feather name="clock" size={16} color={accent} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 10, color: textMuted }}>Time</Text>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: textPrimary }}>{formatTime(selectedDate)}</Text>
                  </View>
                  <Feather name={showTimePicker ? 'chevron-up' : 'chevron-down'} size={14} color={textMuted} />
                </TouchableOpacity>

                {showTimePicker && (
                  <View style={{ backgroundColor: cardSurface, borderRadius: 10, borderWidth: 1, borderColor: border, padding: 16, marginBottom: 8 }}>
                    <SimpleTimePicker selectedDate={selectedDate} isDarkMode={isDarkMode} onSelectTime={(hour, minute) => { const d = new Date(selectedDate); d.setHours(hour, minute, 0, 0); setSelectedDate(d); }} />
                    <TouchableOpacity onPress={() => setShowTimePicker(false)} style={{ marginTop: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: accent, alignItems: 'center' }}>
                      <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13 }}>Confirm Time</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Duration */}
                <Text style={{ fontSize: 11, fontWeight: '600', color: textMuted, marginBottom: 8, marginTop: 4 }}>DURATION</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 14, backgroundColor: cardSurface, borderRadius: 10, paddingVertical: 12 }}>
                  <TouchableOpacity onPress={() => setDuration(Math.max(15, duration - 15))} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: bg, borderWidth: 1.5, borderColor: accent, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 20, color: accent }}>−</Text>
                  </TouchableOpacity>
                  <View style={{ alignItems: 'center', minWidth: 70 }}>
                    <Text style={{ fontSize: 24, fontWeight: '800', color: textPrimary }}>{duration}</Text>
                    <Text style={{ fontSize: 11, color: textMuted }}>minutes</Text>
                  </View>
                  <TouchableOpacity onPress={() => setDuration(Math.min(240, duration + 15))} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: bg, borderWidth: 1.5, borderColor: accent, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 20, color: accent }}>+</Text>
                  </TouchableOpacity>
                </View>

                {/* Notify toggle */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: cardSurface, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 14 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Feather name="bell" size={14} color={accent} />
                    <Text style={{ fontSize: 12, color: textPrimary }}>Notify listeners</Text>
                  </View>
                  <Switch value={sendNotification} onValueChange={setSendNotification} trackColor={{ false: border, true: accent }} thumbColor="#FFF" />
                </View>

                {/* Buttons */}
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity onPress={() => { resetForm(); setShowCreateForm(false); }} style={{ flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: border, alignItems: 'center' }}>
                    <Text style={{ color: textMuted, fontWeight: '600', fontSize: 13 }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleCreateEvent} style={{ flex: 2, paddingVertical: 12, borderRadius: 8, backgroundColor: accent, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
                    <Feather name="check-circle" size={14} color="#FFF" />
                    <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13 }}>Schedule Show</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Upcoming list */}
            <Text style={{ fontSize: 14, fontWeight: '700', color: textPrimary, marginBottom: 10 }}>Upcoming Shows ({upcomingEvents.length})</Text>

            {upcomingEvents.length === 0 ? (
              <View style={{ backgroundColor: surface, borderRadius: 12, borderWidth: 1, borderColor: border, padding: 32, alignItems: 'center' }}>
                <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: `${accent}15`, alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                  <Feather name="calendar" size={22} color={accent} />
                </View>
                <Text style={{ fontSize: 14, fontWeight: '600', color: textPrimary }}>No upcoming shows</Text>
                <Text style={{ fontSize: 11, color: textMuted, marginTop: 4, textAlign: 'center' }}>Tap + to schedule your next live session</Text>
              </View>
            ) : (
              upcomingEvents.map(event => (
                <View key={event.id} style={{ backgroundColor: surface, borderRadius: 12, borderWidth: 1, borderColor: border, padding: 12, marginBottom: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: textPrimary }}>{event.title}</Text>
                      {!!event.description && <Text style={{ fontSize: 11, color: textMuted, marginTop: 2 }} numberOfLines={2}>{event.description}</Text>}
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: `${accent}10`, borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3 }}>
                          <Feather name="calendar" size={10} color={accent} />
                          <Text style={{ fontSize: 10, color: accent, fontWeight: '600' }}>{formatDate(new Date(event.date))}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: `${accent}10`, borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3 }}>
                          <Feather name="clock" size={10} color={accent} />
                          <Text style={{ fontSize: 10, color: accent, fontWeight: '600' }}>{formatTime(new Date(event.date))}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: `${accent}10`, borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3 }}>
                          <Feather name="activity" size={10} color={accent} />
                          <Text style={{ fontSize: 10, color: accent, fontWeight: '600' }}>{event.duration} min</Text>
                        </View>
                      </View>
                    </View>

                    {/* X Button - Cancel Event - NOW WORKING */}
                    <TouchableOpacity
                      onPress={() => handleRemoveEvent(event.id, event.title)}
                      style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Feather name="x" size={18} color={danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}

            <View style={{ height: 32 }} />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};