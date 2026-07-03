const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================
// KONFIGURASI
// ============================================================
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash-lite';

if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY tidak ditemukan!');
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// ============================================================
// MIDDLEWARE
// ============================================================
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// Konfigurasi multer untuk upload file
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Format file tidak didukung. Gunakan JPG, PNG, atau WEBP.'));
    }
  }
});

// ============================================================
// STORAGE SEDERHANA (In-Memory)
// ============================================================
let transactions = [];
let balances = { total: 0 };

// ============================================================
// SYSTEM PROMPT (Terinspirasi dari vermaysha/finance)
// ============================================================
const SYSTEM_PROMPT = `
Role: Kamu adalah asisten akuntan pribadi yang cerdas.

Tugas Utama:
1. Analisis input user (teks/gambar).
2. Tentukan apakah input tersebut adalah DATA TRANSAKSI (catatan keuangan/struk) atau PERCAKAPAN BIASA.
3. Jika gambar struk, ekstrak semua item yang dibeli dengan detail.

Output Wajib JSON dengan skema berikut:
{
  "is_transaction": boolean,
  "reply_text": "string",
  "transaction_data": {
    "type": "PENGELUARAN" | "PEMASUKAN",
    "category": "string",
    "amount": number,
    "date": "YYYY-MM-DD",
    "description": "string",
    "merchant_or_sender": "string",
    "items": [
      { "name": "string", "price": number, "qty": number }
    ]
  }
}

ATURAN KATEGORI:
- Makanan & Minuman: restoran, cafe, warung, kopi, nasi, ayam, soto, mie
- Transportasi: bensin, ojol, grab, gojek, taxi, kereta
- Tagihan & Langganan: listrik, air, internet, netflix, spotify
- Kesehatan & Perawatan: obat, dokter, apotek, vitamin
- Belanja & Gaya Hidup: baju, sepatu, gadget, toko, mall
- Gaji & Tunjangan: gaji, bonus, thr
- Lainnya: jika tidak masuk kategori di atas

Contoh Output:
{
  "is_transaction": true,
  "reply_text": "✅ Transaksi berhasil dicatat! Belanja di Indomaret sebesar Rp 97.500",
  "transaction_data": {
    "type": "PENGELUARAN",
    "category": "Belanja & Gaya Hidup",
    "amount": 97500,
    "date": "2026-06-26",
    "description": "Belanja di Indomaret",
    "merchant_or_sender": "Indomaret",
    "items": [
      { "name": "RICE BOWL SPICY", "price": 30910, "qty": 2 },
      { "name": "CHICKEN KATSU", "price": 15000, "qty": 1 }
    ]
  }
}
`;

// ============================================================
// FUNGSI ANALISIS AI
// ============================================================
async function analyzeWithAI(input) {
  const contents = [];

  // Jika input adalah gambar (base64)
  if (input.image) {
    contents.push({
      inlineData: {
        mimeType: input.mimeType || 'image/jpeg',
        data: input.image
      }
    });
    contents.push({ text: input.message || 'Analisis gambar ini dan ekstrak data transaksi.' });
  } else if (input.text) {
    contents.push({ text: input.text });
  } else {
    throw new Error('Tidak ada input yang valid');
  }

  // Tambahkan konteks transaksi terakhir (jika ada)
  let context = SYSTEM_PROMPT;
  if (transactions.length > 0) {
    const last5 = transactions.slice(-5);
    context += `\n\nTransaksi terakhir:\n${last5.map(t => 
      `- ${t.date} ${t.type} Rp${t.amount.toLocaleString()} ${t.description}`
    ).join('\n')}`;
  }
  context += `\n\nTotal saldo saat ini: Rp${balances.total.toLocaleString()}`;

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: contents,
      config: {
        systemInstruction: context,
        responseMimeType: 'application/json',
      },
    });

    const result = response.text;
    if (!result) return null;
    return JSON.parse(result);
  } catch (error) {
    console.error('❌ AI Error:', error.message);
    throw error;
  }
}

// ============================================================
// API ENDPOINTS
// ============================================================

// 1. Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    gemini_model: GEMINI_MODEL,
    gemini_key_set: !!GEMINI_API_KEY,
    transactions_count: transactions.length,
    balance: balances.total
  });
});

// 2. Analisis Teks
app.post('/api/analyze/text', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const result = await analyzeWithAI({ text });
    res.json(result);
  } catch (error) {
    console.error('❌ Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 3. Analisis Gambar (OCR)
app.post('/api/analyze/image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required' });
    }

    const imageBase64 = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype;
    const message = req.body.message || 'Analisis gambar ini dan ekstrak data transaksi.';

    const result = await analyzeWithAI({
      image: imageBase64,
      mimeType: mimeType,
      message: message
    });

    // Jika hasil adalah transaksi, simpan
    if (result && result.is_transaction && result.transaction_data) {
      const tx = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        ...result.transaction_data,
        created_at: new Date().toISOString()
      };
      transactions.push(tx);
      
      // Update saldo
      if (tx.type === 'PEMASUKAN') {
        balances.total += tx.amount;
      } else if (tx.type === 'PENGELUARAN') {
        balances.total -= tx.amount;
      }
    }

    res.json(result);
  } catch (error) {
    console.error('❌ Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 4. Analisis Gambar (Base64)
app.post('/api/analyze/image-base64', async (req, res) => {
  try {
    const { image, mimeType, message } = req.body;
    if (!image) {
      return res.status(400).json({ error: 'Image base64 is required' });
    }

    const result = await analyzeWithAI({
      image: image,
      mimeType: mimeType || 'image/jpeg',
      message: message || 'Analisis gambar ini dan ekstrak data transaksi.'
    });

    if (result && result.is_transaction && result.transaction_data) {
      const tx = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        ...result.transaction_data,
        created_at: new Date().toISOString()
      };
      transactions.push(tx);
      
      if (tx.type === 'PEMASUKAN') {
        balances.total += tx.amount;
      } else if (tx.type === 'PENGELUARAN') {
        balances.total -= tx.amount;
      }
    }

    res.json(result);
  } catch (error) {
    console.error('❌ Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 5. Get All Transactions
app.get('/api/transactions', (req, res) => {
  const sorted = [...transactions].sort((a, b) => 
    b.date?.localeCompare(a.date) || b.created_at?.localeCompare(a.created_at) || 0
  );
  res.json({
    transactions: sorted,
    total: balances.total,
    count: transactions.length
  });
});

// 6. Delete Transaction
app.delete('/api/transactions/:id', (req, res) => {
  const id = req.params.id;
  const index = transactions.findIndex(t => t.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Transaction not found' });
  }
  
  const tx = transactions[index];
  if (tx.type === 'PEMASUKAN') {
    balances.total -= tx.amount;
  } else if (tx.type === 'PENGELUARAN') {
    balances.total += tx.amount;
  }
  
  transactions.splice(index, 1);
  res.json({ success: true });
});

// 7. Clear All Transactions
app.delete('/api/transactions', (req, res) => {
  transactions = [];
  balances.total = 0;
  res.json({ success: true });
});

// ============================================================
// START SERVER
// ============================================================
app.listen(PORT, () => {
  console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
  console.log(`🤖 Model Gemini: ${GEMINI_MODEL}`);
  console.log(`🔑 API Key: ${GEMINI_API_KEY ? '✅ Tersedia' : '❌ Tidak ada'}`);
});
