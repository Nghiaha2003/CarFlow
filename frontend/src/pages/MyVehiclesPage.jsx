import React, { useEffect, useState, useCallback } from 'react';
import {
  Car,
  PlusCircle,
  FileCheck2,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Hash,
  ShieldAlert,
  ExternalLink,
} from 'lucide-react';
import { apiClient } from '../lib/apiClient';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function MyVehiclesPage() {
  const { user, login } = useAuth();
  const { lang } = useLanguage();

  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);

  // New Asset Form (API-04)
  const [vehicleName, setVehicleName] = useState('');
  const [vehicleSegment, setVehicleSegment] = useState('EV');
  const [manufactureYear, setManufactureYear] = useState(2025);
  const [location, setLocation] = useState('TP. Hồ Chí Minh');
  const [licensePlate, setLicensePlate] = useState('');
  const [chassisNumber, setChassisNumber] = useState('');
  const [engineNumber, setEngineNumber] = useState('');
  const [estimatedValue, setEstimatedValue] = useState('75000');
  const [targetApr, setTargetApr] = useState('13.5');
  const [description, setDescription] = useState('');
  const [submittingAsset, setSubmittingAsset] = useState(false);

  // Document Upload State (API-05)
  const [uploadingAssetId, setUploadingAssetId] = useState(null);
  const [docTypeMap, setDocTypeMap] = useState({});

  const loadAssets = useCallback(async (signal) => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await apiClient('/api/v1/assets/my', { signal });
      if (!signal?.aborted) {
        setAssets(res.assets || []);
      }
    } catch (err) {
      if (err.name !== 'AbortError' && !signal?.aborted) {
        setFeedback({ type: 'error', text: err.message });
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, [user]);

  useEffect(() => {
    const controller = new AbortController();
    loadAssets(controller.signal);
    return () => controller.abort();
  }, [loadAssets]);

  const handleQuickOwnerLogin = async () => {
    try {
      await login('owner@carflow.vn', 'CarFlow@2026');
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    }
  };

  if (!user) {
    return (
      <div className="max-w-xl mx-auto my-12 bg-white rounded-3xl border border-slate-200 p-8 text-center shadow-sm">
        <Car className="w-10 h-10 text-teal-600 mx-auto mb-3" />
        <h2 className="text-xl font-extrabold text-slate-900 mb-2">
          {lang === 'vi' ? 'Đăng nhập vai trò Chủ tài sản (OWNER)' : 'Owner Authentication Required'}
        </h2>
        <p className="text-sm text-slate-500 mb-6">
          {lang === 'vi'
            ? 'Phân hệ khai báo phương tiện và băm chứng từ IPFS yêu cầu quyền Chủ tài sản (OWNER) hoặc Quản trị viên (ADMIN).'
            : 'Vehicle declaration and IPFS document hashing require an OWNER or ADMIN account.'}
        </p>
        <button
          type="button"
          onClick={handleQuickOwnerLogin}
          className="px-5 py-3 rounded-xl bg-navy-900 hover:bg-navy-800 text-white text-sm font-bold transition"
        >
          {lang === 'vi'
            ? 'Đăng nhập nhanh: Công ty Vận tải Xanh (OWNER)'
            : '1-Click Sign In as Demo Fleet Owner'}
        </button>
      </div>
    );
  }

  const canManageAssets = user.role === 'OWNER' || user.role === 'ADMIN';

  const handleFillSampleVehicle = () => {
    const rand = Math.floor(100 + Math.random() * 899);
    setVehicleName('VinFast VF 8 Eco Airport Shuttle');
    setVehicleSegment('EV');
    setManufactureYear(2026);
    setLocation('TP. Hồ Chí Minh');
    setLicensePlate(`51K-${rand}.68`);
    setChassisNumber(`RLNVF8ECO2026VN${rand}`);
    setEngineNumber(`EV-260KW-${rand}`);
    setEstimatedValue('54000');
    setTargetApr('14.2');
    setDescription('Đội xe điện hợp đồng chuyên chở hành khách tuyến Sân bay Long Thành - Trung tâm Q.1.');
  };

  const handleCreateAsset = async (e) => {
    e.preventDefault();
    setFeedback(null);
    setSubmittingAsset(true);
    try {
      const res = await apiClient('/api/v1/assets', {
        method: 'POST',
        body: JSON.stringify({
          vehicle_name: vehicleName,
          vehicle_segment: vehicleSegment,
          manufacture_year: Number(manufactureYear),
          location,
          license_plate: licensePlate,
          chassis_number: chassisNumber,
          engine_number: engineNumber,
          estimated_value: Number(estimatedValue),
          target_apr: Number(targetApr),
          description,
        }),
      });
      setFeedback({
        type: 'success',
        text: `${res.message} (Mã xe: ${res.data.asset_code})`,
      });
      setVehicleName('');
      setLicensePlate('');
      setChassisNumber('');
      setEngineNumber('');
      setDescription('');
      await loadAssets();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setSubmittingAsset(false);
    }
  };

  const handleFileUpload = async (assetId, fileObj = null) => {
    setFeedback(null);
    setUploadingAssetId(assetId);
    const selectedType = docTypeMap[assetId] || 'inspection';
    try {
      let res;
      if (fileObj) {
        const token = localStorage.getItem('carflow_token');
        const formData = new FormData();
        formData.append('document_type', selectedType);
        formData.append('file', fileObj);
        const raw = await fetch(`/api/v1/assets/${assetId}/documents`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        });
        res = await raw.json();
        if (!raw.ok) throw new Error(res.message || 'Upload failed');
      } else {
        res = await apiClient(`/api/v1/assets/${assetId}/documents`, {
          method: 'POST',
          body: JSON.stringify({ document_type: selectedType }),
        });
      }

      setFeedback({
        type: 'success',
        text: `IPFS CID: ${res.data.ipfs_cid} · SHA-256: ${res.data.document_hash.slice(0, 18)}...`,
      });
      await loadAssets();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setUploadingAssetId(null);
    }
  };

  return (
    <div className="space-y-7">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-teal-700 bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-lg">
            MODULE 2 · VEHICLE ONBOARDING & IPFS CONTENT ADDRESSING
          </span>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-2">
            {lang === 'vi'
              ? 'Quản lý Hồ sơ Phương tiện & Chứng từ Pháp lý IPFS'
              : 'Vehicle Asset Onboarding & IPFS Legal Proofs'}
          </h1>
        </div>
      </div>

      {!canManageAssets && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
            <span>
              {lang === 'vi'
                ? `Bạn đang đăng nhập với vai trò ${user.role}. Chỉ vai trò OWNER hoặc ADMIN mới có quyền khai báo xe mới (API-04).`
                : `Signed in as ${user.role}. Switch to OWNER or ADMIN to register vehicles (API-04).`}
            </span>
          </div>
          <button
            type="button"
            onClick={handleQuickOwnerLogin}
            className="px-3.5 py-2 rounded-xl bg-amber-900 text-white font-bold shrink-0 hover:bg-amber-800"
          >
            {lang === 'vi' ? 'Chuyển sang tài khoản OWNER' : 'Switch to OWNER'}
          </button>
        </div>
      )}

      {feedback && (
        <div
          className={`p-4 rounded-2xl border text-xs sm:text-sm font-semibold flex items-start gap-2.5 break-all ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-7">
        {/* Left: API-04 Create Vehicle Form */}
        {canManageAssets && (
          <form
            onSubmit={handleCreateAsset}
            className="xl:col-span-5 bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-4 h-fit"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-teal-600" />
                <span>
                  {lang === 'vi' ? 'Khai báo Xe Mới (API-04)' : 'New Vehicle Declaration (API-04)'}
                </span>
              </h2>
              <button
                type="button"
                onClick={handleFillSampleVehicle}
                className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              >
                {lang === 'vi' ? 'Điền mẫu nhanh' : 'Fill Sample'}
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                {lang === 'vi' ? 'Tên thương mại phương tiện *' : 'Vehicle Model *'}
              </label>
              <input
                type="text"
                required
                value={vehicleName}
                onChange={(e) => setVehicleName(e.target.value)}
                placeholder="VD: VinFast VF 8 Eco Commercial"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-teal-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                  {lang === 'vi' ? 'Biển kiểm soát *' : 'License Plate *'}
                </label>
                <input
                  type="text"
                  required
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value)}
                  placeholder="51K-999.88"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-mono focus:outline-none focus:border-teal-600"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                  {lang === 'vi' ? 'Số khung (VIN) *' : 'VIN *'}
                </label>
                <input
                  type="text"
                  required
                  value={chassisNumber}
                  onChange={(e) => setChassisNumber(e.target.value)}
                  placeholder="RLNVF8..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-mono focus:outline-none focus:border-teal-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                  {lang === 'vi' ? 'Phân khúc' : 'Segment'}
                </label>
                <select
                  value={vehicleSegment}
                  onChange={(e) => setVehicleSegment(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold focus:outline-none"
                >
                  <option value="EV">EV</option>
                  <option value="Luxury">Luxury</option>
                  <option value="Logistics">Logistics</option>
                  <option value="Commercial">Commercial</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                  {lang === 'vi' ? 'Năm SX' : 'Year'}
                </label>
                <input
                  type="number"
                  value={manufactureYear}
                  onChange={(e) => setManufactureYear(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm tabular-nums"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                  APR (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={targetApr}
                  onChange={(e) => setTargetApr(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm tabular-nums"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                  {lang === 'vi' ? 'Định giá tài sản (USD) *' : 'Valuation (USD) *'}
                </label>
                <input
                  type="number"
                  required
                  min="1000"
                  value={estimatedValue}
                  onChange={(e) => setEstimatedValue(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold tabular-nums"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                  {lang === 'vi' ? 'Khu vực khai thác' : 'Location'}
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                {lang === 'vi' ? 'Mô tả phương án khai thác dòng tiền' : 'Operational Revenue Plan'}
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mô tả hợp đồng cho thuê hoặc tuyến vận tải thương mại..."
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:border-teal-600"
              />
            </div>

            <button
              type="submit"
              disabled={submittingAsset}
              className="w-full py-3 rounded-xl bg-navy-900 hover:bg-navy-800 disabled:opacity-50 text-white text-xs font-extrabold uppercase tracking-wider transition"
            >
              {submittingAsset
                ? lang === 'vi'
                  ? 'Đang khởi tạo hồ sơ...'
                  : 'Submitting...'
                : lang === 'vi'
                ? 'Khai báo Xe & Gửi Yêu cầu Token hóa'
                : 'Register Vehicle & Request Tokenization'}
            </button>
          </form>
        )}

        {/* Right: Vehicle Fleet & IPFS Legal Document Vault (API-05) */}
        <div className={canManageAssets ? 'xl:col-span-7 space-y-4' : 'xl:col-span-12 space-y-4'}>
          {loading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-56 rounded-3xl bg-white border border-slate-200 animate-pulse" />
              ))}
            </div>
          ) : assets.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center">
              <FileCheck2 className="w-9 h-9 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-800">
                {lang === 'vi' ? 'Chưa có phương tiện nào thuộc tài khoản này' : 'No vehicles declared yet'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {lang === 'vi'
                  ? 'Sử dụng biểu mẫu bên trái để khai báo phương tiện đầu tiên và tải hồ sơ lên IPFS.'
                  : 'Use the declaration form on the left to register your first vehicle.'}
              </p>
            </div>
          ) : (
            assets.map((asset) => (
              <div
                key={asset.id}
                className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-sm space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-extrabold px-2 py-0.5 rounded bg-navy-900 text-teal-300">
                        {asset.assetCode}
                      </span>
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                          asset.tokenizationStatus === 'TOKENIZED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : asset.tokenizationStatus === 'PENDING_REVIEW'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {asset.tokenizationStatus}
                      </span>
                      <span className="text-xs font-mono text-slate-500">
                        {asset.licensePlate} · VIN: {asset.chassisNumber}
                      </span>
                    </div>
                    <h3 className="text-base font-extrabold text-slate-900 mt-1.5">
                      {asset.vehicleName}
                    </h3>
                  </div>

                  <div className="text-left sm:text-right shrink-0">
                    <div className="text-[10px] font-bold uppercase text-slate-400">VALUATION</div>
                    <div className="text-lg font-extrabold text-slate-900 tabular-nums">
                      ${asset.estimatedValue.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Uploaded IPFS Documents */}
                <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-4 space-y-2.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                    <span>
                      {lang === 'vi'
                        ? `Kho Chứng từ Pháp lý IPFS (${asset.documents?.length || 0} tài liệu)`
                        : `IPFS Legal Document Vault (${asset.documents?.length || 0} files)`}
                    </span>
                  </div>

                  {asset.documents?.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-2.5 rounded-xl bg-white border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-slate-800 flex items-center gap-1.5">
                          <span className="uppercase text-[10px] px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200">
                            {doc.documentType}
                          </span>
                          <span className="truncate">{doc.fileName}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono truncate mt-1 flex items-center gap-1">
                          <Hash className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>CID: {doc.ipfsCid}</span>
                        </div>
                      </div>
                      {doc.fileUrl && (
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-blue hover:underline shrink-0"
                        >
                          <span>{lang === 'vi' ? 'Mở bản lưu' : 'Open File'}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  ))}

                  {/* Upload Action Bar (API-05) */}
                  {canManageAssets && (
                    <div className="pt-2 flex flex-wrap items-center gap-2">
                      <select
                        value={docTypeMap[asset.id] || 'inspection'}
                        onChange={(e) =>
                          setDocTypeMap((prev) => ({ ...prev, [asset.id]: e.target.value }))
                        }
                        className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700"
                      >
                        <option value="registration">Cà-vẹt Đăng ký xe (registration)</option>
                        <option value="inspection">Giấy Đăng kiểm (inspection)</option>
                        <option value="insurance">Bảo hiểm vật chất (insurance)</option>
                      </select>

                      <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 transition">
                        <UploadCloud className="w-3.5 h-3.5 text-brand-blue" />
                        <span>{lang === 'vi' ? 'Chọn tệp tải lên IPFS' : 'Upload File to IPFS'}</span>
                        <input
                          type="file"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              handleFileUpload(asset.id, e.target.files[0]);
                              e.target.value = '';
                            }
                          }}
                        />
                      </label>

                      <button
                        type="button"
                        disabled={uploadingAssetId === asset.id}
                        onClick={() => handleFileUpload(asset.id, null)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white text-xs font-bold transition"
                      >
                        <span>
                          {uploadingAssetId === asset.id
                            ? 'Đang băm IPFS...'
                            : lang === 'vi'
                            ? '+ Ký số & Băm Chứng từ Mẫu (API-05)'
                            : '+ Hash Digital Proof (API-05)'}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
