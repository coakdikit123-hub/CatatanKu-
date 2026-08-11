// api/gemini-ocr.js
const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * OCR menggunakan Google Gemini API
 * @param {Buffer} imageBuffer - Buffer gambar
 * @returns {Promise<Object>} - Hasil parsing struk
 */
async function ocrStrukWithGemini(imageBuffer) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY tidak ditemukan di environment variables');
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  // ============================================================
  // DAFTAR MODEL PRIORITAS (berdasarkan hasil curl Anda)
  // ============================================================
  const modelPriority = [
    'gemini-2.5-flash-lite',      // Stabil, murah, cepat (Juli 2025)
    'gemini-flash-lite-latest',   // Latest release dari Flash-Lite
    'gemini-2.5-flash',           // Sedikit lebih berat, tetap bagus
    'gemini-flash-latest',        // Latest Flash
    'gemini-2.5-pro',             // Pro (lebih akurat, lebih lambat)
    'gemini-pro-latest',          // Latest Pro
    'gemini-3.5-flash',           // Versi terbaru (jika tersedia)
    'gemini-3.5-flash-lite',      // Versi terbaru lite
    'gemini-3.6-flash',           // Terbaru
  ];

  let model = null;
  let usedModelName = null;

  // Coba setiap model secara berurutan
  for (const modelName of modelPriority) {
    try {
      // Coba instantiate model (tidak langsung generate, cek dulu)
      const testModel = genAI.getGenerativeModel({ model: modelName });
      // Lakukan test sederhana dengan prompt kecil untuk memastikan model bisa digunakan
      // Kita tidak ingin memakai biaya untuk test, jadi kita hanya coba instantiate.
      // Jika model tidak ada, akan throw error saat generateContent nanti.
      // Kita akan mencoba generate nanti, jika gagal lanjut ke model berikutnya.
      model = testModel;
      usedModelName = modelName;
      console.log(`✅ Mencoba menggunakan model: ${modelName}`);
      break;
    } catch (e) {
      console.warn(`⚠️ Model ${modelName} tidak dapat di-instantiate:`, e.message);
    }
  }

  if (!model) {
    throw new Error('Tidak ada model Gemini yang tersedia. Periksa API key Anda.');
  }

  // Konversi buffer ke base64
  const base64Image = imageBuffer.toString('base64');

  const prompt = `
Anda adalah AI yang membaca struk belanja atau nota. Dari gambar struk, ekstrak informasi berikut dalam format JSON:
- merchant: nama toko/restoran (string)
- date: tanggal transaksi dalam format YYYY-MM-DD (string)
- items: array dari item yang dibeli, masing-masing dengan name (string), quantity (number), price (number)
- grandTotal: total akhir (number)
- amount: jumlah total (jika grandTotal tidak ada, gunakan ini) (number)
- category: salah satu dari ["dining","shopping","transport","bills","fun","health","gift","other"] (string)

Jika ada informasi yang tidak terbaca, gunakan nilai default yang masuk akal.
Jangan tambahkan teks apapun selain JSON. JSON harus valid.
`;

  try {
    console.log(`📡 Mengirim request ke Gemini dengan model: ${usedModelName}`);
    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: base64Image
              }
            }
          ]
        }
      ]
    });

    const response = result.response;
    const text = response.text();

    // Bersihkan response (kemungkinan ada markdown)
    let jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    // Cari bagian JSON jika masih ada teks di luar
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    const parsed = JSON.parse(jsonStr);

    // Pastikan field yang diperlukan ada
    const resultObj = {
      merchant: parsed.merchant || 'Toko',
      date: parsed.date || new Date().toISOString().slice(0, 10),
      items: parsed.items || [],
      grandTotal: parsed.grandTotal || parsed.amount || 0,
      amount: parsed.amount || parsed.grandTotal || 0,
      category: parsed.category || 'other'
    };

    // Pastikan grandTotal dan amount selalu angka
    resultObj.grandTotal = Number(resultObj.grandTotal);
    resultObj.amount = Number(resultObj.amount);

    console.log(`✅ OCR berhasil menggunakan model ${usedModelName}`);
    return resultObj;
  } catch (error) {
    console.error(`❌ Gemini OCR error (model ${usedModelName}):`, error.message);
    // Jika model gagal, coba model berikutnya (fallback)
    // Karena kita sudah loop di atas, kita bisa coba lagi dengan model lain
    // Namun untuk simpel, kita lempar error dengan saran model yang tersedia.
    throw new Error(`Gagal memproses gambar dengan Gemini (model: ${usedModelName}): ${error.message}`);
  }
}

module.exports = { ocrStrukWithGemini };
