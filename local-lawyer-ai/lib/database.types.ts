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
          tokens_used_this_period: number
          total_tokens_purchased: number
          tokens_purchase_history: Json[] | null
          last_token_purchase_date: string | null
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
          tokens_used_this_period?: number
          total_tokens_purchased?: number
          tokens_purchase_history?: Json[] | null
          last_token_purchase_date?: string | null
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
          tokens_used_this_period?: number
          total_tokens_purchased?: number
          tokens_purchase_history?: Json[] | null
          last_token_purchase_date?: string | null
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
      token_usage_logs: {
        Row: {
          id: string
          user_id: string
          tokens_used: number
          action_type: string
          request_details: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          tokens_used: number
          action_type: string
          request_details?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          tokens_used?: number
          action_type?: string
          request_details?: Json | null
          created_at?: string
        }
      }
      conversations: {
        Row: {
          id: string
          user_id: string
          title: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          created_at?: string
          updated_at?: string
        }
      }
      chat_exchanges: {
        Row: {
          id: string
          conversation_id: string
          user_id: string
          user_message: string
          assistant_response: string
          tokens_used: number | null
          sources_count: number | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          user_id: string
          user_message: string
          assistant_response: string
          tokens_used?: number | null
          sources_count?: number | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          user_id?: string
          user_message?: string
          assistant_response?: string
          tokens_used?: number | null
          sources_count?: number | null
          metadata?: Json | null
          created_at?: string
        }
      }
    }
  }
}