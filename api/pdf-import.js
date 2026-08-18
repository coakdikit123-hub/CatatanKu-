// api/pdf-import.js
const pdfParse = require('pdf-parse');
const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Parse PDF statement bank dan ekstrak transaksi menggunakan Gemini AI
 * @param {Buffer} buffer - Buffer file PDF
 * @param {Function} getCategoryId - fungsi untuk mapping kategori dari deskripsi
 * @returns {Promise<Array>} - Array transaksi CatatanKu
 */
async function parsePdfTransactions(buffer, getCategoryId) {
  // 1. Ekstrak teks dari PDF
  let text;
  try {
    const data = await pdfParse(buffer);
    text = data.text;
  } catch (e) {
    throw new Error('Gagal membaca PDF: ' + e.message);
  }

  if (!text || text.trim().length === 0) {
    throw new Error('PDF tidak mengandung teks yang dapat dibaca.');
  }

  // 2. Kirim ke Gemini untuk ekstrak transaksi
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY tidak ditemukan di environment variables.');
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `
Anda adalah AI yang membaca laporan keuangan dari bank (seperti MyBCA, BNI, Mandiri, dll). Dari teks di bawah ini, ekstrak semua transaksi. Setiap transaksi memiliki:
- Tanggal (format YYYY-MM-DD)
- Deskripsi (keterangan transaksi)
- Debit (jumlah pengeluaran, 0 jika tidak ada)
- Kredit (jumlah pemasukan, 0 jika tidak ada)
- Saldo (opsional, abaikan)

Teks laporan:
${text}

Kembalikan dalam format JSON array, setiap elemen memiliki field: date (string), description (string), debit (number, 0 jika tidak ada), credit (number, 0 jika tidak ada). Contoh:
[
  {"date":"2024-01-15","description":"TRANSFER DARI BCA","debit":0,"credit":500000},
  {"date":"2024-01-16","description":"PEMBELIAN TOKO ABC","debit":150000,"credit":0}
]
Hanya JSON, tidak ada teks lain.
`;

  const result = await model.generateContent(prompt);
  const responseText = result.response.text();

  // Bersihkan response (kemungkinan ada markdown)
  let jsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
  const jsonMatch = jsonStr.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    jsonStr = jsonMatch[0];
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    throw new Error('Gagal parsing JSON dari Gemini: ' + e.message);
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('Tidak ada transaksi yang ditemukan oleh AI.');
  }

  // 3. Konversi ke format transaksi CatatanKu
  const transactions = parsed.map(item => {
    const amount = item.debit > 0 ? item.debit : item.credit;
    const type = item.debit > 0 ? 'expense' : 'income';
    const catId = getCategoryId(item.description || '');
    return {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      amount: amount,
      type: type,
      category: catId,
      date: item.date || new Date().toISOString().slice(0, 10),
      account: 'Bank Import',
      note: item.description || 'Transaksi Bank',
      created_at: new Date().toISOString()
    };
  });

  return transactions;
}

module.exports = { parsePdfTransactions };
