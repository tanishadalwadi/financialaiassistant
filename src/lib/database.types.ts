/**
 * Supabase generated types placeholder.
 * After your schema exists, run: `npx supabase gen types typescript --project-id <ref> > src/lib/database.types.ts`
 * or paste from Supabase Dashboard → Settings → API → TypeScript types.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          user_type: string | null;
          monthly_income: number | null;
          monthly_savings_target: number | null;
          notifications_enabled: boolean | null;
          coach_tone: string | null;
          spending_weakness: string | null;
          primary_goal_id: string | null;
          onboarding_completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          user_type?: string | null;
          monthly_income?: number | null;
          monthly_savings_target?: number | null;
          notifications_enabled?: boolean | null;
          coach_tone?: string | null;
          spending_weakness?: string | null;
          primary_goal_id?: string | null;
          onboarding_completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          user_type?: string | null;
          monthly_income?: number | null;
          monthly_savings_target?: number | null;
          notifications_enabled?: boolean | null;
          coach_tone?: string | null;
          spending_weakness?: string | null;
          primary_goal_id?: string | null;
          onboarding_completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      goals: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          type: string;
          target_amount: number;
          saved_amount: number;
          due_date: string;
          priority: string;
          emoji: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          type: string;
          target_amount: number;
          saved_amount?: number;
          due_date: string;
          priority: string;
          emoji?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          type?: string;
          target_amount?: number;
          saved_amount?: number;
          due_date?: string;
          priority?: string;
          emoji?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          description: string;
          amount: number;
          category: string;
          is_income: boolean;
          category_label: string | null;
          import_id: string | null;
          fingerprint: string | null;
          source: string | null;
          institution: string | null;
          account_name: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          description: string;
          amount: number;
          category: string;
          is_income?: boolean;
          category_label?: string | null;
          import_id?: string | null;
          fingerprint?: string | null;
          source?: string | null;
          institution?: string | null;
          account_name?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          description?: string;
          amount?: number;
          category?: string;
          is_income?: boolean;
          category_label?: string | null;
          import_id?: string | null;
          fingerprint?: string | null;
          source?: string | null;
          institution?: string | null;
          account_name?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      statement_imports: {
        Row: {
          id: string;
          user_id: string;
          file_name: string | null;
          source: string;
          institution: string | null;
          account_name: string | null;
          account_type: string | null;
          statement_start_date: string | null;
          statement_end_date: string | null;
          month_label: string | null;
          transaction_count: number;
          duplicate_count: number;
          imported_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          file_name?: string | null;
          source?: string;
          institution?: string | null;
          account_name?: string | null;
          account_type?: string | null;
          statement_start_date?: string | null;
          statement_end_date?: string | null;
          month_label?: string | null;
          transaction_count?: number;
          duplicate_count?: number;
          imported_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          file_name?: string | null;
          source?: string;
          institution?: string | null;
          account_name?: string | null;
          account_type?: string | null;
          statement_start_date?: string | null;
          statement_end_date?: string | null;
          month_label?: string | null;
          transaction_count?: number;
          duplicate_count?: number;
          imported_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      monthly_financial_snapshots: {
        Row: {
          id: string;
          user_id: string;
          month: string;
          month_label: string;
          total_income: number;
          total_expenses: number;
          surplus: number;
          savings_rate: number | null;
          top_category: string | null;
          top_category_amount: number;
          transaction_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          month: string;
          month_label: string;
          total_income?: number;
          total_expenses?: number;
          surplus?: number;
          savings_rate?: number | null;
          top_category?: string | null;
          top_category_amount?: number;
          transaction_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          month?: string;
          month_label?: string;
          total_income?: number;
          total_expenses?: number;
          surplus?: number;
          savings_rate?: number | null;
          top_category?: string | null;
          top_category_amount?: number;
          transaction_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      conversations: {
        Row: {
          id: string;
          user_id: string;
          title: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      ai_messages: {
        Row: {
          id: string;
          conversation_id: string;
          role: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          role: string;
          content: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          role?: string;
          content?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      category_budget_caps: {
        Row: {
          id: string;
          user_id: string;
          category: string;
          cap_amount: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          category: string;
          cap_amount: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          category?: string;
          cap_amount?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
