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

type Props = NativeStackScreenProps<AuthStackParamList, 'SignUp'>;

export const SignUpScreen: React.FC<Props> = ({ navigation }) => {
  const { signUpWithEmail, isConfigured } = useAuth();
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [infoMessage, setInfoMessage] = React.useState<string | null>(null);

  const onSubmit = async () => {
    setFormError(null);
    setInfoMessage(null);
    if (!firstName.trim() || !lastName.trim()) {
      setFormError('Enter first and last name.');
      return;
    }
    if (!email.trim() || !password) {
      setFormError('Enter email and password.');
      return;
    }
    if (password.length < 6) {
      setFormError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setFormError('Passwords do not match.');
      return;
    }
    if (!isConfigured) {
      setFormError('Supabase is not configured.');
      return;
    }
    setSubmitting(true);
    const { error, needsEmailConfirmation } = await signUpWithEmail(email.trim(), password, {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
    });
    setSubmitting(false);
    if (error) {
      setFormError(error.message);
      return;
    }
    if (needsEmailConfirmation) {
      setInfoMessage('Check your email to confirm your account, then sign in.');
      return;
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
        <Text style={styles.eyebrow}>Get started</Text>
        <Text style={styles.title}>Create account</Text>
        <Text style={styles.subtitle}>A few seconds — then you can finish onboarding in the app.</Text>

        <View style={styles.field}>
          <Text style={styles.label}>First name</Text>
          <TextInput
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize="words"
            autoCorrect={false}
            placeholder="Tanisha"
            placeholderTextColor={colors.textSecondary}
            style={styles.input}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Last name</Text>
          <TextInput
            value={lastName}
            onChangeText={setLastName}
            autoCapitalize="words"
            autoCorrect={false}
            placeholder="Dalwadi"
            placeholderTextColor={colors.textSecondary}
            style={styles.input}
          />
        </View>
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
            placeholder="At least 6 characters"
            placeholderTextColor={colors.textSecondary}
            style={styles.input}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Confirm password</Text>
          <TextInput
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            placeholder="Repeat password"
            placeholderTextColor={colors.textSecondary}
            style={styles.input}
          />
        </View>

        {formError ? <Text style={styles.error}>{formError}</Text> : null}
        {infoMessage ? <Text style={styles.info}>{infoMessage}</Text> : null}

        <AppButton
          label="Create account"
          onPress={() => void onSubmit()}
          variant="primary"
          size="lg"
          fullWidth
          loading={submitting}
          disabled={submitting}
          style={styles.primaryBtn}
        />

        <Text style={styles.legalNote}>
          By creating an account you agree to the{' '}
          <Text style={styles.legalLink} onPress={() => navigation.navigate('LegalPolicies')}>
            Privacy Policy & Terms
          </Text>
          .
        </Text>

        <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate('SignIn')}>
          <Text style={styles.link}>Already have an account? Sign in</Text>
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
  info: {
    ...typography.caption,
    color: colors.success,
    marginBottom: 12,
  },
  primaryBtn: {
    marginTop: 8,
  },
  legalNote: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 20,
  },
  legalLink: {
    color: colors.primary,
    fontWeight: '600',
  },
  linkRow: {
    marginTop: 22,
    alignItems: 'center',
  },
  link: {
    ...typography.body,
    color: colors.primary,
  },
});
