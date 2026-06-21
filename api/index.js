const { Telegraf } = require('telegraf');
const { kv } = require('@vercel/kv');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error('⚠️ BOT_TOKEN tidak ditemukan! Set di Vercel Environment Variables.');
}

const bot = new Telegraf(BOT_TOKEN || 'dummy');

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

  // Deteksi kategori dari kata kunci
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
// FUNGSI DATABASE (Upstash Redis)
// ============================================================
async function getTransactions(userId) {
  const key = `transactions:${userId}`;
  const data = await kv.get(key);
  return data || [];
}

async function addTransaction(userId, tx) {
  const key = `transactions:${userId}`;
  const txs = await getTransactions(userId);
  txs.push(tx);
  await kv.set(key, txs);
  return tx;
}

async function deleteTransaction(userId, txId) {
  const key = `transactions:${userId}`;
  let txs = await getTransactions(userId);
  txs = txs.filter(t => t.id !== txId);
  await kv.set(key, txs);
  return txs;
}

async function clearAllTransactions(userId) {
  const key = `transactions:${userId}`;
  await kv.set(key, []);
}

// ============================================================
// BOT TELEGRAM HANDLERS
// ============================================================
bot.start(async (ctx) => {
  const appUrl = process.env.VERCEL_URL || 'catatanku.vercel.app';
  await ctx.reply(
    `👋 Halo! Kirim pesan seperti:\n\n` +
    `➜ -5000 (pengeluaran Rp 5.000)\n` +
    `➜ +20000 makan siang (pemasukan Rp 20.000)\n` +
    `➜ -15000 transport (pengeluaran transportasi)\n\n` +
    `📊 Buka Mini App: [Buka CatatanKu](https://${appUrl})`,
    { parse_mode: 'Markdown' }
  );
});

bot.on('text', async (ctx) => {
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

  try {
    await addTransaction(userId, tx);
    const emoji = tx.type === 'income' ? '✅' : '📤';
    const typeLabel = tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran';
    const appUrl = process.env.VERCEL_URL || 'catatanku.vercel.app';
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
    console.error(e);
    await ctx.reply('❌ Gagal menyimpan transaksi. Coba lagi nanti.');
  }
});

// ============================================================
// WEBHOOK ENDPOINT
// ============================================================
app.post('/api/webhook', async (req, res) => {
  try {
    await bot.handleUpdate(req.body);
    res.sendStatus(200);
  } catch (err) {
    console.error('Webhook error:', err);
    res.sendStatus(500);
  }
});

// ============================================================
// API ENDPOINTS UNTUK MINI APP
// ============================================================

// GET semua transaksi user
app.get('/api/transactions/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const txs = await getTransactions(userId);
    res.json(txs);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST tambah transaksi (dari Mini App)
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

// DELETE semua transaksi user
app.delete('/api/transactions/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    await clearAllTransactions(userId);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET summary (total income, expense, balance)
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

// Redirect root ke index.html
app.get('/', (req, res) => {
  res.redirect('/index.html');
});

// ============================================================
// EKSPOR UNTUK VERCEL
// ============================================================
module.exports = app;
