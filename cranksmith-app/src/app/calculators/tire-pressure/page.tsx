// src/app/calculators/tire-pressure/page.tsx (CORRECTED)

'use client'

import { useState, useEffect, useReducer, FC, ChangeEvent, FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import Link from 'next/link'
import { AdvancedCalculationInputs, PressureResult, calculateAdvancedPressure } from '@/lib/tire-pressure-logic'

// --- Type Definitions ---
interface Bike {
  id: string;
  nickname: string;
  brand: string;
  model: string;
  bike_components: {
    components: {
      id: string;
      brand: string;
      model: string;
      tire_width_mm?: number;
      casing_type?: 'standard' | 'supple' | 'ultra-supple';
      internal_rim_width_mm?: number;
      rim_type?: 'hooked' | 'hookless';
      // It would be a good idea to add wheel_diameter to your component data in the future
      component_categories: { name: string }[];
    }[];
  }[];
}

interface User {
  id: string;
  email?: string;
}

interface Profile {
  id: string;
  subscription_status?: 'free' | 'premium';
}

// --- useReducer for Form State ---
// Allow number fields to be an empty string during user input
type FormState = Omit<AdvancedCalculationInputs, 'riderWeightLbs' | 'bikeWeightLbs' | 'rimWidthMm'> & {
    riderWeightLbs: number | '';
    bikeWeightLbs: number | '';
    rimWidthMm: number | '';
};

type FormAction =
  | { type: 'SET_FIELD'; field: keyof FormState; value: any }
  | { type: 'LOAD_BIKE'; payload: Partial<FormState> };

const initialState: FormState = {
  riderWeightLbs: 165,
  bikeWeightLbs: 19,
  tireWidthMm: 28,
  rimWidthMm: 21,
  wheelDiameter: '700c',
  surfaceType: 'pavement',
  tireCasing: 'standard',
  tireType: 'tubeless',
  isHookless: false,
};

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'SET_FIELD':
      // For number fields, parse to float but allow empty string for user input
      if (['riderWeightLbs', 'bikeWeightLbs', 'rimWidthMm'].includes(action.field)) {
        const parsedValue = parseFloat(action.value);
        return { ...state, [action.field]: isNaN(parsedValue) ? '' : parsedValue };
      }
      return { ...state, [action.field]: action.value };

    case 'LOAD_BIKE':
      // FIX 2: Use nullish coalescing (??) for safer fallbacks (handles 0 correctly)
      const payloadWithDefaults = {
        tireWidthMm: action.payload.tireWidthMm ?? state.tireWidthMm,
        rimWidthMm: action.payload.rimWidthMm ?? state.rimWidthMm,
        isHookless: action.payload.isHookless ?? state.isHookless,
        tireCasing: action.payload.tireCasing ?? state.tireCasing,
      };
      return { ...state, ...payloadWithDefaults };

    default:
      return state;
  }
}

