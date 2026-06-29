// ============================================================
// Manage Categories & Departments Screen (Admin Only)
// Configures dynamic lists of categories and departments
// ============================================================
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useExpenseStore } from '../store/expenseStore';
import { THEME } from '../utils/constants';

export default function ManageCategoriesDeptsScreen() {
  const {
    departments,
    categories,
    fetchConfig,
    addDepartment,
    deleteDepartment,
    addCategory,
    deleteCategory,
    loading,
  } = useExpenseStore();

  const [newDept, setNewDept] = useState('');
  const [newCat, setNewCat] = useState('');
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    const loadConfig = async () => {
      setFetching(true);
      await fetchConfig();
      setFetching(false);
    };
    loadConfig();
  }, []);

  const handleAddDept = async () => {
    if (!newDept.trim()) return;
    await addDepartment(newDept.trim());
    setNewDept('');
  };

  const handleAddCat = async () => {
    if (!newCat.trim()) return;
    await addCategory(newCat.trim());
    setNewCat('');
  };

  const handleDeleteDept = (name: string) => {
    Alert.alert('Delete Department', `Are you sure you want to delete the "${name}" department?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteDepartment(name) },
    ]);
  };

  const handleDeleteCat = (name: string) => {
    Alert.alert('Delete Category', `Are you sure you want to delete the "${name}" category?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteCategory(name) },
    ]);
  };

  if (fetching) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={THEME.colors.vibrantGreen} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* DEPARTMENTS CARD */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Manage Departments</Text>
          
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={newDept}
              onChangeText={setNewDept}
              placeholder="Add new department..."
              placeholderTextColor="rgba(255,255,255,0.3)"
            />
            <TouchableOpacity style={styles.addBtn} onPress={handleAddDept}>
              <Text style={styles.addBtnText}>Add</Text>
            </TouchableOpacity>
          </View>

          {departments.map((dept) => (
            <View key={dept} style={styles.listItem}>
              <Text style={styles.itemText}>{dept}</Text>
              <TouchableOpacity onPress={() => handleDeleteDept(dept)}>
                <Text style={styles.deleteBtn}>❌</Text>
              </TouchableOpacity>
            </View>
          ))}
          {departments.length === 0 && (
            <Text style={styles.emptyText}>No departments configured.</Text>
          )}
        </View>

        {/* CATEGORIES CARD */}
        <View style={[styles.sectionCard, { marginTop: 20 }]}>
          <Text style={styles.sectionTitle}>Manage Categories</Text>
          
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={newCat}
              onChangeText={setNewCat}
              placeholder="Add new category..."
              placeholderTextColor="rgba(255,255,255,0.3)"
            />
            <TouchableOpacity style={styles.addBtn} onPress={handleAddCat}>
              <Text style={styles.addBtnText}>Add</Text>
            </TouchableOpacity>
          </View>

          {categories.map((cat) => (
            <View key={cat} style={styles.listItem}>
              <Text style={styles.itemText}>{cat}</Text>
              <TouchableOpacity onPress={() => handleDeleteCat(cat)}>
                <Text style={styles.deleteBtn}>❌</Text>
              </TouchableOpacity>
            </View>
          ))}
          {categories.length === 0 && (
            <Text style={styles.emptyText}>No categories configured.</Text>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
    backgroundColor: THEME.colors.deepBg,
  },
  sectionCard: {
    ...THEME.styles.glassCard,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.textWhite,
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: THEME.colors.glassBorder,
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  addBtn: {
    backgroundColor: THEME.colors.vibrantGreen,
    borderRadius: 12,
    paddingHorizontal: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 14,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  itemText: {
    color: THEME.colors.textWhite,
    fontSize: 14,
  },
  deleteBtn: {
    fontSize: 14,
    padding: 4,
  },
  emptyText: {
    color: THEME.colors.textMuted,
    textAlign: 'center',
    marginTop: 10,
    fontSize: 13,
  },
});
