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
          <p className="text-xs text-neutral-400">
            Real-time IFRS/GAAP compliant foreign exchange rates
          </p>
        </div>

        <button
          onClick={handleRefreshRates}
          disabled={isRefreshing}
          className="p-2 bg-neutral-900 border border-neutral-800 rounded-xl text-neutral-300 hover:text-emerald-400 flex items-center gap-1.5 text-xs transition-colors cursor-pointer"
          title="Refresh Exchange Rates"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Interactive Converter Card */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-4 shadow-xl">
        <div className="text-xs font-semibold text-neutral-300">Live Foreign Expense Conversion</div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Base Currency Input */}
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3">
            <div className="flex items-center justify-between mb-1.5 text-[11px] text-neutral-400">
              <span>From Amount</span>
              <select
                value={baseCurrency}
                onChange={e => setBaseCurrency(e.target.value)}
                className="bg-transparent text-neutral-200 font-semibold focus:outline-none cursor-pointer"
              >
                {SUPPORTED_CURRENCIES.map(c => (
                  <option key={c.code} value={c.code} className="bg-neutral-900 text-white">
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
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3 relative">
            <div className="flex items-center justify-between mb-1.5 text-[11px] text-neutral-400">
              <span>Converted Tax Base</span>
              <select
                value={targetCurrency}
                onChange={e => setTargetCurrency(e.target.value)}
                className="bg-transparent text-emerald-400 font-semibold focus:outline-none cursor-pointer"
              >
                {SUPPORTED_CURRENCIES.map(c => (
                  <option key={c.code} value={c.code} className="bg-neutral-900 text-white">
                    {c.flag} {c.code} ({c.name})
                  </option>
                ))}
              </select>
            </div>
            <div className="text-xl font-bold font-mono text-emerald-400">
              {convertedAmount.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Swap button & Rate ticker */}
        <div className="flex items-center justify-between pt-1 text-xs">
          <button
            onClick={handleSwapCurrencies}
            className="flex items-center gap-1.5 text-neutral-400 hover:text-emerald-400 transition-colors cursor-pointer"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Swap Currencies</span>
          </button>

          <div className="font-mono text-[11px] text-neutral-400">
            1 {baseCurrency} = <span className="text-neutral-200 font-bold">{exchangeRate}</span> {targetCurrency}
          </div>
        </div>
      </div>

      {/* Major Accounting Cross Rates Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between text-xs border-b border-neutral-800 pb-2">
          <span className="font-semibold text-neutral-200">International Rate Board ({baseCurrency} Base)</span>
          <span className="text-[10px] text-neutral-500">Updated: {lastUpdated}</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          {SUPPORTED_CURRENCIES.filter(c => c.code !== baseCurrency).map(curr => {
            const directRate = currencyService.getExchangeRate(baseCurrency, curr.code);
            return (
              <div
                key={curr.code}
                className="p-2.5 bg-neutral-950 border border-neutral-800/80 rounded-lg flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{curr.flag}</span>
                  <div>
                    <div className="font-medium text-neutral-200 text-xs">{curr.code}</div>
                    <div className="text-[9px] text-neutral-500">{curr.name.split(' ')[0]}</div>
                  </div>
                </div>

                <div className="font-mono font-bold text-neutral-300 text-xs">
                  {directRate.toFixed(4)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Compliance Note */}
      <div className="p-3 bg-neutral-900/60 border border-neutral-800/80 rounded-xl text-xs text-neutral-400">
        <div className="font-semibold text-neutral-300 mb-1 flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5 text-emerald-400" />
          <span>Accounting Standards Compliance</span>
        </div>
        <p className="text-[11px] leading-relaxed">
          Foreign currency transactions are converted using the spot exchange rate on the transaction date in accordance with IAS 21 (The Effects of Changes in Foreign Exchange Rates) and New Zealand IRD Determinations.
        </p>
      </div>
    </div>
  );
};
