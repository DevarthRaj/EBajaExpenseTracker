// ============================================================
// Expense History Screen — Shows audit trail of edits
// ============================================================
import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useExpenseStore } from '../store/expenseStore';
import { ExpenseEdit } from '../lib/supabaseTypes';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { LogStackParamList } from '../navigation/LogStack';
import { THEME } from '../utils/constants';

type HistoryRouteProp = RouteProp<LogStackParamList, 'ExpenseHistory'>;

export default function ExpenseHistoryScreen() {
  const route = useRoute<HistoryRouteProp>();
  const { expenseId, description } = route.params;
  const { getExpenseEdits } = useExpenseStore();
  const [edits, setEdits] = useState<ExpenseEdit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const data = await getExpenseEdits(expenseId);
      setEdits(data);
      setLoading(false);
    })();
  }, [expenseId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={THEME.colors.vibrantGreen} />
      </View>
    );
  }

  const renderEdit = ({ item, index }: { item: ExpenseEdit; index: number }) => {
    const prev = item.previous_data;
    return (
      <View style={styles.editCard}>
        <View style={styles.editHeader}>
          <Text style={styles.editLabel}>Edit #{edits.length - index}</Text>
          <Text style={styles.editTime}>{formatDateTime(item.edited_at)}</Text>
        </View>
        <Text style={styles.editSubtitle}>Previous values:</Text>
        <Row label="Amount" value={formatCurrency(prev.amount)} />
        <Row label="Description" value={prev.description} />
        <Row label="Department" value={prev.department} />
        <Row label="Category" value={prev.category} />
        <Row label="Payment Mode" value={prev.payment_mode} />
        <Row label="Paid By" value={prev.paid_by} />
        <Row label="Date" value={prev.date} />
        {prev.notes ? <Row label="Notes" value={prev.notes} /> : null}
        <Row
          label="Reimbursement"
          value={
            prev.is_reimbursed
              ? 'Reimbursed'
              : prev.is_reimbursement_pending
              ? 'Pending'
              : 'N/A'
          }
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{description}</Text>
        <Text style={styles.subtitle}>{edits.length} edit(s) recorded</Text>
      </View>

      {edits.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No edits have been made to this expense.</Text>
        </View>
      ) : (
        <FlatList
          data={edits}
          keyExtractor={(e) => e.id}
          renderItem={renderEdit}
          contentContainerStyle={{ padding: 16, gap: 12 }}
        />
      )}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}:</Text>
      <Text style={styles.rowValue}>{value}</Text>
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
    padding: 24,
    backgroundColor: THEME.colors.deepBg,
  },
  header: {
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.glassBorder,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.textWhite,
  },
  subtitle: {
    fontSize: 13,
    color: THEME.colors.textBlueLight,
    marginTop: 4,
  },
  editCard: {
    ...THEME.styles.glassCard,
  },
  editHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  editLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.vibrantGreen,
  },
  editTime: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  editSubtitle: {
    fontSize: 12,
    color: THEME.colors.textBlueLight,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  rowLabel: {
    width: 110,
    fontSize: 12,
    color: THEME.colors.textMuted,
  },
  rowValue: {
    flex: 1,
    fontSize: 12,
    color: THEME.colors.textWhite,
  },
  emptyText: {
    color: THEME.colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
});
