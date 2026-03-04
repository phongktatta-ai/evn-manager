import React, { useState, useMemo, useEffect, useCallback, memo } from 'react';
import { 
  LayoutDashboard, Zap, Activity, Warehouse, 
  Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  DownloadCloud, Loader2, CheckCircle2, XCircle, RefreshCw, Clock,
  ArrowLeftRight, FileText, Plus, Trash2, Printer, Info, CheckSquare, Square, MapPin, X
} from 'lucide-react';

// Cố định URL Google Sheet
const GOOGLE_SHEET_URL = "https://docs.google.com/spreadsheets/d/1-encHUhE36iw-nruN75SodCSS6iiDh7d/edit?gid=767831174#gid=767831174";

// --- TIỆN ÍCH ---
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

const processRawArray = (rawRows, keyword) => {
  let headerIndex = -1;
  const normalize = (str) => String(str || "").toUpperCase().trim().replace(/[^A-Z0-9]/g, '');
  for (let i = 0; i < Math.min(rawRows.length, 100); i++) {
    const rowStr = (rawRows[i] || []).map(normalize).join('|');
    if (rowStr.includes(normalize(keyword))) { headerIndex = i; break; }
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
      return row.filter(c => String(c).trim() !== "" && !String(c).includes("#")).length >= 4;
    })
    .map(row => {
      let obj = {};
      headers.forEach((h, idx) => { if (h) obj[h] = row[idx] ? String(row[idx]).trim() : ""; });
      return obj;
    });
};

// --- COMPONENT CON TỐI ƯU ---
const MachineRow = memo(({ machine, onSelectDest, currentDest }) => {
  const mId = machine['Số máy'] || machine['SERIAL NUMBER'];
  return (
    <div className={`p-3 rounded-2xl border transition-all flex flex-col sm:flex-row gap-3 items-center ${currentDest ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-slate-100 hover:border-slate-300'}`}>
      <div className="flex-1 overflow-hidden w-full">
        <p className="text-sm font-black truncate">Số máy: {mId}</p>
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
          {machine['Công suất'] || machine['CS MBT']} kVA | {machine['Hiệu máy'] || 'N/A'}
        </p>
      </div>
      <button 
        onClick={() => onSelectDest(mId)}
        className={`w-full sm:w-56 flex items-center justify-between gap-2 p-2.5 rounded-xl border text-[11px] font-bold transition-all ${currentDest ? 'bg-white border-blue-400 text-blue-700 ring-2 ring-blue-50' : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-blue-300'}`}
      >
        <span className="truncate flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          {currentDest ? currentDest.name : 'Chưa chọn nơi đến...'}
        </span>
        <ChevronRight className="w-3 h-3 shrink-0" />
      </button>
    </div>
  );
});

