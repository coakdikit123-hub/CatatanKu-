const express = require('express');
const cors = require('cors');
const { Telegraf } = require('telegraf');
const { kv } = require('@vercel/kv');
const axios = require('axios');

// Import OCR
const { ocrStrukWithPuter } = require('./puter-ocr');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'admin123';

console.log('🔍 BOT_TOKEN exists?', !!BOT_TOKEN);

if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN tidak ditemukan!');
}

// ============================================================
// STATE DRAFT UNTUK EDIT OCR
// ============================================================
const drafts = {};

function getCategoryLabel(id) {
  const map = {
    dining: 'Makan',
    shopping: 'Belanja',
    transport: 'Transportasi',
    bills: 'Tagihan',
    fun: 'Hiburan',
    health: 'Kesehatan',
    gift: 'Hadiah',
    other: 'Lainnya'
  };
  return map[id] || id;
}

function getCategoryId(label) {
  const map = {
    'makan': 'dining',
    'belanja': 'shopping',
    'transportasi': 'transport',
    'tagihan': 'bills',
    'hiburan': 'fun',
    'kesehatan': 'health',
    'hadiah': 'gift',
    'lainnya': 'other'
  };
  const lower = label.toLowerCase();
  if (map[lower]) return map[lower];
  // Cek langsung
  const list = ['dining', 'shopping', 'transport', 'bills', 'fun', 'health', 'gift', 'other'];
  if (list.includes(lower)) return lower;
  return 'other';
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
// FUNGSI FORMAT RESPONSE STRUK
// ============================================================
function formatReceiptResponse(parsed, userId) {
  const categoryLabel = getCategoryLabel(parsed.category);

  let dateDisplay = parsed.date || new Date().toISOString().slice(0, 10);
  const dateObj = new Date(dateDisplay + 'T00:00:00');
  const formattedDate = dateObj.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  let response = `📤 *Transaksi berhasil dicatat dari struk!*\n\n`;
  response += `💰 *${parsed.amount ? 'Rp ' + parsed.amount.toLocaleString('id-ID') : 'Tidak terdeteksi'}*\n\n`;

  if (parsed.items && parsed.items.length > 0) {
    response += `📋 *Rincian Struk:*\n`;
    const merchantName = parsed.merchant || 'Struk';
    response += `*${merchantName}*\n`;

    for (const item of parsed.items) {
      const qtyDisplay = item.quantity > 1 ? `${item.quantity}x ` : '';
      const priceDisplay = item.price.toLocaleString('id-ID');
      response += `  - ${qtyDisplay}${item.name} - ${priceDisplay}\n`;
    }

    if (parsed.grandTotal) {
      response += `\n  🏷️ *Grand Total:* Rp ${parsed.grandTotal.toLocaleString('id-ID')}\n`;
    }
    response += `  📦 *Total Item:* ${parsed.items.length}\n`;
    response += `\n📂 *Kategori:* ${categoryLabel}\n`;
    response += `📅 *Tanggal:* ${formattedDate}\n`;
  } else {
    response += `📋 *Rincian:* ${parsed.merchant || 'Struk'}\n`;
    response += `📂 *Kategori:* ${categoryLabel}\n`;
    response += `📅 *Tanggal:* ${formattedDate}\n`;
  }

  response += `\n📌 *Dicatat di:* ${formattedDate}`;
  response += `\n📊 *Data otomatis muncul di Mini App* — buka CatatanKu untuk melihat.`;

  return response;
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
    console.log(`✅ Transaksi berhasil disimpan untuk user ${userId}`);
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

// ============================================================
// MIDDLEWARE: cek login
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
      `📸 Kirim *foto struk* untuk scan otomatis!`,
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
// HANDLER: pesan teks (termasuk untuk edit)
// ============================================================
bot.on('text', async (ctx) => {
  try {
    const text = ctx.message.text;
    const userId = ctx.from.id.toString();

    // Jika user sedang dalam mode edit
    const draft = drafts[userId];
    if (draft && draft.waitingFor) {
      const field = draft.waitingFor;
      const input = text.trim();

      if (field === 'jumlah') {
        const amount = parseInt(input.replace(/[^0-9]/g, ''));
        if (isNaN(amount) || amount <= 0) {
          return ctx.reply('❌ Masukkan angka yang valid (contoh: 50000)');
        }
        draft.amount = amount;
      } else if (field === 'kategori') {
        const catId = getCategoryId(input);
        draft.category = catId;
      } else if (field === 'tanggal') {
        // Coba parse tanggal dalam berbagai format
        let dateStr = input;
        // Coba format DD/MM/YYYY atau DD-MM-YYYY
        let match = input.match(/(\d{2})[\/-](\d{2})[\/-](\d{4})/);
        if (match) {
          dateStr = `${match[3]}-${match[2]}-${match[1]}`;
        } else {
          // Coba format YYYY-MM-DD
          match = input.match(/(\d{4})-(\d{2})-(\d{2})/);
          if (match) {
            dateStr = input;
          } else {
            // Coba buat Date object
            const d = new Date(input);
            if (!isNaN(d.getTime())) {
              dateStr = d.toISOString().slice(0, 10);
            } else {
              return ctx.reply('❌ Format tanggal tidak valid. Gunakan YYYY-MM-DD atau DD/MM/YYYY');
            }
          }
        }
        draft.date = dateStr;
      } else if (field === 'catatan') {
        draft.note = input;
      }

      draft.waitingFor = null;

      // Tampilkan preview terbaru
      const previewMsg = 
        `📝 *Preview Transaksi*\n\n` +
        `💰 *Jumlah:* Rp ${draft.amount.toLocaleString('id-ID')}\n` +
        `📂 *Kategori:* ${getCategoryLabel(draft.category)}\n` +
        `📝 *Catatan:* ${draft.note}\n` +
        `📅 *Tanggal:* ${draft.date}\n\n` +
        `Klik "✏️ Edit" untuk mengubah lagi, atau "✅ Simpan" untuk menyimpan.`;

      await ctx.reply(previewMsg, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✏️ Edit', callback_data: `edit_${userId}` },
              { text: '✅ Simpan', callback_data: `save_${userId}` }
            ],
            [
              { text: '❌ Batal', callback_data: `cancel_${userId}` }
            ]
          ]
        }
      });
      return;
    }

    // Jika bukan edit, proses sebagai transaksi teks biasa
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
        '❓ Format tidak dikenali.\n\nContoh:\n`-5000 makan siang`\n`+50000 gaji`\n\nAtau kirim foto struk untuk scan otomatis.',
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
      `📅 *Tanggal:* ${tx.date}\n\n` +
      `📊 *Data otomatis muncul di Mini App* — buka CatatanKu untuk melihat.`,
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
// HANDLER: CALLBACK QUERY (Edit / Simpan OCR)
// ============================================================
bot.action(/edit_(.+)/, async (ctx) => {
  const userId = ctx.match[1];
  if (ctx.from.id.toString() !== userId) {
    return ctx.answerCbQuery('❌ Ini bukan sesi Anda');
  }

  const draft = drafts[userId];
  if (!draft) {
    return ctx.answerCbQuery('❌ Sesi habis, kirim ulang foto');
  }

  await ctx.answerCbQuery();

  // Tampilkan pilihan field yang bisa diedit
  await ctx.reply(
    `✏️ *Pilih field yang ingin diedit:*\n\n` +
    `💰 Jumlah: Rp ${draft.amount.toLocaleString('id-ID')}\n` +
    `📂 Kategori: ${getCategoryLabel(draft.category)}\n` +
    `📝 Catatan: ${draft.note}\n` +
    `📅 Tanggal: ${draft.date}`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '💰 Edit Jumlah', callback_data: `editfield_jumlah_${userId}` }],
          [{ text: '📂 Edit Kategori', callback_data: `editfield_kategori_${userId}` }],
          [{ text: '📝 Edit Catatan', callback_data: `editfield_catatan_${userId}` }],
          [{ text: '📅 Edit Tanggal', callback_data: `editfield_tanggal_${userId}` }],
          [{ text: '🔙 Kembali', callback_data: `back_${userId}` }]
        ]
      }
    }
  );
});

