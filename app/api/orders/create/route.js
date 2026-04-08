import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

function formatOrderNumber(id) {
  return `ORD-${String(id).padStart(5, '0')}`
}

function calculateEta(queueNumber, batchSize = 10, batchMinutes = 5) {
  return Math.ceil(queueNumber / batchSize) * batchMinutes
}

export async function POST(request) {
  try {
    const body = await request.json()
    const customerName = body.customerName?.trim() || 'Guest'
    const cart = body.cart || []

    if (!Array.isArray(cart) || cart.length === 0) {
      return NextResponse.json(
        { error: 'Cart is empty.' },
        { status: 400 }
      )
    }

    const { data: latestOrder, error: latestOrderError } = await supabase
      .from('orders')
      .select('queue_number')
      .order('queue_number', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (latestOrderError) {
      return NextResponse.json(
        { error: latestOrderError.message },
        { status: 500 }
      )
    }

    const nextQueueNumber = (latestOrder?.queue_number || 0) + 1

    const { data: settings, error: settingsError } = await supabase
      .from('settings')
      .select('queue_batch_size, queue_batch_minutes')
      .limit(1)
      .maybeSingle()

    if (settingsError) {
      return NextResponse.json(
        { error: settingsError.message },
        { status: 500 }
      )
    }

    const batchSize = settings?.queue_batch_size || 10
    const batchMinutes = settings?.queue_batch_minutes || 5
    const etaMinutes = calculateEta(nextQueueNumber, batchSize, batchMinutes)

    const totalAmount = cart.reduce(
      (sum, item) => sum + Number(item.price) * item.qty,
      0
    )

    const { data: insertedOrder, error: orderInsertError } = await supabase
      .from('orders')
      .insert({
        queue_number: nextQueueNumber,
        customer_name: customerName,
        status: 'pending',
        eta_minutes: etaMinutes,
        total_amount: totalAmount,
      })
      .select()
      .single()

    if (orderInsertError) {
      return NextResponse.json(
        { error: orderInsertError.message },
        { status: 500 }
      )
    }

    const finalOrderNumber = formatOrderNumber(insertedOrder.id)

    const { data: updatedOrder, error: updateOrderError } = await supabase
      .from('orders')
      .update({ order_number: finalOrderNumber })
      .eq('id', insertedOrder.id)
      .select()
      .single()

    if (updateOrderError) {
      return NextResponse.json(
        { error: updateOrderError.message },
        { status: 500 }
      )
    }

    const orderItems = cart.map((item) => ({
      order_id: insertedOrder.id,
      menu_id: item.id,
      item_name: item.name,
      qty: item.qty,
      price: Number(item.price),
      notes: item.notes || null,
    }))

    const { error: orderItemsError } = await supabase
      .from('order_items')
      .insert(orderItems)

    if (orderItemsError) {
      return NextResponse.json(
        { error: orderItemsError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      orderId: insertedOrder.id,
      orderNumber: updatedOrder.order_number,
      queueNumber: insertedOrder.queue_number,
      etaMinutes: insertedOrder.eta_minutes,
    })
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    )
  }
}
