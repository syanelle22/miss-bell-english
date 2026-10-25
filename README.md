# Miss Bell’s English Journal — School years update

English tracker untuk 13 kelas, kelas 1–6. Tema vintage dan motion scroll tetap dipertahankan.

## Pasang pembaruan pada website yang sudah berjalan

1. Di website lama, pastikan **Saved to Firebase** muncul, lalu klik **Backup**. Simpan backup privat di komputer. Jangan unggah backup atau ekspor nilai ke repository publik.
2. Tutup semua tab website lama pada perangkat yang digunakan mengedit.
3. Ekstrak ZIP pembaruan.
4. Buka `firestore.rules` dengan Notepad. Salin seluruh isinya.
5. Di Firebase Console, pilih **Firestore Database → Rules**, ganti aturan dengan isi file tadi, kemudian klik **Publish**. Ini tetap membatasi data guru hanya ke akun Google Miss Bell. Perubahan menambahkan tahun ajaran pada halaman publik dan mencegah aplikasi versi lama menimpa metadata tahun ajaran.
6. Buka repository `syanelle22/miss-bell-english` → **Add file → Upload files**. Unggah SEMUA file hasil ekstrak langsung ke halaman utama repository, lalu **Commit changes**. File dengan nama sama diperbarui. Jangan unggah folder pembungkus atau ZIP-nya. File baru juga diperlukan: bukan hanya app.js.
7. Tunggu deployment GitHub Pages selesai. Buka website lalu tekan **Ctrl + Shift + R**.
8. Login sebagai Miss Bell. Periksa data siswa dan nilai lama sebelum mulai bekerja.

Mengunggah firestore.rules ke GitHub tidak menerapkannya ke Firebase. Langkah Publish di Firebase tetap diperlukan. Aturan baru bisa membuat aplikasi lama gagal menyimpan sampai file website diperbarui. Tutup tab lama dan gunakan versi baru.

## Tahun ajaran dan data lama

Saat pertama digunakan, data dari versi lama dibaca sebagai tahun ajaran 2026/2027 berdasarkan tahun sekolah saat pembaruan dibuat. Aplikasi tidak menghapus dokumen data lama.

- Gunakan **Manage archives → Update year label** bila label tahun sebelumnya perlu disesuaikan.
- Perubahan pertama yang tersimpan memindahkan salinan data ke penyimpanan per tahun. Dokumen sumber lama tetap dipertahankan.
- Pilih tahun melalui **School year**. Aplikasi menyelesaikan penyimpanan sebelum berpindah tahun.
- **+ School year** membuat tahun baru dengan nilai, target, tugas, pengumuman, dan jadwal kosong. Pilihan menyalin nama siswa bersifat opsional dan memakai kelas yang sama. Ini tidak menaikkan kelas secara otomatis.
- Tahun baru tidak langsung menjadi tahun publik. Pilih **Manage archives → Make this year public** saat sudah siap.
- Orang tua hanya melihat tahun publik yang aktif, bukan arsip tahun sebelumnya.
- Tahun publik aktif tidak dapat diarsipkan sebelum tahun lain dijadikan publik.

## Arsip kelas dan tahun

- Pilih tahun dan kelas dahulu, lalu **Manage archives**.
- **Archive class** atau **Archive this year** menyimpan data dan menonaktifkan pengeditan. Data masih bisa dibaca, dicetak, dan diekspor.
- **Restore class** atau **Restore this year** mengaktifkan pengeditan kembali.
- Mengarsipkan kelas pada tahun aktif mengosongkan tugas, pengumuman, dan jadwal kelas tersebut di halaman publik setelah tersimpan. Data guru tetap ada.
- Backup sekarang berisi data tahun yang sedang dipilih, seluruh kelas dan kedua semester. Untuk menyimpan backup beberapa tahun, unduh masing-masing tahun. Belum ada tombol impor backup.

## Target nilai

Isi **Target nilai** di toolbar. Target berlaku untuk kelas, semester, dan tahun yang sedang dipilih.

- Tidak ada target bawaan. Kosongkan kolom untuk mematikan penanda.
- Nilai harian, rata-rata LM, dan nilai tes utama yang lebih rendah dari target ditandai merah muda dengan teks merah.
- Nilai yang sama dengan target tidak ditandai. Nilai kosong tidak ditandai. Nilai 0 tetap dihitung.
- Target tidak mengubah nilai atau hasil rata-rata. Ini penanda bagi guru, dan tidak dipublikasikan ke orang tua.

## Ekspor Excel dengan grafik

Klik **Export Excel**, pilih **Excel workbook (.xlsx) with chart**, kemudian **Save** untuk mengunduh.

Workbook berisi:

