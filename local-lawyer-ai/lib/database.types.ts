export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          provider: string
          provider_id: string
          subscription_status: 'inactive' | 'active' | 'canceled' | 'past_due'
          subscription_plan: 'weekly' | 'monthly' | 'yearly' | null
          subscription_id: string | null
          customer_id: string | null
          current_period_end: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          provider: string
          provider_id: string
          subscription_status?: 'inactive' | 'active' | 'canceled' | 'past_due'
          subscription_plan?: 'weekly' | 'monthly' | 'yearly' | null
          subscription_id?: string | null
          customer_id?: string | null
          current_period_end?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          provider?: string
          provider_id?: string
          subscription_status?: 'inactive' | 'active' | 'canceled' | 'past_due'
          subscription_plan?: 'weekly' | 'monthly' | 'yearly' | null
          subscription_id?: string | null
          customer_id?: string | null
          current_period_end?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      legal_documents: {
        Row: {
          id: string
          filename: string
          file_path: string
          file_size: number
          content_type: string
          version: number
          is_current: boolean
          processed: boolean
          uploaded_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          filename: string
          file_path: string
          file_size: number
          content_type: string
          version?: number
          is_current?: boolean
          processed?: boolean
          uploaded_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          filename?: string
          file_path?: string
          file_size?: number
          content_type?: string
          version?: number
          is_current?: boolean
          processed?: boolean
          uploaded_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      document_chunks: {
        Row: {
          id: string
          document_id: string
          chunk_index: number
          content: string
          embedding: number[] | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          document_id: string
          chunk_index: number
          content: string
          embedding?: number[] | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          document_id?: string
          chunk_index?: number
          content?: string
          embedding?: number[] | null
          metadata?: Json | null
          created_at?: string
        }
      }
      admins: {
        Row: {
          id: string
          email: string
          password_hash: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          password_hash: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          password_hash?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}