/**
 * Starter legal copy for in-app display. Replace with counsel-reviewed
 * Privacy Policy and Terms before public app store submission.
 */

export const LEGAL_DISCLAIMER =
  'The text below is a generic template for development and internal testing. It is not legal advice. Have qualified counsel draft and approve your final Privacy Policy and Terms of Service before launch.';

export const PRIVACY_SECTIONS: { title: string; body: string }[] = [
  {
    title: 'Who we are',
    body: 'This app (“the Service”) is operated by you or your organization. Contact details should be added here for production.',
  },
  {
    title: 'What we collect',
    body: 'We process account information (such as email), financial inputs you choose to save (goals, transactions, budgets, coach messages), and limited device or diagnostic data only if you enable such features in a given build. We do not sell your personal information.',
  },
  {
    title: 'How we use data',
    body: 'Data is used to provide the Service: dashboards, insights, optional AI coaching, and account management. Aggregated or de-identified analytics may be used to improve reliability.',
  },
  {
    title: 'Processors and infrastructure',
    body: 'The Service may use Supabase (database, authentication, optional Edge Functions) and, if enabled, third-party APIs for AI coaching (e.g. Google Gemini). Any additional vendors you turn on (analytics, crash reporting, etc.) process data under their terms and your project configuration.',
  },
  {
    title: 'Retention and deletion',
    body: 'You may delete individual content where the app supports it. Deleting your account removes your auth record and, through database rules, associated application data tied to that account. Backups may persist for a limited period per infrastructure policy.',
  },
  {
    title: 'Your choices',
    body: 'You can sign out, adjust profile settings, export or delete data where the product supports it, and stop using the Service at any time.',
  },
];

export const TERMS_SECTIONS: { title: string; body: string }[] = [
  {
    title: 'Agreement',
    body: 'By creating an account or using the Service, you agree to these Terms and to the Privacy Policy.',
  },
  {
    title: 'Not financial, legal, or tax advice',
    body: 'The Service and any AI output are for informational purposes only. Nothing constitutes professional financial, investment, legal, or tax advice. You are responsible for your own decisions.',
  },
  {
    title: 'Accounts and security',
    body: 'You must provide accurate registration information and keep credentials confidential. You are responsible for activity under your account.',
  },
  {
    title: 'Acceptable use',
    body: 'You agree not to misuse the Service, attempt unauthorized access, or use the Service in violation of applicable law.',
  },
  {
    title: 'Disclaimers',
    body: 'The Service is provided “as is” without warranties of any kind, within the maximum extent permitted by law.',
  },
  {
    title: 'Limitation of liability',
    body: 'To the fullest extent permitted by law, the operator’s total liability arising from the Service is limited as you specify with counsel. Some jurisdictions do not allow certain limitations; those limits apply only to the extent permitted.',
  },
  {
    title: 'Termination',
    body: 'You may stop using the Service at any time. We may suspend or terminate access for violations of these Terms or to protect the Service. You may delete your account from the app where that feature is available.',
  },
  {
    title: 'Changes',
    body: 'We may update these Terms. Material changes should be communicated as appropriate for your product (e.g. in-app notice or email). Continued use after changes may constitute acceptance, as determined by your counsel.',
  },
];