bot.action(/editfield_(.+)_(.+)/, async (ctx) => {
  const field = ctx.match[1];
  const userId = ctx.match[2];
  if (ctx.from.id.toString() !== userId) {
    return ctx.answerCbQuery('❌ Bukan milik Anda');
  }

  const draft = drafts[userId];
  if (!draft) {
    return ctx.answerCbQuery('❌ Sesi habis');
  }

  await ctx.answerCbQuery();

  const fieldLabels = {
    jumlah: 'Jumlah (contoh: 50000)',
    kategori: 'Kategori (Makan, Belanja, Transportasi, Tagihan, Hiburan, Kesehatan, Hadiah, Lainnya)',
    catatan: 'Catatan (deskripsi transaksi)',
    tanggal: 'Tanggal (format: YYYY-MM-DD atau DD/MM/YYYY)'
  };

  draft.waitingFor = field;
  await ctx.reply(
    `✏️ *Edit ${field}*\n\nKirim nilai baru untuk *${field}*.\n\n${fieldLabels[field]}`,
    { parse_mode: 'Markdown' }
  );
});

bot.action(/back_(.+)/, async (ctx) => {
  const userId = ctx.match[1];
  if (ctx.from.id.toString() !== userId) {
    return ctx.answerCbQuery('❌ Bukan milik Anda');
  }

  const draft = drafts[userId];
  if (!draft) {
    return ctx.answerCbQuery('❌ Sesi habis');
  }

  await ctx.answerCbQuery();

  const previewMsg = 
    `📝 *Preview Transaksi*\n\n` +
    `💰 *Jumlah:* Rp ${draft.amount.toLocaleString('id-ID')}\n` +
    `📂 *Kategori:* ${getCategoryLabel(draft.category)}\n` +
    `📝 *Catatan:* ${draft.note}\n` +
    `📅 *Tanggal:* ${draft.date}\n\n` +
    `Klik "✏️ Edit" untuk mengubah lagi, atau "✅ Simpan" untuk menyimpan.`;

  await ctx.reply(previewMsg, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '✏️ Edit', callback_data: `edit_${userId}` },
          { text: '✅ Simpan', callback_data: `save_${userId}` }
        ],
        [
          { text: '❌ Batal', callback_data: `cancel_${userId}` }
        ]
      ]
    }
  });
});

