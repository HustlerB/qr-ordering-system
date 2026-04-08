import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request) {
  try {
    const body = await request.json()
    const { orderId, status } = body

    if (!orderId || !status) {
      return NextResponse.json(
        { error: 'orderId and status are required.' },
        { status: 400 }
      )
    }

    const allowedStatuses = ['pending', 'brewing', 'ready']

    if (!allowedStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status.' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('orders')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    )
  }
}
