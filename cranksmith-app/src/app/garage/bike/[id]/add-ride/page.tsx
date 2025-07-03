// src/app/garage/bike/[id]/add-ride/page.tsx
'use client'
import { useState, useEffect, use } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Bike {
  id: string
  nickname: string
  brand: string
  model: string
}

interface Profile {
  id: string
  subscription_status: 'free' | 'premium'
}

interface BikeComponent {
  id: string
  mileage_miles: number
  components: {
    brand: string
    model: string
    component_categories: {
      name: string
    }
  }
}

export default function AddManualRide({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const [bike, setBike] = useState<Bike | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [bikeComponents, setBikeComponents] = useState<BikeComponent[]>([])
  const [rideDate, setRideDate] = useState(new Date().toISOString().split('T')[0])
  const [rideMiles, setRideMiles] = useState('')
  const [rideNotes, setRideNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [, setUser] = useState<any>(null)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const fetchData = async () => {
      // Check if user is logged in
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)

      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, subscription_status')
        .eq('id', user.id)
        .single()

      if (profileError) {
        console.error('Error fetching profile:', profileError)
      } else {
        setProfile(profileData)
      }

      // Fetch bike details
      const { data: bikeData, error: bikeError } = await supabase
        .from('bikes')
        .select('id, nickname, brand, model')
        .eq('id', resolvedParams.id)
        .eq('user_id', user.id)
        .single()

      if (bikeError) {
        setError('Bike not found')
        setLoading(false)
        return
      }
      setBike(bikeData)

      // Fetch bike components for mileage updates
      const { data: componentsData, error: componentsError } = await supabase
        .from('bike_components')
        .select(`
          id,
          mileage_miles,
          components (
            brand,
            model,
            component_categories (name)
          )
        `)
        .eq('bike_id', resolvedParams.id)
        .eq('user_id', user.id)

      if (componentsError) {
        console.error('Error fetching bike components:', componentsError)
      } else {
        // Transform the data to match our interface
        const transformedComponents = (componentsData || []).map((comp: any) => ({
          id: comp.id,
          mileage_miles: comp.mileage_miles,
          components: {
            brand: comp.components.brand,
            model: comp.components.model,
            component_categories: { name: comp.components.component_categories.name }
          }
        }))
        setBikeComponents(transformedComponents)
      }

      setLoading(false)
    }

    fetchData()
  }, [resolvedParams.id, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Check if user has premium access
    if (profile?.subscription_status !== 'premium') {
      setShowUpgradeModal(true)
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const miles = parseFloat(rideMiles)
      if (isNaN(miles) || miles <= 0) {
        setError('Please enter a valid distance')
        setSubmitting(false)
        return
      }

      // Update mileage for all components on this bike
      const componentUpdates = bikeComponents.map(component => ({
        id: component.id,
        mileage_miles: component.mileage_miles + miles
      }))

      // Update all component mileages
      for (const update of componentUpdates) {
        const { error: updateError } = await supabase
          .from('bike_components')
          .update({ mileage_miles: update.mileage_miles })
          .eq('id', update.id)

        if (updateError) {
          console.error('Error updating component mileage:', updateError)
          throw updateError
        }
      }

      // Optional: Log the ride (could create a rides table later)
      // For now, we'll just redirect back to the bike page
      
      router.push(`/garage/bike/${bike?.id}`)
    } catch {
      setError('Failed to log ride. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🔧</div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (error && !bike) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">❌</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link href="/garage" className="text-indigo-600 hover:text-indigo-700">
            ← Back to Garage
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <Link href="/garage" className="text-2xl font-bold text-gray-900">
              🔧 CrankSmith
            </Link>
            <span className="ml-4 text-sm text-gray-500">
              Log Ride - {bike?.nickname}
            </span>
          </div>
          
          <Link 
            href={`/garage/bike/${bike?.id}`}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            ← Back to {bike?.nickname}
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">📏</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Log Manual Ride
            </h1>
            <p className="text-gray-600">
              Add mileage to all components on {bike?.nickname}
            </p>
            {profile?.subscription_status === 'free' && (
              <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-amber-800 text-sm">
                  🔒 Manual ride logging is a Premium feature
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="rideDate" className="block text-sm font-medium text-gray-700 mb-2">
                Ride Date
              </label>
              <input
                type="date"
                id="rideDate"
                value={rideDate}
                onChange={(e) => setRideDate(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label htmlFor="rideMiles" className="block text-sm font-medium text-gray-700 mb-2">
                Distance (miles) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="rideMiles"
                value={rideMiles}
                onChange={(e) => setRideMiles(e.target.value)}
                step="0.1"
                min="0.1"
                required
                placeholder="e.g., 15.5"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                This mileage will be added to all {bikeComponents.length} components on this bike
              </p>
            </div>

            <div>
              <label htmlFor="rideNotes" className="block text-sm font-medium text-gray-700 mb-2">
                Ride Notes (Optional)
              </label>
              <textarea
                id="rideNotes"
                value={rideNotes}
                onChange={(e) => setRideNotes(e.target.value)}
                rows={3}
                placeholder="Quick notes about this ride..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Components that will be updated */}
            {bikeComponents.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">
                  Components that will be updated:
                </h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {bikeComponents.map((comp) => (
                    <div key={comp.id} className="flex justify-between items-center text-xs text-gray-600">
                      <span>
                        {comp.components?.brand} {comp.components?.model}
                      </span>
                      <span>
                        {comp.mileage_miles} → {comp.mileage_miles + (parseFloat(rideMiles) || 0)} miles
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-6">
              <button
                type="submit"
                disabled={submitting || profile?.subscription_status !== 'premium'}
                className="w-full bg-indigo-600 text-white py-3 px-4 rounded-md font-semibold hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? 'Logging Ride...' : 
                 profile?.subscription_status !== 'premium' ? 'Upgrade to Premium to Log Rides' : 
                 'Log Ride'}
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md mx-4">
            <div className="text-center">
              <div className="text-4xl mb-4">🚀</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Premium Feature
              </h3>
              <p className="text-gray-600 mb-6">
                Manual ride logging is available with Premium. Upgrade to track component mileage and maintenance schedules!
              </p>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h4 className="font-semibold text-gray-900 mb-2">Premium Features:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>✅ Manual ride logging</li>
                  <li>✅ Component mileage tracking</li>
                  <li>✅ Service alerts</li>
                  <li>✅ Unlimited bikes</li>
                  <li>✅ Advanced weight tracking</li>
                </ul>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowUpgradeModal(false)}
                  className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Maybe Later
                </button>
                <button
                  onClick={() => {
                    // TODO: Implement Stripe checkout
                    alert('Stripe checkout coming soon!')
                  }}
                  className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
                >
                  Upgrade Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}