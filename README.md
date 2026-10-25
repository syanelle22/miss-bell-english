# Miss Bell’s English Journal

Website kelas Bahasa Inggris dengan tema vintage dan motion saat scroll.
Halaman publik menampilkan pengumuman, instruksi tugas, tenggat, dan jadwal tes.
Hanya akun Google Miss Bell yang dapat mengakses data siswa dan nilai.

## Unggah ke GitHub Pages

1. Ekstrak ZIP ini di komputer.
2. Buka repository `syanelle22/miss-bell-english`.
3. Pilih **Add file → Upload files**. Unggah semua file hasil ekstrak langsung ke halaman utama repository. File `index.html` harus sejajar dengan README.md, bukan berada di folder tambahan. Jangan unggah ZIP-nya.
4. Pilih **Commit changes**.
5. Buka **Settings → Pages**. Pada **Build and deployment**, pilih **Deploy from a branch**.
6. Pilih branch **main** dan folder **/(root)**, lalu **Save**.
7. Tunggu proses deployment selesai. GitHub menampilkan alamat website pada halaman Pages.

Alamat yang diharapkan setelah deployment berhasil:
https://syanelle22.github.io/miss-bell-english/

## Firebase yang harus sudah disiapkan

- Project: `miss-bell-s-english-classes`.
- Authentication → Sign-in method → Google: aktif.
- Authentication → Settings → Authorized domains: tambahkan `syanelle22.github.io` tanpa https atau path repository.
- Firestore: database `(default)` sudah dibuat.
- Firestore → Rules: isi sesuai `firestore.rules`, kemudian **Publish**. Mengunggah file rules ke GitHub saja tidak menerapkannya ke Firebase.
- Konfigurasi aplikasi web sudah ada di firebase.js. Ini konfigurasi client publik, bukan service account. Jangan menambahkan private key/service account ke repository.

## Pemakaian pertama

1. Buka website setelah deployment berhasil. Halaman pengumuman bisa dibuka tanpa login.
2. Klik **Teacher login**, pilih Google `syawos0@gmail.com`.
3. Klik **Add student**, isi nama dan pilih kelas.
4. Tunggu tulisan **Saved to Firebase** sebelum menutup halaman.
5. Masukkan nilai pada **Daily scores** atau **Main tests**. Nilai 0 ikut rata-rata; nilai kosong tidak dihitung. Semua tes harian dalam satu LM memiliki bobot sama. Rata-rata kelas dihitung dari rata-rata LM masing-masing siswa.
6. Buat tugas pada **Assignments**; ubah status pengumpulan di tabel guru. Status tidak memengaruhi nilai.
7. Buat pengumuman dan jadwal pada **Schedule**. Setelah tersimpan, halaman orang tua ikut diperbarui.
8. Klik **Parent page** lalu salin alamat untuk dibagikan. Tombol **Teacher dashboard** kembali ke tampilan guru selama sesi login aktif. Di dashboard, klik **Sign out** untuk keluar.

13 kelas: 1A, 1B, 2A, 2B, 2C, 3A, 3B, 4A, 4B, 5A, 5B, 6A, 6B.
Setiap semester memiliki 4 LM × 2 kompetensi, ditambah Midterm dan End-of-semester.

## Uji setelah website online

Gunakan data percobaan dahulu, lalu:

- Tambahkan siswa percobaan dan nilai, tunggu Saved to Firebase, muat ulang. Data harus tetap muncul.
- Buka lewat perangkat lain dan login sebagai Miss Bell; data harus sama.
- Buka mode samaran tanpa login. Pengumuman/tugas/jadwal terlihat; siswa/nilai/status individu tidak terlihat.
- Coba akun Google lain: dashboard guru harus ditolak.
- Putuskan internet saat mengedit: jangan menganggap data tersimpan sampai muncul Saved to Firebase. Saat gagal, gunakan Retry save setelah koneksi pulih.

## Penyimpanan dan batas versi ini

Tidak ada data siswa contoh yang dimasukkan otomatis. Data dari prototipe lama tidak dipindahkan otomatis.
Data privat disimpan pada teacherData per kelas. Halaman publik hanya mengambil classPages, dengan daftar field publik yang dipilih secara eksplisit. Nilai atau status siswa tidak ditaruh di HTML/GitHub/localStorage.
Sesi login memakai penyimpanan sesi browser. Keluar dari akun setelah memakai komputer bersama.

Penyimpanan berlangsung setelah jeda singkat saat mengedit. Gunakan satu perangkat/tab untuk mengedit pada satu waktu. Jika database berubah dari perangkat lain, aplikasi menghentikan penyimpanan agar tidak menimpa perubahan. Unduh Backup, lalu muat ulang. Backup JSON berisi data privat: simpan sendiri, jangan unggah ke repository publik. Versi ini belum memiliki tombol impor backup.

Backup dan Export scores adalah unduhan manual; jangan letakkan file hasilnya di repository.
Batas ukuran data privat ditetapkan 800 KB per kelas; aplikasi menolak penyimpanan yang melewati batas dan meminta backup.
Belum ada pengarsipan tahun ajaran, unggah lampiran, atau notifikasi otomatis. Koneksi internet diperlukan untuk sinkronisasi. Kuota Firebase mengikuti paket project yang digunakan.

## Verifikasi saat paket dibuat

- Pemeriksaan sintaks JavaScript lulus.
- Pengujian model: rata-rata, nol/kosong, 13 kelas, pemisahan semester/kelas, pemindahan siswa, dan whitelist field publik lulus.
- Pengujian transaksi dengan Firebase simulasi: penyimpanan atomik, pembaruan hanya kelas yang berubah, dan penolakan konflik revisi lulus.
- Browser: halaman publik terhubung ke Firebase; pembacaan teacherData tanpa login ditolak oleh rules project ini.
- Alur tambah siswa dan rata-rata diuji menggunakan autentikasi simulasi lokal, tanpa menulis data percobaan ke Firebase asli.
- Login Google akun Miss Bell, penyimpanan terautentikasi asli, dan sinkronisasi lintas perangkat harus diuji setelah GitHub Pages aktif.
