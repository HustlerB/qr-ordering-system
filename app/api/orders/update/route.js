import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request) {
  try {
    const body = await request.json()
    const {
      orderId,
      customer_name,
      queue_number,
      eta_minutes,
      status,
    } = body

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order id is required.' },
        { status: 400 }
      )
    }

    const updates = {}

    if (customer_name !== undefined) updates.customer_name = customer_name
    if (queue_number !== undefined) updates.queue_number = Number(queue_number)
    if (eta_minutes !== undefined) updates.eta_minutes = Number(eta_minutes)
    if (status !== undefined) updates.status = status

    const { error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', orderId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
