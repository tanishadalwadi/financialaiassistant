import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { ScreenAnimatedScrollView } from '../components/ScreenAnimatedScrollView';
import * as DocumentPicker from 'expo-document-picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../navigation';
import { colors } from '../theme/colors';
import { layout } from '../theme/layout';
import { typography } from '../theme/typography';
import { TransactionItem } from '../components/TransactionItem';
import { Ionicons } from '@expo/vector-icons';
import { Chip } from '../components/Chip';
import { useGoalsTransactions } from '../hooks/useGoalsTransactions';
import type { TransactionCategory } from '../types/models';
import { EXPENSE_CATEGORY_OPTIONS } from '../constants/expenseCategories';
import { categoryFromKnownMerchant } from '../lib/merchantCategoryMap';
import { AppButton } from '../components/ui/AppButton';
import { formatCurrency } from '../lib/displayFormat';

type Props = NativeStackScreenProps<RootStackParamList, 'Transactions'>;

type ImportStatusBannerStatus =
  | { kind: 'loading'; source: string }
  | { kind: 'success'; message: string; imported: number; duplicates: number; monthLabel: string | null }
  | { kind: 'empty'; message: string }
  | { kind: 'error'; message: string };

const ImportStatusBanner: React.FC<{
  status: ImportStatusBannerStatus;
  onDismiss: () => void;
}> = ({ status, onDismiss }) => {
  const palette = (() => {
    switch (status.kind) {
      case 'success':
        return {
          background: 'rgba(40, 167, 100, 0.12)',
          border: 'rgba(40, 167, 100, 0.40)',
          text: colors.success ?? '#1FA268',
          icon: 'checkmark-circle' as const,
        };
      case 'loading':
        return {
          background: 'rgba(255, 165, 0, 0.10)',
          border: 'rgba(255, 165, 0, 0.30)',
          text: colors.textPrimary,
          icon: 'cloud-upload' as const,
        };
      case 'empty':
        return {
          background: 'rgba(255, 200, 0, 0.10)',
          border: 'rgba(255, 200, 0, 0.30)',
          text: colors.textPrimary,
          icon: 'information-circle' as const,
        };
      case 'error':
      default:
        return {
          background: 'rgba(225, 75, 75, 0.12)',
          border: 'rgba(225, 75, 75, 0.40)',
          text: colors.chart3 ?? '#E14B4B',
          icon: 'alert-circle' as const,
        };
    }
  })();

  const title = (() => {
    switch (status.kind) {
      case 'loading':
        return `Uploading ${status.source}…`;
      case 'success':
        return status.monthLabel
          ? `Imported ${status.imported} transactions from ${status.monthLabel}`
          : `Imported ${status.imported} transactions`;
      case 'empty':
        return 'Import finished with no rows';
      case 'error':
      default:
        return 'Import failed';
    }
  })();

  const detail = (() => {
    if (status.kind === 'loading') {
      return 'Hang tight — parsing rows, deduping, and updating Insights.';
    }
    if (status.kind === 'success') {
      if (status.duplicates > 0) {
        return `${status.duplicates} duplicate${status.duplicates === 1 ? '' : 's'} skipped. They were already in your library.`;
      }
      return 'Your library, Insights, and Coach context just updated.';
    }
    return status.message;
  })();

  return (
    <View
      style={[
        bannerStyles.container,
        { backgroundColor: palette.background, borderColor: palette.border },
      ]}
    >
      <View style={bannerStyles.iconWrap}>
        {status.kind === 'loading' ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Ionicons name={palette.icon} size={20} color={palette.text} />
        )}
      </View>
      <View style={bannerStyles.body}>
        <Text style={[bannerStyles.title, { color: palette.text }]}>{title}</Text>
        {detail ? <Text style={bannerStyles.detail}>{detail}</Text> : null}
      </View>
      {status.kind !== 'loading' ? (
        <TouchableOpacity onPress={onDismiss} hitSlop={10} style={bannerStyles.close}>
          <Ionicons name="close" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const bannerStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 6,
    marginBottom: 10,
  },
  iconWrap: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  body: { flex: 1 },
  title: { ...typography.body, fontWeight: '600' },
  detail: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  close: { padding: 4 },
});

