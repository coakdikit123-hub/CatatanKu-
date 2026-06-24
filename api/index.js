const express = require('express');
const cors = require('cors');
const { Telegraf } = require('telegraf');
const { kv } = require('@vercel/kv');
const axios = require('axios');
const Tesseract = require('tesseract.js');

const app = express();
app.use(cors());
app.use(express.json());

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'admin123';

// ============================================================
// KONFIGURASI API AI OCR (opsional)
// ============================================================
const GOOGLE_CLOUD_API_KEY = process.env.GOOGLE_CLOUD_API_KEY || '';
const AZURE_OCR_ENDPOINT = process.env.AZURE_OCR_ENDPOINT || '';
const AZURE_OCR_KEY = process.env.AZURE_OCR_KEY || '';

console.log('🔍 BOT_TOKEN exists?', !!BOT_TOKEN);
if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN tidak ditemukan!');
}

// ============================================================
// USER MANAGEMENT
// ============================================================
async function registerUser(userId) {
  const key = `user:${userId}`;
  try {
    const existing = await kv.get(key);
    if (existing) return existing;
    const userData = {
      userId,
      registeredAt: new Date().toISOString(),
      isActive: true
    };
    await kv.set(key, userData);
    return userData;
  } catch (e) {
    console.error('❌ Gagal register user:', e.message);
    return null;
  }
}

async function getUser(userId) {
  const key = `user:${userId}`;
  try {
    return await kv.get(key);
  } catch (e) {
    console.error('❌ Gagal get user:', e.message);
    return null;
  }
}

async function isUserRegistered(userId) {
  const user = await getUser(userId);
  const result = !!user && user.isActive !== false;
  console.log(`🔍 Cek user ${userId}: ${result ? 'TERDAFTAR' : 'BELUM TERDAFTAR'}`);
  return result;
}

// ============================================================
// FUNGSI PARSING PESAN TEKS
// ============================================================
function parseTransaction(text, userId) {
  const trimmed = text.trim();
  let type = 'expense';
  let amountText = trimmed;
  let note = '';

  if (trimmed.startsWith('+')) {
    type = 'income';
    amountText = trimmed.slice(1).trim();
  } else if (trimmed.startsWith('-')) {
    type = 'expense';
    amountText = trimmed.slice(1).trim();
  }

  const match = amountText.match(/^(\d+)\s*(.*)$/);
  if (!match) return null;

  const amount = parseInt(match[1]);
  note = match[2] || (type === 'income' ? 'Pemasukan' : 'Pengeluaran');

  const lowerNote = note.toLowerCase();
  let category = 'other';
  if (lowerNote.includes('makan') || lowerNote.includes('resto') || lowerNote.includes('food')) category = 'dining';
  else if (lowerNote.includes('belanja') || lowerNote.includes('shop') || lowerNote.includes('baju')) category = 'shopping';
  else if (lowerNote.includes('transport') || lowerNote.includes('ojol') || lowerNote.includes('bensin')) category = 'transport';
  else if (lowerNote.includes('tagihan') || lowerNote.includes('listrik') || lowerNote.includes('air')) category = 'bills';
  else if (lowerNote.includes('hiburan') || lowerNote.includes('film') || lowerNote.includes('game')) category = 'fun';
  else if (lowerNote.includes('kesehatan') || lowerNote.includes('obat') || lowerNote.includes('dokter')) category = 'health';
  else if (lowerNote.includes('hadiah') || lowerNote.includes('gift')) category = 'gift';

  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    amount,
    type,
    category,
    date: new Date().toISOString().slice(0, 10),
    account: 'Bot',
    note,
    created_at: new Date().toISOString(),
    user_id: userId
  };
}

