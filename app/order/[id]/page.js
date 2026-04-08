import OrderTrackingClient from '@/components/OrderTrackingClient'

export default async function OrderTrackingPage({ params }) {
  const { id } = await params
  return <OrderTrackingClient orderId={id} />
}
