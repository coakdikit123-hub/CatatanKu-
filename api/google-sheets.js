// api/google-sheets.js
const { google } = require('googleapis');

/**
 * Ekspor transaksi ke Google Sheets dengan formatting profesional + summary
 * @param {string} userId - ID user
 * @param {Array} transactions - Array transaksi
 * @param {string} spreadsheetId - ID Google Sheet (dari environment)
 * @returns {Promise<string>} - URL spreadsheet
 */
async function exportToGoogleSheets(userId, transactions, spreadsheetId) {
  console.log('📤 exportToGoogleSheets called for user:', userId);
  console.log('📊 Jumlah transaksi:', transactions.length);

  // Ambil credentials dari environment
  const credentialsBase64 = process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS;
  if (!credentialsBase64) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_CREDENTIALS tidak ditemukan');
  }

  let credentials;
  try {
    const jsonStr = Buffer.from(credentialsBase64, 'base64').toString('utf-8');
    credentials = JSON.parse(jsonStr);
    console.log('✅ Credentials parsed, client_email:', credentials.client_email);
  } catch (e) {
    throw new Error('Gagal memproses kredensial Google: ' + e.message);
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  const sheetName = `Transaksi ${userId}`;

  // --- 1. Buat sheet jika belum ada ---
  let sheetExists = false;
  try {
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetsList = spreadsheet.data.sheets || [];
    for (const s of sheetsList) {
      if (s.properties && s.properties.title === sheetName) {
        sheetExists = true;
        break;
      }
    }
  } catch (e) {
    throw new Error('Gagal mengakses spreadsheet: ' + e.message);
  }

  if (!sheetExists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: sheetName,
                gridProperties: { rowCount: 1, columnCount: 6 },
              },
            },
          },
        ],
      },
    });
    console.log(`✅ Sheet "${sheetName}" dibuat`);
  }

  // --- 2. Siapkan data transaksi ---
  const headers = ['Tanggal', 'Jenis', 'Kategori', 'Catatan', 'Akun', 'Jumlah (Rp)'];
  const rows = transactions.map(tx => [
    tx.date || '-',
    tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
    tx.category || '-',
    tx.note || '-',
    tx.account || '-',
    Number(tx.amount),
  ]);

  // --- 3. Hitung summary ---
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  const balance = totalIncome - totalExpense;
  const totalTx = transactions.length;

  // Kategori terbanyak (pengeluaran)
  const catMap = {};
  transactions.filter(t => t.type === 'expense').forEach(t => {
    const cat = t.category || 'other';
    catMap[cat] = (catMap[cat] || 0) + Number(t.amount);
  });
  let topCategory = null;
  let topAmount = 0;
  for (const [cat, amt] of Object.entries(catMap)) {
    if (amt > topAmount) { topAmount = amt; topCategory = cat; }
  }
  const topCategoryLabel = topCategory ? (CATEGORY_LABELS?.[topCategory] || topCategory) : '—';

  // Budget (ambil dari environment atau default)
  const budget = 2000000; // default, bisa diambil dari database jika ada

  // --- 4. Gabungkan data transaksi + summary rows ---
  const allRows = [...rows];
  // Tambahkan 1 baris kosong setelah data
  allRows.push(['', '', '', '', '', '']);
  // Summary header
  allRows.push(['📊 RINGKASAN KEUANGAN', '', '', '', '', '']);
  allRows.push(['Total Pemasukan', '', '', '', '', totalIncome]);
  allRows.push(['Total Pengeluaran', '', '', '', '', totalExpense]);
  allRows.push(['Saldo', '', '', '', '', balance]);
  allRows.push(['Jumlah Transaksi', '', '', '', '', totalTx]);
  allRows.push(['Kategori Terbanyak', '', '', '', '', topCategoryLabel + (topAmount > 0 ? ` (Rp ${topAmount.toLocaleString('id-ID')})` : '')]);
  allRows.push(['Budget Bulanan', '', '', '', '', budget]);
  allRows.push(['Sisa Budget', '', '', '', '', budget - totalExpense]);

  // --- 5. Tulis data ---
  const values = [headers, ...allRows];
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  });
  console.log(`✅ Data berhasil ditulis (${values.length} baris)`);

  // --- 6. Dapatkan sheetId ---
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const sheet = spreadsheet.data.sheets.find(s => s.properties.title === sheetName);
  if (!sheet) throw new Error('Sheet tidak ditemukan');
  const sheetId = sheet.properties.sheetId;

  const totalRows = values.length;
  const totalCols = headers.length;

  const requests = [];

  // 6a. Bold & background header
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 0,
        endRowIndex: 1,
        startColumnIndex: 0,
        endColumnIndex: totalCols,
      },
      cell: {
        userEnteredFormat: {
          textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
          backgroundColor: { red: 0.2, green: 0.4, blue: 0.7 },
        },
      },
      fields: 'userEnteredFormat(textFormat,backgroundColor)',
    },
  });

  // 6b. Format angka di kolom Jumlah (Rp) untuk seluruh baris (termasuk summary)
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: totalRows,
        startColumnIndex: 5,
        endColumnIndex: 6,
      },
      cell: {
        userEnteredFormat: {
          numberFormat: {
            type: 'NUMBER',
            pattern: '#,##0',
          },
        },
      },
      fields: 'userEnteredFormat.numberFormat',
    },
  });

  // 6c. Zebra stripes untuk data transaksi saja (baris 1 sampai totalRows - summary)
  // Summary dimulai setelah baris data + 1 kosong
  const dataEndRow = rows.length + 1; // index 0-based, jadi baris terakhir data = rows.length
  for (let i = 1; i <= rows.length; i++) {
    const isEven = i % 2 === 0;
    const bgColor = isEven
      ? { red: 0.98, green: 0.98, blue: 1.0 }
      : { red: 1, green: 1, blue: 1 };
    requests.push({
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: i,
          endRowIndex: i + 1,
          startColumnIndex: 0,
          endColumnIndex: totalCols,
        },
        cell: {
          userEnteredFormat: { backgroundColor: bgColor },
        },
        fields: 'userEnteredFormat.backgroundColor',
      },
    });
  }

  // 6d. Format summary rows (tebal untuk label, background abu-abu muda)
  const summaryStartRow = rows.length + 2; // setelah data + 1 baris kosong
  const summaryEndRow = totalRows;

  // Background abu-abu muda untuk seluruh baris summary
  for (let i = summaryStartRow; i < summaryEndRow; i++) {
    requests.push({
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: i,
          endRowIndex: i + 1,
          startColumnIndex: 0,
          endColumnIndex: totalCols,
        },
        cell: {
          userEnteredFormat: { backgroundColor: { red: 0.95, green: 0.95, blue: 0.95 } },
        },
        fields: 'userEnteredFormat.backgroundColor',
      },
    });
  }

  // 6e. Bold untuk label summary (kolom A)
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: summaryStartRow,
        endRowIndex: summaryEndRow,
        startColumnIndex: 0,
        endColumnIndex: 1,
      },
      cell: {
        userEnteredFormat: {
          textFormat: { bold: true },
        },
      },
      fields: 'userEnteredFormat.textFormat.bold',
    },
  });

  // 6f. Auto resize kolom A-F
  for (let col = 0; col < totalCols; col++) {
    requests.push({
      autoResizeDimensions: {
        dimensions: {
          sheetId,
          dimension: 'COLUMNS',
          startIndex: col,
          endIndex: col + 1,
        },
      },
    });
  }

  // 6g. Freeze header
  requests.push({
    updateSheetProperties: {
      properties: {
        sheetId,
        gridProperties: {
          frozenRowCount: 1,
        },
      },
      fields: 'gridProperties.frozenRowCount',
    },
  });

  // 6h. Tambahkan filter
  requests.push({
    addFilterView: {
      filter: {
        range: {
          sheetId,
          startRowIndex: 0,
          endRowIndex: rows.length + 1, // sampai data terakhir
          startColumnIndex: 0,
          endColumnIndex: totalCols,
        },
      },
    },
  });

  // --- 7. Eksekusi semua permintaan formatting ---
  if (requests.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests },
    });
    console.log('✅ Formatting profesional selesai');
  }

  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=0`;
  console.log('🔗 URL:', url);
  return url;
}

// Map label kategori (jika tidak ada, gunakan nama asli)
const CATEGORY_LABELS = {
  dining: 'Makan',
  shopping: 'Belanja',
  transport: 'Transportasi',
  bills: 'Tagihan',
  fun: 'Hiburan',
  health: 'Kesehatan',
  gift: 'Hadiah',
  other: 'Lainnya'
};

module.exports = { exportToGoogleSheets };
