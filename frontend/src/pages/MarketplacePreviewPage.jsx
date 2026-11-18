import React, { useEffect, useState } from 'react';
import { ShieldCheck, MapPin, Users, TrendingUp } from 'lucide-react';
import { apiClient } from '../lib/apiClient';
import { useLanguage } from '../context/LanguageContext';

export default function MarketplacePreviewPage() {
  const { lang } = useLanguage();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    apiClient('/api/v1/system/preview-overview', { signal: controller.signal })
      .then((res) => setAssets(res?.assets || []))
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-teal-700 bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-lg">
            {lang === 'vi' ? 'DỮ LIỆU ĐỌC TRỰC TIẾP TỪ BẢNG ASSETS & ASSET_TOKENS' : 'LIVE DATA FROM PRISMA SQLITE DB'}
          </span>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-2">
            {lang === 'vi' ? 'Sàn Giao dịch Phương tiện RWA (Marketplace)' : 'RWA Vehicle Marketplace'}
          </h1>
          <p className="text-sm text-slate-500">
            {lang === 'vi'
              ? 'Giao diện dựng theo mẫu Hình 5.17 trong báo cáo. Luồng ký ví MetaMask mua cổ phần ERC-3643 sẽ hoàn tất tại Module 5.'
              : 'Built matching Figure 5.17 in Report_DATN.docx. Live MetaMask ERC-3643 investment signing unlocks in Module 5.'}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-[430px] rounded-3xl bg-white border border-slate-200 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {assets.map((asset) => {
            const token = asset.tokens?.[0];
            const fundedPct = token
              ? Math.round(((token.totalSupply - token.availableSupply) / token.totalSupply) * 100)
              : 0;
            const isTokenized = asset.tokenizationStatus === 'TOKENIZED';

            return (
              <div
                key={asset.id}
                className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col"
              >
                {/* Vehicle Image Header matching Fig 5.17 */}
                <div className="relative h-52 bg-slate-200 overflow-hidden">
                  {asset.imageUrl && (
                    <img
                      src={asset.imageUrl}
                      alt={asset.vehicleName}
                      className="w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute top-3.5 left-3.5">
                    <span
                      className={`text-[11px] font-extrabold tracking-wider px-3 py-1 rounded-full uppercase ${
                        isTokenized
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {isTokenized ? asset.usageStatus : 'PENDING REVIEW'}
                    </span>
                  </div>

                  {/* Bottom Dark Badge Overlay matching Fig 5.17 */}
                  <div className="absolute bottom-3 left-3 right-3 rounded-2xl bg-navy-900/90 backdrop-blur-md px-4 py-2.5 text-white flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" />
                      <div className="leading-tight">
                        <div className="text-[10px] font-bold tracking-wider text-slate-300 uppercase">
                          {isTokenized ? 'VERIFIED ERC-3643' : 'AWAITING MINT'}
                        </div>
                        <div className="text-xs font-extrabold">{asset.assetCode}</div>
                      </div>
                    </div>
                    <div className="text-right leading-tight">
                      <div className="text-sm font-extrabold text-amber-400 tabular-nums">
                        {asset.targetApr}%
                      </div>
                      <div className="text-[10px] font-bold text-amber-300/90">APR</div>
                    </div>
                  </div>
                </div>

                {/* Card Body matching Fig 5.17 */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-base font-extrabold text-slate-900 leading-snug">
                        {asset.vehicleName}
                      </h3>
                      <div className="text-right shrink-0">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">VALUATION</div>
                        <div className="text-sm font-extrabold text-slate-900 tabular-nums">
                          ${asset.estimatedValue.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        {asset.location} · {asset.manufactureYear} · {asset.licensePlate}
                      </span>
                    </div>

                    {/* Funding Progress */}
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                        <span className="text-slate-400 tracking-wider uppercase">FUNDING</span>
                        <span className="text-teal-700 tabular-nums">{fundedPct}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-teal-600 transition-all"
                          style={{ width: `${fundedPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Utilization & Supply Metrics */}
                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                          <TrendingUp className="w-3 h-3" />
                          <span>UTILIZATION</span>
                        </div>
                        <div className="text-lg font-extrabold text-slate-900 mt-0.5 tabular-nums">
                          {asset.utilizationRate}%
                        </div>
                      </div>
                      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                          <Users className="w-3 h-3" />
                          <span>TOTAL SHARES</span>
                        </div>
                        <div className="text-lg font-extrabold text-slate-900 mt-0.5 tabular-nums">
                          {token ? token.totalSupply.toLocaleString() : '4,600'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      alert(
                        lang === 'vi'
                          ? `Chi tiết đầu tư & ký ví mua cổ phần ERC-3643 cho xe ${asset.vehicleName} sẽ được kích hoạt đầy đủ trong Module 5!`
                          : `Full investment modal & MetaMask ERC-3643 signing for ${asset.vehicleName} activates in Module 5!`
                      )
                    }
                    className={`w-full py-3 rounded-xl text-xs font-extrabold tracking-wider uppercase transition ${
                      isTokenized
                        ? 'bg-teal-700 hover:bg-teal-800 text-white'
                        : 'bg-navy-900 hover:bg-navy-800 text-white'
                    }`}
                  >
                    {lang === 'vi' ? 'XEM CHI TIẾT TÀI SẢN (MODULE 5)' : 'VIEW ASSET DETAIL (MODULE 5)'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
