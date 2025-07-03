// src/app/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const [connectionStatus, setConnectionStatus] = useState('Testing...')

  useEffect(() => {
    // Test Supabase connection
    const testConnection = async () => {
      try {
        const { error } = await supabase.from('test').select('*').limit(1)
        if (error && error.code === '42P01') {
          // Table doesn&apos;t exist, but connection works
          setConnectionStatus('✅ Connected to Supabase!')
        } else if (error) {
          setConnectionStatus('❌ Connection error')
        } else {
          setConnectionStatus('✅ Connected to Supabase!')
        }
      } catch {
        setConnectionStatus('❌ Connection failed')
      }
    }
    
    testConnection()
  }, [])
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold text-gray-900 mb-4">
            🔧 CrankSmith
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Your digital garage for managing bikes, tracking components, and optimizing every ride.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="text-4xl mb-4">🚴‍♂️</div>
            <h3 className="text-lg font-semibold mb-2">Digital Garage</h3>
            <p className="text-gray-600 text-sm">
              Manage multiple bikes and track every component
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="text-4xl mb-4">🔧</div>
            <h3 className="text-lg font-semibold mb-2">Virtual Workbench</h3>
            <p className="text-gray-600 text-sm">
              Compatibility checks and upgrade planning
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="text-4xl mb-4">⚙️</div>
            <h3 className="text-lg font-semibold mb-2">Ride Optimizer</h3>
            <p className="text-gray-600 text-sm">
              Tire pressure, gearing, and setup calculators
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="text-4xl mb-4">💬</div>
            <h3 className="text-lg font-semibold mb-2">Knowledge Base</h3>
            <p className="text-gray-600 text-sm">
              Community reviews and expert advice
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Ready to Build Your Digital Garage?
            </h2>
            <p className="text-gray-600 mb-6">
              Start tracking your bikes and components today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/signup"
                className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors text-center"
              >
                Get Started Free
              </a>
              <a
                href="/login"
                className="bg-white text-indigo-600 border-2 border-indigo-600 px-8 py-3 rounded-lg font-semibold hover:bg-indigo-50 transition-colors text-center"
              >
                Sign In
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-16 text-gray-500">
          <p>Phase 0: Foundation & Scaffolding ✅</p>
          <p className="mt-2 text-sm">Supabase: {connectionStatus}</p>
        </div>
      </div>
    </main>
  );
}