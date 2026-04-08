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
  const [cartOpen, setCartOpen] = useState(false)

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
    }, 350)
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
      setCartOpen(false)

      router.push(`/order/${encodeURIComponent(result.orderId)}`)
    } catch (error) {
      setErrorMessage(error.message || 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main
      style={{
        padding: '16px',
        paddingBottom: cart.length > 0 ? '110px' : '24px',
        fontFamily: 'Arial, sans-serif',
        maxWidth: '520px',
        margin: '0 auto',
      }}
    >
      <style>{`
        @keyframes popCard {
          0% { transform: scale(1); }
          50% { transform: scale(1.02); }
          100% { transform: scale(1); }
        }
      `}</style>

      <h1 style={{ marginBottom: '12px', fontSize: '28px' }}>Drinks Menu</h1>

      <p style={{ marginBottom: '16px', color: '#666' }}>
        Maximum 5 cups per order
      </p>

      {errorMessage ? (
        <p style={{ color: 'tomato', marginBottom: '16px' }}>{errorMessage}</p>
      ) : null}

      <div style={{ display: 'grid', gap: '16px' }}>
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
                borderRadius: '18px',
                padding: '14px',
                background: '#fff',
                color: '#111',
                opacity: isSoldOut ? 0.6 : 1,
                animation: animatedCard === item.id ? 'popCard 0.35s ease' : 'none',
                boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
              }}
            >
              {item.image_url ? (
                <img
                  src={item.image_url}
                  alt={item.name}
                  style={{
                    width: '100%',
                    aspectRatio: '1 / 1',
                    objectFit: 'cover',
                    borderRadius: '14px',
                    marginBottom: '12px',
                    display: 'block',
                  }}
                />
              ) : null}

              <h2 style={{ margin: '0 0 6px', fontSize: '22px' }}>{item.name}</h2>
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
                    borderRadius: '999px',
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
                        padding: '10px 14px',
                        borderRadius: '999px',
                        border: '1px solid #ccc',
                        background: getSelectedTemperature(item) === 'Hot' ? '#111' : '#fff',
                        color: getSelectedTemperature(item) === 'Hot' ? '#fff' : '#111',
                        cursor: 'pointer',
                        minHeight: '42px',
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
                        padding: '10px 14px',
                        borderRadius: '999px',
                        border: '1px solid #ccc',
                        background: getSelectedTemperature(item) === 'Cold' ? '#111' : '#fff',
                        color: getSelectedTemperature(item) === 'Cold' ? '#fff' : '#111',
                        cursor: 'pointer',
                        minHeight: '42px',
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
                          padding: '10px 14px',
                          borderRadius: '999px',
                          border: '1px solid #ccc',
                          background: getSelectedMilk(item) === milk ? '#111' : '#fff',
                          color: getSelectedMilk(item) === milk ? '#fff' : '#111',
                          cursor: 'pointer',
                          minHeight: '42px',
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
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: '14px',
                  border: 'none',
                  cursor: isSoldOut ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  fontSize: '16px',
                  background: isSoldOut ? '#ddd' : selectedQty > 0 ? '#16a34a' : '#111',
                  color: isSoldOut ? '#666' : '#fff',
                  minHeight: '48px',
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

      {cart.length > 0 ? (
        <>
          <button
            onClick={() => setCartOpen(true)}
            style={{
              position: 'fixed',
              left: '16px',
              right: '16px',
              bottom: '16px',
              zIndex: 40,
              border: 'none',
              borderRadius: '18px',
              background: '#111',
              color: '#fff',
              padding: '14px 16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontWeight: 'bold',
              fontSize: '16px',
              boxShadow: '0 12px 30px rgba(0,0,0,0.25)',
            }}
          >
            <span>{totalItems} cup{totalItems > 1 ? 's' : ''} added</span>
            <span>View Cart</span>
          </button>

          {cartOpen ? (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.45)',
                zIndex: 50,
                display: 'flex',
                alignItems: 'flex-end',
              }}
              onClick={() => setCartOpen(false)}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: '100%',
                  maxHeight: '82vh',
                  overflowY: 'auto',
                  background: '#fff',
                  color: '#111',
                  borderTopLeftRadius: '20px',
                  borderTopRightRadius: '20px',
                  padding: '18px 16px 24px',
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '5px',
                    borderRadius: '999px',
                    background: '#ddd',
                    margin: '0 auto 16px',
                  }}
                />

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px',
                  }}
                >
                  <h2 style={{ margin: 0 }}>Your Cart</h2>
                  <button
                    onClick={() => setCartOpen(false)}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                    }}
                  >
                    Close
                  </button>
                </div>

                <div style={{ display: 'grid', gap: '12px', marginBottom: '16px' }}>
                  {cart.map((item) => (
                    <div
                      key={item.cartKey}
                      style={{
                        border: '1px solid #ddd',
                        borderRadius: '12px',
                        padding: '12px',
                        background: '#fff',
                      }}
                    >
                      <div style={{ fontWeight: 'bold' }}>{item.name}</div>
                      <div>{item.temperature}</div>
                      {item.milk_type ? <div>{item.milk_type}</div> : null}
                      {showPrices ? (
                        <div style={{ marginTop: '6px' }}>
                          RM {Number(item.price).toFixed(2)} × {item.qty}
                        </div>
                      ) : (
                        <div style={{ marginTop: '6px' }}>Qty × {item.qty}</div>
                      )}

                      <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
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
                    style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}
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
                      padding: '12px',
                      borderRadius: '10px',
                      border: '1px solid #ccc',
                      fontSize: '16px',
                    }}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <div>Total items: {totalItems}</div>
                  {showPrices ? (
                    <div style={{ fontWeight: 'bold', marginTop: '4px' }}>
                      Total: RM {totalPrice.toFixed(2)}
                    </div>
                  ) : null}
                </div>

                <button
                  onClick={placeOrder}
                  disabled={submitting}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    borderRadius: '14px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '16px',
                    background: '#111',
                    color: '#fff',
                    minHeight: '50px',
                    opacity: submitting ? 0.7 : 1,
                  }}
                >
                  {submitting ? 'Placing Order...' : 'Place Order'}
                </button>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </main>
  )
}
