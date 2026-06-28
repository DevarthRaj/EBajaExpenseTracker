// ============================================================
// Add Expense Screen (also handles Edit mode)
// Admin only
// ============================================================
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
  Image,
  Modal,
  FlatList,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useExpenseStore } from '../store/expenseStore';
import { useBudgetStore } from '../store/budgetStore';
import { useAuthStore } from '../store/authStore';
import {
  DEPARTMENTS,
  CATEGORIES,
  PAYMENT_MODES,
  SPLIT_MODES,
  THEME,
} from '../utils/constants';
import { todayISODate } from '../utils/formatters';
import {
  ExpenseFormData,
  SplitEntry,
  SplitMode,
  PaymentMode,
  Expense,
  Template,
} from '../lib/supabaseTypes';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { LogStackParamList } from '../navigation/LogStack';

type EditExpenseRouteProp = RouteProp<LogStackParamList, 'EditExpense'>;

const defaultForm = (): ExpenseFormData => ({
  amount: '',
  date: todayISODate(),
  paid_by: '',
  description: '',
  department: DEPARTMENTS[0],
  category: CATEGORIES[0],
  payment_mode: 'Cash',
  notes: '',
  bill_uri: null,
  is_reimbursement_pending: false,
  is_split: false,
  split_mode: 'department',
  splits: [],
});

