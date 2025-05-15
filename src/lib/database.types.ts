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
          name: string
          role: string
          company_name: string | null
          platform_ids: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          name: string
          role?: string
          company_name?: string | null
          platform_ids?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          role?: string
          company_name?: string | null
          platform_ids?: Json
          created_at?: string
          updated_at?: string
        }
      }
      audiences: {
        Row: {
          id: string
          name: string
          description: string | null
          category: string
          subcategory: string | null
          data_supplier: string | null
          tags: string[]
          reach: number | null
          cpm: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          category: string
          subcategory?: string | null
          data_supplier?: string | null
          tags?: string[]
          reach?: number | null
          cpm?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          category?: string
          subcategory?: string | null
          data_supplier?: string | null
          tags?: string[]
          reach?: number | null
          cpm?: number | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}