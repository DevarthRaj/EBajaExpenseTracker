// ============================================================
// Funds Screen
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
  RefreshControl,
} from 'react-native';
import { useExpenseStore } from '../store/expenseStore';
import { useBudgetStore } from '../store/budgetStore';
import { useAuthStore } from '../store/authStore';
import { formatCurrency, formatDate, todayISODate } from '../utils/formatters';
import { Fund } from '../lib/supabaseTypes';
import { THEME } from '../utils/constants';

export default function FundsScreen() {
  const { funds, fetchFunds, addFund, deleteFund, loading } = useExpenseStore();
  const { activeBudget } = useBudgetStore();
  const { role } = useAuthStore();
  const isAdmin = role === 'admin';

  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState({
    contributor_name: '',
    amount: '',
    date: todayISODate(),
    notes: '',
  });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (activeBudget) fetchFunds(activeBudget.id);
  }, [activeBudget?.id]);

  const totalCollected = funds.reduce((s, f) => s + f.amount, 0);

  const onRefresh = async () => {
    setRefreshing(true);
    if (activeBudget) await fetchFunds(activeBudget.id);
    setRefreshing(false);
  };

  const handleAdd = async () => {
    if (!activeBudget) {
      Alert.alert('Error', 'No active budget selected. Please select a budget in the Budgets tab.');
      return;
    }
    if (!form.contributor_name.trim()) {
      Alert.alert('Error', 'Contributor name is required.');
      return;
    }
    const amt = parseFloat(form.amount);
    if (!form.amount || isNaN(amt) || amt <= 0) {
      Alert.alert('Error', 'Please enter a valid amount greater than 0.');
      return;
    }
    
    await addFund(activeBudget.id, {
      ...form,
      amount: amt.toString(), // Send cleaned amount string
    });
    setModalVisible(false);
    setForm({ contributor_name: '', amount: '', date: todayISODate(), notes: '' });
  };

  const handleDelete = (fund: Fund) => {
    Alert.alert('Delete Fund', `Delete ${fund.contributor_name}'s contribution of ${formatCurrency(fund.amount)}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteFund(fund.id) },
    ]);
  };

  const renderFund = ({ item }: { item: Fund }) => (
    <View style={styles.fundItem}>
      <View style={styles.fundLeft}>
        <Text style={styles.fundName}>{item.contributor_name}</Text>
        <Text style={styles.fundDate}>{formatDate(item.date)}</Text>
        {item.notes ? <Text style={styles.fundNotes}>{item.notes}</Text> : null}
      </View>
      <View style={styles.fundRight}>
        <Text style={styles.fundAmount}>+{formatCurrency(item.amount)}</Text>
        {isAdmin && (
          <TouchableOpacity onPress={() => handleDelete(item)}>
            <Text style={styles.deleteText}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (!activeBudget) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: THEME.colors.deepBg, padding: 24 }}>
        <Text style={styles.empty}>No budget selected. Go to Budgets tab to create or select one.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Total header */}
      <View style={styles.header}>
        <Text style={styles.headerLabel}>Total Collected</Text>
        <Text style={styles.headerAmount}>{formatCurrency(totalCollected)}</Text>
      </View>

      <FlatList
        data={funds}
        keyExtractor={(f) => f.id}
        renderItem={renderFund}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
        ListEmptyComponent={
          <Text style={styles.empty}>No fund contributions yet.</Text>
        }
        contentContainerStyle={{ paddingBottom: 80, paddingHorizontal: 16, paddingTop: 8 }}
      />

      {/* FAB — admin only */}
      {isAdmin && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.fabText}>+ Add Fund</Text>
        </TouchableOpacity>
      )}

      {/* Add Fund Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Fund Contribution</Text>

            <Text style={styles.label}>Contributor Name *</Text>
            <TextInput
              style={styles.input}
              value={form.contributor_name}
              onChangeText={(v) => setForm((f) => ({ ...f, contributor_name: v }))}
              placeholder="e.g. Rahul Sharma"
              placeholderTextColor="rgba(255,255,255,0.3)"
            />

            <Text style={styles.label}>Amount (₹) *</Text>
            <TextInput
              style={styles.input}
              value={form.amount}
              onChangeText={(v) => setForm((f) => ({ ...f, amount: v }))}
              keyboardType="numeric"
              placeholder="0.00"
              placeholderTextColor="rgba(255,255,255,0.3)"
            />

            <Text style={styles.label}>Date</Text>
            <TextInput
              style={styles.input}
              value={form.date}
              onChangeText={(v) => setForm((f) => ({ ...f, date: v }))}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="rgba(255,255,255,0.3)"
            />

            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, { height: 70 }]}
              value={form.notes}
              onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))}
              placeholder="Optional notes"
              placeholderTextColor="rgba(255,255,255,0.3)"
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, loading && { opacity: 0.6 }]}
                onPress={handleAdd}
                disabled={loading}
              >
                <Text style={styles.saveBtnText}>
                  {loading ? 'Saving…' : 'Save'}
                </Text>
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
  header: {
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.glassBorder,
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLabel: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    fontWeight: '500',
  },
  headerAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: THEME.colors.textWhite,
    marginTop: 4,
    letterSpacing: -0.5,
  },
  fundItem: {
    ...THEME.styles.glassCard,
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  fundLeft: {
    flex: 1,
  },
  fundRight: {
    alignItems: 'flex-end',
  },
  fundName: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.textWhite,
  },
  fundDate: {
    fontSize: 12,
    color: THEME.colors.textBlueLight,
    marginTop: 2,
  },
  fundNotes: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 4,
  },
  fundAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.vibrantGreen,
  },
  deleteText: {
    color: THEME.colors.textRed,
    fontSize: 12,
    marginTop: 6,
    fontWeight: '600',
  },
  empty: {
    textAlign: 'center',
    color: THEME.colors.textMuted,
    padding: 40,
    fontSize: 14,
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
    marginTop: 12,
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
