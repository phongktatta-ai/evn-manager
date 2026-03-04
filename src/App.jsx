import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, Zap, Activity, Warehouse, 
  Search, ChevronLeft, ChevronRight, Menu, X, 
  DownloadCloud, AlertCircle, Loader2, Lock
} from 'lucide-react';

/**
 * Utility function to parse CSV text into a 2D array
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
 * Process raw 2D array into an array of objects based on a header keyword
 */
const processRawArray = (rawRows, keyword) => {
  let headerIndex = -1;
  for (let i = 0; i < Math.min(rawRows.length, 30); i++) {
    const rowStr = (rawRows[i] || []).join('').toUpperCase();
    if (rowStr.includes(keyword.toUpperCase())) {
      headerIndex = i;
      break;
    }
  }
  if (headerIndex === -1) return [];
  const headers = rawRows[headerIndex].map(h => h ? String(h).trim() : "");
  return rawRows.slice(headerIndex + 1)
    .filter(row => row.length > 0 && row.some(c => String(c).trim()))
    .map(row => {
      let obj = {};
      headers.forEach((h, idx) => { if (h) obj[h] = row[idx] ? String(row[idx]).trim() : ""; });
      return obj;
    });
};

/**
 * Reusable Data Table component
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

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
      <div className="p-4 bg-slate-50 border-b flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2 text-blue-600">
          <Icon className="w-5 h-5" />
          <h2 className="font-bold text-slate-800">{title} ({filtered.length})</h2>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" placeholder="Tìm nhanh..." 
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      <div className="overflow-auto flex-1">
        <table className="w-full text-xs sm:text-sm text-left border-collapse">
          <thead className="bg-slate-100 sticky top-0 z-10">
            <tr>
              {columns.map(col => <th key={col.key} className="px-4 py-3 font-bold text-slate-600 border-b whitespace-nowrap">{col.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {currentData.length > 0 ? currentData.map((row, i) => (
              <tr key={i} className="border-b hover:bg-blue-50/50 transition-colors">
                {columns.map(col => <td key={col.key} className="px-4 py-3 text-slate-600 whitespace-nowrap max-w-[200px] truncate" title={row[col.key]}>{row[col.key] || '-'}</td>)}
              </tr>
            )) : (
              <tr><td colSpan={columns.length} className="p-10 text-center text-slate-400 italic font-medium uppercase">Không có dữ liệu hiển thị</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="p-4 border-t flex justify-between items-center bg-slate-50 text-xs font-medium text-slate-500">
        <span>Trang {currentPage} / {totalPages || 1}</span>
        <div className="flex gap-2">
          <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-2 border rounded-lg hover:bg-white disabled:opacity-30"><ChevronLeft className="w-4 h-4"/></button>
          <button disabled={currentPage >= totalPages || totalPages === 0} onClick={() => setCurrentPage(p => p + 1)} className="p-2 border rounded-lg hover:bg-white disabled:opacity-30"><ChevronRight className="w-4 h-4"/></button>
        </div>
      </div>
    </div>
  );
};

/**
 * Main App Component
 */
