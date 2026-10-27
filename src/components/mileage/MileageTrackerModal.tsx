import React, { useState, useEffect } from 'react';
import {
  Car,
  X,
  Plus,
  Calendar,
  Navigation,
  CheckCircle2,
  Trash2,
  Download,
  AlertCircle,
  FileCheck2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { MileageTrip, UserProfile, ExpenseRecord } from '../../types';
import { TAX_CONFIGS, formatCurrency } from '../../services/taxRules';
import { storageService } from '../../services/storageService';
import { supabaseService } from '../../services/supabaseService';

interface MileageTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onLogMileageAsExpense: (expense: ExpenseRecord) => void;
}

export const MileageTrackerModal: React.FC<MileageTrackerModalProps> = ({
  isOpen,
  onClose,
  profile,
  onLogMileageAsExpense,
}) => {
  const [trips, setTrips] = useState<MileageTrip[]>([]);
  const [isAddingTrip, setIsAddingTrip] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Form Fields
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [purpose, setPurpose] = useState('Client Consultation');
  const [origin, setOrigin] = useState('Office / Studio');
  const [destination, setDestination] = useState('');
  const [distance, setDistance] = useState<number>(25);
  const [vehicle, setVehicle] = useState('Toyota Hybrid (Work Car)');
  const [notes, setNotes] = useState('');

  const taxConfig = TAX_CONFIGS[profile.country] || TAX_CONFIGS['NZ'];
  const currencySymbol = profile.currencySymbol || taxConfig.currencySymbol;
  const unit: 'km' | 'miles' = profile.country === 'US' ? 'miles' : 'km';
  const statutoryRate = taxConfig.vehicleMileageRate || (profile.country === 'US' ? 0.67 : 0.95);

  useEffect(() => {
    if (isOpen) {
      const local = storageService.getMileageTrips(profile.country);
      setTrips(local);
      supabaseService.fetchMileageTrips(profile.id).then(({ trips: remote }) => {
        if (remote && remote.length > 0) {
          const map = new Map<string, MileageTrip>();
          remote.forEach((t) => map.set(t.id, t));
          local.forEach((t) => {
            if (!map.has(t.id)) map.set(t.id, t);
          });
          const merged = Array.from(map.values()).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
          setTrips(merged);
          storageService.saveMileageTrips(merged);
        }
      }).catch(() => {});
    }
  }, [isOpen, profile.country, profile.id]);

  if (!isOpen) return null;

  const totalDistance = trips.reduce((acc, t) => acc + t.distance, 0);
  const totalDeduction = trips.reduce((acc, t) => acc + t.taxDeduction, 0);

  const handleCreateTrip = (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination.trim() || distance <= 0) return;

    const taxDeduction = Math.round(distance * statutoryRate * 100) / 100;
    const newTrip: MileageTrip = {
      id: `trip-${Date.now()}`,
      date,
      purpose,
      origin: origin || 'Office HQ',
      destination,
      distance: Number(distance),
      unit,
      ratePerUnit: statutoryRate,
      taxDeduction,
      vehicle,
      notes,
      createdAt: new Date().toISOString(),
    };

    const updated = [newTrip, ...trips];
    setTrips(updated);
    storageService.saveMileageTrips(updated);
    supabaseService.upsertMileageTrip(newTrip, profile.id).catch(() => {});
    setIsAddingTrip(false);
    setDestination('');
    setNotes('');
    setFeedback(`Logged ${distance} ${unit} trip! Deductible value: ${currencySymbol}${taxDeduction.toFixed(2)}`);
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleDeleteTrip = (id: string) => {
    const updated = trips.filter((t) => t.id !== id);
    setTrips(updated);
    storageService.saveMileageTrips(updated);
    supabaseService.deleteMileageTrip(id).catch(() => {});
  };

  const handleClaimAsExpense = (trip: MileageTrip) => {
    const expense: ExpenseRecord = {
      id: `exp-mileage-${trip.id}`,
      merchant: `Vehicle Mileage: ${trip.purpose}`,
      date: trip.date,
      category: 'Vehicle & Mileage',
      expenseType: 'Business',
      businessPercentage: 100,
      claimableBusinessAmount: trip.taxDeduction,
      amount: trip.taxDeduction,
      subtotal: trip.taxDeduction,
      discount: 0,
      taxableAmount: trip.taxDeduction,
      taxAmount: 0, // Vehicle statutory rate deduction is an income offset
      cgst: 0,
      sgst: 0,
      igst: 0,
      cess: 0,
      roundOff: 0,
      paymentMethod: 'Other',
      items: [
        {
          name: `${trip.distance} ${trip.unit} @ ${currencySymbol}${trip.ratePerUnit.toFixed(2)}/${trip.unit} (${trip.origin} → ${trip.destination})`,
          quantity: trip.distance,
          unitPrice: trip.ratePerUnit,
          total: trip.taxDeduction,
        },
      ],
      userNotes: `Statutory vehicle logbook claim: ${trip.vehicle || 'Business vehicle'}. ${trip.notes || ''}`,
      gstTreatment: 'Likely eligible',
      caReviewStatus: 'Reviewed',
      caNotes: `Statutory rate deduction claimed per ${taxConfig.taxAuthority} standard rate (${currencySymbol}${trip.ratePerUnit}/${trip.unit}).`,
      confidenceScores: { merchant: 100, date: 100, total: 100, category: 100 },
      syncStatus: 'synced',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onLogMileageAsExpense(expense);

    // Mark as logged
    const updatedTrip = { ...trip, loggedAsExpenseId: expense.id };
    const updated = trips.map((t) => (t.id === trip.id ? updatedTrip : t));
    setTrips(updated);
    storageService.saveMileageTrips(updated);
    supabaseService.upsertMileageTrip(updatedTrip, profile.id).catch(() => {});

    setFeedback(`Claimed ${currencySymbol}${trip.taxDeduction.toFixed(2)} in active expenses!`);
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleExportCSV = () => {
    const headers = 'Date,Purpose,Origin,Destination,Distance,Unit,Rate,Tax_Deduction,Vehicle,Notes\n';
    const rows = trips
      .map(
        (t) =>
          `"${t.date}","${t.purpose}","${t.origin}","${t.destination}",${t.distance},"${t.unit}",${t.ratePerUnit},${t.taxDeduction},"${t.vehicle || ''}","${t.notes || ''}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TaxVault_Mileage_Logbook_${profile.country}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setFeedback('Mileage Logbook CSV exported!');
    setTimeout(() => setFeedback(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs backdrop-blur-md flex items-center justify-center p-3 modal-backdrop-animation">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-xl max-h-[92vh] overflow-hidden flex flex-col text-slate-900 shadow-2xl relative modal-enter-animation">
        {/* Top Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-700">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                <span>Vehicle Mileage Logbook</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
                  {taxConfig.flag} {currencySymbol}{statutoryRate.toFixed(2)} / {unit}
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Official statutory tax deduction per {taxConfig.taxAuthority} regulations
              </p>
            </div>
          </div>

          <button
            aria-label="Close"
            onClick={onClose}
            className="text-slate-500 hover:text-white p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className="m-3 p-3 bg-emerald-50 border border-emerald-500/60 rounded-xl text-xs text-emerald-600 font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {/* Summary Metrics Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-3 gap-2 text-center">
          <div className="bg-white shadow-xs border border-slate-200 p-2.5 rounded-xl">
            <div className="text-xs text-slate-500 uppercase font-semibold">Total Trips</div>
            <div className="text-base font-extrabold text-white font-mono mt-0.5">{trips.length}</div>
          </div>

          <div className="bg-white shadow-xs border border-slate-200 p-2.5 rounded-xl">
            <div className="text-xs text-slate-500 uppercase font-semibold">Business {unit}</div>
            <div className="text-base font-extrabold text-amber-700 font-mono mt-0.5">
              {totalDistance.toFixed(1)} <span className="text-xs font-normal text-slate-500">{unit}</span>
            </div>
          </div>

          <div className="bg-white shadow-xs border border-slate-200 p-2.5 rounded-xl">
            <div className="text-xs text-slate-500 uppercase font-semibold">Tax Deduction</div>
            <div className="text-base font-extrabold text-emerald-600 font-mono mt-0.5">
              {formatCurrency(totalDeduction, profile.country)}
            </div>
          </div>
        </div>

        {/* Content Body: Add Form OR Trip List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isAddingTrip ? (
            <form onSubmit={handleCreateTrip} className="space-y-3.5 bg-slate-50 p-4 rounded-2xl border border-slate-200 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Navigation className="w-4 h-4 text-amber-700" />
                  <span>Log Business Trip</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsAddingTrip(false)}
                  className="text-xs text-slate-500 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Trip Date</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-white shadow-xs border border-slate-200 rounded-xl px-2.5 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-500 block mb-1">Business Purpose</label>
                  <select
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    className="w-full bg-white shadow-xs border border-slate-200 rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Client Consultation">Client Consultation</option>
                    <option value="Site Inspection">Site Inspection</option>
                    <option value="Supplier Pick-up">Supplier / Depot Run</option>
                    <option value="Delivery / Transport">Delivery / Client Transport</option>
                    <option value="Airport Transfer">Airport / Business Travel</option>
                    <option value="Bank / Legal Sync">Bank / Legal Filing</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Origin (From)</label>
                  <input
                    type="text"
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    placeholder="e.g. Office HQ"
                    className="w-full bg-white shadow-xs border border-slate-200 rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-500 block mb-1">Destination (To)</label>
                  <input
                    type="text"
                    required
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="e.g. Client Tech Park, 45 Main St"
                    className="w-full bg-white shadow-xs border border-slate-200 rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Distance Driven ({unit})</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    required
                    value={distance}
                    onChange={(e) => setDistance(Number(e.target.value))}
                    className="w-full bg-white shadow-xs border border-slate-200 rounded-xl px-2.5 py-2 text-white font-mono text-base font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-500 block mb-1">Vehicle Description</label>
                  <input
                    type="text"
                    value={vehicle}
                    onChange={(e) => setVehicle(e.target.value)}
                    placeholder="e.g. Work Van (ABC-204)"
                    className="w-full bg-white shadow-xs border border-slate-200 rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Statutory Calculation Preview */}
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs flex items-center justify-between">
                <div>
                  <div className="text-xs text-amber-700 font-semibold uppercase">Statutory Tax Deduction</div>
                  <div className="text-xs text-slate-700">
                    {distance} {unit} × {currencySymbol}{statutoryRate.toFixed(2)} statutory rate
                  </div>
                </div>
                <div className="text-base font-extrabold font-mono text-amber-700">
                  {currencySymbol}{(distance * statutoryRate).toFixed(2)}
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-900 font-black py-3 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Save Logbook Trip</span>
              </button>
            </form>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => setIsAddingTrip(true)}
                className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-md whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4 stroke-[2.5] shrink-0" />
                <span className="whitespace-nowrap">+ Log Trip</span>
              </button>

              <button
                onClick={handleExportCSV}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-all border border-slate-300 whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span className="whitespace-nowrap">Export CSV</span>
              </button>
            </div>
          )}

          {/* Trips List */}
          <div className="space-y-2.5">
            {trips.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
                <Car className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">No vehicle trips logged yet</p>
                <p className="text-xs text-slate-400 mt-1">Tap "+ Log New Trip" to start your compliant mileage record.</p>
              </div>
            ) : (
              trips.map((trip) => (
                <div
                  key={trip.id}
                  className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2 hover:border-slate-200 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        <span>{trip.purpose}</span>
                        <span className="text-xs font-mono text-slate-500 bg-white shadow-xs px-2 py-0.5 rounded-md border border-slate-200">
                          {trip.date}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                        <Navigation className="w-3 h-3 text-amber-700 shrink-0" />
                        <span>{trip.origin}</span>
                        <span>→</span>
                        <span className="text-slate-800 font-medium">{trip.destination}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-sm font-extrabold text-amber-700 font-mono">
                        {currencySymbol}{trip.taxDeduction.toFixed(2)}
                      </div>
                      <div className="text-xs text-slate-500 font-mono">
                        {trip.distance} {trip.unit}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-200 text-xs">
                    <div className="text-slate-500 text-xs">
                      Vehicle: <span className="text-slate-700 font-medium">{trip.vehicle || 'Standard'}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {trip.loggedAsExpenseId ? (
                        <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Added to Expenses</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => handleClaimAsExpense(trip)}
                          className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-600 border border-emerald-500/40 text-xs font-bold px-2 py-1 rounded-lg cursor-pointer transition-colors flex items-center gap-1 whitespace-nowrap shrink-0"
                        >
                          <FileCheck2 className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span className="whitespace-nowrap">Claim Expense</span>
                        </button>
                      )}

                      <button
                        aria-label="Delete Trip"
                        onClick={() => handleDeleteTrip(trip.id)}
                        className="text-slate-400 hover:text-rose-700 p-1 cursor-pointer transition-colors"
                        title="Delete Trip"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer info banner */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Meets IRD / ATO / CRA / IRS statutory logbook rules</span>
          </span>
          <span className="text-slate-400">Tier 1 deduction method</span>
        </div>
      </div>
    </div>
  );
};
