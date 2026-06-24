const express = require('express');
const cors = require('cors');
const { Telegraf } = require('telegraf');
const { kv } = require('@vercel/kv');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'admin123';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

console.log('🔍 BOT_TOKEN exists?', !!BOT_TOKEN);
console.log('🔍 GEMINI_API_KEY exists?', !!GEMINI_API_KEY);

if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN tidak ditemukan!');
}

if (!GEMINI_API_KEY) {
  console.warn('⚠️ GEMINI_API_KEY tidak diset! OCR tidak akan berfungsi.');
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
// FUNGSI PARSING TEKS MANUAL (FALLBACK)
// ============================================================
function parseOcrTextManually(text) {
  if (!text || text.trim().length < 3) return null;

  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const fullText = text;

  // Cari Grand Total
  let grandTotal = null;
  const totalPatterns = [
    /grand total\s*[:=]?\s*Rp\s*([\d.,]+)/i,
    /total\s*[:=]?\s*Rp\s*([\d.,]+)/i,
    /jumlah\s*[:=]?\s*Rp\s*([\d.,]+)/i,
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

// ============================================================
// FUNGSI OCR DENGAN GEMINI 2.0 FLASH (DENGAN RETRY)
// ============================================================
async function ocrWithGemini(imageBuffer, retryCount = 0) {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY tidak diset. Dapatkan di https://ai.google.dev/');
  }

  console.log(`📸 Memproses gambar dengan Gemini 2.0 Flash (attempt ${retryCount + 1})...`);

  const base64Image = imageBuffer.toString('base64');

  const prompt = `Anda adalah AI yang membaca struk belanja/nota. Ekstrak informasi berikut dari gambar struk ini:
1. Grand Total (jumlah total yang harus dibayar)
2. Tanggal transaksi (format: YYYY-MM-DD)
3. Waktu transaksi (format: HH:MM)
4. Nama Toko/Merchant
5. Daftar Item (nama, harga, qty)
6. Kategori (dining, shopping, transport, bills, fun, health, gift, other)

Output dalam format JSON SAJA, tanpa teks lain. Contoh:
{
  "grandTotal": 97500,
  "tanggal": "2026-06-15",
  "waktu": "21:45",
  "merchant": "Wizzmie Cipondoh",
  "items": [{"nama": "Rice Bowl Spicy", "harga": 30910, "qty": 2}],
  "kategori": "dining"
}
Jika data tidak ditemukan, gunakan null.`;

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: 'image/jpeg', data: base64Image } }
          ]
        }]
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      }
    );

    const result = response.data;
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';

    console.log('📝 Gemini response:', text);

    // Coba parse JSON
    let jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Tidak ada JSON yang valid');
    const parsed = JSON.parse(jsonMatch[0]);

    // Validasi
    const items = (parsed.items || []).map(item => ({
      name: item.nama || item.name || 'Item',
      price: parseInt(item.harga || item.price || 0),
      quantity: parseInt(item.qty || item.quantity || 1)
    })).filter(item => item.price > 0);

    const grandTotal = parseInt(parsed.grandTotal) || (items.length > 0 ? items.reduce((s, i) => s + (i.price * i.quantity), 0) : null);

    return {
      amount: grandTotal,
      date: parsed.tanggal || null,
      time: parsed.waktu || null,
      merchant: parsed.merchant || null,
      items: items,
      category: parsed.kategori || 'other',
      grandTotal: grandTotal
    };

  } catch (error) {
    // Jika error 429 (rate limit) dan masih ada percobaan tersisa
    if (error.response?.status === 429 && retryCount < 4) {
      const waitTime = Math.pow(2, retryCount) * 2000; // 2s, 4s, 8s, 16s
      console.log(`⏳ Rate limit (429), mencoba lagi dalam ${waitTime/1000} detik...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return ocrWithGemini(imageBuffer, retryCount + 1);
    }

    // Jika error lain, lempar
    throw error;
  }
}

// ============================================================
// FUNGSI FORMAT RESPONSE STRUK
// ============================================================
function formatReceiptResponse(parsed, userId) {
  const categoryMap = {
    dining: 'Makan', shopping: 'Belanja', transport: 'Transportasi',
    bills: 'Tagihan', fun: 'Hiburan', health: 'Kesehatan',
    gift: 'Hadiah', other: 'Lainnya'
  };

  const categoryLabel = categoryMap[parsed.category] || 'Lainnya';

  let dateDisplay = parsed.date || new Date().toISOString().slice(0, 10);
  const dateObj = new Date(dateDisplay + 'T00:00:00');
  const formattedDate = dateObj.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  let timeDisplay = parsed.time || '';

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
    if (timeDisplay) {
      response += `🕐 *Waktu:* ${formattedDate}, ${timeDisplay}\n`;
    } else {
      response += `📅 *Tanggal:* ${formattedDate}\n`;
    }
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
      `📸 Kirim *foto struk* untuk scan otomatis dengan *Gemini AI* (GRATIS)!`,
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
// HANDLER: pesan teks
// ============================================================
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
        '❓ Format tidak dikenali.\n\nContoh:\n`-5000 makan siang`\n`+50000 gaji`\n\nAtau kirim foto struk untuk scan otomatis dengan Gemini AI (GRATIS).',
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
// HANDLER: FOTO — GEMINI 2.0 FLASH OCR (GRATIS)
// ============================================================
bot.on('photo', async (ctx) => {
  const processingMsg = await ctx.reply(
    '🤖 *Gemini AI sedang menganalisis foto struk...* Mohon tunggu beberapa saat (gratis!).',
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

    // Dapatkan file foto
    const photo = ctx.message.photo[ctx.message.photo.length - 1];
    const fileLink = await ctx.telegram.getFileLink(photo.file_id);
    console.log('📸 File link:', fileLink);

    // Download image
    const response = await axios.get(fileLink, { responseType: 'arraybuffer' });
    const imageBuffer = Buffer.from(response.data, 'binary');

    // OCR dengan Gemini
    let ocrResult;
    try {
      ocrResult = await ocrWithGemini(imageBuffer);
    } catch (ocrError) {
      console.error('❌ OCR error:', ocrError.message);

      // Coba fallback manual
      try {
        console.log('🔄 Mencoba fallback manual parsing...');
        // Kita perlu teks OCR, tapi Gemini gagal. Coba gunakan OCR.space? Tidak, kita skip.
        // Kita hanya bisa memberi tahu user.
        throw ocrError;
      } catch (fallbackError) {
        let errorMsg = ocrError.message || 'Coba lagi';
        if (ocrError.response?.status === 429) {
          errorMsg = '⚠️ *Rate limit Gemini tercapai!* Tunggu beberapa saat (1-2 menit) lalu kirim ulang.';
        } else if (ocrError.response?.status === 403) {
          errorMsg = '❌ *API Key tidak valid.* Cek GEMINI_API_KEY di Vercel.';
        } else if (ocrError.response?.status === 400) {
          errorMsg = '❌ *Gambar tidak dapat diproses.* Pastikan foto struk jelas.';
        }
        await ctx.telegram.editMessageText(
          processingMsg.chat.id,
          processingMsg.message_id,
          null,
          `❌ Gagal membaca gambar.\n\n${errorMsg}`
        );
        return;
      }
    }

    if (!ocrResult || !ocrResult.amount) {
      await ctx.telegram.editMessageText(
        processingMsg.chat.id,
        processingMsg.message_id,
        null,
        `⚠️ *Tidak dapat mendeteksi jumlah transaksi secara otomatis.*\n\n` +
        `Silakan catat secara manual dengan format:\n` +
        `\`-5000 deskripsi\` untuk pengeluaran\n` +
        `\`+50000 deskripsi\` untuk pemasukan`
      );
      return;
    }

    // Simpan transaksi
    const categoryMap = {
      dining: 'Makan', shopping: 'Belanja', transport: 'Transportasi',
      bills: 'Tagihan', fun: 'Hiburan', health: 'Kesehatan',
      gift: 'Hadiah', other: 'Lainnya'
    };

    const finalAmount = ocrResult.grandTotal || ocrResult.amount;

    const tx = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      amount: finalAmount,
      type: 'expense',
      category: ocrResult.category || 'other',
      date: ocrResult.date || new Date().toISOString().slice(0, 10),
      account: 'Bot OCR (Gemini)',
      note: ocrResult.merchant || 'Struk',
      created_at: new Date().toISOString(),
      user_id: userId
    };

    console.log('💾 Menyimpan transaksi OCR:', tx);
    await addTransaction(userId, tx);
    console.log('✅ Transaksi OCR berhasil disimpan');

    // Format response
    const formattedResponse = formatReceiptResponse(ocrResult, userId);

    await ctx.telegram.editMessageText(
      processingMsg.chat.id,
      processingMsg.message_id,
      null,
      formattedResponse,
      {
        parse_mode: 'Markdown',
        reply_markup: miniAppKeyboard([
          [{ text: '📊 Lihat di CatatanKu', path: '/' }]
        ])
      }
    );

  } catch (e) {
    console.error('❌ Error di handler photo:', e.message);
    console.error('❌ Stack:', e.stack);
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
    gemini_api_key_set: !!GEMINI_API_KEY,
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
