export const dynamic = 'force-dynamic'
export const revalidate = 0

import { supabase } from '@/lib/supabase'
import AdminOrdersClient from '@/components/AdminOrdersClient'

export default async function AdminOrdersPage() {
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select(`
      *,
      order_items (
        id,
        item_name,
        qty,
        temperature,
        milk_type
      )
    `)
    .order('created_at', { ascending: false })

  const { data: menus, error: menusError } = await supabase
    .from('menus')
    .select(`
      id,
      code,
      name,
      sold_out,
      regular_milk_available,
      oat_milk_available,
      almond_milk_available
    `)
    .order('id', { ascending: true })

  const { data: settings, error: settingsError } = await supabase
    .from('settings')
    .select('id, show_prices, daily_cup_limit')
    .limit(1)
    .maybeSingle()

  if (ordersError || menusError || settingsError) {
    return (
      <main style={{ padding: '24px', fontFamily: 'Arial, sans-serif' }}>
        <h1>Admin Orders</h1>
        <p>Failed to load admin data.</p>
        <pre>{JSON.stringify({ ordersError, menusError, settingsError }, null, 2)}</pre>
      </main>
    )
  }

  return (
    <AdminOrdersClient
      orders={orders || []}
      menus={menus || []}
      settings={settings || { id: 1, show_prices: false, daily_cup_limit: 100 }}
    />
  )
}
