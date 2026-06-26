// api/puter-ocr.js
// Menggunakan fetch langsung ke Puter API tanpa library ESM yang bermasalah

/**
 * OCR menggunakan Puter.js (gratis & unlimited) — via fetch API
 * @param {Buffer} imageBuffer - Buffer gambar
 * @returns {Promise<string>} - Hasil teks OCR
 */
async function ocrWithPuter(imageBuffer) {
  console.log('📸 Memproses gambar dengan Puter.js OCR...');

  try {
    // Konversi Buffer ke base64
    const base64Image = imageBuffer.toString('base64');
    const dataUrl = `data:image/jpeg;base64,${base64Image}`;

    // Kirim request ke Puter API endpoint yang sudah disediakan
    const response = await fetch('https://api.puter.com/v2/ocr', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: dataUrl,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log('📝 OCR berhasil, result:', result);

    // Ambil text dari response
    const text = result.text || result.result || '';
    return text;

  } catch (error) {
    console.error('❌ Puter OCR error:', error.message);
    throw error;
  }
}

/**
 * OCR dengan output JSON terstruktur (untuk struk)
 */
async function ocrStrukWithPuter(imageBuffer) {
  // 1. Dapatkan teks mentah dari Puter.js
  const rawText = await ocrWithPuter(imageBuffer);
  
  if (!rawText || rawText.trim().length < 3) {
    throw new Error('Tidak ada teks yang terbaca dari gambar');
  }

  console.log('📝 Raw OCR text:', rawText.substring(0, 500) + '...');

  // 2. Parse teks mentah menjadi data terstruktur
  const parsed = parseOcrText(rawText);

  if (!parsed || !parsed.amount) {
    throw new Error('Tidak dapat mendeteksi jumlah transaksi');
  }

  return parsed;
}

/**
 * Parsing teks OCR
 */
function parseOcrText(text) {
  if (!text || text.trim().length < 3) return null;

  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const fullText = text;

  // Cari Grand Total
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

  // Cari Merchant
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

  // Cari Tanggal
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

  // Cari Items
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

  // Kategori
  let category = 'other';
  const lowerText = fullText.toLowerCase();
  const keywords = {
    dining: ['makan', 'resto', 'restaurant', 'warung', 'cafe', 'kopi', 'sushi', 'pizza', 'burger', 'bakso', 'nasi', 'ayam', 'soto', 'mie', 'seafood'],
    shopping: ['belanja', 'shop', 'baju', 'sepatu', 'toko', 'mall', 'pakaian', 'fashion'],
    transport: ['transport', 'ojol', 'grab', 'gojek', 'bensin', 'pertamina', 'taxi', 'kereta'],
    bills: ['tagihan', 'listrik', 'pln', 'air', 'pdam', 'internet', 'telkom'],
    fun: ['hiburan', 'film', 'nonton', 'game', 'playstation', 'netflix'],
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
  ocrWithPuter,
  ocrStrukWithPuter
};
