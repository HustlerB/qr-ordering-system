'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

function getTemperatureOptions(itemName) {
  if (
    itemName === 'Piccolo Latte' ||
    itemName === 'Espresso' ||
    itemName === 'Flat White' ||
    itemName === 'Cappuccino'
  ) {
    return []
  }

  return ['Hot', 'Cold']
}

function requiresMilk(itemName) {
  return !['Americano', 'Espresso'].includes(itemName)
}

function getMilkOptions(item) {
  const options = []

  if (item.regular_milk_available) options.push('Regular')
  if (item.oat_milk_available) options.push('Oat')
  if (item.almond_milk_available) options.push('Almond')

  return options
}

function getCartKey(itemId, temperature, milkType) {
  return `${itemId}__${temperature || 'na'}__${milkType || 'na'}`
}

export default function MenuClient({ menus, showPrices = false }) {
  const router = useRouter()

  const [cart, setCart] = useState([])
  const [customerName, setCustomerName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [selectedOptions, setSelectedOptions] = useState({})
  const [fieldErrors, setFieldErrors] = useState({})
  const [addedCount, setAddedCount] = useState({})

  function updateSelection(itemId, values) {
    setSelectedOptions((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        ...values,
      },
    }))

    setFieldErrors((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        ...Object.keys(values).reduce((acc, key) => {
          acc[key] = ''
          return acc
        }, {}),
      },
    }))
  }

  function addToCart(item) {
    setErrorMessage('')

    const totalCups = cart.reduce((sum, cartItem) => sum + cartItem.qty, 0)
    if (totalCups >= 5) {
      setErrorMessage('Maximum 5 cups allowed per order.')
      setIsCartOpen(true)
      return
    }

    const selection = selectedOptions[item.id] || {}
    const selectedTemperature = selection.temperature || ''
    const selectedMilk = selection.milk || ''

    const temperatureOptions = getTemperatureOptions(item.name)
    const milkOptions = getMilkOptions(item)
    const needMilk = requiresMilk(item.name)

    const nextErrors = {}

    if (temperatureOptions.length > 0 && !selectedTemperature) {
      nextErrors.temperature = 'Please select temperature'
    }

    if (needMilk && milkOptions.length > 0 && !selectedMilk) {
      nextErrors.milk = 'Please select milk'
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors((prev) => ({
        ...prev,
        [item.id]: nextErrors,
      }))
      return
    }

    const cartKey = getCartKey(item.id, selectedTemperature, selectedMilk)

    setCart((prev) => {
      const existing = prev.find((cartItem) => cartItem.cartKey === cartKey)

      if (existing) {
        return prev.map((cartItem) =>
          cartItem.cartKey === cartKey
            ? { ...cartItem, qty: cartItem.qty + 1 }
            : cartItem
        )
      }

      return [
        ...prev,
        {
          ...item,
          cartKey,
          qty: 1,
          temperature: selectedTemperature || null,
          milk_type: selectedMilk || null,
        },
      ]
    })

    setAddedCount((prev) => ({
      ...prev,
      [cartKey]: (prev[cartKey] || 0) + 1,
    }))

    setIsCartOpen(true)
  }

  function increaseQty(cartKey) {
    const totalCups = cart.reduce((sum, item) => sum + item.qty, 0)
    if (totalCups >= 5) {
      setErrorMessage('Maximum 5 cups allowed per order.')
      return
    }

    setCart((prev) =>
      prev.map((item) =>
        item.cartKey === cartKey ? { ...item, qty: item.qty + 1 } : item
      )
    )
  }

  function decreaseQty(cartKey) {
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
    () => cart.reduce((sum, item) => sum + Number(item.price || 0) * item.qty, 0),
    [cart]
  )

  async function placeOrder() {
    setErrorMessage('')

    if (cart.length === 0) {
      setErrorMessage('Please add at least one item.')
      return
    }

    if (!customerName.trim()) {
      setErrorMessage('Please enter your name.')
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
      setAddedCount({})
      setIsCartOpen(false)

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
        padding: '20px 16px 110px',
        fontFamily: 'Arial, sans-serif',
        maxWidth: '560px',
        margin: '0 auto',
      }}
    >
      <h1 style={{ marginBottom: '8px', fontSize: '28px' }}>Drinks Menu</h1>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        Maximum 5 cups per order
      </p>

      {errorMessage ? (
        <p style={{ color: 'tomato', marginBottom: '16px' }}>{errorMessage}</p>
      ) : null}

      <div style={{ display: 'grid', gap: '18px' }}>
        {menus.map((item) => {
          const selection = selectedOptions[item.id] || {}
          const selectedTemperature = selection.temperature || ''
          const selectedMilk = selection.milk || ''
          const temperatureOptions = getTemperatureOptions(item.name)
          const milkOptions = getMilkOptions(item)
          const needMilk = requiresMilk(item.name)
          const fieldError = fieldErrors[item.id] || {}
          const previewCartKey = getCartKey(item.id, selectedTemperature, selectedMilk)
          const currentAdded = addedCount[previewCartKey] || 0

          return (
            <div
              key={item.id}
              style={{
                border: '1px solid #ddd',
                borderRadius: '18px',
                padding: '14px',
                background: '#fff',
                color: '#111',
                opacity: item.sold_out ? 0.55 : 1,
              }}
            >
              <div style={{ marginBottom: '12px' }}>
                <img
                  src={item.image_url || '/drinks/placeholder.jpeg'}
                  alt={item.name}
                  style={{
                    width: '100%',
                    aspectRatio: '1 / 1',
                    objectFit: 'cover',
                    borderRadius: '14px',
                    display: 'block',
                  }}
                />
              </div>

              <div style={{ marginBottom: '8px' }}>
                <h2 style={{ margin: '0 0 6px', fontSize: '24px' }}>{item.name}</h2>
                {item.description ? (
                  <p style={{ margin: 0, color: '#666' }}>{item.description}</p>
                ) : null}
              </div>

              {showPrices ? (
                <p style={{ margin: '0 0 14px', fontWeight: 'bold' }}>
                  RM {Number(item.price || 0).toFixed(2)}
                </p>
              ) : null}

              {item.sold_out ? (
                <div
                  style={{
                    display: 'inline-block',
                    padding: '10px 14px',
                    borderRadius: '999px',
                    background: '#fee2e2',
                    color: '#991b1b',
                    fontWeight: 'bold',
                  }}
                >
                  SOLD OUT
                </div>
              ) : (
                <>
                  {temperatureOptions.length > 0 ? (
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>
                        Temperature <span style={{ color: 'red' }}>*</span>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {temperatureOptions.map((temp) => {
                          const isActive = selectedTemperature === temp

                          return (
                            <button
                              key={temp}
                              type="button"
                              onClick={() => updateSelection(item.id, { temperature: temp })}
                              style={{
                                padding: '10px 14px',
                                borderRadius: '999px',
                                border: isActive ? '2px solid #3cc3b2' : '1px solid #ccc',
                                background: isActive ? '#e6fffb' : '#fff',
                                color: '#111',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                              }}
                            >
                              {temp}
                            </button>
                          )
                        })}
                      </div>

                      {fieldError.temperature ? (
                        <p style={{ color: 'red', marginTop: '8px', fontSize: '14px' }}>
                          {fieldError.temperature} - required
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  {needMilk && milkOptions.length > 0 ? (
                    <div style={{ marginBottom: '14px' }}>
                      <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>
                        Milk <span style={{ color: 'red' }}>*</span>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {milkOptions.map((milk) => {
                          const isActive = selectedMilk === milk

                          return (
                            <button
                              key={milk}
                              type="button"
                              onClick={() => updateSelection(item.id, { milk })}
                              style={{
                                padding: '10px 14px',
                                borderRadius: '999px',
                                border: isActive ? '2px solid #3cc3b2' : '1px solid #ccc',
                                background: isActive ? '#e6fffb' : '#fff',
                                color: '#111',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                              }}
                            >
                              {milk}
                            </button>
                          )
                        })}
                      </div>

                      {fieldError.milk ? (
                        <p style={{ color: 'red', marginTop: '8px', fontSize: '14px' }}>
                          {fieldError.milk} - required
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => addToCart(item)}
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      borderRadius: '12px',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '16px',
                      background: currentAdded > 0 ? '#3cc3b2' : '#111',
                      color: '#fff',
                      transition: 'all 0.2s ease',
                      transform: currentAdded > 0 ? 'scale(1.02)' : 'scale(1)',
                    }}
                  >
                    {currentAdded > 0 ? `Added - ${currentAdded}` : 'Add to Cart'}
                  </button>
                </>
              )}
            </div>
          )
        })}
      </div>

      {totalItems > 0 ? (
        <>
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            style={{
              position: 'fixed',
              left: '16px',
              right: '16px',
              bottom: '16px',
              zIndex: 50,
              padding: '16px',
              borderRadius: '16px',
              border: 'none',
              background: '#111',
              color: '#fff',
              fontWeight: 'bold',
              fontSize: '16px',
              boxShadow: '0 12px 30px rgba(0,0,0,0.24)',
              cursor: 'pointer',
            }}
          >
            {showPrices
              ? `View Cart (${totalItems}) • RM ${totalPrice.toFixed(2)}`
              : `View Cart (${totalItems})`}
          </button>

          {isCartOpen ? (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.35)',
                zIndex: 60,
                display: 'flex',
                alignItems: 'flex-end',
              }}
              onClick={() => setIsCartOpen(false)}
            >
              <div
                style={{
                  width: '100%',
                  background: '#fff',
                  color: '#111',
                  borderTopLeftRadius: '22px',
                  borderTopRightRadius: '22px',
                  padding: '16px',
                  maxHeight: '80vh',
                  overflowY: 'auto',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  style={{
                    width: '56px',
                    height: '6px',
                    borderRadius: '999px',
                    background: '#ddd',
                    margin: '0 auto 14px',
                  }}
                />

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '14px',
                  }}
                >
                  <h2 style={{ margin: 0, fontSize: '22px' }}>Your Cart</h2>
                  <button
                    type="button"
                    onClick={() => setIsCartOpen(false)}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      fontWeight: 'bold',
                      cursor: 'pointer',
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
                      }}
                    >
                      <div style={{ fontWeight: 'bold', fontSize: '18px' }}>
                        {item.name}
                      </div>
                      {item.temperature ? <div>{item.temperature}</div> : null}
                      {item.milk_type ? <div>{item.milk_type}</div> : null}
                      <div style={{ marginTop: '6px' }}>Qty × {item.qty}</div>

                      <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                        <button
                          type="button"
                          onClick={() => decreaseQty(item.cartKey)}
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            border: '1px solid #ccc',
                            background: '#fff',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                          }}
                        >
                          -
                        </button>
                        <button
                          type="button"
                          onClick={() => increaseQty(item.cartKey)}
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            border: '1px solid #ccc',
                            background: '#fff',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                          }}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ marginBottom: '14px' }}>
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
                  type="button"
                  onClick={placeOrder}
                  disabled={submitting}
                  style={{
                    width: '100%',
                    marginTop: '12px',
                    padding: '15px 18px',
                    borderRadius: '12px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '16px',
                    opacity: submitting ? 0.7 : 1,
                    background: '#111',
                    color: '#fff',
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
