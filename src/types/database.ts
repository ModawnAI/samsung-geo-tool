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
          name: string | null
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          created_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          name: string
          name_ko: string | null
          icon: string | null
          sort_order: number
        }
        Insert: {
          id?: string
          name: string
          name_ko?: string | null
          icon?: string | null
          sort_order?: number
        }
        Update: {
          id?: string
          name?: string
          name_ko?: string | null
          icon?: string | null
          sort_order?: number
        }
      }
      products: {
        Row: {
          id: string
          category_id: string
          name: string
          code_name: string | null
          created_at: string
        }
        Insert: {
          id?: string
          category_id: string
          name: string
          code_name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          category_id?: string
          name?: string
          code_name?: string | null
          created_at?: string
        }
      }
      briefs: {
        Row: {
          id: string
          product_id: string
          version: number
          usps: string[]
          content: string | null
          is_active: boolean
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          product_id: string
          version?: number
          usps: string[]
          content?: string | null
          is_active?: boolean
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          product_id?: string
          version?: number
          usps?: string[]
          content?: string | null
          is_active?: boolean
          created_at?: string
          created_by?: string | null
        }
      }
      generations: {
        Row: {
          id: string
          user_id: string
          product_id: string
          brief_id: string | null
          video_url: string | null
          srt_content: string
          selected_keywords: string[]
          description: string | null
          timestamps: string | null
          hashtags: string[]
          faq: string | null
          status: 'draft' | 'confirmed'
          campaign_tag: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          product_id: string
          brief_id?: string | null
          video_url?: string | null
          srt_content: string
          selected_keywords: string[]
          description?: string | null
          timestamps?: string | null
          hashtags?: string[]
          faq?: string | null
          status?: 'draft' | 'confirmed'
          campaign_tag?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          product_id?: string
          brief_id?: string | null
          video_url?: string | null
          srt_content?: string
          selected_keywords?: string[]
          description?: string | null
          timestamps?: string | null
          hashtags?: string[]
          faq?: string | null
          status?: 'draft' | 'confirmed'
          campaign_tag?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      grounding_cache: {
        Row: {
          id: string
          product_name: string
          keywords: Json
          sources: Json
          created_at: string
          expires_at: string
        }
        Insert: {
          id?: string
          product_name: string
          keywords: Json
          sources: Json
          created_at?: string
          expires_at?: string
        }
        Update: {
          id?: string
          product_name?: string
          keywords?: Json
          sources?: Json
          created_at?: string
          expires_at?: string
        }
      }
      templates: {
        Row: {
          id: string
          name: string
          description: string | null
          product_id: string | null
          keywords: string[]
          campaign_tag: string | null
          brief_usps: string[]
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          product_id?: string | null
          keywords?: string[]
          campaign_tag?: string | null
          brief_usps?: string[]
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          product_id?: string | null
          keywords?: string[]
          campaign_tag?: string | null
          brief_usps?: string[]
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      embedding_cache: {
        Row: {
          id: string
          cache_key: string
          query_text: string
          embedding: number[]
          model: string
          dimensions: number
          hit_count: number
          created_at: string
          expires_at: string
        }
        Insert: {
          id?: string
          cache_key: string
          query_text: string
          embedding: number[]
          model: string
          dimensions: number
          hit_count?: number
          created_at?: string
          expires_at?: string
        }
        Update: {
          id?: string
          cache_key?: string
          query_text?: string
          embedding?: number[]
          model?: string
          dimensions?: number
          hit_count?: number
          created_at?: string
          expires_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_cache_hit: {
        Args: { row_cache_key: string }
        Returns: void
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
