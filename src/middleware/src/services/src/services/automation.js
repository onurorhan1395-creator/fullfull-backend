const pool = require("../db");
const { sendMail } = require("./email");

async function getDepartmanEmail(ad, envFallback) {
  const { rows } = await pool.query("SELECT email FROM departmanlar WHERE ad = $1", [ad]);
  return rows[0]?.email || envFallback;
}

async function logOtomasyon({ kayitId, departman, detay, durum = "basarili", hataMesaji = null }) {
  await pool.query(
    `INSERT INTO otomasyon_log (kayit_id, departman, detay, durum, hata_mesaji)
     VALUES ($1, $2, $3, $4, $5)`,
    [kayitId, departman, detay, durum, hataMesaji]
  );
}

async function tetikleOtomasyonlar({ eskiKayit, yeniKayit }) {
  const sonuclar = [];

  const kaskoTrafikYeniTetiklendi =
    yeniKayit.kasko_satildi &&
    yeniKayit.trafik_satildi &&
    !(eskiKayit?.kasko_satildi && eskiKayit?.trafik_satildi);

  if (kaskoTrafikYeniTetiklendi) {
    const to = await getDepartmanEmail("Kasko Departmani", process.env.KASKO_DEPARTMAN_EMAIL);
    const detay = `${yeniKayit.musteri_ad_soyad} - ${yeniKayit.arac_modeli} (Sase: ${yeniKayit.sase_no})`;
    try {
      const attachments = yeniKayit.proforma_fatura_path
        ? [{ filename: "proforma.pdf", path: yeniKayit.proforma_fatura_path }]
        : [];
      await sendMail({
        to,
        subject: `Yeni Kasko/Trafik Talebi - ${yeniKayit.kayit_no}`,
        html: `
          <h3>Yeni Kasko + Trafik Sigortasi Talebi</h3>
          <p><b>Musteri:</b> ${yeniKayit.musteri_ad_soyad}</p>
          <p><b>Telefon:</b> ${yeniKayit.telefon || "-"}</p>
          <p><b>Arac:</b> ${yeniKayit.arac_modeli} - Sase: ${yeniKayit.sase_no}</p>
          <p><b>Satis Fiyati:</b> ${yeniKayit.satis_fiyati} TL</p>
          <p>Proforma fatura ekte ise ekli olarak iletilmistir.</p>
        `,
        attachments,
      });
      await logOtomasyon({ kayitId: yeniKayit.id, departman: "Kasko Departmani", detay });
      sonuclar.push({ departman: "Kasko Departmani", durum: "basarili" });
    } catch (err) {
      await logOtomasyon({
        kayitId: yeniKayit.id,
        departman: "Kasko Departmani",
        detay,
        durum: "hata",
        hataMesaji: err.message,
      });
      sonuclar.push({ departman: "Kasko Departmani", durum: "hata", hata: err.message });
    }
  }

  const korumaYeniTetiklendi = yeniKayit.koruma_satildi && !eskiKayit?.koruma_satildi;

  if (korumaYeniTetiklendi) {
    const to = await getDepartmanEmail("Arac Koruma Departmani", process.env.KORUMA_DEPARTMAN_EMAIL);
    const detay = `${yeniKayit.musteri_ad_soyad} - Sase: ${yeniKayit.sase_no}`;
    try {
      await sendMail({
        to,
        subject: `Yeni Arac Koruma Paketi Talebi - ${yeniKayit.kayit_no}`,
        html: `
          <h3>Yeni Arac Koruma Paketi Talebi</h3>
          <p><b>Musteri:</b> ${yeniKayit.musteri_ad_soyad}</p>
          <p><b>Telefon:</b> ${yeniKayit.telefon || "-"}</p>
          <p><b>Sase No:</b> ${yeniKayit.sase_no}</p>
          <p><b>Paket Fiyati:</b> ${yeniKayit.koruma_fiyati} TL</p>
        `,
      });
      await logOtomasyon({ kayitId: yeniKayit.id, departman: "Arac Koruma Departmani", detay });
      sonuclar.push({ departman: "Arac Koruma Departmani", durum: "basarili" });
    } catch (err) {
      await logOtomasyon({
        kayitId: yeniKayit.id,
        departman: "Arac Koruma Departmani",
        detay,
        durum: "hata",
        hataMesaji: err.message,
      });
      sonuclar.push({ departman: "Arac Koruma Departmani", durum: "hata", hata: err.message });
    }
  }

  return sonuclar;
}

module.exports = { tetikleOtomasyonlar };
