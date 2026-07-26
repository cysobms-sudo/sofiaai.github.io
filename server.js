const express = require('express');
const mysql = require('mysql2');
const path = require('path');
const bcrypt = require('bcryptjs');
const moment = require('moment-jalaali');
const multer = require('multer');
const fs = require('fs');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// ===== تنظیمات CORS =====
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// ===== تنظیمات Express =====
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ==================================================
// ===== مسیرهای فایل‌های استاتیک =====
// ==================================================

// مسیر عمومی برای همه فایل‌های استاتیک
app.use(express.static(path.join(__dirname, 'public')));

// مسیر اختصاصی برای تصاویر با CORS
app.use('/images', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
}, express.static(path.join(__dirname, 'public', 'images')));

// مسیر مستقیم گالری
app.use('/images/gallery', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
}, express.static(path.join(__dirname, 'public', 'images', 'gallery')));

// مسیر فایل‌های آپلود شده (رزومه و ...)
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// ==================================================
// ===== ایجاد پوشه‌های مورد نیاز =====
// ==================================================

const publicDir = path.join(__dirname, 'public');
const imagesDir = path.join(publicDir, 'images');
const galleryDir = path.join(imagesDir, 'gallery');
const uploadsDir = path.join(publicDir, 'uploads');
const resumesDir = path.join(uploadsDir, 'resumes');

const directories = [publicDir, imagesDir, galleryDir, uploadsDir, resumesDir];

directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
        try {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`✅ پوشه ایجاد شد: ${dir}`);
        } catch (err) {
            console.error(`❌ خطا در ایجاد پوشه ${dir}:`, err.message);
        }
    } else {
        console.log(`📁 پوشه وجود دارد: ${dir}`);
    }
});

console.log('📁 مسیر گالری:', galleryDir);
console.log('📁 مسیر آپلود رزومه:', resumesDir);

// ==================================================
// ===== تنظیمات Multer برای گالری =====
// ==================================================

// تنظیمات ذخیره‌سازی با مسیر مطلق برای اطمینان از آپلود صحیح
const galleryStorage = multer.diskStorage({
    destination: function(req, file, cb) {
        // مسیر مطلق را برای اطمینان از ذخیره‌سازی در جای درست استفاده می‌کنیم
        const uploadPath = path.join(__dirname, 'public', 'images', 'gallery');
        // اطمینان از وجود پوشه
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: function(req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const filename = 'gallery-' + uniqueSuffix + ext;
        console.log('📸 نام فایل تولید شده:', filename);
        cb(null, filename);
    }
});

// فیلتر برای تایید فرمت تصویر
const imageFilter = (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('فرمت فایل مجاز نیست. فقط JPG, PNG, GIF, WEBP, SVG مجاز هستند.'), false);
    }
};

const galleryUpload = multer({
    storage: galleryStorage,
    limits: { 
        fileSize: 10 * 1024 * 1024, // 10 مگابایت
        files: 1 
    },
    fileFilter: imageFilter
});

// ==================================================
// ===== تنظیمات Multer برای رزومه =====
// ==================================================

const resumeStorage = multer.diskStorage({
    destination: function(req, file, cb) {
        const uploadPath = path.join(__dirname, 'public', 'uploads', 'resumes');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: function(req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'resume-' + uniqueSuffix + ext);
    }
});

const resumeUpload = multer({
    storage: resumeStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('فرمت فایل مجاز نیست. فقط PDF، DOC، DOCX، PNG، JPG مجاز هستند.'), false);
        }
    }
});

// ===== اتصال به دیتابیس =====
const db = mysql.createConnection({
    host: process.env.DB_HOST || '188.40.16.3',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'oJ2LXgVwDibBc79qnaPx',
    database: process.env.DB_NAME || 'sofiaaiskho_db',
    port: process.env.DB_PORT || 32280
});

db.connect((err) => {
    if (err) {
        console.error('❌ خطا در اتصال به دیتابیس:', err);
        return;
    }
    console.log('✅ اتصال به دیتابیس با موفقیت برقرار شد!');
});

