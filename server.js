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
// ===== سرویس فایل‌های استاتیک (اصلاح شده) =====
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

// مسیر مستقیم گالری (برای اطمینان)
app.use('/images/gallery', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
}, express.static(path.join(__dirname, 'public', 'images', 'gallery')));

// ==================================================
// ===== اطمینان از وجود پوشه‌ها =====
// ==================================================

const publicDir = path.join(__dirname, 'public');
const imagesDir = path.join(publicDir, 'images');
const galleryDir = path.join(imagesDir, 'gallery');

if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
    console.log('📁 پوشه public ایجاد شد:', publicDir);
}
if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
    console.log('📁 پوشه images ایجاد شد:', imagesDir);
}
if (!fs.existsSync(galleryDir)) {
    fs.mkdirSync(galleryDir, { recursive: true });
    console.log('📁 پوشه گالری ایجاد شد:', galleryDir);
}

console.log('📁 مسیر گالری:', galleryDir);

// ===== تنظیمات Multer برای آپلود =====
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, galleryDir);
    },
    filename: function(req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'gallery-' + uniqueSuffix + ext);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('فایل باید تصویر باشد'), false);
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

    // جدول گالری
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
            // تنظیمات پیش‌فرض
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

    // جدول درخواست‌های کاربران
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

    // جدول درخواست‌های چت‌بات
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

