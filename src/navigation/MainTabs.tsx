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
import { THEME } from '../utils/constants';

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
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        tabBarActiveTintColor: THEME.colors.vibrantGreen,
        tabBarInactiveTintColor: THEME.colors.textMuted,
        tabBarStyle: {
          backgroundColor: THEME.colors.deepBg,
          borderTopWidth: 1,
          borderTopColor: THEME.colors.glassBorder,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
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
        headerRight: () => (
          <TouchableOpacity
            onPress={() => navigation.navigate('Budgets')}
            style={{
              marginRight: 16,
              backgroundColor: THEME.colors.glassBg,
              paddingVertical: 4,
              paddingHorizontal: 12,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: THEME.colors.glassBorder,
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.colors.vibrantGreen }} numberOfLines={1}>
              ⚡ {activeBudget?.name ?? 'No Budget'}
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
          options={{ title: 'Add' }}
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