// ============================================================
// FUNGSI PARSING OCR (hasil dari AI)
// ============================================================
function parseOcrText(text) {
  if (!text) return null;

  const fullText = text;

  // 1. Cari Amount
  let amount = null;
  const amountPatterns = [
    /total\s*[:=]?\s*Rp\s*([\d.,]+)/i,
    /total\s*[:=]?\s*([\d.,]+)/i,
    /jumlah\s*[:=]?\s*Rp\s*([\d.,]+)/i,
    /jumlah\s*[:=]?\s*([\d.,]+)/i,
    /Rp\s*([\d.,]+)\s*$/,
    /Rp\s*([\d.,]+)/,
    /(\d{1,3}(?:\.\d{3})*)\s*$/,
    /(\d{1,3}(?:\.\d{3})*)\s*(?:total|jumlah)/i,
  ];

  for (const pattern of amountPatterns) {
    const match = fullText.match(pattern);
    if (match) {
      const raw = match[1].replace(/\./g, '').replace(/,/g, '');
      const num = parseInt(raw);
      if (num > 0 && num < 999999999) {
        amount = num;
        break;
      }
    }
  }

  if (!amount) {
    const allNums = fullText.match(/\d{1,3}(?:\.\d{3})*/g);
    if (allNums) {
      const nums = allNums.map(n => parseInt(n.replace(/\./g, ''))).filter(n => n > 0 && n < 999999999);
      if (nums.length > 0) {
        amount = Math.max(...nums);
      }
    }
  }

  // 2. Cari Date
  let date = null;
  const datePatterns = [
    /(\d{2})\/(\d{2})\/(\d{4})/,
    /(\d{2})\/(\d{2})\/(\d{2})/,
    /(\d{4})-(\d{2})-(\d{2})/,
    /(\d{2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})/i,
    /(\d{2})\s+(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+(\d{4})/i,
  ];

  for (const pattern of datePatterns) {
    const match = fullText.match(pattern);
    if (match) {
      if (pattern.toString().includes('Jan|Feb')) {
        const months = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
          Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
        const day = match[1].padStart(2, '0');
        const month = months[match[2]] || '01';
        const year = match[3];
        date = `${year}-${month}-${day}`;
      } else if (pattern.toString().includes('Januari')) {
        const months = { Januari: '01', Februari: '02', Maret: '03', April: '04', Mei: '05', Juni: '06',
          Juli: '07', Agustus: '08', September: '09', Oktober: '10', November: '11', Desember: '12' };
        const day = match[1].padStart(2, '0');
        const month = months[match[2]] || '01';
        const year = match[3];
        date = `${year}-${month}-${day}`;
      } else {
        let d = match[1],
          m = match[2],
          y = match[3];
        if (y.length === 2) y = '20' + y;
        if (parseInt(d) > 12 && parseInt(m) <= 12) {
          date = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        } else if (parseInt(m) > 12 && parseInt(d) <= 12) {
          date = `${y}-${d.padStart(2, '0')}-${m.padStart(2, '0')}`;
        } else {
          date = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        }
      }
      break;
    }
  }

  if (!date) {
    date = new Date().toISOString().slice(0, 10);
  }

  // 3. Cari Merchant (nama toko)
  let merchant = null;
  const lines = fullText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const firstLines = lines.slice(0, 5);
  for (const line of firstLines) {
    if (line.length > 3 && line.length < 60 &&
      !/\d/.test(line.replace(/[0-9,.]/g, '')) &&
      !/total|jumlah|bayar|kembali|kasir|terima|tanggal/i.test(line) &&
      line.length > 5) {
      merchant = line;
      break;
    }
  }
  if (!merchant && lines.length > 0) {
    merchant = lines[0];
  }

  // 4. Tentukan kategori
  let category = 'other';
  const lowerText = fullText.toLowerCase();
  const keywords = {
    dining: ['makan', 'resto', 'restaurant', 'warung', 'cafe', 'kopi', 'sushi', 'pizza', 'burger', 'bakso',
      'nasi', 'ayam', 'soto', 'mie', 'seafood'
    ],
    shopping: ['belanja', 'shop', 'baju', 'sepatu', 'toko', 'mall', 'pakaian', 'fashion', 'grosir', 'retail'],
    transport: ['transport', 'ojol', 'grab', 'gojek', 'go-car', 'go-ride', 'bensin', 'pertamina', 'taxi',
      'kereta', 'bus', 'pesawat'
    ],
    bills: ['tagihan', 'listrik', 'pln', 'air', 'pdam', 'internet', 'telkom', 'indihome', 'bca', 'mandiri',
      'kartu', 'kredit'
    ],
    fun: ['hiburan', 'film', 'nonton', 'game', 'playstation', 'netflix', 'spotify', 'youtube', 'konser',
      'tiket'
    ],
    health: ['kesehatan', 'obat', 'dokter', 'rumah sakit', 'rs', 'klinik', 'apotek', 'vitamin', 'farma'],
    gift: ['hadiah', 'gift', 'kado', 'ulang tahun', 'anniversary', 'pernikahan'],
  };

  for (const [cat, words] of Object.entries(keywords)) {
    for (const word of words) {
      if (lowerText.includes(word)) {
        category = cat;
        break;
      }
    }
    if (category !== 'other') break;
  }

  if (merchant && category === 'other') {
    const mLower = merchant.toLowerCase();
    for (const [cat, words] of Object.entries(keywords)) {
      for (const word of words) {
        if (mLower.includes(word)) {
          category = cat;
          break;
        }
      }
      if (category !== 'other') break;
    }
  }

  const categoryMap = {
    dining: 'Makan', shopping: 'Belanja', transport: 'Transportasi',
    bills: 'Tagihan', fun: 'Hiburan', health: 'Kesehatan',
    gift: 'Hadiah', other: 'Lainnya'
  };

  return {
    amount,
    date,
    note: merchant || (category !== 'other' ? categoryMap[category] : 'Pengeluaran'),
    category,
    categoryLabel: categoryMap[category] || 'Lainnya',
    merchant
  };
}

// ============================================================
// FUNGSI OCR BERBASIS AI
// ============================================================
async function ocrWithAI(imageBuffer) {
  // Coba layanan AI secara berurutan
  const services = [];

  // 1. Google Cloud Vision AI
  if (GOOGLE_CLOUD_API_KEY) {
    services.push(async () => {
      try {
        const base64Image = imageBuffer.toString('base64');
        const response = await axios.post(
          `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_CLOUD_API_KEY}`,
          {
            requests: [{
              image: { content: base64Image },
              features: [{ type: 'TEXT_DETECTION' }],
              imageContext: { languageHints: ['id', 'en'] }
            }]
          },
          { timeout: 10000 }
        );
        const text = response.data.responses[0]?.textAnnotations?.[0]?.description || '';
        return { text, source: 'Google Cloud Vision' };
      } catch (e) {
        console.error('❌ Google Cloud Vision error:', e.message);
        return null;
      }
    });
  }

  // 2. Tesseract.js (fallback)
  services.push(async () => {
    try {
      const result = await Tesseract.recognize(imageBuffer, 'ind', {
        logger: (m) => { if (m.status === 'recognizing text') {} }
      });
      return { text: result.data.text, source: 'Tesseract.js' };
    } catch (e) {
      console.error('❌ Tesseract.js error:', e.message);
      return null;
    }
  });

  // Jalankan semua layanan secara paralel, ambil yang pertama berhasil
  const results = await Promise.all(services.map(fn => fn()));
  for (const result of results) {
    if (result && result.text && result.text.trim().length > 10) {
      console.log(`✅ OCR berhasil dengan ${result.source}`);
      return result;
    }
  }

  // Jika semua gagal, ambil hasil dari Tesseract yang terakhir
  const last = results[results.length - 1];
  if (last && last.text) {
    return last;
  }

  return null;
}

// ============================================================
// FUNGSI DATABASE TRANSACTION
// ============================================================
async function getTransactions(userId) {
  const key = `transactions:${userId}`;
  try {
    const data = await kv.get(key);
    return data || [];
  } catch (e) {
    console.error('❌ Gagal baca Redis:', e.message);
    return [];
  }
}

async function addTransaction(userId, tx) {
  const key = `transactions:${userId}`;
  try {
    const txs = await getTransactions(userId);
    txs.push(tx);
    await kv.set(key, txs);
    return tx;
  } catch (e) {
    console.error('❌ Gagal simpan ke Redis:', e.message);
    throw e;
  }
}

async function deleteTransaction(userId, txId) {
  const key = `transactions:${userId}`;
  try {
    let txs = await getTransactions(userId);
    txs = txs.filter(t => t.id !== txId);
    await kv.set(key, txs);
    return txs;
  } catch (e) {
    console.error('❌ Gagal hapus dari Redis:', e.message);
    throw e;
  }
}

async function clearAllTransactions(userId) {
  const key = `transactions:${userId}`;
  try {
    await kv.set(key, []);
  } catch (e) {
    console.error('❌ Gagal clear Redis:', e.message);
    throw e;
  }
}

// ============================================================
// BOT TELEGRAM HANDLER
// ============================================================
const bot = new Telegraf(BOT_TOKEN || 'dummy', { handlerTimeout: 90000 });
const appUrl = process.env.VERCEL_URL
  ? `https://catatan-ku-silk.vercel.app`
  : 'https://catatan-ku-silk.vercel.app';

function miniAppKeyboard(buttons) {
  return {
    inline_keyboard: buttons.map(row =>
      row.map(btn => ({
        text: btn.text,
        web_app: { url: `${appUrl}${btn.path || '/'}` }
      }))
    )
  };
}

bot.use(async (ctx, next) => {
  if (!ctx.from) return next();
  const userId = ctx.from.id.toString();

  if (ctx.message?.text?.startsWith('/start')) {
    return next();
  }

  const registered = await isUserRegistered(userId);
  if (!registered) {
    await ctx.reply(
      `⚠️ *Anda belum login!*\n\nSilakan login terlebih dahulu melalui Mini App CatatanKu.`,
      {
        parse_mode: 'Markdown',
        reply_markup: miniAppKeyboard([
          [{ text: '🔑 Login ke CatatanKu', path: '/login.html' }]
        ])
      }
    );
    return;
  }
  return next();
});

bot.start(async (ctx) => {
  const userId = ctx.from.id.toString();
  const registered = await isUserRegistered(userId);

  if (registered) {
    await ctx.reply(
      `👋 *Halo! Selamat datang kembali di CatatanKu!*\n\nCatat transaksi langsung dari sini:\n\n` +
      `➜ \`-5000\` → pengeluaran Rp 5.000\n` +
      `➜ \`+20000 makan siang\` → pemasukan Rp 20.000\n` +
      `➜ \`-15000 transport\` → pengeluaran transportasi\n\n` +
      `📸 Kirim *foto struk* untuk scan otomatis dengan AI!`,
      {
        parse_mode: 'Markdown',
        reply_markup: miniAppKeyboard([
          [{ text: '📊 Buka CatatanKu', path: '/' }],
        ])
      }
    );
  } else {
    await ctx.reply(
      `👋 *Selamat datang di CatatanKu!*\n\n` +
      `CatatanKu membantu kamu mencatat keuangan langsung dari Telegram.\n\n` +
      `🔑 Login terlebih dahulu untuk mulai mencatat.`,
      {
        parse_mode: 'Markdown',
        reply_markup: miniAppKeyboard([
          [{ text: '🔑 Login ke CatatanKu', path: '/login.html' }]
        ])
      }
    );
  }
});

bot.on('text', async (ctx) => {
  try {
    const text = ctx.message.text;
    const userId = ctx.from.id.toString();

    if (text.startsWith('/')) return;

    const registered = await isUserRegistered(userId);
    if (!registered) {
      await ctx.reply(
        `⚠️ *Anda belum login!*\n\nSilakan login terlebih dahulu.`,
        {
          parse_mode: 'Markdown',
          reply_markup: miniAppKeyboard([
            [{ text: '🔑 Login ke CatatanKu', path: '/login.html' }]
          ])
        }
      );
      return;
    }

    if (!/\d/.test(text)) {
      await ctx.reply(
        '❓ Format tidak dikenali.\n\nContoh:\n`-5000 makan siang`\n`+50000 gaji`\n\nAtau kirim foto struk untuk scan otomatis dengan AI.',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    const tx = parseTransaction(text, userId);
    if (!tx) {
      await ctx.reply(
        '❌ Format tidak dikenali.\n\nContoh: `-5000` atau `+20000 makan siang`',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    await addTransaction(userId, tx);

    const emoji = tx.type === 'income' ? '✅' : '📤';
    const typeLabel = tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran';
    const categoryMap = {
      dining: 'Makan', shopping: 'Belanja', transport: 'Transportasi',
      bills: 'Tagihan', fun: 'Hiburan', health: 'Kesehatan',
      gift: 'Hadiah', other: 'Lainnya'
    };

    await ctx.reply(
      `${emoji} *Transaksi berhasil dicatat!*\n\n` +
      `💳 *${typeLabel}:* Rp ${tx.amount.toLocaleString('id-ID')}\n` +
      `📂 *Kategori:* ${categoryMap[tx.category] || tx.category}\n` +
      `📝 *Catatan:* ${tx.note}\n` +
      `📅 *Tanggal:* ${tx.date}`,
      {
        parse_mode: 'Markdown',
        reply_markup: miniAppKeyboard([
          [{ text: '📊 Lihat di CatatanKu', path: '/' }]
        ])
      }
    );
  } catch (e) {
    console.error('❌ Error di handler text:', e.message);
    await ctx.reply('❌ Gagal menyimpan transaksi. Coba lagi nanti.');
  }
});

// ============================================================
// HANDLER: FOTO — OCR OTOMATIS DENGAN AI
// ============================================================
bot.on('photo', async (ctx) => {
  try {
    const userId = ctx.from.id.toString();

    const registered = await isUserRegistered(userId);
    if (!registered) {
      await ctx.reply(
        `⚠️ *Anda belum login!*\n\nSilakan login terlebih dahulu.`,
        {
          parse_mode: 'Markdown',
          reply_markup: miniAppKeyboard([
            [{ text: '🔑 Login ke CatatanKu', path: '/login.html' }]
          ])
        }
      );
      return;
    }

    await ctx.reply('🧠 *AI sedang menganalisis foto struk…* Mohon tunggu beberapa saat.', { parse_mode: 'Markdown' });

    // Ambil foto resolusi terbaik
    const photo = ctx.message.photo[ctx.message.photo.length - 1];
    const fileLink = await ctx.telegram.getFileLink(photo.file_id);

    const response = await axios.get(fileLink, { responseType: 'arraybuffer' });
    const imageBuffer = Buffer.from(response.data, 'binary');

    // Jalankan OCR dengan AI (multi-provider)
    const ocrResult = await ocrWithAI(imageBuffer);

    if (!ocrResult || !ocrResult.text || ocrResult.text.trim().length < 5) {
      await ctx.reply('❌ Tidak ada teks yang terbaca. Pastikan foto struk jelas dan coba lagi.');
      return;
    }

    const ocrText = ocrResult.text;
    const source = ocrResult.source || 'AI';

    // Parse hasil OCR
    const parsed = parseOcrText(ocrText);

    if (!parsed || !parsed.amount) {
      const preview = ocrText.length > 500 ? ocrText.substring(0, 500) + '…' : ocrText;
      await ctx.reply(
        `⚠️ *Tidak dapat mendeteksi jumlah transaksi secara otomatis.*\n\n` +
        `🤖 *Sumber OCR:* ${source}\n\n` +
        `Hasil OCR:\n\`${preview}\`\n\n` +
        `Silakan catat secara manual dengan format:\n` +
        `\`-5000 deskripsi\` untuk pengeluaran\n` +
        `\`+50000 deskripsi\` untuk pemasukan`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // Buat transaksi
    const categoryMap = {
      dining: 'Makan', shopping: 'Belanja', transport: 'Transportasi',
      bills: 'Tagihan', fun: 'Hiburan', health: 'Kesehatan',
      gift: 'Hadiah', other: 'Lainnya'
    };

    const tx = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      amount: parsed.amount,
      type: 'expense',
      category: parsed.category || 'other',
      date: parsed.date || new Date().toISOString().slice(0, 10),
      account: 'AI OCR',
      note: parsed.merchant || parsed.note || 'Struk',
      created_at: new Date().toISOString(),
      user_id: userId
    };

    await addTransaction(userId, tx);

    const categoryLabel = categoryMap[tx.category] || tx.category;

    await ctx.reply(
      `📸 *Transaksi berhasil dicatat dari struk!*\n\n` +
      `🤖 *Sumber OCR:* ${source}\n\n` +
      `💳 *Pengeluaran:* Rp ${tx.amount.toLocaleString('id-ID')}\n` +
      `📂 *Kategori:* ${categoryLabel}\n` +
      `📝 *Catatan:* ${tx.note}\n` +
      `📅 *Tanggal:* ${tx.date}\n\n` +
      `📷 *Hasil OCR (cuplikan):*\n\`${ocrText.slice(0, 300)}${ocrText.length > 300 ? '…' : ''}\``,
      {
        parse_mode: 'Markdown',
        reply_markup: miniAppKeyboard([
          [{ text: '📊 Lihat di CatatanKu', path: '/' }]
        ])
      }
    );

  } catch (e) {
    console.error('❌ Error di handler photo:', e.message);
    await ctx.reply('❌ Gagal memproses foto. Coba lagi nanti.');
  }
});

// ============================================================
// WEBHOOK
// ============================================================
app.post('/api/webhook', async (req, res) => {
  console.log('📥 Webhook received');
  try {
    if (!BOT_TOKEN) {
      console.error('❌ BOT_TOKEN tidak ada');
      return res.status(500).json({ error: 'BOT_TOKEN missing' });
    }
    await bot.handleUpdate(req.body);
    console.log('✅ Webhook processed successfully');
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('❌ Webhook error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// API ENDPOINTS
// ============================================================

app.post('/api/register', async (req, res) => {
  console.log('📥 Register request:', req.body);
  try {
    const { userId } = req.body;
    if (!userId || !userId.match(/^\d+$/)) {
      return res.status(400).json({ error: 'userId tidak valid' });
    }
    const user = await registerUser(userId);
    if (user) {
      console.log(`✅ User ${userId} berhasil register`);
      res.json({ success: true, user });
    } else {
      res.status(500).json({ error: 'Gagal registrasi user' });
    }
  } catch (e) {
    console.error('❌ Error register:', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/check-user/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await getUser(userId);
    const registered = !!user && user.isActive !== false;
    res.json({ registered, user });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/transactions/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const registered = await isUserRegistered(userId);
    if (!registered) {
      return res.status(401).json({ error: 'User tidak terdaftar' });
    }
    const txs = await getTransactions(userId);
    res.json(txs);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/transactions', async (req, res) => {
  try {
    const { userId, ...tx } = req.body;
    if (!userId || !tx.amount) {
      return res.status(400).json({ error: 'userId dan amount wajib diisi' });
    }
    const registered = await isUserRegistered(userId);
    if (!registered) {
      return res.status(401).json({ error: 'User tidak terdaftar' });
    }
    const newTx = {
      ...tx,
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      created_at: new Date().toISOString(),
      user_id: userId
    };
    await addTransaction(userId, newTx);
    res.json({ success: true, transaction: newTx });
  } catch (e) {
    console.error('❌ Error POST /transactions:', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/transactions/:userId/:txId', async (req, res) => {
  try {
    const { userId, txId } = req.params;
    const registered = await isUserRegistered(userId);
    if (!registered) {
      return res.status(401).json({ error: 'User tidak terdaftar' });
    }
    await deleteTransaction(userId, txId);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/transactions/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const registered = await isUserRegistered(userId);
    if (!registered) {
      return res.status(401).json({ error: 'User tidak terdaftar' });
    }
    await clearAllTransactions(userId);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/summary/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const registered = await isUserRegistered(userId);
    if (!registered) {
      return res.status(401).json({ error: 'User tidak terdaftar' });
    }
    const txs = await getTransactions(userId);
    const total_income = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const total_expense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    res.json({ total_income, total_expense, balance: total_income - total_expense });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), bot_token_set: !!BOT_TOKEN });
});

app.get('/api/test', (req, res) => {
  res.json({
    message: 'API is working',
    bot_token_set: !!BOT_TOKEN,
    vercel_url: process.env.VERCEL_URL,
    app_url: appUrl,
    env_vars: {
      BOT_TOKEN: BOT_TOKEN ? '✅' : '❌',
      KV_REST_API_URL: process.env.KV_REST_API_URL ? '✅' : '❌',
      KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN ? '✅' : '❌'
    }
  });
});

app.get('/api/admin/users', async (req, res) => {
  const token = req.headers['x-admin-token'];
  if (token !== ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const keys = await kv.keys('user:*');
    const users = await Promise.all(keys.map(async (key) => {
      const userId = key.replace('user:', '');
      const userData = await kv.get(key);
      const txs = await getTransactions(userId);
      return {
        userId,
        registeredAt: userData?.registeredAt,
        isActive: userData?.isActive !== false,
        transactionCount: txs.length
      };
    }));
    res.json({ users });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/admin/users/:userId', async (req, res) => {
  const token = req.headers['x-admin-token'];
  if (token !== ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const userId = req.params.userId;
    await kv.del(`user:${userId}`);
    await kv.del(`transactions:${userId}`);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/', (req, res) => {
  res.redirect('/index.html');
});

module.exports = app;
