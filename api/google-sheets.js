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

  // --- 2. Siapkan data (angka tanpa format) ---
  const headers = ['Tanggal', 'Jenis', 'Kategori', 'Catatan', 'Akun', 'Jumlah (Rp)'];
  const rows = transactions.map(tx => [
    tx.date || '-',
    tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
    tx.category || '-',
    tx.note || '-',
    tx.account || '-',
    Number(tx.amount), // angka murni, nanti akan diformat
  ]);

  const values = [headers, ...rows];

  // --- 3. Tulis data ---
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!A1`,
    valueInputOption: 'USER_ENTERED', // agar angka dikenali sebagai angka
    requestBody: { values },
  });
  console.log(`✅ Data berhasil ditulis (${values.length} baris)`);

  // --- 4. Formatting profesional ---
  const totalRows = values.length;
  const totalCols = headers.length;

  const requests = [];

  // 4a. Bold & background header (row 1)
  requests.push({
    repeatCell: {
      range: {
        sheetId: (await getSheetId(sheets, spreadsheetId, sheetName)),
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

  // 4b. Format angka kolom "Jumlah (Rp)" sebagai mata uang (pemisah ribuan)
  requests.push({
    repeatCell: {
      range: {
        sheetId: (await getSheetId(sheets, spreadsheetId, sheetName)),
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

  // 4c. Zebra stripes (warna baris bergantian)
  for (let i = 1; i < totalRows; i++) {
    const isEven = i % 2 === 0;
    const bgColor = isEven
      ? { red: 0.98, green: 0.98, blue: 1.0 }
      : { red: 1, green: 1, blue: 1 };
    requests.push({
      repeatCell: {
        range: {
          sheetId: (await getSheetId(sheets, spreadsheetId, sheetName)),
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

  // 4d. Auto resize kolom A-F
  for (let col = 0; col < totalCols; col++) {
    requests.push({
      autoResizeDimensions: {
        dimensions: {
          sheetId: (await getSheetId(sheets, spreadsheetId, sheetName)),
          dimension: 'COLUMNS',
          startIndex: col,
          endIndex: col + 1,
        },
      },
    });
  }

  // 4e. Freeze header row (agar tetap terlihat saat scroll)
  requests.push({
    updateSheetProperties: {
      properties: {
        sheetId: (await getSheetId(sheets, spreadsheetId, sheetName)),
        gridProperties: {
          frozenRowCount: 1,
        },
      },
      fields: 'gridProperties.frozenRowCount',
    },
  });

  // 4f. Tambahkan filter (dropdown di header)
  requests.push({
    addFilterView: {
      filter: {
        range: {
          sheetId: (await getSheetId(sheets, spreadsheetId, sheetName)),
          startRowIndex: 0,
          endRowIndex: totalRows,
          startColumnIndex: 0,
          endColumnIndex: totalCols,
        },
      },
    },
  });

  // --- 5. Eksekusi semua permintaan formatting ---
  if (requests.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests },
    });
    console.log('✅ Formatting profesional berhasil diterapkan');
  }

  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=0`;
  console.log('🔗 URL:', url);
  return url;
}

// Helper: dapatkan sheetId dari nama sheet
async function getSheetId(sheets, spreadsheetId, sheetName) {
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const sheet = spreadsheet.data.sheets.find(s => s.properties.title === sheetName);
  if (!sheet) throw new Error('Sheet tidak ditemukan');
  return sheet.properties.sheetId;
}

module.exports = { exportToGoogleSheets };
