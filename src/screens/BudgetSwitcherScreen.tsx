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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <Text style={styles.empty}>No budgets yet. Create one below.</Text>
        }
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
            />

            <Text style={styles.label}>Year</Text>
            <TextInput
              style={styles.input}
              value={budgetYear}
              onChangeText={setBudgetYear}
              keyboardType="numeric"
              placeholder="2026"
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
  container: { flex: 1, backgroundColor: '#fff' },
  userHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', backgroundColor: '#f9f9f9' },
  userName: { fontSize: 15, fontWeight: '700' },
  userRole: { fontSize: 12, color: '#888', marginTop: 2 },
  signOutText: { color: 'red', fontSize: 14, fontWeight: '600' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#666', padding: 16, paddingBottom: 8 },
  budgetRow: { flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', alignItems: 'center' },
  budgetRowActive: { backgroundColor: '#e8f0fe' },
  budgetInfo: { flex: 1 },
  budgetName: { fontSize: 15, fontWeight: '600' },
  budgetNameActive: { color: '#1a73e8' },
  budgetMeta: { fontSize: 12, color: '#888', marginTop: 2 },
  budgetActions: { alignItems: 'flex-end', gap: 6 },
  activeBadge: { backgroundColor: '#1a73e8', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 10 },
  activeBadgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  archiveText: { color: '#e65100', fontSize: 13 },
  empty: { color: '#aaa', textAlign: 'center', padding: 40 },
  fab: { position: 'absolute', bottom: 24, right: 24, backgroundColor: '#1a73e8', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 30 },
  fabText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', marginTop: 10 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginTop: 4, fontSize: 14 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20, gap: 16, alignItems: 'center' },
  cancelText: { color: '#666', fontSize: 15 },
  saveBtn: { backgroundColor: '#1a73e8', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  saveBtnText: { color: '#fff', fontWeight: '600' },
});
