export const dynamic = 'force-dynamic'
export const revalidate = 0

import { supabase } from '@/lib/supabase'
import AdminOrdersClient from '@/components/AdminOrdersClient'

function getTodayUtcDateString() {
  return new Date().toISOString().slice(0, 10)
}

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
    .select('id, show_prices, daily_cup_limit, order_prefix, order_start_number')
    .limit(1)
    .maybeSingle()

  if (ordersError || menusError || settingsError) {
    return (
      <main style={{ padding: '24px', fontFamily: 'Arial, sans-serif' }}>
        <h1>Admin Orders</h1>
        <p>Failed to load admin data.</p>
        <pre>
          {JSON.stringify(
            { ordersError, menusError, settingsError },
            null,
            2
          )}
        </pre>
      </main>
    )
  }

  const today = getTodayUtcDateString()

  const cupsServedToday = (orders || [])
    .filter((order) => (order.created_at || '').slice(0, 10) === today)
    .flatMap((order) => order.order_items || [])
    .reduce((sum, item) => sum + Number(item.qty || 0), 0)

  return (
    <AdminOrdersClient
      orders={orders || []}
      menus={menus || []}
      cupsServedToday={cupsServedToday}
      settings={
        settings || {
          id: 1,
          show_prices: false,
          daily_cup_limit: 100,
          order_prefix: 'ORD',
          order_start_number: 1,
        }
      }
    />
  )
}
