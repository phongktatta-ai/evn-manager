import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, Zap, Activity, Warehouse, 
  Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  DownloadCloud, Loader2, CheckCircle2, XCircle, RefreshCw, Clock,
  ArrowLeftRight, FileText, Plus, Trash2, Printer, Info
} from 'lucide-react';

// Cấu hình đường dẫn cố định
const GOOGLE_SHEET_URL = "https://docs.google.com/spreadsheets/d/1-encHUhE36iw-nruN75SodCSS6iiDh7d/edit?gid=767831174#gid=767831174";

/**
 * Tiện ích phân tích CSV
 */
const parseCSV = (text) => {
  const result = [];
  let row = [];
  let inQuotes = false;
  let cell = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') inQuotes = !inQuotes;
    else if (char === ',' && !inQuotes) { row.push(cell); cell = ''; } 
    else if (char === '\n' && !inQuotes) { row.push(cell); result.push(row); row = []; cell = ''; } 
    else if (char !== '\r') cell += char;
  }
  if (cell || row.length) { row.push(cell); result.push(row); }
  return result;
};

/**
 * Xử lý dữ liệu thô
 */
const processRawArray = (rawRows, keyword) => {
  let headerIndex = -1;
  const normalize = (str) => String(str || "").toUpperCase().trim().replace(/[^A-Z0-9]/g, '');

  for (let i = 0; i < Math.min(rawRows.length, 100); i++) {
    const rowStr = (rawRows[i] || []).map(normalize).join('|');
    if (rowStr.includes(normalize(keyword))) {
      headerIndex = i;
      break;
    }
  }
  
  if (headerIndex === -1) return [];
  
  const headers = rawRows[headerIndex].map(h => h ? String(h).trim() : "");
  let idColIdx = headers.findIndex(h => normalize(h) === normalize(keyword));
  if (idColIdx === -1) idColIdx = headers.findIndex(h => normalize(h).includes(normalize(keyword)));
  const nameColIdx = headers.findIndex(h => normalize(h).includes("TENDUKIEN") || normalize(h).includes("TENTBT"));

  if (idColIdx === -1) idColIdx = 0;

  return rawRows.slice(headerIndex + 1)
    .filter(row => {
      const idVal = String(row[idColIdx] || "").trim();
      const nameVal = nameColIdx !== -1 ? String(row[nameColIdx] || "").trim() : "Valid";
      if (!idVal || idVal === "" || idVal === "0" || idVal.startsWith("#")) return false;
      if (!nameVal || nameVal === "" || nameVal.startsWith("#")) return false;
      const dataCols = row.filter(c => String(c).trim() !== "" && !String(c).includes("#"));
      return dataCols.length >= 4;
    })
    .map(row => {
      let obj = {};
      headers.forEach((h, idx) => { if (h) obj[h] = row[idx] ? String(row[idx]).trim() : ""; });
      return obj;
    });
};

/**
 * Component Mẫu in Phiếu chỉ định (Fix lỗi Font tiếng Việt)
 */
