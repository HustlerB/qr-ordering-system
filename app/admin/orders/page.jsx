import { supabase } from '@/lib/supabase'
import AdminOrdersClient from '@/components/AdminOrdersClient'

export const dynamic = 'force-dynamic'

function getKualaLumpurDayRange() {
  const now = new Date()
  const offsetMs = 8 * 60 * 60 * 1000
  const klNow = new Date(now.getTime() + offsetMs)

  const year = klNow.getUTCFullYear()
  const month = klNow.getUTCMonth()
  const day = klNow.getUTCDate()

  const startUtc = new Date(Date.UTC(year, month, day, -8, 0, 0))
  const endUtc = new Date(Date.UTC(year, month, day + 1, -8, 0, 0))

  return {
    start: startUtc.toISOString(),
    end: endUtc.toISOString(),
  }
}

export default async function AdminOrdersPage() {
  const fallbackSettings = {
    id: 1,
    show_prices: false,
    daily_cup_limit: 100,
    order_prefix: 'ORD',
    order_start_number: 1,
  }

  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      queue_number,
      customer_name,
      status,
      eta_minutes,
      total_amount,
      created_at,
      order_items (
        id,
        item_name,
        qty,
        temperature,
        milk_type
      )
    `)
    .order('id', { ascending: false })

  const { data: menus, error: menusError } = await supabase
    .from('menus')
    .select(`
      id,
      name,
      code,
      sold_out,
      regular_milk_available,
      oat_milk_available,
      almond_milk_available
    `)
    .order('id', { ascending: true })

  const { data: settingsRaw, error: settingsError } = await supabase
    .from('settings')
    .select(`
      id,
      show_prices,
      daily_cup_limit,
      order_prefix,
      order_start_number
    `)
    .limit(1)
    .maybeSingle()

  if (ordersError || menusError) {
    return (
      <main style={{ padding: '24px', fontFamily: 'Arial, sans-serif' }}>
        <h1>Admin Panel</h1>
        <p>Failed to load admin data.</p>
      </main>
    )
  }

  const settings =
    settingsError || !settingsRaw
      ? fallbackSettings
      : {
          ...fallbackSettings,
          ...settingsRaw,
        }

  const { start, end } = getKualaLumpurDayRange()

  const cupsServedToday = (orders || [])
    .filter((order) => {
      const createdAt = order.created_at || ''
      return createdAt >= start && createdAt < end
    })
    .flatMap((order) => order.order_items || [])
    .reduce((sum, item) => sum + Number(item.qty || 0), 0)

  return (
    <AdminOrdersClient
      orders={orders || []}
      menus={menus || []}
      settings={settings}
      cupsServedToday={cupsServedToday}
    />
  )
}