export const TransactionsScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = React.useState('');
  const { transactions, loading, error, insertTransaction, importBankCsv } = useGoalsTransactions();
  const [desc, setDesc] = React.useState('');
  const [amountStr, setAmountStr] = React.useState('');
  const [isIncome, setIsIncome] = React.useState(false);
  const defaultExpenseCategory = EXPENSE_CATEGORY_OPTIONS.find((c) => c.id !== 'other')?.id ?? 'groceries';
  const [expenseCategory, setExpenseCategory] = React.useState<TransactionCategory>(defaultExpenseCategory);
  const [categoryTouched, setCategoryTouched] = React.useState(false);
  const [adding, setAdding] = React.useState(false);
  const [inlineConfirm, setInlineConfirm] = React.useState<string | null>(null);
  const [csvPaste, setCsvPaste] = React.useState('');
  const [csvBusy, setCsvBusy] = React.useState(false);
  type ImportStatus =
    | { kind: 'loading'; source: string }
    | { kind: 'success'; message: string; imported: number; duplicates: number; monthLabel: string | null }
    | { kind: 'empty'; message: string }
    | { kind: 'error'; message: string }
    | null;
  const [importStatus, setImportStatus] = React.useState<ImportStatus>(null);
  const importStatusTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    return () => {
      if (importStatusTimerRef.current) clearTimeout(importStatusTimerRef.current);
    };
  }, []);

  const showImportStatus = React.useCallback((status: ImportStatus, autoDismissMs?: number) => {
    if (importStatusTimerRef.current) {
      clearTimeout(importStatusTimerRef.current);
      importStatusTimerRef.current = null;
    }
    setImportStatus(status);
    if (autoDismissMs && autoDismissMs > 0) {
      importStatusTimerRef.current = setTimeout(() => {
        setImportStatus(null);
        importStatusTimerRef.current = null;
      }, autoDismissMs);
    }
  }, []);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return transactions;
    return transactions.filter((t) => {
      const cat = (t.categoryLabel ?? t.category).toLowerCase();
      return (
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        cat.includes(q) ||
        new Date(t.date).toLocaleDateString().toLowerCase().includes(q)
      );
    });
  }, [query, transactions]);

  const onPickStatementFile = React.useCallback(async () => {
    setCsvBusy(true);
    showImportStatus({ kind: 'loading', source: 'file' });
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'text/plain'],
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets?.[0]) {
        setCsvBusy(false);
        setImportStatus(null);
        return;
      }
      const asset = res.assets[0];
      const uri = asset.uri;
      const mime = (asset as any).mimeType as string | undefined;
      const name = (asset as any).name as string | undefined;
      showImportStatus({ kind: 'loading', source: name ?? 'CSV' });
      let text = '';
      try {
        text = await (await fetch(uri)).text();
      } catch {
        text = '';
      }
      if (!text) {
        showImportStatus(
          { kind: 'error', message: 'Could not read this CSV file. Try another export or paste CSV below.' },
          10000,
        );
        setCsvBusy(false);
        return;
      }
      const { error: impErr, imported, duplicates, parseErrors, summary } = await importBankCsv(text, {
        fileName: name ?? null,
      });
      if (impErr) {
        const detail = parseErrors.length
          ? `\n${parseErrors.slice(0, 5).join('\n')}`
          : '\nMake sure this is a CSV with Date and Description columns.';
        showImportStatus({ kind: 'error', message: `${impErr.message}${detail}` }, 12000);
      } else if (imported === 0 && duplicates === 0) {
        showImportStatus(
          {
            kind: 'empty',
            message: `No transactions were imported from ${name ?? mime ?? 'this file'}.${
              parseErrors.length
                ? `\n\nParser notes:\n${parseErrors.slice(0, 6).join('\n')}`
                : '\n\nThis CSV may not match expected columns. Use Date, Description, and Amount (or Debit/Credit).'
            }`,
          },
          12000,
        );
      } else {
        showImportStatus(
          {
            kind: 'success',
            message: summary.message,
            imported,
            duplicates,
            monthLabel: summary.monthLabel,
          },
          10000,
        );
      }
    } catch (e) {
      showImportStatus(
        { kind: 'error', message: e instanceof Error ? e.message : 'Could not read file' },
        10000,
      );
    }
    setCsvBusy(false);
  }, [importBankCsv, showImportStatus]);

  const onImportPastedCsv = React.useCallback(async () => {
    const text = csvPaste.trim();
    if (!text) {
      showImportStatus(
        { kind: 'error', message: 'Paste statement text or pick a CSV file.' },
        6000,
      );
      return;
    }
    setCsvBusy(true);
    showImportStatus({ kind: 'loading', source: 'pasted CSV' });
    const { error: impErr, imported, duplicates, parseErrors, summary } = await importBankCsv(text);
    setCsvBusy(false);
    if (impErr) {
      const detail = parseErrors.length ? `\n${parseErrors.slice(0, 6).join('\n')}` : '';
      showImportStatus({ kind: 'error', message: `${impErr.message}${detail}` }, 12000);
    } else if (imported === 0 && duplicates === 0) {
      showImportStatus(
        {
          kind: 'empty',
          message: `No transactions were imported.${
            parseErrors.length ? `\n\nParser notes:\n${parseErrors.slice(0, 6).join('\n')}` : ''
          }`,
        },
        12000,
      );
    } else {
      setCsvPaste('');
      showImportStatus(
        {
          kind: 'success',
          message: summary.message,
          imported,
          duplicates,
          monthLabel: summary.monthLabel,
        },
        10000,
      );
    }
  }, [csvPaste, importBankCsv, showImportStatus]);

  React.useEffect(() => {
    if (isIncome) return;
    if (categoryTouched) return;
    const trimmed = desc.trim();
    if (!trimmed) return;
    const suggested = categoryFromKnownMerchant(trimmed);
    if (suggested && suggested !== 'other') setExpenseCategory(suggested);
  }, [desc, isIncome, categoryTouched]);

  const onAddTransaction = React.useCallback(async () => {
    const raw = Number(String(amountStr).replace(/,/g, '').trim());
    const category: TransactionCategory = isIncome ? 'income' : expenseCategory;
    setAdding(true);
    const { error } = await insertTransaction({
      description: desc,
      amount: raw,
      category,
      isIncome,
    });
    setAdding(false);
    if (error) {
      Alert.alert('Could not add', error.message);
      return;
    }
    setDesc('');
    setAmountStr('');
    setIsIncome(false);
    setExpenseCategory(defaultExpenseCategory);
    setCategoryTouched(false);
    const money = formatCurrency(Math.abs(raw), Math.abs(raw) % 1 !== 0 ? 2 : 0);
    const label = isIncome ? 'Income' : (EXPENSE_CATEGORY_OPTIONS.find((c) => c.id === category)?.label ?? 'spending');
    setInlineConfirm(`Logged — ${money} to ${label}`);
    setTimeout(() => setInlineConfirm(null), 2200);
  }, [amountStr, desc, expenseCategory, insertTransaction, isIncome, defaultExpenseCategory]);

  const switchTrack = { true: colors.primary, false: colors.muted } as const;

  return (
    <View style={styles.container}>
      <View style={[styles.headerRow, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recent Activity</Text>
        <View style={styles.headerGhost} />
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={colors.textSecondary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search merchants, categories…"
          placeholderTextColor={colors.textSecondary}
          style={styles.search}
        />
      </View>

      <ScreenAnimatedScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Add transaction</Text>
          <Text style={styles.caption}>Log income or spending. It appears everywhere in the app right away.</Text>
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
              <Text style={[styles.caption, { marginTop: 10 }]}>Category</Text>
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
          {inlineConfirm ? <Text style={styles.inlineConfirm}>{inlineConfirm}</Text> : null}
          <AppButton
            label="Save transaction"
            onPress={() => void onAddTransaction()}
            variant="primary"
            size="lg"
            fullWidth
            loading={adding}
            disabled={adding}
            style={styles.addBtn}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Import statements</Text>
          <Text style={styles.caption}>
            Import bank CSV exports. Required columns: Date + Description, plus Amount or Debit/Credit.
          </Text>
          {importStatus ? (
            <ImportStatusBanner status={importStatus} onDismiss={() => setImportStatus(null)} />
          ) : null}
          <AppButton
            label="Choose CSV file"
            onPress={() => void onPickStatementFile()}
            variant="secondary"
            size="md"
            fullWidth
            loading={csvBusy}
            disabled={csvBusy}
            style={styles.secondaryBtn}
          />
          <TextInput
            value={csvPaste}
            onChangeText={setCsvPaste}
            placeholder="Or paste CSV text here"
            placeholderTextColor={colors.textSecondary}
            multiline
            style={[styles.field, styles.csvPaste]}
          />
          <AppButton
            label="Import pasted text"
            onPress={() => void onImportPastedCsv()}
            variant="secondary"
            size="md"
            fullWidth
            disabled={csvBusy}
            style={styles.secondaryBtn}
          />
        </View>

        {loading ? (
          <View style={styles.centerRow}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.caption}>Loading transactions…</Text>
          </View>
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : filtered.length === 0 ? (
          <Text style={styles.caption}>
            No transactions yet. Add your first one above or import a CSV from your bank.
          </Text>
        ) : (
          filtered.map((tx) => <TransactionItem key={tx.id} tx={tx} />)
        )}
        <View style={{ height: 40 }} />
      </ScreenAnimatedScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerRow: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.cardElevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerGhost: {
    width: 44,
    height: 44,
  },
  headerTitle: {
    ...typography.titleM,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  searchWrap: {
    marginHorizontal: layout.screenPadding,
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  search: {
    marginLeft: 10,
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
  },
  content: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: 14,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: layout.cardRadius,
    padding: layout.cardPadding,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  cardTitle: {
    ...typography.titleM,
    color: colors.textPrimary,
    marginBottom: 6,
  },
  caption: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  field: {
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginTop: 10,
    color: colors.textPrimary,
    ...typography.body,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  metaLine: {
    ...typography.body,
    color: colors.textPrimary,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  inlineConfirm: {
    ...typography.caption,
    color: colors.success,
    fontWeight: '600',
    marginTop: 12,
  },
  addBtn: {
    marginTop: 16,
  },
  secondaryBtn: {
    marginTop: 10,
  },
  csvPaste: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  centerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  errorText: {
    ...typography.body,
    color: colors.chart3,
    marginBottom: 8,
  },
});
