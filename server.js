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
// ===== سرویس فایل‌های استاتیک =====
// ==================================================

app.use(express.static(path.join(__dirname, 'public')));

app.use('/images', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
}, express.static(path.join(__dirname, 'public', 'images')));

app.use('/images/gallery', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
}, express.static(path.join(__dirname, 'public', 'images', 'gallery')));

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
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 پوشه ایجاد شد: ${dir}`);
    }
});

console.log('📁 مسیر گالری:', galleryDir);
console.log('📁 مسیر آپلود رزومه:', resumesDir);

// ==================================================
// ===== تنظیمات Multer برای گالری =====
// ==================================================

const galleryStorage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, galleryDir);
    },
    filename: function(req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'gallery-' + uniqueSuffix + ext);
    }
});

const galleryUpload = multer({
    storage: galleryStorage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('فایل باید تصویر باشد'), false);
        }
    }
});

// ==================================================
// ===== تنظیمات Multer برای رزومه =====
// ==================================================

const resumeStorage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, resumesDir);
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

    db.query(`
        CREATE TABLE IF NOT EXISTS user_requests (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            priority VARCHAR(20) DEFAULT 'medium',
            category VARCHAR(50) DEFAULT 'general',
            status VARCHAR(20) DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `, (err) => {
        if (err) console.error('❌ خطا در ایجاد جدول user_requests:', err);
        else console.log('✅ جدول user_requests آماده است');
    });

    db.query(`
        CREATE TABLE IF NOT EXISTS chatbot_requests (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            phone VARCHAR(20) NOT NULL,
            email VARCHAR(255),
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) console.error('❌ خطا در ایجاد جدول chatbot_requests:', err);
        else console.log('✅ جدول chatbot_requests آماده است');
    });

    db.query(`
        CREATE TABLE IF NOT EXISTS cooperation_requests (
            id INT AUTO_INCREMENT PRIMARY KEY,
            full_name VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL,
            phone VARCHAR(20) NOT NULL,
            subject VARCHAR(100) NOT NULL,
            experience VARCHAR(50),
            cooperation_type VARCHAR(50) NOT NULL,
            portfolio VARCHAR(500),
            description TEXT NOT NULL,
            resume_url VARCHAR(500),
            status VARCHAR(20) DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) console.error('❌ خطا در ایجاد جدول cooperation_requests:', err);
        else console.log('✅ جدول cooperation_requests آماده است');
    });

    db.query(`
        CREATE TABLE IF NOT EXISTS contact_messages (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL,
            phone VARCHAR(20),
            subject VARCHAR(255),
            message TEXT NOT NULL,
            status VARCHAR(20) DEFAULT 'unread',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) console.error('❌ خطا در ایجاد جدول contact_messages:', err);
        else console.log('✅ جدول contact_messages آماده است');
    });

    db.query(`
        CREATE TABLE IF NOT EXISTS assistants (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            icon VARCHAR(50),
            link VARCHAR(255),
            status VARCHAR(20) DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) console.error('❌ خطا در ایجاد جدول assistants:', err);
        else console.log('✅ جدول assistants آماده است');
    });

    db.query(`
        CREATE TABLE IF NOT EXISTS agents (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            icon VARCHAR(50),
            tags VARCHAR(255),
            link VARCHAR(255),
            status VARCHAR(20) DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) console.error('❌ خطا در ایجاد جدول agents:', err);
        else console.log('✅ جدول agents آماده است');
    });

    db.query(`
        CREATE TABLE IF NOT EXISTS site_stats (
            id INT AUTO_INCREMENT PRIMARY KEY,
            page VARCHAR(100),
            views INT DEFAULT 0,
            last_visit TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) console.error('❌ خطا در ایجاد جدول site_stats:', err);
        else console.log('✅ جدول site_stats آماده است');
    });
};

createTables();

// ==================================================
// ===== صفحات HTML =====
// ==================================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.get('/index.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.get('/admin.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});
app.get('/register.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});
app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});
app.get('/dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});
app.get('/article.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'article.html'));
});
app.get('/cooperation.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'cooperation.html'));
});

// ==================================================
// ===== API آپلود تصویر گالری =====
// ==================================================
app.post('/api/upload', galleryUpload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'هیچ تصویری انتخاب نشده است.' });
        }
        const imageUrl = '/images/gallery/' + req.file.filename;
        console.log('✅ تصویر آپلود شد:', imageUrl);
        console.log('📁 مسیر فیزیکی:', path.join(galleryDir, req.file.filename));
        res.json({ 
            success: true, 
            url: imageUrl, 
            filename: req.file.filename, 
            message: '✅ تصویر با موفقیت آپلود شد!' 
        });
    } catch (error) {
        console.error('❌ خطا در آپلود تصویر:', error);
        res.status(500).json({ error: 'خطا در آپلود تصویر: ' + error.message });
    }
});

// ==================================================
// ===== API گالری =====
// ==================================================
app.get('/api/gallery', (req, res) => {
    db.query('SELECT id, title, description, image_url, created_at FROM gallery ORDER BY id DESC', (err, results) => {
        if (err) {
            console.error('❌ خطا در دریافت گالری:', err);
            return res.status(500).json({ error: 'خطا در دریافت اطلاعات' });
        }
        res.json(results);
    });
});

app.post('/api/gallery', (req, res) => {
    const { title, description, image_url } = req.body;
    if (!title || !image_url) {
        return res.status(400).json({ error: 'عنوان و آدرس تصویر الزامی است.' });
    }
    db.query('INSERT INTO gallery (title, description, image_url) VALUES (?, ?, ?)',
        [title, description || '', image_url],
        (err, result) => {
            if (err) {
                console.error('❌ خطا در افزودن به گالری:', err);
                return res.status(500).json({ error: 'خطا در افزودن تصویر' });
            }
            res.json({ message: '✅ تصویر با موفقیت به گالری اضافه شد!', id: result.insertId });
        }
    );
});

app.delete('/api/gallery/:id', (req, res) => {
    const galleryId = req.params.id;
    db.query('SELECT image_url FROM gallery WHERE id = ?', [galleryId], (err, results) => {
        if (err) {
            console.error('❌ خطا در دریافت تصویر:', err);
            return res.status(500).json({ error: 'خطا در حذف تصویر' });
        }
        if (results.length > 0) {
            const imagePath = path.join(__dirname, 'public', results[0].image_url);
            fs.unlink(imagePath, (unlinkErr) => {
                if (unlinkErr) {
                    console.log('⚠️ فایل تصویر پیدا نشد:', unlinkErr.message);
                } else {
                    console.log('🗑️ فایل تصویر حذف شد:', imagePath);
                }
            });
        }
        db.query('DELETE FROM gallery WHERE id = ?', [galleryId], (err, result) => {
            if (err) {
                console.error('❌ خطا در حذف تصویر:', err);
                return res.status(500).json({ error: 'خطا در حذف تصویر' });
            }
            res.json({ message: '✅ تصویر با موفقیت حذف شد!' });
        });
    });
});

// ==================================================
// ===== API مقالات =====
// ==================================================

app.get('/api/articles', (req, res) => {
    db.query('SELECT id, title, category, content, author, status, created_at FROM articles WHERE status = "published" ORDER BY id DESC',
        (err, results) => {
            if (err) {
                console.error('❌ خطا در دریافت مقالات:', err);
                return res.status(500).json({ error: 'خطا در دریافت اطلاعات' });
            }
            const articlesWithPersianDate = results.map(article => {
                const persianDate = moment(article.created_at).format('jYYYY/jMM/jDD');
                return { ...article, created_at: persianDate };
            });
            res.json(articlesWithPersianDate);
        }
    );
});

app.get('/api/articles/:id', (req, res) => {
    const articleId = req.params.id;
    
    if (!articleId || isNaN(articleId)) {
        return res.status(400).json({ error: 'شناسه مقاله نامعتبر است' });
    }
    
    db.query('SELECT id, title, category, content, author, status, created_at FROM articles WHERE id = ?',
        [articleId],
        (err, results) => {
            if (err) {
                console.error('❌ خطا در دریافت مقاله:', err);
                return res.status(500).json({ error: 'خطا در دریافت اطلاعات' });
            }
            if (results.length === 0) {
                return res.status(404).json({ error: 'مقاله یافت نشد' });
            }
            const article = results[0];
            const persianDate = moment(article.created_at).format('jYYYY/jMM/jDD HH:mm');
            article.created_at = persianDate;
            res.json(article);
        }
    );
});

app.get('/api/admin/articles', (req, res) => {
    db.query('SELECT id, title, category, author, status, created_at FROM articles ORDER BY id DESC', (err, results) => {
        if (err) {
            console.error('❌ خطا در دریافت مقالات:', err);
            return res.status(500).json({ error: 'خطا در دریافت اطلاعات' });
        }
        const articlesWithPersianDate = results.map(article => {
            const persianDate = moment(article.created_at).format('jYYYY/jMM/jDD HH:mm');
            return { ...article, created_at: persianDate };
        });
        res.json(articlesWithPersianDate);
    });
});

app.get('/api/admin/articles/:id', (req, res) => {
    const articleId = req.params.id;
    
    if (!articleId || isNaN(articleId)) {
        return res.status(400).json({ error: 'شناسه مقاله نامعتبر است' });
    }
    
    db.query('SELECT id, title, category, content, author, status, created_at FROM articles WHERE id = ?', 
        [articleId], 
        (err, results) => {
            if (err) {
                console.error('❌ خطا در دریافت مقاله:', err);
                return res.status(500).json({ error: 'خطا در دریافت مقاله' });
            }
            
            if (results.length === 0) {
                return res.status(404).json({ error: 'مقاله یافت نشد' });
            }
            
            const article = results[0];
            const persianDate = moment(article.created_at).format('jYYYY/jMM/jDD HH:mm');
            article.created_at = persianDate;
            
            res.json(article);
        }
    );
});

app.post('/api/admin/articles', (req, res) => {
    const { title, category, content, author, status } = req.body;
    if (!title || !category || !content) {
        return res.status(400).json({ error: 'عنوان، دسته‌بندی و متن مقاله الزامی است.' });
    }
    db.query('INSERT INTO articles (title, category, content, author, status) VALUES (?, ?, ?, ?, ?)',
        [title, category, content, author || 'سوفیا AI', status || 'published'],
        (err, result) => {
            if (err) {
                console.error('❌ خطا در ذخیره مقاله:', err);
                return res.status(500).json({ error: 'خطا در ذخیره مقاله' });
            }
            res.json({ message: '✅ مقاله با موفقیت ذخیره شد!', id: result.insertId });
        }
    );
});

app.put('/api/admin/articles/:id', (req, res) => {
    const articleId = req.params.id;
    const { title, category, content, author, status } = req.body;
    if (!title || !category || !content) {
        return res.status(400).json({ error: 'عنوان، دسته‌بندی و متن مقاله الزامی است.' });
    }
    db.query('UPDATE articles SET title = ?, category = ?, content = ?, author = ?, status = ? WHERE id = ?',
        [title, category, content, author || 'سوفیا AI', status || 'published', articleId],
        (err, result) => {
            if (err) {
                console.error('❌ خطا در ویرایش مقاله:', err);
                return res.status(500).json({ error: 'خطا در ویرایش مقاله' });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'مقاله یافت نشد' });
            }
            res.json({ message: '✅ مقاله با موفقیت ویرایش شد!' });
        }
    );
});

app.delete('/api/admin/articles/:id', (req, res) => {
    const articleId = req.params.id;
    db.query('DELETE FROM articles WHERE id = ?', [articleId], (err, result) => {
        if (err) {
            console.error('❌ خطا در حذف مقاله:', err);
            return res.status(500).json({ error: 'خطا در حذف مقاله' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'مقاله یافت نشد' });
        }
        res.json({ message: '✅ مقاله با موفقیت حذف شد!' });
    });
});

// ==================================================
// ===== API نظرات =====
// ==================================================
app.get('/api/comments/approved', (req, res) => {
    db.query('SELECT id, name, email, text, status, created_at FROM comments WHERE status = "approved" ORDER BY id DESC LIMIT 20',
        (err, results) => {
            if (err) {
                console.error('❌ خطا در دریافت نظرات:', err);
                return res.status(500).json({ error: 'خطا در دریافت اطلاعات' });
            }
            const commentsWithPersianDate = results.map(comment => {
                const persianDate = moment(comment.created_at).format('jYYYY/jMM/jDD HH:mm');
                return { ...comment, created_at: persianDate };
            });
            res.json(commentsWithPersianDate);
        }
    );
});

app.get('/api/admin/comments', (req, res) => {
    db.query('SELECT id, name, email, text, status, created_at FROM comments ORDER BY id DESC', (err, results) => {
        if (err) {
            console.error('❌ خطا در دریافت نظرات:', err);
            return res.status(500).json({ error: 'خطا در دریافت اطلاعات' });
        }
        const commentsWithPersianDate = results.map(comment => {
            const persianDate = moment(comment.created_at).format('jYYYY/jMM/jDD HH:mm');
            return { ...comment, created_at: persianDate };
        });
        res.json(commentsWithPersianDate);
    });
});

app.post('/api/comments', (req, res) => {
    const { name, email, text } = req.body;
    if (!name || !text) {
        return res.status(400).json({ error: 'نام و متن نظر الزامی است.' });
    }
    db.query('INSERT INTO comments (name, email, text, status) VALUES (?, ?, ?, "pending")',
        [name, email || null, text],
        (err, result) => {
            if (err) {
                console.error('❌ خطا در ذخیره نظر:', err);
                return res.status(500).json({ error: 'خطا در ذخیره نظر' });
            }
            res.json({ message: '✅ نظر شما با موفقیت ثبت شد! پس از تایید نمایش داده می‌شود.' });
        }
    );
});

app.put('/api/admin/comments/:id/approve', (req, res) => {
    const commentId = req.params.id;
    db.query('UPDATE comments SET status = "approved" WHERE id = ?', [commentId], (err, result) => {
        if (err) {
            console.error('❌ خطا در تایید نظر:', err);
            return res.status(500).json({ error: 'خطا در تایید نظر' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'نظر یافت نشد' });
        }
        res.json({ message: '✅ نظر با موفقیت تایید شد!' });
    });
});

app.put('/api/admin/comments/:id/reject', (req, res) => {
    const commentId = req.params.id;
    db.query('UPDATE comments SET status = "rejected" WHERE id = ?', [commentId], (err, result) => {
        if (err) {
            console.error('❌ خطا در رد نظر:', err);
            return res.status(500).json({ error: 'خطا در رد نظر' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'نظر یافت نشد' });
        }
        res.json({ message: '✅ نظر با موفقیت رد شد!' });
    });
});

app.delete('/api/admin/comments/:id', (req, res) => {
    const commentId = req.params.id;
    db.query('DELETE FROM comments WHERE id = ?', [commentId], (err, result) => {
        if (err) {
            console.error('❌ خطا در حذف نظر:', err);
            return res.status(500).json({ error: 'خطا در حذف نظر' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'نظر یافت نشد' });
        }
        res.json({ message: '✅ نظر با موفقیت حذف شد!' });
    });
});

// ==================================================
// ===== API کاربران =====
// ==================================================
app.get('/api/users', (req, res) => {
    db.query('SELECT id, name, email, phone, created_at FROM users ORDER BY id DESC', (err, results) => {
        if (err) {
            console.error('❌ خطا در دریافت کاربران:', err);
            return res.status(500).json({ error: 'خطا در دریافت اطلاعات' });
        }
        const usersWithPersianDate = results.map(user => {
            const persianDate = moment(user.created_at).format('jYYYY/jMM/jDD HH:mm');
            return { ...user, created_at: persianDate };
        });
        res.json(usersWithPersianDate);
    });
});

app.delete('/api/users/:id', (req, res) => {
    const userId = req.params.id;
    db.query('DELETE FROM users WHERE id = ?', [userId], (err, result) => {
        if (err) {
            console.error('❌ خطا در حذف کاربر:', err);
            return res.status(500).json({ error: 'خطا در حذف کاربر' });
        }
        res.json({ message: '✅ کاربر با موفقیت حذف شد!' });
    });
});

app.post('/api/register', async (req, res) => {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ error: 'نام، ایمیل و رمز عبور الزامی هستند.' });
    }
    try {
        db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
            if (err) {
                console.error('❌ خطا در بررسی ایمیل:', err);
                return res.status(500).json({ error: 'خطا در دیتابیس' });
            }
            if (results.length > 0) {
                return res.status(400).json({ error: 'این ایمیل قبلاً ثبت شده است.' });
            }
            const hashedPassword = await bcrypt.hash(password, 10);
            db.query('INSERT INTO users (name, email, password, phone) VALUES (?, ?, ?, ?)',
                [name, email, hashedPassword, phone || null],
                (err, result) => {
                    if (err) {
                        console.error('❌ خطا در ذخیره کاربر:', err);
                        return res.status(500).json({ error: 'خطا در ثبت‌نام' });
                    }
                    res.json({
                        message: '✅ ثبت‌نام با موفقیت انجام شد!',
                        userId: result.insertId,
                        user: { id: result.insertId, name, email, phone }
                    });
                }
            );
        });
    } catch (error) {
        console.error('❌ خطا در ثبت‌نام:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'ایمیل و رمز عبور الزامی هستند.' });
    }
    try {
        db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
            if (err) {
                console.error('❌ خطا در بررسی ایمیل:', err);
                return res.status(500).json({ error: 'خطا در دیتابیس' });
            }
            if (results.length === 0) {
                return res.status(400).json({ error: 'ایمیل یا رمز عبور اشتباه است.' });
            }
            const user = results[0];
            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                return res.status(400).json({ error: 'ایمیل یا رمز عبور اشتباه است.' });
            }
            const persianCreatedAt = moment(user.created_at).format('jYYYY/jMM/jDD HH:mm');
            res.json({
                message: '✅ ورود با موفقیت انجام شد!',
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    created_at: persianCreatedAt
                }
            });
        });
    } catch (error) {
        console.error('❌ خطا در ورود:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
});

// ==================================================
// ===== بقیه APIها (سبد خرید، تنظیمات، درخواست‌ها، و ...) =====
// ==================================================
// برای اختصار، بقیه کدها همانند نسخه قبلی شما هستند و در اینجا تکرار نمی‌شوند.
// اطمینان حاصل کنید که APIهای زیر در فایل نهایی شما وجود دارند:
// - /api/cart
// - /api/admin/settings
// - /api/user-requests
// - /api/chatbot-requests
// - /api/cooperation
// - /api/contact
// - /api/admin/stats
// - /api/stats/visit
// - /api/admin/stats/visits

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
