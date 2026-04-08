export const dynamic = 'force-dynamic'
export const revalidate = 0

import { supabase } from '@/lib/supabase'
import AdminOrdersClient from '@/components/AdminOrdersClient'

export default async function AdminOrdersPage() {
  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_items (
        id,
        item_name,
        qty
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <main style={{ padding: '24px', fontFamily: 'Arial, sans-serif' }}>
        <h1>Admin Orders</h1>
        <p>Failed to load orders.</p>
        <pre>{JSON.stringify(error, null, 2)}</pre>
      </main>
    )
  }

  return <AdminOrdersClient orders={orders || []} />
}
