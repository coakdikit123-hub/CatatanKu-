// api/google-sheets.js
const { google } = require('googleapis');

/**
 * Ekspor transaksi ke Google Sheets dengan format profesional + summary
 */
async function exportToGoogleSheets(userId, transactions, spreadsheetId) {
  console.log(`📤 Export to Google Sheets for user: ${userId}`);
  console.log(`📊 Transactions: ${transactions.length}`);

  // 1. Load credentials
  const credentialsBase64 = process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS;
  if (!credentialsBase64) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_CREDENTIALS tidak ditemukan');
  }

  let credentials;
  try {
    const jsonStr = Buffer.from(credentialsBase64, 'base64').toString('utf-8');
    credentials = JSON.parse(jsonStr);
  } catch (e) {
    throw new Error('Gagal memproses kredensial Google: ' + e.message);
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  const sheetName = `Transaksi ${userId}`;

  // --- 2. Cek / buat sheet ---
  let sheetId = null;
  let sheetExists = false;
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
    // Buat sheet baru
    const addSheetRes = await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: sheetName,
                gridProperties: { rowCount: 1, columnCount: 10 },
              },
            },
          },
        ],
      },
    });
    sheetId = addSheetRes.data.replies[0].addSheet.properties.sheetId;
    console.log(`✅ Sheet "${sheetName}" dibuat dengan ID: ${sheetId}`);
  }

  // --- 3. Clear seluruh sheet (agar data selalu fresh) ---
  if (sheetId !== null) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            updateCells: {
              range: {
                sheetId: sheetId,
                startRowIndex: 0,
                startColumnIndex: 0,
              },
              fields: '*',
            },
          },
        ],
      },
    });
    console.log('🧹 Sheet cleared');
  }

  // --- 4. Siapkan data ---
  // Hitung total
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const balance = totalIncome - totalExpense;

  // Header + data
  const headers = ['Tanggal', 'Jenis', 'Kategori', 'Catatan', 'Akun', 'Jumlah (Rp)'];
  const rows = transactions.map(tx => [
    tx.date || '-',
    tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
    tx.category || '-',
    tx.note || '-',
    tx.account || '-',
    Number(tx.amount),
  ]);

  // --- 5. Susun tabel utama + summary ---
  // Kita akan letakkan summary di baris pertama (3 baris), lalu data di bawahnya
  const summaryRows = [
    ['📊 LAPORAN KEUANGAN', '', '', '', '', ''],
    ['Total Pemasukan', totalIncome, '', '', '', ''],
    ['Total Pengeluaran', totalExpense, '', '', '', ''],
    ['Saldo', balance, '', '', '', ''],
    ['Total Transaksi', transactions.length, '', '', '', ''],
    [], // baris kosong
  ];

  // Gabungkan summary + header + data
  const allValues = [
    ...summaryRows,
    headers,
    ...rows,
  ];

  // Tulis data dari A1
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: allValues },
  });
  console.log(`✅ Data ditulis: ${allValues.length} baris`);

  // --- 6. Formatting profesional ---
  const totalRows = allValues.length;
  const totalCols = headers.length;

  const requests = [];

  // Helper ambil sheetId
  const getSheetId = async () => {
    if (sheetId !== null) return sheetId;
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const sheet = spreadsheet.data.sheets.find(s => s.properties.title === sheetName);
    if (!sheet) throw new Error('Sheet tidak ditemukan');
    return sheet.properties.sheetId;
  };

  const sid = await getSheetId();

  // 6a. Bold & background untuk baris summary (0-5)
  for (let i = 0; i < 5; i++) {
    const isHeaderRow = (i === 0);
    const bgColor = isHeaderRow
      ? { red: 0.2, green: 0.4, blue: 0.7 }
      : { red: 0.95, green: 0.95, blue: 0.95 };
    const textColor = isHeaderRow
      ? { red: 1, green: 1, blue: 1 }
      : { red: 0, green: 0, blue: 0 };
    const isBold = isHeaderRow;

    requests.push({
      repeatCell: {
        range: {
          sheetId: sid,
          startRowIndex: i,
          endRowIndex: i + 1,
          startColumnIndex: 0,
          endColumnIndex: totalCols,
        },
        cell: {
          userEnteredFormat: {
            textFormat: {
              bold: isBold,
              foregroundColor: textColor,
            },
            backgroundColor: bgColor,
          },
        },
        fields: 'userEnteredFormat(textFormat,backgroundColor)',
      },
    });
  }

  // 6b. Header data (baris ke-6) = bold + bg biru
  const headerRowIndex = 6; // karena 5 baris summary + 1 baris kosong
  requests.push({
    repeatCell: {
      range: {
        sheetId: sid,
        startRowIndex: headerRowIndex,
        endRowIndex: headerRowIndex + 1,
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

  // 6c. Format angka kolom "Jumlah (Rp)" untuk semua data (mulai dari baris 7)
  requests.push({
    repeatCell: {
      range: {
        sheetId: sid,
        startRowIndex: headerRowIndex + 1,
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

  // 6d. Zebra stripes untuk data (baris 7 - end)
  for (let i = headerRowIndex + 1; i < totalRows; i++) {
    const isEven = (i - headerRowIndex) % 2 === 0;
    const bgColor = isEven
      ? { red: 0.98, green: 0.98, blue: 1.0 }
      : { red: 1, green: 1, blue: 1 };
    requests.push({
      repeatCell: {
        range: {
          sheetId: sid,
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

  // 6e. Auto resize kolom A-F
  for (let col = 0; col < totalCols; col++) {
    requests.push({
      autoResizeDimensions: {
        dimensions: {
          sheetId: sid,
          dimension: 'COLUMNS',
          startIndex: col,
          endIndex: col + 1,
        },
      },
    });
  }

  // 6f. Freeze header data (baris ke-6)
  requests.push({
    updateSheetProperties: {
      properties: {
        sheetId: sid,
        gridProperties: {
          frozenRowCount: headerRowIndex + 1, // freeze sampai header data
        },
      },
      fields: 'gridProperties.frozenRowCount',
    },
  });

  // 6g. Filter di header data
  requests.push({
    addFilterView: {
      filter: {
        range: {
          sheetId: sid,
          startRowIndex: headerRowIndex,
          endRowIndex: totalRows,
          startColumnIndex: 0,
          endColumnIndex: totalCols,
        },
      },
    },
  });

  // --- 7. Eksekusi formatting ---
  if (requests.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests },
    });
    console.log('✅ Formatting diterapkan');
  }

  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${sid}`;
  console.log('🔗 URL:', url);
  return url;
}

module.exports = { exportToGoogleSheets };
