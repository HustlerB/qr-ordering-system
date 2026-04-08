import { supabase } from '@/lib/supabase'

export async function GET() {
  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      order_number,
      queue_number,
      customer_name,
      status,
      eta_minutes,
      total_amount,
      created_at,
      order_items (
        item_name,
        qty,
        temperature,
        milk_type
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    return new Response(error.message, { status: 500 })
  }

  const rows = [
    [
      'Order Number',
      'Queue Number',
      'Customer Name',
      'Status',
      'ETA Minutes',
      'Total Amount',
      'Created At',
      'Item Name',
      'Qty',
      'Temperature',
      'Milk Type',
    ],
  ]

  for (const order of orders || []) {
    for (const item of order.order_items || []) {
      rows.push([
        order.order_number || '',
        order.queue_number || '',
        order.customer_name || '',
        order.status || '',
        order.eta_minutes || '',
        order.total_amount || '',
        order.created_at || '',
        item.item_name || '',
        item.qty || '',
        item.temperature || '',
        item.milk_type || '',
      ])
    }
  }

  const csv = rows
    .map((row) =>
      row
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(',')
    )
    .join('\n')

  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="orders-export.csv"',
    },
  })
}
