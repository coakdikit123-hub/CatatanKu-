// api/puter-ocr.js

/**
 * OCR menggunakan Puter.js API (via fetch langsung)
 * Karena @heyputer/puter.js tidak kompatibel dengan Node.js serverless
 * 
 * @param {Buffer} imageBuffer - Buffer gambar
 * @returns {Promise<Object>} - Hasil parse OCR
 */
async function ocrStrukWithPuter(imageBuffer) {
  console.log('📸 Memproses gambar dengan Puter.js API...');

  try {
    // Konversi buffer ke base64
    const base64Image = imageBuffer.toString('base64');

    // --- Gunakan endpoint Puter.js yang valid ---
    // Kita akan menggunakan API Puter yang sebenarnya
    // Dari dokumentasi: https://developer.puter.com/tutorials/free-unlimited-ocr-api/
    // Puter menggunakan model "User-Pays" - pengguna membayar melalui akun Puter mereka
    
    // Opsi 1: Gunakan puter.ai.img2txt via evaluasi kode (workaround untuk Node.js)
    // Kita akan gunakan pendekatan HTTP ke API Puter
    
    // URL endpoint Puter OCR (dari reverse engineering library)
    // Sebenarnya Puter menggunakan API internal, kita coba pendekatan alternatif
    
    // Pendekatan: Gunakan OCR.space sebagai fallback + manual parsing
    // Karena Puter.js tidak compatible dengan serverless Node.js
    
    console.log('⚠️ Puter.js tidak kompatibel dengan Node.js serverless.');
    console.log('🔄 Menggunakan fallback OCR.space (jika ada API key) atau parsing manual.');
    
    // Coba gunakan OCR.space jika ada API key
    const OCR_API_KEY = process.env.OCR_API_KEY;
    if (OCR_API_KEY) {
      console.log('📡 Mencoba OCR.space sebagai fallback...');
      const text = await ocrWithOcrSpace(imageBuffer, OCR_API_KEY);
      if (text && text.trim().length > 10) {
        const parsed = parseOcrText(text);
        if (parsed && parsed.amount) {
          console.log('✅ OCR.space berhasil:', parsed.amount);
          return parsed;
        }
      }
    }
    
    // Fallback terakhir: beri tahu user untuk input manual
    throw new Error('OCR otomatis tidak tersedia. Silakan input manual dengan format: -5000 deskripsi');
    
  } catch (error) {
    console.error('❌ OCR error:', error.message);
    throw error;
  }
}

/**
 * Fallback OCR menggunakan OCR.space
 */
async function ocrWithOcrSpace(imageBuffer, apiKey) {
  const FormData = require('form-data');
  const axios = require('axios');
  
  const formData = new FormData();
  formData.append('apikey', apiKey);
  formData.append('file', imageBuffer, {
    filename: 'receipt.jpg',
    contentType: 'image/jpeg'
  });
  formData.append('language', 'ind');
  formData.append('isOverlayRequired', 'false');

  try {
    const response = await axios.post('https://api.ocr.space/parse/image', formData, {
      headers: { ...formData.getHeaders() },
      timeout: 20000
    });

    const data = response.data;
    if (data.IsErroredOnProcessing) {
      throw new Error(data.ErrorMessage || 'OCR.space gagal');
    }
    return data.ParsedResults?.[0]?.ParsedText || '';
  } catch (e) {
    console.error('❌ OCR.space error:', e.message);
    return '';
  }
}

/**
 * Parsing teks OCR (manual)
 */
