// ============================================================
// Members Screen (Admin Only)
// Allows creating/inviting new users with roles
// ============================================================
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { DbUser, UserRole } from '../lib/supabaseTypes';
import { THEME } from '../utils/constants';

// Create a secondary client that does NOT persist auth session,
// so when the admin registers a user, it doesn't sign out the admin.
const tempClient = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  }
);

export default function MembersScreen() {
  const [members, setMembers] = useState<DbUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('viewer');
  const [submitting, setSubmitting] = useState(false);

  const fetchMembers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      Alert.alert('Error', error.message);
    } else if (data) {
      setMembers(data as DbUser[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMembers();
    setRefreshing(false);
  };

  const handleAddMember = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters.');
      return;
    }

    setSubmitting(true);

    try {
      // 1. Sign up the user in Supabase Auth via the secondary client
      const { data: authData, error: signUpError } = await tempClient.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signUpError) {
        throw signUpError;
      }

      if (!authData.user) {
        throw new Error('Could not create auth user.');
      }

      // 2. Create the user profile row in public.users
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role: role,
        });

      if (profileError) {
        throw profileError;
      }

      Alert.alert('Success', `Registered ${name} as a ${role}!`);
      setModalVisible(false);
      setName('');
      setEmail('');
      setPassword('');
      setRole('viewer');
      fetchMembers();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderMember = ({ item }: { item: DbUser }) => {
    const isAdmin = item.role === 'admin';
    return (
      <View style={styles.memberCard}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>{item.name}</Text>
          <Text style={styles.memberEmail}>{item.email}</Text>
        </View>
        <View
          style={[
            styles.roleBadge,
            isAdmin ? styles.roleBadgeAdmin : styles.roleBadgeViewer,
          ]}
        >
          <Text style={[styles.roleText, isAdmin && { color: '#000' }]}>
            {item.role.toUpperCase()}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {loading && members.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={THEME.colors.vibrantGreen} />
        </View>
      ) : (
        <FlatList
          data={members}
          keyExtractor={(item) => item.id}
          renderItem={renderMember}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#fff"
            />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>No registered members found.</Text>
          }
        />
      )}

      {/* Add Member FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Add Member Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Team Member</Text>

            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Rahul Sharma"
              placeholderTextColor="rgba(255,255,255,0.3)"
            />

            <Text style={styles.label}>Email Address *</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="teammate@email.com"
              placeholderTextColor="rgba(255,255,255,0.3)"
            />

            <Text style={styles.label}>Password * (Min 6 chars)</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              placeholder="Password for their login"
              placeholderTextColor="rgba(255,255,255,0.3)"
            />

            <Text style={styles.label}>Role *</Text>
            <View style={styles.roleContainer}>
              <TouchableOpacity
                style={[
                  styles.roleOption,
                  role === 'viewer' && styles.roleOptionActive,
                ]}
                onPress={() => setRole('viewer')}
              >
                <Text
                  style={[
                    styles.roleOptionText,
                    role === 'viewer' && styles.roleOptionTextActive,
                  ]}
                >
                  Viewer (Read-Only)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.roleOption,
                  role === 'admin' && styles.roleOptionActive,
                ]}
                onPress={() => setRole('admin')}
              >
                <Text
                  style={[
                    styles.roleOptionText,
                    role === 'admin' && styles.roleOptionTextActive,
                  ]}
                >
                  Admin (Full Access)
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                disabled={submitting}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleAddMember}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Text style={styles.saveBtnText}>Add User</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.deepBg,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  memberCard: {
    ...THEME.styles.glassCard,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    padding: 16,
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    color: THEME.colors.textWhite,
    fontSize: 15,
    fontWeight: '700',
  },
  memberEmail: {
    color: THEME.colors.textBlueLight,
    fontSize: 12,
    marginTop: 2,
  },
  roleBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  roleBadgeAdmin: {
    backgroundColor: THEME.colors.vibrantGreen,
    borderColor: THEME.colors.vibrantGreen,
  },
  roleBadgeViewer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: THEME.colors.glassBorder,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.textWhite,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: THEME.colors.vibrantGreen,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: THEME.colors.vibrantGreen,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  fabText: {
    fontSize: 28,
    fontWeight: '300',
    color: '#000',
  },
  emptyText: {
    textAlign: 'center',
    color: THEME.colors.textMuted,
    marginVertical: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: THEME.colors.deepBg,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1,
    borderColor: THEME.colors.glassBorder,
    padding: 24,
    paddingBottom: 36,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.colors.textWhite,
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    color: THEME.colors.textBlueLight,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: THEME.colors.glassBorder,
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: THEME.colors.textWhite,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
  },
  roleContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  roleOption: {
    flex: 1,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: THEME.colors.glassBorder,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 12,
    alignItems: 'center',
  },
  roleOptionActive: {
    backgroundColor: THEME.colors.vibrantGreen,
    borderColor: THEME.colors.vibrantGreen,
  },
  roleOptionText: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    fontWeight: '600',
  },
  roleOptionTextActive: {
    color: '#000',
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 24,
    gap: 20,
    alignItems: 'center',
  },
  cancelText: {
    color: THEME.colors.textMuted,
    fontSize: 15,
  },
  saveBtn: {
    backgroundColor: THEME.colors.vibrantGreen,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    minWidth: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#000',
    fontWeight: '700',
  },
});