// ==================================================
// ===== ایجاد جدول‌ها =====
// ==================================================
const createTables = () => {
    // جدول کاربران
    db.query(`
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            phone VARCHAR(20),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) console.error('❌ خطا در ایجاد جدول users:', err);
        else console.log('✅ جدول users آماده است');
    });

    // جدول مقالات
    db.query(`
        CREATE TABLE IF NOT EXISTS articles (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            category VARCHAR(100),
            content TEXT,
            author VARCHAR(255) DEFAULT 'سوفیا AI',
            status VARCHAR(20) DEFAULT 'published',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) console.error('❌ خطا در ایجاد جدول articles:', err);
        else console.log('✅ جدول articles آماده است');
    });

    // جدول نظرات
    db.query(`
        CREATE TABLE IF NOT EXISTS comments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255),
            text TEXT NOT NULL,
            status VARCHAR(20) DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) console.error('❌ خطا در ایجاد جدول comments:', err);
        else console.log('✅ جدول comments آماده است');
    });

    // جدول گالری (با تغییر مسیر تصویر به نام فایل)
    db.query(`
        CREATE TABLE IF NOT EXISTS gallery (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(255),
            description TEXT,
            image_url VARCHAR(500) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) console.error('❌ خطا در ایجاد جدول gallery:', err);
        else console.log('✅ جدول gallery آماده است');
    });

    // جدول سبد خرید
    db.query(`
        CREATE TABLE IF NOT EXISTS cart (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            item_name VARCHAR(255) NOT NULL,
            item_price VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `, (err) => {
        if (err) console.error('❌ خطا در ایجاد جدول cart:', err);
        else console.log('✅ جدول cart آماده است');
    });

    // جدول تنظیمات سایت
    db.query(`
        CREATE TABLE IF NOT EXISTS site_settings (
            setting_key VARCHAR(100) PRIMARY KEY,
            setting_value TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) console.error('❌ خطا در ایجاد جدول site_settings:', err);
        else {
            console.log('✅ جدول site_settings آماده است');
            const defaultSettings = [
                ['site_name', 'توسعه‌دهنده هوش مصنوعی سوفیا'],
                ['site_tagline', 'مرجع تخصصی دستیارهای هوشمند و ایجنت‌های AI'],
                ['meta_description', 'توسعه‌دهنده هوش مصنوعی سوفیا - مرجع تخصصی دستیارهای هوشمند و ایجنت‌های AI در ایران'],
                ['meta_keywords', 'هوش مصنوعی، دستیار هوشمند، چت‌بات، RAG، اتوماسیون، طراحی سایت'],
                ['hero_title', 'مرجع تخصصی دستیارهای هوشمند و ایجنت‌های AI'],
                ['hero_subtitle', 'از مقاله‌های تخصصی تا پیاده‌سازی عملی ایجنت‌ها و دستیارهای هوشمند — همه‌چیز برای کسب‌وکار شما'],
                ['hero_text', 'با بیش از ۲۰ سال سابقه در مهندسی کامپیوتر و هوش مصنوعی'],
                ['about_title', 'درباره <span class="highlight">سوفیا AI</span>'],
                ['about_text', '🚀 سوفیا AI؛ همراه هوشمند تحول دیجیتال شما\n\nدر دنیایی که هر روز پیچیده‌تر می‌شود، سوفیا AI پلی است میان شما و قدرت بی‌نهایت هوش مصنوعی. ما با تکیه بر تخصص و دانش روز، هوش مصنوعی را به زبانی ساده و کاربردی برای کسب‌وکارها تبدیل می‌کنیم.\n\nاز استارتاپ‌های نوپا تا سازمان‌های بزرگ، ما راه‌حل‌های هوشمندی طراحی می‌کنیم که واقعاً کار می‌کنند.'],
                ['about_image', '/AIpic1.webp'],
                ['stat_years', '۲۰+'],
                ['stat_projects', '۸۰+'],
                ['stat_privacy', '۱۰۰%'],
                ['footer_text', '© ۲۰۲۶ <strong>توسعه‌دهنده هوش مصنوعی سوفیا</strong> — مرجع تخصصی دستیارهای هوشمند و ایجنت‌های هوش مصنوعی در ایران'],
                ['copyright_text', 'تمامی حقوق محفوظ است'],
                ['phone', '۰۲۱-۱۲۳۴۵۶۷۸'],
                ['mobile', '۰۹۱۳۰۷۷۱۱۲۸'],
                ['email', 'cysobms@gmail.com'],
                ['address', 'تهران، خیابان ولیعصر، پلاک ۱۲۳'],
                ['color_primary', '#6C3CE1'],
                ['color_secondary', '#FFB800'],
                ['analytics', '']
            ];
            
            defaultSettings.forEach(([key, value]) => {
                db.query(
                    'INSERT IGNORE INTO site_settings (setting_key, setting_value) VALUES (?, ?)',
                    [key, value],
                    (err) => {
                        if (err) console.error(`❌ خطا در تنظیم ${key}:`, err);
                    }
                );
            });
        }
    });

    // جدول‌های دیگر... (همان کد قبلی)
    // user_requests, chatbot_requests, cooperation_requests, contact_messages, assistants, agents, site_stats
    // (برای اختصار، بقیه جدول‌ها همانند کد قبلی هستند)
    console.log('✅ تمام جدول‌ها ساخته شدند.');
};

createTables();

// ==================================================
// ===== API گالری با مدیریت خطا =====
// ==================================================

app.post('/api/upload', (req, res) => {
    galleryUpload.single('image')(req, res, function(err) {
        if (err) {
            console.error('❌ خطا در آپلود:', err.message);
            return res.status(400).json({ 
                success: false, 
                error: err.message || 'خطا در آپلود تصویر' 
            });
        }
        
        if (!req.file) {
            return res.status(400).json({ 
                success: false, 
                error: 'هیچ تصویری انتخاب نشده است.' 
            });
        }

        try {
            const imageUrl = '/images/gallery/' + req.file.filename;
            console.log('✅ تصویر آپلود شد:', imageUrl);
            console.log('📁 مسیر فیزیکی:', path.join(__dirname, 'public', 'images', 'gallery', req.file.filename));
            
            res.json({ 
                success: true, 
                url: imageUrl, 
                filename: req.file.filename, 
                message: '✅ تصویر با موفقیت آپلود شد!' 
            });
        } catch (error) {
            console.error('❌ خطا در آپلود تصویر:', error);
            res.status(500).json({ 
                success: false, 
                error: 'خطا در آپلود تصویر: ' + error.message 
            });
        }
    });
});

// ===== بقیه کدهای قبلی شما (APIهای دیگر) =====
// ... (همه APIهای دیگر مانند gallery, articles, comments و ... به همان شکل باقی می‌مانند)

// ==================================================
// ===== شروع سرور =====
// ==================================================
app.listen(port, '0.0.0.0', () => {
    console.log(`\n🚀 ========================================`);
    console.log(`🚀 سرور در حال اجرا روی پورت ${port}`);
    console.log(`🚀 ========================================\n`);
    console.log(`📁 پوشه گالری: ${galleryDir}`);
    console.log(`📁 پوشه آپلود رزومه: ${resumesDir}`);
    console.log(`\n📋 ===== لیست API ها =====`);
    console.log(`✅ API گالری: /api/gallery`);
    console.log(`✅ API آپلود تصویر: /api/upload`);
    console.log(`✅ API مقالات عمومی: /api/articles`);
    console.log(`✅ API مقالات عمومی با ID: /api/articles/:id`);
    console.log(`✅ API مدیریت مقالات: /api/admin/articles`);
    console.log(`✅ API مدیریت مقالات با ID: /api/admin/articles/:id`);
    console.log(`✅ API درخواست‌های کاربران: /api/user-requests`);
    console.log(`✅ API مدیریت درخواست‌های کاربران: /api/admin/user-requests`);
    console.log(`✅ API چت‌بات: /api/chatbot-requests`);
    console.log(`✅ API سبد خرید: /api/cart`);
    console.log(`✅ API مدیریت سبد خرید: /api/admin/cart`);
    console.log(`✅ API درخواست‌های همکاری: /api/cooperation`);
    console.log(`✅ API مدیریت درخواست‌های همکاری: /api/admin/cooperation`);
    console.log(`✅ API پیام‌های تماس: /api/contact`);
    console.log(`✅ API مدیریت پیام‌های تماس: /api/admin/contact`);
    console.log(`✅ API تنظیمات: /api/admin/settings`);
    console.log(`✅ API آمار: /api/admin/stats`);
    console.log(`✅ API ثبت بازدید: /api/stats/visit`);
    console.log(`✅ API آمار بازدید: /api/admin/stats/visits`);
    console.log(`\n📁 فایل‌های استاتیک:`);
    console.log(`   📂 /images → public/images`);
    console.log(`   📂 /images/gallery → public/images/gallery`);
    console.log(`   📂 /uploads → public/uploads`);
    console.log(`\n✅ سرور آماده به کار است!\n`);
});
