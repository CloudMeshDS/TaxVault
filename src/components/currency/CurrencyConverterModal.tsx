import React, { useState, useEffect } from 'react';
import { Globe, RefreshCw, ArrowRightLeft, Check, TrendingUp } from 'lucide-react';
import { currencyService, SUPPORTED_CURRENCIES } from '../../services/currencyService';
import { CountryTaxConfig } from '../../types';

interface CurrencyConverterModalProps {
  taxConfig: CountryTaxConfig;
}

export const CurrencyConverterModal: React.FC<CurrencyConverterModalProps> = ({
  taxConfig,
}) => {
  const [baseCurrency, setBaseCurrency] = useState(taxConfig.currencyCode);
  const [targetCurrency, setTargetCurrency] = useState(taxConfig.currencyCode === 'NZD' ? 'USD' : 'NZD');
  const [amount, setAmount] = useState<number>(100);
  const [rates, setRates] = useState(currencyService.getCachedRates());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString());

  const handleRefreshRates = async () => {
    setIsRefreshing(true);
    try {
      const updated = await currencyService.fetchLiveRates(baseCurrency);
      setRates(updated);
      setLastUpdated(new Date().toLocaleTimeString());
    } finally {
      setIsRefreshing(false);
    }
  };

  const convertedAmount = currencyService.convert(amount, baseCurrency, targetCurrency);
  const exchangeRate = currencyService.getExchangeRate(baseCurrency, targetCurrency);

  const handleSwapCurrencies = () => {
    const temp = baseCurrency;
    setBaseCurrency(targetCurrency);
    setTargetCurrency(temp);
  };

  return (
    <div className="p-4 space-y-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight">Global Currency Engine</h2>
          <p className="text-xs text-slate-500">
            Real-time IFRS/GAAP compliant foreign exchange rates
          </p>
        </div>

        <button
          onClick={handleRefreshRates}
          disabled={isRefreshing}
          className="px-2.5 py-1.5 bg-white shadow-xs border border-slate-200 rounded-xl text-slate-700 hover:text-emerald-700 flex items-center gap-1.5 text-xs transition-colors cursor-pointer"
          title="Refresh Exchange Rates"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-700' : ''}`} />
          <span className="inline font-medium">Refresh</span>
        </button>
      </div>

      {/* Interactive Converter Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-4 shadow-xl">
        <div className="text-xs font-semibold text-slate-700">Live Foreign Expense Conversion</div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Base Currency Input */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <div className="flex items-center justify-between mb-1.5 text-xs text-slate-500">
              <span>From Amount</span>
              <select
                value={baseCurrency}
                onChange={e => setBaseCurrency(e.target.value)}
                className="bg-transparent text-slate-800 font-semibold focus:outline-none cursor-pointer"
              >
                {SUPPORTED_CURRENCIES.map(c => (
                  <option key={c.code} value={c.code} className="bg-white shadow-xs text-white">
                    {c.flag} {c.code} ({c.name})
                  </option>
                ))}
              </select>
            </div>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(parseFloat(e.target.value) || 0)}
              className="w-full bg-transparent text-xl font-bold font-mono text-white focus:outline-none"
            />
          </div>

          {/* Target Currency Converted Output */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 relative">
            <div className="flex items-center justify-between mb-1.5 text-xs text-slate-500">
              <span>Converted Tax Base</span>
              <select
                value={targetCurrency}
                onChange={e => setTargetCurrency(e.target.value)}
                className="bg-transparent text-emerald-700 font-semibold focus:outline-none cursor-pointer"
              >
                {SUPPORTED_CURRENCIES.map(c => (
                  <option key={c.code} value={c.code} className="bg-white shadow-xs text-white">
                    {c.flag} {c.code} ({c.name})
                  </option>
                ))}
              </select>
            </div>
            <div className="text-xl font-bold font-mono text-emerald-700">
              {convertedAmount.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Swap button & Rate ticker */}
        <div className="flex items-center justify-between pt-1 text-xs">
          <button
            onClick={handleSwapCurrencies}
            className="flex items-center gap-1.5 text-slate-500 hover:text-emerald-700 transition-colors cursor-pointer"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Swap Currencies</span>
          </button>

          <div className="font-mono text-xs text-slate-500">
            1 {baseCurrency} = <span className="text-slate-800 font-bold">{exchangeRate}</span> {targetCurrency}
          </div>
        </div>
      </div>

      {/* Major Accounting Cross Rates Table */}
      <div className="bg-white shadow-xs border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between text-xs border-b border-slate-200 pb-2">
          <span className="font-semibold text-slate-800">International Rate Board ({baseCurrency} Base)</span>
          <span className="text-xs text-slate-500">Updated: {lastUpdated}</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          {SUPPORTED_CURRENCIES.filter(c => c.code !== baseCurrency).map(curr => {
            const directRate = currencyService.getExchangeRate(baseCurrency, curr.code);
            return (
              <div
                key={curr.code}
                className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{curr.flag}</span>
                  <div>
                    <div className="font-medium text-slate-800 text-xs">{curr.code}</div>
                    <div className="text-xs text-slate-500">{curr.name.split(' ')[0]}</div>
                  </div>
                </div>

                <div className="font-mono font-bold text-slate-700 text-xs">
                  {directRate.toFixed(4)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Compliance Note */}
      <div className="p-3 bg-white shadow-xs border border-slate-200 rounded-xl text-xs text-slate-500">
        <div className="font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5 text-emerald-700" />
          <span>Accounting Standards Compliance</span>
        </div>
        <p className="text-xs leading-relaxed">
          Foreign currency transactions are converted using the spot exchange rate on the transaction date in accordance with IAS 21 (The Effects of Changes in Foreign Exchange Rates) and New Zealand IRD Determinations.
        </p>
      </div>
    </div>
  );
};
