import React, { useState, useEffect } from 'react';
import { Company, DocStatus, DischargeType, getRequiredDocuments, CompanyStatus } from './types';
import { Dashboard } from './components/Dashboard';
import { CompanyDetail } from './components/CompanyDetail';
import { Analytics } from './components/Analytics';
import { LayoutGrid, BarChart3, LayoutDashboard } from 'lucide-react';

const STORAGE_KEY = 'audit_track_data';

type ViewState = 'dashboard' | 'analytics';

const App: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        
        // Helper to safely parse dates
        const safeDate = (d: any): Date | undefined => {
            if (!d) return undefined;
            const date = new Date(d);
            return isNaN(date.getTime()) ? undefined : date;
        };

        // Restore Date objects
        const hydrated = parsed.map((c: any) => ({
            ...c,
            lastUpdated: safeDate(c.lastUpdated) || new Date(),
            // Default to NO_DOCS if not present
            status: c.status || CompanyStatus.NO_DOCS,
            // Default to lastUpdated or now if opening date not present (migration)
            auditOpeningDate: safeDate(c.auditOpeningDate) || safeDate(c.lastUpdated) || new Date(),
            deadlineDate: safeDate(c.deadlineDate),
            auditClosingDate: safeDate(c.auditClosingDate),
            // Ensure dischargeType exists for old data
            dischargeType: c.dischargeType || DischargeType.INDIRECT_PRE,
            isLowVolume: c.isLowVolume || false,
            // Ensure docs have new fields if missing
            documents: c.documents.map((d: any) => ({
                ...d,
                finding: d.finding || '',
                correctiveAction: d.correctiveAction || ''
            }))
        }));
        setCompanies(hydrated);
      } catch (e) {
        console.error("Failed to parse saved data", e);
      }
    }
  }, []);

  // Save to local storage on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(companies));
  }, [companies]);

  const handleAddCompany = (name: string, email: string, auditId: string, openingDate: Date, deadlineDate: Date) => {
    // Default to Indirect with Pre-treatment as it's a common type
    const defaultType = DischargeType.INDIRECT_PRE;
    const defaultLowVolume = false;

    const newCompany: Company = {
      id: crypto.randomUUID(),
      auditId: auditId,
      name,
      email,
      dischargeType: defaultType,
      status: CompanyStatus.NO_DOCS,
      isLowVolume: defaultLowVolume,
      lastUpdated: new Date(),
      auditOpeningDate: openingDate,
      deadlineDate: deadlineDate,
      documents: getRequiredDocuments(defaultType, defaultLowVolume)
    };
    setCompanies([newCompany, ...companies]);
  };

  const handleUpdateCompany = (updatedCompany: Company) => {
    setCompanies(companies.map(c => c.id === updatedCompany.id ? updatedCompany : c));
  };

  const handleDeleteCompany = (id: string) => {
    if (confirm('Bu firmayı silmek istediğinize emin misiniz?')) {
        setCompanies(companies.filter(c => c.id !== id));
        if (selectedCompanyId === id) setSelectedCompanyId(null);
    }
  };

  const selectedCompany = companies.find(c => c.id === selectedCompanyId);

  // Render logic based on state
  const renderContent = () => {
    if (selectedCompany) {
      return (
        <CompanyDetail 
          company={selectedCompany} 
          onUpdate={handleUpdateCompany}
          onBack={() => setSelectedCompanyId(null)}
        />
      );
    }
    
    if (currentView === 'analytics') {
      return <Analytics companies={companies} />;
    }

    return (
      <Dashboard 
        companies={companies} 
        onSelectCompany={(c) => setSelectedCompanyId(c.id)}
        onAddCompany={handleAddCompany}
        onDeleteCompany={handleDeleteCompany}
      />
    );
  };

  return (
    <div className="min-h-screen bg-[#FFC107] text-slate-900 font-sans pb-20">
        {/* Navigation Bar */}
        <nav className="bg-white/90 backdrop-blur-md border-b border-white/20 sticky top-0 z-30 transition-all shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex items-center cursor-pointer group" onClick={() => { setSelectedCompanyId(null); setCurrentView('dashboard'); }}>
                        <div className="flex-shrink-0 flex items-center transition-transform group-hover:scale-105">
                            <div className="bg-slate-900 text-[#FFC107] p-2 rounded-xl shadow-lg mr-3">
                              <LayoutGrid className="w-5 h-5" />
                            </div>
                            <div>
                              <span className="font-bold text-xl tracking-tight text-slate-900">AuditTrack</span>
                              <span className="text-xs block text-slate-600 font-medium">Atıksu Denetim Sistemi</span>
                            </div>
                        </div>
                    </div>

                    {/* View Switcher */}
                    {!selectedCompany && (
                        <div className="flex items-center space-x-1">
                            <button
                                onClick={() => setCurrentView('dashboard')}
                                className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                    currentView === 'dashboard' 
                                    ? 'bg-slate-900 text-white shadow-md' 
                                    : 'text-slate-600 hover:bg-slate-100'
                                }`}
                            >
                                <LayoutDashboard className="w-4 h-4 mr-2" />
                                Panel
                            </button>
                            <button
                                onClick={() => setCurrentView('analytics')}
                                className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                    currentView === 'analytics' 
                                    ? 'bg-slate-900 text-white shadow-md' 
                                    : 'text-slate-600 hover:bg-slate-100'
                                }`}
                            >
                                <BarChart3 className="w-4 h-4 mr-2" />
                                Analiz
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </nav>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {renderContent()}
        </main>
    </div>
  );
};

export default App;