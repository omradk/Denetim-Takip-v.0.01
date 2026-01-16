export enum DocStatus {
  PENDING = 'PENDING',
  RECEIVED = 'RECEIVED',
  ISSUE = 'ISSUE',
  NA = 'NA'
}

export enum DischargeType {
  DIRECT = 'Direct Discharge',
  INDIRECT_PRE = 'Indirect with Pre-treatment',
  ZLD = 'Zero Liquid Discharge (ZLD)',
  INDIRECT_NO_PRE = 'Indirect without Pre-treatment',
  INDIRECT_PRE_NO_SLUDGE = 'Indirect with Pre-treatment without Sludge',
  NO_DISCHARGE = 'No discharge'
}

export enum CompanyStatus {
  NO_DOCS = 'NO_DOCS',
  MISSING_SHARED = 'MISSING_SHARED',
  READY_TO_CLOSE = 'READY_TO_CLOSE',
  CLOSED = 'CLOSED'
}

export interface DocumentItem {
  id: string;
  name: string;
  description: string;
  status: DocStatus;
  notes?: string; // Internal notes
  finding?: string; // Audit Finding
  correctiveAction?: string; // Audit Corrective Action
}

export interface Company {
  id: string;
  auditId?: string;
  name: string;
  email: string;
  dischargeType: DischargeType;
  status: CompanyStatus; // New overall status
  isLowVolume: boolean;
  documents: DocumentItem[];
  auditOpeningDate: Date; // When the audit started
  deadlineDate?: Date; // Deadline for document submission
  auditClosingDate?: Date; // When the audit was closed
  lastUpdated: Date;
}

export const STATUS_LABELS: Record<DocStatus, string> = {
  [DocStatus.PENDING]: 'Bekliyor',
  [DocStatus.RECEIVED]: 'Tamamlandı',
  [DocStatus.ISSUE]: 'Eksik/Hatalı',
  [DocStatus.NA]: 'Muaf / Yok'
};

export const STATUS_COLORS: Record<DocStatus, string> = {
  [DocStatus.PENDING]: 'bg-gray-100 text-gray-600 border-gray-200',
  [DocStatus.RECEIVED]: 'bg-green-100 text-green-700 border-green-200',
  [DocStatus.ISSUE]: 'bg-red-100 text-red-700 border-red-200',
  [DocStatus.NA]: 'bg-blue-50 text-blue-600 border-blue-100'
};

export const COMPANY_STATUS_LABELS: Record<CompanyStatus, string> = {
  [CompanyStatus.NO_DOCS]: 'Hiç Evrak İletilmedi',
  [CompanyStatus.MISSING_SHARED]: 'Eksik Evrak Paylaşıldı',
  [CompanyStatus.READY_TO_CLOSE]: 'Kapatılmaya Hazır',
  [CompanyStatus.CLOSED]: 'Denetim Kapatıldı'
};

export const COMPANY_STATUS_COLORS: Record<CompanyStatus, string> = {
  [CompanyStatus.NO_DOCS]: 'bg-slate-100 text-slate-600 border-slate-200',
  [CompanyStatus.MISSING_SHARED]: 'bg-orange-50 text-orange-700 border-orange-200',
  [CompanyStatus.READY_TO_CLOSE]: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  [CompanyStatus.CLOSED]: 'bg-emerald-50 text-emerald-700 border-emerald-200'
};

// Master definition of all possible documents to ensure consistency
const MASTER_DOCS: Record<string, { name: string, description: string }> = {
  '1.1': { name: '1.1 Atıksu Bağlantı İzin Belgesi', description: 'İlgili kurumdan alınmış geçerli bağlantı izni.' },
  '1.1_DIRECT': { name: '1.1 Atıksu Deşarj İzin Belgesi', description: 'Direct discharge ise AAT Kimlik Belgesi zorunludur.' },
  '1.1_GSM': { name: '1.1 GSMR Görüşü', description: 'Atıksuyun evsel nitelikli olduğuna dair resmi görüş.' },
  '1.2': { name: '1.2 Atıksu Deşarj Kayıtları', description: 'Düzenli deşarj kayıtları (Opsiyonel).' },
  '1.2_MANDATORY': { name: '1.2 Atıksu Deşarj Kayıtları', description: 'Düzenli deşarj kayıtları (Zorunlu - <15m3 olduğu için).' },
  '1.3': { name: '1.3 ZDHC Gateway "Waterdata"', description: 'Gateway Waterdata ekran görüntüsü (Genel).' },
  '1.4': { name: '1.4 ZDHC Gateway "Waterdata"', description: 'Gateway Waterdata ekran görüntüsü (Detay).' },
  '1.6': { name: '1.6 Periyodik Atık Su Analiz Raporları', description: 'Son 12 aya ait, yasal limitlere göre yapılmış raporlar.' },
  '1.8': { name: '1.8 Periyodik Atık Su Analiz Raporları', description: 'Son 12 aya ait, yasal limitlere göre yapılmış raporlar.' },
  '2.3': { name: '2.3 Çamur Bertaraf Yolu Beyannamesi', description: 'Oluşan arıtma çamurunun nasıl bertaraf edildiğine dair beyan.' },
  '2.4': { name: '2.4 Bertaraf Firması Sözleşmesi', description: 'Bertaraf firması ile tesis arasındaki anlaşma, MoTAT kayıtları vb.' },
  'EXTRA_PARAMS': { name: 'Ek Parametre Muafiyet Beyanı', description: 'Yasal olarak zorunlu olmasına rağmen test edilmeyen parametreler (ZSF, Fenol vb.) için beyan.' },
};

