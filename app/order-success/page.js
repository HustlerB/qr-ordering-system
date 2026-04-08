export default async function OrderSuccessPage({ searchParams }) {
  const params = await searchParams

  const orderId = params?.orderId || ''
  const orderNumber = params?.orderNumber || '-'
  const queueNumber = params?.queueNumber || '-'
  const etaMinutes = params?.etaMinutes || '-'

  return (
    <main style={{ padding: '24px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ marginBottom: '16px' }}>Order Received</h1>
      <p style={{ marginBottom: '8px' }}>Thank you. Your order has been placed.</p>
      <p><strong>Order Number:</strong> {orderNumber}</p>
      <p><strong>Queue Number:</strong> {queueNumber}</p>
      <p><strong>Estimated Wait:</strong> {etaMinutes} minutes</p>

      {orderId ? (
        <a
          href={`/order/${orderId}`}
          style={{
            display: 'inline-block',
            marginTop: '20px',
            padding: '12px 16px',
            borderRadius: '8px',
            background: '#fff',
            color: '#111',
            textDecoration: 'none',
            fontWeight: 'bold',
          }}
        >
          Track My Order
        </a>
      ) : null}
    </main>
  )
}
