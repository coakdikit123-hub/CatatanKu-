// api/puter-ocr.js
const axios = require('axios');
const FormData = require('form-data');

/**
 * OCR menggunakan OCR.space API
 * Gratis: 500 request/hari
 */
async function ocrStrukWithPuter(imageBuffer) {
  const OCR_API_KEY = process.env.OCR_API_KEY;
  
  if (!OCR_API_KEY) {
    throw new Error('OCR_API_KEY tidak diset. Tambahkan di Vercel Environment Variables.');
  }

  console.log('📸 Memproses gambar dengan OCR.space...');

  const formData = new FormData();
  formData.append('apikey', OCR_API_KEY);
  formData.append('file', imageBuffer, {
    filename: 'receipt.jpg',
    contentType: 'image/jpeg'
  });
  // Biarkan auto-detect language (tidak kirim parameter language)
  formData.append('isOverlayRequired', 'false');
  formData.append('OCREngine', '2'); // Engine lebih akurat

  try {
    const response = await axios.post('https://api.ocr.space/parse/image', formData, {
      headers: { ...formData.getHeaders() },
      timeout: 30000
    });

    const data = response.data;
    console.log('📡 OCR.space response:', data.IsErroredOnProcessing ? 'ERROR' : 'OK');

    if (data.IsErroredOnProcessing) {
      const errMsg = data.ErrorMessage || 'OCR.space gagal';
      console.error('❌ OCR.space error:', errMsg);
      throw new Error(`OCR.space: ${errMsg}`);
    }

    const text = data.ParsedResults?.[0]?.ParsedText || '';
    if (!text || text.trim().length < 3) {
      throw new Error('Tidak ada teks yang terbaca dari gambar');
    }

    console.log(`📝 OCR.space berhasil, ${text.length} karakter`);

    // Parse teks menjadi data terstruktur
    const parsed = parseOcrText(text);
    if (!parsed || !parsed.amount) {
      throw new Error('Tidak dapat mendeteksi jumlah transaksi');
    }

    return parsed;

  } catch (error) {
    console.error('❌ OCR error:', error.message);
    if (error.response) {
      console.error('📡 Response status:', error.response.status);
      console.error('📡 Response data:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

/**
 * Parsing teks OCR — DIPERBAIKI untuk berbagai format struk
 */
function parseOcrText(text) {
  if (!text || text.trim().length < 3) return null;

  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const fullText = text;

  // --- 1. Cari Grand Total dengan berbagai pola ---
  let grandTotal = null;

  const patterns = [
    /grand total\s*[:=]\s*Rp\s*([\d.,]+)/i,
    /grand total\s*[:=]\s*([\d.,]+)/i,
    /total\s*[:=]\s*Rp\s*([\d.,]+)/i,
    /total\s*[:=]\s*([\d.,]+)/i,
    /jumlah\s*[:=]\s*Rp\s*([\d.,]+)/i,
    /jumlah\s*[:=]\s*([\d.,]+)/i,
    /total bayar\s*[:=]\s*Rp\s*([\d.,]+)/i,
    /total bayar\s*[:=]\s*([\d.,]+)/i,
    /harus dibayar\s*[:=]\s*Rp\s*([\d.,]+)/i,
    /harus dibayar\s*[:=]\s*([\d.,]+)/i,
  ];

  for (const pattern of patterns) {
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

  // --- 2. Cari "HARGA JUAL" atau "DPP" (struk Indomaret/Alfamart) ---
  if (!grandTotal) {
    const hargaJualMatch = fullText.match(/harga jual\s*[:=]\s*([\d.,]+)/i);
    if (hargaJualMatch) {
      const raw = hargaJualMatch[1].replace(/\./g, '').replace(/,/g, '');
      const num = parseInt(raw);
      if (num > 0 && num < 999999999) {
        grandTotal = num;
      }
    }
  }

  if (!grandTotal) {
    const dppMatch = fullText.match(/dpp\s*[:=]\s*([\d.,]+)/i);
    if (dppMatch) {
      const raw = dppMatch[1].replace(/\./g, '').replace(/,/g, '');
      const num = parseInt(raw);
      if (num > 0 && num < 999999999) {
        grandTotal = num;
      }
    }
  }

  // --- 3. Fallback: ambil angka terbesar positif ---
  if (!grandTotal) {
    const allNums = fullText.match(/\d{1,3}(?:\.\d{3})*/g);
    if (allNums) {
      const nums = allNums
        .map(n => parseInt(n.replace(/\./g, '')))
        .filter(n => n > 0 && n < 999999999);
      if (nums.length > 0) {
        grandTotal = Math.max(...nums);
      }
    }
  }

  // --- 4. Cari Merchant ---
  let merchant = null;
  for (const line of lines.slice(0, 8)) {
    if (line.length > 3 && line.length < 80 &&
      !/\d/.test(line.replace(/[0-9,.]/g, '')) &&
      !/total|jumlah|bayar|kembali|kasir|terima|tanggal|disc|tax|pajak|ppn|grand|subtotal|pb1|qr|dpp|harga jual/i.test(line) &&
      line.length > 5 && !/^\d/.test(line)) {
      merchant = line;
      break;
    }
  }

  // --- 5. Cari Tanggal ---
  let date = null;
  const datePatterns = [
    /(\d{2})\/(\d{2})\/(\d{4})/,
    /(\d{2})-(\d{2})-(\d{4})/,
    /(\d{4})-(\d{2})-(\d{2})/,
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

  // --- 6. Cari Items ---
  const items = [];
  for (const line of lines) {
    if (line.length < 3) continue;
    if (/^(subtotal|total|grand|jumlah|pb1|pajak|tax|qr|bt|items|tanggal|date|kasir|cashier|dpp|harga jual)/i.test(line)) continue;
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

  // --- 7. Kategori ---
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

  // Jika merchant mengandung "Indomaret" atau "Alfamart", ubah kategori ke shopping
  if (merchant && /indomaret|alfamart/i.test(merchant)) {
    category = 'shopping';
  }

  // --- 8. Hasil ---
  const amount = grandTotal || (items.length > 0 ? items.reduce((s, i) => s + (i.price * i.quantity), 0) : null);

  return {
    amount: amount,
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
