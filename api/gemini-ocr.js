// api/gemini-ocr.js
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function ocrStrukWithGemini(imageBuffer) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY tidak ditemukan di environment variables');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });

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

    // Bersihkan response
    let jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    const parsed = JSON.parse(jsonStr);

    const resultObj = {
      merchant: parsed.merchant || 'Toko',
      date: parsed.date || new Date().toISOString().slice(0, 10),
      items: parsed.items || [],
      grandTotal: Number(parsed.grandTotal) || Number(parsed.amount) || 0,
      amount: Number(parsed.amount) || Number(parsed.grandTotal) || 0,
      category: parsed.category || 'other'
    };

    return resultObj;
  } catch (error) {
    console.error('❌ Gemini OCR error:', error.message);
    throw new Error('Gagal memproses gambar dengan Gemini: ' + error.message);
  }
}

module.exports = { ocrStrukWithGemini };
