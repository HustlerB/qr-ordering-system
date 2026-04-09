import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request) {
  try {
    const body = await request.json()
    const { orderId } = body

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order id is required.' },
        { status: 400 }
      )
    }

    const { error: deleteItemsError } = await supabase
      .from('order_items')
      .delete()
      .eq('order_id', orderId)

    if (deleteItemsError) {
      return NextResponse.json(
        { error: deleteItemsError.message },
        { status: 500 }
      )
    }

    const { error: deleteOrderError } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId)

    if (deleteOrderError) {
      return NextResponse.json(
        { error: deleteOrderError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
