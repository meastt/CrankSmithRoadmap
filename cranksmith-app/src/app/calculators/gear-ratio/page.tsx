// src/app/calculators/gear-ratio/page.tsx (COMPLETE FILE)

'use client'

import { useState, useEffect, FC } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import Link from 'next/link'

// --- Type Definitions ---
interface User {
  id: string;
  email?: string;
}

interface Profile {
  id: string;
  subscription_status?: 'free' | 'premium';
}

interface Bike {
  id: string;
  nickname: string;
  brand: string;
  model: string;
  bike_components: BikeComponent[];
}

interface BikeComponent {
  id: string;
  components: Component[];
}

interface Component {
  id: string;
  brand: string;
  model: string;
  chainrings?: string; // "52/36" or "50/34" format
  cogs?: string; // "11-32" or "10,11,12,13,14,15,16,17,19,21,23,26,30" format
  circumference_mm?: number;
  component_categories: { name: string };
}

interface GearSetup {
  crankset?: Component;
  cassette?: Component;
  wheelCircumference?: number;
}

interface GearRatio {
  gear: number;
  chainring: number;
  cog: number;
  ratio: number;
  speedAt90rpm: number; // km/h
  speedAt90rpmMph: number; // mph
}

interface ComparisonResult {
  easiestGearImprovement: number; // % easier climbing gear
  hardestGearImprovement: number; // % faster top speed
  gearRange: {
    current: number;
    proposed: number;
    improvement: number; // % improvement in range
  };
}

// --- Gear Calculation Logic ---
function parseChainrings(chainrings: string): number[] {
  if (!chainrings) return [50, 34]; // Default compact chainrings
  
  // Handle formats like "52/36", "50-34", "52,36"
  const rings = chainrings.split(/[\/\-,]/).map(r => parseInt(r.trim())).filter(r => !isNaN(r));
  return rings.length > 0 ? rings.sort((a, b) => b - a) : [50, 34]; // Sort descending (big to small)
}

function parseCogs(cogs: string): number[] {
  if (!cogs) return [11, 12, 13, 14, 15, 16, 17, 19, 21, 23, 25, 28]; // Default 11-28 cassette
  
  // Handle formats like "11-32" or "10,11,12,13,14,15,16,17,19,21,23,26,30"
  if (cogs.includes('-') && !cogs.includes(',')) {
    // Range format like "11-32"
    const [min, max] = cogs.split('-').map(c => parseInt(c.trim()));
    if (!isNaN(min) && !isNaN(max)) {
      // Generate typical cassette progression
      if (max <= 28) return [11, 12, 13, 14, 15, 16, 17, 19, 21, 23, 25, 28];
      if (max <= 32) return [11, 12, 13, 14, 15, 16, 17, 19, 21, 24, 28, 32];
      if (max <= 36) return [10, 11, 12, 13, 14, 15, 16, 17, 19, 21, 24, 28, 32, 36];
      return [10, 11, 12, 13, 14, 15, 16, 17, 19, 21, 24, 28, 32, 36, 42, 50];
    }
  }
  
  // Comma-separated format
  const cogArray = cogs.split(',').map(c => parseInt(c.trim())).filter(c => !isNaN(c));
  return cogArray.length > 0 ? cogArray.sort((a, b) => a - b) : [11, 12, 13, 14, 15, 16, 17, 19, 21, 23, 25, 28];
}

function calculateGearRatios(setup: GearSetup, cadence: number = 90): GearRatio[] {
  if (!setup.crankset || !setup.cassette) return [];
  
  const chainrings = parseChainrings(setup.crankset.chainrings || '');
  const cogs = parseCogs(setup.cassette.cogs || '');
  const circumferenceMm = setup.wheelCircumference || 2100; // Default 700x25c wheel
  
  const gears: GearRatio[] = [];
  let gearNumber = 1;
  
  // Generate all gear combinations
  chainrings.forEach(chainring => {
    cogs.forEach(cog => {
      const ratio = chainring / cog;
      const distancePerRevolution = circumferenceMm / 1000; // Convert to meters
      const speedMs = (cadence * distancePerRevolution) / 60; // meters per second
      const speedKmh = speedMs * 3.6; // km/h
      const speedMph = speedKmh * 0.621371; // mph
      
      gears.push({
        gear: gearNumber++,
        chainring,
        cog,
        ratio: Math.round(ratio * 100) / 100,
        speedAt90rpm: Math.round(speedKmh * 10) / 10,
        speedAt90rpmMph: Math.round(speedMph * 10) / 10
      });
    });
  });
  
  // Sort by ratio (ascending - easiest to hardest)
  return gears.sort((a, b) => a.ratio - b.ratio);
}

