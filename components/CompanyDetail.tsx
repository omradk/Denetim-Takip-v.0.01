import React, { useState } from 'react';
import { Company, DocumentItem, DocStatus, STATUS_COLORS, DischargeType, getRequiredDocuments, CompanyStatus, COMPANY_STATUS_LABELS, COMPANY_STATUS_COLORS } from '../types';
import { StatusSelector } from './StatusSelector';
import { generateFollowUpEmail } from '../services/geminiService';
import { ArrowLeft, Send, Loader2, Sparkles, FileText, CheckCircle2, Settings, AlertOctagon, Info, Save, Hash, Calendar, Clock, AlertCircle } from 'lucide-react';
import { ProgressBar } from './ProgressBar';

interface CompanyDetailProps {
  company: Company;
  onUpdate: (updatedCompany: Company) => void;
  onBack: () => void;
}

export const CompanyDetail: React.FC<CompanyDetailProps> = ({ company, onUpdate, onBack }) => {
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);
  const [generatedEmail, setGeneratedEmail] = useState<string | null>(null);

  const updateConfiguration = (newType: DischargeType, newIsLowVolume: boolean) => {
    const newRequirements = getRequiredDocuments(newType, newIsLowVolume);
    const mergedDocs = newRequirements.map(reqDoc => {
      const existingDoc = company.documents.find(d => d.id === reqDoc.id);
      if (existingDoc) {
        return {
          ...reqDoc,
          status: existingDoc.status,
          notes: existingDoc.notes,
          finding: existingDoc.finding,
          correctiveAction: existingDoc.correctiveAction
        };
      }
      return reqDoc;
    });

    onUpdate({
      ...company,
      dischargeType: newType,
      isLowVolume: newIsLowVolume,
      documents: mergedDocs,
      lastUpdated: new Date()
    });
  };

  const updateCompanyStatus = (newStatus: CompanyStatus) => {
      let closingDate = company.auditClosingDate;
      
      // Auto-set closing date if closed, clear if reopened
      if (newStatus === CompanyStatus.CLOSED && !closingDate) {
          closingDate = new Date();
      } else if (newStatus !== CompanyStatus.CLOSED) {
          closingDate = undefined;
      }

      onUpdate({
          ...company,
          status: newStatus,
          auditClosingDate: closingDate,
          lastUpdated: new Date()
      });
  };

  const handleDocUpdate = (docId: string, field: keyof DocumentItem, value: any) => {
    const updatedDocs = company.documents.map(doc => 
      doc.id === docId ? { ...doc, [field]: value } : doc
    );
    onUpdate({ ...company, documents: updatedDocs, lastUpdated: new Date() });
  };

  const calculateProgress = () => {
    const total = company.documents.length;
    if (total === 0) return 100;
    const completed = company.documents.filter(d => d.status === DocStatus.RECEIVED || d.status === DocStatus.NA).length;
    return Math.round((completed / total) * 100);
  };

  const handleGenerateEmail = async () => {
    setIsGeneratingEmail(true);
    setGeneratedEmail(null);
    const email = await generateFollowUpEmail(company);
    setGeneratedEmail(email);
    setIsGeneratingEmail(false);
  };

  // --- Deadline Actions ---
  const handleExtendDeadline = () => {
      if (!company.deadlineDate) return;
      const d = new Date(company.deadlineDate);
      // Ensure existing date is valid before extending
      if (isNaN(d.getTime())) return;

      d.setDate(d.getDate() + 3);
      onUpdate({
          ...company,
          deadlineDate: d,
          lastUpdated: new Date()
      });
  };

  const handleTerminateAudit = () => {
      if (!confirm('Süre dolduğu için denetim "Eksik Evrak Paylaşıldı" olarak kapatılacak. Onaylıyor musunuz?')) return;
      onUpdate({
          ...company,
          status: CompanyStatus.MISSING_SHARED,
          auditClosingDate: new Date(),
          lastUpdated: new Date()
      });
  };

  const handleDeadlineChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      const newDate = val ? new Date(val) : undefined;
      // Only update if valid or clearing
      const validDate = newDate && !isNaN(newDate.getTime()) ? newDate : undefined;

      onUpdate({
          ...company,
          deadlineDate: validDate,
          lastUpdated: new Date()
      });
  };

  const progress = calculateProgress();
  
  // Safe calculation for days remaining
  const daysRemaining = (() => {
      if (!company.deadlineDate) return null;
      const d = new Date(company.deadlineDate);
      if (isNaN(d.getTime())) return null;
      return Math.ceil((d.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  })();

  // Helper for safe date string
  const getSafeDateString = (date?: Date) => {
      if (!date) return '';
      const d = new Date(date);
      return !isNaN(d.getTime()) ? d.toLocaleDateString('tr-TR') : '';
  };
  
  // Helper for safe ISO string for input
  const getSafeISOString = (date?: Date) => {
      if (!date) return '';
      const d = new Date(date);
      return !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : '';
  };

  return (
    <div className="max-w-6xl mx-auto pb-20">
      {/* Back Link */}
      <button 
        onClick={onBack}
        className="group flex items-center text-slate-500 hover:text-indigo-600 mb-6 transition-colors font-medium text-sm"
      >
        <ArrowLeft className="w-4 h-4 mr-1 transition-transform group-hover:-translate-x-1" />
        Firma Listesine Dön
      </button>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Company Info & Config (Sticky on large screens) */}
        <div className="lg:col-span-4 space-y-6">
           <div className="bg-white rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border border-slate-100 p-6">
              <div className="mb-6">
                 <h1 className="text-2xl font-bold text-slate-900 leading-tight">{company.name}</h1>
                 <p className="text-slate-500 text-sm mt-1 flex items-center flex-wrap gap-2">
                    <span className="mr-2">{company.email}</span>
                    {company.auditId && (
                        <span className="inline-flex items-center text-slate-500 text-xs bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            <Hash className="w-3 h-3 mr-0.5" />
                            {company.auditId}
                        </span>
                    )}
                 </p>
                 
                 {/* Audit Dates */}
                 <div className="mt-3 flex flex-col gap-1 text-xs text-slate-400">
                    <div className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1.5" />
                        <span>Açılış: {getSafeDateString(company.auditOpeningDate)}</span>
                    </div>
                    {company.status === CompanyStatus.CLOSED && company.auditClosingDate && (
                        <div className="flex items-center text-emerald-600 font-medium">
                            <Calendar className="w-3 h-3 mr-1.5" />
                            <span>Kapanış: {getSafeDateString(company.auditClosingDate)}</span>
                        </div>
                    )}
                 </div>
              </div>

              {/* Company Status Selector */}
              <div className="mb-6">
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Denetim Statüsü</label>
                <div className="relative">
                    <select
                        value={company.status}
                        onChange={(e) => updateCompanyStatus(e.target.value as CompanyStatus)}
                        className={`w-full text-sm font-semibold rounded-lg border shadow-sm focus:outline-none focus:ring-2 py-2.5 pl-3 pr-8 appearance-none cursor-pointer ${COMPANY_STATUS_COLORS[company.status]}`}
                    >
                        {Object.entries(COMPANY_STATUS_LABELS).map(([key, label]) => (
                            <option key={key} value={key} className="bg-white text-slate-700 font-normal">
                                {label}
                            </option>
                        ))}
                    </select>
                </div>
              </div>

              {/* Deadline Management Panel */}
              <div className="mb-6 bg-slate-50 rounded-xl p-5 border border-slate-200">
                  <div className="flex items-center mb-4 text-slate-800">
                      <Clock className="w-4 h-4 mr-2 text-amber-500" />
                      <h3 className="text-sm font-bold uppercase tracking-wide">Süreç Takibi</h3>
                  </div>
                  
                  <div className="space-y-4">
                      <div>
                          <div className="flex justify-between items-center mb-1.5">
                              <label className="block text-xs font-semibold text-slate-500 uppercase">Son Teslim</label>
                              {daysRemaining !== null && (
                                  <span className={`text-xs font-bold ${daysRemaining < 0 ? 'text-rose-500' : daysRemaining <= 3 ? 'text-amber-500' : 'text-emerald-600'}`}>
                                      {daysRemaining < 0 ? `${Math.abs(daysRemaining)} Gün Gecikti` : `${daysRemaining} Gün Kaldı`}
                                  </span>
                              )}
                          </div>
                          <input 
                              type="date"
                              value={getSafeISOString(company.deadlineDate)}
                              onChange={handleDeadlineChange}
                              className="w-full text-sm bg-white border-slate-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 py-2 px-3"
                          />
                      </div>

                      {company.status !== CompanyStatus.CLOSED && (
                          <div className="grid grid-cols-2 gap-2 pt-1">
                              <button 
                                  onClick={handleExtendDeadline}
                                  className="flex flex-col items-center justify-center p-2 bg-white border border-slate-200 rounded-lg hover:bg-indigo-50 hover:border-indigo-200 transition-all text-xs font-medium text-slate-600 hover:text-indigo-600 shadow-sm"
                              >
                                  <span className="text-lg mb-0.5">+3</span>
                                  <span>Gün Uzat</span>
                              </button>
                              <button 
                                  onClick={handleTerminateAudit}
                                  className="flex flex-col items-center justify-center p-2 bg-white border border-slate-200 rounded-lg hover:bg-rose-50 hover:border-rose-200 transition-all text-xs font-medium text-slate-600 hover:text-rose-600 shadow-sm"
                              >
                                  <AlertOctagon className="w-5 h-5 mb-1" />
                                  <span>Süre Doldu</span>
                              </button>
                          </div>
                      )}
                  </div>
              </div>

              <div className="mb-6">
                 <div className="flex justify-between text-sm mb-2">
                    <span className="font-semibold text-slate-700">Denetim İlerlemesi</span>
                    <span className={`font-bold ${progress === 100 ? 'text-emerald-600' : 'text-indigo-600'}`}>%{progress}</span>
                 </div>
                 <ProgressBar percentage={progress} />
              </div>

              {/* Config Panel styled as a card inside */}
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                <div className="flex items-center mb-4 text-slate-800">
                  <Settings className="w-4 h-4 mr-2 text-indigo-500" />
                  <h3 className="text-sm font-bold uppercase tracking-wide">Tesis Yapılandırması</h3>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Deşarj Türü</label>
                    <div className="relative">
                      <select
                        value={company.dischargeType}
                        onChange={(e) => updateConfiguration(e.target.value as DischargeType, company.isLowVolume)}
                        className="w-full text-sm bg-white border-slate-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 py-2.5 pl-3 pr-8"
                      >
                        {Object.values(DischargeType).map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div className="flex items-start pt-2">
                    <div className="flex items-center h-5">
                      <input
                        id="lowVolume"
                        type="checkbox"
                        checked={company.isLowVolume}
                        onChange={(e) => updateConfiguration(company.dischargeType, e.target.checked)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="lowVolume" className="font-medium text-slate-700">Düşük Kapasite</label>
                      <p className="text-slate-500 text-xs">Günlük atıksu &lt; 15 m³/gün</p>
                    </div>
                  </div>
                </div>
              </div>
           </div>

           {/* AI Assistant Card */}
           <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl shadow-lg shadow-indigo-200 p-6 text-white sticky top-24">
              <div className="flex items-center mb-4">
                <div className="bg-white/20 p-2 rounded-lg mr-3 backdrop-blur-sm">
                  <Sparkles className="w-5 h-5 text-yellow-300" />
                </div>
                <h2 className="text-lg font-bold">AI Asistanı</h2>
              </div>
              
              <p className="text-indigo-100 text-sm mb-6 leading-relaxed">
                Firmanın deşarj tipine ve eksik belgelere göre profesyonel hatırlatma e-postası oluşturun.
              </p>

              <button
                onClick={handleGenerateEmail}
                disabled={isGeneratingEmail}
                className="w-full flex items-center justify-center px-4 py-3 bg-white text-indigo-700 font-bold rounded-xl hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-indigo-600 focus:ring-white disabled:opacity-70 transition-all shadow-md"
              >
                {isGeneratingEmail ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Hazırlanıyor...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    E-posta Taslağı Oluştur
                  </>
                )}
              </button>

              {generatedEmail && (
                <div className="mt-6 animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-indigo-200 uppercase tracking-wider">Taslak İçeriği</span>
                    <button 
                      onClick={() => navigator.clipboard.writeText(generatedEmail)}
                      className="text-xs bg-white/10 hover:bg-white/20 text-white px-2 py-1 rounded transition-colors"
                    >
                      Kopyala
                    </button>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md p-3 rounded-lg border border-white/10 text-xs text-indigo-50 font-mono whitespace-pre-wrap max-h-64 overflow-y-auto custom-scrollbar">
                    {generatedEmail}
                  </div>
                </div>
              )}
           </div>
        </div>

        {/* Right Column: Document List */}
        <div className="lg:col-span-8 space-y-5">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold text-slate-800 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-indigo-500" />
              Gerekli Belgeler Listesi
            </h2>
            <span className="text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
              {company.documents.length} Belge
            </span>
          </div>

          {company.documents.length === 0 && (
             <div className="p-12 bg-white text-center rounded-2xl border-2 border-dashed border-slate-200 text-slate-400">
                <Info className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p>Bu yapılandırma için gerekli belge bulunmamaktadır.</p>
             </div>
          )}

          {company.documents.map((doc: DocumentItem) => (
            <div 
              key={doc.id} 
              className={`bg-white rounded-xl shadow-sm border transition-all duration-300 group ${
                doc.status === DocStatus.RECEIVED 
                  ? 'border-emerald-100 bg-emerald-50/10' 
                  : doc.status === DocStatus.ISSUE 
                    ? 'border-red-100 shadow-red-50/50' 
                    : 'border-slate-100 hover:border-indigo-100 hover:shadow-md'
              }`}
            >
              {/* Header */}
              <div className="p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-50/50">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100">
                      {doc.id}
                    </span>
                    <h3 className={`font-semibold text-slate-900 text-lg ${doc.status === DocStatus.RECEIVED ? 'line-through text-slate-400' : ''}`}>
                      {doc.name}
                    </h3>
                  </div>
                  <p className="text-sm text-slate-500 pl-1">{doc.description}</p>
                </div>
                <div className="flex-shrink-0">
                  <StatusSelector 
                    currentStatus={doc.status} 
                    onChange={(status) => handleDocUpdate(doc.id, 'status', status)} 
                  />
                </div>
              </div>

              {/* Work Area */}
              <div className="px-5 py-4 bg-slate-50/50 rounded-b-xl space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Finding */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center">
                          Bulgu / Tespit
                        </label>
                        <textarea
                            className="w-full text-sm px-3 py-2 border border-slate-200 bg-white rounded-lg focus:ring-2 focus:ring-red-100 focus:border-red-300 min-h-[80px] transition-all resize-y placeholder:text-slate-300"
                            placeholder="Denetim sırasında bir eksiklik fark edildi mi?"
                            value={doc.finding || ''}
                            onChange={(e) => handleDocUpdate(doc.id, 'finding', e.target.value)}
                        />
                    </div>
                    {/* Corrective Action */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center">
                          Düzeltici Faaliyet
                        </label>
                        <textarea
                            className="w-full text-sm px-3 py-2 border border-slate-200 bg-white rounded-lg focus:ring-2 focus:ring-emerald-100 focus:border-emerald-300 min-h-[80px] transition-all resize-y placeholder:text-slate-300"
                            placeholder="Firma bu bulguyu düzeltmek için ne yaptı?"
                            value={doc.correctiveAction || ''}
                            onChange={(e) => handleDocUpdate(doc.id, 'correctiveAction', e.target.value)}
                        />
                    </div>
                 </div>

                 {/* Internal Notes - Collapsible style line */}
                 <div className="relative">
                    <input
                        type="text"
                        placeholder="Kendiniz için not ekleyin..."
                        value={doc.notes || ''}
                        onChange={(e) => handleDocUpdate(doc.id, 'notes', e.target.value)}
                        className="w-full text-xs px-3 py-2 bg-transparent border-b border-dashed border-slate-300 focus:border-indigo-400 focus:ring-0 placeholder:text-slate-400 text-slate-600 transition-colors"
                    />
                 </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};