const express = require('express');
const cors = require('cors');
const { Telegraf } = require('telegraf');
const { kv } = require('@vercel/kv');

const app = express();
app.use(cors());
app.use(express.json());

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'admin123';

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
// BOT TELEGRAM HANDLER
// ============================================================
const bot = new Telegraf(BOT_TOKEN || 'dummy', { handlerTimeout: 90000 });
const appUrl = process.env.VERCEL_URL
  ? `https://catatan-ku-silk.vercel.app`
  : 'https://catatan-ku-silk.vercel.app';

// ============================================================
// HELPER: Buat keyboard Mini App (web_app button)
// Semua button menggunakan type: web_app agar terbuka
// sebagai Telegram Mini App, bukan browser eksternal.
// ============================================================
function miniAppKeyboard(buttons) {
  // buttons: array of array of { text, path? }
  // path opsional, default ke '/'
  return {
    inline_keyboard: buttons.map(row =>
      row.map(btn => ({
        text: btn.text,
        web_app: { url: `${appUrl}${btn.path || '/'}` }
      }))
    )
  };
}

// ============================================================
// MIDDLEWARE: cek login sebelum semua pesan (kecuali /start)
// ============================================================
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

// ============================================================
// COMMAND: /start
// ============================================================
bot.start(async (ctx) => {
  const userId = ctx.from.id.toString();
  const registered = await isUserRegistered(userId);

  if (registered) {
    await ctx.reply(
      `👋 *Halo! Selamat datang kembali di CatatanKu!*\n\nCatat transaksi langsung dari sini:\n\n` +
      `➜ \`-5000\` → pengeluaran Rp 5.000\n` +
      `➜ \`+20000 makan siang\` → pemasukan Rp 20.000\n` +
      `➜ \`-15000 transport\` → pengeluaran transportasi\n\n` +
      `📊 Buka Mini App untuk melihat laporan lengkap.`,
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

// ============================================================
// HANDLER: pesan teks (input transaksi)
// ============================================================
bot.on('text', async (ctx) => {
  try {
    const text = ctx.message.text;
    const userId = ctx.from.id.toString();

    if (text.startsWith('/')) return; // abaikan semua command lain

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
        '❓ Format tidak dikenali.\n\nContoh:\n`-5000 makan siang`\n`+50000 gaji`',
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
