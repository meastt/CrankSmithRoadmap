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

type ProductType = 'crankset' | 'cassette' | 'wheel' | 'derailleur' | 'shifter' | 'brake' | 'frame' | 'fork' | 'bottom_bracket';

interface BaseProduct {
  id: string;
  brand: string;
  model: string;
  product_type: ProductType;
  description?: string;
  weight_grams?: number;
  msrp_cents?: number;
}

interface CassetteDetails {
  cogs: number[];
  speeds?: number;
  min_cog_teeth?: number;
  max_cog_teeth?: number;
  freehub_standard?: string;
}

interface CranksetDetails {
  chainrings: number[];
  speeds?: number;
  bcd?: string;
  q_factor_mm?: number;
  arm_length_mm?: number;
}

interface WheelDetails {
  circumference_mm: number;
  wheel_diameter_iso_mm?: number;
  internal_rim_width_mm?: number;
  external_rim_width_mm?: number;
  rim_type?: string;
  freehub_standard?: string;
  tubeless_ready?: boolean;
}

interface DerailleurDetails {
  position: 'front' | 'rear';
  speeds: number;
  max_cog_capacity?: number;
  min_cog_capacity?: number;
  total_capacity?: number;
  cage_length?: 'short' | 'medium' | 'long';
  actuation_ratio?: number;
  is_electronic: boolean;
}

interface ShifterDetails {
  position: 'front' | 'rear' | 'pair';
  speeds: number;
  actuation_ratio?: number;
  is_electronic: boolean;
  brake_compatibility?: string;
}

interface BrakeDetails {
  position: 'front' | 'rear' | 'set';
  brake_type: 'hydraulic disc' | 'mechanical disc' | 'rim';
  mount_type?: 'flat mount' | 'post mount' | 'IS mount';
  fluid_type?: 'mineral oil' | 'DOT 5.1';
  lever_pull?: 'short-pull' | 'long-pull';
}

type Component = BaseProduct & {
  cassettes?: CassetteDetails;
  cranksets?: CranksetDetails;
  wheels?: WheelDetails;
  derailleurs?: DerailleurDetails;
  shifters?: ShifterDetails;
  brakes?: BrakeDetails;
};

interface Bike {
  id: string;
  nickname: string;
  brand: string;
  model: string;
  bikes_products: {
    product: Component;
  }[];
}

interface GearSetup {
  crankset?: Component;
  cassette?: Component;
  wheelCircumference?: number;
}
interface GearRatio { gear: number; chainring: number; cog: number; ratio: number; speedAt90rpm: number; speedAt90rpmMph: number; }
interface ComparisonResult { easiestGearImprovement: number; hardestGearImprovement: number; gearRange: { current: number; proposed: number; improvement: number; }; }


