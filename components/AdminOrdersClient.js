'use client'

import { useEffect, useState } from 'react'
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
      label: 'Sent to Brew',
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

function getDrinkCode(itemName) {
  const map = {
    Americano: 'A',
    Latte: 'L',
    Espresso: 'E',
    'Flat White': 'FW',
    Cappuccino: 'CAP',
    'Piccolo Latte': 'P',
    Chocolate: 'C',
    Mocha: 'MC',
    'Matcha Latte': 'M',
    'Dirty Matcha Latte': 'DM',
  }

  return map[itemName] || ''
}

function speakOrderReady(orderNumber) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return

  const spokenOrder = String(orderNumber).replace(/-/g, ' ')
  const utterance = new SpeechSynthesisUtterance(
    `Order number ${spokenOrder} is ready for pickup`
  )
  utterance.rate = 0.7
  utterance.pitch = 1
  utterance.volume = 1

  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(utterance)
}

export default function AdminOrdersClient({
  orders = [],
  menus = [],
  settings = {
    id: 1,
    show_prices: false,
    daily_cup_limit: 100,
    order_prefix: 'ORD',
    order_start_number: 1,
  },
  cupsServedToday = 0,
}) {
  const router = useRouter()
  const [loadingId, setLoadingId] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [dailyCupLimit, setDailyCupLimit] = useState(
    settings.daily_cup_limit || 100
  )
  const [orderPrefix, setOrderPrefix] = useState(
    settings.order_prefix || 'ORD'
  )
  const [orderStartNumber, setOrderStartNumber] = useState(
    settings.order_start_number || 1
  )
  const [isMounted, setIsMounted] = useState(false)
  const [announcementEnabled, setAnnouncementEnabled] = useState(true)

  const [editOrderId, setEditOrderId] = useState(null)
  const [editForm, setEditForm] = useState({
    customer_name: '',
    queue_number: '',
    eta_minutes: '',
    status: 'pending',
  })

  useEffect(() => {
    setIsMounted(true)

    const savedSetting = window.localStorage.getItem('announcementEnabled')
    if (savedSetting !== null) {
      setAnnouncementEnabled(savedSetting === 'true')
    }
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh()
    }, 5000)

    return () => clearInterval(interval)
  }, [router])

  function toggleAnnouncement() {
    const nextValue = !announcementEnabled
    setAnnouncementEnabled(nextValue)
    window.localStorage.setItem('announcementEnabled', String(nextValue))
  }

  function replayAnnouncement(orderNumber) {
    if (!announcementEnabled) return
    speakOrderReady(orderNumber)
  }

  function startEdit(order) {
    setEditOrderId(order.id)
    setEditForm({
      customer_name: order.customer_name || '',
      queue_number: order.queue_number || '',
      eta_minutes: order.eta_minutes || '',
      status: order.status || 'pending',
    })
  }

  function cancelEdit() {
    setEditOrderId(null)
    setEditForm({
      customer_name: '',
      queue_number: '',
      eta_minutes: '',
      status: 'pending',
    })
  }

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin/login')
    router.refresh()
  }

  async function updateStatus(orderId, status, orderNumber) {
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

      if (status === 'ready' && announcementEnabled) {
        speakOrderReady(orderNumber)
      }

      router.refresh()
    } catch (error) {
      setErrorMessage(error.message || 'Something went wrong.')
    } finally {
      setLoadingId(null)
    }
  }

  async function saveEditedOrder(orderId) {
    try {
      setErrorMessage('')
      setLoadingId(`edit-${orderId}`)

      const response = await fetch('/api/orders/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          customer_name: editForm.customer_name,
          queue_number: Number(editForm.queue_number),
          eta_minutes: Number(editForm.eta_minutes),
          status: editForm.status,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update order.')
      }

      cancelEdit()
      router.refresh()
    } catch (error) {
      setErrorMessage(error.message || 'Something went wrong.')
    } finally {
      setLoadingId(null)
    }
  }

  async function deleteOrder(orderId) {
    const confirmed = window.confirm(
      'Delete this order? This cannot be undone.'
    )
    if (!confirmed) return

    try {
      setErrorMessage('')
      setLoadingId(`delete-${orderId}`)

      const response = await fetch('/api/orders/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete order.')
      }

      if (editOrderId === orderId) {
        cancelEdit()
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

  async function resetNumbering() {
    try {
      setErrorMessage('')
      setLoadingId('reset-numbering')

      const response = await fetch('/api/orders/reset-numbering', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_prefix: orderPrefix,
          order_start_number: Number(orderStartNumber),
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to reset numbering.')
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

  return (
    <main
      style={{
        padding: '24px',
        fontFamily: 'Arial, sans-serif',
        maxWidth: '1100px',
        margin: '0 auto',
      }}
    >
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
            padding: '12px 16px',
            borderRadius: '10px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 'bold',
            background: '#111',
            color: '#fff',
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
          borderRadius: '14px',
          padding: '18px',
          background: '#fff',
          color: '#111',
          marginBottom: '24px',
        }}
      >
        <h2 style={{ marginBottom: '12px' }}>Daily Cup Limit</h2>

        <p style={{ marginBottom: '8px' }}>
          Cups served today: <strong>{isMounted ? cupsServedToday : '-'}</strong>
        </p>

        <p style={{ marginBottom: '12px' }}>
          Daily limit: <strong>{settings.daily_cup_limit}</strong>
        </p>

        <div
          style={{
            display: 'flex',
            gap: '10px',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <input
            type="number"
            min="1"
            value={dailyCupLimit}
            onChange={(e) => setDailyCupLimit(e.target.value)}
            style={{
              padding: '12px',
              borderRadius: '10px',
              border: '1px solid #ccc',
              width: '120px',
            }}
          />

          <button
            onClick={() =>
              updateSetting({ daily_cup_limit: Number(dailyCupLimit) })
            }
            disabled={loadingId === 'settings'}
            style={{
              padding: '12px 16px',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 'bold',
              background: '#111',
              color: '#fff',
            }}
          >
            Save Limit
          </button>

          <a
            href="/api/orders/export"
            style={{
              padding: '12px 16px',
              borderRadius: '10px',
              textDecoration: 'none',
              fontWeight: 'bold',
              background: '#111',
              color: '#fff',
            }}
          >
            Export Orders CSV
          </a>
        </div>

        <div style={{ marginTop: '20px' }}>
          <h3 style={{ marginBottom: '10px' }}>Order Number Format</h3>

          <div
            style={{
              display: 'flex',
              gap: '10px',
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            <input
              type="text"
              value={orderPrefix}
              onChange={(e) => setOrderPrefix(e.target.value)}
              placeholder="Prefix"
              style={{
                padding: '12px',
                borderRadius: '10px',
                border: '1px solid #ccc',
                width: '120px',
              }}
            />

            <input
              type="number"
              min="1"
              value={orderStartNumber}
              onChange={(e) => setOrderStartNumber(e.target.value)}
              placeholder="Start Number"
              style={{
                padding: '12px',
                borderRadius: '10px',
                border: '1px solid #ccc',
                width: '140px',
              }}
            />

            <button
              onClick={() =>
                updateSetting({
                  order_prefix: orderPrefix,
                  order_start_number: Number(orderStartNumber),
                })
              }
              disabled={loadingId === 'settings'}
              style={{
                padding: '12px 16px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 'bold',
                background: '#111',
                color: '#fff',
              }}
            >
              Save Order Format
            </button>

            <button
              onClick={resetNumbering}
              disabled={loadingId === 'reset-numbering'}
              style={{
                padding: '12px 16px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 'bold',
                background: '#2563eb',
                color: '#fff',
              }}
            >
              Reset Numbering
            </button>
          </div>

          <p style={{ marginTop: '10px', color: '#666' }}>
            Example:{' '}
            {orderPrefix
              ? `${orderPrefix}-${Number(orderStartNumber || 1)}`
              : Number(orderStartNumber || 1)}
          </p>
        </div>

        <div style={{ marginTop: '20px' }}>
          <h3 style={{ marginBottom: '10px' }}>Announcement Sound</h3>

          <button
            onClick={toggleAnnouncement}
            style={{
              padding: '12px 16px',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 'bold',
              background: announcementEnabled ? '#16a34a' : '#991b1b',
              color: '#fff',
            }}
          >
            {announcementEnabled ? 'Sound ON' : 'Sound OFF'}
          </button>
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
            borderRadius: '14px',
            padding: '18px',
            background: '#fff',
            color: '#111',
          }}
        >
          <p style={{ marginBottom: '12px' }}>
            Customer menu prices are currently:{' '}
            <strong>{settings.show_prices ? 'Shown' : 'Hidden'}</strong>
          </p>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={() => updateSetting({ show_prices: true })}
              disabled={loadingId === 'settings'}
              style={{
                padding: '12px 16px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 'bold',
                background: '#111',
                color: '#fff',
              }}
            >
              Show Prices
            </button>

            <button
              onClick={() => updateSetting({ show_prices: false })}
              disabled={loadingId === 'settings'}
              style={{
                padding: '12px 16px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 'bold',
                background: '#111',
                color: '#fff',
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
                borderRadius: '14px',
                padding: '18px',
                background: '#fff',
                color: '#111',
              }}
            >
              <div style={{ marginBottom: '8px', fontWeight: 'bold', fontSize: '22px' }}>
                {menu.name}{' '}
                <span style={{ color: '#666', fontSize: '16px' }}>
                  ({menu.code})
                </span>
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
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    background: '#111',
                    color: '#fff',
                  }}
                >
                  Available
                </button>

                <button
                  onClick={() => updateMenu(menu.id, { sold_out: true })}
                  disabled={loadingId === `menu-${menu.id}`}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    background: '#111',
                    color: '#fff',
                  }}
                >
                  Sold Out
                </button>
              </div>

              <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>
                Milk Availability
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  onClick={() =>
                    updateMenu(menu.id, {
                      regular_milk_available: !menu.regular_milk_available,
                    })
                  }
                  disabled={loadingId === `menu-${menu.id}`}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    background: '#111',
                    color: '#fff',
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
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    background: '#111',
                    color: '#fff',
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
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    background: '#111',
                    color: '#fff',
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
              const orderNumber = order.order_number || `${order.id}`
              const lockOrderActions =
                order.status === 'brewing' || order.status === 'ready'

              return (
                <div
                  key={order.id}
                  style={{
                    border: '1px solid #ddd',
                    borderRadius: '14px',
                    padding: '18px',
                    background: '#fff',
                    color: '#111',
                  }}
                >
                  <div style={{ marginBottom: '10px', fontWeight: 'bold', fontSize: '28px' }}>
                    {orderNumber}
                  </div>

                  <div style={{ marginBottom: '12px', fontWeight: 'bold', fontSize: '22px' }}>
                    {order.customer_name || 'Guest'}
                  </div>

                  <div
                    style={{
                      display: 'inline-block',
                      marginBottom: '12px',
                      padding: '10px 14px',
                      borderRadius: '999px',
                      background: statusStyle.background,
                      color: statusStyle.color,
                      fontWeight: 'bold',
                      fontSize: '16px',
                    }}
                  >
                    {statusStyle.label}
                  </div>

                  <p style={{ margin: '4px 0' }}>
                    <strong>Queue:</strong> {order.queue_number}
                  </p>
                  <p style={{ margin: '4px 0' }}>
                    <strong>ETA:</strong> {order.eta_minutes} mins
                  </p>
                  <p style={{ margin: '4px 0' }}>
                    <strong>Total:</strong> RM {Number(order.total_amount || 0).toFixed(2)}
                  </p>

                  <div style={{ marginTop: '14px', marginBottom: '14px' }}>
                    <strong style={{ display: 'block', marginBottom: '10px' }}>Items:</strong>
                    <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                      {(order.order_items || []).map((item) => {
                        const code = getDrinkCode(item.item_name)

                        return (
                          <li key={item.id} style={{ marginBottom: '8px' }}>
                            <span style={{ fontWeight: 'bold', fontSize: '18px' }}>
                              {code ? `${code} - ` : ''}
                            </span>
                            <span style={{ fontWeight: 'bold' }}>{item.item_name}</span>
                            {` × ${item.qty}`}
                            {item.temperature ? ` • ${item.temperature}` : ''}
                            {item.milk_type ? ` • ${item.milk_type}` : ''}
                          </li>
                        )
                      })}
                    </ul>
                  </div>

                  {editOrderId === order.id ? (
                    <div
                      style={{
                        display: 'grid',
                        gap: '10px',
                        marginBottom: '14px',
                        padding: '12px',
                        borderRadius: '10px',
                        background: '#f3f4f6',
                      }}
                    >
                      <input
                        type="text"
                        value={editForm.customer_name}
                        onChange={(e) =>
                          setEditForm((prev) => ({
                            ...prev,
                            customer_name: e.target.value,
                          }))
                        }
                        placeholder="Customer name"
                        style={{
                          padding: '10px',
                          borderRadius: '8px',
                          border: '1px solid #ccc',
                        }}
                      />

                      <input
                        type="number"
                        value={editForm.queue_number}
                        onChange={(e) =>
                          setEditForm((prev) => ({
                            ...prev,
                            queue_number: e.target.value,
                          }))
                        }
                        placeholder="Queue number"
                        style={{
                          padding: '10px',
                          borderRadius: '8px',
                          border: '1px solid #ccc',
                        }}
                      />

                      <input
                        type="number"
                        value={editForm.eta_minutes}
                        onChange={(e) =>
                          setEditForm((prev) => ({
                            ...prev,
                            eta_minutes: e.target.value,
                          }))
                        }
                        placeholder="ETA minutes"
                        style={{
                          padding: '10px',
                          borderRadius: '8px',
                          border: '1px solid #ccc',
                        }}
                      />

                      <select
                        value={editForm.status}
                        onChange={(e) =>
                          setEditForm((prev) => ({
                            ...prev,
                            status: e.target.value,
                          }))
                        }
                        style={{
                          padding: '10px',
                          borderRadius: '8px',
                          border: '1px solid #ccc',
                        }}
                      >
                        <option value="pending">Pending</option>
                        <option value="brewing">Brewing</option>
                        <option value="ready">Ready</option>
                      </select>

                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => saveEditedOrder(order.id)}
                          disabled={loadingId === `edit-${order.id}`}
                          style={{
                            padding: '12px 16px',
                            borderRadius: '10px',
                            border: 'none',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            background: '#2563eb',
                            color: '#fff',
                          }}
                        >
                          Save
                        </button>

                        <button
                          onClick={cancelEdit}
                          style={{
                            padding: '12px 16px',
                            borderRadius: '10px',
                            border: 'none',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            background: '#6b7280',
                            color: '#fff',
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : null}

                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {order.status === 'pending' ? (
                      <button
                        onClick={() => updateStatus(order.id, 'brewing', orderNumber)}
                        disabled={loadingId === `order-${order.id}`}
                        style={{
                          padding: '12px 18px',
                          borderRadius: '10px',
                          border: 'none',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          background: '#f59e0b',
                          color: '#111',
                        }}
                      >
                        Send to Brew
                      </button>
                    ) : null}

                    {order.status === 'brewing' ? (
                      <button
                        onClick={() => updateStatus(order.id, 'ready', orderNumber)}
                        disabled={loadingId === `order-${order.id}`}
                        style={{
                          padding: '12px 18px',
                          borderRadius: '10px',
                          border: 'none',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          background: '#16a34a',
                          color: '#fff',
                        }}
                      >
                        Order Ready
                      </button>
                    ) : null}

                    <button
                      onClick={() => replayAnnouncement(orderNumber)}
                      disabled={!announcementEnabled}
                      style={{
                        padding: '12px 18px',
                        borderRadius: '10px',
                        border: 'none',
                        cursor: announcementEnabled ? 'pointer' : 'not-allowed',
                        fontWeight: 'bold',
                        background: announcementEnabled ? '#7c3aed' : '#9ca3af',
                        color: '#fff',
                        opacity: announcementEnabled ? 1 : 0.6,
                      }}
                    >
                      Replay
                    </button>

                    <button
                      onClick={() => startEdit(order)}
                      disabled={lockOrderActions}
                      style={{
                        padding: '12px 18px',
                        borderRadius: '10px',
                        border: 'none',
                        cursor: lockOrderActions ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold',
                        background: lockOrderActions ? '#9ca3af' : '#2563eb',
                        color: '#fff',
                        opacity: lockOrderActions ? 0.6 : 1,
                      }}
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => deleteOrder(order.id)}
                      disabled={loadingId === `delete-${order.id}` || lockOrderActions}
                      style={{
                        padding: '12px 18px',
                        borderRadius: '10px',
                        border: 'none',
                        cursor: lockOrderActions ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold',
                        background: lockOrderActions ? '#9ca3af' : '#dc2626',
                        color: '#fff',
                        opacity: lockOrderActions ? 0.6 : 1,
                      }}
                    >
                      Delete
                    </button>

                    {order.status === 'ready' ? (
                      <span style={{ fontWeight: 'bold', color: '#166534', fontSize: '18px' }}>
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
