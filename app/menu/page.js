export const dynamic = 'force-dynamic'
export const revalidate = 0

import { supabase } from '@/lib/supabase'
import MenuClient from '@/components/MenuClient'

export default async function MenuPage() {
  const { data: menus, error } = await supabase
    .from('menus')
    .select(`
      id,
      code,
      name,
      description,
      price,
      category,
      image_url,
      is_available,
      sold_out,
      hot_available,
      cold_available,
      regular_milk_available,
      oat_milk_available,
      almond_milk_available
    `)
    .eq('is_available', true)
    .order('id', { ascending: true })

  const { data: settings } = await supabase
    .from('settings')
    .select('show_prices')
    .limit(1)
    .maybeSingle()

  if (error) {
    return (
      <main style={{ padding: '24px', fontFamily: 'Arial, sans-serif' }}>
        <h1>Menu</h1>
        <p>Failed to load menu items.</p>
        <pre>{JSON.stringify(error, null, 2)}</pre>
      </main>
    )
  }

  return (
    <MenuClient
      menus={menus || []}
      showPrices={settings?.show_prices ?? false}
    />
  )
}