function compareSetups(currentSetup: GearSetup, proposedSetup: GearSetup): ComparisonResult {
  const currentGears = calculateGearRatios(currentSetup);
  const proposedGears = calculateGearRatios(proposedSetup);
  
  if (currentGears.length === 0 || proposedGears.length === 0) {
    return {
      easiestGearImprovement: 0,
      hardestGearImprovement: 0,
      gearRange: { current: 0, proposed: 0, improvement: 0 }
    };
  }
  
  const currentEasiest = currentGears[0].ratio;
  const currentHardest = currentGears[currentGears.length - 1].ratio;
  const proposedEasiest = proposedGears[0].ratio;
  const proposedHardest = proposedGears[proposedGears.length - 1].ratio;
  
  const easiestGearImprovement = ((currentEasiest - proposedEasiest) / currentEasiest) * 100;
  const hardestGearImprovement = ((proposedHardest - currentHardest) / currentHardest) * 100;
  
  const currentRange = currentHardest / currentEasiest;
  const proposedRange = proposedHardest / proposedEasiest;
  const rangeImprovement = ((proposedRange - currentRange) / currentRange) * 100;
  
  return {
    easiestGearImprovement: Math.round(easiestGearImprovement * 10) / 10,
    hardestGearImprovement: Math.round(hardestGearImprovement * 10) / 10,
    gearRange: {
      current: Math.round(currentRange * 100) / 100,
      proposed: Math.round(proposedRange * 100) / 100,
      improvement: Math.round(rangeImprovement * 10) / 10
    }
  };
}

