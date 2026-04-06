import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { COLORS } from '../lib/theme';
import { tradesAPI } from '../lib/api';

const DEMO_TRADES = [
  { _id: '1', strategy: 'ORB', index: 'NIFTY', direction: 'LONG', entry_price: 23185, exit_price: 23388, pnl: 10150, result: 'WIN', mode: 'paper', entry_time: '2026-03-19T09:45:00' },
  { _id: '2', strategy: 'VWAP', index: 'BANKNIFTY', direction: 'SHORT', entry_price: 49520, exit_price: 49700, pnl: -2700, result: 'LOSS', mode: 'paper', entry_time: '2026-03-19T10:15:00' },
  { _id: '3', strategy: 'ORB', index: 'SENSEX', direction: 'LONG', entry_price: 76850, exit_price: 77225, pnl: 3750, result: 'WIN', mode: 'paper', entry_time: '2026-03-18T09:50:00' },
  { _id: '4', strategy: 'VWAP', index: 'NIFTY', direction: 'SHORT', entry_price: 23320, exit_price: 23210, pnl: 5500, result: 'WIN', mode: 'paper', entry_time: '2026-03-17T10:45:00' },
];

export default function TradesScreen() {
  const [trades, setTrades] = useState(DEMO_TRADES);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await tradesAPI.getAll({ limit: 50 });
        if (data.trades?.length) setTrades(data.trades);
      } catch {}
    })();
  }, []);

  const renderTrade = ({ item: t }) => (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: t.strategy === 'ORB' ? COLORS.accent : COLORS.accent2 }}>{t.strategy}</Text>
          <View style={[styles.badge, { backgroundColor: t.direction === 'LONG' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)' }]}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: t.direction === 'LONG' ? '#34D399' : '#FCA5A5' }}>{t.direction}</Text>
          </View>
          <Text style={{ fontWeight: '600', color: COLORS.text }}>{t.index}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: t.result === 'WIN' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)' }]}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: t.result === 'WIN' ? '#34D399' : '#FCA5A5' }}>{t.result}</Text>
        </View>
      </View>

      <View style={[styles.row, { marginTop: 10 }]}>
        <View>
          <Text style={styles.priceLabel}>Entry</Text>
          <Text style={styles.priceValue}>{t.entry_price?.toLocaleString()}</Text>
        </View>
        <View>
          <Text style={styles.priceLabel}>Exit</Text>
          <Text style={styles.priceValue}>{t.exit_price?.toLocaleString() || '—'}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.priceLabel}>P&L</Text>
          <Text style={[styles.priceValue, { color: (t.pnl || 0) >= 0 ? '#34D399' : '#EF4444', fontSize: 16 }]}>
            {(t.pnl || 0) >= 0 ? '+' : ''}₹{(t.pnl || 0).toLocaleString()}
          </Text>
        </View>
      </View>

      <Text style={{ fontSize: 11, color: COLORS.muted, fontFamily: 'monospace', marginTop: 8 }}>
        {new Date(t.entry_time).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
      </Text>
    </View>
  );

  const totalPnl = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const wins = trades.filter(t => t.result === 'WIN').length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Trades</Text>
        <Text style={{ fontSize: 13, color: COLORS.muted }}>{trades.length} trades</Text>
      </View>

      {/* Summary Bar */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total P&L</Text>
          <Text style={[styles.summaryValue, { color: totalPnl >= 0 ? '#34D399' : '#EF4444' }]}>₹{totalPnl.toLocaleString()}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Win Rate</Text>
          <Text style={[styles.summaryValue, { color: COLORS.accent }]}>{trades.length ? Math.round((wins / trades.length) * 100) : 0}%</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Wins/Loss</Text>
          <Text style={styles.summaryValue}>{wins}/{trades.length - wins}</Text>
        </View>
      </View>

      <FlatList
        data={trades}
        renderItem={renderTrade}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 60, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  summaryBar: { flexDirection: 'row', padding: 16, gap: 10 },
  summaryItem: { flex: 1, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 12, alignItems: 'center' },
  summaryLabel: { fontSize: 10, color: COLORS.muted, fontWeight: '600', textTransform: 'uppercase', marginBottom: 4 },
  summaryValue: { fontSize: 16, fontWeight: '700', fontFamily: 'monospace', color: COLORS.text },
  card: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, padding: 16, marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  priceLabel: { fontSize: 10, color: COLORS.muted, fontWeight: '600', marginBottom: 2 },
  priceValue: { fontSize: 14, fontWeight: '700', fontFamily: 'monospace', color: COLORS.text },
});