// --- Main Page Component ---
export default function TirePressureCalculatorPage() {
  const [, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [selectedBikeId, setSelectedBikeId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [result, setResult] = useState<PressureResult | null>(null);
  const router = useRouter();

  const [formState, dispatch] = useReducer(formReducer, initialState);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);

      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(profileData);

      if (profileData?.subscription_status === 'premium') {
        await fetchBikes(user.id);
      }
      setLoading(false);
    };
    fetchData();
  }, [router]);

  const fetchBikes = async (userId: string) => {
    const { data: bikesData, error } = await supabase
      .from('bikes')
      .select(`
        id, nickname, brand, model,
        bike_components (
          components (
            id, brand, model, tire_width_mm, casing_type, internal_rim_width_mm, rim_type,
            component_categories (name)
          )
        )
      `)
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching bikes:', error);
      setBikes([]);
    } else {
      setBikes((bikesData as Bike[]) || []);
    }
  };

  const handleSelectBike = (bikeId: string) => {
    setSelectedBikeId(bikeId);
    const bike = bikes.find(b => b.id === bikeId);
    if (!bike) return;

    // Find tire and wheel components
    const allComponents = bike.bike_components.flatMap(bc => bc.components);
    
    const tire = allComponents.find(comp => 
      comp.component_categories.some(cat => cat.name === 'Tire')
    );
    
    const wheel = allComponents.find(comp => 
      comp.component_categories.some(cat => cat.name === 'Wheelset')
    );

    dispatch({
      type: 'LOAD_BIKE',
      payload: {
        tireWidthMm: tire?.tire_width_mm,
        rimWidthMm: wheel?.internal_rim_width_mm,
        isHookless: wheel?.rim_type === 'hookless',
        tireCasing: tire?.casing_type,
      },
    });
  };

  const handleCalculate = (e: FormEvent) => {
    e.preventDefault();
    setCalculating(true);
    // Use a timeout to simulate calculation and show loading state
    setTimeout(() => {
        // Ensure that empty strings are treated as 0 for calculation
        const calculationInputs: AdvancedCalculationInputs = {
            ...formState,
            riderWeightLbs: Number(formState.riderWeightLbs) || 0,
            bikeWeightLbs: Number(formState.bikeWeightLbs) || 0,
            rimWidthMm: Number(formState.rimWidthMm) || 0,
        };
        const pressureResult = calculateAdvancedPressure(calculationInputs);
        setResult(pressureResult);
        setCalculating(false);
        // Optional: Scroll to results on mobile
        const resultsEl = document.getElementById('results-section');
        if (resultsEl) {
            resultsEl.scrollIntoView({ behavior: 'smooth' });
        }
    }, 500);
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Loading Calculator...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/calculators" className="text-sm text-indigo-600 hover:text-indigo-800 mb-4 inline-block">
            ← Back to All Calculators
          </Link>
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-gray-900 mb-2">
            Advanced Tire Pressure Calculator
          </h1>
          <p className="text-lg text-gray-600">
            Optimal pressure based on physics for performance, comfort, and grip.
          </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3">
            <InputForm
              formState={formState}
              dispatch={dispatch}
              onSubmit={handleCalculate}
              isPremium={profile?.subscription_status === 'premium'}
              bikes={bikes}
              selectedBikeId={selectedBikeId}
              onSelectBike={handleSelectBike}
              isCalculating={calculating}
            />
          </div>
          
          <div className="lg:col-span-2 space-y-6" id="results-section">
            {result && <ResultsDisplay result={result} />}
            {profile?.subscription_status !== 'premium' && !result && <PremiumUpsell />}
            <TirePressureTips />
            {profile?.subscription_status !== 'premium' && result && <PremiumUpsell />}
          </div>
        </div>
      </main>
    </div>
  );
}

// --- Sub-Components ---

interface InputFormProps {
  formState: FormState;
  dispatch: React.Dispatch<FormAction>;
  onSubmit: (e: FormEvent) => void;
  isPremium: boolean;
  bikes: Bike[];
  selectedBikeId: string;
  onSelectBike: (id: string) => void;
  isCalculating: boolean;
}

