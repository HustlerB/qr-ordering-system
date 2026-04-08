import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request, { params }) {
  try {
    const { id } = await params

    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          id,
          item_name,
          qty,
          price
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ order })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
