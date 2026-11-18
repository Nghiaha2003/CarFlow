import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function ModuleBlueprintPage({ moduleCode, titleVi, titleEn, summaryVi, summaryEn, features }) {
  const { lang } = useLanguage();

  return (
    <div className="max-w-3xl mx-auto my-8 bg-white rounded-3xl border border-slate-200/90 p-8 shadow-sm">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold mb-4">
        <Clock className="w-3.5 h-3.5" />
        <span>
          {lang === 'vi' ? `Định tuyến sẵn sàng · Sẽ hoàn thiện tại ${moduleCode}` : `Route Ready · Scheduled in ${moduleCode}`}
        </span>
      </div>

      <h1 className="text-2xl font-extrabold text-slate-900 mb-2">
        {lang === 'vi' ? titleVi : titleEn}
      </h1>
      <p className="text-sm text-slate-600 leading-relaxed mb-6">
        {lang === 'vi' ? summaryVi : summaryEn}
      </p>

      <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-5 mb-6">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
          {lang === 'vi' ? 'CÁC TÍNH NĂNG SẼ ĐƯỢC HIỆN THỰC TRONG MODULE NÀY' : 'PLANNED CAPABILITIES IN THIS MODULE'}
        </div>
        <ul className="space-y-2.5">
          {features.map((f, idx) => (
            <li key={idx} className="flex items-start gap-2.5 text-sm text-slate-700 font-medium">
              <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
              <span>{lang === 'vi' ? f.vi : f.en}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Link
          to="/progress"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-navy-900 hover:bg-navy-800 text-white text-xs font-bold transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{lang === 'vi' ? 'Quay lại Bảng Tiến độ Thực hiện' : 'Back to Live Build Progress'}</span>
        </Link>
        <Link
          to="/marketplace"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition"
        >
          <span>{lang === 'vi' ? 'Xem trước Sàn Giao dịch Xe (DB Thật)' : 'Preview Live DB Marketplace'}</span>
        </Link>
      </div>
    </div>
  );
}
