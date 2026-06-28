// ============================================================
// Log Stack — nested stack inside Log tab
// Allows navigating to AddExpense (edit mode) from a log item
// ============================================================
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import LogScreen from '../screens/LogScreen';
import AddExpenseScreen from '../screens/AddExpenseScreen';
import { Expense } from '../lib/supabaseTypes';

import { THEME } from '../utils/constants';

export type LogStackParamList = {
  LogMain: undefined;
  EditExpense: { expense: Expense };
  ExpenseHistory: { expenseId: string; description: string };
};

const Stack = createStackNavigator<LogStackParamList>();

export default function LogStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: THEME.colors.deepBg,
          shadowOpacity: 0,
          elevation: 0,
          borderBottomWidth: 1,
          borderBottomColor: THEME.colors.glassBorder,
        },
        headerTintColor: THEME.colors.textWhite,
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 16,
        },
      }}
    >
      <Stack.Screen
        name="LogMain"
        component={LogScreen}
        options={{ title: 'Expense Log' }}
      />
      <Stack.Screen
        name="EditExpense"
        component={AddExpenseScreen}
        options={{ title: 'Edit Expense' }}
      />
      <Stack.Screen
        name="ExpenseHistory"
        component={require('../screens/ExpenseHistoryScreen').default}
        options={({ route }) => ({
          title: `Edit History`,
        })}
      />
    </Stack.Navigator>
  );
}
