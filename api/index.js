const express = require('express');
const cors = require('cors');
const { Telegraf } = require('telegraf');
const { kv } = require('@vercel/kv');

const app = express();
app.use(cors());
app.use(express.json());

// ============================================================
// 1. KONFIGURASI & LOGGING
// ============================================================
const BOT_TOKEN = process.env.BOT_TOKEN;
console.log('🔍 BOT_TOKEN exists?', !!BOT_TOKEN);

if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN tidak ditemukan!');
}

// ============================================================
// 2. FUNGSI PARSING PESAN
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

  // Deteksi kategori
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
// 3. FUNGSI DATABASE (Upstash Redis) dengan error handling
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
// 4. BOT TELEGRAM HANDLER (dengan error handling)
// ============================================================
const bot = new Telegraf(BOT_TOKEN || 'dummy', {
  handlerTimeout: 90000 // timeout lebih lama untuk serverless
});

// Handler untuk /start
bot.start(async (ctx) => {
  try {
    const appUrl = process.env.VERCEL_URL || 'catatan-ku-silk.vercel.app';
    await ctx.reply(
      `👋 Halo! Kirim pesan seperti:\n\n` +
      `➜ -5000 (pengeluaran Rp 5.000)\n` +
      `➜ +20000 makan siang (pemasukan Rp 20.000)\n` +
      `➜ -15000 transport (pengeluaran transportasi)\n\n` +
      `📊 Buka Mini App: [Buka CatatanKu](https://${appUrl})`,
      { parse_mode: 'Markdown' }
    );
  } catch (e) {
    console.error('❌ Error di /start:', e.message);
  }
});

// Handler untuk pesan teks
bot.on('text', async (ctx) => {
  try {
    const text = ctx.message.text;
    const userId = ctx.from.id.toString();

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
    const appUrl = process.env.VERCEL_URL || 'catatan-ku-silk.vercel.app';
    await ctx.reply(
      `${emoji} *Transaksi berhasil dicatat!*\n\n` +
      `💳 ${typeLabel}: Rp ${tx.amount.toLocaleString('id-ID')}\n` +
      `📂 Kategori: ${tx.category}\n` +
      `📝 Catatan: ${tx.note}\n` +
      `📅 Tanggal: ${tx.date}\n\n` +
      `🔗 [Lihat di CatatanKu](https://${appUrl})`,
      { parse_mode: 'Markdown' }
    );
  } catch (e) {
    console.error('❌ Error di handler text:', e.message);
    await ctx.reply('❌ Gagal menyimpan transaksi. Coba lagi nanti.');
  }
});

// ============================================================
// 5. WEBHOOK ENDPOINT (dengan error handling & logging)
// ============================================================
app.post('/api/webhook', async (req, res) => {
  console.log('📥 Webhook received');
  try {
    // Logging body untuk debugging
    console.log('📦 Body:', JSON.stringify(req.body).slice(0, 200));

    // Pastikan bot token valid
    if (!BOT_TOKEN) {
      console.error('❌ BOT_TOKEN tidak ada');
      return res.status(500).json({ error: 'BOT_TOKEN missing' });
    }

    // Handle update
    await bot.handleUpdate(req.body);
    console.log('✅ Webhook processed successfully');
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('❌ Webhook error:', err.message);
    console.error('Stack:', err.stack);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// 6. API ENDPOINTS UNTUK MINI APP
// ============================================================

// GET semua transaksi
app.get('/api/transactions/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const txs = await getTransactions(userId);
    res.json(txs);
  } catch (e) {
    console.error('❌ Error GET /transactions:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST tambah transaksi
app.post('/api/transactions', async (req, res) => {
  try {
    const { userId, ...tx } = req.body;
    if (!userId || !tx.amount) {
      return res.status(400).json({ error: 'userId dan amount wajib diisi' });
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

// DELETE transaksi
app.delete('/api/transactions/:userId/:txId', async (req, res) => {
  try {
    const { userId, txId } = req.params;
    await deleteTransaction(userId, txId);
    res.json({ success: true });
  } catch (e) {
    console.error('❌ Error DELETE /transactions:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// DELETE semua transaksi
app.delete('/api/transactions/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    await clearAllTransactions(userId);
    res.json({ success: true });
  } catch (e) {
    console.error('❌ Error DELETE all /transactions:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET summary
app.get('/api/summary/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const txs = await getTransactions(userId);
    const total_income = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const total_expense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    res.json({ total_income, total_expense, balance: total_income - total_expense });
  } catch (e) {
    console.error('❌ Error GET /summary:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), bot_token_set: !!BOT_TOKEN });
});

// Test endpoint untuk verifikasi webhook
app.get('/api/test', (req, res) => {
  res.json({
    message: 'API is working',
    bot_token_set: !!BOT_TOKEN,
    vercel_url: process.env.VERCEL_URL,
    env_vars: {
      BOT_TOKEN: BOT_TOKEN ? '✅' : '❌',
      KV_REST_API_URL: process.env.KV_REST_API_URL ? '✅' : '❌',
      KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN ? '✅' : '❌'
    }
  });
});

// Root redirect ke index.html
app.get('/', (req, res) => {
  res.redirect('/index.html');
});

// ============================================================
// 7. EKSPOR UNTUK VERCEL
// ============================================================
module.exports = app;