// ==================================================
// ===== API آپلود =====
// ==================================================
app.post('/api/upload', upload.single('image'), (req, res) => {
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

// دریافت مقالات برای صفحه اصلی (فقط منتشر شده)
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

// دریافت یک مقاله خاص با ID (برای صفحه article.html)
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

// دریافت همه مقالات برای پنل مدیریت
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

// دریافت یک مقاله خاص برای مدیریت (ویرایش)
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

// ایجاد مقاله جدید (از پنل مدیریت)
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

// ویرایش مقاله (از پنل مدیریت)
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

// حذف مقاله (از پنل مدیریت)
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
// ===== API سبد خرید =====
// ==================================================
app.get('/api/cart/:userId', (req, res) => {
    const userId = req.params.userId;
    db.query('SELECT id, item_name, item_price, created_at FROM cart WHERE user_id = ? ORDER BY id DESC',
        [userId],
        (err, results) => {
            if (err) {
                console.error('❌ خطا در دریافت سبد خرید:', err);
                return res.status(500).json({ error: 'خطا در دریافت اطلاعات' });
            }
            res.json(results);
        }
    );
});

app.get('/api/admin/cart', (req, res) => {
    const query = `
        SELECT cart.id, cart.user_id, cart.item_name, cart.item_price, cart.created_at,
               users.name as user_name, users.email as user_email, users.phone as user_phone
        FROM cart JOIN users ON cart.user_id = users.id ORDER BY cart.created_at DESC
    `;
    db.query(query, (err, results) => {
        if (err) {
            console.error('❌ خطا در دریافت سبد خرید همه کاربران:', err);
            return res.status(500).json({ error: 'خطا در دریافت اطلاعات' });
        }
        const itemsWithPersianDate = results.map(item => {
            const persianDate = moment(item.created_at).format('jYYYY/jMM/jDD HH:mm');
            return { ...item, created_at: persianDate };
        });
        res.json(itemsWithPersianDate);
    });
});

app.post('/api/cart', (req, res) => {
    const { user_id, item_name, item_price } = req.body;
    if (!user_id || !item_name) {
        return res.status(400).json({ error: 'شناسه کاربر و نام خدمت الزامی است.' });
    }
    db.query('INSERT INTO cart (user_id, item_name, item_price) VALUES (?, ?, ?)',
        [user_id, item_name, item_price || null],
        (err, result) => {
            if (err) {
                console.error('❌ خطا در افزودن به سبد خرید:', err);
                return res.status(500).json({ error: 'خطا در افزودن به سبد خرید' });
            }
            res.json({ message: '✅ خدمت با موفقیت به سبد خرید اضافه شد!', id: result.insertId });
        }
    );
});

app.delete('/api/cart/:id', (req, res) => {
    const cartId = req.params.id;
    db.query('DELETE FROM cart WHERE id = ?', [cartId], (err, result) => {
        if (err) {
            console.error('❌ خطا در حذف از سبد خرید:', err);
            return res.status(500).json({ error: 'خطا در حذف از سبد خرید' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'آیتم یافت نشد' });
        }
        res.json({ message: '✅ آیتم با موفقیت از سبد خرید حذف شد!' });
    });
});

// ==================================================
// ===== API تنظیمات =====
// ==================================================
app.get('/api/admin/settings', (req, res) => {
    db.query('SELECT setting_key, setting_value FROM site_settings', (err, results) => {
        if (err) {
            console.error('❌ خطا در دریافت تنظیمات:', err);
            return res.status(500).json({ error: 'خطا در دریافت اطلاعات' });
        }
        const settings = {};
        results.forEach(row => {
            settings[row.setting_key] = row.setting_value;
        });
        res.json(settings);
    });
});

app.put('/api/admin/settings', (req, res) => {
    const settings = req.body;
    const queries = Object.keys(settings).map(key => {
        return new Promise((resolve, reject) => {
            db.query(
                'INSERT INTO site_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)',
                [key, settings[key] || ''],
                (err, result) => {
                    if (err) reject(err);
                    else resolve(result);
                }
            );
        });
    });
    Promise.all(queries)
        .then(() => res.json({ message: '✅ تنظیمات با موفقیت ذخیره شد!' }))
        .catch(err => {
            console.error('❌ خطا در ذخیره تنظیمات:', err);
            res.status(500).json({ error: 'خطا در ذخیره تنظیمات' });
        });
});

// ==================================================
// ===== API آمار =====
// ==================================================
app.get('/api/admin/stats', (req, res) => {
    const queries = {
        articles: 'SELECT COUNT(*) as count FROM articles',
        comments: 'SELECT COUNT(*) as count FROM comments',
        pending: "SELECT COUNT(*) as count FROM comments WHERE status = 'pending'",
        users: 'SELECT COUNT(*) as count FROM users',
        cart: 'SELECT COUNT(*) as count FROM cart',
        gallery: 'SELECT COUNT(*) as count FROM gallery',
        user_requests: 'SELECT COUNT(*) as count FROM user_requests',
        chatbot_requests: 'SELECT COUNT(*) as count FROM chatbot_requests'
    };
    let results = { articles: 0, comments: 0, pending: 0, users: 0, cart: 0, gallery: 0, user_requests: 0, chatbot_requests: 0 };
    let completed = 0;
    const totalQueries = Object.keys(queries).length;
    Object.keys(queries).forEach(key => {
        db.query(queries[key], (err, result) => {
            if (!err) results[key] = parseInt(result[0].count) || 0;
            completed++;
            if (completed === totalQueries) {
                res.json(results);
            }
        });
    });
});

// ==================================================
// ===== API درخواست‌های کاربران =====
// ==================================================
app.get('/api/user-requests/:userId', (req, res) => {
    const userId = req.params.userId;
    db.query(
        'SELECT id, user_id, title, description, priority, category, status, created_at FROM user_requests WHERE user_id = ? ORDER BY id DESC',
        [userId],
        (err, results) => {
            if (err) {
                console.error('❌ خطا در دریافت درخواست‌ها:', err);
                return res.status(500).json({ error: 'خطا در دریافت اطلاعات' });
            }
            const requestsWithPersianDate = results.map(req => {
                const persianDate = moment(req.created_at).format('jYYYY/jMM/jDD HH:mm');
                return { ...req, created_at: persianDate };
            });
            res.json(requestsWithPersianDate);
        }
    );
});

app.get('/api/admin/user-requests', (req, res) => {
    const query = `
        SELECT ur.id, ur.user_id, ur.title, ur.description, ur.priority, ur.category, ur.status, ur.created_at,
               u.name as user_name, u.email as user_email, u.phone as user_phone
        FROM user_requests ur
        LEFT JOIN users u ON ur.user_id = u.id
        ORDER BY ur.id DESC
    `;
    db.query(query, (err, results) => {
        if (err) {
            console.error('❌ خطا در دریافت درخواست‌ها:', err);
            return res.status(500).json({ error: 'خطا در دریافت اطلاعات' });
        }
        const requestsWithPersianDate = results.map(req => {
            const persianDate = moment(req.created_at).format('jYYYY/jMM/jDD HH:mm');
            return { ...req, created_at: persianDate };
        });
        res.json(requestsWithPersianDate);
    });
});

app.post('/api/user-requests', (req, res) => {
    const { user_id, title, description, priority, category } = req.body;
    if (!title) {
        return res.status(400).json({ error: 'عنوان درخواست الزامی است.' });
    }
    const userId = user_id || 0;
    db.query('INSERT INTO user_requests (user_id, title, description, priority, category, status) VALUES (?, ?, ?, ?, ?, "pending")',
        [userId, title, description || null, priority || 'medium', category || 'general'],
        (err, result) => {
            if (err) {
                console.error('❌ خطا در ذخیره درخواست:', err);
                return res.status(500).json({ error: 'خطا در ذخیره درخواست' });
            }
            res.json({ message: '✅ درخواست شما با موفقیت ثبت شد!', id: result.insertId });
        }
    );
});

app.put('/api/admin/user-requests/:id/status', (req, res) => {
    const requestId = req.params.id;
    const { status } = req.body;
    if (!status) {
        return res.status(400).json({ error: 'وضعیت جدید الزامی است.' });
    }
    db.query('UPDATE user_requests SET status = ? WHERE id = ?', [status, requestId], (err, result) => {
        if (err) {
            console.error('❌ خطا در به‌روزرسانی وضعیت:', err);
            return res.status(500).json({ error: 'خطا در به‌روزرسانی وضعیت' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'درخواست یافت نشد' });
        }
        res.json({ message: '✅ وضعیت درخواست با موفقیت تغییر کرد!' });
    });
});

app.delete('/api/user-requests/:id', (req, res) => {
    const requestId = req.params.id;
    db.query('DELETE FROM user_requests WHERE id = ?', [requestId], (err, result) => {
        if (err) {
            console.error('❌ خطا در حذف درخواست:', err);
            return res.status(500).json({ error: 'خطا در حذف درخواست' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'درخواست یافت نشد' });
        }
        res.json({ message: '✅ درخواست با موفقیت حذف شد!' });
    });
});

// ==================================================
// ===== API درخواست‌های چت‌بات =====
// ==================================================
app.get('/api/chatbot-requests', (req, res) => {
    db.query('SELECT id, name, phone, email, description, created_at FROM chatbot_requests ORDER BY id DESC', (err, results) => {
        if (err) {
            console.error('❌ خطا در دریافت درخواست‌ها:', err);
            return res.status(500).json({ error: 'خطا در دریافت اطلاعات' });
        }
        const requestsWithPersianDate = results.map(req => {
            const persianDate = moment(req.created_at).format('jYYYY/jMM/jDD HH:mm');
            return { ...req, created_at: persianDate };
        });
        res.json(requestsWithPersianDate);
    });
});

app.post('/api/chatbot-requests', (req, res) => {
    const { name, phone, email, description } = req.body;
    if (!name || !phone) {
        return res.status(400).json({ error: 'نام و شماره تماس الزامی است.' });
    }
    db.query('INSERT INTO chatbot_requests (name, phone, email, description) VALUES (?, ?, ?, ?)',
        [name, phone, email || null, description || null],
        (err, result) => {
            if (err) {
                console.error('❌ خطا در ذخیره درخواست:', err);
                return res.status(500).json({ error: 'خطا در ذخیره درخواست' });
            }
            res.json({ message: '✅ درخواست شما با موفقیت ثبت شد!', id: result.insertId });
        }
    );
});

app.delete('/api/chatbot-requests/:id', (req, res) => {
    const requestId = req.params.id;
    db.query('DELETE FROM chatbot_requests WHERE id = ?', [requestId], (err, result) => {
        if (err) {
            console.error('❌ خطا در حذف درخواست:', err);
            return res.status(500).json({ error: 'خطا در حذف درخواست' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'درخواست یافت نشد' });
        }
        res.json({ message: '✅ درخواست با موفقیت حذف شد!' });
    });
});

// ==================================================
// ===== شروع سرور =====
// ==================================================
app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 سرور در حال اجرا روی پورت ${port}`);
    console.log(`📁 پوشه آپلود: ${galleryDir}`);
    console.log(`📁 مسیر عمومی: ${publicDir}`);
    console.log(`✅ API گالری: /api/gallery`);
    console.log(`✅ API آپلود: /api/upload`);
    console.log(`✅ API مقالات عمومی: /api/articles`);
    console.log(`✅ API مقالات عمومی با ID: /api/articles/:id`);
    console.log(`✅ API مدیریت مقالات: /api/admin/articles`);
    console.log(`✅ API مدیریت مقالات با ID: /api/admin/articles/:id`);
    console.log(`✅ API درخواست‌ها: /api/user-requests`);
    console.log(`✅ API چت‌بات: /api/chatbot-requests`);
    console.log(`✅ API سبد خرید: /api/cart`);
    console.log(`📁 پوشه گالری: ${galleryDir}`);
});
