// src/app/garage/page.tsx
'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  email: string
}

export default function Garage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [bikes, setBikes] = useState([])
  const router = useRouter()

  useEffect(() => {
    // Check if user is logged in and fetch bikes
    const checkUserAndFetchBikes = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }
      
      setUser(user)
      
      // Fetch user's bikes
      const { data: bikesData, error } = await supabase
        .from('bikes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error fetching bikes:', error)
      } else {
        setBikes(bikesData || [])
      }
      
      setLoading(false)
    }

    checkUserAndFetchBikes()
  }, [router])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-gray-900">
              🔧 CrankSmith
            </h1>
            <span className="ml-4 text-sm text-gray-500">Your Digital Garage</span>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              Welcome, {user?.email}
            </span>
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
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to Your Garage
          </h2>
          <p className="text-gray-600">
            Manage your bikes, track components, and optimize your rides.
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

        {/* Bikes Section */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Your Bikes</h3>
            <a
              href="/garage/add-bike"
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
            >
              + Add New Bike
            </a>
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
                <a
                  href="/garage/add-bike"
                  className="bg-indigo-600 text-white px-6 py-3 rounded-md hover:bg-indigo-700 transition-colors"
                >
                  Add Your First Bike
                </a>
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
                      <a 
                        href={`/garage/bike/${bike.id}`}
                        className="text-sm text-indigo-600 hover:text-indigo-700"
                      >
                        View Details →
                      </a>
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
    </div>
  )
}