import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Switch, StyleSheet, Alert } from 'react-native';
import { COLORS } from '../lib/theme';
import { settingsAPI } from '../lib/api';
import { useAuth } from '../lib/auth';

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const [settings, setSettings] = useState({
    angel_api_key: '', angel_client_id: '', angel_mpin: '', angel_totp_secret: '',
    paper_trade: true, orb_enabled: true, vwap_enabled: true, cpr_enabled: true,
    nifty_enabled: true, banknifty_enabled: true, sensex_enabled: true,
    capital: 200000, risk_per_trade: 1.0, max_daily_loss: 2.0, max_trades_per_day: 3,
    telegram_bot_token: '', telegram_chat_id: '',
    signal_alert: true, t1_alert: true, t2_alert: true, sl_alert: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => { try { const { data } = await settingsAPI.get(); setSettings(prev => ({ ...prev, ...data })); } catch {} })();
  }, []);

  const update = (key, value) => setSettings(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try { await settingsAPI.save(settings); Alert.alert('Saved', 'Settings saved successfully'); } catch {}
    setSaving(false);
  };

  const handleLiveToggle = (val) => {
    if (!val) {
      Alert.alert('⚠️ Warning', 'Real money will be used. You will place actual orders on Angel One.', [
        { text: 'Stay Safe', style: 'cancel' },
        { text: 'Enable Live', onPress: () => update('paper_trade', false), style: 'destructive' },
      ]);
    } else {
      update('paper_trade', true);
    }
  };

  const SectionHeader = ({ icon, title, color }) => (
    <Text style={[styles.sectionTitle, { color: color || COLORS.text }]}>{icon} {title}</Text>
  );

  const ToggleRow = ({ label, field }) => (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch
        value={settings[field]}
        onValueChange={(v) => update(field, v)}
        trackColor={{ false: 'rgba(255,255,255,0.1)', true: COLORS.accent + '66' }}
        thumbColor={settings[field] ? COLORS.accent : '#666'}
      />
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 120 }}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      {/* Profile */}
      <View style={styles.card}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{user?.name?.charAt(0) || 'A'}</Text></View>
          <View>
            <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.text }}>{user?.name || 'Admin'}</Text>
            <Text style={{ fontSize: 12, color: COLORS.muted }}>{user?.email || 'admin@algotrader.pro'}</Text>
          </View>
        </View>
      </View>

      {/* Broker */}
      <View style={styles.card}>
        <SectionHeader icon="🔗" title="Broker Connection" color={COLORS.accent} />
        <View style={styles.field}>
          <Text style={styles.label}>API Key</Text>
          <TextInput style={styles.input} value={settings.angel_api_key} onChangeText={v => update('angel_api_key', v)} placeholder="Angel One API Key" placeholderTextColor={COLORS.muted} secureTextEntry />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Client ID</Text>
          <TextInput style={styles.input} value={settings.angel_client_id} onChangeText={v => update('angel_client_id', v)} placeholder="e.g. D12345678" placeholderTextColor={COLORS.muted} />
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>MPIN</Text>
            <TextInput style={styles.input} value={settings.angel_mpin} onChangeText={v => update('angel_mpin', v)} placeholder="4-digit" placeholderTextColor={COLORS.muted} secureTextEntry keyboardType="numeric" maxLength={4} />
          </View>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>TOTP Secret</Text>
            <TextInput style={styles.input} value={settings.angel_totp_secret} onChangeText={v => update('angel_totp_secret', v)} placeholder="Optional" placeholderTextColor={COLORS.muted} secureTextEntry />
          </View>
        </View>
      </View>

      {/* Trading Mode */}
      <View style={styles.card}>
        <SectionHeader icon="⚡" title="Trading Mode" color={COLORS.accent3} />
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Paper Trade Mode</Text>
          <Switch
            value={settings.paper_trade}
            onValueChange={handleLiveToggle}
            trackColor={{ false: 'rgba(239,68,68,0.3)', true: COLORS.accent3 + '66' }}
            thumbColor={settings.paper_trade ? COLORS.accent3 : '#EF4444'}
          />
        </View>
        {!settings.paper_trade && (
          <View style={styles.warning}>
            <Text style={{ color: '#FCA5A5', fontSize: 12 }}>⚠️ LIVE MODE: Real orders on Angel One</Text>
          </View>
        )}
      </View>

      {/* Strategies */}
      <View style={styles.card}>
        <SectionHeader icon="📊" title="Strategies" color={COLORS.accent2} />
        <ToggleRow label="ORB Breakout" field="orb_enabled" />
        <ToggleRow label="VWAP Bounce" field="vwap_enabled" />
        <ToggleRow label="CPR Filter" field="cpr_enabled" />
      </View>

      {/* Instruments */}
      <View style={styles.card}>
        <SectionHeader icon="📈" title="Instruments" />
        <ToggleRow label="NIFTY 50" field="nifty_enabled" />
        <ToggleRow label="BANK NIFTY" field="banknifty_enabled" />
        <ToggleRow label="SENSEX" field="sensex_enabled" />
      </View>

      {/* Risk */}
      <View style={styles.card}>
        <SectionHeader icon="🛡️" title="Risk Management" color={COLORS.accent4} />
        <View style={styles.field}>
          <Text style={styles.label}>Capital (₹)</Text>
          <TextInput style={styles.input} value={String(settings.capital)} onChangeText={v => update('capital', Number(v) || 0)} keyboardType="numeric" placeholderTextColor={COLORS.muted} />
        </View>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Risk per Trade: {settings.risk_per_trade}%</Text>
        </View>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Max Daily Loss: {settings.max_daily_loss}%</Text>
        </View>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Max Trades/Day: {settings.max_trades_per_day}</Text>
        </View>
      </View>

      {/* Notifications */}
      <View style={styles.card}>
        <SectionHeader icon="🔔" title="Notifications" />
        <ToggleRow label="Signal Alerts" field="signal_alert" />
        <ToggleRow label="T1 Hit Alerts" field="t1_alert" />
        <ToggleRow label="T2 (WIN) Alerts" field="t2_alert" />
        <ToggleRow label="SL (LOSS) Alerts" field="sl_alert" />
      </View>

      {/* Save + Logout */}
      <View style={{ padding: 16, gap: 10 }}>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.8}>
          <Text style={styles.saveBtnText}>{saving ? 'Saving...' : '💾 Save Settings'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.8}>
          <Text style={styles.logoutBtnText}>Logout</Text>
        </TouchableOpacity>
        <Text style={{ textAlign: 'center', fontSize: 11, color: COLORS.muted, marginTop: 8 }}>AlgoTrader Pro v1.0.0</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingTop: 60, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  card: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, padding: 16, margin: 16, marginBottom: 0 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  field: { marginBottom: 12 },
  label: { fontSize: 11, color: COLORS.muted, fontWeight: '600', marginBottom: 4 },
  input: { backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 12, color: COLORS.text, fontSize: 14 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  toggleLabel: { fontSize: 14, color: COLORS.text },
  warning: { backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', borderRadius: 8, padding: 10, marginTop: 8 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.accent + '33', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '700', color: COLORS.accent },
  saveBtn: { backgroundColor: COLORS.accent, borderRadius: 14, padding: 16, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  logoutBtn: { backgroundColor: 'rgba(239,68,68,0.12)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', borderRadius: 14, padding: 16, alignItems: 'center' },
  logoutBtnText: { color: '#FCA5A5', fontSize: 16, fontWeight: '700' },
});
