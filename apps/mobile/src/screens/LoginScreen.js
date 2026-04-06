import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { COLORS } from '../lib/theme';
import { authAPI } from '../lib/api';
import { useAuth } from '../lib/auth';

export default function LoginScreen() {
  const [email, setEmail] = useState('admin@algotrader.pro');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const { data } = await authAPI.login(email, password);
      await login(data.user, data.token);
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Check your connection.');
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.logo}>AlgoTrader Pro</Text>
        <Text style={styles.subtitle}>Indian equity options trading engine</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="admin@algotrader.pro"
            placeholderTextColor={COLORS.muted}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor={COLORS.muted}
            secureTextEntry
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading} activeOpacity={0.8}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign In</Text>}
        </TouchableOpacity>

        <View style={styles.marketBanner}>
          <View style={[styles.dot, { backgroundColor: COLORS.accent2 }]} />
          <Text style={styles.bannerText}>Market Hours: 9:15 AM – 3:30 PM IST</Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { backgroundColor: COLORS.surface, borderRadius: 24, padding: 36, width: '100%', maxWidth: 400, borderWidth: 1, borderColor: COLORS.border },
  logo: { fontSize: 28, fontWeight: '800', color: COLORS.accent, textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 14, color: COLORS.muted, textAlign: 'center', marginBottom: 32 },
  field: { marginBottom: 16 },
  label: { fontSize: 12, color: COLORS.muted, fontWeight: '600', marginBottom: 6 },
  input: { backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 14, color: COLORS.text, fontSize: 14 },
  error: { backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', borderRadius: 8, padding: 12, color: '#FCA5A5', fontSize: 13, marginBottom: 16 },
  button: { backgroundColor: COLORS.accent, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  marketBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 24, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: COLORS.border },
  dot: { width: 8, height: 8, borderRadius: 4 },
  bannerText: { fontSize: 12, color: COLORS.muted, fontFamily: 'monospace' },
});
