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
          // Table doesn't exist, but connection works
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
    <main className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold mb-4" style={{ color: 'var(--foreground)' }}>
            🚴 CrankSmith
          </h1>
          <p className="text-xl max-w-2xl mx-auto" style={{ color: 'var(--muted)' }}>
            Your digital garage for managing bikes, tracking components, and optimizing every ride.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          <div className="card text-center">
            <div className="card-content">
              <div className="text-4xl mb-4">🚴‍♂️</div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--foreground)' }}>
                Digital Garage
              </h3>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                Manage multiple bikes and track every component
              </p>
            </div>
          </div>

          <div className="card text-center">
            <div className="card-content">
              <div className="text-4xl mb-4">🔧</div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--foreground)' }}>
                Virtual Workbench
              </h3>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                Compatibility checks and upgrade planning
              </p>
            </div>
          </div>

          <div className="card text-center">
            <div className="card-content">
              <div className="text-4xl mb-4">⚙️</div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--foreground)' }}>
                Ride Optimizer
              </h3>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                Tire pressure, gearing, and setup calculators
              </p>
            </div>
          </div>

          <div className="card text-center">
            <div className="card-content">
              <div className="text-4xl mb-4">💬</div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--foreground)' }}>
                Knowledge Base
              </h3>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                Community reviews and expert advice
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <div className="card max-w-md mx-auto">
            <div className="card-content">
              <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--foreground)' }}>
                Ready to Build Your Digital Garage?
              </h2>
              <p className="mb-6" style={{ color: 'var(--muted)' }}>
                Start tracking your bikes and components today.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="/signup"
                  className="btn-primary text-center"
                >
                  Get Started Free
                </a>
                <a
                  href="/login"
                  className="btn-secondary text-center"
                >
                  Sign In
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-16" style={{ color: 'var(--muted-light)' }}>
          <p>Phase 0: Foundation & Scaffolding ✅</p>
          <p className="mt-2 text-sm">Supabase: {connectionStatus}</p>
        </div>
      </div>
    </main>
  );
}