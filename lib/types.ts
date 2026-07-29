export type Role = 'ceo' | 'manager' | 'staff'

export interface Store {
  id: string
  name: string
  address: string | null
  phone: string | null
  created_at: string
}

export interface Profile {
  id: string
  full_name: string
  role: Role
  store_id: string | null
  phone: string | null
  is_active: boolean
  created_at: string
}

export interface Product {
  id: string
  store_id: string
  name: string
  sku: string | null
  category: string | null
  size: string | null
  cost_price: number
  selling_price: number
  quantity: number
  reorder_level: number
  created_at: string
  updated_at: string
}

export interface Sale {
  id: string
  store_id: string
  sold_by: string
  customer_name: string | null
  customer_phone: string | null
  payment_method: 'cash' | 'transfer' | 'pos' | 'credit'
  total_amount: number
  created_at: string
}

export interface SaleItem {
  id: string
  sale_id: string
  product_id: string
  quantity: number
  unit_price: number
  subtotal: number
}

export interface InventoryMovement {
  id: string
  store_id: string
  product_id: string
  type: 'restock' | 'sale' | 'adjustment' | 'transfer_in' | 'transfer_out'
  quantity: number
  note: string | null
  created_by: string | null
  created_at: string
}
