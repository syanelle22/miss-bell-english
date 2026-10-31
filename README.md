# Miss Bell’s English Club — Final v6.1

Desain kucing putih, cream, baby blue, dan merah. Home hanya berisi menu; kelas dan semester dipilih lewat dropdown. Versi ini memakai proyek Firebase lama Miss Bell. Tidak ada data contoh atau database baru yang diisikan otomatis.

## Pasang satu kali di website GitHub yang sama

1. Sebelum update, buka website lama, login, lalu unduh **Backup** untuk setiap tahun ajaran yang berisi data. Simpan file JSON di komputer; jangan unggah backup ke repository publik. Tutup tab website lama setelah backup selesai.
2. Extract ZIP ini. Di repository `syanelle22/miss-bell-english`, pilih **Add file → Upload files**. Unggah seluruh isi hasil extract ke tingkat utama repository, lalu **Commit changes**. File dengan nama sama menggantikan versi lama; jangan membuat folder pembungkus baru. Tidak perlu menghapus data Firebase atau repository. File tema lama yang tidak dipakai boleh dibiarkan.
3. Buka proyek Firebase `miss-bell-s-english-classes` → **Cloud Firestore → Rules**. Ganti seluruh teks editor dengan isi **firestore.rules** dari paket ini, lalu **Publish**. Mengganti Rules tidak menghapus dokumen database. Rules v6 diperlukan untuk jadwal tayang dan materi belajar.
4. Setelah GitHub Pages selesai deploy, buka website, lakukan hard refresh (Ctrl+Shift+R di PC), lalu **Teacher login** memakai `syawos0@gmail.com`. Pilih tahun ajaran aktif, periksa daftar siswa serta nilai, kemudian klik **Sync noticeboard** di Teacher’s Desk dan tunggu **Saved to Firebase**. Jika ada beberapa tahun, sinkronkan masing-masing tahun bila ingin semua datanya tersimpan dalam format terbaru; hanya tahun publik yang menerbitkan noticeboard.
5. Uji halaman publik melalui Incognito: Home → pilih kelas → buka menu. Nilai, nama siswa, catatan guru, dan status pengumpulan individu tidak ditampilkan kepada publik. Coba satu pengumuman biasa dan satu pengumuman terjadwal sebelum membagikan website ke keluarga.

Jika Google login menampilkan `auth/unauthorized-domain`: Firebase → Authentication → Settings → Authorized domains → tambahkan `syanelle22.github.io` (tanpa https atau path). Pastikan provider Google sudah diaktifkan.

## Data lama

Struktur data siswa, nilai asli, LM, KKM, remedial, arsip tahun, dan ekspor Excel tetap dipertahankan. Migrasi membaca format legacy maupun schema 2; dokumen legacy tidak dihapus. Tidak perlu melakukan Restore hanya untuk memperbarui desain. Restore mengganti data satu tahun, sehingga hanya dipakai bila memang memulihkan backup yang benar. Backup versi 4, 5, dan 6 didukung. Gunakan v6 untuk mengedit setelah Rules v6 terpasang; tab lama akan ditolak saat menyimpan agar tidak membuang fitur baru.

## Materi mingguan dan kosakata

Teacher’s Desk → **Weekly plans** atau **Vocabulary sets**. Pilih Senin sebagai awal minggu, isi materi, dan pilih kelas tujuan. Weekly plan tampil di Calendar untuk minggu berjalan. Vocabulary Corner menampilkan set terakhir yang sudah dipublikasikan dengan minggu mulai yang tidak melewati minggu berjalan.

Kosakata ditulis satu baris per kata, dengan bentuk:

    book | A set of pages to read. | This is my book.
    pencil | Something to write with. | I have a pencil.

Maksimal 20 kata per set, masing-masing kolom maksimal 200 karakter. Makna boleh ditulis dalam bahasa yang sesuai kebutuhan kelas. Tombol Listen memakai suara English dari perangkat/browser; jika suara tidak tersedia, ada pemberitahuan. Tidak memerlukan akun AI atau layanan audio berbayar.

