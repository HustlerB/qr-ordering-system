import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request) {
  try {
    const body = await request.json()
    const updates = {}

    if (typeof body.show_prices === 'boolean') {
      updates.show_prices = body.show_prices
    }

    if (body.daily_cup_limit !== undefined) {
      updates.daily_cup_limit = Number(body.daily_cup_limit)
    }

    if (body.order_prefix !== undefined) {
      updates.order_prefix = String(body.order_prefix || 'ORD')
    }

    if (body.order_start_number !== undefined) {
      updates.order_start_number = Number(body.order_start_number)
    }

    const { error } = await supabase
      .from('settings')
      .update(updates)
      .eq('id', 1)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