1. **Summary:** rata-rata kelas untuk LM 1–4, Midterm dan Semester test, target, jumlah nilai yang sudah tercatat, jumlah siswa di bawah target, dan grafik batang yang dapat diedit dengan skala 0–100.
2. **Recap:** rekap masing-masing siswa, penanda nilai rendah, filter, judul, serta header yang tetap terlihat saat menggulir. Di sebelah kanan terdapat perhitungan penanda 1/0 yang menjadi sumber jumlah siswa di bawah target.
3. **Daily scores:** semua tes harian, termasuk tes tambahan, dengan label LM dan kompetensi.

Rata-rata dan ringkasan dalam Excel memakai rumus yang terhubung. Nilai mentah bisa diedit di Daily scores dan nilai tes utama di Recap. Target utama ada di Summary C4. Grafik terhubung ke sel ringkasan. Nilai kosong dikecualikan dan nol dihitung. Setiap tes harian di dalam LM memiliki bobot sama. Rata-rata LM kelas dihitung dari rata-rata LM masing-masing siswa. Tidak ada nilai akhir gabungan yang dihitung otomatis.

CSV lama tetap tersedia pada pilihan format ekspor.

## Tugas dan jadwal ke beberapa kelas

Saat membuat tugas atau jadwal, centang kelas-kelas yang diinginkan. Kelas yang diarsipkan tidak dapat dipilih.

Untuk item yang sudah dibuat, gunakan **Copy to classes**, pilih kelas tujuan, dan sesuaikan tanggal bila diperlukan. Setiap kelas mendapat salinan independen dengan ID baru. Mengedit satu salinan tidak mengubah kelas lain. Nilai dan status pengumpulan tidak ikut disalin. Menyalin lagi akan membuat item baru, bukan memperbarui salinan sebelumnya.

## Lampiran pengumuman dan tugas

Lampiran memakai tautan dokumen HTTPS, sesuai pilihan Google Drive. Tidak ada unggah file langsung ke Firebase Storage dan tidak perlu mengaktifkan Blaze untuk fitur tautan ini.

1. Unggah dokumen PDF/Word ke Google Drive milikmu.
2. Atur hak lihat dokumen bagi siswa/orang tua yang dituju. Misalnya, tautan dapat dilihat oleh penerimanya jika itu memang diinginkan.
3. Salin sharing link.
4. Pada pengumuman atau tugas, isi **Document name** dan **Google Drive document link**.
5. Tunggu **Saved to Firebase**. Tautan dokumen muncul pada halaman publik.

Gunakan Edit untuk mengganti lampiran. Kosongkan link untuk menghapus tautan dari item, tanpa menghapus file di Drive. Aplikasi tidak mengubah izin berbagi di Google Drive secara otomatis. Jangan lampirkan dokumen nilai atau catatan privat pada item publik.

## Firebase dan akses

- Google sign-in dan authorized domain `syanelle22.github.io` tetap harus aktif.
- Data privat berada dalam teacherData dan hanya akun `syawos0@gmail.com` yang boleh mengaksesnya.
- Halaman orang tua hanya membaca classPages: pengumuman, instruksi tugas, dokumen publik yang ditautkan, serta jadwal tes. Tidak ada nama siswa, nilai, target, atau status individu yang dipublikasikan otomatis.
- Aplikasi menolak menimpa data jika perangkat/tab lain telah mengubah revisi database. Unduh Backup sebelum memuat ulang untuk menjaga draft.
- Gunakan satu tab/perangkat untuk mengedit dalam satu waktu, dan tunggu Saved to Firebase sebelum menutup.
- Ukuran data privat dibatasi 800 KB per kelas per tahun. Bila batas tercapai, ekspor atau backup sebelum melanjutkan.

## Pemeriksaan paket

Pemeriksaan sintaks dan pengujian model/transaksi simulasi meliputi migrasi data lama, pemisahan tahun, pembuatan semua kelas, aktivasi tahun publik, penyimpanan target, arsip kelas, konflik revisi, whitelist publik, URL aman, serta salinan antar kelas.

Di browser dengan Firebase simulasi lokal: tugas beserta lampiran muncul di dua kelas, tahun baru dimulai kosong, dan pengarsipan menonaktifkan editing. Tidak ada data percobaan yang ditulis ke Firebase pengguna.

Hasil XLSX diuji dengan import ulang dan kalkulasi rumus: nilai nol/kosong, tes tambahan, perluasan rentang 50 siswa, kelas kosong, target kosong, perubahan input, serta grafik native. Ketiga lembar dirender dan diperiksa. Pemeriksaan akhir pada Microsoft Excel desktop dan sinkronisasi Firebase dengan akun pengguna perlu dilakukan setelah pembaruan dipasang.
