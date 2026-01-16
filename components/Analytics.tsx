import React, { useMemo } from 'react';
import { Company, CompanyStatus } from '../types';
import { BarChart3, TrendingUp, Calendar, CheckCircle2, ArrowUpRight, Clock, Calculator } from 'lucide-react';

interface AnalyticsProps {
  companies: Company[];
}

// Helper: Calculate business days between two dates
const getBusinessDays = (startDate: Date, endDate: Date): number => {
  let count = 0;
  const curDate = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(curDate.getTime()) || isNaN(end.getTime())) return 0;

  // Reset hours to avoid partial day issues
  curDate.setHours(0,0,0,0);
  end.setHours(0,0,0,0);

  while (curDate <= end) {
    const dayOfWeek = curDate.getDay();
    // 0 = Sunday, 6 = Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    curDate.setDate(curDate.getDate() + 1);
  }
  return Math.max(1, count); // Minimum 1 day if dates are same
};

export const Analytics: React.FC<AnalyticsProps> = ({ companies }) => {
  
  // Process Data
  const stats = useMemo(() => {
    const closedAudits = companies.filter(
      c => c.status === CompanyStatus.CLOSED 
           && c.auditClosingDate && !isNaN(new Date(c.auditClosingDate).getTime())
           && c.auditOpeningDate && !isNaN(new Date(c.auditOpeningDate).getTime())
    ).map(c => {
      const days = getBusinessDays(new Date(c.auditOpeningDate), new Date(c.auditClosingDate!));
      return { ...c, days };
    });

    const totalClosed = closedAudits.length;
    
    // Overall Average
    const totalDays = closedAudits.reduce((acc, curr) => acc + curr.days, 0);
    const avgDays = totalClosed > 0 ? Math.round((totalDays / totalClosed) * 10) / 10 : 0;

    // Monthly Averages
    const monthlyData: Record<string, { totalDays: number, count: number }> = {};
    
    closedAudits.forEach(c => {
      // Group by closing date month
      if (c.auditClosingDate) {
        const date = new Date(c.auditClosingDate);
        if (isNaN(date.getTime())) return;
        
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
        
        if (!monthlyData[key]) monthlyData[key] = { totalDays: 0, count: 0 };
        monthlyData[key].totalDays += c.days;
        monthlyData[key].count += 1;
      }
    });

    // Convert to array and sort
    const chartData = Object.entries(monthlyData).reduce((acc, [key, data]) => {
      const [yearStr, monthStr] = key.split('-');
      const year = parseInt(yearStr);
      const month = parseInt(monthStr);

      if (!isNaN(year) && !isNaN(month)) {
          const date = new Date(year, month - 1);
          acc.push({
            label: date.toLocaleDateString('tr-TR', { month: 'short', year: '2-digit' }),
            rawDate: key,
            avg: Math.round((data.totalDays / data.count) * 10) / 10,
            count: data.count
          });
      }
      return acc;
    }, [] as any[]).sort((a, b) => a.rawDate.localeCompare(b.rawDate));

    // Best and Worst
    const sortedByDays = [...closedAudits].sort((a, b) => a.days - b.days);
    const bestAudit = sortedByDays.length > 0 ? sortedByDays[0] : null;
    const worstAudit = sortedByDays.length > 0 ? sortedByDays[sortedByDays.length - 1] : null;

    return { totalClosed, avgDays, chartData, closedAudits, bestAudit, worstAudit };
  }, [companies]);

  // SVG Chart Helper
  const maxVal = Math.max(...stats.chartData.map((d: any) => d.avg), 10); // Minimum scale 10
  
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex items-end justify-between mb-2">
        <div>
           <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Performans Analizi</h1>
           <p className="text-slate-700 mt-2 font-medium">
             Denetim kapatma sürelerinin (iş günü bazlı) istatistiksel raporu.
           </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Total Closed */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between relative overflow-hidden">
           <div className="relative z-10">
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Kapatılan Denetim</p>
              <h3 className="text-4xl font-black text-slate-900 mt-2">{stats.totalClosed}</h3>
           </div>
           <div className="bg-emerald-100 p-4 rounded-xl text-emerald-600">
              <CheckCircle2 className="w-8 h-8" />
           </div>
        </div>

        {/* Card 2: Yearly Average */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between relative overflow-hidden">
           <div className="relative z-10">
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Yıllık Ort. Kapanış</p>
              <div className="flex items-baseline mt-2">
                 <h3 className="text-4xl font-black text-indigo-600">{stats.avgDays}</h3>
                 <span className="ml-2 text-sm font-bold text-slate-400">İş Günü</span>
              </div>
           </div>
           <div className="bg-indigo-100 p-4 rounded-xl text-indigo-600">
              <Calculator className="w-8 h-8" />
           </div>
        </div>

        {/* Card 3: Best Record */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between relative overflow-hidden">
           <div className="relative z-10">
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">En Hızlı Kapanış</p>
               <div className="flex items-baseline mt-2">
                 <h3 className="text-4xl font-black text-amber-500">{stats.bestAudit ? stats.bestAudit.days : '-'}</h3>
                 <span className="ml-2 text-sm font-bold text-slate-400">İş Günü</span>
              </div>
           </div>
           <div className="bg-amber-100 p-4 rounded-xl text-amber-600">
              <TrendingUp className="w-8 h-8" />
           </div>
        </div>
      </div>

      {/* Monthly Chart */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
         <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-slate-900 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-indigo-500" />
              Aylık Ortalama Kapanış Süresi
            </h2>
            <div className="text-xs font-medium text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
               Son 12 Ay
            </div>
         </div>

         {stats.chartData.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-100 rounded-xl">
               <Calendar className="w-10 h-10 mb-2 opacity-50" />
               <p>Grafik oluşturmak için en az bir denetimi kapatmalısınız.</p>
            </div>
         ) : (
            <div className="relative h-64 w-full flex items-end justify-between gap-2 sm:gap-4 px-2">
               {stats.chartData.map((item: any, idx: number) => {
                  const heightPercentage = (item.avg / maxVal) * 100;
                  return (
                     <div key={idx} className="flex flex-col items-center justify-end flex-1 group">
                        <div className="relative w-full flex justify-center items-end h-full">
                            {/* Tooltip */}
                            <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-xs py-1 px-2 rounded pointer-events-none whitespace-nowrap z-10">
                                {item.avg} Gün ({item.count} Denetim)
                            </div>
                            {/* Bar */}
                            <div 
                                style={{ height: `${heightPercentage}%` }} 
                                className="w-full max-w-[50px] bg-gradient-to-t from-indigo-500 to-indigo-400 rounded-t-lg opacity-80 group-hover:opacity-100 transition-all duration-300 relative"
                            >
                               {/* Value Label inside bar if tall enough, else above */}
                               {heightPercentage > 15 && (
                                   <span className="absolute top-2 left-1/2 -translate-x-1/2 text-[10px] font-bold text-white/90">
                                       {item.avg}
                                   </span>
                               )}
                            </div>
                        </div>
                        <div className="mt-3 text-xs font-semibold text-slate-500">{item.label}</div>
                     </div>
                  );
               })}
            </div>
         )}
      </div>

      {/* Detailed List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
         <div className="p-6 border-b border-slate-100">
             <h2 className="text-xl font-bold text-slate-900 flex items-center">
              <Clock className="w-5 h-5 mr-2 text-indigo-500" />
              Kapatılan Denetim Geçmişi
            </h2>
         </div>
         
         <div className="overflow-x-auto">
             <table className="w-full text-left text-sm">
                 <thead className="bg-slate-50 border-b border-slate-200">
                     <tr>
                         <th className="px-6 py-4 font-semibold text-slate-500">Firma Adı</th>
                         <th className="px-6 py-4 font-semibold text-slate-500">Audit ID</th>
                         <th className="px-6 py-4 font-semibold text-slate-500">Açılış Tarihi</th>
                         <th className="px-6 py-4 font-semibold text-slate-500">Kapanış Tarihi</th>
                         <th className="px-6 py-4 font-semibold text-slate-500 text-right">Süre (İş Günü)</th>
                     </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                     {stats.closedAudits.length === 0 ? (
                         <tr>
                             <td colSpan={5} className="px-6 py-8 text-center text-slate-400 italic">
                                 Henüz kapatılmış bir denetim bulunmuyor.
                             </td>
                         </tr>
                     ) : (
                         stats.closedAudits.sort((a,b) => b.auditClosingDate!.getTime() - a.auditClosingDate!.getTime()).map((company) => (
                             <tr key={company.id} className="hover:bg-slate-50/80 transition-colors">
                                 <td className="px-6 py-4 font-medium text-slate-900">{company.name}</td>
                                 <td className="px-6 py-4 text-slate-500 font-mono text-xs">{company.auditId || '-'}</td>
                                 <td className="px-6 py-4 text-slate-500">
                                     {new Date(company.auditOpeningDate).toLocaleDateString('tr-TR')}
                                 </td>
                                 <td className="px-6 py-4 text-slate-500">
                                     {new Date(company.auditClosingDate!).toLocaleDateString('tr-TR')}
                                 </td>
                                 <td className="px-6 py-4 text-right">
                                     <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold ${
                                         company.days <= 10 ? 'bg-emerald-100 text-emerald-700' : 
                                         company.days <= 20 ? 'bg-amber-100 text-amber-700' : 
                                         'bg-rose-100 text-rose-700'
                                     }`}>
                                         {company.days} Gün
                                     </span>
                                 </td>
                             </tr>
                         ))
                     )}
                 </tbody>
             </table>
         </div>
      </div>
    </div>
  );
};