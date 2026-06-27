import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  Switch,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { layout } from '../theme/layout';
import { typography } from '../theme/typography';
import { tokens } from '../theme/tokens';
import { Chip } from './Chip';
import { useGoalsTransactions } from '../hooks/useGoalsTransactions';
import type { TransactionCategory } from '../types/models';
import { EXPENSE_CATEGORY_OPTIONS } from '../constants/expenseCategories';
import { categoryFromKnownMerchant } from '../lib/merchantCategoryMap';
import { formatCurrency } from '../lib/displayFormat';
import { AppButton } from './ui/AppButton';

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Bottom tab bar height so the sheet clears it. */
  tabBarHeight: number;
  /** Optional: go to full Recent Activity / CSV screen. */
  onOpenActivity?: () => void;
  /** Optional: refresh parent data immediately after a successful add. */
  onSaved?: () => void;
};

const switchTrack = { true: colors.primary, false: colors.muted } as const;

export const AddTransactionSheet: React.FC<Props> = ({
  visible,
  onClose,
  tabBarHeight,
  onOpenActivity,
  onSaved,
}) => {
  const insets = useSafeAreaInsets();
  const { insertTransaction } = useGoalsTransactions();
  const [desc, setDesc] = React.useState('');
  const [amountStr, setAmountStr] = React.useState('');
  const [isIncome, setIsIncome] = React.useState(false);
  const defaultExpenseCategory = EXPENSE_CATEGORY_OPTIONS.find((c) => c.id !== 'other')?.id ?? 'groceries';
  const [expenseCategory, setExpenseCategory] = React.useState<TransactionCategory>(defaultExpenseCategory);
  const [categoryTouched, setCategoryTouched] = React.useState(false);
  const [adding, setAdding] = React.useState(false);
  const [successLine, setSuccessLine] = React.useState<string | null>(null);

  const reset = React.useCallback(() => {
    setDesc('');
    setAmountStr('');
    setIsIncome(false);
    setExpenseCategory(defaultExpenseCategory);
    setCategoryTouched(false);
    setSuccessLine(null);
  }, []);

  React.useEffect(() => {
    if (!visible) reset();
  }, [visible, reset]);

  React.useEffect(() => {
    if (isIncome) return;
    if (categoryTouched) return;
    const trimmed = desc.trim();
    if (!trimmed) return;
    const suggested = categoryFromKnownMerchant(trimmed);
    if (suggested && suggested !== 'other') {
      setExpenseCategory(suggested);
    }
  }, [desc, isIncome, categoryTouched]);

  const onSave = React.useCallback(async () => {
    const raw = Number(String(amountStr).replace(/,/g, '').trim());
    if (!desc.trim()) {
      Alert.alert('Description', 'Add a short description for this transaction.');
      return;
    }
    if (!Number.isFinite(raw) || raw === 0) {
      Alert.alert('Amount', 'Enter a valid amount.');
      return;
    }
    const category: TransactionCategory = isIncome ? 'income' : expenseCategory;
    setAdding(true);
    const { error } = await insertTransaction({
      description: desc.trim(),
      amount: Math.abs(raw),
      category,
      isIncome,
    });
    setAdding(false);
    if (error) {
      Alert.alert('Could not add', error.message);
      return;
    }
    setSuccessLine(
      `Logged — ${formatCurrency(Math.abs(raw), Math.abs(raw) % 1 !== 0 ? 2 : 0)} to ${isIncome ? 'Income' : EXPENSE_CATEGORY_OPTIONS.find((c) => c.id === category)?.label ?? 'spending'}`,
    );
    onSaved?.();
    setTimeout(() => setSuccessLine(null), 2200);
    reset();
    onClose();
  }, [amountStr, desc, expenseCategory, insertTransaction, isIncome, onClose, onSaved, reset]);

  const bottomPad = Math.max(insets.bottom, tokens.spacing.md) + tabBarHeight;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.overlayInner}>
          <Pressable style={styles.scrimFlex} onPress={onClose} accessibilityLabel="Dismiss" />
          <View style={[styles.sheet, { paddingBottom: bottomPad }]}>
          <View style={styles.grabberWrap}>
            <View style={styles.grabber} />
          </View>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Add transaction</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12} accessibilityLabel="Close">
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.sheetBody}
          >
            <Text style={styles.caption}>Log income or spending. It updates goals and insights right away.</Text>
            <TextInput
              value={desc}
              onChangeText={setDesc}
              placeholder="Description (e.g. Paycheck, Groceries)"
              placeholderTextColor={colors.textSecondary}
              style={styles.field}
            />
            <TextInput
              value={amountStr}
              onChangeText={setAmountStr}
              placeholder="Amount"
              placeholderTextColor={colors.textSecondary}
              keyboardType="decimal-pad"
              style={styles.field}
            />
            <View style={styles.rowBetween}>
              <Text style={styles.metaLine}>Income</Text>
              <Switch value={isIncome} onValueChange={setIsIncome} trackColor={switchTrack} />
            </View>
            {!isIncome ? (
              <>
                <Text style={[styles.caption, { marginTop: tokens.spacing.md }]}>Category</Text>
                <View style={styles.chipsWrap}>
                  {EXPENSE_CATEGORY_OPTIONS.map((c) => (
                    <Chip
                      key={c.id}
                      label={c.label}
                      selected={expenseCategory === c.id}
                      onPress={() => {
                        setCategoryTouched(true);
                        setExpenseCategory(c.id);
                      }}
                    />
                  ))}
                </View>
              </>
            ) : null}
            {successLine ? <Text style={styles.successLine}>{successLine}</Text> : null}
            <AppButton
              label="Save transaction"
              onPress={() => void onSave()}
              variant="primary"
              size="lg"
              fullWidth
              loading={adding}
              disabled={adding}
              style={styles.saveBtn}
            />
            {onOpenActivity ? (
              <TouchableOpacity
                style={styles.moreLink}
                onPress={() => {
                  onClose();
                  onOpenActivity();
                }}
              >
                <Text style={styles.moreLinkLabel}>Import statements or full list</Text>
              </TouchableOpacity>
            ) : null}
          </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  overlayInner: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  scrimFlex: {
    flex: 1,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: tokens.radius.xl,
    borderTopRightRadius: tokens.radius.xl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    maxHeight: '88%',
  },
  grabberWrap: {
    alignItems: 'center',
    paddingTop: tokens.spacing.sm,
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderSubtle,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenPadding,
    paddingVertical: tokens.spacing.sm,
  },
  sheetTitle: {
    ...typography.titleM,
    color: colors.textPrimary,
  },
  sheetBody: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: tokens.spacing.lg,
  },
  caption: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: tokens.spacing.md,
  },
  field: {
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm + 2,
    color: colors.textPrimary,
    ...typography.body,
    marginBottom: tokens.spacing.sm,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: tokens.spacing.xs,
  },
  metaLine: {
    ...typography.body,
    color: colors.textPrimary,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: tokens.spacing.sm,
  },
  saveBtn: {
    marginTop: tokens.spacing.lg,
  },
  successLine: {
    ...typography.caption,
    color: colors.success,
    fontWeight: '600',
    marginTop: tokens.spacing.md,
  },
  moreLink: {
    marginTop: tokens.spacing.md,
    alignSelf: 'center',
    paddingVertical: tokens.spacing.sm,
  },
  moreLinkLabel: {
    ...typography.bodyStrong,
    color: colors.primary,
    fontSize: 13,
  },
});