// --- Gear Calculation Logic ---
function calculateGearRatios(setup: GearSetup, cadence: number = 90): GearRatio[] {
  const chainrings = setup.crankset?.cranksets?.chainrings || [];
  const cogs = setup.cassette?.cassettes?.cogs || [];
  if (chainrings.length === 0 || cogs.length === 0) return [];

  const circumferenceMm = setup.wheelCircumference || 2100;
  const gears: GearRatio[] = [];
  let gearNumber = 1;
  
  const sortedChainrings = [...chainrings].sort((a, b) => b - a);
  const sortedCogs = [...cogs].sort((a, b) => a - b);
  
  sortedChainrings.forEach(chainring => {
    sortedCogs.forEach(cog => {
      const ratio = chainring / cog;
      const distancePerRevolution = circumferenceMm / 1000;
      const speedMs = (cadence * distancePerRevolution) / 60;
      const speedKmh = speedMs * 3.6;
      const speedMph = speedKmh * 0.621371;
      
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

  // Find easiest gears (lowest ratios for climbing)
  const currentEasiest = Math.min(...currentGears.map(g => g.ratio));
  const proposedEasiest = Math.min(...proposedGears.map(g => g.ratio));
  
  // Find hardest gears (highest ratios for top speed)
  const currentHardest = Math.max(...currentGears.map(g => g.ratio));
  const proposedHardest = Math.max(...proposedGears.map(g => g.ratio));
  
  // Calculate improvements (negative ratio change = easier climbing)
  const easiestGearImprovement = Math.round(((proposedEasiest - currentEasiest) / currentEasiest) * -100);
  const hardestGearImprovement = Math.round(((proposedHardest - currentHardest) / currentHardest) * 100);
  
  // Calculate gear range improvements
  const currentRange = currentHardest / currentEasiest;
  const proposedRange = proposedHardest / proposedEasiest;
  const rangeImprovement = Math.round(((proposedRange - currentRange) / currentRange) * 100);
  
  return {
    easiestGearImprovement,
    hardestGearImprovement,
    gearRange: {
      current: Math.round(currentRange * 100) / 100,
      proposed: Math.round(proposedRange * 100) / 100,
      improvement: rangeImprovement
    }
  };
}


// --- Main Component ---
export default function GearRatioCalculatorPage() {
  const [, setUser] = useState<User | null>(null);
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
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      setUser(user);

      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(profileData);

      if (profileData?.subscription_status !== 'premium') { router.push('/calculators?upgrade=gear-ratio'); return; }

      await fetchBikes(user.id);
      await fetchAvailableComponents();
      
      setLoading(false);
    };

    fetchData();
  }, [router]);


  const fetchBikes = async (userId: string) => {
    //
    // THE FIX IS HERE: Removing `!inner` changes the query from an INNER JOIN
    // to a LEFT JOIN. This is more robust and will return bikes even if they
    // have no components linked in bikes_products yet.
    //
    const { data: bikesData, error } = await supabase
      .from('bikes')
      .select(`
        id, nickname, brand, model,
        bikes_products (
          product:products (
            id, brand, model, product_type,
            cranksets(*),
            cassettes(*),
            wheels(*),
            derailleurs(*),
            shifters(*),
            brakes(*)
          )
        )
      `)
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching bikes. Supabase error details:', JSON.stringify(error, null, 2));
    } else {
      // This log is crucial for debugging. Check your browser console for this.
      console.log('Successfully fetched bikes data:', bikesData); 
      
      if (bikesData) {
        const transformedBikes: Bike[] = bikesData.map(transformBikeData).filter(Boolean) as Bike[];
        setBikes(transformedBikes);
      } else {
        setBikes([]);
      }
    }
  };
  

  const fetchAvailableComponents = async () => {
    const { data: componentsData, error } = await supabase
      .from('products')
      .select(`
        id, brand, model, product_type,
        cranksets ( * ),
        cassettes ( * ),
        wheels ( * )
      `)
      .in('product_type', ['crankset', 'cassette', 'wheel']);

    if (error) {
      console.error('Error fetching available components:', JSON.stringify(error, null, 2));
    } else {
      const transformedComponents: Component[] = (componentsData || []).map(transformComponentData).filter(Boolean) as Component[];
      setAvailableComponents(transformedComponents);
    }
  };

  const transformComponentData = (comp: any): Component | undefined => {
    if (!comp) return undefined;
    return {
      ...comp,
      cassettes: comp.cassettes?.[0] || comp.cassettes,
      cranksets: comp.cranksets?.[0] || comp.cranksets,
      wheels: comp.wheels?.[0] || comp.wheels,
      derailleurs: comp.derailleurs?.[0] || comp.derailleurs,
      shifters: comp.shifters?.[0] || comp.shifters,
      brakes: comp.brakes?.[0] || comp.brakes,
    }
  };

  const transformBikeData = (bike: any): Bike | undefined => {
    if (!bike) return undefined;
    return {
      ...bike,
      bikes_products: (bike.bikes_products || []).map((bp: any) => ({
        product: bp.product ? transformComponentData(bp.product) : undefined,
      })).filter((bp: any) => bp.product !== undefined),
    }
  };

  const handleSelectBike = (bikeId: string) => {
    setSelectedBikeId(bikeId);
    const bike = bikes.find(b => b.id === bikeId);
    if (!bike) return;
    const allProducts = bike.bikes_products.map(bp => bp.product).filter(Boolean) as Component[];
    const crankset = allProducts.find(comp => comp.product_type === 'crankset');
    const cassette = allProducts.find(comp => comp.product_type === 'cassette');
    const wheel = allProducts.find(comp => comp.product_type === 'wheel');
    setCurrentSetup({ crankset, cassette, wheelCircumference: wheel?.wheels?.circumference_mm || 2100 });
    setProposedSetup({});
  };

  if (loading) { return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-600">Loading Gear Calculator...</p></div>; }
  if (profile?.subscription_status !== 'premium') { return <div className="min-h-screen bg-gray-50"><Header /><main className="max-w-4xl mx-auto px-4 py-8"><div className="bg-white rounded-lg shadow-lg p-8 text-center"><div className="text-6xl mb-4">🔒</div><h1 className="text-2xl font-bold text-gray-900 mb-4">Premium Feature</h1><p className="text-gray-600 mb-6">The Gear Ratio Calculator is available to Premium subscribers only.</p><Link href="/upgrade" className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors">Upgrade to Premium</Link></div></main></div>; }

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
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="grid md:grid-cols-3 gap-6">
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
        <div className="grid lg:grid-cols-2 gap-8">
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
        <p className="text-sm text-gray-500">Add a crankset and cassette to your bike to use this calculator</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="border-l-4 border-blue-500 pl-3">
          <h4 className="font-medium text-gray-900">Crankset</h4>
          <p className="text-sm text-gray-600">{setup.crankset.brand} {setup.crankset.model}</p>
          <p className="text-xs text-gray-500">Chainrings: {setup.crankset.cranksets?.chainrings?.join(', ') || 'Not specified'}</p>
        </div>
        <div className="border-l-4 border-blue-500 pl-3">
          <h4 className="font-medium text-gray-900">Cassette</h4>
          <p className="text-sm text-gray-600">{setup.cassette.brand} {setup.cassette.model}</p>
          <p className="text-xs text-gray-500">Cogs: {setup.cassette.cassettes?.cogs?.join(', ') || 'Not specified'}</p>
        </div>
        {setup.wheelCircumference && (
          <div className="border-l-4 border-blue-500 pl-3">
            <h4 className="font-medium text-gray-900">Wheel Circumference</h4>
            <p className="text-sm text-gray-600">{setup.wheelCircumference} mm</p>
            <p className="text-xs text-gray-500">This value is used for speed calculations</p>
          </div>
        )}
      </div>
      {gears.length > 0 && <GearTable gears={gears} cadence={cadence} />}
    </div>
  );
};
const ProposedSetupForm: FC<{ setup: GearSetup; setSetup: (setup: GearSetup) => void; availableComponents: Component[]; currentSetup: GearSetup; }> = ({ setup, setSetup, availableComponents, currentSetup }) => {
  const cranksets = availableComponents.filter(c => c.product_type === 'crankset');
  const cassettes = availableComponents.filter(c => c.product_type === 'cassette');
  
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
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Proposed Crankset</label>
        <select
          value={setup.crankset?.id || ''}
          onChange={(e) => handleComponentSelect(e.target.value, 'crankset')}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">Select a crankset...</option>
          {cranksets.map(crankset => (
            <option key={crankset.id} value={crankset.id}>
              {crankset.brand} {crankset.model} {crankset.cranksets?.chainrings ? `(${crankset.cranksets.chainrings.join(', ')})` : ''}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Proposed Cassette</label>
        <select
          value={setup.cassette?.id || ''}
          onChange={(e) => handleComponentSelect(e.target.value, 'cassette')}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">Select a cassette...</option>
          {cassettes.map(cassette => (
            <option key={cassette.id} value={cassette.id}>
              {cassette.brand} {cassette.model} {cassette.cassettes?.cogs ? `(${cassette.cassettes.cogs[0]}-${cassette.cassettes.cogs[cassette.cassettes.cogs.length - 1]})` : ''}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Wheel Circumference (mm)</label>
        <input
          type="number"
          value={setup.wheelCircumference || ''}
          onChange={(e) => setSetup({ ...setup, wheelCircumference: parseInt(e.target.value) || undefined })}
          placeholder={`e.g., ${currentSetup.wheelCircumference || 2100} (from current bike)`}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          min="1000"
          max="3000"
        />
        <p className="mt-1 text-xs text-gray-500">Overrides the selected bike&rsquo;s wheel circumference for this comparison.</p>
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
const DetailedComparison: FC<{ currentGears: GearRatio[]; proposedGears: GearRatio[]; comparison: ComparisonResult; cadence: number; }> = ({ currentGears, proposedGears, comparison, cadence }) => (
  <div className="space-y-6">
    <div className="grid md:grid-cols-3 gap-4">
      <div className="bg-green-50 rounded-lg p-4 border border-green-200">
        <h4 className="font-medium text-green-900">Climbing Gear</h4>
        <p className="text-2xl font-bold text-green-600">{comparison.easiestGearImprovement > 0 ? '+' : ''}{comparison.easiestGearImprovement}%</p>
        <p className="text-sm text-green-700">{comparison.easiestGearImprovement > 0 ? 'Easier' : 'Harder'} climbing</p>
      </div>
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <h4 className="font-medium text-blue-900">Top Speed</h4>
        <p className="text-2xl font-bold text-blue-600">{comparison.hardestGearImprovement > 0 ? '+' : ''}{comparison.hardestGearImprovement}%</p>
        <p className="text-sm text-blue-700">{comparison.hardestGearImprovement > 0 ? 'Faster' : 'Slower'} top end</p>
      </div>
      <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
        <h4 className="font-medium text-purple-900">Gear Range</h4>
        <p className="text-2xl font-bold text-purple-600">{comparison.gearRange.improvement > 0 ? '+' : ''}{comparison.gearRange.improvement}%</p>
        <p className="text-sm text-purple-700">Range improvement</p>
      </div>
    </div>
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