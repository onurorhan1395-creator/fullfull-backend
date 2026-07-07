// Basit API key dogrulamasi. Tek kullanicili (Onur) bir arac oldugu icin
// yeterli; birden fazla danisman/departman ekleneceginde JWT + kullanici
// tablosuna gecmek daha uygun olur (README'de not edildi).
function apiKeyAuth(req, res, next) {
  const key = req.header("x-api-key");
  if (!key || key !== process.env.API_KEY) {
    return res.status(401).json({ hata: "Gecersiz veya eksik API anahtari." });
  }
  next();
}

module.exports = { apiKeyAuth };
