import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// .env dosyasını güvenli şekilde yükle (değerleri loglamadan)
function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;

  const envContent = fs.readFileSync(envPath, "utf-8");
  const lines = envContent.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
}

loadEnv();

const prisma = new PrismaClient();

async function main() {
  const username = process.env.ADMIN_USERNAME?.trim();
  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD;

  const missingVars: string[] = [];
  if (!username) missingVars.push("ADMIN_USERNAME");
  if (!email) missingVars.push("ADMIN_EMAIL");
  if (!password || password.trim() === "") missingVars.push("ADMIN_PASSWORD");

  if (missingVars.length > 0) {
    console.error("❌ Hata: Gerekli ortam değişkenleri eksik veya boş bırakılmış:");
    for (const v of missingVars) {
      console.error(`   - ${v}`);
    }
    console.error("\nLütfen .env dosyasına bu değişkenleri tanımlayıp tekrar deneyin.");
    process.exit(1);
  }

  // 1. Kullanıcı adı kontrolü
  const existingByUsername = await prisma.user.findUnique({
    where: { username },
  });
  if (existingByUsername) {
    console.error(`❌ Hata: '${username}' kullanıcı adına sahip bir kullanıcı zaten mevcut.`);
    process.exit(1);
  }

  // 2. E-posta kontrolü
  const existingByEmail = await prisma.user.findUnique({
    where: { email },
  });
  if (existingByEmail) {
    console.error(`❌ Hata: '${email}' e-posta adresine sahip bir kullanıcı zaten mevcut.`);
    process.exit(1);
  }

  // 3. Şifreyi bcrypt ile hashle (10 salt round)
  const passwordHash = await bcrypt.hash(password!, 10);
  const fullName = process.env.ADMIN_FULLNAME?.trim() || "Sistem Yöneticisi";

  // 4. Admin kullanıcısını veritabanına kaydet
  const admin = await prisma.user.create({
    data: {
      username: username!,
      email: email!,
      passwordHash,
      fullName,
      role: "ADMIN",
    },
    select: {
      id: true,
      username: true,
      email: true,
      fullName: true,
      role: true,
      createdAt: true,
    },
  });

  console.log("✅ Admin kullanıcısı başarıyla oluşturuldu.");
  console.log(`- ID: ${admin.id}`);
  console.log(`- Kullanıcı Adı: ${admin.username}`);
  console.log(`- E-posta: ${admin.email}`);
  console.log(`- Ad Soyad: ${admin.fullName}`);
  console.log(`- Rol: ${admin.role}`);
}

main()
  .catch((e) => {
    console.error("❌ Admin kullanıcısı oluşturulurken hata oluştu:", e.message || e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
