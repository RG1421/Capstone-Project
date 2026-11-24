/* penghubung.js: disediakan dosen, tidak perlu diubah.
   Menghubungkan fungsi di app.js dengan halaman dan Supabase. */
(function () {
  function $(pilihan) { return document.querySelector(pilihan); }
  function ambil(nama) { try { return eval(nama); } catch (e) { return undefined; } }
  function galat(pesan) { if (window.tampilkanGalat) window.tampilkanGalat(pesan); else console.error(pesan); }
  function panggil(nama, args, cadangan) {
    var fn = ambil(nama);
    if (typeof fn !== 'function') return cadangan;
    try { return fn.apply(null, args); }
    catch (e) { galat('Fungsi ' + nama + ': ' + (e && e.message ? e.message : e)); return cadangan; }
  }
  async function panggilAsync(nama, args) {
    var fn = ambil(nama);
    if (typeof fn !== 'function') return { data: null, error: { message: nama + ' tidak ditemukan' } };
    try { var h = await fn.apply(null, args); return h || { data: null, error: null }; }
    catch (e) { return { data: null, error: { message: e && e.message ? e.message : String(e), status: 0 } }; }
  }
  function aman(teks) {
    var h = panggil('amankanTeks', [teks], null);
    return typeof h === 'string' ? h : String(teks == null ? '' : teks).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; });
  }
  function status(teks) { $('#status').textContent = teks || ''; }
  // Hasil supabase-js: { data, error, status }; kode status ada di hasil (PostgREST) atau di galat (Auth).
  function pesanDari(err, hasil) {
    if (!err) return '';
    var kode = hasil && typeof hasil.status === 'number' ? hasil.status : typeof err.status === 'number' ? err.status : 0;
    var p = panggil('pesanStatus', [kode], '');
    return (p && kode ? p + ': ' : '') + (err.message || p || 'Terjadi kesalahan');
  }

  var klien = null;
  var pengguna = null;
  var riwayatMasuk = [];
  var antrian = null;
  try { var A = ambil('AntrianOffline'); if (typeof A === 'function') antrian = new A(); } catch (e) {}

  function tampilkanJaringan() {
    var b = $('#status-jaringan');
    var on = navigator.onLine;
    b.textContent = on ? 'Online' : 'Offline';
    b.classList.toggle('offline', !on);
  }

  async function kirimAntrian() {
    if (!antrian || !klien) return;
    var percobaan = 0;
    while (navigator.onLine) {
      var jml = 0;
      try { jml = antrian.jumlah(); } catch (e) { return; }
      if (!jml) break;
      var aksi = antrian.ambilBerikut();
      if (!aksi) break;
      var h = await panggilAsync('simpanAgenda', [klien, aksi]);
      if (h.error) {
        antrian.tambah(aksi);
        percobaan++;
        if (percobaan > 4) { status('Sinkronisasi tertunda: ' + pesanDari(h.error, h)); return; }
        var jeda = Number(panggil('jedaCobaUlang', [percobaan], 1000)) || 1000;
        await new Promise(function (r) { setTimeout(r, Math.min(jeda, 8000)); });
      }
    }
    await muat();
  }

  function itemHTML(a) {
    return '<li class="agenda' + (a.selesai ? ' selesai' : '') + '" data-id="' + aman(a.id) + '">' +
      '<input type="checkbox" aria-label="Tandai selesai"' + (a.selesai ? ' checked' : '') + '>' +
      '<span>' + aman(a.judul) + '</span><time>' + aman(a.tenggat || '-') + '</time>' +
      '<button type="button" class="hapus" aria-label="Hapus">✕</button></li>';
  }

  // Daftar selalu tampil: sebelum login diajarkan (minggu 5) dan sebelum RLS (minggu 7),
  // database yang menentukan baris apa yang boleh dibaca.
  async function muat() {
    if (!klien) return;
    var h = await panggilAsync('muatAgenda', [klien]);
    if (h.error) { status(pesanDari(h.error, h)); return; }
    var semua = Array.isArray(h.data) ? h.data : [];
    var milik = semua.filter(function (b) { var ok = panggil('bolehAkses', [pengguna ? pengguna.id : null, b], true); return ok !== false; });
    var hariIni = new Date().toISOString().slice(0, 10);
    var g = panggil('kelompokkanAgenda', [milik, hariIni], null);
    var wadah = $('#daftar-agenda');
    var judul = { terlambat: 'Terlambat', hariIni: 'Hari ini', mendatang: 'Mendatang', tanpaTenggat: 'Tanpa tenggat', selesai: 'Selesai' };
    if (g && typeof g === 'object' && !Array.isArray(g)) {
      wadah.innerHTML = Object.keys(judul).filter(function (k) { return Array.isArray(g[k]) && g[k].length; }).map(function (k) {
        return '<h3>' + judul[k] + '</h3><ul class="daftar">' + g[k].map(itemHTML).join('') + '</ul>';
      }).join('') || '<p class="status">Belum ada agenda.</p>';
    } else {
      wadah.innerHTML = '<ul class="daftar">' + milik.map(itemHTML).join('') + '</ul>';
    }
  }

  async function perbaruiSesi() {
    var s = null;
    try { s = (await klien.auth.getSession()).data.session; } catch (e) {}
    var berlaku = s ? panggil('sesiBerlaku', [s.expires_at, Math.floor(Date.now() / 1000)], true) : false;
    if (s && berlaku === false) {
      try { await klien.auth.refreshSession(); s = (await klien.auth.getSession()).data.session; } catch (e) { s = null; }
    }
    pengguna = s ? s.user : null;
    $('#bagian-masuk').hidden = !!pengguna;
    $('#bagian-agenda').hidden = false;
    $('#tombol-keluar').hidden = !pengguna;
    if (pengguna) status('Masuk sebagai ' + pengguna.email);
    await muat();
  }

  async function akun(daftar) {
    var email = $('#isi-email').value;
    var sandi = $('#isi-sandi').value;
    var ul = $('#pesan-akun');
    var g = panggil('validasiAkun', [email, sandi], []);
    if (Array.isArray(g) && g.length) { ul.innerHTML = g.map(function (x) { return '<li>' + aman(x) + '</li>'; }).join(''); return; }
    var sekarang = Date.now();
    if (panggil('bolehKirim', [riwayatMasuk.slice(), sekarang], true) === false) { ul.innerHTML = '<li>Terlalu banyak percobaan. Tunggu sebentar.</li>'; return; }
    riwayatMasuk.push(sekarang);
    ul.innerHTML = '';
    var h = await panggilAsync(daftar ? 'daftarAkun' : 'masukAkun', [klien, email.trim(), sandi]);
    if (h.error) { ul.innerHTML = '<li>' + aman(pesanDari(h.error, h)) + '</li>'; return; }
    if (daftar && !(h.data && h.data.session)) { status('Akun dibuat. Periksa email untuk konfirmasi, lalu masuk.'); return; }
    await perbaruiSesi();
  }

  async function cekPWA() {
    var hasil = [];
    var m = null;
    var teks = window.__MANIFEST__;
    // Setelah diterbitkan, manifest dibaca dari berkasnya sendiri.
    if (typeof teks !== 'string') { try { teks = await (await fetch('manifest.webmanifest')).text(); } catch (e) { teks = 'null'; } }
    try { m = JSON.parse(teks || 'null'); } catch (e) { hasil.push('manifest.webmanifest bukan JSON yang valid: ' + e.message); }
    if (m) {
      var kurang = panggil('periksaManifest', [m], []);
      hasil = hasil.concat(Array.isArray(kurang) && kurang.length ? kurang : ['Manifest lengkap']);
    }
    if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) hasil.push('Service worker aktif setelah diterbitkan lewat HTTPS (GitHub Pages).');
    else {
      var terbit = panggil('periksaTerbit', [location.href.replace(/[^/]*$/, '')], []);
      if (Array.isArray(terbit) && terbit.length) hasil = hasil.concat(terbit);
      navigator.serviceWorker.register('sw.js').then(function () { $('#cek-pwa').insertAdjacentHTML('beforeend', '<li>Service worker terdaftar</li>'); }, function (e) { $('#cek-pwa').insertAdjacentHTML('beforeend', '<li>Service worker gagal: ' + aman(e.message) + '</li>'); });
    }
    $('#cek-pwa').innerHTML = hasil.map(function (x) { return '<li>' + aman(x) + '</li>'; }).join('');
  }

  async function mulai() {
    tampilkanJaringan();
    window.addEventListener('online', function () { tampilkanJaringan(); kirimAntrian(); });
    window.addEventListener('offline', tampilkanJaringan);
    cekPWA();
    var url = ambil('SUPABASE_URL') || '';
    var kunci = ambil('SUPABASE_KEY') || '';
    if (/xxxxxxxx/.test(url + kunci)) { status('Isi SUPABASE_URL dan SUPABASE_KEY di app.js dengan data project Supabase-mu.'); return; }
    var jenis = panggil('jenisKunci', [kunci], 'publik');
    if (jenis === 'rahasia') { status('Berhenti: SUPABASE_KEY adalah kunci RAHASIA. Ganti dengan kunci publik, lalu buat ulang kunci rahasia di Supabase.'); return; }
    if (typeof window.supabase === 'undefined') { status('Library supabase-js belum termuat. Periksa tag <script> di index.html.'); return; }
    klien = panggil('buatKlien', [], null);
    if (!klien || !klien.auth) { status('buatKlien() belum mengembalikan klien Supabase.'); return; }
    klien.auth.onAuthStateChange(function () { setTimeout(perbaruiSesi, 0); });
    await perbaruiSesi();
  }

  $('#form-akun').addEventListener('submit', function (e) { e.preventDefault(); akun(false); });
  $('#tombol-daftar').addEventListener('click', function () { akun(true); });
  $('#tombol-keluar').addEventListener('click', async function () {
    await panggilAsync('keluarAkun', [klien]);
    if (window.caches) { try { var nama = await caches.keys(); await Promise.all(nama.map(function (n) { return caches.delete(n); })); } catch (e) {} }
    await perbaruiSesi();
  });
  $('#form-agenda').addEventListener('submit', async function (e) {
    e.preventDefault();
    var judul = $('#isi-judul').value.trim();
    if (!judul) return;
    var data = { judul: judul, tenggat: $('#isi-tenggat').value || null };
    if (!navigator.onLine && antrian) {
      antrian.tambah(data);
      status('Offline: agenda disimpan di antrean (' + antrian.jumlah() + ') dan dikirim saat online.');
    } else {
      var h = await panggilAsync('simpanAgenda', [klien, data]);
      if (h.error) { status(pesanDari(h.error, h)); return; }
      await muat();
    }
    $('#isi-judul').value = '';
  });
  $('#daftar-agenda').addEventListener('click', async function (e) {
    var li = e.target.closest('li[data-id]');
    if (!li) return;
    var id = li.getAttribute('data-id');
    var h = null;
    if (e.target.matches('input[type=checkbox]')) h = await panggilAsync('ubahSelesai', [klien, id, e.target.checked]);
    else if (e.target.matches('button.hapus')) h = await panggilAsync('hapusAgenda', [klien, id]);
    if (!h) return;
    if (h.error) status(pesanDari(h.error, h));
    await muat();
  });
  mulai();
})();
