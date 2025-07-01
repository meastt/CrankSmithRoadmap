// src/components/StripeCheckout.tsx
'use client'
import { useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface StripeCheckoutProps {
  userId: string
  className?: string
  children: React.ReactNode
}

export default function StripeCheckout({ userId, className = '', children }: StripeCheckoutProps) {
  const [loading, setLoading] = useState(false)

  const handleCheckout = async () => {
    setLoading(true)

    try {
      // Create checkout session
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      })

      const { sessionId, error } = await response.json()

      if (error) {
        alert('Failed to create checkout session: ' + error)
        return
      }

      // Redirect to Stripe Checkout
      const stripe = await stripePromise
      if (!stripe) {
        alert('Stripe failed to load')
        return
      }

      const { error: stripeError } = await stripe.redirectToCheckout({
        sessionId,
      })

      if (stripeError) {
        alert('Failed to redirect to checkout: ' + stripeError.message)
      }
    } catch (error) {
      console.error('Checkout error:', error)
      alert('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleCheckout}
      disabled={loading}
      className={className}
    >
      {loading ? 'Loading...' : children}
    </button>
  )
}