export default function AddExpenseScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<EditExpenseRouteProp>();
  const editExpense: Expense | undefined = (route.params as any)?.expense;
  const isEditMode = !!editExpense;

  const { addExpense, updateExpense, templates, fetchTemplates, saveTemplate, loading } =
    useExpenseStore();
  const { activeBudget } = useBudgetStore();
  const { role } = useAuthStore();

  // Guard: non-admin should never see this screen
  if (role !== 'admin') {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>You do not have permission to add expenses.</Text>
      </View>
    );
  }

  const [form, setForm] = useState<ExpenseFormData>(defaultForm());
  const [billUri, setBillUri] = useState<string | null>(null);
  const [templateModalVisible, setTemplateModalVisible] = useState(false);
  const [saveTemplateModalVisible, setSaveTemplateModalVisible] = useState(false);
  const [templateName, setTemplateName] = useState('');

  // Dropdowns
  const [deptOpen, setDeptOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [modeOpen, setModeOpen] = useState(false);
  const [splitModeOpen, setSplitModeOpen] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  // Pre-fill form when editing
  useEffect(() => {
    if (editExpense) {
      setForm({
        amount: String(editExpense.amount),
        date: editExpense.date,
        paid_by: editExpense.paid_by,
        description: editExpense.description,
        department: editExpense.department,
        category: editExpense.category,
        payment_mode: editExpense.payment_mode as PaymentMode,
        notes: editExpense.notes ?? '',
        bill_uri: editExpense.bill_url,
        is_reimbursement_pending: editExpense.is_reimbursement_pending,
        is_split: editExpense.is_split,
        split_mode: (editExpense.split_mode as SplitMode) ?? 'department',
        splits: [],
      });
      setBillUri(editExpense.bill_url);
    }
  }, [editExpense]);

  const set = (patch: Partial<ExpenseFormData>) =>
    setForm((prev) => ({ ...prev, ...patch }));

  // ── Split helpers ─────────────────────────────────────────

  const initSplits = (mode: SplitMode) => {
    if (mode === 'department') {
      const splits: SplitEntry[] = DEPARTMENTS.map((d) => ({
        key: d,
        label: d,
        amount: '',
      }));
      set({ split_mode: mode, splits });
    } else if (mode === 'equal') {
      set({
        split_mode: mode,
        splits: [{ key: 'equal', label: 'Equal Split', amount: '', people_count: '' }],
      });
    } else {
      set({ split_mode: mode, splits: [] });
    }
  };

  const updateSplitAmount = (idx: number, value: string) => {
    const splits = [...form.splits];
    splits[idx] = { ...splits[idx], amount: value };
    set({ splits });
  };

  const updateSplitPeopleCount = (idx: number, value: string) => {
    const splits = [...form.splits];
    splits[idx] = { ...splits[idx], people_count: value };
    const total = parseFloat(form.amount);
    const n = parseInt(value);
    if (!isNaN(total) && !isNaN(n) && n > 0) {
      splits[idx] = { ...splits[idx], amount: (total / n).toFixed(2) };
    }
    set({ splits });
  };

  const addMemberSplit = () => {
    const splits = [...form.splits];
    splits.push({ key: `member_${Date.now()}`, label: '', amount: '' });
    set({ splits });
  };

  const removeMemberSplit = (idx: number) => {
    const splits = form.splits.filter((_, i) => i !== idx);
    set({ splits });
  };

  // ── Bill picker ───────────────────────────────────────────

  const pickBill = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setBillUri(result.assets[0].uri);
      set({ bill_uri: result.assets[0].uri });
    }
  };

  const takeBillPhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission required', 'Camera access is needed to take a photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      setBillUri(result.assets[0].uri);
      set({ bill_uri: result.assets[0].uri });
    }
  };

  // ── Template load ─────────────────────────────────────────

  const applyTemplate = (template: Template) => {
    const payload = template.payload as Partial<ExpenseFormData>;
    setForm((prev) => ({ ...prev, ...payload }));
    setTemplateModalVisible(false);
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      Alert.alert('Error', 'Enter a template name.');
      return;
    }
    const { bill_uri, ...payload } = form;
    await saveTemplate(templateName, payload);
    setSaveTemplateModalVisible(false);
    setTemplateName('');
    Alert.alert('Saved', 'Template saved!');
  };

  // ── Submit ────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!form.amount || !form.paid_by || !form.description || !activeBudget) {
      Alert.alert('Error', 'Amount, Paid By, and Description are required.');
      return;
    }

    if (isEditMode && editExpense) {
      await updateExpense(editExpense.id, form, billUri);
    } else {
      await addExpense(activeBudget.id, form, billUri);
    }

    if (!loading) {
      if (isEditMode) {
        navigation.goBack();
      } else {
        setForm(defaultForm());
        setBillUri(null);
        Alert.alert('Success', 'Expense saved!');
      }
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      {/* Amount */}
      <Text style={styles.bigLabel}>Amount (₹) *</Text>
      <TextInput
        style={styles.bigInput}
        value={form.amount}
        onChangeText={(v) => set({ amount: v })}
        keyboardType="numeric"
        placeholder="0.00"
        placeholderTextColor="rgba(255,255,255,0.2)"
      />

      {/* Reimbursement toggle */}
      <View style={styles.row}>
        <Text style={styles.label}>Reimbursement Pending</Text>
        <Switch
          value={form.is_reimbursement_pending}
          onValueChange={(v) => set({ is_reimbursement_pending: v })}
          trackColor={{ false: '#767577', true: THEME.colors.electricBlue }}
          thumbColor={form.is_reimbursement_pending ? THEME.colors.vibrantGreen : '#f4f3f4'}
        />
      </View>

      {/* Split toggle */}
      <View style={styles.row}>
        <Text style={styles.label}>Split across departments/members</Text>
        <Switch
          value={form.is_split}
          onValueChange={(v) => {
            set({ is_split: v });
            if (v) initSplits(form.split_mode);
          }}
          trackColor={{ false: '#767577', true: THEME.colors.electricBlue }}
          thumbColor={form.is_split ? THEME.colors.vibrantGreen : '#f4f3f4'}
        />
      </View>

      {/* Split mode selector */}
      {form.is_split && (
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Split Mode</Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setSplitModeOpen(!splitModeOpen)}
          >
            <Text style={{ color: '#fff' }}>
              {SPLIT_MODES.find((m) => m.value === form.split_mode)?.label ?? form.split_mode}
            </Text>
          </TouchableOpacity>
          {splitModeOpen &&
            SPLIT_MODES.map((m) => (
              <TouchableOpacity
                key={m.value}
                style={styles.dropdownItem}
                onPress={() => {
                  initSplits(m.value as SplitMode);
                  setSplitModeOpen(false);
                }}
              >
                <Text style={{ color: '#fff' }}>{m.label}</Text>
              </TouchableOpacity>
            ))}

          {/* Split entries */}
          {form.split_mode === 'department' &&
            form.splits.map((split, idx) => (
              <View key={split.key} style={styles.splitRow}>
                <Text style={styles.splitLabel}>{split.label}</Text>
                <TextInput
                  style={styles.splitInput}
                  value={split.amount}
                  onChangeText={(v) => updateSplitAmount(idx, v)}
                  keyboardType="numeric"
                  placeholder="₹0"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                />
              </View>
            ))}

          {form.split_mode === 'equal' && (
            <View style={styles.splitRow}>
              <Text style={styles.splitLabel}>Number of people</Text>
              <TextInput
                style={styles.splitInput}
                value={form.splits[0]?.people_count ?? ''}
                onChangeText={(v) => updateSplitPeopleCount(0, v)}
                keyboardType="numeric"
                placeholder="e.g. 4"
                placeholderTextColor="rgba(255,255,255,0.3)"
              />
              {form.splits[0]?.amount ? (
                <Text style={styles.splitLabelResult}>
                  = ₹{form.splits[0].amount} each
                </Text>
              ) : null}
            </View>
          )}

          {form.split_mode === 'member' && (
            <>
              {form.splits.map((split, idx) => (
                <View key={split.key} style={styles.splitRow}>
                  <TextInput
                    style={[styles.splitInput, { flex: 2 }]}
                    value={split.label}
                    onChangeText={(v) => {
                      const splits = [...form.splits];
                      splits[idx] = { ...splits[idx], label: v, key: v };
                      set({ splits });
                    }}
                    placeholder="Member name"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                  />
                  <TextInput
                    style={styles.splitInput}
                    value={split.amount}
                    onChangeText={(v) => updateSplitAmount(idx, v)}
                    keyboardType="numeric"
                    placeholder="₹0"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                  />
                  <TouchableOpacity onPress={() => removeMemberSplit(idx)}>
                    <Text style={styles.removeText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity onPress={addMemberSplit} style={styles.addRowBtn}>
                <Text style={styles.addRowText}>+ Add Member</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {/* Date */}
      <Text style={styles.label}>Date *</Text>
      <TextInput
        style={styles.input}
        value={form.date}
        onChangeText={(v) => set({ date: v })}
        placeholder="YYYY-MM-DD"
        placeholderTextColor="rgba(255,255,255,0.3)"
      />

      {/* Paid By */}
      <Text style={styles.label}>Paid By *</Text>
      <TextInput
        style={styles.input}
        value={form.paid_by}
        onChangeText={(v) => set({ paid_by: v })}
        placeholder="Member name"
        placeholderTextColor="rgba(255,255,255,0.3)"
      />

      {/* Description */}
      <Text style={styles.label}>Description *</Text>
      <TextInput
        style={styles.input}
        value={form.description}
        onChangeText={(v) => set({ description: v })}
        placeholder="Brief description"
        placeholderTextColor="rgba(255,255,255,0.3)"
      />

      {/* Department */}
      <Text style={styles.label}>Department</Text>
      <TouchableOpacity
        style={styles.dropdown}
        onPress={() => setDeptOpen(!deptOpen)}
      >
        <Text style={{ color: '#fff' }}>{form.department}</Text>
      </TouchableOpacity>
      {deptOpen &&
        DEPARTMENTS.map((d) => (
          <TouchableOpacity
            key={d}
            style={styles.dropdownItem}
            onPress={() => { set({ department: d }); setDeptOpen(false); }}
          >
            <Text style={{ color: '#fff' }}>{d}</Text>
          </TouchableOpacity>
        ))}

      {/* Category */}
      <Text style={styles.label}>Category</Text>
      <TouchableOpacity
        style={styles.dropdown}
        onPress={() => setCatOpen(!catOpen)}
      >
        <Text style={{ color: '#fff' }}>{form.category}</Text>
      </TouchableOpacity>
      {catOpen &&
        CATEGORIES.map((c) => (
          <TouchableOpacity
            key={c}
            style={styles.dropdownItem}
            onPress={() => { set({ category: c }); setCatOpen(false); }}
          >
            <Text style={{ color: '#fff' }}>{c}</Text>
          </TouchableOpacity>
        ))}

      {/* Payment Mode */}
      <Text style={styles.label}>Payment Mode</Text>
      <TouchableOpacity
        style={styles.dropdown}
        onPress={() => setModeOpen(!modeOpen)}
      >
        <Text style={{ color: '#fff' }}>{form.payment_mode}</Text>
      </TouchableOpacity>
      {modeOpen &&
        PAYMENT_MODES.map((m) => (
          <TouchableOpacity
            key={m}
            style={styles.dropdownItem}
            onPress={() => { set({ payment_mode: m as PaymentMode }); setModeOpen(false); }}
          >
            <Text style={{ color: '#fff' }}>{m}</Text>
          </TouchableOpacity>
        ))}

      {/* Notes */}
      <Text style={styles.label}>Notes</Text>
      <TextInput
        style={[styles.input, { height: 80 }]}
        value={form.notes}
        onChangeText={(v) => set({ notes: v })}
        placeholder="Optional notes"
        placeholderTextColor="rgba(255,255,255,0.3)"
        multiline
      />

      {/* Bill Attachment */}
      <Text style={styles.label}>Bill / Receipt</Text>
      <View style={styles.billRow}>
        <TouchableOpacity style={styles.billBtn} onPress={pickBill}>
          <Text style={{ color: THEME.colors.textBlueLight }}>📁 Choose File</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.billBtn} onPress={takeBillPhoto}>
          <Text style={{ color: THEME.colors.textBlueLight }}>📷 Take Photo</Text>
        </TouchableOpacity>
      </View>
      {billUri ? (
        <Image source={{ uri: billUri }} style={styles.billPreview} resizeMode="cover" />
      ) : null}

      {/* Template buttons */}
      <View style={styles.templateRow}>
        <TouchableOpacity
          style={styles.templateBtn}
          onPress={() => { fetchTemplates(); setTemplateModalVisible(true); }}
        >
          <Text style={styles.templateBtnText}>Use Template</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.templateBtn}
          onPress={() => setSaveTemplateModalVisible(true)}
        >
          <Text style={styles.templateBtnText}>Save as Template</Text>
        </TouchableOpacity>
      </View>

      {/* Submit */}
      <TouchableOpacity
        style={[styles.submitBtn, loading && { opacity: 0.6 }]}
        onPress={handleSubmit}
        disabled={loading}
      >
        <Text style={styles.submitText}>
          {loading ? 'Saving…' : isEditMode ? 'Update Expense' : 'Save Expense'}
        </Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />

      {/* Use Template Modal */}
      <Modal visible={templateModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Choose Template</Text>
            {templates.length === 0 ? (
              <Text style={styles.emptyText}>No templates saved yet.</Text>
            ) : (
              <FlatList
                data={templates}
                keyExtractor={(t) => t.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.templateItem}
                    onPress={() => applyTemplate(item)}
                  >
                    <Text style={styles.templateItemName}>{item.name}</Text>
                  </TouchableOpacity>
                )}
              />
            )}
            <TouchableOpacity onPress={() => setTemplateModalVisible(false)}>
              <Text style={styles.cancelModalText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Save Template Modal */}
      <Modal visible={saveTemplateModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Save Template</Text>
            <TextInput
              style={styles.input}
              value={templateName}
              onChangeText={setTemplateName}
              placeholder="Template name"
              placeholderTextColor="rgba(255,255,255,0.3)"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setSaveTemplateModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveTemplate}>
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.deepBg,
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.colors.deepBg,
  },
  errorText: {
    color: THEME.colors.textMuted,
    fontSize: 15,
  },
  bigLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.textWhite,
    marginTop: 8,
  },
  bigInput: {
    borderWidth: 2,
    borderColor: THEME.colors.glassBorder,
    backgroundColor: 'rgba(255,255,255,0.03)',
    color: '#fff',
    borderRadius: 16,
    padding: 14,
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.textWhite,
    marginTop: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: THEME.colors.glassBorder,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
    fontSize: 14,
    color: THEME.colors.textWhite,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  section: {
    marginTop: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.colors.glassBorder,
    backgroundColor: 'rgba(255,255,255,0.01)',
    borderRadius: 16,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textBlueLight,
    marginBottom: 8,
  },
  dropdown: {
    borderWidth: 1,
    borderColor: THEME.colors.glassBorder,
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    backgroundColor: 'rgba(0, 10, 70, 0.8)',
  },
  splitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  splitLabel: {
    flex: 1,
    fontSize: 13,
    color: THEME.colors.textWhite,
  },
  splitLabelResult: {
    fontSize: 13,
    color: THEME.colors.vibrantGreen,
    fontWeight: '600',
  },
  splitInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: THEME.colors.glassBorder,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    color: '#fff',
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
  },
  removeText: {
    color: THEME.colors.textRed,
    fontSize: 16,
    paddingHorizontal: 4,
  },
  addRowBtn: {
    marginTop: 12,
  },
  addRowText: {
    color: THEME.colors.vibrantGreen,
    fontSize: 13,
    fontWeight: '600',
  },
  billRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  billBtn: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: THEME.colors.glassBorder,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    alignItems: 'center',
  },
  billPreview: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    marginTop: 8,
  },
  templateRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  templateBtn: {
    flex: 1,
    padding: 10,
    borderWidth: 1,
    borderColor: THEME.colors.vibrantGreen,
    borderRadius: 12,
    alignItems: 'center',
  },
  templateBtnText: {
    color: THEME.colors.vibrantGreen,
    fontSize: 13,
    fontWeight: '600',
  },
  submitBtn: {
    backgroundColor: THEME.colors.vibrantGreen,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 24,
    ...THEME.styles.electricGlow,
  },
  submitText: {
    color: '#000000',
    fontWeight: '700',
    fontSize: 16,
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
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.colors.textWhite,
    marginBottom: 12,
  },
  templateItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  templateItemName: {
    fontSize: 15,
    color: '#fff',
  },
  emptyText: {
    color: THEME.colors.textMuted,
    textAlign: 'center',
    padding: 20,
  },
  cancelModalText: {
    color: THEME.colors.textMuted,
    fontSize: 15,
    marginTop: 16,
    textAlign: 'center',
  },
  cancelText: {
    color: THEME.colors.textMuted,
    fontSize: 15,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    gap: 16,
    alignItems: 'center',
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