export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [data, setData] = useState({ tbt: [], mbt: [], kho: [] });
  const [loading, setLoading] = useState(false);
  const [sheetUrl, setSheetUrl] = useState(localStorage.getItem('evn_url') || '');
  const [isLocked, setIsLocked] = useState(!!localStorage.getItem('evn_url'));

  // Sync data from Google Sheets
  const fetchData = async () => {
    if (!sheetUrl) return alert("Vui lòng dán link Google Sheet!");
    setLoading(true);
    try {
      const idMatch = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (!idMatch) throw new Error("Link Google Sheet không hợp lệ!");
      const id = idMatch[1];
      localStorage.setItem('evn_url', sheetUrl);
      setIsLocked(true);

      const fetchTab = async (name, key) => {
        const url = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(name)}`;
        const res = await fetch(url);
        const text = await res.text();
        if (text.includes('<html')) throw new Error(`Sheet "${name}" chưa được cấp quyền chia sẻ 'Bất kỳ ai có liên kết'.`);
        return processRawArray(parseCSV(text), key);
      };

      const [tbt, mbt, kho] = await Promise.all([
        fetchTab('DATA TBT', 'TBTID'),
        fetchTab('DATA MBT', 'Số máy'),
        fetchTab('KHO', 'Số máy')
      ]);

      setData({ tbt, mbt, kho });
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Cấu Hình', icon: LayoutDashboard },
    { id: 'tbt', label: 'Trạm (TBT)', icon: Zap },
    { id: 'mbt', label: 'Máy (MBT)', icon: Activity },
    { id: 'kho', label: 'Kho Thiết Bị', icon: Warehouse },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
      {/* SIDEBAR */}
      <div className="w-full md:w-64 bg-slate-900 text-white p-6 flex flex-col gap-8 shrink-0 shadow-2xl z-20">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-500/20"><Zap className="w-6 h-6 text-white" /></div>
          <span className="text-xl font-black tracking-tight">EVN<span className="text-blue-400">Manager</span></span>
        </div>
        <nav className="flex flex-col gap-2">
          {navItems.map(item => (
            <button 
              key={item.id} onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-semibold ${activeTab === item.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            >
              <item.icon className="w-5 h-5" /> {item.label}
            </button>
          ))}
        </nav>
      </div>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-4 md:p-8 overflow-hidden flex flex-col gap-6">
        {activeTab === 'dashboard' && (
          <div className="space-y-6 max-w-5xl mx-auto w-full animate-in slide-in-from-top duration-700">
            <div className="flex flex-col gap-1">
              <h2 className="text-3xl font-black text-slate-800">Cài đặt & Đồng bộ</h2>
              <p className="text-slate-500">Dữ liệu được lưu trong trình duyệt của thiết bị này.</p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <label className="text-sm font-bold text-slate-600 block">Link Google Sheet:</label>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <input 
                    type="text" placeholder="Dán link vào đây..." 
                    className="w-full pl-4 pr-10 py-3 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 transition-all"
                    value={sheetUrl} onChange={e => setSheetUrl(e.target.value)} disabled={isLocked}
                  />
                  {isLocked && <Lock className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />}
                </div>
                <button 
                  onClick={fetchData} disabled={loading || !sheetUrl}
                  className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50 transition-all shadow-lg shadow-blue-500/20"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <DownloadCloud className="w-5 h-5" />} 
                  Đồng bộ ngay
                </button>
              </div>
              {isLocked && <button onClick={() => setIsLocked(false)} className="text-xs text-blue-600 font-bold hover:text-blue-800 transition-colors"> Thay đổi đường link</button>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                { label: 'Trạm (TBT)', val: data.tbt.length, icon: Zap, color: 'text-blue-600', bg: 'bg-blue-100' },
                { label: 'Máy vận hành', val: data.mbt.length, icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-100' },
                { label: 'Máy trong kho', val: data.kho.length, icon: Warehouse, color: 'text-orange-600', bg: 'bg-orange-100' },
              ].map((s, i) => (
                <div key={i} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
                  <div className={`${s.bg} ${s.color} p-4 rounded-2xl`}><s.icon className="w-6 h-6" /></div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
                    <p className="text-3xl font-black text-slate-800 tracking-tight">{s.val}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-blue-600 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl shadow-blue-500/30">
               <div className="relative z-10 space-y-4">
                  <h3 className="text-2xl font-black">Triển khai thành công!</h3>
                  <p className="text-blue-100 text-sm max-w-md leading-relaxed">App của bạn đã sẵn sàng chạy trên điện thoại qua Vercel. Hãy thực hiện Bước 4 trong hướng dẫn để lấy link chính thức.</p>
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
              title={`Danh sách ${navItems.find(n => n.id === activeTab).label}`}
              columns={activeTab === 'tbt' ? [
                { key: 'TBTID', label: 'Mã Trạm' }, { key: 'TÊN TBT', label: 'Tên Trạm' }, { key: 'TỔNG CS TBT', label: 'Công Suất' }, { key: 'KIỂU TRẠM', label: 'Kiểu' }, { key: 'ĐỊA CHỈ TBT', label: 'Địa Chỉ' }
              ] : [
                { key: 'Số máy', label: 'Số Máy' }, { key: 'Hiệu máy', label: 'Hiệu Máy' }, { key: 'Công suất', label: 'Công Suất' }, { key: 'Vị trí', label: 'Vị Trí Hiện Tại' }, { key: 'Chất lượng', label: 'Tình Trạng' }
              ]}
            />
          </div>
        )}
      </main>
    </div>
  );
}