bot.action(/save_(.+)/, async (ctx) => {
  const userId = ctx.match[1];
  if (ctx.from.id.toString() !== userId) {
    return ctx.answerCbQuery('❌ Bukan milik Anda');
  }

  const draft = drafts[userId];
  if (!draft) {
    return ctx.answerCbQuery('❌ Sesi habis');
  }

  await ctx.answerCbQuery('✅ Menyimpan transaksi...');

  try {
    const finalAmount = draft.amount;

    const tx = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      amount: finalAmount,
      type: 'expense',
      category: draft.category || 'other',
      date: draft.date || new Date().toISOString().slice(0, 10),
      account: 'Bot OCR (Manual Edit)',
      note: draft.note || 'Struk',
      created_at: new Date().toISOString(),
      user_id: userId
    };

    await addTransaction(userId, tx);

    const categoryLabel = getCategoryLabel(tx.category);
    const dateObj = new Date(tx.date + 'T00:00:00');
    const formattedDate = dateObj.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });

    await ctx.reply(
      `✅ *Transaksi berhasil disimpan!*\n\n` +
      `💰 *Jumlah:* Rp ${tx.amount.toLocaleString('id-ID')}\n` +
      `📂 *Kategori:* ${categoryLabel}\n` +
      `📝 *Catatan:* ${tx.note}\n` +
      `📅 *Tanggal:* ${formattedDate}\n\n` +
      `📊 *Data otomatis muncul di Mini App* — buka CatatanKu untuk melihat.`,
      {
        parse_mode: 'Markdown',
        reply_markup: miniAppKeyboard([
          [{ text: '📊 Lihat di CatatanKu', path: '/' }]
        ])
      }
    );

    // Hapus draft setelah disimpan
    delete drafts[userId];
  } catch (e) {
    console.error('❌ Error saving draft:', e.message);
    await ctx.reply('❌ Gagal menyimpan transaksi. Coba lagi nanti.');
  }
});