// Helper to create a doc item
const createDoc = (id: string, definitionKey: string, overrideDesc?: string): DocumentItem => ({
  id,
  name: MASTER_DOCS[definitionKey].name,
  description: overrideDesc || MASTER_DOCS[definitionKey].description,
  status: DocStatus.PENDING,
  notes: '',
  finding: '',
  correctiveAction: ''
});

// Logic engine to determine required documents
export const getRequiredDocuments = (type: DischargeType, isLowVolume: boolean): DocumentItem[] => {
  const docs: DocumentItem[] = [];

  // Helper to add legal parameter note to analysis reports
  const legalParamNote = "\n(Yasal olarak zorunlu olmasına rağmen test ettirmediğiniz parametreler varsa beyan mektubu eklenmelidir).";

  // CASE: Low Volume (< 15m3/day) Special Logic
  if (isLowVolume) {
    if (type === DischargeType.INDIRECT_PRE) {
      docs.push(createDoc('1.1', '1.1'));
      docs.push(createDoc('1.2', '1.2_MANDATORY'));
      docs.push(createDoc('1.8', '1.8', MASTER_DOCS['1.8'].description + legalParamNote));
      return docs;
    }
    
    if (type === DischargeType.ZLD) {
      docs.push(createDoc('1.1', '1.1'));
      docs.push(createDoc('1.2', '1.2_MANDATORY'));
      return docs;
    }

    if (type === DischargeType.INDIRECT_NO_PRE || type === DischargeType.INDIRECT_PRE_NO_SLUDGE) {
      docs.push(createDoc('1.1', '1.1'));
      docs.push(createDoc('1.2', '1.2_MANDATORY'));
      docs.push(createDoc('1.8', '1.8', MASTER_DOCS['1.8'].description + legalParamNote));
      return docs;
    }
    
    // Fallback for other types if low volume is selected but not explicitly defined in prompt:
    // We will use standard logic but maybe warn user, or just treat as standard. 
    // Assuming standard logic applies for Direct/NoDischarge if <15m3 wasn't specified as special exception.
  }

  // CASE: Standard Volume Logic (>= 15m3 or types without low-vol exceptions)
  
  if (type === DischargeType.DIRECT) {
    docs.push(createDoc('1.1', '1.1_DIRECT'));
    docs.push(createDoc('1.2', '1.2'));
    docs.push(createDoc('1.3', '1.3'));
    docs.push(createDoc('1.4', '1.4'));
    docs.push(createDoc('1.6', '1.6', MASTER_DOCS['1.6'].description + legalParamNote));
    docs.push(createDoc('2.3', '2.3'));
    docs.push(createDoc('2.4', '2.4'));
  } 
  else if (type === DischargeType.INDIRECT_PRE) {
    docs.push(createDoc('1.1', '1.1'));
    docs.push(createDoc('1.2', '1.2'));
    docs.push(createDoc('1.3', '1.3'));
    docs.push(createDoc('1.4', '1.4'));
    docs.push(createDoc('1.8', '1.8', MASTER_DOCS['1.8'].description + legalParamNote));
    docs.push(createDoc('2.3', '2.3'));
    docs.push(createDoc('2.4', '2.4'));
  }
  else if (type === DischargeType.ZLD) {
    docs.push(createDoc('1.1', '1.1'));
    docs.push(createDoc('1.2', '1.2'));
    docs.push(createDoc('1.3', '1.3'));
    docs.push(createDoc('1.4', '1.4'));
    docs.push(createDoc('1.8', '1.8', MASTER_DOCS['1.8'].description + legalParamNote));
    docs.push(createDoc('2.3', '2.3'));
    docs.push(createDoc('2.4', '2.4'));
  }
  else if (type === DischargeType.INDIRECT_NO_PRE || type === DischargeType.INDIRECT_PRE_NO_SLUDGE) {
    docs.push(createDoc('1.1', '1.1'));
    docs.push(createDoc('1.2', '1.2'));
    docs.push(createDoc('1.3', '1.3'));
    docs.push(createDoc('1.4', '1.4'));
    docs.push(createDoc('1.8', '1.8', MASTER_DOCS['1.8'].description + legalParamNote));
  }
  else if (type === DischargeType.NO_DISCHARGE) {
    docs.push(createDoc('1.1', '1.1_GSM'));
  }

  return docs;
};