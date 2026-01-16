import React, { useState } from 'react';
import { Company, DocStatus, CompanyStatus, COMPANY_STATUS_LABELS, COMPANY_STATUS_COLORS } from '../types';
import { Plus, Search, ChevronRight, FileCheck, AlertTriangle, Building2, Calendar, Trash2, Hash, Clock, AlertCircle, Hourglass } from 'lucide-react';
import { ProgressBar } from './ProgressBar';

interface DashboardProps {
  companies: Company[];
  onSelectCompany: (company: Company) => void;
  onAddCompany: (name: string, email: string, auditId: string, openingDate: Date, deadlineDate: Date) => void;
  onDeleteCompany: (id: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ companies, onSelectCompany, onAddCompany, onDeleteCompany }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newAuditId, setNewAuditId] = useState('');
  const [newOpeningDate, setNewOpeningDate] = useState(new Date().toISOString().split('T')[0]); // Default to today YYYY-MM-DD
  const [newDeadlineDate, setNewDeadlineDate] = useState(() => {
      const d = new Date();
      d.setDate(d.getDate() + 14); // Default 14 days later
      return d.toISOString().split('T')[0];
  });
  const [searchTerm, setSearchTerm] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName && newEmail && newOpeningDate && newDeadlineDate) {
      onAddCompany(newName, newEmail, newAuditId, new Date(newOpeningDate), new Date(newDeadlineDate));
      setNewName('');
      setNewEmail('');
      setNewAuditId('');
      setNewOpeningDate(new Date().toISOString().split('T')[0]);
      const d = new Date();
      d.setDate(d.getDate() + 14);
      setNewDeadlineDate(d.toISOString().split('T')[0]);
      setIsModalOpen(false);
    }
  };

  const filteredCompanies = companies.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.auditId && c.auditId.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Sort: Oldest audit opening date first (Ascending)
  const sortedCompanies = [...filteredCompanies].sort((a, b) => {
    return new Date(a.auditOpeningDate).getTime() - new Date(b.auditOpeningDate).getTime();
  });

  const getStats = (company: Company) => {
    const total = company.documents.length;
    const completed = company.documents.filter(d => d.status === DocStatus.RECEIVED || d.status === DocStatus.NA).length;
    const pending = company.documents.filter(d => d.status === DocStatus.PENDING).length;
    const issues = company.documents.filter(d => d.status === DocStatus.ISSUE).length;
    const percentage = Math.round(total === 0 ? 100 : (completed / total) * 100);
    return { completed, pending, issues, percentage };
  };

  const getMissingDocs = (company: Company) => {
    return company.documents.filter(d => d.status === DocStatus.PENDING || d.status === DocStatus.ISSUE);
  };

  const getDeadlineStatus = (deadline?: Date) => {
      if (!deadline) return { text: 'Belirlenmedi', color: 'text-slate-400', bg: 'bg-slate-50', icon: Clock };
      
      const d = new Date(deadline);
      if (isNaN(d.getTime())) return { text: 'Hatalı Tarih', color: 'text-slate-400', bg: 'bg-slate-50', icon: AlertCircle };

      const now = new Date();
      const diffTime = d.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
          return { text: `${Math.abs(diffDays)} Gün Gecikti`, color: 'text-rose-600', bg: 'bg-rose-50', icon: AlertCircle };
      } else if (diffDays <= 3) {
          return { text: `${diffDays} Gün Kaldı`, color: 'text-amber-600', bg: 'bg-amber-50', icon: Hourglass };
      } else {
          return { text: `${diffDays} Gün Kaldı`, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: Clock };
      }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Hero Header */}
      <div className="mb-10 text-center sm:text-left sm:flex sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Denetim Paneli</h1>
          <p className="text-slate-500 mt-2 max-w-xl">
            İnditex atıksu denetim süreçlerini, belgeleri ve düzeltici faaliyetleri tek bir yerden yönetin.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="mt-4 sm:mt-0 flex items-center justify-center px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-medium rounded-xl transition-all shadow-lg shadow-indigo-200 hover:shadow-indigo-300 active:scale-95"
        >
          <Plus className="w-5 h-5 mr-2" />
          Yeni Firma
        </button>
      </div>
      
      {/* Search Bar */}
      <div className="relative mb-8 group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
        </div>
        <input
          type="text"
          className="block w-full pl-11 pr-4 py-3 border-0 bg-white rounded-2xl text-slate-900 shadow-sm ring-1 ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-lg"
          placeholder="Firma adı veya Audit ID ile arama yapın..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        {sortedCompanies.length === 0 ? (
          <div className="col-span-full py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
            <div className="bg-slate-50 p-4 rounded-full mb-4">
              <Building2 className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-medium text-slate-900">Firma Bulunamadı</h3>
            <p className="text-slate-500 max-w-xs mx-auto mt-1">Listenizde henüz firma yok veya arama kriterinize uygun sonuç bulunamadı.</p>
          </div>
        ) : (
          sortedCompanies.map(company => {
            const stats = getStats(company);
            const missingDocs = getMissingDocs(company);
            const isClosed = company.status === CompanyStatus.CLOSED;
            const deadlineStatus = getDeadlineStatus(company.deadlineDate);
            const DeadlineIcon = deadlineStatus.icon;

            return (
              <div 
                key={company.id} 
                onClick={() => onSelectCompany(company)}
                className="group relative bg-white rounded-2xl p-6 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-100 transition-all duration-300 hover:-translate-y-1 cursor-pointer overflow-hidden flex flex-col"
              >
                {/* Decorative top border */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-start space-x-3">
                    <div className="bg-indigo-50 p-3 rounded-xl">
                      <Building2 className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors leading-tight">{company.name}</h3>
                      <div className="flex flex-col sm:flex-row sm:items-center text-sm text-slate-500 mt-0.5 gap-x-2">
                        <span>{company.email}</span>
                        {company.auditId && (
                            <span className="inline-flex items-center text-slate-400 text-xs bg-slate-100 px-1.5 py-0.5 rounded">
                                <Hash className="w-3 h-3 mr-0.5" />
                                {company.auditId}
                            </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDeleteCompany(company.id); }}
                    className="text-slate-300 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                    title="Sil"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Status & Deadline Row */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${COMPANY_STATUS_COLORS[company.status]}`}>
                        {COMPANY_STATUS_LABELS[company.status]}
                    </span>
                    
                    {/* Deadline Badge (Only if not closed) */}
                    {!isClosed && company.deadlineDate && (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${deadlineStatus.bg} ${deadlineStatus.color}`}>
                            <DeadlineIcon className="w-3 h-3 mr-1" />
                            {deadlineStatus.text}
                        </span>
                    )}
                </div>
                
                <div className="space-y-4 mb-4">
                  <div className="flex justify-between items-center text-sm">
                     <div className="flex gap-3">
                        <span className="flex items-center text-emerald-600 font-medium bg-emerald-50 px-2.5 py-1 rounded-md">
                          <FileCheck className="w-3.5 h-3.5 mr-1.5" />
                          {stats.completed}
                        </span>
                        <span className="flex items-center text-amber-600 font-medium bg-amber-50 px-2.5 py-1 rounded-md">
                          <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
                          {stats.issues}
                        </span>
                     </div>
                     <span className="flex items-center text-xs text-slate-400">
                        <Clock className="w-3 h-3 mr-1" />
                        Açılış: {new Date(company.auditOpeningDate).toLocaleDateString('tr-TR')}
                     </span>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1.5">
                      <span>İlerleme</span>
                      <span>%{stats.percentage}</span>
                    </div>
                    <ProgressBar percentage={stats.percentage} />
                  </div>
                </div>

                {/* Missing Docs Section - Only if not closed and has missing items */}
                {!isClosed && missingDocs.length > 0 && (
                    <div className="mt-auto pt-4 border-t border-slate-100 animate-in fade-in duration-500">
                        <h4 className="text-[10px] font-bold text-rose-500 uppercase tracking-wider mb-2 flex items-center">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Bekleyen / Hatalı Belgeler
                        </h4>
                        <ul className="space-y-1.5">
                            {missingDocs.slice(0, 3).map((doc) => (
                                <li key={doc.id} className="flex items-start text-xs text-slate-600">
                                    <span className={`w-1.5 h-1.5 rounded-full mt-1 mr-2 flex-shrink-0 ${doc.status === DocStatus.ISSUE ? 'bg-red-500' : 'bg-amber-400'}`}></span>
                                    <span className="line-clamp-1">{doc.name}</span>
                                </li>
                            ))}
                        </ul>
                        {missingDocs.length > 3 && (
                            <p className="text-[10px] text-slate-400 font-medium mt-2 pl-3.5">
                                +{missingDocs.length - 3} belge daha...
                            </p>
                        )}
                    </div>
                )}

                <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0">
                  <ChevronRight className="w-5 h-5 text-indigo-400" />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modern Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-6 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-xl font-bold text-slate-900">Yeni Firma Ekle</h2>
              <p className="text-sm text-slate-500 mt-1">Denetime başlayacağınız firmanın bilgilerini girin.</p>
            </div>
            
            <form onSubmit={handleAdd} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Firma Adı</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Tekstil A.Ş."
                  className="w-full border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-slate-900"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">E-posta Adresi</label>
                    <input
                      type="email"
                      required
                      placeholder="iletisim@firma.com"
                      className="w-full border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-slate-900"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Audit ID</label>
                    <input
                      type="text"
                      placeholder="Örn: 123456"
                      className="w-full border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-slate-900"
                      value={newAuditId}
                      onChange={(e) => setNewAuditId(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Açılma Tarihi</label>
                    <input
                      type="date"
                      required
                      className="w-full border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-slate-900"
                      value={newOpeningDate}
                      onChange={(e) => setNewOpeningDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Son Teslim</label>
                    <input
                      type="date"
                      required
                      className="w-full border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-slate-900"
                      value={newDeadlineDate}
                      onChange={(e) => setNewDeadlineDate(e.target.value)}
                    />
                  </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 font-medium rounded-xl transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all"
                >
                  Firma Ekle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};