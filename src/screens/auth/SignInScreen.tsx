import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { ScreenAnimatedScrollView } from '../../components/ScreenAnimatedScrollView';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../contexts/AuthContext';
import { colors } from '../../theme/colors';
import { layout } from '../../theme/layout';
import { typography } from '../../theme/typography';
import type { AuthStackParamList } from './authTypes';
import { AppButton } from '../../components/ui/AppButton';

type Props = NativeStackScreenProps<AuthStackParamList, 'SignIn'>;

export const SignInScreen: React.FC<Props> = ({ navigation }) => {
  const { signInWithEmail, isConfigured } = useAuth();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  const onSubmit = async () => {
    setFormError(null);
    if (!email.trim() || !password) {
      setFormError('Enter email and password.');
      return;
    }
    if (!isConfigured) {
      setFormError('Supabase is not configured.');
      return;
    }
    setSubmitting(true);
    const { error } = await signInWithEmail(email.trim(), password);
    setSubmitting(false);
    if (error) {
      setFormError(error.message);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
    >
      <ScreenAnimatedScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.eyebrow}>Welcome back</Text>
        <Text style={styles.title}>Sign in</Text>
        <Text style={styles.subtitle}>Use the email and password for your account.</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="you@example.com"
            placeholderTextColor={colors.textSecondary}
            style={styles.input}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor={colors.textSecondary}
            style={styles.input}
          />
        </View>

        {formError ? <Text style={styles.error}>{formError}</Text> : null}

        <AppButton
          label="Sign in"
          onPress={() => void onSubmit()}
          variant="primary"
          size="lg"
          fullWidth
          loading={submitting}
          disabled={submitting}
          style={styles.primaryBtn}
        />

        <TouchableOpacity style={styles.legalRow} onPress={() => navigation.navigate('LegalPolicies')}>
          <Text style={styles.legalMuted}>Privacy Policy & Terms</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate('SignUp')}>
          <Text style={styles.link}>New here? Create an account</Text>
        </TouchableOpacity>
      </ScreenAnimatedScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: layout.screenPadding,
    paddingTop: 72,
    paddingBottom: 32,
  },
  eyebrow: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  title: {
    ...typography.hero,
    color: colors.textPrimary,
    marginTop: 10,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 10,
    marginBottom: 28,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.textPrimary,
    ...typography.body,
  },
  error: {
    ...typography.caption,
    color: colors.warning,
    marginBottom: 12,
  },
  primaryBtn: {
    marginTop: 8,
  },
  legalRow: {
    marginTop: 18,
    alignItems: 'center',
  },
  legalMuted: {
    ...typography.caption,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
  linkRow: {
    marginTop: 14,
    alignItems: 'center',
  },
  link: {
    ...typography.body,
    color: colors.primary,
  },
});
