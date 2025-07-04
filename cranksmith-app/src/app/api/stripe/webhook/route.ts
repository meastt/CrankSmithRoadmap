// api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-05-28.basil',
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    // Verify the webhook signature
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret)
  } catch (err) {
    console.error('⚠️  Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 })
  }

  console.log('✅ Webhook received:', event.type)

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break
      case 'customer.subscription.deleted':
        await handleSubscriptionCanceled(event.data.object as Stripe.Subscription)
        break
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice)
        break
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log('💳 Processing checkout completion for session:', session.id)
  
  const userId = session.metadata?.userId
  if (!userId) {
    console.error('No userId in session metadata')
    return
  }

  if (!session.subscription) {
    console.error('No subscription found in session')
    return
  }

  try {
    // Get the subscription details with proper error handling
    const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
    
    // Validate subscription has required fields
    if (!subscription.current_period_start || !subscription.current_period_end) {
      console.error('Subscription missing period dates')
      throw new Error('Invalid subscription data')
    }
    
    // Update user profile in Supabase with proper typing
    const { error } = await supabase
      .from('profiles')
      .update({
        subscription_status: 'premium',
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: subscription.id,
        subscription_start_date: new Date(subscription.current_period_start * 1000).toISOString(),
        subscription_end_date: new Date(subscription.current_period_end * 1000).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (error) {
      console.error('Failed to update user subscription:', error)
      throw error
    }

    console.log('✅ User upgraded to premium:', userId)
  } catch (stripeError) {
    console.error('Stripe operation failed in handleCheckoutCompleted:', stripeError)
    throw stripeError
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('🔄 Processing subscription update:', subscription.id)
  
  try {
    // Find user by stripe_subscription_id
    const { data: profile, error: findError } = await supabase
      .from('profiles')
      .select('id')
      .eq('stripe_subscription_id', subscription.id)
      .single()

    if (findError || !profile) {
      console.error('User not found for subscription:', subscription.id)
      return
    }

    // Validate subscription has required fields
    if (!subscription.current_period_start || !subscription.current_period_end) {
      console.error('Subscription missing period dates')
      throw new Error('Invalid subscription data')
    }

    // Determine subscription status
    let subscriptionStatus = 'free'
    if (subscription.status === 'active') {
      subscriptionStatus = 'premium'
    } else if (subscription.status === 'past_due') {
      subscriptionStatus = 'past_due'
    } else if (['canceled', 'unpaid'].includes(subscription.status)) {
      subscriptionStatus = 'canceled'
    }

    // Update subscription details with proper typing
    const { error } = await supabase
      .from('profiles')
      .update({
        subscription_status: subscriptionStatus,
        subscription_start_date: new Date(subscription.current_period_start * 1000).toISOString(),
        subscription_end_date: new Date(subscription.current_period_end * 1000).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', profile.id)

    if (error) {
      console.error('Failed to update subscription:', error)
      throw error
    }

    console.log('✅ Subscription updated for user:', profile.id, 'Status:', subscriptionStatus)
  } catch (error) {
    console.error('Error in handleSubscriptionUpdated:', error)
    throw error
  }
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  console.log('❌ Processing subscription cancellation:', subscription.id)
  
  try {
    // Find user by stripe_subscription_id
    const { data: profile, error: findError } = await supabase
      .from('profiles')
      .select('id')
      .eq('stripe_subscription_id', subscription.id)
      .single()

    if (findError || !profile) {
      console.error('User not found for subscription:', subscription.id)
      return
    }

    // Validate subscription has required field
    if (!subscription.current_period_end) {
      console.error('Subscription missing period end date')
      throw new Error('Invalid subscription data')
    }

    // Update to canceled status with proper typing
    const { error } = await supabase
      .from('profiles')
      .update({
        subscription_status: 'canceled',
        subscription_end_date: new Date(subscription.current_period_end * 1000).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', profile.id)

    if (error) {
      console.error('Failed to update canceled subscription:', error)
      throw error
    }

    console.log('✅ Subscription canceled for user:', profile.id)
  } catch (error) {
    console.error('Error in handleSubscriptionCanceled:', error)
    throw error
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  console.log('💸 Processing payment failure for invoice:', invoice.id)
  
  try {
    // Handle subscription property with proper typing
    let subscriptionId: string | undefined
    
    if (typeof invoice.subscription === 'string') {
      subscriptionId = invoice.subscription
    } else if (invoice.subscription && typeof invoice.subscription === 'object') {
      subscriptionId = invoice.subscription.id
    }

    if (!subscriptionId) {
      console.log('No subscription associated with this invoice')
      return
    }

    // Find user by stripe_subscription_id
    const { data: profile, error: findError } = await supabase
      .from('profiles')
      .select('id')
      .eq('stripe_subscription_id', subscriptionId)
      .single()

    if (findError || !profile) {
      console.error('User not found for subscription:', subscriptionId)
      return
    }

    // Update to past_due status
    const { error } = await supabase
      .from('profiles')
      .update({
        subscription_status: 'past_due',
        updated_at: new Date().toISOString()
      })
      .eq('id', profile.id)

    if (error) {
      console.error('Failed to update payment failed status:', error)
      throw error
    }

    console.log('✅ Payment failure processed for user:', profile.id)
  } catch (error) {
    console.error('Error in handlePaymentFailed:', error)
    throw error
  }
}