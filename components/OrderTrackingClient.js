'use client'

import { useEffect, useRef, useState } from 'react'

function statusLabel(status) {
  if (status === 'pending') return 'Pending'
  if (status === 'brewing') return 'Brewing'
  if (status === 'ready') return 'Ready for pickup'
  return status
}

async function sendReadyNotification(title, body) {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (Notification.permission !== 'granted') return

  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration()

      if (registration && typeof registration.showNotification === 'function') {
        await registration.showNotification(title, { body })
        return
      }
    }

    if (typeof Notification === 'function') {
      new Notification(title, { body })
    }
  } catch (error) {
    console.error('Notification error:', error)
  }
}

export default function OrderTrackingClient({ orderId }) {
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [notificationEnabled, setNotificationEnabled] = useState(false)
  const previousStatusRef = useRef(null)

  async function requestNotificationPermission() {
    if (typeof window === 'undefined' || !('Notification' in window)) return

    try {
      if (Notification.permission === 'granted') {
        setNotificationEnabled(true)
        return
      }

      if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission()
        if (permission === 'granted') {
          setNotificationEnabled(true)
        }
      }
    } catch (error) {
      console.error('Permission error:', error)
    }
  }

  async function fetchOrder() {
    try {
      const response = await fetch(`/api/orders/${orderId}`, { cache: 'no-store' })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load order.')
      }

      const newOrder = result.order
      const previousStatus = previousStatusRef.current

      if (previousStatus && previousStatus !== 'ready' && newOrder?.status === 'ready') {
        await sendReadyNotification(
          'Your order is ready',
          `${newOrder.order_number || `ORD-${newOrder.id}`} is ready for pickup.`
        )
      }

      previousStatusRef.current = newOrder?.status || null
      setOrder(newOrder)
      setErrorMessage('')
    } catch (error) {
      setErrorMessage(error.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    requestNotificationPermission()
    fetchOrder()

    const interval = setInterval(fetchOrder, 5000)
    return () => clearInterval(interval)
  }, [orderId])

  if (loading) {
    return (
      <main style={{ padding: '24px', fontFamily: 'Arial, sans-serif' }}>
        <h1>Tracking Order</h1>
        <p>Loading order...</p>
      </main>
    )
  }

  if (errorMessage) {
    return (
      <main style={{ padding: '24px', fontFamily: 'Arial, sans-serif' }}>
        <h1>Tracking Order</h1>
        <p style={{ color: 'tomato' }}>{errorMessage}</p>
      </main>
    )
  }

  if (!order) {
    return (
      <main style={{ padding: '24px', fontFamily: 'Arial, sans-serif' }}>
        <h1>Tracking Order</h1>
        <p>Order not found.</p>
      </main>
    )
  }

  return (
    <main style={{ padding: '24px', fontFamily: 'Arial, sans-serif' }}>
      <style>{`
        @keyframes pickupBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.2; }
        }
      `}</style>

      <h1 style={{ marginBottom: '16px' }}>Track Your Order</h1>

      <p><strong>Order Number:</strong> {order.order_number || `ORD-${order.id}`}</p>
      <p><strong>Queue Number:</strong> {order.queue_number}</p>
      <p><strong>Status:</strong> {statusLabel(order.status)}</p>
      <p><strong>Estimated Wait:</strong> {order.eta_minutes} minutes</p>

      <div style={{ marginTop: '20px' }}>
        <strong>Items:</strong>
        <ul style={{ marginTop: '8px' }}>
          {(order.order_items || []).map((item) => (
            <li key={item.id}>
              {item.item_name} × {item.qty}
              {item.temperature ? ` • ${item.temperature}` : ''}
              {item.milk_type ? ` • ${item.milk_type}` : ''}
            </li>
          ))}
        </ul>
      </div>

      {order.status === 'ready' ? (
        <>
          <div
            style={{
              marginTop: '24px',
              padding: '16px',
              borderRadius: '12px',
              background: '#d1fae5',
              color: '#065f46',
              fontWeight: 'bold',
            }}
          >
            Your order is ready for pickup.
          </div>

          <div
            style={{
              marginTop: '16px',
              fontWeight: 'bold',
              fontSize: '22px',
              color: '#facc15',
              animation: 'pickupBlink 1s infinite',
            }}
          >
            *Please pick up your drink*
          </div>
        </>
      ) : null}

      <div style={{ marginTop: '20px' }}>
        <button
          onClick={requestNotificationPermission}
          style={{
            padding: '12px 16px',
            borderRadius: '10px',
            border: '1px solid #444',
            background: '#ffffff',
            color: '#111111',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '16px',
            minHeight: '48px',
            minWidth: '220px',
          }}
        >
          {notificationEnabled ? 'Notifications Enabled' : 'Enable Notifications'}
        </button>
      </div>

      <p style={{ marginTop: '20px', color: '#666' }}>
        This page refreshes automatically every 5 seconds.
      </p>
    </main>
  )
}
