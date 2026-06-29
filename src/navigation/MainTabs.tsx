// ============================================================
// Main Bottom Tab Navigator
// ============================================================
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { useAuthStore } from '../store/authStore';
import SummaryScreen from '../screens/SummaryScreen';
import FundsScreen from '../screens/FundsScreen';
import AddExpenseScreen from '../screens/AddExpenseScreen';
import LogStack from './LogStack';
import ManageCategoriesDeptsScreen from '../screens/ManageCategoriesDeptsScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import HistoryScreen from '../screens/HistoryScreen';
import BudgetSwitcherScreen from '../screens/BudgetSwitcherScreen';
import MembersScreen from '../screens/MembersScreen';
import { useBudgetStore } from '../store/budgetStore';
import { THEME } from '../utils/constants';

export type MainTabParamList = {
  Summary: undefined;
  Funds: undefined;
  AddExpense: undefined;
  Log: undefined;
  Setup: undefined;
  Analytics: undefined;
  History: undefined;
  Budgets: undefined;
  Members: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabs() {
  const { role } = useAuthStore();
  const { activeBudget } = useBudgetStore();
  const isAdmin = role === 'admin';

  // Order of tabs for cycling navigation
  const tabsList: (keyof MainTabParamList)[] = isAdmin
    ? ['Summary', 'Funds', 'AddExpense', 'Log', 'Analytics', 'History', 'Budgets', 'Members', 'Setup']
    : ['Summary', 'Funds', 'Log', 'Analytics', 'History', 'Budgets'];

  // Map of tab names to emojis
  const tabEmojis: Record<keyof MainTabParamList, string> = {
    Summary: '📊',
    Funds: '🪙',
    AddExpense: '💸',
    Log: '📋',
    Setup: '⚙️',
    Analytics: '📈',
    History: '🗄️',
    Budgets: '⚡',
    Members: '👥',
  };

  const handleCycleNavigation = (navigation: any, currentRouteName: string, direction: 'prev' | 'next') => {
    const currentIndex = tabsList.indexOf(currentRouteName as keyof MainTabParamList);
    if (currentIndex === -1) return;

    let nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex >= tabsList.length) nextIndex = 0;
    if (nextIndex < 0) nextIndex = tabsList.length - 1;

    navigation.navigate(tabsList[nextIndex]);
  };

  return (
    <Tab.Navigator
      screenOptions={({ route, navigation }) => ({
        tabBarLabelStyle: { fontSize: 9, fontWeight: '700', marginTop: 2 },
        tabBarActiveTintColor: THEME.colors.vibrantGreen,
        tabBarInactiveTintColor: THEME.colors.textMuted,
        tabBarStyle: {
          backgroundColor: THEME.colors.deepBg,
          borderTopWidth: 1,
          borderTopColor: THEME.colors.glassBorder,
          height: 65,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarIcon: ({ focused }) => {
          const emoji = tabEmojis[route.name as keyof MainTabParamList];
          return (
            <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.6 }}>
              {emoji}
            </Text>
          );
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
        headerLeft: () => (
          <TouchableOpacity
            onPress={() => handleCycleNavigation(navigation, route.name, 'prev')}
            style={styles.navBtn}
          >
            <Text style={styles.navBtnText}>◀</Text>
          </TouchableOpacity>
        ),
        headerRight: () => (
          <View style={styles.headerRightContainer}>
            <TouchableOpacity
              onPress={() => navigation.navigate('Budgets')}
              style={styles.budgetBadge}
            >
              <Text style={styles.budgetText} numberOfLines={1}>
                ⚡ {activeBudget?.name ?? 'No Budget'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => handleCycleNavigation(navigation, route.name, 'next')}
              style={styles.navBtn}
            >
              <Text style={styles.navBtnText}>▶</Text>
            </TouchableOpacity>
          </View>
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
          options={{ title: 'Expense' }}
        />
      )}
      <Tab.Screen
        name="Log"
        component={LogStack}
        options={{ title: 'Log', headerShown: false }}
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
      {isAdmin && (
        <Tab.Screen
          name="Members"
          component={MembersScreen}
          options={{ title: 'Members' }}
        />
      )}
      {isAdmin && (
        <Tab.Screen
          name="Setup"
          component={ManageCategoriesDeptsScreen}
          options={{ title: 'Setup' }}
        />
      )}
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  navBtn: {
    padding: 10,
    marginHorizontal: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  navBtnText: {
    fontSize: 12,
    color: THEME.colors.vibrantGreen,
  },
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
    gap: 4,
  },
  budgetBadge: {
    backgroundColor: THEME.colors.glassBg,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.colors.glassBorder,
  },
  budgetText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.vibrantGreen,
  },
});
