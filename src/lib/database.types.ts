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
      boost_taxo: {
        Row: {
          segment_name: string
          data_supplier: string | null
          estimated_volumes: number | null
          boost_cpm: number | null
          segment_description: string | null
        }
        Insert: {
          segment_name: string
          data_supplier?: string | null
          estimated_volumes?: number | null
          boost_cpm?: number | null
          segment_description?: string | null
        }
        Update: {
          segment_name?: string
          data_supplier?: string | null
          estimated_volumes?: number | null
          boost_cpm?: number | null
          segment_description?: string | null
        }
      }
    }
  }
}