const InputForm: FC<InputFormProps> = ({ formState, dispatch, onSubmit, isPremium, bikes, selectedBikeId, onSelectBike, isCalculating }) => {
  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const processedValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    dispatch({ type: 'SET_FIELD', field: name as keyof FormState, value: processedValue });
  };
  
  const tireWidthOptions = [
    { value: 23, label: '23mm' }, { value: 25, label: '25mm' }, { value: 26, label: '26mm' },
    { value: 28, label: '28mm' }, { value: 30, label: '30mm' }, { value: 32, label: '32mm' },
    { value: 34, label: '34mm' }, { value: 35, label: '35mm' }, { value: 36, label: '36mm' },
    { value: 38, label: '38mm' }, { value: 40, label: '40mm' }, { value: 42, label: '42mm' },
    { value: 44, label: '44mm' }, { value: 45, label: '45mm' }, { value: 47, label: '47mm' },
    { value: 50, label: '50mm' },
    { value: 53.3, label: '2.1"' }, { value: 55.9, label: '2.2"' }, { value: 57.2, label: '2.25"' },
    { value: 59.7, label: '2.35"' }, { value: 61, label: '2.4"' }, { value: 63.5, label: '2.5"' },
    { value: 66, label: '2.6"' },
  ];

  return (
    <form onSubmit={onSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sm:p-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Your Setup Details</h2>
      
      {isPremium && bikes.length > 0 && (
        <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
          <h3 className="font-medium text-purple-900 mb-3">Premium: Auto-fill from Your Garage</h3>
          <select value={selectedBikeId} onChange={(e) => onSelectBike(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500">
            <option value="">Select a bike to auto-fill...</option>
            {bikes.map(bike => <option key={bike.id} value={bike.id}>{bike.nickname} ({bike.brand} {bike.model})</option>)}
          </select>
        </div>
      )}
      
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label htmlFor="riderWeightLbs" className="block text-sm font-medium text-gray-700 mb-1">Rider Weight (lbs)</label>
            {/* FIX 1: Add fallback to '' to prevent uncontrolled input error */}
            <input id="riderWeightLbs" type="number" name="riderWeightLbs" value={formState.riderWeightLbs || ''} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-md shadow-sm" min="80" max="350" step="1" required />
          </div>
          <div>
            <label htmlFor="bikeWeightLbs" className="block text-sm font-medium text-gray-700 mb-1">Total Bike Weight (lbs)</label>
            {/* FIX 1: Add fallback to '' to prevent uncontrolled input error */}
            <input id="bikeWeightLbs" type="number" name="bikeWeightLbs" value={formState.bikeWeightLbs || ''} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-md shadow-sm" min="10" max="50" step="0.5" required />
          </div>
        </div>

        <div>
            <label htmlFor="wheelDiameter" className="block text-sm font-medium text-gray-700 mb-1">Wheel Diameter</label>
            <select id="wheelDiameter" name="wheelDiameter" value={formState.wheelDiameter} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-md shadow-sm">
                <option value="700c">700c (Road, Gravel, CX)</option>
                <option value="650b">650b / 27.5" (Gravel, MTB)</option>
                <option value="29er">29" (MTB)</option>
            </select>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
                <label htmlFor="tireWidthMm" className="block text-sm font-medium text-gray-700 mb-1">Labeled Tire Width</label>
                <select id="tireWidthMm" name="tireWidthMm" value={formState.tireWidthMm} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-md shadow-sm">
                    {tireWidthOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
            </div>
             <div>
                <label htmlFor="rimWidthMm" className="block text-sm font-medium text-gray-700 mb-1">Internal Rim Width (mm)</label>
                {/* FIX 1: Add fallback to '' to prevent uncontrolled input error */}
                <input id="rimWidthMm" type="number" name="rimWidthMm" value={formState.rimWidthMm || ''} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-md shadow-sm" min="15" max="40" step="1" required />
            </div>
        </div>

        <div>
            <label htmlFor="tireType" className="block text-sm font-medium text-gray-700 mb-1">Tire Type</label>
            <select id="tireType" name="tireType" value={formState.tireType} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-md shadow-sm">
                <option value="tubeless">Tubeless / Tubeless Ready</option>
                <option value="tubetype">Tube-Type (Clincher with Inner Tube)</option>
            </select>
        </div>

        <div>
            <label htmlFor="tireCasing" className="block text-sm font-medium text-gray-700 mb-1">
                Tire Casing Quality
                {!isPremium && <span className="ml-1 text-gray-400 text-xs">(Premium for more options)</span>}
            </label>
            <select id="tireCasing" name="tireCasing" value={formState.tireCasing} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-md shadow-sm" disabled={!isPremium && formState.tireCasing !== 'standard'}>
                <option value="standard">Standard (e.g., 30-60 TPI)</option>
                {isPremium && <>
                    <option value="supple">Supple (e.g., 60-120 TPI)</option>
                    <option value="ultra-supple">Ultra Supple / "Open Tubular" (e.g., 200+ TPI)</option>
                </>}
            </select>
        </div>

        <div>
            <label htmlFor="surfaceType" className="block text-sm font-medium text-gray-700 mb-1">Primary Riding Surface</label>
            <select id="surfaceType" name="surfaceType" value={formState.surfaceType} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-md shadow-sm">
                <option value="pavement">Smooth Pavement / Tarmac</option>
                <option value="poor_pavement">Poor Pavement / Chip Seal</option>
                <option value="mixed">Mixed (Pavement & Light Gravel)</option>
                <option value="gravel_hardpack">Hardpack Gravel / Firm Dirt</option>
                <option value="gravel_loose">Loose or Chunky Gravel</option>
            </select>
        </div>

        <div className="pt-2">
            <label className="flex items-center space-x-3 cursor-pointer">
                <input type="checkbox" name="isHookless" checked={formState.isHookless} onChange={handleChange} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                <span className="text-sm font-medium text-gray-700">My rims are hookless</span>
            </label>
        </div>
      </div>

      <button type="submit" disabled={isCalculating} className="w-full mt-8 bg-indigo-600 text-white font-semibold py-3 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150">
        {isCalculating ? 'Calculating...' : 'Calculate My Pressure'}
      </button>
    </form>
  )
}

// Unchanged sub-components below this line
// ... (ResultsDisplay, PremiumUpsell, TirePressureTips)
const ResultsDisplay: FC<{ result: PressureResult }> = ({ result }) => {
    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-fade-in">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Your Recommended Pressure</h2>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="text-sm text-blue-800 font-semibold tracking-wider">FRONT</div>
                    <div className="text-4xl font-bold text-blue-600 my-1">{result.frontPsi}<span className="text-xl align-baseline ml-1">PSI</span></div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-sm text-green-800 font-semibold tracking-wider">REAR</div>
                    <div className="text-4xl font-bold text-green-600 my-1">{result.rearPsi}<span className="text-xl align-baseline ml-1">PSI</span></div>
                </div>
            </div>

            {result.warnings.length > 0 && (
                <div className="mb-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 rounded-r-md" role="alert">
                    <h3 className="font-bold mb-1">Important Warnings</h3>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                        {result.warnings.map((warning, index) => <li key={index}>{warning}</li>)}
                    </ul>
                </div>
            )}
            
            {result.notes.length > 0 && (
                <div className="space-y-3">
                    <h3 className="font-medium text-gray-900">Calculation Insights:</h3>
                    {result.notes.map((note, index) => (
                        <div key={index} className="text-sm text-gray-700 flex items-start space-x-2">
                            <svg className="h-5 w-5 text-indigo-500 flex-shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                            <span>{note}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const PremiumUpsell: FC = () => (
    <div className="bg-purple-50 rounded-lg p-6 border-2 border-dashed border-purple-200 text-center">
        <h3 className="text-lg font-semibold text-purple-900 mb-2">Unlock a More Precise Calculation</h3>
        <p className="text-sm text-purple-800 mb-4">Go Premium to use your exact tire casing and auto-fill data from your Bike Garage for the most accurate results.</p>
        <Link href="/upgrade" className="inline-block bg-purple-600 text-white px-5 py-2 rounded-md font-semibold hover:bg-purple-700 transition-colors shadow-sm">
            Upgrade to Premium
        </Link>
    </div>
);

const TirePressureTips: FC = () => (
    <div className="bg-gray-100 rounded-lg p-6 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-3">Pro Tips & Next Steps</h3>
      <ul className="text-sm text-gray-700 space-y-3">
        <li className="flex items-start space-x-2">
          <span className="font-bold text-indigo-600 mt-0.5">1.</span>
          <span><strong>Start Here:</strong> Use these pressures as your baseline. They are scientifically calculated for optimal performance.</span>
        </li>
        <li className="flex items-start space-x-2">
          <span className="font-bold text-indigo-600 mt-0.5">2.</span>
          <span><strong>Fine-Tune:</strong> Adjust by 1-2 PSI up or down based on personal feel and specific conditions of the day.</span>
        </li>
        <li className="flex items-start space-x-2">
          <span className="font-bold text-indigo-600 mt-0.5">3.</span>
          <span><strong>Safety First:</strong> Always respect the maximum pressure listed on your tire sidewall and rim. Never exceed the lower of the two values.</span>
        </li>
        <li className="flex items-start space-x-2">
          <span className="font-bold text-indigo-600 mt-0.5">4.</span>
          <span><strong>Check Often:</strong> Air pressure changes with temperature and leaks slowly over time. Check with a quality digital gauge before every ride.</span>
        </li>
      </ul>
    </div>
);