import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

function formatOrderNumber(id) {
  return `ORD-${String(id).padStart(5, '0')}`
}

function calculateEta(activeBacklogCount, batchSize = 10, batchMinutes = 5) {
  return Math.ceil(activeBacklogCount / batchSize) * batchMinutes
}

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

    const totalCups = cart.reduce((sum, item) => sum + Number(item.qty || 0), 0)

    if (totalCups > 5) {
      return NextResponse.json(
        { error: 'Maximum 5 cups allowed per order.' },
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
      .select('queue_batch_size, queue_batch_minutes, daily_cup_limit')
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
    const dailyCupLimit = settings?.daily_cup_limit || 100

    const { start, end } = getKualaLumpurDayRange()

    const { data: todayOrders, error: todayOrdersError } = await supabase
      .from('order_items')
      .select(`
        qty,
        orders!inner (
          created_at
        )
      `)
      .gte('orders.created_at', start)
      .lt('orders.created_at', end)

    if (todayOrdersError) {
      return NextResponse.json(
        { error: todayOrdersError.message },
        { status: 500 }
      )
    }

    const cupsAlreadyOrderedToday = (todayOrders || []).reduce(
      (sum, item) => sum + Number(item.qty || 0),
      0
    )

    if (cupsAlreadyOrderedToday + totalCups > dailyCupLimit) {
      return NextResponse.json(
        {
          error: `Daily cup limit reached. Remaining cups: ${Math.max(dailyCupLimit - cupsAlreadyOrderedToday, 0)}.`,
        },
        { status: 400 }
      )
    }

    const { count: activeBacklogCount, error: backlogError } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .in('status', ['pending', 'brewing'])

    if (backlogError) {
      return NextResponse.json(
        { error: backlogError.message },
        { status: 500 }
      )
    }

    const etaMinutes = calculateEta((activeBacklogCount || 0) + 1, batchSize, batchMinutes)

    const totalAmount = cart.reduce(
      (sum, item) => sum + Number(item.price || 0) * item.qty,
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
      price: Number(item.price || 0),
      notes: item.notes || null,
      temperature: item.temperature || null,
      milk_type: item.milk_type || null,
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
