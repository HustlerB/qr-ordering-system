'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setErrorMessage('')

    try {
      setLoading(true)

      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Login failed.')
      }

      router.push('/admin/orders')
      router.refresh()
    } catch (error) {
      setErrorMessage(error.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={{ padding: '24px', fontFamily: 'Arial, sans-serif', maxWidth: '420px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '16px' }}>Admin Login</h1>

      <form onSubmit={handleLogin}>
        <label htmlFor="password" style={{ display: 'block', marginBottom: '8px' }}>
          Password
        </label>

        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid #ccc',
            marginBottom: '12px',
          }}
        />

        {errorMessage ? (
          <p style={{ color: 'tomato', marginBottom: '12px' }}>{errorMessage}</p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </main>
  )
}