bot.action(/cancel_(.+)/, async (ctx) => {
  const userId = ctx.match[1];
  if (ctx.from.id.toString() !== userId) {
    return ctx.answerCbQuery('❌ Bukan milik Anda');
  }

  delete drafts[userId];
  await ctx.answerCbQuery('❌ Dibatalkan');
  await ctx.reply('❌ Transaksi dibatalkan.');
});

// ============================================================
// HANDLER: FOTO — OCR + EDIT
// ============================================================
bot.on('photo', async (ctx) => {
  const processingMsg = await ctx.reply(
    '🤖 *AI sedang menganalisis foto struk...* Mohon tunggu beberapa saat.',
    { parse_mode: 'Markdown' }
  );

  try {
    const userId = ctx.from.id.toString();

    const registered = await isUserRegistered(userId);
    if (!registered) {
      await ctx.telegram.editMessageText(
        processingMsg.chat.id,
        processingMsg.message_id,
        null,
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

    // Hapus draft lama jika ada
    delete drafts[userId];

    // Dapatkan file foto
    const photo = ctx.message.photo[ctx.message.photo.length - 1];
    const fileLink = await ctx.telegram.getFileLink(photo.file_id);
    console.log('📸 File link:', fileLink);

    const response = await axios.get(fileLink, { responseType: 'arraybuffer' });
    const imageBuffer = Buffer.from(response.data, 'binary');

    // OCR
    let ocrResult;
    try {
      ocrResult = await ocrStrukWithPuter(imageBuffer);
    } catch (ocrError) {
      console.error('❌ OCR error:', ocrError.message);
      await ctx.telegram.editMessageText(
        processingMsg.chat.id,
        processingMsg.message_id,
        null,
        `❌ *Gagal membaca gambar:* ${ocrError.message}\n\nSilakan catat manual:\n\`-5000 deskripsi\` untuk pengeluaran\n\`+50000 deskripsi\` untuk pemasukan`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    if (!ocrResult || !ocrResult.amount) {
      await ctx.telegram.editMessageText(
        processingMsg.chat.id,
        processingMsg.message_id,
        null,
        `⚠️ *Tidak dapat mendeteksi jumlah transaksi.*\n\nSilakan catat manual:\n\`-5000 deskripsi\` untuk pengeluaran\n\`+50000 deskripsi\` untuk pemasukan`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // Simpan ke draft
    const finalAmount = ocrResult.grandTotal || ocrResult.amount;
    const category = ocrResult.category || 'other';
    const date = ocrResult.date || new Date().toISOString().slice(0, 10);
    const note = ocrResult.merchant || 'Struk';

    drafts[userId] = {
      amount: finalAmount,
      category: category,
      date: date,
      note: note,
      waitingFor: null
    };

    // Tampilkan preview + tombol edit/simpan
    const previewMsg = 
      `📝 *Hasil OCR — Periksa sebelum simpan*\n\n` +
      `💰 *Jumlah:* Rp ${finalAmount.toLocaleString('id-ID')}\n` +
      `📂 *Kategori:* ${getCategoryLabel(category)}\n` +
      `📝 *Catatan:* ${note}\n` +
      `📅 *Tanggal:* ${date}\n\n` +
      `Jika ada kesalahan, klik "✏️ Edit" untuk mengubah.`;

    await ctx.telegram.editMessageText(
      processingMsg.chat.id,
      processingMsg.message_id,
      null,
      previewMsg,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✏️ Edit', callback_data: `edit_${userId}` },
              { text: '✅ Simpan', callback_data: `save_${userId}` }
            ],
            [
              { text: '❌ Batal', callback_data: `cancel_${userId}` }
            ]
          ]
        }
      }
    );

  } catch (e) {
    console.error('❌ Error di handler photo:', e.message);
    await ctx.telegram.editMessageText(
      processingMsg.chat.id,
      processingMsg.message_id,
      null,
      `❌ Gagal memproses foto: ${e.message || 'Coba lagi nanti.'}`
    );
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
    ocr_api_key_set: !!process.env.OCR_API_KEY,
    vercel_url: process.env.VERCEL_URL,
    app_url: appUrl
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
