// ============================================================
// Main Bottom Tab Navigator
// ============================================================
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, TouchableOpacity, View } from 'react-native';
import { useAuthStore } from '../store/authStore';
import SummaryScreen from '../screens/SummaryScreen';
import FundsScreen from '../screens/FundsScreen';
import AddExpenseScreen from '../screens/AddExpenseScreen';
import LogStack from './LogStack';
import PendingScreen from '../screens/PendingScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import HistoryScreen from '../screens/HistoryScreen';
import BudgetSwitcherScreen from '../screens/BudgetSwitcherScreen';
import { useBudgetStore } from '../store/budgetStore';

export type MainTabParamList = {
  Summary: undefined;
  Funds: undefined;
  AddExpense: undefined;
  Log: undefined;
  Pending: undefined;
  Analytics: undefined;
  History: undefined;
  Budgets: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabs() {
  const { role } = useAuthStore();
  const { activeBudget } = useBudgetStore();
  const isAdmin = role === 'admin';

  return (
    <Tab.Navigator
      screenOptions={({ navigation }) => ({
        tabBarLabelStyle: { fontSize: 11 },
        headerRight: () => (
          <TouchableOpacity
            onPress={() => navigation.navigate('Budgets')}
            style={{ marginRight: 16 }}
          >
            <Text style={{ fontSize: 12 }} numberOfLines={1}>
              {activeBudget?.name ?? 'No Budget'}
            </Text>
          </TouchableOpacity>
        ),
      })}
    >
      <Tab.Screen
        name="Summary"
        component={SummaryScreen}
        options={{ title: 'Summary' }}
      />
      <Tab.Screen
        name="Funds"
        component={FundsScreen}
        options={{ title: 'Funds' }}
      />
      {isAdmin && (
        <Tab.Screen
          name="AddExpense"
          component={AddExpenseScreen}
          options={{ title: 'Add Expense' }}
        />
      )}
      <Tab.Screen
        name="Log"
        component={LogStack}
        options={{ title: 'Log', headerShown: false }}
      />
      <Tab.Screen
        name="Pending"
        component={PendingScreen}
        options={{ title: 'Pending' }}
      />
      <Tab.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{ title: 'Analytics' }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{ title: 'History' }}
      />
      <Tab.Screen
        name="Budgets"
        component={BudgetSwitcherScreen}
        options={{ title: 'Budgets' }}
      />
    </Tab.Navigator>
  );
}