**Draft** hanya terlihat guru. **Publish now** menampilkan setelah penyimpanan berhasil. **Schedule for later** menggunakan waktu WIB (UTC+7). **Preview for families** memperlihatkan isi sebelum disimpan. **Unpublish** pada materi belajar mengembalikan ke draft; isinya tetap tersedia untuk diterbitkan ulang.

## Jadwal tayang

Pengumuman, tugas, tes, weekly plan, dan vocabulary dapat dijadwalkan. Kontennya dipisahkan dari halaman publik dan Firestore menolak akses sebelum waktu rilis. Guru boleh offline saat waktu rilis tiba. Website keluarga memeriksa materi yang sudah waktunya setiap 15 detik ketika halaman terbuka. Perangkat keluarga perlu tanggal dan waktu otomatis yang benar.

Untuk menerbitkan segera, edit → Publish now → Save. Untuk membatalkan, edit → Draft → Save. Maksimal 200 item berstatus Scheduled per tahun (termasuk jadwal yang sudah lewat); ubah jadwal lama ke Publish now atau Draft bila mendekati batas. Tidak perlu Cloud Functions, cron, indeks tambahan, atau upload dokumen ke Firebase Storage untuk fitur ini. Pemakaian Firestore tetap mengikuti kuota proyek.

## Nilai dan ekspor

13 kelas: 1A/1B, 2A/2B/2C, 3A/3B, 4A/4B, 5A/5B, 6A/6B. Setiap semester memiliki 4 LM × 2 kompetensi, Midterm dan End-of-semester. Semua rata-rata mengabaikan kosong dan memasukkan angka nol. Nilai asli tetap disimpan. Bila nilai awal di bawah KKM dan percobaan remedial terakhir mencapai KKM, nilai akhir menjadi tepat KKM; percobaan yang gagal tidak mengganti nilai asli.

Export Excel mempertahankan rekap, grafik, nilai asli/akhir, dan riwayat remedial. Needs attention dapat difilter menjadi nilai kosong, nilai di bawah target/remedial, atau tugas lewat tenggat.

## Dokumen dan login

Lampiran tetap berupa tautan HTTPS Google Drive atau dokumen web. Atur izin dokumen di Drive untuk penerima yang benar. Website ini tidak mengunggah dokumen ke Storage. Siswa/orang tua tidak perlu akun. Login guru dibatasi ke akun Google Miss Bell yang terverifikasi, dan Rules menolak akses privat dari akun lain.

## Status pengujian

Logika nilai, migrasi legacy, pemisahan tahun/kelas, backup versi lama/baru, materi belajar, publikasi, dan pembatasan akses diuji secara lokal. Antarmuka editor diuji dengan data terpisah. Login Google dan data asli proyek perlu diperiksa setelah upload dan Rules dipasang; paket ini tidak mengubah database produksi saat dibuat.

## Update v6.1 — tautan dokumen dan assessment tersemat

Tautan dokumen tampil di kartu dan detail publik untuk pengumuman, assignments, dan assessments. Assessment yang sudah terbit untuk kelas/semester terpilih otomatis muncul di atas Announcements dengan label PINNED ASSESSMENT, diurutkan dari tanggal terdekat. Setelah tanggal assessment lewat, kartu otomatis tidak tampil di Announcements; jadwal aslinya tetap ada di Assessments/Calendar. Draft dan jadwal yang belum waktunya tayang tetap tidak muncul. Perubahan atau penghapusan assessment langsung mengikuti sumbernya tanpa membuat post duplikat.

Untuk update dari v6: unggah semua file paket baru ke repository yang sama, Commit changes, lalu hard refresh Ctrl+Shift+R. Rules v6 tetap sama; tidak perlu mengubahnya lagi jika sudah dipasang. Tidak perlu input ulang link atau membuat ulang assessment yang sudah tersimpan. Bila link belum terlihat, login dan klik Sync noticeboard, kemudian periksa lagi melalui Incognito.
