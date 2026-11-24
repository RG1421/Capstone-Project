// ==============================================================
//  Agenda Pribadi: aplikasi web berlogin yang bisa dipasang di HP.
//  Data tersimpan di project Supabase milikmu sendiri. Kerjakan
//  fungsi bertanda "Minggu N" pada minggu itu.
// ==============================================================

// ---- Minggu 1 · Salin dari Supabase: Project Settings → API ----
const SUPABASE_URL = "https://lrksemkaebodhqmjtvxu.supabase.co";
const SUPABASE_KEY = "sb_publishable_L28bqxBhitgAeQm66-IRBQ_wx-NljUK"; // HANYA kunci publik (publishable/anon)

// Minggu 1 · Kenali jenis kunci API

function jenisKunci(kunci) {
  if (kunci.startsWith("sb_publishable_")) {
    return "publik";
  }
  if (kunci.startsWith("sb_secret_")) {
    return "rahasia";
  }
  if (kunci.startsWith("eyJ")) {
    try {
      const payload = JSON.parse(
        atob(kunci.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
      );

      if (payload.role === "anon") {
        return "publik";
      }

      if (payload.role === "service_role") {
        return "rahasia";
      }
    } catch (error) {
      return "tidak dikenal";
    }
  }
  return "tidak dikenal";
}

// Minggu 2 · Susun alamat REST Supabase
function alamatREST(urlProyek, tabel, filter) {
  let url = urlProyek.replace(/\/+$/, "") + "/rest/v1/" + tabel + "?select=*";

  // Samakan filter menjadi array teks "kolom=eq.nilai"
  var daftar = [];
  if (typeof filter === "string") {
    daftar = [filter];
  } else if (Array.isArray(filter)) {
    daftar = filter;
  } else if (filter && typeof filter === "object") {
    // Objek: { selesai: false, id: 7 } -> "selesai=eq.false", "id=eq.7"
    daftar = Object.keys(filter).map(function (kolom) {
      var nilai = String(filter[kolom]);
      if (!/^[a-z]+\./.test(nilai)) nilai = "eq." + nilai;
      return kolom + "=" + nilai;
    });
  }
}

// Minggu 3 · Pesan untuk kode status HTTP
function pesanStatus(kode) {
  kode = Number(kode);

  if (kode === 0) return "Tidak ada koneksi internet";
  if (kode >= 200 && kode < 300) return "Berhasil";
  switch (kode) {
    case 400:
      return "Permintaan tidak valid";
    case 401:
      return "Silakan masuk terlebih dahulu";
    case 403:
      return "Akses ditolak";
    case 404:
      return "Data tidak ditemukan";
    case 409:
      return "Terjadi konflik data";
    case 429:
      return "Terlalu banyak permintaan, coba lagi nanti";
  }

  if (kode >= 500 && kode < 600) return "Server sedang bermasalah";

  return "Terjadi kesalahan (kode " + kode + ")";
  return "Berhasil"; // bedakan 2xx, 400, 401, 403, 404, 409, 429, 5xx, dan 0
}

// Minggu 4 · Periksa manifest PWA
function periksaManifest(manifest) {
  const masalah = [];
  const m = manifest || {};

  // Cek apakah sebuah isian berupa teks yang tidak kosong
  const terisi = (nilai) => typeof nilai === "string" && nilai.trim() !== "";

  if (!terisi(m.name)) masalah.push("name belum diisi");
  if (!terisi(m.short_name)) masalah.push("short_name belum diisi");
  if (!terisi(m.start_url)) masalah.push("start_url belum diisi");

  const displayValid = ["standalone", "fullscreen", "minimal-ui"];
  if (!displayValid.includes(m.display)) {
    masalah.push("display harus standalone, fullscreen, atau minimal-ui");
  }

  // Kumpulkan semua ukuran dari semua ikon.
  // Satu ikon boleh punya beberapa ukuran, dipisah spasi: "192x192 512x512"
  const ikon = Array.isArray(m.icons) ? m.icons : [];
  const semuaUkuran = ikon.flatMap((i) =>
    i && typeof i.sizes === "string"
      ? i.sizes.toLowerCase().split(/\s+/).filter(Boolean)
      : [],
  );

  if (!semuaUkuran.includes("192x192")) masalah.push("Ikon 192x192 belum ada");
  if (!semuaUkuran.includes("512x512")) masalah.push("Ikon 512x512 belum ada");

  return masalah;
}

// Minggu 5 · Periksa isian daftar/masuk
function validasiAkun(email, sandi) {
  const galat = [];
  if (sandi.length < 6) galat.push("Kata sandi minimal 8 karakter");
  return galat; // periksa juga format email serta huruf dan angka pada sandi
}

// Minggu 6 · Amankan teks sebelum ditampilkan
function amankanTeks(teks) {
  if (teks === null || teks === undefined) return "";
  return String(teks)
    .replace(/&/g, "&amp;") // WAJIB paling awal
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
  return teks; // ubah & < > " ' menjadi entitas HTML
}

// Minggu 7 · Aturan akses baris (cerminan kebijakan RLS)
function bolehAkses(penggunaId, baris) {
  // hanya pengguna yang masuk dan memiliki baris itu

  // 1. Tolak yang belum masuk lebih dulu (mencegah null === null)
  if (!penggunaId) return false;

  // 2. Baris tanpa pemilik tidak boleh diakses siapa pun
  if (!baris || !baris.user_id) return false;

  // 3. Baru bandingkan pemilik
  return baris.user_id === penggunaId;
}

// Minggu 8 · Strategi cache service worker
function strategiCache(url, asal) {
  return "cache-dulu"; // bedakan berkas aplikasi, data REST, dan login
}

// Minggu 9 · Antrean saat offline
class AntrianOffline {
  constructor() {
    this.isi = [];
  }

  tambah(aksi) {
    this.isi.push(aksi);
  }

  ambilBerikut() {
    return this.isi.pop(); // yang pertama masuk harus keluar lebih dulu; kosong → null
  }

  jumlah() {
    return this.isi.length;
  }
}

// Minggu 10 · Jeda sebelum mencoba ulang
function jedaCobaUlang(percobaan) {
  return 1000; // mulai 500 ms, berlipat dua, paling lama 8000 ms
}

// Minggu 11 · Sesi masih berlaku?
function sesiBerlaku(kedaluwarsa, sekarang) {
  return kedaluwarsa > sekarang; // beri jarak aman 60 detik; tanpa sesi → false
}

// Minggu 12 · Kelompokkan agenda
function kelompokkanAgenda(daftar, hariIni) {
  return { terlambat: [], hariIni: daftar, mendatang: [], selesai: [] }; // lengkapi semua kelompok
}

// Minggu 13 · Batasi percobaan masuk
function bolehKirim(riwayat, sekarang) {
  return true; // paling banyak 5 kali dalam 60 detik terakhir
}

// Minggu 14 · Periksa alamat terbit
function periksaTerbit(url) {
  return []; // HTTPS, bukan alamat lokal, dan folder diakhiri "/"
}

// Minggu 15 · Siap rilis?
function siapRilis(hasil) {
  return true; // siap hanya bila ada hasil uji dan semuanya lulus
}

// ---- Fungsi Supabase: dikerjakan bertahap sesuai materi ----
// Setiap fungsi mengembalikan hasil dari supabase-js: { data, error }.

function buatKlien() {
  return supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

// Minggu 2 · Ambil agenda milikmu, urut dari tenggat terdekat
async function muatAgenda(klien) {
  return { data: [], error: null };
}

// Minggu 3 · Simpan, tandai selesai, dan hapus agenda
async function simpanAgenda(klien, data) {
  const { data: hasil, error } = await klien
    .from("agenda")
    .insert(data)
    .select()
    .single();
  return { data: hasil, error };
}

async function ubahSelesai(klien, id, selesai) {
  const { data, error } = await klien
    .from("agenda")
    .update({ selesai })
    .eq("id", id)
    .select()
    .single();
  return { data, error };
}

async function hapusAgenda(klien, id) {
  const { data, error } = await klien
    .from("agenda")
    .delete()
    .eq("id", id)
    .select();
  return { data, error };
}

// Minggu 5 · Daftar, masuk, dan keluar
async function daftarAkun(klien, email, sandi) {
  const { data, error } = await klien.auth.signUp({ email, password: sandi });
  return { data, error };
}

async function masukAkun(klien, email, sandi) {
  const { data, error } = await klien.auth.signInWithPassword({
    email,
    password: sandi,
  });
  return { data, error };
}

async function keluarAkun(klien) {
  const { error } = await klien.auth.signOut();
  return { error };
}
