// api/google-sheets.js
const { google } = require('googleapis');

async function exportToGoogleSheets(userId, transactions, spreadsheetId) {
  console.log('📤 Export to Google Sheets for user:', userId);
  console.log('📊 Jumlah transaksi:', transactions.length);

  const credentialsBase64 = process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS;
  if (!credentialsBase64) throw new Error('GOOGLE_SERVICE_ACCOUNT_CREDENTIALS tidak ditemukan');

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
  let sheetId = null;

  // Buat atau dapatkan sheet
  try {
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const sheet = spreadsheet.data.sheets.find(s => s.properties.title === sheetName);
    if (sheet) {
      sheetId = sheet.properties.sheetId;
      // Hapus semua data lama untuk refresh
      await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: `${sheetName}!A1:Z1000`,
      });
    } else {
      const addRes = await sheets.spreadsheets.batchUpdate({
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
      sheetId = addRes.data.replies[0].addSheet.properties.sheetId;
    }
  } catch (e) {
    throw new Error('Gagal mengakses spreadsheet: ' + e.message);
  }

  // === Siapkan data ===
  const headers = ['Tanggal', 'Jenis', 'Kategori', 'Catatan', 'Akun', 'Jumlah (Rp)'];

  // Data transaksi
  const rows = transactions.map(tx => [
    tx.date || '-',
    tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
    tx.category || '-',
    tx.note || '-',
    tx.account || '-',
    Number(tx.amount) || 0,
  ]);

  // Ringkasan
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  const balance = totalIncome - totalExpense;

  // === Gabungkan semua data ===
  // [header, ...rows, [], ['RINGKASAN KEUANGAN'], ['Total Pemasukan: ...'], ...]
  const dataRows = [
    headers,
    ...rows,
    [], // baris kosong
    ['RINGKASAN KEUANGAN'],
    [`Total Pemasukan: Rp ${totalIncome.toLocaleString('id-ID')}`],
    [`Total Pengeluaran: Rp ${totalExpense.toLocaleString('id-ID')}`],
    [`Saldo: Rp ${balance.toLocaleString('id-ID')}`],
    [`Total Transaksi: ${transactions.length}`],
  ];

  // === Tulis data ke sheet ===
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: dataRows },
  });

  // === Formatting ===
  const totalDataRows = rows.length; // jumlah baris data
  const totalCols = headers.length;
  const requests = [];

  // 1. Header: abu-abu terang, bold, border bawah
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
          textFormat: { bold: true },
          backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 },
          borders: {
            bottom: { style: 'SOLID', width: 1, color: { red: 0.7, green: 0.7, blue: 0.7 } },
          },
        },
      },
      fields: 'userEnteredFormat(textFormat,backgroundColor,borders)',
    },
  });

  // 2. Border untuk seluruh area data (header + data, tidak termasuk ringkasan)
  // Data berakhir di baris ke-(totalDataRows + 1), karena index dimulai dari 0
  const dataEndRow = totalDataRows + 1; // +1 karena ada header
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 0,
        endRowIndex: dataEndRow,
        startColumnIndex: 0,
        endColumnIndex: totalCols,
      },
      cell: {
        userEnteredFormat: {
          borders: {
            top: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
            bottom: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
            left: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
            right: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
          },
        },
      },
      fields: 'userEnteredFormat.borders',
    },
  });

  // 3. Format angka kolom Jumlah (kolom F, index 5) dengan pemisah ribuan
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: totalDataRows + 1,
        startColumnIndex: 5,
        endColumnIndex: 6,
      },
      cell: {
        userEnteredFormat: {
          numberFormat: { type: 'NUMBER', pattern: '#,##0' },
        },
      },
      fields: 'userEnteredFormat.numberFormat',
    },
  });

  // 4. Freeze header
  requests.push({
    updateSheetProperties: {
      properties: {
        sheetId,
        gridProperties: { frozenRowCount: 1 },
      },
      fields: 'gridProperties.frozenRowCount',
    },
  });

  // 5. Auto resize kolom A-F
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

  // 6. Filter dropdown di header
  requests.push({
    addFilterView: {
      filter: {
        range: {
          sheetId,
          startRowIndex: 0,
          endRowIndex: totalDataRows + 1,
          startColumnIndex: 0,
          endColumnIndex: totalCols,
        },
      },
    },
  });

  // 7. Background ringkasan (light blue)
  const summaryStartRow = totalDataRows + 2; // baris kosong pertama setelah data
  const summaryEndRow = dataRows.length;
  if (summaryStartRow < summaryEndRow) {
    requests.push({
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: summaryStartRow,
          endRowIndex: summaryEndRow,
          startColumnIndex: 0,
          endColumnIndex: totalCols,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.95, green: 0.96, blue: 0.99 },
          },
        },
      },
      fields: 'userEnteredFormat.backgroundColor',
    });
  }

  // 8. Bold untuk "RINGKASAN KEUANGAN"
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: summaryStartRow,
        endRowIndex: summaryStartRow + 1,
        startColumnIndex: 0,
        endColumnIndex: 1,
      },
      cell: {
        userEnteredFormat: {
          textFormat: { bold: true },
        },
      },
      fields: 'userEnteredFormat.textFormat',
    },
  });

  if (requests.length) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests },
    });
  }

  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${sheetId}`;
  return url;
}

module.exports = { exportToGoogleSheets };
