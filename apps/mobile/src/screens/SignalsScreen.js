import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../lib/theme';
import { signalsAPI } from '../lib/api';

const FILTERS = ['All', 'ORB', 'VWAP', 'NIFTY', 'BANKNIFTY', 'SENSEX', 'LONG', 'SHORT'];

const DEMO_SIGNALS = [
  { _id: '1', strategy: 'ORB', index: 'NIFTY', direction: 'LONG', entry: 23185, sl: 23050, t1: 23388, t2: 23522, confluence: 5, option_symbol: 'NIFTY20MAR2623200CE', mode: 'paper', timestamp: '2026-03-19T09:45:00' },
  { _id: '2', strategy: 'VWAP', index: 'BANKNIFTY', direction: 'SHORT', entry: 49520, sl: 49700, t1: 49250, t2: 49060, confluence: 4, option_symbol: 'BANKNIFTY20MAR2649500PE', mode: 'paper', timestamp: '2026-03-19T10:15:00' },
  { _id: '3', strategy: 'ORB', index: 'SENSEX', direction: 'LONG', entry: 76850, sl: 76600, t1: 77225, t2: 77475, confluence: 5, option_symbol: 'SENSEX20MAR2676900CE', mode: 'paper', timestamp: '2026-03-19T09:50:00' },
  { _id: '4', strategy: 'VWAP', index: 'NIFTY', direction: 'LONG', entry: 23210, sl: 23120, t1: 23345, t2: 23435, confluence: 3, option_symbol: 'NIFTY20MAR2623200CE', mode: 'paper', timestamp: '2026-03-18T10:30:00' },
];

export default function SignalsScreen() {
  const [signals, setSignals] = useState(DEMO_SIGNALS);
  const [activeFilter, setActiveFilter] = useState('All');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await signalsAPI.getAll({ limit: 50 });
        if (data.signals?.length) setSignals(data.signals);
      } catch {}
    })();
  }, []);

  const filtered = activeFilter === 'All' ? signals : signals.filter(s =>
    s.strategy === activeFilter || s.index === activeFilter || s.direction === activeFilter
  );

  const stars = (count) => '★'.repeat(count) + '☆'.repeat(5 - count);

  const renderSignal = ({ item: s }) => (
    <View style={[styles.card, { borderLeftColor: s.direction === 'LONG' ? COLORS.accent2 : COLORS.accent4 }]}>
      <View style={styles.cardHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={[styles.badge, { backgroundColor: s.strategy === 'ORB' ? COLORS.accent + '22' : COLORS.accent2 + '22' }]}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: s.strategy === 'ORB' ? COLORS.accent : COLORS.accent2 }}>{s.strategy}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: s.direction === 'LONG' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)' }]}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: s.direction === 'LONG' ? '#34D399' : '#FCA5A5' }}>{s.direction}</Text>
          </View>
          <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.text }}>{s.index}</Text>
        </View>
        <Text style={{ fontSize: 14, color: COLORS.accent3 }}>{stars(s.confluence)}</Text>
      </View>

      <Text style={styles.time}>{new Date(s.timestamp).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}    {new Date(s.timestamp).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>

      <View style={styles.priceRow}>
        <View style={styles.priceCol}>
          <Text style={styles.priceLabel}>Entry</Text>
          <Text style={styles.priceValue}>{s.entry?.toLocaleString()}</Text>
        </View>
        <View style={styles.priceCol}>
          <Text style={styles.priceLabel}>SL</Text>
          <Text style={[styles.priceValue, { color: COLORS.accent4 }]}>{s.sl?.toLocaleString()}</Text>
        </View>
        <View style={styles.priceCol}>
          <Text style={styles.priceLabel}>T1</Text>
          <Text style={[styles.priceValue, { color: COLORS.accent2 }]}>{s.t1?.toLocaleString()}</Text>
        </View>
        <View style={styles.priceCol}>
          <Text style={styles.priceLabel}>T2</Text>
          <Text style={[styles.priceValue, { color: '#10B981' }]}>{s.t2?.toLocaleString()}</Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
        <Text style={{ fontSize: 11, color: COLORS.muted, fontFamily: 'monospace' }}>{s.option_symbol}</Text>
        <View style={[styles.badge, { backgroundColor: 'rgba(245,158,11,0.15)' }]}>
          <Text style={{ fontSize: 9, fontWeight: '700', color: '#FCD34D' }}>{s.mode?.toUpperCase()}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Signals</Text>
      </View>

      {/* Filter Chips */}
      <FlatList
        horizontal
        data={FILTERS}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8, marginBottom: 12 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.chip, activeFilter === item && styles.chipActive]}
            onPress={() => setActiveFilter(item)}
          >
            <Text style={[styles.chipText, activeFilter === item && styles.chipTextActive]}>{item}</Text>
          </TouchableOpacity>
        )}
        keyExtractor={(item) => item}
      />

      {/* Signal List */}
      <FlatList
        data={filtered}
        renderItem={renderSignal}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Text style={{ fontSize: 32, marginBottom: 12 }}>📡</Text>
            <Text style={{ color: COLORS.muted, fontSize: 14, textAlign: 'center' }}>Start the engine to receive signals</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingTop: 60, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  chip: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 100, paddingHorizontal: 14, paddingVertical: 8 },
  chipActive: { backgroundColor: COLORS.accent + '22', borderColor: COLORS.accent + '55' },
  chipText: { fontSize: 12, fontWeight: '600', color: COLORS.muted },
  chipTextActive: { color: COLORS.accent },
  card: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, borderLeftWidth: 3, padding: 16, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  time: { fontSize: 12, color: COLORS.muted, fontFamily: 'monospace', marginBottom: 12 },
  priceRow: { flexDirection: 'row', gap: 12 },
  priceCol: { flex: 1 },
  priceLabel: { fontSize: 10, color: COLORS.muted, fontWeight: '600', marginBottom: 2 },
  priceValue: { fontSize: 14, fontWeight: '700', fontFamily: 'monospace', color: COLORS.text },
});
