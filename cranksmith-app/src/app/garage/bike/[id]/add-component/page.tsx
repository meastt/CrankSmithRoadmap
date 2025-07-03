// src/app/garage/bike/[id]/add-component/page.tsx
'use client'
import { useState, useEffect, use } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'

interface Component {
  id: string
  brand: string
  model: string
  description: string
  weight_grams: number
  category_id: string
  category_name: string
}

interface Category {
  id: string
  name: string
}

interface Bike {
  id: string
  nickname: string
}

export default function AddComponent({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const [bike, setBike] = useState<Bike | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [components, setComponents] = useState<Component[]>([])
  const [filteredComponents, setFilteredComponents] = useState<Component[]>([])
  const [selectedCategory, setSelectedCategory] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedComponent, setSelectedComponent] = useState<Component | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [adding, setAdding] = useState(false)
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const [profile, setProfile] = useState<{ id: string; subscription_status?: 'free' | 'premium' } | null>(null)
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
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      setProfile(profileData)

      // Fetch bike details
      const { data: bikeData, error: bikeError } = await supabase
        .from('bikes')
        .select('id, nickname')
        .eq('id', resolvedParams.id)
        .eq('user_id', user.id)
        .single()

      if (bikeError) {
        setError('Bike not found')
        setLoading(false)
        return
      }
      setBike(bikeData)

      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('component_categories')
        .select('*')
        .order('display_order')

      if (categoriesError) {
        console.error('Error fetching categories:', categoriesError)
      } else {
        console.log('Categories fetched:', categoriesData)
        setCategories(categoriesData || [])
      }

      // Fetch components with category names
      const { data: componentsData, error: componentsError } = await supabase
        .from('components')
        .select(`
          *,
          component_categories!inner(name)
        `)
        .order('brand, model')

      if (componentsError) {
        console.error('Error fetching components:', componentsError)
      } else {
        console.log('Components fetched:', componentsData)
        const componentsWithCategory = componentsData?.map(comp => ({
          ...comp,
          category_name: comp.component_categories.name
        })) || []
        console.log('Components with category:', componentsWithCategory)
        setComponents(componentsWithCategory)
        setFilteredComponents(componentsWithCategory)
      }

      setLoading(false)
    }

    fetchData()
  }, [resolvedParams.id, router])

  // Filter components based on category and search
  useEffect(() => {
    console.log('Filtering - selectedCategory:', selectedCategory, 'searchTerm:', searchTerm)
    let filtered = components

    if (selectedCategory) {
      console.log('Filtering by category:', selectedCategory)
      filtered = filtered.filter(comp => comp.category_id === selectedCategory)
      console.log('Components after category filter:', filtered)
    }

    if (searchTerm) {
      console.log('Filtering by search term:', searchTerm)
      filtered = filtered.filter(comp => 
        comp.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        comp.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        comp.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      console.log('Components after search filter:', filtered)
    }

    console.log('Final filtered components:', filtered)
    setFilteredComponents(filtered)
  }, [selectedCategory, searchTerm, components])

  const handleAddComponent = async () => {
    if (!selectedComponent || !bike) return

    setAdding(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      const { error } = await supabase
        .from('bike_components')
        .insert([
          {
            bike_id: bike.id,
            component_id: selectedComponent.id,
            user_id: user?.id,
            mileage_miles: 0, // Start with 0 miles
          }
        ])

      if (error) {
        setError(error.message)
      } else {
        // Success! Redirect back to bike details
        router.push(`/garage/bike/${bike.id}`)
      }
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setAdding(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🔧</div>
          <p className="text-gray-600">Loading components...</p>
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
      <Header 
        user={user} 
        profile={profile} 
        title="Add Component"
        subtitle={`Add parts to ${bike?.nickname}`}
        backTo={{ href: `/garage/bike/${bike?.id}`, label: `Back to ${bike?.nickname}` }}
      />

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Search & Filter */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Find Component
              </h2>

              {/* Search */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by brand, model, or description..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Category Filter */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All Categories</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <p className="text-sm text-gray-600">
                {filteredComponents.length} components found
              </p>
            </div>

            {/* Components List */}
            <div className="bg-white rounded-lg shadow-lg">
              <div className="max-h-96 overflow-y-auto">
                {filteredComponents.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="text-4xl mb-2">🔍</div>
                    <p className="text-gray-600">No components found</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {filteredComponents.map(component => (
                      <div
                        key={component.id}
                        onClick={() => setSelectedComponent(component)}
                        className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                          selectedComponent?.id === component.id ? 'bg-indigo-50 border-l-4 border-indigo-500' : ''
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900">
                              {component.brand} {component.model}
                            </h3>
                            <p className="text-sm text-gray-600 mt-1">
                              {component.category_name}
                            </p>
                            {component.description && (
                              <p className="text-sm text-gray-500 mt-1">
                                {component.description}
                              </p>
                            )}
                          </div>
                          <div className="text-right text-sm text-gray-500">
                            {component.weight_grams && (
                              <p>{component.weight_grams}g</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Selected Component */}
          <div>
            <div className="bg-white rounded-lg shadow-lg p-6 sticky top-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Selected Component
              </h3>

              {selectedComponent ? (
                <div>
                  <div className="text-center mb-4">
                    <div className="text-4xl mb-2">🔧</div>
                    <h4 className="font-medium text-gray-900">
                      {selectedComponent.brand} {selectedComponent.model}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {selectedComponent.category_name}
                    </p>
                  </div>

                  <div className="space-y-2 text-sm text-gray-600 mb-6">
                    {selectedComponent.description && (
                      <p><span className="font-medium">Description:</span> {selectedComponent.description}</p>
                    )}
                    {selectedComponent.weight_grams && (
                      <p><span className="font-medium">Weight:</span> {selectedComponent.weight_grams}g</p>
                    )}
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded mb-4 text-sm">
                      {error}
                    </div>
                  )}

                  <button
                    onClick={handleAddComponent}
                    disabled={adding}
                    className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
                  >
                    {adding ? 'Adding...' : 'Add to Bike'}
                  </button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">👆</div>
                  <p className="text-gray-600 text-sm">
                    Select a component from the list to add it to your bike
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}