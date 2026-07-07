# Full+Full Panel — Özel Backend

Volkswagen bayii cross-sell takip sistemi için gerçek, çalışan bir Node.js/Express + PostgreSQL backend'i. Gerçek e-posta gönderimi, kalıcı veritabanı ve REST API içerir — bu artık simülasyon değil, canlıya alınabilir bir sistem.

## İçerik

```
fullfull-backend/
├── src/
│   ├── index.js          # Express uygulaması, tüm route'ları bağlar
│   ├── db.js              # PostgreSQL bağlantı havuzu
│   ├── upload.js          # Proforma PDF yükleme (multer)
│   ├── middleware/auth.js # API anahtarı doğrulama
│   ├── routes/
│   │   ├── records.js     # Satış kaydı CRUD + otomasyon tetikleme
│   │   └── dashboard.js   # Performans metrikleri + otomasyon geçmişi
│   └── services/
│       ├── email.js       # SMTP e-posta gönderimi (nodemailer)
│       └── automation.js  # Kasko/Koruma departman bildirimi mantığı
├── db/
│   ├── schema.sql          # Tablo şeması
│   └── migrate.js          # Şemayı veritabanına uygular
├── Dockerfile
├── docker-compose.yml       # Yerelde Postgres + backend birlikte çalıştırır
├── .env.example
└── package.json
```

## 1. Yerelde Çalıştırma (Docker ile — en kolay yol)

```bash
cd fullfull-backend
cp .env.example .env
# .env dosyasını aç, en azından SMTP_USER, SMTP_PASS, API_KEY alanlarını doldur
docker compose up --build
```

Bu komut hem PostgreSQL'i hem backend'i ayağa kaldırır. Ardından şemayı uygula:

```bash
docker compose exec backend node db/migrate.js
```

Backend artık `http://localhost:4000` üzerinde çalışıyor.

## 2. Docker Olmadan Çalıştırma

```bash
npm install
cp .env.example .env   # DATABASE_URL'i kendi PostgreSQL'ine göre ayarla
node db/migrate.js     # tabloları oluştur
npm start
```

## 3. Canlıya Alma (Deployment)

En az efor ile production'a çıkmak için önerilen sıra:

1. **Railway** veya **Render** üzerinde yeni bir proje aç, bu klasörü GitHub reposu olarak bağla.
2. Aynı platformda bir **PostgreSQL** eklentisi oluştur — `DATABASE_URL` otomatik olarak sağlanır.
3. Environment variables kısmına `.env.example` içindeki tüm değerleri gerçek değerleriyle gir (özellikle `SMTP_*` ve `API_KEY`).
4. Deploy sonrası bir kereliğine `node db/migrate.js` komutunu platformun "shell/console" özelliğinden çalıştır.
5. Servis ayağa kalktığında sana bir URL verir (örn. `https://fullfull-panel.up.railway.app`) — bunu önceki adımda hazırladığım React arayüzündeki API adresi olarak kullanabilirsin.

VPS'e (kendi sunucun) kurmak istersen: Docker Compose dosyası zaten hazır, `docker compose up -d` yeterli; sadece bir ters proxy (Nginx/Caddy) ile HTTPS eklemen gerekir.

## 4. SMTP Ayarları (Gerçek E-posta Gönderimi)

Gmail kullanacaksan normal şifre çalışmaz — Google hesabında "2 Adımlı Doğrulama" açıp bir **Uygulama Şifresi** oluşturman gerekir. Kurumsal bir e-posta adresin varsa (Office 365, kendi mail sunucun) onun SMTP bilgilerini kullanmak daha güvenilir olur.

## 5. API Uç Noktaları

Tüm istekler `x-api-key: <.env'deki API_KEY>` header'ı ile gönderilmelidir.

### Yeni satış kaydı oluştur
```
POST /api/kayitlar
Content-Type: multipart/form-data

musteri_ad_soyad, telefon, email, arac_modeli, sase_no, satis_fiyati,
kasko_satildi, trafik_satildi, koruma_satildi, koruma_fiyati,
proforma (dosya, opsiyonel PDF)
```
Kasko+Trafik ikisi de `true` ise ve/veya Koruma `true` ise, kayıt oluşturulur oluşturulmaz ilgili departmana otomatik e-posta gider ve `otomasyon_log` tablosuna kaydedilir.

### Kayıt güncelle (örn. sonradan kasko eklendi)
```
PATCH /api/kayitlar/:id
Body: { "kasko_satildi": true, "trafik_satildi": true }
```
Sistem eski değerle yeniyi karşılaştırır, sadece **false → true** geçişinde bildirim gönderir (tekrar tekrar mail atmaz).

### Kayıtları listele
```
GET /api/kayitlar
```

### Dashboard metrikleri
```
GET /api/dashboard
```
Döner: toplam araç satışı, toplam ciro, koruma cirosu, kasko/trafik/koruma adetleri, **Full+Full oranı (%)**.

### Otomasyon geçmişi
```
GET /api/dashboard/otomasyon-log
```

## 6. Bir Sonraki Adım — Frontend'i Bu Backend'e Bağlama

Daha önce hazırladığım React arayüzündeki (`FullFullPanel.jsx`) `window.storage` çağrılarını bu API uç noktalarına yönlendiren `fetch` isteklerine çevirmek gerekiyor — istersen bunu da hazırlayıp, gerçek backend'ine bağlı çalışan tam bir sürüm çıkarabilirim.

## 7. Ölçeklenme Notları

- Şu an tek kullanıcı (API_KEY ile) düşünülmüştür. Birden fazla danışman/departman kullanıcısı olacaksa `jsonwebtoken` + `bcryptjs` zaten pakette hazır — bir `kullanicilar` tablosu ve login endpoint'i eklemek yeterli.
- Dosyalar şu an sunucu diskinde tutuluyor (`uploads/`). Çok sunuculu (multi-instance) bir deploy yapacaksan proforma PDF'lerini S3 / Cloudflare R2 gibi bir object storage'a taşımak gerekir.
