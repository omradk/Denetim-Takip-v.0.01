import React, { useState, useEffect } from 'react';
import { Company, DocStatus, DischargeType, getRequiredDocuments, CompanyStatus } from './types';
import { Dashboard } from './components/Dashboard';
import { CompanyDetail } from './components/CompanyDetail';
import { Analytics } from './components/Analytics';
import { LayoutGrid, BarChart3, LayoutDashboard, Database } from 'lucide-react';
import { subscribeToCompanies, saveCompanyToFirebase, deleteCompanyFromFirebase } from './services/firebase';

type ViewState = 'dashboard' | 'analytics';

const App: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [isLoading, setIsLoading] = useState(true);

  // Firebase'den verileri dinle
  useEffect(() => {
    const unsubscribe = subscribeToCompanies((updatedCompanies) => {
      setCompanies(updatedCompanies);
      setIsLoading(false);
    });

    // Cleanup function
    return () => unsubscribe();
  }, []);

  const handleAddCompany = (name: string, email: string, auditId: string, openingDate: Date, deadlineDate: Date) => {
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
    
    // Firebase'e kaydet (UI, listener sayesinde otomatik güncellenecek)
    saveCompanyToFirebase(newCompany);
  };

  const handleUpdateCompany = (updatedCompany: Company) => {
    // Firebase'e güncelle
    saveCompanyToFirebase(updatedCompany);
  };

  const handleDeleteCompany = (id: string) => {
    if (confirm('Bu firmayı silmek istediğinize emin misiniz?')) {
        deleteCompanyFromFirebase(id);
        if (selectedCompanyId === id) setSelectedCompanyId(null);
    }
  };

  // Seçili firmayı companies listesinden canlı olarak bul (güncellemeleri görmek için)
  const selectedCompany = companies.find(c => c.id === selectedCompanyId);

  // Render logic based on state
  const renderContent = () => {
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
                <p className="mt-4 text-slate-600 font-medium">Veriler yükleniyor...</p>
                <p className="text-xs text-slate-400 mt-2">Firebase bağlantısı bekleniyor</p>
            </div>
        );
    }

    if (selectedCompanyId && selectedCompany) {
      return (
        <CompanyDetail 
          company={selectedCompany} 
          onUpdate={handleUpdateCompany}
          onBack={() => setSelectedCompanyId(null)}
        />
      );
    } else if (selectedCompanyId && !selectedCompany) {
        // Silinmişse veya bulunamazsa
        setSelectedCompanyId(null);
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
                              <span className="text-xs flex items-center text-slate-600 font-medium">
                                <Database className="w-3 h-3 mr-1 text-emerald-600" />
                                Canlı Veri Sistemi
                              </span>
                            </div>
                        </div>
                    </div>

                    {/* View Switcher */}
                    {!selectedCompanyId && (
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
