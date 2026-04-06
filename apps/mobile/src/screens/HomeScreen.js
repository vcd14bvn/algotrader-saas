import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../lib/theme';
import { dashboardAPI, engineAPI } from '../lib/api';

const DEMO_SIGNALS = [
  { strategy: 'ORB', index: 'NIFTY', direction: 'LONG', entry: 23185, confluence: 5, timestamp: new Date().toISOString() },
  { strategy: 'VWAP', index: 'BANKNIFTY', direction: 'SHORT', entry: 49520, confluence: 4, timestamp: new Date().toISOString() },
  { strategy: 'ORB', index: 'SENSEX', direction: 'LONG', entry: 76850, confluence: 5, timestamp: new Date().toISOString() },
];

const STRATEGIES = [
  { key: 'ORB', name: 'ORB', time: '9:30-10:30', color: COLORS.accent },
  { key: 'VWAP', name: 'VWAP', time: '10:00-1:00', color: COLORS.accent2 },
  { key: 'CPR', name: 'CPR', time: 'Pre-Market', color: COLORS.accent3 },
];

export default function HomeScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState({ todays_pnl: 0, win_rate: 0, trades_today: 0, capital: 200000, daily_risk_used: 0 });
  const [engineStatus, setEngineStatus] = useState({ running: false, mode: 'paper', vix: null });
  const [signals, setSignals] = useState(DEMO_SIGNALS);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    try { const { data } = await dashboardAPI.getSummary(); setSummary(data); } catch {}
    try { const { data } = await engineAPI.getStatus(); setEngineStatus(data); } catch {}
    try { const { data } = await dashboardAPI.getSignals(); if (data.length) setSignals(data); } catch {}
  };

  useEffect(() => { fetchData(); }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, []);

  const handleStartStop = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    try {
      if (engineStatus.running) {
        const { data } = await engineAPI.stop();
        if (data.status) setEngineStatus(data.status);
        else setEngineStatus(prev => ({ ...prev, running: false }));
      } else {
        const { data } = await engineAPI.start();
        if (data.status) setEngineStatus(data.status);
        else setEngineStatus(prev => ({ ...prev, running: true }));
      }
    } catch {}
    setLoading(false);
  };

  const statusColor = engineStatus.running ? (engineStatus.mode === 'live' ? COLORS.accent2 : COLORS.accent3) : COLORS.accent4;
  const statusLabel = engineStatus.running ? (engineStatus.mode === 'live' ? 'LIVE' : 'PAPER') : 'STOPPED';

  const metrics = [
    { label: "Today's P&L", value: `₹${summary.todays_pnl.toLocaleString()}`, color: summary.todays_pnl >= 0 ? COLORS.accent2 : COLORS.accent4 },
    { label: 'Win Rate', value: `${summary.win_rate}%`, color: COLORS.accent },
    { label: 'Trades', value: `${summary.trades_today}`, color: COLORS.accent3 },
    { label: 'Capital', value: `₹${(summary.capital / 1000).toFixed(0)}k`, color: COLORS.text },
    { label: 'Risk Used', value: `${summary.daily_risk_used}%`, color: summary.daily_risk_used > 70 ? COLORS.accent4 : COLORS.accent2 },
  ];

  const formatTime = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>AlgoTrader Pro</Text>
          <Text style={styles.headerSub}>NIFTY · BANKNIFTY · SENSEX</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '22', borderColor: statusColor + '55' }]}>
          <View style={[styles.dot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>

      {/* Quick Stats */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.metricsRow} contentContainerStyle={{ gap: 10, paddingHorizontal: 16 }}>
        {metrics.map((m, i) => (
          <View key={i} style={styles.metricCard}>
            <Text style={styles.metricLabel}>{m.label}</Text>
            <Text style={[styles.metricValue, { color: m.color }]}>{m.value}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Engine Control */}
      <View style={styles.section}>
        <TouchableOpacity
          style={[styles.engineBtn, { backgroundColor: engineStatus.running ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)', borderColor: engineStatus.running ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)' }]}
          onPress={handleStartStop}
          disabled={loading}
          activeOpacity={0.7}
        >
          <Text style={[styles.engineBtnText, { color: engineStatus.running ? '#FCA5A5' : '#34D399' }]}>
            {loading ? '...' : engineStatus.running ? '⏹ STOP ENGINE' : '▶ START ENGINE'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Strategies */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Strategies</Text>
        <View style={styles.strategiesRow}>
          {STRATEGIES.map((s) => (
            <TouchableOpacity key={s.key} style={[styles.strategyCard, { borderLeftColor: s.color }]} activeOpacity={0.7}
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}>
              <Text style={[styles.strategyName, { color: s.color }]}>{s.name}</Text>
              <Text style={styles.strategyTime}>{s.time}</Text>
              <View style={[styles.activeBadge, { backgroundColor: engineStatus.running ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)' }]}>
                <Text style={{ fontSize: 9, fontWeight: '700', color: engineStatus.running ? '#34D399' : '#FCA5A5' }}>
                  {engineStatus.running ? 'ACTIVE' : 'OFF'}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Recent Signals */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Signals</Text>
        {signals.map((s, i) => (
          <View key={i} style={[styles.signalRow, { borderLeftColor: s.direction === 'LONG' ? COLORS.accent2 : COLORS.accent4 }]}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: s.strategy === 'ORB' ? COLORS.accent : COLORS.accent2 }}>{s.strategy}</Text>
                <View style={[styles.dirBadge, { backgroundColor: s.direction === 'LONG' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)' }]}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: s.direction === 'LONG' ? '#34D399' : '#FCA5A5' }}>{s.direction}</Text>
                </View>
                <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.text }}>{s.index}</Text>
              </View>
              <Text style={{ fontSize: 12, color: COLORS.muted, fontFamily: 'monospace' }}>Entry: {s.entry?.toLocaleString()}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.accent3 }}>{s.confluence}/5</Text>
              <Text style={{ fontSize: 10, color: COLORS.muted }}>{formatTime(s.timestamp)}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 60, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.accent },
  headerSub: { fontSize: 10, color: COLORS.muted, fontFamily: 'monospace', letterSpacing: 1.5, marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100, borderWidth: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  metricsRow: { marginTop: 16, marginBottom: 8 },
  metricCard: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, padding: 16, width: 120 },
  metricLabel: { fontSize: 10, color: COLORS.muted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  metricValue: { fontSize: 18, fontWeight: '700', fontFamily: 'monospace' },
  section: { padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  engineBtn: { borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1 },
  engineBtnText: { fontSize: 16, fontWeight: '700' },
  strategiesRow: { flexDirection: 'row', gap: 10 },
  strategyCard: { flex: 1, backgroundColor: COLORS.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: COLORS.border, borderLeftWidth: 3 },
  strategyName: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  strategyTime: { fontSize: 10, color: COLORS.muted, fontFamily: 'monospace', marginBottom: 8 },
  activeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' },
  signalRow: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, borderLeftWidth: 3, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  dirBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
});
