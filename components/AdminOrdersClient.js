'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

function getStatusStyle(status) {
  if (status === 'pending') {
    return {
      background: '#fee2e2',
      color: '#991b1b',
      label: 'Order Received',
    }
  }

  if (status === 'brewing') {
    return {
      background: '#fef3c7',
      color: '#92400e',
      label: 'Send to Brew',
    }
  }

  if (status === 'ready') {
    return {
      background: '#dcfce7',
      color: '#166534',
      label: 'Order Ready',
    }
  }

  return {
    background: '#e5e7eb',
    color: '#111827',
    label: status,
  }
}

export default function AdminOrdersClient({ orders, menus, settings }) {
  const router = useRouter()
  const [loadingId, setLoadingId] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [dailyCupLimit, setDailyCupLimit] = useState(settings.daily_cup_limit || 100)
    async function handleLogout() {
      await fetch('/api/admin/logout', { method: 'POST' })
      router.push('/admin/login')
      router.refresh()
    }
    
  async function updateStatus(orderId, status) {
    try {
      setErrorMessage('')
      setLoadingId(`order-${orderId}`)

      const response = await fetch('/api/orders/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  async function updateSetting(payload) {
    try {
      setErrorMessage('')
      setLoadingId('settings')

      const response = await fetch('/api/settings/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update settings.')
      }

      router.refresh()
    } catch (error) {
      setErrorMessage(error.message || 'Something went wrong.')
    } finally {
      setLoadingId(null)
    }
  }

  async function updateMenu(id, updates) {
    try {
      setErrorMessage('')
      setLoadingId(`menu-${id}`)

      const response = await fetch('/api/menus/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, updates }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update menu.')
      }

      router.refresh()
    } catch (error) {
      setErrorMessage(error.message || 'Something went wrong.')
    } finally {
      setLoadingId(null)
    }
  }

  const cupsServedToday = orders
    .filter((order) => {
      const today = new Date().toISOString().slice(0, 10)
      return (order.created_at || '').slice(0, 10) === today
    })
    .flatMap((order) => order.order_items || [])
    .reduce((sum, item) => sum + Number(item.qty || 0), 0)

  return (
    <main style={{ padding: '24px', fontFamily: 'Arial, sans-serif' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
            }}
          >
            <h1 style={{ margin: 0 }}>Admin Panel</h1>

            <button
              onClick={handleLogout}
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              Logout
            </button>
          </div>

      {errorMessage ? (
        <p style={{ color: 'tomato', marginBottom: '16px' }}>{errorMessage}</p>
      ) : null}

      <div
        style={{
          border: '1px solid #ddd',
          borderRadius: '12px',
          padding: '16px',
          background: '#fff',
          color: '#111',
          marginBottom: '24px',
        }}
      >
        <h2 style={{ marginBottom: '12px' }}>Daily Cup Limit</h2>
        <p style={{ marginBottom: '8px' }}>
          Cups served today: <strong>{cupsServedToday}</strong>
        </p>
        <p style={{ marginBottom: '12px' }}>
          Daily limit: <strong>{settings.daily_cup_limit}</strong>
        </p>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="number"
            min="1"
            value={dailyCupLimit}
            onChange={(e) => setDailyCupLimit(e.target.value)}
            style={{
              padding: '10px',
              borderRadius: '8px',
              border: '1px solid #ccc',
              width: '120px',
            }}
          />

          <button
            onClick={() => updateSetting({ daily_cup_limit: Number(dailyCupLimit) })}
            disabled={loadingId === 'settings'}
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            Save Limit
          </button>

          <a
            href="/api/orders/export"
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 'bold',
              background: '#111',
              color: '#fff',
            }}
          >
            Export Orders CSV
          </a>
        </div>
      </div>

      <details style={{ marginBottom: '24px' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 'bold', fontSize: '18px' }}>
          Price Visibility
        </summary>

        <div
          style={{
            marginTop: '12px',
            border: '1px solid #ddd',
            borderRadius: '12px',
            padding: '16px',
            background: '#fff',
            color: '#111',
          }}
        >
          <p style={{ marginBottom: '12px' }}>
            Customer menu prices are currently: <strong>{settings.show_prices ? 'Shown' : 'Hidden'}</strong>
          </p>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => updateSetting({ show_prices: true })}
              disabled={loadingId === 'settings'}
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              Show Prices
            </button>

            <button
              onClick={() => updateSetting({ show_prices: false })}
              disabled={loadingId === 'settings'}
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              Hide Prices
            </button>
          </div>
        </div>
      </details>

      <details style={{ marginBottom: '32px' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 'bold', fontSize: '18px' }}>
          Menu Controls
        </summary>

        <div style={{ display: 'grid', gap: '16px', marginTop: '12px' }}>
          {menus.map((menu) => (
            <div
              key={menu.id}
              style={{
                border: '1px solid #ddd',
                borderRadius: '12px',
                padding: '16px',
                background: '#fff',
                color: '#111',
              }}
            >
              <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>
                {menu.name} <span style={{ color: '#666' }}>({menu.code})</span>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <strong>Status:</strong>{' '}
                <span style={{ color: menu.sold_out ? '#991b1b' : '#166534' }}>
                  {menu.sold_out ? 'SOLD OUT' : 'AVAILABLE'}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
                <button
                  onClick={() => updateMenu(menu.id, { sold_out: false })}
                  disabled={loadingId === `menu-${menu.id}`}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                  }}
                >
                  Available
                </button>

                <button
                  onClick={() => updateMenu(menu.id, { sold_out: true })}
                  disabled={loadingId === `menu-${menu.id}`}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                  }}
                >
                  Sold Out
                </button>
              </div>

              <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>Milk Availability</div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  onClick={() =>
                    updateMenu(menu.id, {
                      regular_milk_available: !menu.regular_milk_available,
                    })
                  }
                  disabled={loadingId === `menu-${menu.id}`}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                  }}
                >
                  Regular: {menu.regular_milk_available ? 'ON' : 'OFF'}
                </button>

                <button
                  onClick={() =>
                    updateMenu(menu.id, {
                      oat_milk_available: !menu.oat_milk_available,
                    })
                  }
                  disabled={loadingId === `menu-${menu.id}`}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                  }}
                >
                  Oat: {menu.oat_milk_available ? 'ON' : 'OFF'}
                </button>

                <button
                  onClick={() =>
                    updateMenu(menu.id, {
                      almond_milk_available: !menu.almond_milk_available,
                    })
                  }
                  disabled={loadingId === `menu-${menu.id}`}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                  }}
                >
                  Almond: {menu.almond_milk_available ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </details>

      <section>
        <h2 style={{ marginBottom: '12px' }}>Orders</h2>

        {!orders || orders.length === 0 ? (
          <p>No orders yet.</p>
        ) : (
          <div style={{ display: 'grid', gap: '16px' }}>
            {orders.map((order) => {
              const statusStyle = getStatusStyle(order.status)

              return (
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

                  <div
                    style={{
                      display: 'inline-block',
                      marginBottom: '12px',
                      padding: '8px 12px',
                      borderRadius: '999px',
                      background: statusStyle.background,
                      color: statusStyle.color,
                      fontWeight: 'bold',
                    }}
                  >
                    {statusStyle.label}
                  </div>

                  <p style={{ margin: '4px 0' }}>
                    <strong>Queue:</strong> {order.queue_number}
                  </p>
                  <p style={{ margin: '4px 0' }}>
                    <strong>Customer:</strong> {order.customer_name || 'Guest'}
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
                          {item.temperature ? ` • ${item.temperature}` : ''}
                          {item.milk_type ? ` • ${item.milk_type}` : ''}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {order.status === 'pending' ? (
                      <button
                        onClick={() => updateStatus(order.id, 'brewing')}
                        disabled={loadingId === `order-${order.id}`}
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
                        disabled={loadingId === `order-${order.id}`}
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
                      <span style={{ fontWeight: 'bold', color: '#166534' }}>
                        Ready for pickup
                      </span>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}