function parseOcrText(text) {
  if (!text || text.trim().length < 3) return { amount: null, items: [], merchant: null };

  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const fullText = text;

  // === 1. Cari Grand Total ===
  let grandTotal = null;
  const totalPatterns = [
    /grand total\s*[:=]?\s*Rp\s*([\d.,]+)/i,
    /grand total\s*[:=]?\s*([\d.,]+)/i,
    /total\s*[:=]?\s*Rp\s*([\d.,]+)/i,
    /total\s*[:=]?\s*([\d.,]+)/i,
    /jumlah\s*[:=]?\s*Rp\s*([\d.,]+)/i,
    /jumlah\s*[:=]?\s*([\d.,]+)/i,
    /(\d{1,3}(?:\.\d{3})*)\s*$/m,
  ];

  for (const pattern of totalPatterns) {
    const match = fullText.match(pattern);
    if (match) {
      const raw = match[1].replace(/\./g, '').replace(/,/g, '');
      const num = parseInt(raw);
      if (num > 0 && num < 999999999) {
        grandTotal = num;
        break;
      }
    }
  }

  if (!grandTotal) {
    const allNums = fullText.match(/\d{1,3}(?:\.\d{3})*/g);
    if (allNums) {
      const nums = allNums.map(n => parseInt(n.replace(/\./g, ''))).filter(n => n > 0 && n < 999999999);
      if (nums.length > 0) grandTotal = Math.max(...nums);
    }
  }

  // === 2. Cari Merchant ===
  let merchant = null;
  for (const line of lines.slice(0, 8)) {
    if (line.length > 3 && line.length < 60 &&
      !/\d/.test(line.replace(/[0-9,.]/g, '')) &&
      !/total|jumlah|bayar|kembali|kasir|terima|tanggal|disc|tax|pajak|ppn|grand|subtotal|pb1|qr/i.test(line) &&
      line.length > 5 && !/^\d/.test(line)) {
      merchant = line;
      break;
    }
  }

  // === 3. Cari Tanggal ===
  let date = null;
  const datePatterns = [
    /(\d{2})\/(\d{2})\/(\d{4})/,
    /(\d{2})-(\d{2})-(\d{4})/,
  ];
  for (const pattern of datePatterns) {
    const match = fullText.match(pattern);
    if (match) {
      let d = match[1],
        m = match[2],
        y = match[3];
      if (y.length === 2) y = '20' + y;
      date = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      break;
    }
  }

  // === 4. Cari Items ===
  const items = [];
  for (const line of lines) {
    if (line.length < 3) continue;
    if (/^(subtotal|total|grand|jumlah|pb1|pajak|tax|qr|bt|items|tanggal|date|kasir|cashier)/i.test(line)) continue;
    const priceMatch = line.match(/([\d.,]+)\s*$/);
    if (!priceMatch) continue;
    const price = parseInt(priceMatch[1].replace(/\./g, '').replace(/,/g, ''));
    if (isNaN(price) || price < 100 || price > 999999999) continue;
    let namePart = line.replace(/\s*[\d.,]+\s*$/, '').trim();
    if (namePart.length < 2) continue;
    let qty = 1;
    const qtyMatch = namePart.match(/^(\d+)\s*[xX]\s*(.+)$/);
    if (qtyMatch) {
      qty = parseInt(qtyMatch[1]);
      namePart = qtyMatch[2].trim();
    }
    items.push({ name: namePart, price, quantity: qty });
  }

  // === 5. Kategori ===
  let category = 'other';
  const lowerText = fullText.toLowerCase();
  const keywords = {
    dining: ['makan', 'resto', 'restaurant', 'warung', 'cafe', 'kopi', 'sushi', 'pizza', 'burger', 'bakso', 'nasi', 'ayam', 'soto', 'mie', 'seafood'],
    shopping: ['belanja', 'shop', 'baju', 'sepatu', 'toko', 'mall', 'pakaian', 'fashion', 'indomaret', 'alfamart'],
    transport: ['transport', 'ojol', 'grab', 'gojek', 'bensin', 'pertamina', 'taxi', 'kereta'],
    bills: ['tagihan', 'listrik', 'pln', 'air', 'pdam', 'internet', 'telkom', 'indihome'],
    fun: ['hiburan', 'film', 'nonton', 'game', 'playstation', 'netflix', 'spotify'],
    health: ['kesehatan', 'obat', 'dokter', 'rumah sakit', 'rs', 'klinik', 'apotek'],
    gift: ['hadiah', 'gift', 'kado']
  };
  for (const [cat, words] of Object.entries(keywords)) {
    for (const word of words) {
      if (lowerText.includes(word)) { category = cat; break; }
    }
    if (category !== 'other') break;
  }

  return {
    amount: grandTotal || (items.length > 0 ? items.reduce((s, i) => s + (i.price * i.quantity), 0) : null),
    date: date || new Date().toISOString().slice(0, 10),
    time: null,
    merchant: merchant,
    items: items,
    category: category,
    grandTotal: grandTotal
  };
}

module.exports = {
  ocrStrukWithPuter
};