// --- MẪU IN ---
const DispatchPrintTemplate = ({ dispatchList, metadata }) => {
  const today = new Date();
  if (!dispatchList.length) return null;
  return (
    <div className="print-only-container hidden print:block bg-white text-black p-0 m-0 w-full">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: A4 landscape; margin: 0; }
          body { margin: 0; padding: 0; background: white; -webkit-print-color-adjust: exact; }
          body * { visibility: hidden; }
          .print-only-container, .print-only-container * { 
            visibility: visible; font-family: "Times New Roman", Times, serif !important; color: black !important;
          }
          .print-only-container { position: absolute; left: 0; top: 0; width: 100%; display: block !important; padding: 12mm 10mm 10mm 15mm; box-sizing: border-box; }
          table { border-collapse: collapse; width: 100%; margin-top: 10px; border: 1px solid black !important; }
          th, td { border: 1px solid black !important; padding: 5px 3px; vertical-align: middle; text-align: center; }
        }
      `}} />
      <div className="flex justify-between items-start mb-2 text-[11pt]">
        <div className="text-center w-[42%]">
          <h4 className="font-bold uppercase mb-0">CÔNG TY ĐIỆN LỰC THUẬN AN</h4>
          <h5 className="font-bold border-b border-black inline-block px-1 uppercase mb-1">Phòng Kỹ thuật và An toàn</h5>
          <p className="m-0 mt-2">Số: ......... /KTAT</p>
          <p className="m-0 text-[10pt] italic mt-1">V/v điều động MBT để {metadata.reason}</p>
        </div>
        <div className="text-center w-[52%]">
          <h4 className="font-bold uppercase mb-0">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h4>
          <h5 className="font-bold border-b border-black inline-block px-2 uppercase mb-1">Độc lập - Tự Do - Hạnh Phúc</h5>
          <p className="mt-2 italic">Thuận An, ngày {today.getDate()} tháng {today.getMonth() + 1} năm {today.getFullYear()}</p>
        </div>
      </div>
      <div className="text-center mb-6 mt-6">
        <h2 className="text-[16pt] font-bold uppercase mb-1">PHIẾU CHỈ ĐỊNH MÁY BIẾN THẾ</h2>
        <p className="font-bold italic text-[12pt]">Kính gửi: Ông Giám đốc</p>
      </div>
      <div className="mb-4 text-[11.5pt] text-justify" style={{ lineHeight: 1.4 }}>
        <p className="mb-1">- Căn cứ quyết định số 4338/QĐ-EVNHCMC ngày 10/10/2023 về việc ban hành Quy định quản lý và hạch toán vật tư thiết bị áp dụng trong Tổng công ty Điện lực TP.HCM .</p>
        <p className="mb-1">- Căn cứ {metadata.grounds}</p>
        <p>Để quản lý vật tư thiết bị theo đúng qui định, Phòng KT&AT lập phiếu điều động MBT với nội dung sau :</p>
      </div>
      <table className="w-full text-[10pt] mb-6">
        <thead className="font-bold bg-gray-50">
          <tr>
            <th style={{width:'30px'}}>STT</th><th>MSTS</th><th>Hiệu máy</th><th>Số máy</th><th style={{width:'90px'}}>CS (kVA)</th><th style={{width:'60px'}}>Năm SX</th><th>Tên nơi đi</th><th>Mã nơi đi</th><th>Tên nơi đến</th><th>Mã nơi đến</th>
          </tr>
        </thead>
        <tbody>
          {dispatchList.map((item, index) => (
            <tr key={index}>
              <td>{index+1}</td><td>{item.transformer.MSTS || '-'}</td><td>{item.transformer['Hiệu máy'] || '-'}</td><td>{item.transformer['Số máy'] || '-'}</td><td className="font-bold">{item.transformer['Công suất'] || '-'}</td><td>{item.transformer['Năm SX'] || '-'}</td><td className="text-left px-1">{item.source.name}</td><td>{item.source.id}</td><td className="text-left px-1 font-bold">{item.destination.name}</td><td>{item.destination.id}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mb-6 text-[11pt]" style={{ lineHeight: 1.4 }}>
        <h5 className="font-bold underline uppercase mb-2">Phân công thực hiện:</h5>
        <div className="space-y-1 text-justify">
          <p><span className="font-bold">Đội VHLĐ:</span> Thông báo thời gian mất điện khách hàng theo quy định; Bàn giao hiện trường, cấp phiếu công tác để Đội QLLĐ thi công thay MBT.</p>
          <p><span className="font-bold">Đội QLLĐ:</span> Thay và bàn giao MBT thu hồi với đánh giá đẩy đủ tình trạng ngoại quan (chì niêm: có/không; cosse cao, hạ MBT: đầy đủ/không đầy đủ) theo đúng qui định; Cập nhật hình ảnh trạm biến thế, máy biến thế lên chương trình PMIS theo văn bản số 145/KTAT; Lập phương án hoán chuyển TBT 400kVA non tải để có nguồn MBT 400kVA dự phòng tại kho, trước ngày 20/01/2026.</p>
          <p><span className="font-bold">Phòng KT&AT:</span> Cập nhật biến động công suất trạm biến thế, máy biến thế vào các chương trình QLKT liên quan; Quản lý số lượng, chủng loại MBA theo văn bản số 2567/EVNHCMC-KH ngày 11/7/2024 của Tổng công ty ĐL TP.HCM.</p>
          <p><span className="font-bold">Phòng TCKT:</span> Cập nhật biến động tình hình vận hành của mã tài sản đúng qui định.</p>
          <p><span className="font-bold">Đội QLHTĐĐ:</span> Phối hợp Đội QLLĐ thay TI phù hợp với công suất máy và cài đặt lại thông số điện kế.</p>
          <p><span className="font-bold">Phòng Kinh doanh:</span> Cập nhật công suất trạm vào chương trình quản lý sau khi Đội QLLĐ thi công xong.</p>
          <p><span className="font-bold">Phòng KHVT:</span> Phối hợp giao và nhận MBT thu hồi về Kho ĐL (kiểm tra ngoại quan, chì niêm, đầu cosse cao hạ MBT)./.</p>
        </div>
      </div>
      <div className="flex justify-between mt-4 text-[11pt]">
        <div className="w-[28%] text-left">
          <p className="font-bold underline mb-1">Nơi nhận:</p>
          <ul className="list-none italic text-[9.5pt]">- Ban giám đốc (để báo cáo);<br/>- Đội QLVH, QLLĐ (để thực hiện);<br/>- Phòng KHVT, TCKT (để thực hiện);<br/>- Lưu: KTAT, LHT.</ul>
        </div>
        <div className="flex-1 flex justify-around text-center pt-2">
            <div><p className="font-bold uppercase">ĐỘI QLLĐ</p><p className="font-bold uppercase mb-20">ĐỘI TRƯỞNG</p><p className="font-bold">Trương Minh Thi</p></div>
            <div><p className="font-bold uppercase">PHÒNG KT&AT</p><p className="font-bold uppercase mb-20">TRƯỞNG PHÒNG</p><p className="font-bold">Lại Văn Hiền</p></div>
        </div>
      </div>
      <div className="mt-12 text-[12pt] text-center w-full">
          <p className="font-bold italic">Ý kiến phê duyệt của Giám đốc Đặng Hoài Bắc:</p>
          <div className="h-28"></div>
      </div>
    </div>
  );
};

// --- COMPONENT CHÍNH ---
export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [data, setData] = useState({ tbt: [], mbt: [], kho: [] });
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ text: '', type: '' });
  const [lastSyncTime, setLastSyncTime] = useState(localStorage.getItem('evn_last_sync') || 'Chưa có dữ liệu');

  // Điều động
  const [metadata, setMetadata] = useState({ reason: 'hoán chuyển MBT...', grounds: 'văn bản số 150/QLLĐ ngày 12/01/2026...' });
  const [dispatchCart, setDispatchCart] = useState([]);
  const [sourceLoc, setSourceLoc] = useState({ type: '', id: '', name: '' });
  const [machineDestinations, setMachineDestinations] = useState({});
  
  // Modal chọn địa điểm (Để Fix Lag)
  const [pickingForMachineId, setPickingForMachineId] = useState(null);
  const [stationSearch, setStationSearch] = useState('');

  const showStatus = (text, type = 'info') => {
    setStatusMsg({ text, type });
    if (type !== 'loading') setTimeout(() => setStatusMsg({ text: '', type: '' }), 3000);
  };

  const fetchData = async () => {
    setLoading(true);
    showStatus("Đang đồng bộ...", "loading");
    try {
      const id = GOOGLE_SHEET_URL.match(/\/d\/([a-zA-Z0-9-_]+)/)[1];
      const fetchTab = async (name, key) => {
        const res = await fetch(`https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(name)}`);
        const text = await res.text();
        return processRawArray(parseCSV(text), key);
      };
      const [rawTbt, rawMbt, rawKho] = await Promise.all([
        fetchTab('DATA TBT', 'TBTID'), fetchTab('DATA MBT', 'Số máy'), fetchTab('KHO', 'Số máy')
      ]);
      const uniqueTbt = [];
      const seenIds = new Set();
      rawTbt.forEach(item => { if (!seenIds.has(item.TBTID)) { uniqueTbt.push(item); seenIds.add(item.TBTID); } });
      setData({ tbt: uniqueTbt, mbt: rawMbt, kho: rawKho });
      const now = new Date().toLocaleString('vi-VN');
      setLastSyncTime(now);
      localStorage.setItem('evn_last_sync', now);
      showStatus(`Thành công!`, "success");
    } catch (e) { showStatus("Lỗi Sheet!", "error"); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  // Lọc máy biến áp tại nguồn
  const availableTransformers = useMemo(() => {
    if (!sourceLoc.id) return [];
    if (sourceLoc.type === 'KHO') return data.kho;
    return data.mbt.filter(m => m["Vị trí"] === sourceLoc.id || m["trạm"] === sourceLoc.id || m["TRAM"] === sourceLoc.id);
  }, [sourceLoc.id, data.mbt, data.kho]);

  // Lọc địa điểm cho Modal (Chỉ hiện top 20 để mượt)
  const filteredStations = useMemo(() => {
    const s = stationSearch.toUpperCase();
    const results = [];
    results.push({ id: 'KHO', name: 'KHO THIẾT BỊ (Kho Thuận An)' });
    
    const matched = data.tbt.filter(t => t.TBTID.includes(s) || t['TÊN DỰ KIẾN'].toUpperCase().includes(s));
    return [...results, ...matched].slice(0, 20);
  }, [stationSearch, data.tbt]);

  const setDestForMachine = (dest) => {
    setMachineDestinations(prev => ({ ...prev, [pickingForMachineId]: dest }));
    setPickingForMachineId(null);
    setStationSearch('');
  };

  const addToDispatch = () => {
    const selectedIds = Object.keys(machineDestinations);
    const newItems = availableTransformers
      .filter(m => selectedIds.includes(m['Số máy'] || m['SERIAL NUMBER']))
      .map(t => ({ source: { ...sourceLoc }, destination: machineDestinations[t['Số máy'] || t['SERIAL NUMBER']], transformer: t }));
    setDispatchCart(prev => [...prev, ...newItems]);
    setMachineDestinations({});
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-900 overflow-hidden">
      
      {/* IN ẤN */}
      <DispatchPrintTemplate dispatchList={dispatchCart} metadata={metadata} />

      {/* MODAL CHỌN ĐỊA ĐIỂM (GIẢI PHÁP FIX LAG) */}
      {pickingForMachineId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-5 border-b flex justify-between items-center bg-slate-50">
               <h3 className="font-black text-slate-800 uppercase tracking-tight">Chọn nơi đến</h3>
               <button onClick={() => setPickingForMachineId(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-4 bg-white border-b sticky top-0">
               <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4"/>
                  <input 
                    autoFocus type="text" placeholder="Tìm tên trạm hoặc mã trạm..." 
                    className="w-full pl-10 pr-4 py-3 bg-slate-100 border-none rounded-2xl outline-none ring-2 ring-transparent focus:ring-blue-500 transition-all font-bold"
                    value={stationSearch} onChange={e => setStationSearch(e.target.value)}
                  />
               </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
               {filteredStations.map(s => (
                 <button 
                  key={s.id} onClick={() => setDestForMachine({ id: s.id, name: s['TÊN DỰ KIẾN'] || s.name })}
                  className="w-full text-left p-4 hover:bg-blue-50 rounded-2xl border border-transparent hover:border-blue-100 flex flex-col transition-all group"
                 >
                   <span className="font-black text-slate-800 group-hover:text-blue-700">{s.id}</span>
                   <span className="text-xs text-slate-500 font-bold uppercase">{s['TÊN DỰ KIẾN'] || s.name}</span>
                 </button>
               ))}
               {filteredStations.length === 0 && <p className="text-center py-10 text-slate-400 italic">Không tìm thấy địa điểm này</p>}
            </div>
          </div>
        </div>
      )}

      {/* SIDEBAR */}
      <div className="no-print w-full md:w-64 bg-slate-900 text-white p-6 flex flex-col gap-8 shrink-0 shadow-2xl z-20">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-500/20"><Zap className="w-6 h-6 text-white" /></div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight uppercase leading-tight">Phòng KTAT</span>
            <span className="text-xs font-medium text-blue-400 uppercase tracking-wider italic">PC Thuận An</span>
          </div>
        </div>
        <nav className="flex flex-col gap-2">
          {[
            { id: 'dashboard', label: 'Hệ Thống', icon: LayoutDashboard },
            { id: 'tbt', label: 'Trạm (TBT)', icon: Zap },
            { id: 'mbt', label: 'Máy (MBT)', icon: Activity },
            { id: 'kho', label: 'Kho thiết bị', icon: Warehouse },
            { id: 'dispatch', label: 'Lập Phiếu', icon: ArrowLeftRight },
          ].map(item => (
            <button 
              key={item.id} onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold ${activeTab === item.id ? 'bg-blue-600 text-white shadow-lg translate-x-1' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            >
              <item.icon className="w-5 h-5" /> {item.label}
            </button>
          ))}
        </nav>
      </div>

      <main className="no-print flex-1 p-4 md:p-8 overflow-hidden flex flex-col gap-6">
        {statusMsg.text && (
          <div className={`fixed top-4 right-4 z-50 p-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right duration-300 ${
            statusMsg.type === 'error' ? 'bg-red-50 text-red-600 border border-red-100' : 
            statusMsg.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-blue-50 text-blue-600 border border-blue-100'
          }`}>
            {statusMsg.type === 'loading' ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
            <span className="font-bold text-sm">{statusMsg.text}</span>
          </div>
        )}

        <div className="h-full flex flex-col gap-6 overflow-hidden px-1">
          {activeTab === 'dashboard' && (
            <div className="space-y-6 max-w-5xl mx-auto w-full animate-in fade-in slide-in-from-top duration-500">
              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-black text-slate-800 tracking-tight uppercase italic">Thống kê</h2>
                <button onClick={fetchData} className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 text-slate-600">
                  <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {[
                  { label: 'Trạm vận hành', val: data.tbt.length, icon: Zap, color: 'text-blue-600', bg: 'bg-blue-100' },
                  { label: 'Máy vận hành', val: data.mbt.length, icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-100' },
                  { label: 'Máy trong kho', val: data.kho.length, icon: Warehouse, color: 'text-orange-600', bg: 'bg-orange-100' },
                ].map((s, i) => (
                  <div key={i} className="bg-white p-6 rounded-3xl border border-slate-200 flex items-center gap-4 hover:shadow-md transition-all">
                    <div className={`${s.bg} ${s.color} p-4 rounded-2xl`}><s.icon className="w-6 h-6" /></div>
                    <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{s.label}</p><p className="text-3xl font-black text-slate-800">{s.val}</p></div>
                  </div>
                ))}
              </div>
              <div className="bg-blue-600 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl">
                 <div className="relative z-10"><p className="text-blue-200 font-bold text-xs uppercase tracking-widest flex items-center gap-2 mb-1"><Clock className="w-4 h-4"/> Đồng bộ gần nhất</p><h3 className="text-2xl font-black italic">{lastSyncTime}</h3></div>
                 <Zap className="absolute -right-6 -bottom-6 w-40 h-40 text-blue-500 opacity-20 rotate-12" />
              </div>
            </div>
          )}

          {activeTab === 'dispatch' && (
            <div className="space-y-6 max-w-[95rem] mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col h-full overflow-hidden">
              <h2 className="text-3xl font-black text-slate-800 uppercase italic">Lập Phiếu Điều Động</h2>
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full overflow-hidden">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4 lg:col-span-1 h-fit">
                  <h3 className="font-bold flex items-center gap-2 uppercase text-sm tracking-widest text-slate-800"><Info className="w-4 h-4 text-blue-500"/> Nội dung</h3>
                  <div className="space-y-3">
                    <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lý do:</label><input type="text" value={metadata.reason} onChange={e => setMetadata({...metadata, reason: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"/></div>
                    <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Căn cứ:</label><textarea rows="4" value={metadata.grounds} onChange={e => setMetadata({...metadata, grounds: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"/></div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-200 lg:col-span-2 h-full flex flex-col overflow-hidden">
                  <h3 className="font-bold text-blue-600 flex items-center gap-2 uppercase text-sm tracking-widest mb-4"><Plus className="w-4 h-4"/> Chọn MBT Điều động</h3>
                  <div className="space-y-4 flex flex-col h-full overflow-hidden">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Bước 1: Chọn nơi đi (Nguồn)</label>
                        <select 
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-black"
                            onChange={e => {
                                const val = e.target.value;
                                if (val === 'KHO') setSourceLoc({ type: 'KHO', id: 'KHO', name: 'Kho Thuận An' });
                                else if (val) { const t = data.tbt.find(x => x.TBTID === val); setSourceLoc({ type: 'TRAM', id: val, name: t?.['TÊN DỰ KIẾN'] || val }); }
                                else setSourceLoc({ type: '', id: '', name: '' });
                                setMachineDestinations({});
                            }}
                        >
                            <option value="">-- Click để chọn nơi đi --</option>
                            <option value="KHO">KHO THIẾT BỊ (Kho hiện tại)</option>
                            {data.tbt.map(t => <option key={t.TBTID} value={t.TBTID}>{t.TBTID} - {t['TÊN DỰ KIẾN']}</option>)}
                        </select>
                    </div>

                    <div className="flex-1 flex flex-col overflow-hidden border border-slate-100 rounded-2xl bg-slate-50/50 p-2">
                      <span className="text-[10px] font-bold text-slate-400 px-2 uppercase mb-2">Bước 2: Chỉ định nơi đến cho từng máy</span>
                      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                        {availableTransformers.length === 0 ? <p className="text-center py-20 text-xs text-slate-400 italic">Chọn nơi đi để xem danh sách MBT</p> : 
                          availableTransformers.map(m => (
                            <MachineRow 
                              key={m['Số máy'] || m['SERIAL NUMBER']} machine={m} 
                              currentDest={machineDestinations[m['Số máy'] || m['SERIAL NUMBER']]} 
                              onSelectDest={(id) => setPickingForMachineId(id)}
                            />
                          ))
                        }
                      </div>
                    </div>
                  </div>
                  <button onClick={addToDispatch} disabled={Object.keys(machineDestinations).length === 0} className="mt-4 w-full bg-blue-600 text-white p-4 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 shadow-xl active:scale-95 transition-all text-xs disabled:opacity-30">Xác nhận đưa vào phiếu</button>
                </div>

                <div className="bg-slate-800 text-white p-6 rounded-3xl shadow-2xl flex flex-col h-full lg:col-span-1 min-h-[450px]">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold flex items-center gap-2 text-xs uppercase tracking-widest"><FileText className="w-4 h-4 text-emerald-400"/> Phiếu tạm</h3>
                    <button onClick={() => window.print()} disabled={dispatchCart.length === 0} className="bg-emerald-500 text-white px-4 py-2 rounded-xl text-[10px] font-black flex items-center gap-2 hover:bg-emerald-600 transition-all disabled:opacity-30 shadow-lg uppercase"><Printer className="w-4 h-4"/> In Phiếu</button>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                    {dispatchCart.length === 0 ? <div className="h-full flex flex-col items-center justify-center text-slate-500 py-10 opacity-30"><ArrowLeftRight className="w-12 h-12 mb-2"/><p className="text-[10px] font-bold uppercase text-center">Chưa có máy nào</p></div> : 
                      dispatchCart.map((item, i) => (
                        <div key={i} className="bg-slate-700/40 p-3 rounded-2xl border border-slate-600/30 flex justify-between items-center animate-in slide-in-from-right duration-300">
                          <div className="flex-1 overflow-hidden">
                            <div className="text-[9px] font-black text-emerald-400 uppercase mb-1 truncate">{item.source.name} ➔ {item.destination.name}</div>
                            <div className="text-sm font-black truncate">Số máy: {item.transformer['Số máy'] || item.transformer['SERIAL NUMBER']}</div>
                            <div className="text-[9px] text-slate-400 font-bold uppercase">CS: {item.transformer['Công suất'] || item.transformer['CS MBT']} kVA</div>
                          </div>
                          <button onClick={() => setDispatchCart(prev => prev.filter((_, idx) => idx !== i))} className="p-2 text-slate-400 hover:text-red-400"><Trash2 className="w-4 h-4"/></button>
                        </div>
                      ))
                    }
                  </div>
                  {dispatchCart.length > 0 && <button onClick={() => setDispatchCart([])} className="mt-4 text-[9px] text-slate-500 hover:text-red-400 font-black uppercase text-center">Hủy toàn bộ</button>}
                </div>
              </div>
            </div>
          )}

          {(activeTab === 'tbt' || activeTab === 'mbt' || activeTab === 'kho') && (
            <div className="flex-1 overflow-hidden px-1">
              <DataTable 
                data={data[activeTab]} 
                icon={activeTab === 'tbt' ? Zap : activeTab === 'mbt' ? Activity : Warehouse}
                title={`Danh sách: ${activeTab === 'tbt' ? 'Trạm' : activeTab === 'mbt' ? 'Máy' : 'Kho'}`}
                columns={activeTab === 'tbt' ? [{ key: 'AUTO_STT', label: 'STT' }, { key: 'TBTID', label: 'Mã Trạm' }, { key: 'TÊN DỰ KIẾN', label: 'Tên Trạm (Dự kiến)' }, { key: 'TỔNG CS TBT', label: 'Công Suất' }, { key: 'KIỂU TRẠM', label: 'Kiểu' }] : 
                        activeTab === 'mbt' ? [{ key: 'AUTO_STT', label: 'STT' }, { key: 'Số máy', label: 'Số Máy' }, { key: 'Hiệu máy', label: 'Hiệu Máy' }, { key: 'Công suất', label: 'Công Suất' }, { key: 'Vị trí', label: 'Vị trí' }, { key: 'Tình trạng', label: 'Trạng thái' }] : 
                        [{ key: 'AUTO_STT', label: 'STT' }, { key: 'Số máy', label: 'Số Máy' }, { key: 'Hiệu máy', label: 'Hiệu Máy' }, { key: 'Công suất', label: 'Công Suất' }, { key: 'Vị trí trước khi về kho', label: 'Nguồn thu hồi' }, { key: 'Chất lượng', label: 'Chất lượng' }]}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}