// ============================================================
// Login Screen
// ============================================================
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useAuthStore } from '../store/authStore';
import { THEME } from '../utils/constants';

export default function LoginScreen() {
  const { signIn, loading, error, clearError } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Error', 'Please enter both email and password.');
      return;
    }
    clearError();
    await signIn(email, password);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.title}>EBaja Expense Tracker</Text>
        <Text style={styles.subtitle}>Sign in to your account</Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor="rgba(255, 255, 255, 0.3)"
          autoCapitalize="none"
          keyboardType="email-address"
          textContentType="emailAddress"
          autoComplete="email"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          placeholderTextColor="rgba(255, 255, 255, 0.3)"
          secureTextEntry
          textContentType="password"
          autoComplete="password"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Signing in…' : 'Sign In'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.hint}>
          No self-registration. Contact your admin to get access.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: THEME.colors.deepBg,
  },
  card: {
    ...THEME.styles.glassCard,
    padding: 24,
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: THEME.colors.textWhite,
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: THEME.colors.textBlueLight,
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.textWhite,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: THEME.colors.glassBorder,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    marginTop: 4,
    color: THEME.colors.textWhite,
  },
  button: {
    backgroundColor: THEME.colors.vibrantGreen,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    ...THEME.styles.electricGlow,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#000000',
    fontWeight: '700',
    fontSize: 16,
  },
  error: {
    color: THEME.colors.textRed,
    fontSize: 13,
    marginTop: 8,
  },
  hint: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    marginTop: 16,
  },
});