const DispatchPrintTemplate = ({ dispatchList, metadata }) => {
  const today = new Date();
  if (!dispatchList || dispatchList.length === 0) return null;

  return (
    <div className="print-only-container hidden print:block bg-white text-black p-0 m-0 w-full">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: A4; margin: 15mm 10mm 15mm 20mm; }
          body * { visibility: hidden; }
          .print-only-container, .print-only-container * { 
            visibility: visible; 
            font-family: "Times New Roman", Times, serif !important;
            color: black !important;
            text-rendering: optimizeLegibility;
            -webkit-font-smoothing: antialiased;
          }
          .print-only-container { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%; 
            display: block !important; 
          }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid black !important; padding: 4px; }
        }
        .admin-line-height { line-height: 1.5; }
        .text-justify { text-align: justify; }
      `}} />
      
      {/* QUỐC HIỆU & ĐƠN VỊ */}
      <div className="flex justify-between items-start mb-2 text-[11.5pt]">
        <div className="text-center w-[45%]">
          <h4 className="font-bold uppercase mb-0">CÔNG TY ĐIỆN LỰC THUẬN AN</h4>
          <h5 className="font-bold border-b border-black inline-block px-2 uppercase mb-1">Phòng Kỹ thuật và An toàn</h5>
          <div className="flex flex-col items-center mt-1">
             <p className="m-0">Số: ......... /KTAT</p>
             <p className="m-0 text-[10pt] italic">V/v điều động MBT để {metadata.reason || 'nội dung...'}</p>
          </div>
        </div>
        <div className="text-center w-[55%]">
          <h4 className="font-bold uppercase mb-0">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h4>
          <h5 className="font-bold border-b border-black inline-block px-2 uppercase mb-1">Độc lập - Tự Do - Hạnh Phúc</h5>
          <p className="mt-1 italic">Thuận An, ngày {today.getDate()} tháng {today.getMonth() + 1} năm {today.getFullYear()}</p>
        </div>
      </div>

      {/* TIÊU ĐỀ */}
      <div className="text-center mb-6 mt-8">
        <h2 className="text-[15pt] font-bold uppercase mb-1">PHIẾU CHỈ ĐỊNH MÁY BIẾN THẾ</h2>
        <p className="font-bold italic text-[12pt]">Kính gửi: Ông Giám đốc</p>
      </div>

      {/* CĂN CỨ */}
      <div className="mb-4 text-[12pt] admin-line-height text-justify px-2">
        <p className="mb-1">- Căn cứ quyết định số 4338/QĐ-EVNHCMC ngày 10/10/2023 về việc ban hành Quy định quản lý và hạch toán vật tư thiết bị áp dụng trong Tổng công ty Điện lực TP.HCM .</p>
        <p className="mb-1">- Căn cứ {metadata.grounds || 'văn bản số 150/QLLĐ ngày 12/01/2026 của Đội QLLĐ về việc xử lý quá tải TBT công cộng Chùa Bà Lái Thiêu 3.'}</p>
        <p>Để quản lý vật tư thiết bị theo đúng qui định, Phòng KT&AT lập phiếu điều động MBT với nội dung sau :</p>
      </div>

      {/* BẢNG DỮ LIỆU CHÍNH */}
      <table className="w-full text-center text-[10pt] mb-6 border-black">
        <thead className="font-bold bg-gray-100">
          <tr>
            <th style={{ width: '30px' }}>STT</th>
            <th>MSTS</th>
            <th>Hiệu máy</th>
            <th>Số máy</th>
            <th>Công suất (kVA)</th>
            <th style={{ width: '50px' }}>Năm SX</th>
            <th>Tên nơi đi</th>
            <th>Mã nơi đi</th>
            <th>Tên nơi đến</th>
            <th>Mã nơi đến</th>
          </tr>
        </thead>
        <tbody>
          {dispatchList.map((item, index) => (
            <tr key={index}>
              <td>{index + 1}</td>
              <td>{item.transformer.MSTS || '-'}</td>
              <td>{item.transformer['Hiệu máy'] || item.transformer['HIỆU'] || '-'}</td>
              <td>{item.transformer['Số máy'] || item.transformer['SERIAL NUMBER'] || '-'}</td>
              <td>{item.transformer['Công suất'] || item.transformer['CS MBT'] || '-'}</td>
              <td>{item.transformer['Năm SX'] || '-'}</td>
              <td className="text-left px-1">{item.source.name}</td>
              <td>{item.source.id}</td>
              <td className="text-left px-1">{item.destination.name}</td>
              <td>{item.destination.id}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* PHÂN CÔNG THỰC HIỆN */}
      <div className="mb-6 text-[11.5pt] admin-line-height px-2">
        <h5 className="font-bold underline uppercase mb-2">Phân công thực hiện:</h5>
        <div className="space-y-1">
          <p><span className="font-bold">Đội VHLĐ:</span> Thông báo thời gian mất điện khách hàng theo quy định; Bàn giao hiện trường, cấp phiếu công tác để Đội QLLĐ thi công thay MBT.</p>
          <p><span className="font-bold">Đội QLLĐ:</span> Thay và bàn giao MBT thu hồi với đánh giá đẩy đủ tình trạng ngoại quan (chì niêm: có/không; cosse cao, hạ MBT: đầy đủ/không đầy đủ) theo đúng qui định; Cập nhật hình ảnh trạm biến thế, máy biến thế lên chương trình PMIS theo văn bản số 145/KTAT; Lập phương án hoán chuyển TBT 400kVA non tải để có nguồn MBT 400kVA dự phòng tại kho, trước ngày 20/01/2026.</p>
          <p><span className="font-bold">Phòng KT&AT:</span> Cập nhật biến động công suất trạm biến thế, máy biến thế vào các chương trình QLKT liên quan; Quản lý số lượng, chủng loại MBA theo văn bản số 2567/EVNHCMC-KH ngày 11/7/2024 của Tổng công ty ĐL TP.HCM.</p>
          <p><span className="font-bold">Phòng TCKT:</span> Cập nhật biến động tình hình vận hành của mã tài sản đúng qui định.</p>
          <p><span className="font-bold">Đội QLHTĐĐ:</span> Phối hợp Đội QLLĐ thay TI phù hợp với công suất máy và cài đặt lại thông số điện kế.</p>
          <p><span className="font-bold">Phòng Kinh doanh:</span> Cập nhật công suất trạm vào chương trình quản lý sau khi Đội QLLĐ thi công xong.</p>
          <p><span className="font-bold">Phòng KHVT:</span> Phối hợp giao và nhận MBT thu hồi về Kho ĐL (kiểm tra ngoại quan, chì niêm, đầu cosse cao hạ MBT)./.</p>
        </div>
      </div>

      {/* CHỮ KÝ */}
      <div className="flex justify-between mt-4 text-[11pt] px-2">
        <div className="w-[30%]">
          <p className="font-bold underline mb-1">Nơi nhận:</p>
          <ul className="list-none p-0 m-0 leading-tight italic text-[10pt]">
            <li>- Ban giám đốc (để báo cáo);</li>
            <li>- Đội QLVH, QLLĐ (để thực hiện);</li>
            <li>- Phòng KHVT, TCKT (để thực hiện);</li>
            <li>- Lưu: KTAT, LHT.</li>
          </ul>
        </div>
        <div className="flex-1 flex justify-around text-center pt-2">
            <div className="w-1/2">
                <p className="font-bold uppercase mb-0">ĐỘI QLLĐ</p>
                <p className="font-bold uppercase mb-16">ĐỘI TRƯỞNG</p>
                <p className="font-bold">Trương Minh Thi</p>
            </div>
            <div className="w-1/2">
                <p className="font-bold uppercase mb-0">PHÒNG KT&AT</p>
                <p className="font-bold uppercase mb-16">TRƯỞNG PHÒNG</p>
                <p className="font-bold">Lại Văn Hiền</p>
            </div>
        </div>
      </div>

      {/* PHÊ DUYỆT */}
      <div className="mt-8 border-t border-black pt-4 text-[12pt] px-2">
          <p className="font-bold italic">Ý kiến phê duyệt của Giám đốc Đặng Hoài Bắc:</p>
          <div className="h-24"></div>
      </div>
    </div>
  );
};

/**
 * Component Bảng dữ liệu chung
 */
const DataTable = ({ data, columns, title, icon: Icon }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 50;

  const filtered = useMemo(() => {
    if (!searchTerm) return data;
    const s = searchTerm.toLowerCase();
    return data.filter(item => Object.values(item).some(v => String(v).toLowerCase().includes(s)));
  }, [data, searchTerm]);

  const totalPages = Math.ceil(filtered.length / rowsPerPage);
  const currentData = filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  useEffect(() => { setCurrentPage(1); }, [searchTerm]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full animate-in fade-in duration-500">
      <div className="p-4 bg-slate-50 border-b flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2 text-blue-600">
          <Icon className="w-5 h-5" />
          <h2 className="font-bold text-slate-800 uppercase tracking-tight">{title} ({filtered.length})</h2>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" placeholder="Tìm nhanh..." 
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      <div className="overflow-auto flex-1">
        <table className="w-full text-[11px] sm:text-sm text-left border-collapse">
          <thead className="bg-slate-100 sticky top-0 z-10">
            <tr>
              {columns.map(col => <th key={col.key} className="px-4 py-3 font-bold text-slate-600 border-b whitespace-nowrap">{col.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {currentData.length > 0 ? currentData.map((row, i) => (
              <tr key={i} className="border-b hover:bg-blue-50/50 transition-colors">
                {columns.map(col => (
                  <td key={col.key} className="px-4 py-3 text-slate-600 whitespace-nowrap max-w-[250px] truncate" title={row[col.key]}>
                    {col.key === 'AUTO_STT' ? (i + 1 + (currentPage - 1) * rowsPerPage) : (row[col.key] || '-')}
                  </td>
                ))}
              </tr>
            )) : (
              <tr><td colSpan={columns.length} className="p-10 text-center text-slate-400 italic">Không tìm thấy dữ liệu</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="p-4 border-t flex justify-between items-center bg-slate-50 text-xs font-medium text-slate-500">
        <div className="flex gap-1 sm:gap-2">
          <button disabled={currentPage === 1} onClick={() => setCurrentPage(1)} className="p-2 border rounded-lg hover:bg-white disabled:opacity-30 transition-all"><ChevronsLeft className="w-4 h-4"/></button>
          <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-2 border rounded-lg hover:bg-white disabled:opacity-30 transition-all"><ChevronLeft className="w-4 h-4"/></button>
          <span className="px-4 py-2 font-bold text-blue-600">Trang {currentPage} / {totalPages || 1}</span>
          <button disabled={currentPage >= totalPages || totalPages === 0} onClick={() => setCurrentPage(p => p + 1)} className="p-2 border rounded-lg hover:bg-white disabled:opacity-30 transition-all"><ChevronRight className="w-4 h-4"/></button>
          <button disabled={currentPage >= totalPages || totalPages === 0} onClick={() => setCurrentPage(totalPages)} className="p-2 border rounded-lg hover:bg-white disabled:opacity-30 transition-all"><ChevronsRight className="w-4 h-4"/></button>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [data, setData] = useState({ tbt: [], mbt: [], kho: [] });
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ text: '', type: '' });
  const [lastSyncTime, setLastSyncTime] = useState(localStorage.getItem('evn_last_sync') || 'Chưa có dữ liệu');

  // Metadata cho phiếu in
  const [metadata, setMetadata] = useState({
    reason: 'hoán chuyển MBT non tải/quá tải',
    grounds: 'văn bản số 150/QLLĐ ngày 12/01/2026 của Đội QLLĐ về việc xử lý quá tải TBT công cộng Chùa Bà Lái Thiêu 3.'
  });

  // Trạng thái điều động
  const [dispatchCart, setDispatchCart] = useState([]);
  const [sourceLoc, setSourceLoc] = useState({ type: '', id: '', name: '' });
  const [destLoc, setDestLoc] = useState({ type: '', id: '', name: '' });
  const [selectedTransformer, setSelectedTransformer] = useState(null);

  const showStatus = (text, type = 'info') => {
    setStatusMsg({ text, type });
    if (type !== 'loading') setTimeout(() => setStatusMsg({ text: '', type: '' }), 3000);
  };

  const fetchData = async () => {
    setLoading(true);
    showStatus("Đang đồng bộ dữ liệu...", "loading");
    try {
      const idMatch = GOOGLE_SHEET_URL.match(/\/d\/([a-zA-Z0-9-_]+)/);
      const id = idMatch[1];
      const fetchTab = async (name, key) => {
        const url = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(name)}`;
        const res = await fetch(url);
        const text = await res.text();
        return processRawArray(parseCSV(text), key);
      };
      const [rawTbt, mbt, kho] = await Promise.all([
        fetchTab('DATA TBT', 'TBTID'),
        fetchTab('DATA MBT', 'Số máy'),
        fetchTab('KHO', 'Số máy')
      ]);
      const uniqueTbt = [];
      const seenIds = new Set();
      rawTbt.forEach(item => {
        if (!seenIds.has(item.TBTID)) {
          uniqueTbt.push(item);
          seenIds.add(item.TBTID);
        }
      });
      setData({ tbt: uniqueTbt, mbt: mbt, kho: kho });
      const now = new Date().toLocaleString('vi-VN');
      setLastSyncTime(now);
      localStorage.setItem('evn_last_sync', now);
      showStatus(`Đã tải dữ liệu mới nhất!`, "success");
    } catch (e) {
      showStatus("Lỗi kết nối Sheet!", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const availableTransformers = useMemo(() => {
    if (sourceLoc.type === 'KHO') return data.kho;
    if (sourceLoc.type === 'TRAM') {
      return data.mbt.filter(m => m["Vị trí"] === sourceLoc.id || m["trạm"] === sourceLoc.id || m["TRAM"] === sourceLoc.id);
    }
    return [];
  }, [sourceLoc, data]);

  const addToDispatch = () => {
    if (!sourceLoc.id || !destLoc.id || !selectedTransformer) {
      alert("Vui lòng chọn đầy đủ Nơi đi, Nơi đến và Máy!");
      return;
    }
    setDispatchCart([...dispatchCart, { 
      source: { ...sourceLoc }, 
      destination: { ...destLoc }, 
      transformer: selectedTransformer 
    }]);
    setSelectedTransformer(null);
  };

  const navItems = [
    { id: 'dashboard', label: 'Hệ Thống', icon: LayoutDashboard },
    { id: 'tbt', label: 'Trạm (TBT)', icon: Zap },
    { id: 'mbt', label: 'Máy (MBT)', icon: Activity },
    { id: 'kho', label: 'Kho thiết bị', icon: Warehouse },
    { id: 'dispatch', label: 'Lập Phiếu', icon: ArrowLeftRight },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-900 overflow-hidden">
      
      {/* TRANG IN ĐÃ FIX LỖI FONT TIẾNG VIỆT */}
      <DispatchPrintTemplate dispatchList={dispatchCart} metadata={metadata} />

      {/* SIDEBAR NAVIGATION */}
      <div className="no-print w-full md:w-64 bg-slate-900 text-white p-6 flex flex-col gap-8 shrink-0 shadow-2xl z-20">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-500/20"><Zap className="w-6 h-6 text-white" /></div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight uppercase leading-tight">Phòng KTAT</span>
            <span className="text-xs font-medium text-blue-400 uppercase tracking-wider italic">PC Thuận An</span>
          </div>
        </div>
        <nav className="flex flex-col gap-2">
          {navItems.map(item => (
            <button 
              key={item.id} onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-semibold ${activeTab === item.id ? 'bg-blue-600 text-white shadow-lg translate-x-1' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            >
              <item.icon className="w-5 h-5" /> {item.label}
            </button>
          ))}
        </nav>
      </div>

      <main className="no-print flex-1 p-4 md:p-8 overflow-hidden flex flex-col gap-6">
        {/* TOAST STATUS */}
        {statusMsg.text && (
          <div className={`fixed top-4 right-4 z-50 p-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right duration-300 print:hidden ${
            statusMsg.type === 'error' ? 'bg-red-50 text-red-600 border border-red-100' : 
            statusMsg.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 
            'bg-blue-50 text-blue-600 border border-blue-100'
          }`}>
            {statusMsg.type === 'loading' ? <Loader2 className="w-5 h-5 animate-spin" /> : 
             statusMsg.type === 'error' ? <XCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
            <span className="font-bold text-sm">{statusMsg.text}</span>
          </div>
        )}

        <div className="h-full flex flex-col gap-6 overflow-hidden">
          {activeTab === 'dashboard' && (
            <div className="space-y-6 max-w-5xl mx-auto w-full animate-in fade-in slide-in-from-top duration-700">
              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-black text-slate-800 tracking-tight uppercase italic">Thống kê</h2>
                <button onClick={fetchData} disabled={loading} className="p-3 bg-white border border-slate-200 rounded-2xl shadow-sm hover:bg-slate-50 text-slate-600 transition-all">
                  <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {[
                  { label: 'Trạm vận hành', val: data.tbt.length, icon: Zap, color: 'text-blue-600', bg: 'bg-blue-100' },
                  { label: 'Máy vận hành', val: data.mbt.length, icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-100' },
                  { label: 'Máy trong kho', val: data.kho.length, icon: Warehouse, color: 'text-orange-600', bg: 'bg-orange-100' },
                ].map((s, i) => (
                  <div key={i} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-all group">
                    <div className={`${s.bg} ${s.color} p-4 rounded-2xl group-hover:scale-110 transition-transform`}><s.icon className="w-6 h-6" /></div>
                    <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p><p className="text-3xl font-black text-slate-800 tracking-tighter">{s.val}</p></div>
                  </div>
                ))}
              </div>
              <div className="bg-blue-600 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl">
                 <div className="relative z-10 space-y-2">
                    <div className="flex items-center gap-2 text-blue-200 font-bold text-xs uppercase tracking-widest"><Clock className="w-4 h-4"/> Đồng bộ gần nhất</div>
                    <h3 className="text-2xl font-black italic tracking-tight">{lastSyncTime}</h3>
                 </div>
                 <Zap className="absolute -right-6 -bottom-6 w-40 h-40 text-blue-500 opacity-20 rotate-12" />
              </div>
            </div>
          )}

          {activeTab === 'dispatch' && (
            <div className="space-y-6 max-w-7xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col h-full overflow-auto pb-10 px-1">
              <div className="flex flex-col gap-1">
                <h2 className="text-3xl font-black text-slate-800 tracking-tight uppercase italic font-black">Phiếu Điều Động MBT</h2>
                <p className="text-slate-500 font-medium">Lập lệnh điều động theo đúng quy chuẩn PC Thuận An.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-fit">
                {/* CẤU HÌNH VĂN BẢN */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 lg:col-span-1 h-fit">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2"><Info className="w-5 h-5 text-blue-500"/> Nội dung văn bản</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">V/v điều động MBT để:</label>
                      <input 
                        type="text" value={metadata.reason} 
                        onChange={(e) => setMetadata({...metadata, reason: e.target.value})}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none mt-1"
                        placeholder="Ví dụ: hoán chuyển MBT non tải"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Căn cứ văn bản:</label>
                      <textarea 
                        rows="5" value={metadata.grounds}
                        onChange={(e) => setMetadata({...metadata, grounds: e.target.value})}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none mt-1 leading-relaxed"
                        placeholder="Nhập số văn bản và nội dung căn cứ..."
                      />
                    </div>
                  </div>
                </div>

                {/* FORM CHỌN MÁY */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 lg:col-span-1 h-fit">
                  <h3 className="font-bold text-blue-600 flex items-center gap-2 uppercase text-sm tracking-widest"><Plus className="w-5 h-5"/> Thêm máy điều động</h3>
                  
                  <div className="space-y-3">
                    <select 
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold"
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'KHO') setSourceLoc({ type: 'KHO', id: 'KHO', name: 'Kho Thuận An' });
                        else if (val) {
                          const trạm = data.tbt.find(t => t.TBTID === val);
                          setSourceLoc({ type: 'TRAM', id: val, name: trạm?.['TÊN DỰ KIẾN'] || val });
                        } else setSourceLoc({ type: '', id: '', name: '' });
                        setSelectedTransformer(null);
                      }}
                    >
                      <option value="">-- Chọn Nơi Đi (Nguồn) --</option>
                      <option value="KHO">KHO THIẾT BỊ (Kho hiện tại)</option>
                      {data.tbt.map(t => <option key={t.TBTID} value={t.TBTID}>{t.TBTID} - {t['TÊN DỰ KIẾN']}</option>)}
                    </select>

                    <select 
                      disabled={!sourceLoc.id}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold disabled:opacity-40"
                      value={selectedTransformer ? (selectedTransformer['Số máy'] || selectedTransformer['SERIAL NUMBER']) : ""}
                      onChange={(e) => {
                        const mbt = availableTransformers.find(m => (m['Số máy'] || m['SERIAL NUMBER']) === e.target.value);
                        setSelectedTransformer(mbt);
                      }}
                    >
                      <option value="">-- Chọn MBT ({availableTransformers.length}) --</option>
                      {availableTransformers.map((m, i) => (
                        <option key={i} value={m['Số máy'] || m['SERIAL NUMBER']}>
                          {m['Số máy'] || m['SERIAL NUMBER']} - {m['Công suất'] || m['CS MBT']}kVA
                        </option>
                      ))}
                    </select>

                    <select 
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold"
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'KHO') setDestLoc({ type: 'KHO', id: 'KHO', name: 'Kho Thuận An' });
                        else if (val) {
                          const trạm = data.tbt.find(t => t.TBTID === val);
                          setDestLoc({ type: 'TRAM', id: val, name: trạm?.['TÊN DỰ KIẾN'] || val });
                        } else setDestLoc({ type: '', id: '', name: '' });
                      }}
                    >
                      <option value="">-- Chọn Nơi Đến (Đích) --</option>
                      <option value="KHO">VỀ KHO THIẾT BỊ</option>
                      {data.tbt.map(t => <option key={t.TBTID} value={t.TBTID}>{t.TBTID} - {t['TÊN DỰ KIẾN']}</option>)}
                    </select>
                  </div>

                  <button onClick={addToDispatch} className="w-full bg-blue-600 text-white p-3.5 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 shadow-lg active:scale-95 transition-all text-xs">
                    Thêm vào danh sách
                  </button>
                </div>

                {/* DANH SÁCH LỆNH */}
                <div className="bg-slate-800 text-white p-6 rounded-3xl shadow-xl flex flex-col h-full lg:col-span-1 min-h-[450px]">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold flex items-center gap-2 text-xs uppercase tracking-widest"><FileText className="w-4 h-4 text-emerald-400"/> Phiếu điều động</h3>
                    <button 
                      onClick={() => window.print()}
                      disabled={dispatchCart.length === 0}
                      className="bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-emerald-600 transition-all disabled:opacity-30 shadow-lg shadow-emerald-500/20 uppercase"
                    >
                      <Printer className="w-4 h-4"/> Xuất Phiếu
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin scrollbar-thumb-slate-600">
                    {dispatchCart.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-500 py-10 opacity-30">
                        <ArrowLeftRight className="w-12 h-12 mb-2"/>
                        <p className="text-xs font-bold uppercase tracking-widest text-center">Chưa có máy nào<br/>được chọn</p>
                      </div>
                    ) : (
                      dispatchCart.map((item, i) => (
                        <div key={i} className="bg-slate-700/40 p-4 rounded-2xl border border-slate-600/30 flex justify-between items-center animate-in slide-in-from-right duration-300">
                          <div className="flex-1 overflow-hidden">
                            <div className="text-[10pt] font-black text-emerald-400 uppercase tracking-widest mb-1 truncate">
                              {item.source.name} ➔ {item.destination.name}
                            </div>
                            <div className="text-sm font-black truncate">Số máy: {item.transformer['Số máy'] || item.transformer['SERIAL NUMBER']}</div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">CS: {item.transformer['Công suất'] || item.transformer['CS MBT']} kVA | {item.transformer['Hiệu máy'] || 'N/A'}</div>
                          </div>
                          <button onClick={() => setDispatchCart(dispatchCart.filter((_, idx) => idx !== i))} className="p-2 ml-2 text-slate-400 hover:text-red-400 transition-colors">
                            <Trash2 className="w-4 h-4"/>
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                  
                  {dispatchCart.length > 0 && (
                    <button onClick={() => setDispatchCart([])} className="mt-4 text-[10px] text-slate-500 hover:text-red-400 font-black uppercase tracking-widest text-center transition-colors">Hủy toàn bộ phiếu</button>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab !== 'dashboard' && activeTab !== 'dispatch' && (
            <div className="flex-1 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 px-1">
              <DataTable 
                data={data[activeTab]} 
                icon={navItems.find(n => n.id === activeTab).icon}
                title={`Danh sách: ${navItems.find(n => n.id === activeTab).label}`}
                columns={activeTab === 'tbt' ? [
                  { key: 'AUTO_STT', label: 'STT' }, { key: 'TBTID', label: 'Mã Trạm' }, { key: 'TÊN DỰ KIẾN', label: 'Tên Trạm (Dự kiến)' }, { key: 'TỔNG CS TBT', label: 'Công Suất' }, { key: 'KIỂU TRẠM', label: 'Kiểu' }
                ] : activeTab === 'mbt' ? [
                  { key: 'AUTO_STT', label: 'STT' }, { key: 'Số máy', label: 'Số Máy' }, { key: 'Hiệu máy', label: 'Hiệu Máy' }, { key: 'Công suất', label: 'Công Suất' }, { key: 'Vị trí', label: 'Vị trí' }, { key: 'Tình trạng', label: 'Trạng thái' }
                ] : [
                  { key: 'AUTO_STT', label: 'STT' }, { key: 'Số máy', label: 'Số Máy' }, { key: 'Hiệu máy', label: 'Hiệu Máy' }, { key: 'Công suất', label: 'Công Suất' }, { key: 'Vị trí trước khi về kho', label: 'Nguồn thu hồi' }, { key: 'Chất lượng', label: 'Chất lượng' }
                ]}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}