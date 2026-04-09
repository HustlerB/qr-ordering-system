import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request) {
  try {
    const body = await request.json()
    const { order_prefix, order_start_number } = body

    const { error } = await supabase
      .from('settings')
      .update({
        order_prefix: String(order_prefix || 'ORD'),
        order_start_number: Number(order_start_number || 1),
      })
      .eq('id', 1)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
