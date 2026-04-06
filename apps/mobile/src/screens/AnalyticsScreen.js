import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { COLORS } from '../lib/theme';
import { tradesAPI } from '../lib/api';

const DEMO = {
  total_trades: 47, win_rate: 63.8, profit_factor: 2.14, max_drawdown: 4.2, best_day: 12500, total_pnl: 38750,
  win_rate_by_strategy: [
    { strategy: 'ORB', win_rate: 68, trades: 25, pnl: 28500 },
    { strategy: 'VWAP', win_rate: 58, trades: 22, pnl: 10250 },
  ],
};

export default function AnalyticsScreen() {
  const [data, setData] = useState(DEMO);

  useEffect(() => {
    (async () => { try { const { data: res } = await tradesAPI.getAnalytics(); if (res.total_trades > 0) setData(res); } catch {} })();
  }, []);

  const metrics = [
    { label: 'Total Trades', value: data.total_trades, color: COLORS.text },
    { label: 'Win Rate', value: `${data.win_rate}%`, color: '#34D399' },
    { label: 'Profit Factor', value: data.profit_factor, color: COLORS.accent },
    { label: 'Max Drawdown', value: `${data.max_drawdown}%`, color: COLORS.accent4 },
    { label: 'Best Day', value: `₹${data.best_day?.toLocaleString()}`, color: COLORS.accent3 },
    { label: 'Total P&L', value: `₹${data.total_pnl?.toLocaleString()}`, color: data.total_pnl >= 0 ? '#10B981' : '#EF4444' },
  ];

  const maxPnl = Math.max(...(data.win_rate_by_strategy || []).map(s => Math.abs(s.pnl)), 1);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      <View style={styles.header}>
        <Text style={styles.title}>Analytics</Text>
      </View>

      {/* Metrics Grid */}
      <View style={styles.metricsGrid}>
        {metrics.map((m, i) => (
          <View key={i} style={styles.metricCard}>
            <Text style={styles.metricLabel}>{m.label}</Text>
            <Text style={[styles.metricValue, { color: m.color }]}>{m.value}</Text>
          </View>
        ))}
      </View>

      {/* Strategy Breakdown */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Strategy Performance</Text>
        {(data.win_rate_by_strategy || []).map((s, i) => (
          <View key={i} style={styles.stratRow}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ fontWeight: '700', color: i === 0 ? COLORS.accent : COLORS.accent2 }}>{s.strategy}</Text>
              <Text style={{ fontFamily: 'monospace', fontWeight: '700', color: s.pnl >= 0 ? '#34D399' : '#EF4444' }}>₹{s.pnl?.toLocaleString()}</Text>
            </View>
            {/* Bar */}
            <View style={styles.barBg}>
              <View style={[styles.barFill, { width: `${(Math.abs(s.pnl) / maxPnl) * 100}%`, backgroundColor: i === 0 ? COLORS.accent : COLORS.accent2 }]} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
              <Text style={{ fontSize: 11, color: COLORS.muted }}>Win Rate: {s.win_rate}%</Text>
              <Text style={{ fontSize: 11, color: COLORS.muted }}>{s.trades} trades</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Summary Card */}
      <View style={[styles.section, { paddingHorizontal: 16 }]}>
        <View style={styles.summaryCard}>
          <Text style={{ fontWeight: '700', fontSize: 15, color: COLORS.accent, marginBottom: 12 }}>Performance Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Avg Win</Text>
            <Text style={[styles.summaryValue, { color: '#34D399' }]}>₹{data.total_trades ? Math.round(data.total_pnl / data.total_trades) : 0}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Trading Days</Text>
            <Text style={styles.summaryValue}>{data.pnl_curve?.length || 13}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Risk-Reward Ratio</Text>
            <Text style={styles.summaryValue}>1:{data.profit_factor}</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingTop: 60, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 8 },
  metricCard: { width: (Dimensions.get('window').width - 40) / 3, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, padding: 14 },
  metricLabel: { fontSize: 9, color: COLORS.muted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  metricValue: { fontSize: 16, fontWeight: '700', fontFamily: 'monospace' },
  section: { padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  stratRow: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, padding: 16, marginBottom: 10 },
  barBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3 },
  barFill: { height: 6, borderRadius: 3 },
  summaryCard: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, padding: 20 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  summaryLabel: { fontSize: 13, color: COLORS.muted },
  summaryValue: { fontSize: 14, fontWeight: '700', fontFamily: 'monospace', color: COLORS.text },
});
