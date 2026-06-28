// ============================================================
// Budget Switcher Screen
// ============================================================
import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Modal, TextInput, Alert, RefreshControl,
} from 'react-native';
import { useBudgetStore } from '../store/budgetStore';
import { useAuthStore } from '../store/authStore';
import { Budget } from '../lib/supabaseTypes';
import { formatDate } from '../utils/formatters';
import { THEME } from '../utils/constants';

export default function BudgetSwitcherScreen() {
  const { budgets, activeBudget, fetchBudgets, setActiveBudget, createBudget, archiveBudget } = useBudgetStore();
  const { role, user, signOut } = useAuthStore();
  const isAdmin = role === 'admin';

  const [newBudgetModal, setNewBudgetModal] = useState(false);
  const [budgetName, setBudgetName] = useState('');
  const [budgetYear, setBudgetYear] = useState(String(new Date().getFullYear()));
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchBudgets();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBudgets();
    setRefreshing(false);
  };

  const handleCreate = async () => {
    if (!budgetName.trim()) {
      Alert.alert('Error', 'Enter a budget name.');
      return;
    }
    await createBudget(budgetName.trim(), budgetYear.trim());
    setNewBudgetModal(false);
    setBudgetName('');
  };

  const handleArchive = (budget: Budget) => {
    Alert.alert('Archive Budget', `Archive "${budget.name}"? It will be moved to History.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Archive', style: 'destructive', onPress: () => archiveBudget(budget.id) },
    ]);
  };

  const activeBudgets = budgets.filter((b) => !b.is_archived);

  const renderBudget = ({ item }: { item: Budget }) => {
    const isActive = activeBudget?.id === item.id;
    return (
      <TouchableOpacity
        style={[styles.budgetRow, isActive && styles.budgetRowActive]}
        onPress={() => setActiveBudget(item)}
      >
        <View style={styles.budgetInfo}>
          <Text style={[styles.budgetName, isActive && styles.budgetNameActive]}>
            {item.name}
          </Text>
          {item.year && (
            <Text style={styles.budgetMeta}>Year: {item.year}</Text>
          )}
          <Text style={styles.budgetMeta}>Created: {formatDate(item.created_at)}</Text>
        </View>
        <View style={styles.budgetActions}>
          {isActive && (
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>Active</Text>
            </View>
          )}
          {isAdmin && !isActive && (
            <TouchableOpacity onPress={() => handleArchive(item)}>
              <Text style={styles.archiveText}>Archive</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* User info header */}
      <View style={styles.userHeader}>
        <View>
          <Text style={styles.userName}>{user?.name ?? 'User'}</Text>
          <Text style={styles.userRole}>{role?.toUpperCase()} · {user?.email}</Text>
        </View>
        <TouchableOpacity onPress={signOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Active Budgets</Text>
      <FlatList
        data={activeBudgets}
        keyExtractor={(b) => b.id}
        renderItem={renderBudget}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
        ListEmptyComponent={
          <Text style={styles.empty}>No budgets yet. Create one below.</Text>
        }
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 80 }}
      />

      {/* Create new budget — admin only */}
      {isAdmin && (
        <TouchableOpacity style={styles.fab} onPress={() => setNewBudgetModal(true)}>
          <Text style={styles.fabText}>+ New Budget</Text>
        </TouchableOpacity>
      )}

      {/* New Budget Modal */}
      <Modal visible={newBudgetModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Create New Budget</Text>

            <Text style={styles.label}>Budget Name *</Text>
            <TextInput
              style={styles.input}
              value={budgetName}
              onChangeText={setBudgetName}
              placeholder="e.g. Regionals 2026"
              placeholderTextColor="rgba(255,255,255,0.3)"
            />

            <Text style={styles.label}>Year</Text>
            <TextInput
              style={styles.input}
              value={budgetYear}
              onChangeText={setBudgetYear}
              keyboardType="numeric"
              placeholder="2026"
              placeholderTextColor="rgba(255,255,255,0.3)"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setNewBudgetModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleCreate}>
                <Text style={styles.saveBtnText}>Create</Text>
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
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.glassBorder,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.textWhite,
  },
  userRole: {
    fontSize: 12,
    color: THEME.colors.textBlueLight,
    marginTop: 2,
  },
  signOutText: {
    color: THEME.colors.textRed,
    fontSize: 14,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textWhite,
    padding: 16,
    paddingBottom: 8,
  },
  budgetRow: {
    ...THEME.styles.glassCard,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  budgetRowActive: {
    borderColor: THEME.colors.electricBlue,
    backgroundColor: 'rgba(22, 73, 224, 0.08)',
  },
  budgetInfo: {
    flex: 1,
  },
  budgetName: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.textWhite,
  },
  budgetNameActive: {
    color: '#fff',
  },
  budgetMeta: {
    fontSize: 12,
    color: THEME.colors.textBlueLight,
    marginTop: 4,
  },
  budgetActions: {
    alignItems: 'flex-end',
    gap: 6,
  },
  activeBadge: {
    backgroundColor: THEME.colors.vibrantGreen,
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  activeBadgeText: {
    color: '#000',
    fontSize: 11,
    fontWeight: '700',
  },
  archiveText: {
    color: THEME.colors.textRed,
    fontSize: 13,
    fontWeight: '600',
  },
  empty: {
    color: THEME.colors.textMuted,
    textAlign: 'center',
    padding: 40,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: THEME.colors.vibrantGreen,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    ...THEME.styles.electricGlow,
  },
  fabText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 15,
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
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.colors.textWhite,
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.textWhite,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: THEME.colors.glassBorder,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 10,
    marginTop: 4,
    fontSize: 14,
    color: THEME.colors.textWhite,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
    gap: 16,
    alignItems: 'center',
  },
  cancelText: {
    color: THEME.colors.textMuted,
    fontSize: 15,
  },
  saveBtn: {
    backgroundColor: THEME.colors.vibrantGreen,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  saveBtnText: {
    color: '#000',
    fontWeight: '700',
  },
});
