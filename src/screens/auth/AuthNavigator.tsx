import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../../theme/colors';
import { SignInScreen } from './SignInScreen';
import { SignUpScreen } from './SignUpScreen';
import { LegalPoliciesScreen } from '../LegalPoliciesScreen';
import type { AuthStackParamList } from './authTypes';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const AuthNavigator: React.FC = () => (
  <Stack.Navigator
    initialRouteName="SignIn"
    screenOptions={{
      headerShown: false,
      animation: 'slide_from_right',
      animationDuration: 280,
      contentStyle: { backgroundColor: colors.background },
    }}
  >
    <Stack.Screen name="SignIn" component={SignInScreen} />
    <Stack.Screen name="SignUp" component={SignUpScreen} />
    <Stack.Screen name="LegalPolicies" component={LegalPoliciesScreen} />
  </Stack.Navigator>
);
