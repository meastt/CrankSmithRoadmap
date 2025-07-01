// src/app/garage/page.tsx
'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Profile {
  id: string
  subscription_status: 'free' | 'premium'
}

export default function Garage() {
  const [bikes, setBikes] = useState([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [user, setUser] = useState(null)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const fetchGarageData = async () => {
      // Check if user is logged in
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)

      // Fetch user profile with subscription status
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, subscription_status')
        .eq('id', user.id)
        .single()

      if (profileError) {
        console.error('Error fetching profile:', profileError)
        // If profile doesn't exist, create one with default free status
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert([
            {
              id: user.id,
              subscription_status: 'free'
            }
          ])
          .select()
          .single()

        if (createError) {
          console.error('Error creating profile:', createError)
        } else {
          setProfile(newProfile)
        }
      } else {
        setProfile(profileData)
      }

      // Fetch bikes
      const { data: bikesData, error: bikesError } = await supabase
        .from('bikes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (bikesError) {
        setError('Error fetching bikes')
        console.error('Error:', bikesError)
      } else {
        setBikes(bikesData || [])
      }
      
      setLoading(false)
    }

    fetchGarageData()
  }, [router])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const handleAddBikeClick = () => {
    // Check freemium limit
    if (profile?.subscription_status === 'free' && bikes.length >= 1) {
      setShowUpgradeModal(true)
    } else {
      router.push('/garage/add-bike')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🔧</div>
          <p className="text-gray-600">Loading your garage...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">❌</div>
          <p className="text-gray-600">{error}</p>
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
            <span className="ml-4 text-sm text-gray-500">Your Digital Garage</span>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                Welcome, {user?.email}
              </span>
              {profile?.subscription_status === 'free' && (
                <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs font-medium">
                  Free Plan
                </span>
              )}
              {profile?.subscription_status === 'premium' && (
                <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full text-xs font-medium">
                  Premium
                </span>
              )}
            </div>
            <button
              onClick={handleSignOut}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Your Digital Garage</h1>
          <p className="text-xl text-gray-600">
            Manage your bikes, track components, and optimize every ride.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="text-3xl mr-4">🚴‍♂️</div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{bikes.length}</p>
                <p className="text-gray-600">Bikes</p>
                {profile?.subscription_status === 'free' && (
                  <p className="text-xs text-gray-500">Free: 1 bike limit</p>
                )}
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="text-3xl mr-4">🔧</div>
              <div>
                <p className="text-2xl font-bold text-gray-900">0</p>
                <p className="text-gray-600">Components</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="text-3xl mr-4">📏</div>
              <div>
                <p className="text-2xl font-bold text-gray-900">0 miles</p>
                <p className="text-gray-600">Total Miles</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tools Section */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">🔧 Tools & Calculators</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              
              {/* Gear Calculator */}
              <Link
                href="/calculators/gear"
                className={`p-4 rounded-lg border-2 transition-colors ${
                  profile?.subscription_status === 'premium'
                    ? 'border-purple-200 bg-purple-50 hover:border-purple-300'
                    : 'border-gray-200 bg-gray-50 cursor-not-allowed'
                }`}
                onClick={(e) => {
                  if (profile?.subscription_status !== 'premium') {
                    e.preventDefault()
                    setShowUpgradeModal(true)
                  }
                }}
              >
                <div className="text-center">
                  <div className="text-3xl mb-2">⚙️</div>
                  <h4 className="font-semibold text-gray-900 mb-1">Gear Calculator</h4>
                  <p className="text-sm text-gray-600">Compare gear ratios and speeds</p>
                  {profile?.subscription_status !== 'premium' && (
                    <span className="inline-block mt-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                      Premium
                    </span>
                  )}
                </div>
              </Link>

              {/* Tire Pressure Calculator - Coming Soon */}
              <div className="p-4 rounded-lg border-2 border-gray-200 bg-gray-50 opacity-50">
                <div className="text-center">
                  <div className="text-3xl mb-2">🛞</div>
                  <h4 className="font-semibold text-gray-900 mb-1">Tire Pressure</h4>
                  <p className="text-sm text-gray-600">Calculate optimal pressure</p>
                  <span className="inline-block mt-2 px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded">
                    Coming Soon
                  </span>
                </div>
              </div>

              {/* Compatibility Checker - Coming Soon */}
              <div className="p-4 rounded-lg border-2 border-gray-200 bg-gray-50 opacity-50">
                <div className="text-center">
                  <div className="text-3xl mb-2">🔍</div>
                  <h4 className="font-semibold text-gray-900 mb-1">Compatibility</h4>
                  <p className="text-sm text-gray-600">Check component compatibility</p>
                  <span className="inline-block mt-2 px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded">
                    Coming Soon
                  </span>
                </div>
              </div>
              
            </div>
          </div>
        </div>

        {/* Bikes Section */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Your Bikes</h3>
            <button
              onClick={handleAddBikeClick}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
            >
              + Add New Bike
            </button>
          </div>
          
          <div className="p-6">
            {bikes.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🚴‍♂️</div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">
                  No bikes in your garage yet
                </h4>
                <p className="text-gray-600 mb-6">
                  Add your first bike to start tracking components and maintenance.
                </p>
                <button
                  onClick={handleAddBikeClick}
                  className="bg-indigo-600 text-white px-6 py-3 rounded-md hover:bg-indigo-700 transition-colors"
                >
                  Add Your First Bike
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {bikes.map((bike: any) => (
                  <div key={bike.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="text-center mb-3">
                      <div className="text-3xl mb-2">🚴‍♂️</div>
                      <h4 className="font-semibold text-gray-900">{bike.nickname}</h4>
                    </div>
                    
                    <div className="space-y-1 text-sm text-gray-600">
                      {bike.brand && (
                        <p><span className="font-medium">Brand:</span> {bike.brand}</p>
                      )}
                      {bike.model && (
                        <p><span className="font-medium">Model:</span> {bike.model}</p>
                      )}
                      {bike.bike_type && (
                        <p><span className="font-medium">Type:</span> {bike.bike_type}</p>
                      )}
                    </div>
                    
                    <div className="mt-4 pt-3 border-t border-gray-100">
                      <Link 
                        href={`/garage/bike/${bike.id}`}
                        className="text-sm text-indigo-600 hover:text-indigo-700"
                      >
                        View Details →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mt-8 bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
          </div>
          <div className="p-6">
            <div className="text-center py-8">
              <div className="text-4xl mb-2">📊</div>
              <p className="text-gray-600">
                Your maintenance and ride history will appear here
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md mx-4">
            <div className="text-center">
              <div className="text-4xl mb-4">🚀</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Upgrade to Premium
              </h3>
              <p className="text-gray-600 mb-6">
                Free users can manage 1 bike. Upgrade to Premium to add unlimited bikes and unlock advanced features!
              </p>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h4 className="font-semibold text-gray-900 mb-2">Premium Features:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>✅ Unlimited bikes</li>
                  <li>✅ Advanced weight tracking</li>
                  <li>✅ Manual mileage logging</li>
                  <li>✅ Service alerts</li>
                  <li>✅ Priority support</li>
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