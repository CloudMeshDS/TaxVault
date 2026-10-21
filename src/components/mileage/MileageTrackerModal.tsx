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
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 modal-backdrop-animation">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-xl max-h-[92vh] overflow-hidden flex flex-col text-neutral-100 shadow-2xl relative modal-enter-animation">
        {/* Top Header */}
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                <span>Vehicle Mileage Logbook</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-800/60 font-semibold">
                  {taxConfig.flag} {currencySymbol}{statutoryRate.toFixed(2)} / {unit}
                </span>
              </h3>
              <p className="text-[11px] text-neutral-400">
                Official statutory tax deduction per {taxConfig.taxAuthority} regulations
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1.5 rounded-xl hover:bg-neutral-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className="m-3 p-3 bg-emerald-950/80 border border-emerald-500/60 rounded-xl text-xs text-emerald-300 font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {/* Summary Metrics Bar */}
        <div className="p-4 bg-neutral-950 border-b border-neutral-800/80 grid grid-cols-3 gap-2 text-center">
          <div className="bg-neutral-900 border border-neutral-800 p-2.5 rounded-xl">
            <div className="text-[10px] text-neutral-400 uppercase font-semibold">Total Trips</div>
            <div className="text-base font-extrabold text-white font-mono mt-0.5">{trips.length}</div>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 p-2.5 rounded-xl">
            <div className="text-[10px] text-neutral-400 uppercase font-semibold">Business {unit}</div>
            <div className="text-base font-extrabold text-amber-400 font-mono mt-0.5">
              {totalDistance.toFixed(1)} <span className="text-xs font-normal text-neutral-400">{unit}</span>
            </div>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 p-2.5 rounded-xl">
            <div className="text-[10px] text-neutral-400 uppercase font-semibold">Tax Deduction</div>
            <div className="text-base font-extrabold text-emerald-400 font-mono mt-0.5">
              {formatCurrency(totalDeduction, profile.country)}
            </div>
          </div>
        </div>

        {/* Content Body: Add Form OR Trip List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isAddingTrip ? (
            <form onSubmit={handleCreateTrip} className="space-y-3.5 bg-neutral-950 p-4 rounded-2xl border border-neutral-800 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Navigation className="w-4 h-4 text-amber-400" />
                  <span>Log Business Trip</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsAddingTrip(false)}
                  className="text-[11px] text-neutral-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[10px] text-neutral-400 block mb-1">Trip Date</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-2.5 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-neutral-400 block mb-1">Business Purpose</label>
                  <select
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-amber-500"
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
                  <label className="text-[10px] text-neutral-400 block mb-1">Origin (From)</label>
                  <input
                    type="text"
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    placeholder="e.g. Office HQ"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-neutral-400 block mb-1">Destination (To)</label>
                  <input
                    type="text"
                    required
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="e.g. Client Tech Park, 45 Main St"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[10px] text-neutral-400 block mb-1">Distance Driven ({unit})</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    required
                    value={distance}
                    onChange={(e) => setDistance(Number(e.target.value))}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-2.5 py-2 text-white font-mono text-base font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-neutral-400 block mb-1">Vehicle Description</label>
                  <input
                    type="text"
                    value={vehicle}
                    onChange={(e) => setVehicle(e.target.value)}
                    placeholder="e.g. Work Van (ABC-204)"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Statutory Calculation Preview */}
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-amber-300 font-semibold uppercase">Statutory Tax Deduction</div>
                  <div className="text-[11px] text-neutral-300">
                    {distance} {unit} × {currencySymbol}{statutoryRate.toFixed(2)} statutory rate
                  </div>
                </div>
                <div className="text-base font-extrabold font-mono text-amber-400">
                  {currencySymbol}{(distance * statutoryRate).toFixed(2)}
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-neutral-950 font-black py-3 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Save Logbook Trip</span>
              </button>
            </form>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => setIsAddingTrip(true)}
                className="bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-md whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4 stroke-[2.5] shrink-0" />
                <span className="whitespace-nowrap">+ Log Trip</span>
              </button>

              <button
                onClick={handleExportCSV}
                className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-all border border-neutral-700 whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="whitespace-nowrap">Export CSV</span>
              </button>
            </div>
          )}

          {/* Trips List */}
          <div className="space-y-2.5">
            {trips.length === 0 ? (
              <div className="p-8 text-center bg-neutral-950 rounded-2xl border border-neutral-800">
                <Car className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-neutral-300">No vehicle trips logged yet</p>
                <p className="text-xs text-neutral-500 mt-1">Tap "+ Log New Trip" to start your compliant mileage record.</p>
              </div>
            ) : (
              trips.map((trip) => (
                <div
                  key={trip.id}
                  className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-3.5 space-y-2 hover:border-neutral-700 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        <span>{trip.purpose}</span>
                        <span className="text-[10px] font-mono text-neutral-400 bg-neutral-900 px-2 py-0.5 rounded-md border border-neutral-800">
                          {trip.date}
                        </span>
                      </div>
                      <div className="text-[11px] text-neutral-400 mt-1 flex items-center gap-1.5">
                        <Navigation className="w-3 h-3 text-amber-400 shrink-0" />
                        <span>{trip.origin}</span>
                        <span>→</span>
                        <span className="text-neutral-200 font-medium">{trip.destination}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-sm font-extrabold text-amber-400 font-mono">
                        {currencySymbol}{trip.taxDeduction.toFixed(2)}
                      </div>
                      <div className="text-[10px] text-neutral-400 font-mono">
                        {trip.distance} {trip.unit}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1.5 border-t border-neutral-800/70 text-[11px]">
                    <div className="text-neutral-400 text-[10px]">
                      Vehicle: <span className="text-neutral-300 font-medium">{trip.vehicle || 'Standard'}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {trip.loggedAsExpenseId ? (
                        <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-950/70 border border-emerald-800/60 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Added to Expenses</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => handleClaimAsExpense(trip)}
                          className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold px-2 py-1 rounded-lg cursor-pointer transition-colors flex items-center gap-1 whitespace-nowrap shrink-0"
                        >
                          <FileCheck2 className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span className="whitespace-nowrap">Claim Expense</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleDeleteTrip(trip.id)}
                        className="text-neutral-500 hover:text-rose-400 p-1 cursor-pointer transition-colors"
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
        <div className="p-3 bg-neutral-950 border-t border-neutral-800 text-[10px] text-neutral-400 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Meets IRD / ATO / CRA / IRS statutory logbook rules</span>
          </span>
          <span className="text-neutral-500">Tier 1 deduction method</span>
        </div>
      </div>
    </div>
  );
};
