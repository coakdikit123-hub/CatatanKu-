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
  try {
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const sheet = spreadsheet.data.sheets.find(s => s.properties.title === sheetName);
    if (sheet) {
      sheetId = sheet.properties.sheetId;
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

  // Data
  const headers = ['Tanggal', 'Jenis', 'Kategori', 'Catatan', 'Akun', 'Jumlah (Rp)'];
  const rows = transactions.map(tx => [
    tx.date || '-',
    tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
    tx.category || '-',
    tx.note || '-',
    tx.account || '-',
    Number(tx.amount) || 0,
  ]);

  // Ringkasan (tanpa duplikasi)
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  const balance = totalIncome - totalExpense;

  const summaryRows = [
    [],
    ['RINGKASAN KEUANGAN', '', '', '', '', ''],
    [`Total Pemasukan: Rp ${totalIncome.toLocaleString('id-ID')}`, '', '', '', '', ''],
    [`Total Pengeluaran: Rp ${totalExpense.toLocaleString('id-ID')}`, '', '', '', '', ''],
    [`Saldo: Rp ${balance.toLocaleString('id-ID')}`, '', '', '', '', ''],
    [`Total Transaksi: ${transactions.length}`, '', '', '', '', ''],
  ];

  const allRows = [headers, ...rows, ...summaryRows];

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: allRows },
  });

  // Formatting
  const totalDataRows = rows.length;
  const totalCols = headers.length;
  const requests = [];

  // 1. Header: biru tua, teks putih, bold, border bawah
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
          borders: {
            bottom: { style: 'SOLID', width: 1, color: { red: 0.1, green: 0.25, blue: 0.55 } },
          },
        },
      },
      fields: 'userEnteredFormat(textFormat,backgroundColor,borders)',
    },
  });

  // 2. Zebra stripes untuk data (putih dan biru muda)
  for (let i = 1; i <= totalDataRows; i++) {
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

  // 3. Border seluruh sel data (header + data, sebelum ringkasan)
  const dataEndRow = totalDataRows + 1;
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

  // 4. Format angka kolom Jumlah (pemisah ribuan)
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

  // 5. Freeze header
  requests.push({
    updateSheetProperties: {
      properties: {
        sheetId,
        gridProperties: { frozenRowCount: 1 },
      },
      fields: 'gridProperties.frozenRowCount',
    },
  });

  // 6. Auto resize kolom
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

  // 7. Filter dropdown di header
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

  // 8. Background ringkasan (light blue)
  const summaryStartRow = totalDataRows + 2;
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: summaryStartRow - 1,
        endRowIndex: allRows.length,
        startColumnIndex: 0,
        endColumnIndex: totalCols,
      },
      cell: {
        userEnteredFormat: {
          backgroundColor: { red: 0.95, green: 0.96, blue: 0.99 },
        },
      },
      fields: 'userEnteredFormat.backgroundColor',
    },
  });

  // 9. Bold untuk "RINGKASAN KEUANGAN"
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: summaryStartRow - 1,
        endRowIndex: summaryStartRow,
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
