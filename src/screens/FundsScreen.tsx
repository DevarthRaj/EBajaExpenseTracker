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
    if (!form.contributor_name.trim() || !form.amount || !activeBudget) {
      Alert.alert('Error', 'Contributor name and amount are required.');
      return;
    }
    await addFund(activeBudget.id, form);
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
        <Text style={styles.fundAmount}>{formatCurrency(item.amount)}</Text>
        {isAdmin && (
          <TouchableOpacity onPress={() => handleDelete(item)}>
            <Text style={styles.deleteText}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <Text style={styles.empty}>No fund contributions yet.</Text>
        }
        contentContainerStyle={{ paddingBottom: 80 }}
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
            />

            <Text style={styles.label}>Amount (₹) *</Text>
            <TextInput
              style={styles.input}
              value={form.amount}
              onChangeText={(v) => setForm((f) => ({ ...f, amount: v }))}
              keyboardType="numeric"
              placeholder="0.00"
            />

            <Text style={styles.label}>Date</Text>
            <TextInput
              style={styles.input}
              value={form.date}
              onChangeText={(v) => setForm((f) => ({ ...f, date: v }))}
              placeholder="YYYY-MM-DD"
            />

            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, { height: 70 }]}
              value={form.notes}
              onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))}
              placeholder="Optional notes"
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
  container: { flex: 1, backgroundColor: '#fff' },
  header: { padding: 20, backgroundColor: '#f5f5f5', alignItems: 'center' },
  headerLabel: { fontSize: 13, color: '#666' },
  headerAmount: { fontSize: 28, fontWeight: '700', marginTop: 4 },
  fundItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    alignItems: 'flex-start',
  },
  fundLeft: { flex: 1 },
  fundRight: { alignItems: 'flex-end' },
  fundName: { fontSize: 15, fontWeight: '600' },
  fundDate: { fontSize: 12, color: '#888', marginTop: 2 },
  fundNotes: { fontSize: 12, color: '#aaa', marginTop: 4 },
  fundAmount: { fontSize: 16, fontWeight: '700', color: '#2e7d32' },
  deleteText: { color: 'red', fontSize: 12, marginTop: 6 },
  empty: { textAlign: 'center', color: '#aaa', padding: 40 },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#1a73e8',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
  },
  fabText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 24,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', marginTop: 10 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
    fontSize: 14,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
    gap: 16,
    alignItems: 'center',
  },
  cancelText: { color: '#666', fontSize: 15 },
  saveBtn: {
    backgroundColor: '#1a73e8',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  saveBtnText: { color: '#fff', fontWeight: '600' },
});
