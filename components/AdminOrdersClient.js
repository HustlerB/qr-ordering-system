'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminOrdersClient({ orders }) {
  const router = useRouter()
  const [loadingId, setLoadingId] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')

  async function updateStatus(orderId, status) {
    try {
      setErrorMessage('')
      setLoadingId(orderId)

      const response = await fetch('/api/orders/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId, status }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update order.')
      }

      router.refresh()
    } catch (error) {
      setErrorMessage(error.message || 'Something went wrong.')
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <main style={{ padding: '24px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ marginBottom: '24px' }}>Admin Orders</h1>

      {errorMessage ? (
        <p style={{ color: 'tomato', marginBottom: '16px' }}>{errorMessage}</p>
      ) : null}

      {!orders || orders.length === 0 ? (
        <p>No orders yet.</p>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {orders.map((order) => (
            <div
              key={order.id}
              style={{
                border: '1px solid #ddd',
                borderRadius: '12px',
                padding: '16px',
                background: '#fff',
                color: '#111',
              }}
            >
              <div style={{ marginBottom: '8px' }}>
                <strong>{order.order_number || `ORD-${String(order.id).padStart(5, '0')}`}</strong>
              </div>

              <p style={{ margin: '4px 0' }}>
                <strong>Queue:</strong> {order.queue_number}
              </p>
              <p style={{ margin: '4px 0' }}>
                <strong>Customer:</strong> {order.customer_name || 'Guest'}
              </p>
              <p style={{ margin: '4px 0' }}>
                <strong>Status:</strong> {order.status}
              </p>
              <p style={{ margin: '4px 0' }}>
                <strong>ETA:</strong> {order.eta_minutes} mins
              </p>
              <p style={{ margin: '4px 0' }}>
                <strong>Total:</strong> RM {Number(order.total_amount || 0).toFixed(2)}
              </p>

              <div style={{ marginTop: '12px', marginBottom: '12px' }}>
                <strong>Items:</strong>
                <ul style={{ marginTop: '8px' }}>
                  {(order.order_items || []).map((item) => (
                    <li key={item.id}>
                      {item.item_name} × {item.qty}
                    </li>
                  ))}
                </ul>
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {order.status === 'pending' ? (
                  <button
                    onClick={() => updateStatus(order.id, 'brewing')}
                    disabled={loadingId === order.id}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                    }}
                  >
                    Send to Brew
                  </button>
                ) : null}

                {order.status === 'brewing' ? (
                  <button
                    onClick={() => updateStatus(order.id, 'ready')}
                    disabled={loadingId === order.id}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                    }}
                  >
                    Order Ready
                  </button>
                ) : null}

                {order.status === 'ready' ? (
                  <span style={{ fontWeight: 'bold' }}>Ready for pickup</span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
