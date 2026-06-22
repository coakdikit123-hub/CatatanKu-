const express = require('express');
const cors = require('cors');
const { Telegraf } = require('telegraf');
const { kv } = require('@vercel/kv');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' })); // untuk menerima base64 gambar

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'admin123';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

console.log('🔍 BOT_TOKEN exists?', !!BOT_TOKEN);
console.log('🔍 GEMINI_API_KEY exists?', !!GEMINI_API_KEY);

if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN tidak ditemukan!');
}
if (!GEMINI_API_KEY) {
  console.warn('⚠️ GEMINI_API_KEY tidak ditemukan! OCR AI tidak akan berfungsi.');
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
// FUNGSI PARSING PESAN
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
// GEMINI AI OCR
// ============================================================
async function processOCRWithGemini(base64Image) {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY tidak diset di server');
  }

  const prompt = `Anda adalah AI yang membantu mengekstrak informasi dari struk belanja, nota, atau kwitansi.

Ekstrak informasi berikut dari gambar struk ini dengan format JSON:
{
    "amount": (nominal dalam angka, hanya angka, tanpa titik atau koma),
    "type": (jenis transaksi: "income" untuk pemasukan, "expense" untuk pengeluaran),
    "category": (kategori: "dining", "transport", "shopping", "bills", "fun", "health", "gift", atau "other"),
    "date": (tanggal dalam format YYYY-MM-DD, jika tidak ada gunakan hari ini),
    "note": (deskripsi singkat tentang transaksi, max 50 karakter),
    "confidence": (tingkat keyakinan 0-100 dalam bentuk angka)
}

Aturan:
- Jika ada nominal, ambil angka terbesar atau total.
- Jika kata seperti "makan", "resto", "warung" → category "dining"
- Jika "transport", "ojol", "gojek", "grab", "bensin" → "transport"
- Jika "belanja", "shop", "baju" → "shopping"
- Jika "tagihan", "listrik", "air", "pln" → "bills"
- Jika "hiburan", "film", "game", "netflix" → "fun"
- Jika "kesehatan", "obat", "dokter" → "health"
- Jika "hadiah", "gift" → "gift"
- Jika ada kata "gaji", "bonus", "pemasukan" → type "income"
- Jika ada kata "bayar", "belanja", "pengeluaran" → type "expense"
- Hanya balas dengan JSON, tanpa teks lain.`;

  const requestBody = {
    contents: [{
      parts: [
        { text: prompt },
        { inline_data: { mime_type: "image/jpeg", data: base64Image } }
      ]
    }]
  };

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || `HTTP ${response.status}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  // Cari JSON dalam response
  let jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    try {
      return JSON.parse(text);
    } catch (e) {
      const lines = text.split('\n');
      let jsonStr = '';
      let inJson = false;
      for (const line of lines) {
        if (line.includes('{')) inJson = true;
        if (inJson) jsonStr += line;
        if (line.includes('}')) break;
      }
      if (jsonStr) {
        try {
          return JSON.parse(jsonStr);
        } catch (e2) {
          throw new Error('Gagal parsing JSON dari response AI');
        }
      } else {
        throw new Error('Tidak ditemukan JSON dalam response');
      }
    }
  }

  return JSON.parse(jsonMatch[0]);
}

// ============================================================
// BOT TELEGRAM HANDLER
// ============================================================
const bot = new Telegraf(BOT_TOKEN || 'dummy', { handlerTimeout: 90000 });
const appUrl = process.env.VERCEL_URL || 'catatan-ku-silk.vercel.app';

// MIDDLEWARE: Cek login
bot.use(async (ctx, next) => {
  if (!ctx.from) return next();
  const userId = ctx.from.id.toString();

  if (ctx.message?.text?.startsWith('/start')) {
    return next();
  }

  const registered = await isUserRegistered(userId);
  if (!registered) {
    const loginMsg =
      `⚠️ *Anda belum login!*\n\n` +
      `Untuk menggunakan bot ini, silakan login terlebih dahulu melalui Mini App.\n\n` +
      `🔑 Klik tombol di bawah untuk membuka halaman login.`;

    await ctx.reply(loginMsg, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔑 Login via Mini App', url: `https://${appUrl}/login.html` }],
          [{ text: '📊 Buka CatatanKu', url: `https://${appUrl}` }]
        ]
      }
    });
    return;
  }

  return next();
});

bot.start(async (ctx) => {
  const userId = ctx.from.id.toString();
  const registered = await isUserRegistered(userId);

  let message, buttons;
  if (registered) {
    message =
      `👋 Halo! Selamat datang kembali di CatatanKu!\n\n` +
      `Kirim pesan seperti:\n\n` +
      `➜ -5000 (pengeluaran Rp 5.000)\n` +
      `➜ +20000 makan siang (pemasukan Rp 20.000)\n` +
      `➜ -15000 transport (pengeluaran transportasi)\n\n` +
      `📊 Buka Mini App untuk melihat laporan keuanganmu.`;
    buttons = {
      inline_keyboard: [
        [{ text: '📊 Buka CatatanKu', url: `https://${appUrl}` }],
        [{ text: '📈 Lihat Riwayat', url: `https://${appUrl}/#history` }]
      ]
    };
  } else {
    message =
      `⚠️ *Anda belum login!*\n\n` +
      `Untuk mulai menggunakan CatatanKu, silakan login terlebih dahulu.`;
    buttons = {
      inline_keyboard: [
        [{ text: '🔑 Login via Mini App', url: `https://${appUrl}/login.html` }],
        [{ text: '📊 Buka CatatanKu', url: `https://${appUrl}` }]
      ]
    };
  }

  await ctx.reply(message, {
    parse_mode: 'Markdown',
    reply_markup: buttons
  });
});