// --- Main Component ---
export default function GearRatioCalculatorPage() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [selectedBikeId, setSelectedBikeId] = useState<string>('');
  const [currentSetup, setCurrentSetup] = useState<GearSetup>({});
  const [proposedSetup, setProposedSetup] = useState<GearSetup>({});
  const [availableComponents, setAvailableComponents] = useState<Component[]>([]);
  const [cadence, setCadence] = useState<number>(90);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      // Check authentication
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);

      // Get profile
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(profileData);

      // Redirect if not premium
      if (profileData?.subscription_status !== 'premium') {
        router.push('/calculators?upgrade=gear-ratio');
        return;
      }

      // Fetch user's bikes with drivetrain components
      await fetchBikes(user.id);
      
      // Fetch available components for proposed setup
      await fetchAvailableComponents();
      
      setLoading(false);
    };

    fetchData();
  }, [router]);

  const fetchBikes = async (userId: string) => {
    const { data: bikesData, error } = await supabase
      .from('bikes')
      .select(`
        id, 
        nickname, 
        brand, 
        model,
        bike_components (
          components (
            id, 
            brand, 
            model, 
            chainrings, 
            cogs, 
            circumference_mm,
            component_categories (
              name
            )
          )
        )
      `)
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching bikes:', error);
    } else {
      setBikes((bikesData as Bike[]) || []);
    }
  };

  const fetchAvailableComponents = async () => {
    const { data: componentsData, error } = await supabase
      .from('components')
      .select(`
        id, 
        brand, 
        model, 
        chainrings, 
        cogs, 
        circumference_mm,
        component_categories!inner (
          name
        )
      `)
      .in('component_categories.name', ['Crankset', 'Cassette', 'Wheelset']);

    if (error) {
      console.error('Error fetching components:', error);
    } else {
      // Transform the data to match our interface
      const transformedComponents = (componentsData || []).map((comp: any) => ({
        ...comp,
        component_categories: comp.component_categories[0] || { name: 'Unknown' }
      }));
      setAvailableComponents(transformedComponents as Component[]);
    }
  };

  const handleSelectBike = (bikeId: string) => {
    setSelectedBikeId(bikeId);
    const bike = bikes.find(b => b.id === bikeId);
    if (!bike) return;

    // Extract drivetrain components
    const allComponents = bike.bike_components.flatMap(bc => bc.components);
    
    const crankset = allComponents.find(comp => 
      comp.component_categories?.name === 'Crankset'
    );
    
    const cassette = allComponents.find(comp => 
      comp.component_categories?.name === 'Cassette'
    );
    
    const wheel = allComponents.find(comp => 
      comp.component_categories?.name === 'Wheelset'
    );

    setCurrentSetup({
      crankset,
      cassette,
      wheelCircumference: wheel?.circumference_mm || 2100
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Loading Gear Calculator...</p>
        </div>
      </div>
    );
  }

  // Premium gate (backup check)
  if (profile?.subscription_status !== 'premium') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Premium Feature</h1>
            <p className="text-gray-600 mb-6">
              The Gear Ratio Calculator is available to Premium subscribers only.
            </p>
            <Link 
              href="/upgrade" 
              className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
            >
              Upgrade to Premium
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const currentGears = calculateGearRatios(currentSetup, cadence);
  const proposedGears = calculateGearRatios(proposedSetup, cadence);
  const comparison = compareSetups(currentSetup, proposedSetup);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/calculators" className="text-sm text-indigo-600 hover:text-indigo-800 mb-4 inline-block">
            ← Back to All Calculators
          </Link>
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-gray-900 mb-2">
            Gear Ratio Calculator
          </h1>
          <p className="text-lg text-gray-600">
            Compare your current gearing vs potential upgrades. Premium Feature.
          </p>
        </div>

        {/* Settings Row */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="grid md:grid-cols-3 gap-6">
            {/* Bike Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Your Bike
              </label>
              <select
                value={selectedBikeId}
                onChange={(e) => handleSelectBike(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Choose a bike...</option>
                {bikes.map(bike => (
                  <option key={bike.id} value={bike.id}>
                    {bike.nickname} ({bike.brand} {bike.model})
                  </option>
                ))}
              </select>
            </div>

            {/* Cadence Setting */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Cadence (RPM)
              </label>
              <input
                type="number"
                value={cadence}
                onChange={(e) => setCadence(parseInt(e.target.value) || 90)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                min="60"
                max="120"
              />
            </div>

            {/* Comparison Summary */}
            {currentGears.length > 0 && proposedGears.length > 0 && (
              <div className="bg-purple-50 rounded-lg p-4">
                <h3 className="font-medium text-purple-900 mb-2">Quick Comparison</h3>
                <div className="text-sm text-purple-800 space-y-1">
                  {comparison.easiestGearImprovement !== 0 && (
                    <p>Climbing: {comparison.easiestGearImprovement > 0 ? '+' : ''}{comparison.easiestGearImprovement}% easier</p>
                  )}
                  {comparison.hardestGearImprovement !== 0 && (
                    <p>Top Speed: {comparison.hardestGearImprovement > 0 ? '+' : ''}{comparison.hardestGearImprovement}% faster</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Two-Card Interface */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Current Setup Card */}
          <div className="bg-white rounded-lg shadow-lg border border-gray-200">
            <div className="bg-blue-50 px-6 py-4 border-b border-blue-200">
              <h2 className="text-xl font-semibold text-blue-900">Current Setup</h2>
              <p className="text-sm text-blue-700">From your garage</p>
            </div>
            
            <div className="p-6">
              {selectedBikeId ? (
                <CurrentSetupDisplay 
                  setup={currentSetup} 
                  gears={currentGears}
                  cadence={cadence}
                />
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">🚴‍♂️</div>
                  <p className="text-gray-600">Select a bike to load your current gearing</p>
                </div>
              )}
            </div>
          </div>

          {/* Proposed Setup Card */}
          <div className="bg-white rounded-lg shadow-lg border border-gray-200">
            <div className="bg-green-50 px-6 py-4 border-b border-green-200">
              <h2 className="text-xl font-semibold text-green-900">Proposed Setup</h2>
              <p className="text-sm text-green-700">Choose components to compare</p>
            </div>
            
            <div className="p-6">
              <ProposedSetupForm
                setup={proposedSetup}
                setSetup={setProposedSetup}
                availableComponents={availableComponents}
                currentSetup={currentSetup}
              />
              
              {proposedGears.length > 0 && (
                <div className="mt-6">
                  <GearTable gears={proposedGears} cadence={cadence} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Detailed Comparison */}
        {currentGears.length > 0 && proposedGears.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Detailed Comparison</h2>
            <DetailedComparison 
              currentGears={currentGears}
              proposedGears={proposedGears}
              comparison={comparison}
              cadence={cadence}
            />
          </div>
        )}
      </main>
    </div>
  );
}

// --- Sub Components ---

const CurrentSetupDisplay: FC<{ setup: GearSetup; gears: GearRatio[]; cadence: number }> = ({ setup, gears, cadence }) => {
  if (!setup.crankset || !setup.cassette) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-2">⚠️</div>
        <p className="text-gray-600 mb-2">Missing drivetrain components</p>
        <p className="text-sm text-gray-500">
          Add a crankset and cassette to your bike to use this calculator
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Component Info */}
      <div className="space-y-3">
        <div className="border-l-4 border-blue-500 pl-3">
          <h4 className="font-medium text-gray-900">Crankset</h4>
          <p className="text-sm text-gray-600">{setup.crankset.brand} {setup.crankset.model}</p>
          <p className="text-xs text-gray-500">Chainrings: {setup.crankset.chainrings || 'Not specified'}</p>
        </div>
        
        <div className="border-l-4 border-blue-500 pl-3">
          <h4 className="font-medium text-gray-900">Cassette</h4>
          <p className="text-sm text-gray-600">{setup.cassette.brand} {setup.cassette.model}</p>
          <p className="text-xs text-gray-500">Cogs: {setup.cassette.cogs || 'Not specified'}</p>
        </div>
      </div>

      {/* Gear Table */}
      {gears.length > 0 && <GearTable gears={gears} cadence={cadence} />}
    </div>
  );
};

const ProposedSetupForm: FC<{
  setup: GearSetup;
  setSetup: (setup: GearSetup) => void;
  availableComponents: Component[];
  currentSetup: GearSetup;
}> = ({ setup, setSetup, availableComponents, currentSetup }) => {
  
  const cranksets = availableComponents.filter(c => 
    c.component_categories?.name === 'Crankset'
  );
  const cassettes = availableComponents.filter(c => 
    c.component_categories?.name === 'Cassette'
  );

  const handleComponentSelect = (componentId: string, type: 'crankset' | 'cassette') => {
    const component = availableComponents.find(c => c.id === componentId);
    if (component) {
      setSetup({
        ...setup,
        [type]: component,
        wheelCircumference: setup.wheelCircumference || currentSetup.wheelCircumference || 2100
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Crankset Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Proposed Crankset
        </label>
        <select
          value={setup.crankset?.id || ''}
          onChange={(e) => handleComponentSelect(e.target.value, 'crankset')}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">Select a crankset...</option>
          {cranksets.map(crankset => (
            <option key={crankset.id} value={crankset.id}>
              {crankset.brand} {crankset.model} {crankset.chainrings ? `(${crankset.chainrings})` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Cassette Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Proposed Cassette
        </label>
        <select
          value={setup.cassette?.id || ''}
          onChange={(e) => handleComponentSelect(e.target.value, 'cassette')}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">Select a cassette...</option>
          {cassettes.map(cassette => (
            <option key={cassette.id} value={cassette.id}>
              {cassette.brand} {cassette.model} {cassette.cogs ? `(${cassette.cogs})` : ''}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

const GearTable: FC<{ gears: GearRatio[]; cadence: number }> = ({ gears, cadence }) => (
  <div>
    <h4 className="font-medium text-gray-900 mb-3">Gear Ratios @ {cadence} RPM</h4>
    <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-md">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 sticky top-0">
          <tr>
            <th className="px-3 py-2 text-left">Gear</th>
            <th className="px-3 py-2 text-left">Ratio</th>
            <th className="px-3 py-2 text-left">Speed</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {gears.map(gear => (
            <tr key={`${gear.chainring}-${gear.cog}`} className="hover:bg-gray-50">
              <td className="px-3 py-2">{gear.chainring}t → {gear.cog}t</td>
              <td className="px-3 py-2">{gear.ratio}</td>
              <td className="px-3 py-2">{gear.speedAt90rpm} km/h</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const DetailedComparison: FC<{
  currentGears: GearRatio[];
  proposedGears: GearRatio[];
  comparison: ComparisonResult;
  cadence: number;
}> = ({ currentGears, proposedGears, comparison, cadence }) => (
  <div className="space-y-6">
    {/* Key Insights */}
    <div className="grid md:grid-cols-3 gap-4">
      <div className="bg-green-50 rounded-lg p-4 border border-green-200">
        <h4 className="font-medium text-green-900">Climbing Gear</h4>
        <p className="text-2xl font-bold text-green-600">
          {comparison.easiestGearImprovement > 0 ? '+' : ''}{comparison.easiestGearImprovement}%
        </p>
        <p className="text-sm text-green-700">
          {comparison.easiestGearImprovement > 0 ? 'Easier' : 'Harder'} climbing
        </p>
      </div>
      
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <h4 className="font-medium text-blue-900">Top Speed</h4>
        <p className="text-2xl font-bold text-blue-600">
          {comparison.hardestGearImprovement > 0 ? '+' : ''}{comparison.hardestGearImprovement}%
        </p>
        <p className="text-sm text-blue-700">
          {comparison.hardestGearImprovement > 0 ? 'Faster' : 'Slower'} top end
        </p>
      </div>
      
      <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
        <h4 className="font-medium text-purple-900">Gear Range</h4>
        <p className="text-2xl font-bold text-purple-600">
          {comparison.gearRange.improvement > 0 ? '+' : ''}{comparison.gearRange.improvement}%
        </p>
        <p className="text-sm text-purple-700">Range improvement</p>
      </div>
    </div>

    {/* Side by Side Tables */}
    <div className="grid md:grid-cols-2 gap-6">
      <div>
        <h4 className="font-medium text-gray-900 mb-3">Current Gearing</h4>
        <GearTable gears={currentGears} cadence={cadence} />
      </div>
      
      <div>
        <h4 className="font-medium text-gray-900 mb-3">Proposed Gearing</h4>
        <GearTable gears={proposedGears} cadence={cadence} />
      </div>
    </div>
  </div>
);