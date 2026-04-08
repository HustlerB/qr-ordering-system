'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function MenuClient({ menus }) {
  const router = useRouter()
  const [cart, setCart] = useState([])
  const [customerName, setCustomerName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  function addToCart(item) {
    setCart((prev) => {
      const existing = prev.find((cartItem) => cartItem.id === item.id)

      if (existing) {
        return prev.map((cartItem) =>
          cartItem.id === item.id
            ? { ...cartItem, qty: cartItem.qty + 1 }
            : cartItem
        )
      }

      return [...prev, { ...item, qty: 1 }]
    })
  }

  function removeFromCart(id) {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === id)
      if (!existing) return prev

      if (existing.qty === 1) {
        return prev.filter((item) => item.id !== id)
      }

      return prev.map((item) =>
        item.id === id ? { ...item, qty: item.qty - 1 } : item
      )
    })
  }

  const totalItems = useMemo(
    () => cart.reduce((sum, item) => sum + item.qty, 0),
    [cart]
  )

  const totalPrice = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.price) * item.qty, 0),
    [cart]
  )

  async function placeOrder() {
    setErrorMessage('')

    if (cart.length === 0) {
      setErrorMessage('Please add at least one item.')
      return
    }

    try {
      setSubmitting(true)

      const response = await fetch('/api/orders/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerName,
          cart,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create order.')
      }

      setCart([])
      setCustomerName('')

      router.push(`/order/${encodeURIComponent(result.orderId)}`)
    } catch (error) {
      setErrorMessage(error.message || 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main style={{ padding: '24px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ marginBottom: '24px' }}>Drinks Menu</h1>

      <div style={{ display: 'grid', gap: '16px', marginBottom: '32px' }}>
        {menus.map((item) => (
          <div
            key={item.id}
            style={{
              border: '1px solid #ddd',
              borderRadius: '12px',
              padding: '16px',
              background: '#fff',
              color: '#111',
            }}
          >
            <h2 style={{ margin: '0 0 8px' }}>{item.name}</h2>
            <p style={{ margin: '0 0 8px', color: '#666' }}>
              {item.description}
            </p>
            <p style={{ margin: '0 0 12px', fontWeight: 'bold' }}>
              RM {Number(item.price).toFixed(2)}
            </p>

            <button
              onClick={() => addToCart(item)}
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              Add to Cart
            </button>
          </div>
        ))}
      </div>

      <section
        style={{
          borderTop: '1px solid #333',
          paddingTop: '24px',
        }}
      >
        <h2>Cart</h2>

        {cart.length === 0 ? (
          <p>Your cart is empty.</p>
        ) : (
          <>
            <div style={{ display: 'grid', gap: '12px', marginBottom: '16px' }}>
              {cart.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    border: '1px solid #ddd',
                    borderRadius: '10px',
                    padding: '12px',
                    background: '#fff',
                    color: '#111',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{item.name}</div>
                    <div>
                      RM {Number(item.price).toFixed(2)} × {item.qty}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => removeFromCart(item.id)}>-</button>
                    <button onClick={() => addToCart(item)}>+</button>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label
                htmlFor="customerName"
                style={{ display: 'block', marginBottom: '8px' }}
              >
                Your Name
              </label>
              <input
                id="customerName"
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter your name"
                style={{
                  width: '100%',
                  maxWidth: '320px',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #ccc',
                }}
              />
            </div>

            <p>Total items: {totalItems}</p>
            <p style={{ fontWeight: 'bold' }}>
              Total: RM {totalPrice.toFixed(2)}
            </p>

            {errorMessage ? (
              <p style={{ color: 'tomato', marginTop: '12px' }}>
                {errorMessage}
              </p>
            ) : null}

            <button
              onClick={placeOrder}
              disabled={submitting}
              style={{
                marginTop: '16px',
                padding: '12px 18px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 'bold',
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? 'Placing Order...' : 'Place Order'}
            </button>
          </>
        )}
      </section>
    </main>
  )
}
