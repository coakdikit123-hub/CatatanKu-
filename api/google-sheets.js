// api/google-sheets.js
const { google } = require('googleapis');

/**
 * Ekspor transaksi ke Google Sheets dengan format menarik
 * @param {string} userId - ID user
 * @param {Array} transactions - Array transaksi
 * @param {string} spreadsheetId - ID Google Sheet (dari environment)
 * @returns {Promise<string>} - URL spreadsheet
 */
async function exportToGoogleSheets(userId, transactions, spreadsheetId) {
  console.log('📤 exportToGoogleSheets called for user:', userId);
  console.log('📊 Jumlah transaksi:', transactions.length);
  console.log('🔑 spreadsheetId:', spreadsheetId);

  const credentialsBase64 = process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS;
  console.log('🔐 credentialsBase64 exists?', !!credentialsBase64);
  if (!credentialsBase64) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_CREDENTIALS tidak ditemukan');
  }

  let credentials;
  try {
    const jsonStr = Buffer.from(credentialsBase64, 'base64').toString('utf-8');
    credentials = JSON.parse(jsonStr);
    console.log('✅ Credentials parsed successfully');
    console.log('📧 client_email:', credentials.client_email);
  } catch (e) {
    console.error('❌ Gagal memproses kredensial Google:', e.message);
    throw new Error('Gagal memproses kredensial Google: ' + e.message);
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const drive = google.drive({ version: 'v3', auth });

  const sheetName = `Transaksi ${userId}`;

  // Cek apakah sheet dengan nama itu sudah ada
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
    console.log(`📄 Sheet "${sheetName}" exists? ${sheetExists}`);
  } catch (e) {
    console.error('❌ Gagal mengakses spreadsheet:', e.message);
    throw new Error('Gagal mengakses spreadsheet: ' + e.message);
  }

  if (!sheetExists) {
    // Tambahkan sheet baru
    const addSheetResponse = await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: sheetName,
                gridProperties: { rowCount: 1000, columnCount: 6 },
              },
            },
          },
        ],
      },
    });
    sheetId = addSheetResponse.data.replies[0].addSheet.properties.sheetId;
    console.log(`✅ Sheet "${sheetName}" berhasil dibuat dengan ID: ${sheetId}`);
  }

  // Siapkan data
  const headers = ['Tanggal', 'Jenis', 'Kategori', 'Catatan', 'Akun', 'Jumlah'];
  const rows = transactions.map(tx => [
    tx.date || '-',
    tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
    tx.category || '-',
    tx.note || '-',
    tx.account || '-',
    Number(tx.amount).toLocaleString('id-ID'),
  ]);

  const values = [headers, ...rows];
  console.log(`📝 Data siap: ${values.length} baris`);

  // Tulis data ke sheet (mulai dari cell A1)
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values },
  });

  // ---- FORMAT TABEL ----
  const requests = [];

  // 1. Format header: bold, background biru tua, teks putih, center align
  requests.push({
    repeatCell: {
      range: {
        sheetId: sheetId,
        startRowIndex: 0,
        endRowIndex: 1,
        startColumnIndex: 0,
        endColumnIndex: 6,
      },
      cell: {
        userEnteredFormat: {
          backgroundColor: { red: 0.2, green: 0.3, blue: 0.6 },
          textFormat: {
            bold: true,
            foregroundColor: { red: 1, green: 1, blue: 1 },
            fontSize: 12,
          },
          horizontalAlignment: 'CENTER',
          verticalAlignment: 'MIDDLE',
        },
      },
      fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)',
    },
  });

  // 2. Format body: border, warna sel bergantian, center untuk kolom tertentu
  const totalRows = values.length;
  // Border untuk semua sel (kecuali header)
  requests.push({
    updateBorders: {
      range: {
        sheetId: sheetId,
        startRowIndex: 0,
        startColumnIndex: 0,
        endRowIndex: totalRows,
        endColumnIndex: 6,
      },
      top: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
      bottom: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
      left: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
      right: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
      innerHorizontal: { style: 'SOLID', width: 1, color: { red: 0.9, green: 0.9, blue: 0.9 } },
      innerVertical: { style: 'SOLID', width: 1, color: { red: 0.9, green: 0.9, blue: 0.9 } },
    },
  });

  // 3. Warna baris bergantian (zebra stripes) untuk baris data
  for (let i = 1; i < totalRows; i++) {
    const isEven = i % 2 === 0;
    const backgroundColor = isEven 
      ? { red: 0.98, green: 0.98, blue: 0.98 } 
      : { red: 0.93, green: 0.95, blue: 0.97 };
    requests.push({
      repeatCell: {
        range: {
          sheetId: sheetId,
          startRowIndex: i,
          endRowIndex: i + 1,
          startColumnIndex: 0,
          endColumnIndex: 6,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: backgroundColor,
          },
        },
        fields: 'userEnteredFormat.backgroundColor',
      },
    });
  }

  // 4. Format angka (kolom Jumlah, indeks 5) dengan pemisah ribuan
  requests.push({
    repeatCell: {
      range: {
        sheetId: sheetId,
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

  // 5. Auto-resize kolom agar muat konten
  requests.push({
    autoResizeDimensions: {
      dimensions: {
        sheetId: sheetId,
        dimension: 'COLUMNS',
        startIndex: 0,
        endIndex: 6,
      },
    },
  });

  // Eksekusi semua permintaan formatting
  if (requests.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests },
    });
    console.log('✅ Pemformatan tabel selesai');
  }

  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${sheetId}`;
  console.log('🔗 URL:', url);
  return url;
}

module.exports = { exportToGoogleSheets };
