// src/app/garage/add-bike/page.tsx
'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Profile {
  id: string
  subscription_status: 'free' | 'premium'
}

export default function AddBike() {
  const [nickname, setNickname] = useState('')
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [bikeType, setBikeType] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [bikeCount, setBikeCount] = useState(0)
  const router = useRouter()

  const bikeTypes = [
    'Road',
    'Mountain (MTB)',
    'Gravel',
    'Cyclocross',
    'Commuter',
    'Hybrid',
    'Electric',
    'BMX',
    'Track',
    'Touring',
    'Fat Bike',
    'Other'
  ]

  useEffect(() => {
    // Check if user is logged in and get profile/bike count
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)

      // Get user profile
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

      // Get current bike count
      const { data: bikesData, error: bikesError } = await supabase
        .from('bikes')
        .select('id')
        .eq('user_id', user.id)

      if (bikesError) {
        console.error('Error fetching bike count:', bikesError)
      } else {
        setBikeCount(bikesData?.length || 0)
      }
    }
    checkUser()
  }, [router])

  // Check if user can add another bike
  const canAddBike = profile?.subscription_status === 'premium' || bikeCount < 1

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Double-check freemium limit before submitting
    if (!canAddBike) {
      setError('Free users can only add 1 bike. Upgrade to Premium for unlimited bikes!')
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase
        .from('bikes')
        .insert([
          {
            user_id: user?.id,
            nickname,
            brand,
            model,
            bike_type: bikeType,
          }
        ])

      if (error) {
        setError(error.message)
      } else {
        // Success! Redirect back to garage
        router.push('/garage')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🔧</div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // If user has reached their limit, show upgrade message
  if (!canAddBike) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center">
              <Link href="/garage" className="text-2xl font-bold text-gray-900">
                🔧 CrankSmith
              </Link>
              <span className="ml-4 text-sm text-gray-500">Add New Bike</span>
            </div>
            
            <Link 
              href="/garage"
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              ← Back to Garage
            </Link>
          </div>
        </header>

        {/* Upgrade Required Message */}
        <main className="max-w-2xl mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="text-6xl mb-4">🚀</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Upgrade to Premium
            </h1>
            <p className="text-gray-600 mb-6">
              You've reached the free plan limit of 1 bike. Upgrade to Premium to add unlimited bikes and unlock advanced features!
            </p>
            
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Premium Features:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
                <div className="flex items-center">
                  <span className="text-green-500 mr-2">✅</span>
                  Unlimited bikes
                </div>
                <div className="flex items-center">
                  <span className="text-green-500 mr-2">✅</span>
                  Advanced weight tracking
                </div>
                <div className="flex items-center">
                  <span className="text-green-500 mr-2">✅</span>
                  Manual mileage logging
                </div>
                <div className="flex items-center">
                  <span className="text-green-500 mr-2">✅</span>
                  Service alerts & history
                </div>
                <div className="flex items-center">
                  <span className="text-green-500 mr-2">✅</span>
                  Priority support
                </div>
                <div className="flex items-center">
                  <span className="text-green-500 mr-2">✅</span>
                  Future premium features
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => {
                  // TODO: Implement Stripe checkout
                  alert('Stripe checkout coming soon!')
                }}
                className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
              >
                Upgrade to Premium
              </button>
              <Link
                href="/garage"
                className="bg-gray-100 text-gray-700 px-8 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors text-center"
              >
                Back to Garage
              </Link>
            </div>
          </div>
        </main>
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
            <span className="ml-4 text-sm text-gray-500">Add New Bike</span>
          </div>
          
          <Link 
            href="/garage"
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            ← Back to Garage
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🚴‍♂️</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Add Your Bike
            </h1>
            <p className="text-gray-600">
              Tell us about your bike to start tracking components and maintenance.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="nickname" className="block text-sm font-medium text-gray-700 mb-2">
                Bike Nickname <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                required
                placeholder="e.g., Red Lightning, Trail Beast, Daily Commuter"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="brand" className="block text-sm font-medium text-gray-700 mb-2">
                  Brand
                </label>
                <input
                  type="text"
                  id="brand"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="e.g., Trek, Specialized, Cannondale"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-2">
                  Model
                </label>
                <input
                  type="text"
                  id="model"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="e.g., Domane SL 7, Stumpjumper, CAAD13"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="bikeType" className="block text-sm font-medium text-gray-700 mb-2">
                Bike Type <span className="text-red-500">*</span>
              </label>
              <select
                id="bikeType"
                value={bikeType}
                onChange={(e) => setBikeType(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select bike type...</option>
                {bikeTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div className="pt-6">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white py-3 px-4 rounded-md font-semibold hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Adding Bike...' : 'Add Bike to Garage'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}