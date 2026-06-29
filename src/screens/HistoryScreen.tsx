// ============================================================
// History Screen — Member Ledger (Contributed vs Spent)
// ============================================================
import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { useBudgetStore } from '../store/budgetStore';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { THEME } from '../utils/constants';
import { formatCurrency } from '../utils/formatters';
import { DbUser, Budget } from '../lib/supabaseTypes';

interface LedgerItem {
  id: string;
  name: string;
  email: string;
  contributed: number;
  spent: number;
  balance: number;
}

export default function HistoryScreen() {
  const { budgets, activeBudget, fetchBudgets } = useBudgetStore();
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [users, setUsers] = useState<DbUser[]>([]);
  const [contributions, setContributions] = useState<Record<string, number>>({});
  const [spendings, setSpendings] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [budgetSelectorOpen, setBudgetSelectorOpen] = useState(false);

  useEffect(() => {
    fetchBudgets();
    fetchUsers();
  }, []);

  // Sync selected budget with active budget if not set
  useEffect(() => {
    if (activeBudget && !selectedBudget) {
      setSelectedBudget(activeBudget);
    }
  }, [activeBudget]);

  // Load ledger data whenever selected budget changes
  useEffect(() => {
    if (selectedBudget) {
      loadLedgerData(selectedBudget.id);
    }
  }, [selectedBudget?.id]);

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .order('name', { ascending: true });
    if (data) {
      setUsers(data as DbUser[]);
    }
  };

  const loadLedgerData = async (budgetId: string) => {
    setLoading(true);
    const [{ data: fundsData }, { data: expensesData }] = await Promise.all([
      supabase.from('funds').select('contributor_name, amount').eq('budget_id', budgetId),
      supabase.from('expenses').select('paid_by, amount').eq('budget_id', budgetId),
    ]);

    // Aggregate contributions (key is lowercased name for fuzzy matching)
    const contribs: Record<string, number> = {};
    if (fundsData) {
      fundsData.forEach((f) => {
        const key = f.contributor_name.toLowerCase().trim();
        contribs[key] = (contribs[key] ?? 0) + parseFloat(f.amount);
      });
    }

    // Aggregate spendings (key is lowercased paid_by name)
    const spends: Record<string, number> = {};
    if (expensesData) {
      expensesData.forEach((e) => {
        const key = e.paid_by.toLowerCase().trim();
        spends[key] = (spends[key] ?? 0) + parseFloat(e.amount);
      });
    }

    setContributions(contribs);
    setSpendings(spends);
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchBudgets(), fetchUsers()]);
    if (selectedBudget) {
      await loadLedgerData(selectedBudget.id);
    }
    setRefreshing(false);
  };

  const ledgerData = useMemo<LedgerItem[]>(() => {
    return users.map((u) => {
      const key = u.name.toLowerCase().trim();
      const contributed = contributions[key] ?? 0;
      const spent = spendings[key] ?? 0;
      const balance = contributed - spent;
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        contributed,
        spent,
        balance,
      };
    });
  }, [users, contributions, spendings]);

  const renderLedgerItem = ({ item }: { item: LedgerItem }) => {
    const isPositive = item.balance >= 0;
    return (
      <View style={styles.ledgerCard}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.memberName}>{item.name}</Text>
            <Text style={styles.memberEmail}>{item.email}</Text>
          </View>
          <View style={styles.balanceContainer}>
            <Text style={styles.balanceLabel}>Net Balance</Text>
            <Text
              style={[
                styles.balanceValue,
                { color: isPositive ? THEME.colors.vibrantGreen : THEME.colors.textRed },
              ]}
            >
              {isPositive ? '+' : ''}{formatCurrency(item.balance)}
            </Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total Contributed</Text>
            <Text style={styles.contribValue}>{formatCurrency(item.contributed)}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total Spent (Paid)</Text>
            <Text style={styles.spentValue}>{formatCurrency(item.spent)}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Budget Selector Dropdown */}
      <View style={styles.selectorContainer}>
        <Text style={styles.selectorLabel}>Viewing Ledger For:</Text>
        <TouchableOpacity
          style={styles.dropdownTrigger}
          onPress={() => setBudgetSelectorOpen(!budgetSelectorOpen)}
        >
          <Text style={styles.dropdownTriggerText}>
            ⚡ {selectedBudget?.name ?? 'Select Budget'}
          </Text>
          <Text style={styles.dropdownArrow}>▼</Text>
        </TouchableOpacity>

        {budgetSelectorOpen && (
          <View style={styles.dropdownList}>
            {budgets.map((b) => (
              <TouchableOpacity
                key={b.id}
                style={[
                  styles.dropdownItem,
                  b.id === selectedBudget?.id && styles.dropdownItemActive,
                ]}
                onPress={() => {
                  setSelectedBudget(b);
                  setBudgetSelectorOpen(false);
                }}
              >
                <Text style={styles.dropdownItemText}>{b.name}</Text>
                {b.is_archived && <Text style={styles.archiveTag}>Archived</Text>}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {loading && ledgerData.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={THEME.colors.vibrantGreen} />
        </View>
      ) : (
        <FlatList
          data={ledgerData}
          keyExtractor={(item) => item.id}
          renderItem={renderLedgerItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#fff"
            />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>No members or budget data loaded.</Text>
          }
        />
      )}
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
    paddingTop: 8,
    paddingBottom: 80,
  },
  selectorContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.glassBorder,
    zIndex: 100,
  },
  selectorLabel: {
    color: THEME.colors.textBlueLight,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...THEME.styles.glassCard,
    padding: 12,
    borderRadius: 12,
  },
  dropdownTriggerText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  dropdownArrow: {
    color: THEME.colors.vibrantGreen,
    fontSize: 12,
  },
  dropdownList: {
    borderWidth: 1,
    borderColor: THEME.colors.glassBorder,
    borderRadius: 12,
    marginTop: 6,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 10, 70, 0.95)',
    position: 'absolute',
    top: 65,
    left: 16,
    right: 16,
    zIndex: 101,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  dropdownItemActive: {
    backgroundColor: 'rgba(22, 224, 76, 0.08)',
  },
  dropdownItemText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  archiveTag: {
    color: '#FFB74D',
    fontSize: 9,
    fontWeight: '700',
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 152, 0, 0.2)',
  },
  ledgerCard: {
    ...THEME.styles.glassCard,
    marginBottom: 12,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    paddingBottom: 12,
  },
  memberName: {
    color: THEME.colors.textWhite,
    fontSize: 16,
    fontWeight: '700',
  },
  memberEmail: {
    color: THEME.colors.textBlueLight,
    fontSize: 11,
    marginTop: 2,
  },
  balanceContainer: {
    alignItems: 'flex-end',
  },
  balanceLabel: {
    color: THEME.colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },
  balanceValue: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: THEME.colors.glassBorder,
    borderRadius: 12,
    padding: 10,
  },
  statLabel: {
    color: THEME.colors.textBlueLight,
    fontSize: 10,
    fontWeight: '600',
  },
  contribValue: {
    color: THEME.colors.vibrantGreen,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  spentValue: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  emptyText: {
    textAlign: 'center',
    color: THEME.colors.textMuted,
    marginVertical: 40,
  },
});
