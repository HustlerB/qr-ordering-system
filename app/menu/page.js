import { supabase } from '@/lib/supabase'
import MenuClient from '@/components/MenuClient'

export default async function MenuPage() {
  const { data: menus, error } = await supabase
    .from('menus')
    .select('*')
    .eq('is_available', true)
    .order('id', { ascending: true })

  if (error) {
    return (
      <main style={{ padding: '24px', fontFamily: 'Arial, sans-serif' }}>
        <h1>Menu</h1>
        <p>Failed to load menu items.</p>
        <pre>{JSON.stringify(error, null, 2)}</pre>
      </main>
    )
  }

  return <MenuClient menus={menus || []} />
}
