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
          first_name: string | null
          last_name: string | null
          role: 'admin' | 'client' | 'customer' | 'guest'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          first_name?: string | null
          last_name?: string | null
          role?: 'admin' | 'client' | 'customer' | 'guest'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          first_name?: string | null
          last_name?: string | null
          role?: 'admin' | 'client' | 'customer' | 'guest'
          updated_at?: string
        }
      }
      posts: {
        Row: {
          id: string
          author_id: string
          content: string
          media_urls: string[]
          is_pinned: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          author_id: string
          content: string
          media_urls?: string[]
          is_pinned?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          author_id?: string
          content?: string
          media_urls?: string[]
          is_pinned?: boolean
          updated_at?: string
        }
      }
      stories: {
        Row: {
          id: string
          author_id: string
          title: string
          media_url: string
          is_pinned: boolean
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          author_id: string
          title: string
          media_url: string
          is_pinned?: boolean
          expires_at: string
          created_at?: string
        }
        Update: {
          id?: string
          author_id?: string
          title?: string
          media_url?: string
          is_pinned?: boolean
          expires_at?: string
        }
      }
      products: {
        Row: {
          id: string
          sku: string
          name: string
          title: string | null
          description: string | null
          base_price_php: number
          stock: number
          status: string
          media_urls: string[]
          department: string | null
          category: string | null
          subcategory: string | null
          product_type: string | null
          series: string | null
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          sku?: string
          name: string
          title?: string | null
          description?: string | null
          base_price_php: number
          stock?: number
          status?: string
          media_urls?: string[]
          department?: string | null
          category?: string | null
          subcategory?: string | null
          product_type?: string | null
          series?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          sku?: string
          name?: string
          title?: string | null
          description?: string | null
          base_price_php?: number
          stock?: number
          status?: string
          media_urls?: string[]
          department?: string | null
          category?: string | null
          subcategory?: string | null
          product_type?: string | null
          series?: string | null
          active?: boolean
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
