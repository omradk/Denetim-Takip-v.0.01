import { GoogleGenAI } from "@google/genai";
import { Company, DocStatus } from "../types";

export const generateFollowUpEmail = async (company: Company): Promise<string> => {
  if (!process.env.API_KEY) {
    return "Hata: API Anahtarı bulunamadı.";
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const missingDocs = company.documents.filter(d => d.status === DocStatus.PENDING || d.status === DocStatus.ISSUE);
  
  if (missingDocs.length === 0) {
    return "Tüm belgeler tamamlanmış görünüyor. Hatırlatma mailine gerek yok.";
  }

  const docListString = missingDocs.map(d => {
    let statusNote = "";
    if (d.status === DocStatus.ISSUE) {
      statusNote = d.notes ? `(Hata Notu: ${d.notes})` : "(Belge hatalı veya eksik gönderilmiş)";
    }
    // Include Finding if present
    if (d.finding) {
        statusNote += ` - Tespit: ${d.finding}`;
    }
    return `- ${d.name}: ${d.description} ${statusNote}`;
  }).join("\n");

  const prompt = `
    Sen profesyonel bir denetim asistanısın. Aşağıdaki bilgilere göre bir firmaya atıksu denetimi için eksik belgeleri isteyen kibar, resmi ve Türkçe bir e-posta taslağı hazırla.

    Firma Adı: ${company.name}
    Tesis Deşarj Tipi: ${company.dischargeType} ${company.isLowVolume ? '(<15 m3/gün - Düşük Kapasite)' : ''}
    Konu: Inditex Atıksu Analizi - Eksik Belge Bildirimi
    
    Durum: Firma belirtilen deşarj tipine göre denetlenmektedir. Aşağıdaki belgeler henüz teslim edilmedi veya gönderilenlerde sorun var. Lütfen bunları net bir şekilde listele ve en kısa sürede iletmelerini rica et.

    Eksik/Hatalı Belgeler Listesi:
    ${docListString}

    E-posta sadece metin gövdesini içermeli, konu satırını en başa yaz.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    
    return response.text || "Taslak oluşturulamadı.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Hata: Taslak oluşturulurken bir sorun oluştu. Lütfen daha sonra tekrar deneyin.";
  }
};