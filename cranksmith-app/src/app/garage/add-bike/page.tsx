// src/app/garage/add-bike/page.tsx
'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AddBike() {
  const [nickname, setNickname] = useState('')
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [bikeType, setBikeType] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [user, setUser] = useState(null)
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
    // Check if user is logged in
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)
    }
    checkUser()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

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
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="nickname" className="block text-sm font-medium text-gray-700 mb-2">
                Bike Nickname <span className="text-red-500">*</span>
              </label>
              <input
                id="nickname"
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="e.g., 'The Beast', 'Daily Rider', 'Weekend Warrior'"
              />
              <p className="text-xs text-gray-500 mt-1">
                Give your bike a memorable name
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="brand" className="block text-sm font-medium text-gray-700 mb-2">
                  Brand
                </label>
                <input
                  id="brand"
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="e.g., Trek, Specialized, Giant"
                />
              </div>

              <div>
                <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-2">
                  Model
                </label>
                <input
                  id="model"
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="e.g., Domane SL 7, Roubaix Comp"
                />
              </div>
            </div>

            <div>
              <label htmlFor="bikeType" className="block text-sm font-medium text-gray-700 mb-2">
                Bike Type
              </label>
              <select
                id="bikeType"
                value={bikeType}
                onChange={(e) => setBikeType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">Select bike type</option>
                {bikeTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-4 pt-6">
              <Link
                href="/garage"
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-center"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading || !nickname}
                className="flex-1 bg-indigo-600 text-white px-6 py-3 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Adding Bike...' : 'Add Bike'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}