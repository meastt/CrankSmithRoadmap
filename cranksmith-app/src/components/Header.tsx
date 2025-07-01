// src/components/Header.tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface HeaderProps {
  user?: any
  profile?: any
  title?: string
  subtitle?: string
  backTo?: {
    href: string
    label: string
  }
}

export default function Header({ user, profile, title, subtitle, backTo }: HeaderProps) {
  const pathname = usePathname()
  const router = useRouter()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const getPageInfo = () => {
    if (title && subtitle) return { title, subtitle }
    
    if (pathname === '/garage') return { title: 'Your Digital Garage', subtitle: 'Manage your bikes and components' }
    if (pathname === '/calculators') return { title: 'Calculators', subtitle: 'Pre-ride optimization tools' }
    if (pathname.includes('/calculators/tire-pressure')) return { title: 'Tire Pressure Calculator', subtitle: 'Get optimal pressure recommendations' }
    if (pathname.includes('/calculators/gear')) return { title: 'Gear Calculator', subtitle: 'Compare gear ratios and speeds' }
    if (pathname.includes('/add-component')) return { title: 'Add Component', subtitle: 'Find and add parts to your bike' }
    if (pathname.includes('/bike/')) return { title: 'Bike Details', subtitle: 'View and manage components' }
    
    return { title: 'CrankSmith', subtitle: 'Your digital bike workshop' }
  }

  const { title: pageTitle, subtitle: pageSubtitle } = getPageInfo()

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4">
        {/* Top row - Logo and user info */}
        <div className="flex justify-between items-center py-4">
          <Link href="/garage" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
            <span className="text-2xl">🔧</span>
            <span className="text-xl font-bold text-gray-900">CrankSmith</span>
          </Link>
          
          {user && (
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600 hidden sm:block">
                  {user.email}
                </span>
                {profile?.subscription_status === 'free' && (
                  <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs font-medium">
                    Free
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
          )}
        </div>

        {/* Navigation Bar */}
        {user && (
          <div className="flex items-center space-x-8 pb-4">
            <Link 
              href="/garage"
              className={`text-sm font-medium transition-colors ${
                pathname === '/garage' || pathname.includes('/bike/')
                  ? 'text-indigo-600 border-b-2 border-indigo-600 pb-2' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Garage
            </Link>
            <Link 
              href="/calculators"
              className={`text-sm font-medium transition-colors ${
                pathname.includes('/calculators')
                  ? 'text-indigo-600 border-b-2 border-indigo-600 pb-2' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Calculators
            </Link>
            {/* Future navigation items */}
            <span className="text-sm text-gray-400">Tools (Coming Soon)</span>
            <span className="text-sm text-gray-400">Community (Coming Soon)</span>
          </div>
        )}

        {/* Bottom row - Page title and breadcrumb */}
        <div className="flex items-center justify-between pb-4">
          <div className="flex items-center space-x-4">
            {backTo && (
              <Link 
                href={backTo.href}
                className="text-sm text-indigo-600 hover:text-indigo-700 transition-colors flex items-center"
              >
                ← {backTo.label}
              </Link>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{pageTitle}</h1>
              {pageSubtitle && (
                <p className="text-sm text-gray-600 mt-1">{pageSubtitle}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}