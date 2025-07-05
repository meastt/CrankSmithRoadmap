// src/app/calculators/tire-pressure/page.tsx (COMPLETE CORRECTED FILE)

'use client'

import { useState, useEffect, useReducer, FC, FormEvent } from 'react'
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
      component_categories: { name: string };
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
      // Use nullish coalescing (??) for safer fallbacks (handles 0 correctly)
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
      // Transform bikes data to match our interface
      const transformedBikes = (bikesData || []).map((bike: any) => ({
        ...bike,
        bike_components: bike.bike_components.map((bc: any) => ({
          ...bc,
          components: bc.components ? [{
            ...bc.components,
            component_categories: bc.components.component_categories || { name: 'Unknown' }
          }] : []
        }))
      }));
      setBikes(transformedBikes as Bike[]);
    }
  };

  const handleSelectBike = (bikeId: string) => {
    setSelectedBikeId(bikeId);
    const bike = bikes.find(b => b.id === bikeId);
    if (!bike) return;

    // Find tire and wheel components
    const allComponents = bike.bike_components.flatMap(bc => bc.components);
    
    const tire = allComponents.find(comp => 
      comp.component_categories.name === 'Tire'
    );
    
    const wheel = allComponents.find(comp => 
      comp.component_categories.name === 'Wheelset'
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
    
    // Add validation to prevent calculation with invalid data
    const riderWeight = Number(formState.riderWeightLbs);
    const bikeWeight = Number(formState.bikeWeightLbs);
    const rimWidth = Number(formState.rimWidthMm);
    
    if (isNaN(riderWeight) || riderWeight <= 0) {
      alert('Please enter a valid rider weight');
      setCalculating(false);
      return;
    }
    
    if (isNaN(bikeWeight) || bikeWeight <= 0) {
      alert('Please enter a valid bike weight');
      setCalculating(false);
      return;
    }
    
    if (isNaN(rimWidth) || rimWidth <= 0) {
      alert('Please enter a valid rim width');
      setCalculating(false);
      return;
    }

    setTimeout(() => {
        // Ensure that all numeric values are properly converted
        const calculationInputs: AdvancedCalculationInputs = {
            ...formState,
            riderWeightLbs: riderWeight,
            bikeWeightLbs: bikeWeight,
            rimWidthMm: rimWidth,
            tireWidthMm: Number(formState.tireWidthMm) || 25, // Default to 25mm if invalid
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

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Calculator Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Enter Your Details</h2>
              
              {/* Premium Bike Selection */}
              {profile?.subscription_status === 'premium' && bikes.length > 0 && (
                <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <h3 className="text-lg font-medium text-purple-900 mb-3">
                    🎯 Load From Your Garage (Premium)
                  </h3>
                  <select
                    value={selectedBikeId}
                    onChange={(e) => handleSelectBike(e.target.value)}
                    className="w-full px-3 py-2 border border-purple-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Select a bike to auto-fill...</option>
                    {bikes.map(bike => (
                      <option key={bike.id} value={bike.id}>
                        {bike.nickname} ({bike.brand} {bike.model})
                      </option>
                    ))}
                  </select>
                  {selectedBikeId && (
                    <p className="text-sm text-purple-700 mt-2">
                      ✅ Loaded tire and rim data from your garage!
                    </p>
                  )}
                </div>
              )}

              <CalculatorForm
                formState={formState}
                dispatch={dispatch}
                onSubmit={handleCalculate}
                calculating={calculating}
                isPremium={profile?.subscription_status === 'premium'}
              />
            </div>
          </div>

          {/* Right Column - Results and Info */}
          <div className="space-y-6">
            {result && (
              <div id="results-section">
                <ResultsDisplay result={result} />
              </div>
            )}
            
            {profile?.subscription_status !== 'premium' && (
              <PremiumUpsell />
            )}
            
            <TirePressureTips />
          </div>
        </div>
      </main>
    </div>
  );
}

// --- Calculator Form Component ---
const CalculatorForm: FC<{
  formState: FormState;
  dispatch: React.Dispatch<FormAction>;
  onSubmit: (e: FormEvent) => void;
  calculating: boolean;
  isPremium: boolean;
}> = ({ formState, dispatch, onSubmit, calculating, isPremium }) => {
  
  const handleInputChange = (field: keyof FormState, value: any) => {
    dispatch({ type: 'SET_FIELD', field, value });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Weight Inputs */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Your Weight (lbs) *
          </label>
          <input
            type="number"
            value={formState.riderWeightLbs}
            onChange={(e) => handleInputChange('riderWeightLbs', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="165"
            min="50"
            max="400"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Bike Weight (lbs) *
          </label>
          <input
            type="number"
            value={formState.bikeWeightLbs}
            onChange={(e) => handleInputChange('bikeWeightLbs', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="19"
            min="10"
            max="50"
            required
          />
          <p className="text-xs text-gray-500 mt-1">Include water bottles, bags, etc.</p>
        </div>
      </div>

      {/* Tire & Rim Specs */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tire Width (mm) *
          </label>
          <input
            type="number"
            value={formState.tireWidthMm}
            onChange={(e) => handleInputChange('tireWidthMm', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="28"
            min="18"
            max="65"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Internal Rim Width (mm) *
            {!isPremium && <span className="text-purple-600 text-xs ml-1">(Premium: Auto-filled)</span>}
          </label>
          <input
            type="number"
            value={formState.rimWidthMm}
            onChange={(e) => handleInputChange('rimWidthMm', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="21"
            min="12"
            max="40"
            required
          />
        </div>
      </div>

      {/* Wheel Size and Hookless */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Wheel Size *
          </label>
          <select
            value={formState.wheelDiameter}
            onChange={(e) => handleInputChange('wheelDiameter', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
          >
            <option value="700c">700c (Road/Gravel)</option>
            <option value="650b">650b (27.5&quot;)</option>
            <option value="29er">29er (29&quot;)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Rim Type
          </label>
          <div className="flex items-center space-x-4 pt-2">
            <label className="flex items-center">
              <input
                type="radio"
                name="rimType"
                checked={!formState.isHookless}
                onChange={() => handleInputChange('isHookless', false)}
                className="mr-2"
              />
              <span className="text-sm">Hooked</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="rimType"
                checked={formState.isHookless}
                onChange={() => handleInputChange('isHookless', true)}
                className="mr-2"
              />
              <span className="text-sm">Hookless</span>
            </label>
          </div>
        </div>
      </div>

      {/* Tire Casing (Premium Feature) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tire Casing Type
          {!isPremium && <span className="text-purple-600 text-xs ml-1">(Premium: Auto-filled from garage)</span>}
        </label>
        <select
          value={formState.tireCasing}
          onChange={(e) => handleInputChange('tireCasing', e.target.value)}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
            !isPremium ? 'border-gray-200 bg-gray-50' : 'border-gray-300'
          }`}
          disabled={!isPremium}
        >
          <option value="standard">Standard (Most Common)</option>
          <option value="supple">Supple (High-end road tires)</option>
          <option value="ultra-supple">Ultra-Supple (Premium handmade)</option>
        </select>
        {!isPremium && (
          <p className="text-xs text-gray-500 mt-1">
            Upgrade to Premium to access advanced casing calculations
          </p>
        )}
      </div>

      {/* Surface & Tire Type */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Surface Type
          </label>
          <select
            value={formState.surfaceType}
            onChange={(e) => handleInputChange('surfaceType', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="pavement">Smooth Pavement</option>
            <option value="poor_pavement">Poor Pavement</option>
            <option value="mixed">Mixed (Road + Light Gravel)</option>
            <option value="gravel_hardpack">Gravel (Hard pack)</option>
            <option value="gravel_loose">Gravel (Loose)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tire Type
          </label>
          <select
            value={formState.tireType}
            onChange={(e) => handleInputChange('tireType', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="tubeless">Tubeless</option>
            <option value="tubetype">Tube Type</option>
          </select>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={calculating}
        className="w-full bg-indigo-600 text-white py-3 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors font-semibold"
      >
        {calculating ? 'Calculating...' : 'Calculate My Pressure'}
      </button>
    </form>
  )
}

// --- Results Display Component ---
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

// --- Premium Upsell Component ---
const PremiumUpsell: FC = () => (
    <div className="bg-purple-50 rounded-lg p-6 border-2 border-dashed border-purple-200 text-center">
        <h3 className="text-lg font-semibold text-purple-900 mb-2">Unlock a More Precise Calculation</h3>
        <p className="text-sm text-purple-800 mb-4">Go Premium to use your exact tire casing and auto-fill data from your Bike Garage for the most accurate results.</p>
        <Link href="/upgrade" className="inline-block bg-purple-600 text-white px-5 py-2 rounded-md font-semibold hover:bg-purple-700 transition-colors shadow-sm">
            Upgrade to Premium
        </Link>
    </div>
);

// --- Tips Component ---
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