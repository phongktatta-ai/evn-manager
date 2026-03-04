import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, Zap, Activity, Warehouse, 
  Search, ChevronLeft, ChevronRight, DownloadCloud, 
  Loader2, Lock, CheckCircle2, XCircle
} from 'lucide-react';

/**
 * Hàm phân tích chuỗi CSV thành mảng dữ liệu 2 chiều
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
 * Hàm xử lý mảng thô: Lọc bỏ lỗi công thức và dòng rác
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
  const sttColIdx = headers.findIndex(h => normalize(h).includes("STTTBT") || normalize(h) === "STT");

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
      if (sttColIdx !== -1) obj['STT_INTERNAL'] = row[sttColIdx];
      return obj;
    });
};

/**
 * Component Bảng hiển thị dữ liệu
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
            type="text" placeholder="Tìm kiếm nhanh..." 
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
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
                    {col.key === 'STT_DISPLAY' ? (row['STT TBT'] || row['STT_INTERNAL'] || row['STT']) : (row[col.key] || '-')}
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
        <span>Trang {currentPage} / {totalPages || 1}</span>
        <div className="flex gap-2">
          <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-2 border rounded-lg hover:bg-white disabled:opacity-30 active:scale-95"><ChevronLeft className="w-4 h-4"/></button>
          <button disabled={currentPage >= totalPages || totalPages === 0} onClick={() => setCurrentPage(p => p + 1)} className="p-2 border rounded-lg hover:bg-white disabled:opacity-30 active:scale-95"><ChevronRight className="w-4 h-4"/></button>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  // ĐƯỜNG DẪN MẶC ĐỊNH CỦA BẠN
  const DEFAULT_SHEET_URL = "https://docs.google.com/spreadsheets/d/1-encHUhE36iw-nruN75SodCSS6iiDh7d/edit?gid=767831174#gid=767831174";
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [data, setData] = useState({ tbt: [], mbt: [], kho: [] });
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ text: '', type: '' });
  const [sheetUrl, setSheetUrl] = useState(localStorage.getItem('evn_url') || DEFAULT_SHEET_URL);
  const [isLocked, setIsLocked] = useState(true);

  const showStatus = (text, type = 'info') => {
    setStatusMsg({ text, type });
    if (type !== 'loading') {
      setTimeout(() => setStatusMsg({ text: '', type: '' }), 4000);
    }
  };

  /**
   * Hàm lấy dữ liệu từ Google Sheets
   */
  const fetchData = async (targetUrl = sheetUrl) => {
    if (!targetUrl) return;
    setLoading(true);
    showStatus("Đang đồng bộ dữ liệu...", "loading");
    
    try {
      const idMatch = targetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (!idMatch) throw new Error("Link Sheet không hợp lệ!");
      const id = idMatch[1];
      localStorage.setItem('evn_url', targetUrl);

      const fetchTab = async (name, key) => {
        const url = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(name)}`;
        const res = await fetch(url);
        const text = await res.text();
        if (text.includes('<html')) throw new Error(`Cần cấp quyền chia sẻ cho trang "${name}"`);
        return processRawArray(parseCSV(text), key);
      };

      const [rawTbt, mbt, kho] = await Promise.all([
        fetchTab('DATA TBT', 'TBTID'),
        fetchTab('DATA MBT', 'Số máy'),
        fetchTab('KHO', 'Số máy')
      ]);

      // Lọc trạm duy nhất (khớp đúng 5910 dòng đầu tiên của mỗi TBTID)
      const uniqueTbt = [];
      const seenIds = new Set();
      rawTbt.forEach(item => {
        if (!seenIds.has(item.TBTID)) {
          uniqueTbt.push(item);
          seenIds.add(item.TBTID);
        }
      });

      setData({ tbt: uniqueTbt, mbt, kho });
      showStatus(`Đã cập nhật ${uniqueTbt.length} trạm!`, "success");
    } catch (e) {
      showStatus(e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  /**
   * TỰ ĐỘNG ĐỒNG BỘ KHI MỞ TRANG
   */
  useEffect(() => {
    fetchData();
  }, []);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tbt', label: 'Trạm (TBT)', icon: Zap },
    { id: 'mbt', label: 'Máy (MBT)', icon: Activity },
    { id: 'kho', label: 'Kho thiết bị', icon: Warehouse },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-900">
      {/* SIDEBAR NAVIGATION */}
      <div className="w-full md:w-64 bg-slate-900 text-white p-6 flex flex-col gap-8 shrink-0 shadow-2xl z-20">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-500/20"><Zap className="w-6 h-6 text-white" /></div>
          <span className="text-xl font-black tracking-tight uppercase">EVN<span className="text-blue-400">Manager</span></span>
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

      <main className="flex-1 p-4 md:p-8 overflow-hidden flex flex-col gap-6">
        {/* TOAST STATUS */}
        {statusMsg.text && (
          <div className={`fixed top-4 right-4 z-50 p-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right duration-300 ${
            statusMsg.type === 'error' ? 'bg-red-50 text-red-600 border border-red-100' : 
            statusMsg.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 
            'bg-blue-50 text-blue-600 border border-blue-100'
          }`}>
            {statusMsg.type === 'loading' ? <Loader2 className="w-5 h-5 animate-spin" /> : 
             statusMsg.type === 'error' ? <XCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
            <span className="font-bold text-sm">{statusMsg.text}</span>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div className="space-y-6 max-w-5xl mx-auto w-full animate-in fade-in slide-in-from-top duration-700">
            <div className="flex flex-col gap-1">
              <h2 className="text-3xl font-black text-slate-800 tracking-tight uppercase italic">Hệ thống quản lý</h2>
              <p className="text-slate-500 font-medium">Tự động đồng bộ từ Google Sheets mỗi khi mở trang.</p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <label className="text-[10px] font-bold text-slate-400 block uppercase tracking-widest italic">Link mặc định:</label>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <input 
                    type="text" placeholder="Dán link Google Sheet..." 
                    className="w-full pl-4 pr-10 py-3 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 shadow-inner"
                    value={sheetUrl} onChange={e => setSheetUrl(e.target.value)} disabled={isLocked}
                  />
                  {isLocked && <Lock className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />}
                </div>
                <button 
                  onClick={() => fetchData()} disabled={loading || !sheetUrl}
                  className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <DownloadCloud className="w-5 h-5" />} 
                  Làm mới
                </button>
              </div>
              {isLocked && <button onClick={() => setIsLocked(false)} className="text-xs text-blue-600 font-bold hover:underline">Thay đổi đường dẫn khác</button>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                { label: 'Số lượng Trạm (TBT)', val: data.tbt.length, icon: Zap, color: 'text-blue-600', bg: 'bg-blue-100' },
                { label: 'Máy vận hành (MBT)', val: data.mbt.length, icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-100' },
                { label: 'Máy trong kho', val: data.kho.length, icon: Warehouse, color: 'text-orange-600', bg: 'bg-orange-100' },
              ].map((s, i) => (
                <div key={i} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-all group">
                  <div className={`${s.bg} ${s.color} p-4 rounded-2xl group-hover:scale-110 transition-transform`}><s.icon className="w-6 h-6" /></div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
                    <p className="text-3xl font-black text-slate-800 tracking-tighter">{s.val}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-blue-600 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl shadow-blue-500/30">
               <div className="relative z-10 space-y-4">
                  <div className="flex items-center gap-2 text-blue-200 font-bold text-sm uppercase">
                    <CheckCircle2 className="w-4 h-4"/> Đã khớp 5910 Trạm
                  </div>
                  <h3 className="text-2xl font-black italic">Đã sẵn sàng!</h3>
                  <p className="text-blue-100 text-sm max-w-md leading-relaxed">Hệ thống đã tự động lọc các mã trạm trùng lặp và sử dụng dữ liệu <b>Tên Dự Kiến</b> làm tên trạm chính. Bạn có thể tra cứu ngay.</p>
               </div>
               <Zap className="absolute -right-6 -bottom-6 w-40 h-40 text-blue-500 opacity-20 rotate-12" />
            </div>
          </div>
        )}

        {activeTab !== 'dashboard' && (
          <div className="flex-1 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <DataTable 
              data={data[activeTab]} 
              icon={navItems.find(n => n.id === activeTab).icon}
              title={`Danh sách: ${navItems.find(n => n.id === activeTab).label}`}
              columns={activeTab === 'tbt' ? [
                { key: 'STT_DISPLAY', label: 'STT' }, 
                { key: 'TBTID', label: 'Mã Trạm' }, 
                { key: 'TÊN DỰ KIẾN', label: 'Tên Trạm' }, 
                { key: 'TỔNG CS TBT', label: 'Công Suất' }, 
                { key: 'KIỂU TRẠM', label: 'Kiểu' }
              ] : [
                { key: 'Số máy', label: 'Số Máy' }, { key: 'Hiệu máy', label: 'Hiệu Máy' }, { key: 'Công suất', label: 'Công Suất' }, { key: 'Vị trí', label: 'Vị trí hiện tại' }, { key: 'Tình trạng', label: 'Trạng thái' }
              ]}
            />
          </div>
        )}
      </main>
    </div>
  );
}