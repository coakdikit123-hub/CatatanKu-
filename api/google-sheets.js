// api/google-sheets.js
const { google } = require('googleapis');

/**
 * Ekspor transaksi ke Google Sheets
 * @param {string} userId - ID user
 * @param {Array} transactions - Array transaksi
 * @param {string} spreadsheetId - ID Google Sheet (dari environment)
 * @returns {Promise<string>} - URL spreadsheet
 */
async function exportToGoogleSheets(userId, transactions, spreadsheetId) {
  console.log('📤 exportToGoogleSheets called for user:', userId);
  console.log('📊 Jumlah transaksi:', transactions.length);
  console.log('🔑 spreadsheetId:', spreadsheetId);

  // Ambil credentials dari environment
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
  try {
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetsList = spreadsheet.data.sheets || [];
    for (const s of sheetsList) {
      if (s.properties && s.properties.title === sheetName) {
        sheetExists = true;
        break;
      }
    }
    console.log(`📄 Sheet "${sheetName}" exists? ${sheetExists}`);
  } catch (e) {
    console.error('❌ Gagal mengakses spreadsheet:', e.message);
    throw new Error('Gagal mengakses spreadsheet: ' + e.message);
  }

  if (!sheetExists) {
    try {
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
      console.log(`✅ Sheet "${sheetName}" berhasil dibuat`);
    } catch (e) {
      console.error('❌ Gagal membuat sheet baru:', e.message);
      throw new Error('Gagal membuat sheet baru: ' + e.message);
    }
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

  // Tulis data ke sheet
  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values },
    });
    console.log('✅ Data berhasil ditulis ke sheet');
  } catch (e) {
    console.error('❌ Gagal menulis data:', e.message);
    throw new Error('Gagal menulis data ke sheet: ' + e.message);
  }

  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=0`;
  console.log('🔗 URL:', url);
  return url;
}

module.exports = { exportToGoogleSheets };
