// src/app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  console.log('Received webhook event:', event.type)

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.userId

        if (!userId) {
          console.error('No userId in session metadata')
          break
        }

        // Update user's subscription status to premium
        const { error } = await supabase
          .from('profiles')
          .upsert({
            id: userId,
            subscription_status: 'premium',
            stripe_customer_id: session.customer as string,
            updated_at: new Date().toISOString(),
          })

        if (error) {
          console.error('Error updating user subscription:', error)
        } else {
          console.log(`Updated user ${userId} to premium`)
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        // Find user by Stripe customer ID
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (profileError || !profile) {
          console.error('Could not find user for customer:', customerId)
          break
        }

        // Update subscription status based on subscription status
        const isActive = subscription.status === 'active'
        const { error } = await supabase
          .from('profiles')
          .update({
            subscription_status: isActive ? 'premium' : 'free',
            updated_at: new Date().toISOString(),
          })
          .eq('id', profile.id)

        if (error) {
          console.error('Error updating subscription status:', error)
        } else {
          console.log(`Updated user ${profile.id} subscription to ${isActive ? 'premium' : 'free'}`)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        // Find user by Stripe customer ID
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (profileError || !profile) {
          console.error('Could not find user for customer:', customerId)
          break
        }

        // Update to free plan
        const { error } = await supabase
          .from('profiles')
          .update({
            subscription_status: 'free',
            updated_at: new Date().toISOString(),
          })
          .eq('id', profile.id)

        if (error) {
          console.error('Error updating subscription to free:', error)
        } else {
          console.log(`Updated user ${profile.id} to free plan`)
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }

  return NextResponse.json({ received: true })
}