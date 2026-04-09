import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

function formatOrderNumber(prefix, nextNumber) {
  const cleanPrefix = String(prefix || '').trim()
  const cleanNumber = Number(nextNumber || 1)

  if (!cleanPrefix) {
    return String(cleanNumber)
  }

  return `${cleanPrefix}-${cleanNumber}`
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

    const { data: settings, error: settingsError } = await supabase
      .from('settings')
      .select(`
        id,
        queue_batch_size,
        queue_batch_minutes,
        daily_cup_limit,
        order_prefix,
        order_start_number
      `)
      .limit(1)
      .maybeSingle()

    if (settingsError || !settings) {
      return NextResponse.json(
        { error: settingsError?.message || 'Settings not found.' },
        { status: 500 }
      )
    }

    const batchSize = settings.queue_batch_size || 10
    const batchMinutes = settings.queue_batch_minutes || 5
    const dailyCupLimit = settings.daily_cup_limit || 100
    const orderPrefix = settings.order_prefix || 'ORD'
    const nextOrderNumber = Number(settings.order_start_number || 1)

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
          error: `Daily cup limit reached. Remaining cups: ${Math.max(
            dailyCupLimit - cupsAlreadyOrderedToday,
            0
          )}.`,
        },
        { status: 400 }
      )
    }

    const { count: activeQueueCount, error: activeQueueError } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .in('status', ['pending', 'brewing'])

    if (activeQueueError) {
      return NextResponse.json(
        { error: activeQueueError.message },
        { status: 500 }
      )
    }

    const nextQueueNumber = (activeQueueCount || 0) + 1

    const etaMinutes = calculateEta(
      (activeQueueCount || 0) + 1,
      batchSize,
      batchMinutes
    )

    const totalAmount = cart.reduce(
      (sum, item) => sum + Number(item.price || 0) * item.qty,
      0
    )

    const finalOrderNumber = formatOrderNumber(orderPrefix, nextOrderNumber)

    const { data: insertedOrder, error: orderInsertError } = await supabase
      .from('orders')
      .insert({
        order_number: finalOrderNumber,
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

    const { error: settingsUpdateError } = await supabase
      .from('settings')
      .update({
        order_start_number: nextOrderNumber + 1,
      })
      .eq('id', settings.id)

    if (settingsUpdateError) {
      return NextResponse.json(
        { error: settingsUpdateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      orderId: insertedOrder.id,
      orderNumber: insertedOrder.order_number,
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
