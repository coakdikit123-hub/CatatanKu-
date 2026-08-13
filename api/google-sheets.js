// api/google-sheets.js
const { google } = require('googleapis');

/**
 * Ekspor transaksi ke Google Sheets dengan formatting profesional
 * @param {string} userId - ID user
 * @param {Array} transactions - Array transaksi
 * @param {string} spreadsheetId - ID Google Sheet (dari environment)
 * @returns {Promise<string>} - URL spreadsheet
 */
async function exportToGoogleSheets(userId, transactions, spreadsheetId) {
  console.log('📤 Export to Google Sheets for user:', userId);
  console.log('📊 Jumlah transaksi:', transactions.length);

  // --- 1. Ambil credentials ---
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

  // --- 2. Buat atau gunakan sheet ---
  const sheetName = `Transaksi ${userId}`;
  let sheetExists = false;
  let sheetId = null;

  try {
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetsList = spreadsheet.data.sheets || [];
    for (const s of sheetsList) {
      if (s.properties && s.properties.title === sheetName) {
        sheetExists = true;
        sheetId = s.properties.sheetId;
        break;
      }
    }
  } catch (e) {
    throw new Error('Gagal mengakses spreadsheet: ' + e.message);
  }

  if (!sheetExists) {
    const addSheetRes = await sheets.spreadsheets.batchUpdate({
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
    sheetId = addSheetRes.data.replies[0].addSheet.properties.sheetId;
    console.log(`✅ Sheet "${sheetName}" dibuat`);
  }

  // --- 3. Siapkan data (header + transaksi) ---
  const headers = ['Tanggal', 'Jenis', 'Kategori', 'Catatan', 'Akun', 'Jumlah (Rp)'];

  // Pastikan data tidak kosong
  const safeTransactions = transactions.map(tx => ({
    date: tx.date || '-',
    type: tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
    category: tx.category || '-',
    note: tx.note || '-',
    account: tx.account || '-',
    amount: Number(tx.amount) || 0,
  }));

  const rows = safeTransactions.map(tx => [
    tx.date,
    tx.type,
    tx.category,
    tx.note,
    tx.account,
    tx.amount,
  ]);

  // --- 4. Hitung ringkasan ---
  const totalIncome = safeTransactions.filter(t => t.type === 'Pemasukan').reduce((s, t) => s + t.amount, 0);
  const totalExpense = safeTransactions.filter(t => t.type === 'Pengeluaran').reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;

  // --- 5. Tambahkan baris kosong dan ringkasan ---
  const summaryRows = [
    ['', '', '', '', '', ''],
    ['📊 RINGKASAN KEUANGAN', '', '', '', '', ''],
    [`💰 Total Pemasukan: Rp ${totalIncome.toLocaleString('id-ID')}`, '', '', '', '', ''],
    [`💸 Total Pengeluaran: Rp ${totalExpense.toLocaleString('id-ID')}`, '', '', '', '', ''],
    [`📈 Saldo: Rp ${balance.toLocaleString('id-ID')}`, '', '', '', '', ''],
    ['', '', '', '', '', ''],
    [`📌 Total Transaksi: ${transactions.length}`, '', '', '', '', ''],
  ];

  const allRows = [headers, ...rows, ...summaryRows];

  // --- 6. Tulis data ke sheet ---
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: allRows },
  });
  console.log(`✅ Data berhasil ditulis (${allRows.length} baris)`);

  // --- 7. Terapkan formatting profesional ---
  const totalRows = allRows.length;
  const totalCols = headers.length;

  // Pastikan sheetId didapat
  if (!sheetId) {
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const sheet = spreadsheet.data.sheets.find(s => s.properties.title === sheetName);
    if (!sheet) throw new Error('Sheet tidak ditemukan');
    sheetId = sheet.properties.sheetId;
  }

  const requests = [];

  // 7a. Header: bold, putih, background biru tua
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
          backgroundColor: { red: 0.15, green: 0.35, blue: 0.65 },
        },
      },
      fields: 'userEnteredFormat(textFormat,backgroundColor)',
    },
  });

  // 7b. Format kolom Jumlah (kolom F, index 5) sebagai angka dengan pemisah ribuan
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: totalRows - summaryRows.length - 1, // hanya data transaksi, bukan summary
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

  // 7c. Zebra stripes untuk data transaksi
  const dataRowCount = rows.length;
  for (let i = 1; i <= dataRowCount; i++) {
    const isEven = i % 2 === 0;
    const bgColor = isEven
      ? { red: 0.97, green: 0.97, blue: 0.99 }
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

  // 7d. Bold untuk baris ringkasan
  const summaryStartRow = dataRowCount + 2; // setelah data + 1 baris kosong
  const summaryEndRow = allRows.length;
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: summaryStartRow,
        endRowIndex: summaryEndRow,
        startColumnIndex: 0,
        endColumnIndex: 1, // hanya kolom A
      },
      cell: {
        userEnteredFormat: {
          textFormat: { bold: true },
        },
      },
      fields: 'userEnteredFormat.textFormat',
    },
  });

  // 7e. Auto resize semua kolom
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

  // 7f. Freeze header row
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

  // 7g. Tambahkan filter (dropdown) di header
  requests.push({
    addFilterView: {
      filter: {
        range: {
          sheetId,
          startRowIndex: 0,
          endRowIndex: dataRowCount + 1, // data + header
          startColumnIndex: 0,
          endColumnIndex: totalCols,
        },
      },
    },
  });

  // 7h. Warna latar belakang ringkasan (light blue)
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: summaryStartRow - 1, // baris "RINGKASAN"
        endRowIndex: summaryEndRow,
        startColumnIndex: 0,
        endColumnIndex: totalCols,
      },
      cell: {
        userEnteredFormat: {
          backgroundColor: { red: 0.92, green: 0.94, blue: 0.98 },
        },
      },
      fields: 'userEnteredFormat.backgroundColor',
    },
  });

  // --- 8. Eksekusi semua permintaan formatting ---
  if (requests.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests },
    });
    console.log('✅ Formatting profesional berhasil diterapkan');
  }

  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${sheetId}`;
  console.log('🔗 URL:', url);
  return url;
}

module.exports = { exportToGoogleSheets };
