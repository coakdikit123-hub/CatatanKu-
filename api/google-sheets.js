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
  console.log('📤 exportToGoogleSheets called for user:', userId);
  console.log('📊 Jumlah transaksi:', transactions.length);

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

  // --- 1. Cek/Buat sheet ---
  let sheetExists = false;
  let sheetId;
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
                gridProperties: { rowCount: 1, columnCount: 7 },
              },
            },
          },
        ],
      },
    });
    sheetId = addSheetRes.data.replies[0].addSheet.properties.sheetId;
    console.log(`✅ Sheet "${sheetName}" dibuat`);
  }

  // --- 2. Hitung total ---
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const balance = totalIncome - totalExpense;

  // --- 3. Siapkan data (7 kolom) ---
  const headers = ['Tanggal', 'Jenis', 'Kategori', 'Catatan', 'Akun', 'Jumlah (Rp)'];
  // Tambahkan baris kosong, lalu baris total
  const rows = transactions.map(tx => [
    tx.date || '-',
    tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
    tx.category || '-',
    tx.note || '-',
    tx.account || '-',
    Number(tx.amount),
  ]);

  // Tambahkan 2 baris kosong, lalu total
  const emptyRow = ['', '', '', '', '', ''];
  const totalRow = [
    'TOTAL', // Tanggal
    '',      // Jenis
    '',      // Kategori
    '',      // Catatan
    '',      // Akun
    ''       // Jumlah (akan diisi formula)
  ];

  // Formula untuk total (SUM kolom F)
  const totalFormula = `=SUM(F2:F${rows.length + 1})`;

  const values = [
    headers,
    ...rows,
    emptyRow,
    emptyRow,
    ['', '', '', '', 'TOTAL PEMASUKAN', totalFormula],
    ['', '', '', '', 'TOTAL PENGELUARAN', ''],
    ['', '', '', '', 'SALDO', ''],
  ];

  // --- 4. Tulis data ---
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  });
  console.log(`✅ Data berhasil ditulis (${values.length} baris)`);

  // --- 5. Formatting ---
  const totalRows = values.length;
  const totalCols = headers.length;

  const requests = [];

  // 5a. Bold & background header (row 1)
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

  // 5b. Format angka kolom "Jumlah (Rp)" sebagai mata uang
  const jumlahColIndex = 5; // kolom F (0-based)
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: totalRows - 3, // sampai sebelum baris total
        startColumnIndex: jumlahColIndex,
        endColumnIndex: jumlahColIndex + 1,
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

  // 5c. Format total dengan bold & warna hijau/biru
  const totalRowIndex = totalRows - 3; // baris "TOTAL PEMASUKAN"
  const totalExpenseRowIndex = totalRows - 2;
  const balanceRowIndex = totalRows - 1;

  // TOTAL PEMASUKAN (hijau)
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: totalRowIndex,
        endRowIndex: totalRowIndex + 1,
        startColumnIndex: 4,
        endColumnIndex: 6,
      },
      cell: {
        userEnteredFormat: {
          textFormat: { bold: true, foregroundColor: { red: 0, green: 0.5, blue: 0 } },
        },
      },
      fields: 'userEnteredFormat.textFormat',
    },
  });

  // TOTAL PENGELUARAN (merah)
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: totalExpenseRowIndex,
        endRowIndex: totalExpenseRowIndex + 1,
        startColumnIndex: 4,
        endColumnIndex: 6,
      },
      cell: {
        userEnteredFormat: {
          textFormat: { bold: true, foregroundColor: { red: 0.9, green: 0.1, blue: 0.1 } },
        },
      },
      fields: 'userEnteredFormat.textFormat',
    },
  });

  // SALDO (biru)
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: balanceRowIndex,
        endRowIndex: balanceRowIndex + 1,
        startColumnIndex: 4,
        endColumnIndex: 6,
      },
      cell: {
        userEnteredFormat: {
          textFormat: { bold: true, foregroundColor: { red: 0, green: 0.2, blue: 0.8 } },
        },
      },
      fields: 'userEnteredFormat.textFormat',
    },
  });

  // 5d. Zebra stripes (warna baris bergantian)
  for (let i = 1; i < totalRows - 3; i++) { // jangan sampai baris total
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

  // 5e. Auto resize kolom A-F
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

  // 5f. Freeze header row
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

  // 5g. Tambahkan filter
  requests.push({
    addFilterView: {
      filter: {
        range: {
          sheetId,
          startRowIndex: 0,
          endRowIndex: totalRows - 3, // hanya di area data, tidak termasuk total
          startColumnIndex: 0,
          endColumnIndex: totalCols,
        },
      },
    },
  });

  // --- 6. Eksekusi semua permintaan ---
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
