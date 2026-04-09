'use client'

import { useEffect, useRef, useState } from 'react'

function getStepStatus(status) {
  if (status === 'pending') return 1
  if (status === 'brewing') return 2
  if (status === 'ready') return 3
  return 1
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

function Step({ label, active, completed }) {
  return (
    <div style={{ flex: 1, textAlign: 'center', position: 'relative' }}>
      <div
        style={{
          width: '52px',
          height: '52px',
          borderRadius: '999px',
          margin: '0 auto 12px',
          background: completed || active ? '#3cc3b2' : '#cfcfcf',
          border: active ? '6px solid rgba(60,195,178,0.25)' : 'none',
          animation: active ? 'pulseBlink 1s infinite' : 'none',
        }}
      />
      <div
        style={{
          fontWeight: active ? 'bold' : 'normal',
          color: completed || active ? '#ffffff' : '#bdbdbd',
          whiteSpace: 'pre-line',
          lineHeight: 1.3,
        }}
      >
        {label}
      </div>
    </div>
  )
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
          `${newOrder.order_number || newOrder.id} is ready for pickup.`
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
        <h1>Track Your Order</h1>
        <p>Loading order...</p>
      </main>
    )
  }

  if (errorMessage) {
    return (
      <main style={{ padding: '24px', fontFamily: 'Arial, sans-serif' }}>
        <h1>Track Your Order</h1>
        <p style={{ color: 'tomato' }}>{errorMessage}</p>
      </main>
    )
  }

  if (!order) {
    return (
      <main style={{ padding: '24px', fontFamily: 'Arial, sans-serif' }}>
        <h1>Track Your Order</h1>
        <p>Order not found.</p>
      </main>
    )
  }

  const currentStep = getStepStatus(order.status)

  return (
    <main
      style={{
        padding: '24px',
        fontFamily: 'Arial, sans-serif',
        maxWidth: '760px',
        margin: '0 auto',
      }}
    >
      <style>{`
        @keyframes pulseBlink {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.08); opacity: 0.65; }
        }
      `}</style>

      <div
        style={{
          background: '#ffffff',
          borderRadius: '24px',
          padding: '28px',
          color: '#111',
        }}
      >
        <h1
          style={{
            margin: '0 0 12px',
            fontSize: '42px',
            fontWeight: 'bold',
            textAlign: 'center',
          }}
        >
          Thanks for your order,
        </h1>

        <div
          style={{
            textAlign: 'center',
            fontSize: '32px',
            fontWeight: 'bold',
            marginBottom: '12px',
          }}
        >
          {order.customer_name || 'Guest'}
        </div>

        <div
          style={{
            textAlign: 'center',
            fontSize: '26px',
            fontWeight: 'bold',
            marginBottom: '28px',
          }}
        >
          {order.status === 'ready'
            ? 'Your drink is ready for pickup.'
            : order.status === 'brewing'
            ? 'Your drink is now brewing.'
            : 'We’ve got your order. It will be ready soon.'}
        </div>

        <div style={{ margin: '30px 0 18px', position: 'relative' }}>
          <div
            style={{
              position: 'absolute',
              top: '24px',
              left: '12%',
              right: '12%',
              height: '6px',
              background: '#cfcfcf',
              zIndex: 0,
            }}
          />

          <div
            style={{
              position: 'absolute',
              top: '24px',
              left: '12%',
              width:
                currentStep === 1
                  ? '0%'
                  : currentStep === 2
                  ? '38%'
                  : '76%',
              height: '6px',
              background: '#3cc3b2',
              zIndex: 1,
              transition: 'width 0.4s ease',
            }}
          />

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '16px',
              position: 'relative',
              zIndex: 2,
            }}
          >
            <Step
              label={'Order\nPlaced'}
              active={currentStep === 1}
              completed={currentStep > 1}
            />
            <Step
              label={'Brewing'}
              active={currentStep === 2}
              completed={currentStep > 2}
            />
            <Step
              label={'Ready for\nPickup'}
              active={currentStep === 3}
              completed={false}
            />
          </div>
        </div>

        <div style={{ marginTop: '28px', lineHeight: 1.8 }}>
          <div>
            <strong>Order Number:</strong> {order.order_number || order.id}
          </div>
          <div>
            <strong>Queue Number:</strong> {order.queue_number}
          </div>
          <div>
            <strong>Status:</strong>{' '}
            {order.status === 'pending'
              ? 'Pending'
              : order.status === 'brewing'
              ? 'Brewing'
              : 'Ready for pickup'}
          </div>
          <div>
            <strong>Estimated Wait:</strong> {order.eta_minutes} minutes
          </div>
        </div>

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
          <div
            style={{
              marginTop: '20px',
              padding: '16px',
              borderRadius: '12px',
              background: '#d1fae5',
              color: '#065f46',
              fontWeight: 'bold',
              textAlign: 'center',
              animation: 'pulseBlink 1s infinite',
            }}
          >
            *Please pick up your drink*
          </div>
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
      </div>
    </main>
  )
}
