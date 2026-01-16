import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot, query, orderBy } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
import { Company } from "../types";

// ------------------------------------------------------------------
// LÜTFEN AŞAĞIDAKİ BİLGİLERİ FIREBASE KONSOLUNDAN ALIP DOLDURUNUZ
// ------------------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyB_q3DkIfS4A_kzNDkclNvR-NpGqtFtR7I",
  authDomain: "audittrack-d0095.firebaseapp.com",
  projectId: "audittrack-d0095",
  storageBucket: "audittrack-d0095.firebasestorage.app",
  messagingSenderId: "598389355055",
  appId: "1:598389355055:web:c1c499633d9afa41358cda",
  measurementId: "G-YJV9YK317Y"
};

// Uygulama başlatma
// Eğer config girilmemişse hata vermesin diye kontrol ediyoruz, ama çalışmaz.
let db;
try {
    const app = initializeApp(firebaseConfig);
    const analytics = getAnalytics(app);
    db = getFirestore(app);
} catch (e) {
    console.error("Firebase başlatılamadı. Config ayarlarını services/firebase.ts dosyasında yaptığınızdan emin olun.", e);
}

const COLLECTION_NAME = "companies";

// --- Date Dönüştürücü Helper ---
// Firestore tarihleri Timestamp objesi olarak tutar, bunları JS Date objesine çevirmeliyiz.
const convertDates = (data: any): Company => {
    const convert = (val: any) => {
        if (val && typeof val === 'object' && 'seconds' in val) {
            return new Date(val.seconds * 1000); // Firestore Timestamp -> Date
        }
        if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) {
             return new Date(val); // ISO String -> Date
        }
        return val;
    };

    return {
        ...data,
        auditOpeningDate: convert(data.auditOpeningDate),
        deadlineDate: convert(data.deadlineDate),
        auditClosingDate: convert(data.auditClosingDate),
        lastUpdated: convert(data.lastUpdated) || new Date(),
    } as Company;
};

// --- Gerçek Zamanlı Dinleyici ---
export const subscribeToCompanies = (onUpdate: (companies: Company[]) => void) => {
    if (!db) return () => {};

    const q = query(collection(db, COLLECTION_NAME));
    
    // onSnapshot: Veritabanında değişiklik olduğunda anında tetiklenir
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const companies = snapshot.docs.map(doc => convertDates(doc.data()));
        // Tarihe göre sırala (Client tarafında sıralama yapmak daha kolay şu an için)
        companies.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());
        onUpdate(companies);
    }, (error) => {
        console.error("Veri okuma hatası:", error);
    });

    return unsubscribe;
};

// --- Ekleme / Güncelleme ---
export const saveCompanyToFirebase = async (company: Company) => {
    if (!db) {
        alert("Veritabanı bağlantısı yok. services/firebase.ts dosyasını kontrol edin.");
        return;
    }
    try {
        // ID'yi doküman adı olarak kullanıyoruz
        await setDoc(doc(db, COLLECTION_NAME, company.id), company);
    } catch (e) {
        console.error("Kaydetme hatası:", e);
        alert("Kaydedilemedi: " + e.message);
    }
};

// --- Silme ---
export const deleteCompanyFromFirebase = async (companyId: string) => {
    if (!db) return;
    try {
        await deleteDoc(doc(db, COLLECTION_NAME, companyId));
    } catch (e) {
        console.error("Silme hatası:", e);
    }
};
