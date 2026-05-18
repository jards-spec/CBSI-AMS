import React from 'react';
import { X, Printer, LayoutGrid } from 'lucide-react';

interface Props {
  request: any;
  onClose: () => void;
}

const PrintableRequest: React.FC<Props> = ({ request, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md overflow-y-auto p-4 md:p-10 flex flex-col items-center print:bg-white print:p-0">
      <div className="w-full max-w-4xl flex justify-between items-center mb-6 print:hidden">
        <button onClick={onClose} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
          <X size={20} /> <span className="text-xs font-black uppercase tracking-widest">Close Preview</span>
        </button>
        <button onClick={handlePrint} className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-xl font-black uppercase text-xs flex items-center gap-2 shadow-xl shadow-red-600/20">
          <Printer size={18} /> Print Document
        </button>
      </div>

      <div className="w-full max-w-4xl bg-white text-black p-12 shadow-2xl min-h-[1056px] print:shadow-none print:w-full print:max-w-none">
        
        {/* Header Section */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-4 mb-2">
            <div className="bg-red-600 p-2 rounded-lg text-white"><LayoutGrid size={32} /></div>
            <h1 className="text-3xl font-black text-red-600 uppercase tracking-tighter italic">Central Books</h1>
          </div>
          <div className="text-center text-[10px] font-bold text-slate-600 leading-tight uppercase tracking-widest">
            927 Quezon Ave. Phoenix Building<br />Brgy. Sta. Cruz, Quezon City
          </div>
        </div>

        <div className="h-[2px] bg-black w-full mb-10"></div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-x-12 gap-y-6 mb-12">
          <div className="flex items-end gap-3 border-b border-black/20 pb-1">
            <span className="text-[10px] font-black uppercase text-slate-500 min-w-[80px]">Requestor:</span>
            <span className="text-sm font-bold border-b-2 border-black flex-1 uppercase">{request.requestorName}</span>
          </div>
          <div className="flex items-end gap-3 border-b border-black/20 pb-1">
            <span className="text-[10px] font-black uppercase text-slate-500 min-w-[120px]">Request Number:</span>
            <span className="text-sm font-bold border-b-2 border-black flex-1 text-red-600 font-mono">{request.requestNumber}</span>
          </div>
          <div className="flex items-end gap-3 border-b border-black/20 pb-1">
            <span className="text-[10px] font-black uppercase text-slate-500 min-w-[80px]">Department:</span>
            <span className="text-sm font-bold border-b-2 border-black flex-1 uppercase">{request.department}</span>
          </div>
          <div className="flex items-end gap-3 border-b border-black/20 pb-1">
            <span className="text-[10px] font-black uppercase text-slate-500 min-w-[120px]">Date Submitted:</span>
            <span className="text-sm font-bold border-b-2 border-black flex-1 uppercase">{request.dateSubmitted}</span>
          </div>
        </div>

        {/* Items Table */}
        <table className="w-full border-2 border-black mb-16">
          <thead>
            <tr className="bg-slate-100 border-b-2 border-black text-[10px] font-black uppercase tracking-widest">
              <th className="border-r-2 border-black p-3 w-20">Qty</th>
              <th className="border-r-2 border-black p-3 text-left">Item Description</th>
              <th className="p-3 text-left">System Information</th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-black">
            {request.items.map((item: any, idx: number) => (
              <tr key={idx} className="h-24">
                <td className="border-r-2 border-black p-4 text-center text-lg font-black">{item.quantity}</td>
                <td className="border-r-2 border-black p-4 uppercase">
                  <div className="font-black text-sm">{item.type}</div>
                  <div className="text-[9px] text-slate-500 mt-1 italic">{item.customType || '-'}</div>
                </td>
                <td className="p-4 space-y-1">
                   <div className="text-[10px] font-bold uppercase flex justify-between">
                     <span className="text-slate-400">Processor:</span> {item.processor}
                   </div>
                   <div className="text-[10px] font-bold uppercase flex justify-between">
                     <span className="text-slate-400">Memory:</span> {item.ram}
                   </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 4-SIGNATURE GRID */}
        <div className="grid grid-cols-2 gap-x-24 gap-y-20 mt-20">
          {/* Box 1: Requestor */}
          <div className="text-center">
            <div className="border-b-2 border-black font-black uppercase text-xs mb-1 pb-1">{request.requestorName}</div>
            <div className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Requestor</div>
          </div>
          
          {/* Box 2: Dept Manager */}
          <div className="text-center">
            <div className="border-b-2 border-black font-black uppercase text-xs mb-1 pb-1">{request.managerName}</div>
            <div className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Department Manager</div>
          </div>

          {/* Box 3: Sibal Brother (Dynamic) */}
          <div className="text-center">
            <div className="border-b-2 border-black font-black uppercase text-xs mb-1 pb-1">
              {request.approvingExecutive?.name || 'Mr. Paolo M. Sibal'}
            </div>
            <div className="text-[9px] font-black uppercase text-slate-400 tracking-widest">
              {request.approvingExecutive?.title || 'President'}
            </div>
          </div>

          {/* Box 4: MIS Officer */}
          <div className="text-center">
            <div className="border-b-2 border-black font-black uppercase text-xs mb-1 pb-1">Walter T. Del Rosario</div>
            <div className="text-[9px] font-black uppercase text-slate-400 tracking-widest">MIS Officer</div>
          </div>
        </div>

        <div className="mt-24 text-[8px] font-bold text-slate-400 uppercase text-center tracking-[0.4em]">
          Electronic copy generated via AMS Command Center
        </div>
      </div>
    </div>
  );
};

export default PrintableRequest;
