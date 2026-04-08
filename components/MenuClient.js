'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

function requiresMilk(drinkName) {
  return !['Americano', 'Espresso'].includes(drinkName)
}

function getAvailableMilkOptions(item) {
  const options = []

  if (item.regular_milk_available) options.push('Regular')
  if (item.oat_milk_available) options.push('Oat')
  if (item.almond_milk_available) options.push('Almond')

  return options
}

function getCartKey(item) {
  return `${item.id}-${item.temperature || 'na'}-${item.milk_type || 'na'}`
}

export default function MenuClient({ menus, showPrices }) {
  const router = useRouter()
  const [cart, setCart] = useState([])
  const [customerName, setCustomerName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [selectedOptions, setSelectedOptions] = useState({})
  const [animatedCard, setAnimatedCard] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})

  function updateOption(itemId, key, value) {
    setSelectedOptions((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [key]: value,
      },
    }))

    setFieldErrors((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [key]: false,
      },
    }))
  }

  function getSelectedTemperature(item) {
    return selectedOptions[item.id]?.temperature || ''
  }

  function getSelectedMilk(item) {
    return selectedOptions[item.id]?.milk_type || ''
  }

  function getSelectedCartQuantity(item) {
    const selectedTemperature = getSelectedTemperature(item)
    const selectedMilk = requiresMilk(item.name) ? getSelectedMilk(item) : ''

    if (!selectedTemperature) return 0
    if (requiresMilk(item.name) && !selectedMilk) return 0

    const cartKey = getCartKey({
      ...item,
      temperature: selectedTemperature,
      milk_type: selectedMilk,
    })

    const existing = cart.find((entry) => entry.cartKey === cartKey)
    return existing ? existing.qty : 0
  }

  function triggerCardAnimation(itemId) {
    setAnimatedCard(itemId)
    setTimeout(() => {
      setAnimatedCard(null)
    }, 450)
  }

  function getTotalCupCount() {
    return cart.reduce((sum, item) => sum + item.qty, 0)
  }

  function addToCart(item) {
    if (item.sold_out) return

    const selectedTemperature = getSelectedTemperature(item)
    const selectedMilk = requiresMilk(item.name) ? getSelectedMilk(item) : ''

    const nextErrors = {
      temperature: !selectedTemperature,
      milk_type: requiresMilk(item.name) && !selectedMilk,
    }

    setFieldErrors((prev) => ({
      ...prev,
      [item.id]: nextErrors,
    }))

    if (!selectedTemperature || (requiresMilk(item.name) && !selectedMilk)) {
      return
    }

    const totalCupCount = getTotalCupCount()

    if (totalCupCount >= 5) {
      setErrorMessage('Maximum 5 cups allowed per order.')
      return
    }

    setErrorMessage('')

    const cartItem = {
      ...item,
      temperature: selectedTemperature,
      milk_type: selectedMilk,
    }

    const cartKey = getCartKey(cartItem)

    setCart((prev) => {
      const existing = prev.find((entry) => entry.cartKey === cartKey)

      if (existing) {
        return prev.map((entry) =>
          entry.cartKey === cartKey
            ? { ...entry, qty: entry.qty + 1 }
            : entry
        )
      }

      return [...prev, { ...cartItem, qty: 1, cartKey }]
    })

    triggerCardAnimation(item.id)
  }

  function removeFromCart(cartKey) {
    setCart((prev) => {
      const existing = prev.find((item) => item.cartKey === cartKey)
      if (!existing) return prev

      if (existing.qty === 1) {
        return prev.filter((item) => item.cartKey !== cartKey)
      }

      return prev.map((item) =>
        item.cartKey === cartKey ? { ...item, qty: item.qty - 1 } : item
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

    if (totalItems > 5) {
      setErrorMessage('Maximum 5 cups allowed per order.')
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
      setSelectedOptions({})
      setFieldErrors({})

      router.push(`/order/${encodeURIComponent(result.orderId)}`)
    } catch (error) {
      setErrorMessage(error.message || 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main style={{ padding: '24px', fontFamily: 'Arial, sans-serif' }}>
      <style>{`
        @keyframes popCard {
          0% { transform: scale(1); }
          50% { transform: scale(1.02); }
          100% { transform: scale(1); }
        }
      `}</style>

      <h1 style={{ marginBottom: '24px' }}>Drinks Menu</h1>

      {errorMessage ? (
        <p style={{ color: 'tomato', marginBottom: '16px' }}>{errorMessage}</p>
      ) : null}

      <div style={{ marginBottom: '16px', fontWeight: 'bold' }}>
        Maximum 5 cups per order
      </div>

      <div style={{ display: 'grid', gap: '20px', marginBottom: '32px' }}>
        {menus.map((item) => {
          const milkOptions = getAvailableMilkOptions(item)
          const needsMilk = requiresMilk(item.name)
          const isSoldOut = item.sold_out
          const selectedQty = getSelectedCartQuantity(item)
          const itemErrors = fieldErrors[item.id] || {}

          return (
            <div
              key={item.id}
              style={{
                border: '1px solid #ddd',
                borderRadius: '16px',
                padding: '16px',
                background: '#fff',
                color: '#111',
                opacity: isSoldOut ? 0.65 : 1,
                animation: animatedCard === item.id ? 'popCard 0.45s ease' : 'none',
              }}
            >
              {item.image_url ? (
                <img
                  src={item.image_url}
                  alt={item.name}
                  style={{
                    width: '100%',
                    maxWidth: '220px',
                    borderRadius: '12px',
                    marginBottom: '12px',
                    display: 'block',
                  }}
                />
              ) : null}

              <h2 style={{ margin: '0 0 8px' }}>{item.name}</h2>
              <p style={{ margin: '0 0 12px', color: '#666' }}>{item.description}</p>

              {showPrices ? (
                <p style={{ margin: '0 0 12px', fontWeight: 'bold' }}>
                  RM {Number(item.price).toFixed(2)}
                </p>
              ) : null}

              {isSoldOut ? (
                <div
                  style={{
                    marginBottom: '14px',
                    display: 'inline-block',
                    padding: '8px 12px',
                    background: '#fee2e2',
                    color: '#991b1b',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                  }}
                >
                  SOLD OUT
                </div>
              ) : null}

              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
                  Temperature <span style={{ color: 'tomato' }}>*</span>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {item.hot_available ? (
                    <button
                      type="button"
                      onClick={() => updateOption(item.id, 'temperature', 'Hot')}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid #ccc',
                        background: getSelectedTemperature(item) === 'Hot' ? '#111' : '#fff',
                        color: getSelectedTemperature(item) === 'Hot' ? '#fff' : '#111',
                        cursor: 'pointer',
                      }}
                    >
                      Hot
                    </button>
                  ) : null}

                  {item.cold_available ? (
                    <button
                      type="button"
                      onClick={() => updateOption(item.id, 'temperature', 'Cold')}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid #ccc',
                        background: getSelectedTemperature(item) === 'Cold' ? '#111' : '#fff',
                        color: getSelectedTemperature(item) === 'Cold' ? '#fff' : '#111',
                        cursor: 'pointer',
                      }}
                    >
                      Cold
                    </button>
                  ) : null}
                </div>

                {itemErrors.temperature ? (
                  <p style={{ color: 'tomato', marginTop: '8px', fontWeight: 'bold' }}>
                    Please select temperature - required
                  </p>
                ) : null}
              </div>

              {needsMilk ? (
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
                    Milk <span style={{ color: 'tomato' }}>*</span>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {milkOptions.map((milk) => (
                      <button
                        key={milk}
                        type="button"
                        onClick={() => updateOption(item.id, 'milk_type', milk)}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '8px',
                          border: '1px solid #ccc',
                          background: getSelectedMilk(item) === milk ? '#111' : '#fff',
                          color: getSelectedMilk(item) === milk ? '#fff' : '#111',
                          cursor: 'pointer',
                        }}
                      >
                        {milk}
                      </button>
                    ))}
                  </div>

                  {itemErrors.milk_type ? (
                    <p style={{ color: 'tomato', marginTop: '8px', fontWeight: 'bold' }}>
                      Please select milk - required
                    </p>
                  ) : null}
                </div>
              ) : null}

              <button
                onClick={() => addToCart(item)}
                disabled={isSoldOut}
                style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: 'none',
                  cursor: isSoldOut ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  background: isSoldOut ? '#ddd' : selectedQty > 0 ? '#16a34a' : '#111',
                  color: isSoldOut ? '#666' : '#fff',
                  transition: 'all 0.2s ease',
                }}
              >
                {isSoldOut
                  ? 'Unavailable'
                  : selectedQty > 0
                    ? `Added • ${selectedQty}`
                    : 'Add to Cart'}
              </button>
            </div>
          )
        })}
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
                  key={item.cartKey}
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
                    <div>{item.temperature}</div>
                    {item.milk_type ? <div>{item.milk_type}</div> : null}
                    {showPrices ? (
                      <div>
                        RM {Number(item.price).toFixed(2)} × {item.qty}
                      </div>
                    ) : (
                      <div>Qty × {item.qty}</div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => removeFromCart(item.cartKey)}>-</button>
                    <button
                      onClick={() => {
                        if (totalItems >= 5) {
                          setErrorMessage('Maximum 5 cups allowed per order.')
                          return
                        }
                        addToCart(item)
                      }}
                    >
                      +
                    </button>
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

            {showPrices ? (
              <p style={{ fontWeight: 'bold' }}>
                Total: RM {totalPrice.toFixed(2)}
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
