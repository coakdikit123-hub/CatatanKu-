// ============================================================
// ADMIN: GET ALL USERS (dengan error handling robust)
// ============================================================
app.get('/api/admin/users', async (req, res) => {
  const token = req.headers['x-admin-token'];
  console.log('🔐 Admin token received:', token ? '***' : 'MISSING');
  console.log('🔐 Expected ADMIN_TOKEN:', process.env.ADMIN_TOKEN ? '***' : 'MISSING');

  // Cek token
  if (token !== ADMIN_TOKEN) {
    console.log('❌ Token tidak cocok');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('📥 Mengambil daftar user dari KV...');

    // Cek koneksi KV terlebih dahulu
    let keys = [];
    try {
      keys = await kv.keys('user:*');
      console.log(`🔑 Ditemukan ${keys.length} key user`);
    } catch (kvError) {
      console.error('❌ Gagal mengakses KV:', kvError.message);
      // Fallback: coba pakai metode alternatif atau return empty array
      return res.status(500).json({ 
        error: 'Gagal mengakses database',
        details: kvError.message,
        hint: 'Pastikan Vercel KV terhubung dengan benar'
      });
    }

    // Proses setiap user
    const users = [];
    for (const key of keys) {
      const userId = key.replace('user:', '');
      try {
        const userData = await kv.get(key);
        let txs = [];
        try {
          txs = await getTransactions(userId);
        } catch (txError) {
          console.error(`⚠️ Gagal ambil transaksi untuk ${userId}:`, txError.message);
          // Tetap lanjutkan dengan array kosong
        }
        users.push({
          userId,
          registeredAt: userData?.registeredAt || null,
          isActive: userData?.isActive !== false,
          transactionCount: txs.length
        });
      } catch (userError) {
        console.error(`❌ Gagal proses user ${userId}:`, userError.message);
        // Tetap tambahkan user dengan data minimal
        users.push({
          userId,
          registeredAt: null,
          isActive: false,
          transactionCount: 0,
          error: userError.message
        });
      }
    }

    console.log(`✅ Berhasil memuat ${users.length} user`);
    res.json({ users });
  } catch (e) {
    console.error('❌ Error fatal di /api/admin/users:', e.message);
    console.error('Stack:', e.stack);
    res.status(500).json({ 
      error: 'Gagal mengambil data user',
      message: e.message,
      stack: process.env.NODE_ENV === 'development' ? e.stack : undefined
    });
  }
});