bot.on('text', async (ctx) => {
  try {
    const text = ctx.message.text;
    const userId = ctx.from.id.toString();

    if (text.startsWith('/start')) return;

    const registered = await isUserRegistered(userId);
    if (!registered) {
      await ctx.reply(
        `⚠️ *Anda belum login!*\n\nSilakan login terlebih dahulu.`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔑 Login via Mini App', url: `https://${appUrl}/login.html` }]
            ]
          }
        }
      );
      return;
    }

    if (!/\d/.test(text)) {
      await ctx.reply('❌ Kirim pesan dengan nominal, contoh: `-5000` atau `+20000 makan`', { parse_mode: 'Markdown' });
      return;
    }

    const tx = parseTransaction(text, userId);
    if (!tx) {
      await ctx.reply('❌ Format tidak dikenali. Contoh: `-5000` atau `+20000 makan siang`', { parse_mode: 'Markdown' });
      return;
    }

    await addTransaction(userId, tx);
    const emoji = tx.type === 'income' ? '✅' : '📤';
    const typeLabel = tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran';
    await ctx.reply(
      `${emoji} *Transaksi berhasil dicatat!*\n\n` +
      `💳 ${typeLabel}: Rp ${tx.amount.toLocaleString('id-ID')}\n` +
      `📂 Kategori: ${tx.category}\n` +
      `📝 Catatan: ${tx.note}\n` +
      `📅 Tanggal: ${tx.date}\n\n` +
      `📊 [Lihat di CatatanKu](https://${appUrl})`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📊 Buka CatatanKu', url: `https://${appUrl}` }]
          ]
        }
      }
    );
  } catch (e) {
    console.error('❌ Error di handler text:', e.message);
    await ctx.reply('❌ Gagal menyimpan transaksi. Coba lagi nanti.');
  }
});

// ============================================================
// WEBHOOK
// ============================================================
app.post('/api/webhook', async (req, res) => {
  console.log('📥 Webhook received');
  try {
    if (!BOT_TOKEN) {
      return res.status(500).json({ error: 'BOT_TOKEN missing' });
    }
    await bot.handleUpdate(req.body);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('❌ Webhook error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// API ENDPOINTS
// ============================================================

// REGISTER USER
app.post('/api/register', async (req, res) => {
  console.log('📥 Register request:', req.body);
  try {
    const { userId } = req.body;
    if (!userId || !userId.match(/^\d+$/)) {
      return res.status(400).json({ error: 'userId tidak valid' });
    }
    const user = await registerUser(userId);
    if (user) {
      res.json({ success: true, user });
    } else {
      res.status(500).json({ error: 'Gagal registrasi user' });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// CEK SESSION
app.get('/api/check-session/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const registered = await isUserRegistered(userId);
    res.json({ valid: registered });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// CEK USER
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

// GET transaksi
app.get('/api/transactions/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const txs = await getTransactions(userId);
    res.json(txs);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST transaksi
app.post('/api/transactions', async (req, res) => {
  try {
    const { userId, ...tx } = req.body;
    if (!userId || !tx.amount) {
      return res.status(400).json({ error: 'userId dan amount wajib diisi' });
    }

    const registered = await isUserRegistered(userId);
    if (!registered) {
      return res.status(401).json({ error: 'Unauthorized: user not registered' });
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
    res.status(500).json({ error: e.message });
  }
});

// DELETE transaksi
app.delete('/api/transactions/:userId/:txId', async (req, res) => {
  try {
    const { userId, txId } = req.params;
    await deleteTransaction(userId, txId);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE semua
app.delete('/api/transactions/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    await clearAllTransactions(userId);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// SUMMARY
app.get('/api/summary/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const txs = await getTransactions(userId);
    const total_income = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const total_expense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    res.json({ total_income, total_expense, balance: total_income - total_expense });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================
// GEMINI OCR ENDPOINT
// ============================================================
app.post('/api/ocr', async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ 
        success: false, 
        error: 'Gambar tidak ditemukan' 
      });
    }

    // Cek API Key
    if (!GEMINI_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'GEMINI_API_KEY tidak diset di server. Hubungi admin.'
      });
    }

    // image adalah base64 tanpa prefix
    const base64Data = image.includes(',') ? image.split(',')[1] : image;

    console.log('📸 Memproses OCR dengan Gemini AI...');
    console.log('📏 Base64 length:', base64Data.length);

    const result = await processOCRWithGemini(base64Data);
    console.log('✅ OCR selesai:', result);

    res.json({
      success: true,
      data: {
        amount: result.amount || '',
        type: result.type || 'expense',
        category: result.category || 'other',
        date: result.date || '',
        note: result.note || '',
        confidence: result.confidence || '50'
      }
    });
  } catch (e) {
    console.error('❌ OCR error:', e.message);
    console.error('Stack:', e.stack);
    res.status(500).json({
      success: false,
      error: e.message || 'Gagal memproses OCR'
    });
  }
});

// ============================================================
// ADMIN ENDPOINTS
// ============================================================
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

// HEALTH CHECK
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    bot_token_set: !!BOT_TOKEN,
    gemini_api_key_set: !!GEMINI_API_KEY
  });
});

// ROOT
app.get('/', (req, res) => {
  res.redirect('/index.html');
});

module.exports = app;
