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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ===== اطمینان از وجود پوشه‌های آپلود (با دسترسی کامل) =====
const uploadDir = path.join(__dirname, 'public', 'images', 'gallery');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log('📁 پوشه گالری ایجاد شد:', uploadDir);
}
// تنظیم دسترسی پوشه (اجازه نوشتن)
try {
    fs.chmodSync(uploadDir, 0o777);
} catch(e) {}

// ===== تنظیمات آپلود تصویر (با آپلود مستقیم) =====
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function(req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'gallery-' + uniqueSuffix + ext);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB
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
// ===== صفحات HTML =====
// ==================================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/register.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/users.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'users.html'));
});

app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/cart.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'cart.html'));
});

app.get('/admin.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/article.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'article.html'));
});

app.get('/service-chatbot.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'service-chatbot.html'));
});

app.get('/service-rag.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'service-rag.html'));
});

app.get('/service-automation.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'service-automation.html'));
});

app.get('/service-data.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'service-data.html'));
});

app.get('/service-agent-data.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'service-agent-data.html'));
});

app.get('/service-agent-support.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'service-agent-support.html'));
});

app.get('/service-agent-content.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'service-agent-content.html'));
});

app.get('/service-agent-automation.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'service-agent-automation.html'));
});

// ==================================================
// ===== API آپلود تصویر (ساده و تضمینی) =====
// ==================================================
app.post('/api/upload', upload.single('image'), (req, res) => {
    try {
        console.log('📤 درخواست آپلود دریافت شد');
        
        if (!req.file) {
            console.log('❌ فایلی ارسال نشده');
            return res.status(400).json({ error: 'هیچ تصویری انتخاب نشده است.' });
        }
        
        const imageUrl = '/images/gallery/' + req.file.filename;
        console.log('✅ تصویر با موفقیت آپلود شد:', imageUrl);
        
        res.json({ 
            success: true,
            url: imageUrl,
            filename: req.file.filename,
            message: '✅ تصویر با موفقیت آپلود شد!'
        });
    } catch (error) {
        console.error('❌ خطا در آپلود:', error);
        res.status(500).json({ 
            error: 'خطا در آپلود تصویر: ' + error.message 
        });
    }
});

// ==================================================
// ===== APIهای گالری =====
// ==================================================

// ===== دریافت لیست گالری =====
app.get('/api/gallery', (req, res) => {
    db.query('SELECT id, title, description, image_url, created_at FROM gallery ORDER BY id DESC', (err, results) => {
        if (err) {
            console.error('❌ خطا در دریافت گالری:', err);
            return res.status(500).json({ error: 'خطا در دریافت اطلاعات' });
        }
        res.json(results);
    });
});

// ===== افزودن تصویر به گالری =====
app.post('/api/gallery', (req, res) => {
    const { title, description, image_url } = req.body;
    
    if (!title || !image_url) {
        return res.status(400).json({ error: 'عنوان و آدرس تصویر الزامی است.' });
    }
    
    const query = 'INSERT INTO gallery (title, description, image_url) VALUES (?, ?, ?)';
    db.query(query, [title, description || '', image_url], (err, result) => {
        if (err) {
            console.error('❌ خطا در افزودن به گالری:', err);
            return res.status(500).json({ error: 'خطا در افزودن تصویر' });
        }
        res.json({ message: '✅ تصویر با موفقیت به گالری اضافه شد!', id: result.insertId });
    });
});

// ===== حذف تصویر از گالری =====
app.delete('/api/gallery/:id', (req, res) => {
    const galleryId = req.params.id;
    
    db.query('SELECT image_url FROM gallery WHERE id = ?', [galleryId], (err, results) => {
        if (err) {
            console.error('❌ خطا در دریافت تصویر:', err);
            return res.status(500).json({ error: 'خطا در دریافت اطلاعات' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'تصویر یافت نشد' });
        }
        
        const imageUrl = results[0].image_url;
        const imagePath = path.join(__dirname, 'public', imageUrl);
        
        if (fs.existsSync(imagePath)) {
            try {
                fs.unlinkSync(imagePath);
                console.log('🗑️ فایل تصویر حذف شد:', imagePath);
            } catch (err) {
                console.error('⚠️ خطا در حذف فایل:', err);
            }
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
// ===== APIهای مدیریت کاربران =====
// ==================================================

// ===== دریافت لیست کاربران =====
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

// ===== حذف کاربر =====
app.delete('/api/users/:id', (req, res) => {
    const userId = req.params.id;
    
    db.query('SELECT * FROM users WHERE id = ?', [userId], (err, results) => {
        if (err) {
            console.error('❌ خطا در بررسی کاربر:', err);
            return res.status(500).json({ error: 'خطا در دیتابیس' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'کاربر پیدا نشد.' });
        }
        
        db.query('DELETE FROM users WHERE id = ?', [userId], (err, result) => {
            if (err) {
                console.error('❌ خطا در حذف کاربر:', err);
                return res.status(500).json({ error: 'خطا در حذف کاربر' });
            }
            res.json({ message: '✅ کاربر با موفقیت حذف شد!' });
        });
    });
});

// ===== تغییر رمز عبور =====
app.put('/api/users/:id/password', async (req, res) => {
    const userId = req.params.id;
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'رمز فعلی و رمز جدید الزامی هستند.' });
    }
    
    if (newPassword.length < 4) {
        return res.status(400).json({ error: 'رمز جدید باید حداقل ۴ کاراکتر باشد.' });
    }
    
    try {
        db.query('SELECT * FROM users WHERE id = ?', [userId], async (err, results) => {
            if (err) {
                console.error('❌ خطا در بررسی کاربر:', err);
                return res.status(500).json({ error: 'خطا در دیتابیس' });
            }
            if (results.length === 0) {
                return res.status(404).json({ error: 'کاربر پیدا نشد.' });
            }
            
            const user = results[0];
            const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
            if (!isPasswordValid) {
                return res.status(400).json({ error: 'رمز فعلی اشتباه است.' });
            }
            
            const hashedNewPassword = await bcrypt.hash(newPassword, 10);
            
            db.query(
                'UPDATE users SET password = ? WHERE id = ?',
                [hashedNewPassword, userId],
                (err, result) => {
                    if (err) {
                        console.error('❌ خطا در به‌روزرسانی رمز:', err);
                        return res.status(500).json({ error: 'خطا در تغییر رمز' });
                    }
                    res.json({ message: '✅ رمز عبور با موفقیت تغییر کرد!' });
                }
            );
        });
    } catch (error) {
        console.error('❌ خطا در تغییر رمز:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
});

// ===== ثبت‌نام =====
app.post('/api/register', async (req, res) => {
    const { name, email, password, phone } = req.body;
    
    console.log('📝 دریافت درخواست ثبت‌نام:', { name, email, phone });
    
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
            
            db.query(
                'INSERT INTO users (name, email, password, phone) VALUES (?, ?, ?, ?)',
                [name, email, hashedPassword, phone || null],
                (err, result) => {
                    if (err) {
                        console.error('❌ خطا در ذخیره کاربر:', err);
                        return res.status(500).json({ error: 'خطا در ثبت‌نام' });
                    }
                    console.log('✅ کاربر با موفقیت ثبت شد:', result.insertId);
                    res.json({ 
                        message: '✅ ثبت‌نام با موفقیت انجام شد!',
                        userId: result.insertId
                    });
                }
            );
        });
    } catch (error) {
        console.error('❌ خطا در ثبت‌نام:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
});

// ===== ورود کاربر (با تاریخ شمسی) =====
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    
    console.log('📝 دریافت درخواست ورود:', { email });
    
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
// ===== APIهای سبد خرید =====
// ==================================================

// ===== افزودن آیتم به سبد خرید =====
app.post('/api/cart/add', (req, res) => {
    const { user_id, item_name, item_price } = req.body;
    
    if (!user_id || !item_name) {
        return res.status(400).json({ error: 'شناسه کاربر و نام آیتم الزامی است.' });
    }
    
    db.query(
        'SELECT * FROM cart WHERE user_id = ? AND item_name = ?',
        [user_id, item_name],
        (err, results) => {
            if (err) {
                console.error('❌ خطا در بررسی سبد خرید:', err);
                return res.status(500).json({ error: 'خطا در بررسی سبد خرید' });
            }
            
            if (results.length > 0) {
                return res.status(400).json({ error: 'این آیتم قبلاً به سبد خرید اضافه شده است.' });
            }
            
            const query = 'INSERT INTO cart (user_id, item_name, item_price) VALUES (?, ?, ?)';
            db.query(query, [user_id, item_name, item_price || 'رایگان'], (err, result) => {
                if (err) {
                    console.error('❌ خطا در افزودن به سبد خرید:', err);
                    return res.status(500).json({ error: 'خطا در افزودن به سبد خرید' });
                }
                res.json({ 
                    message: '✅ آیتم به سبد خرید اضافه شد!',
                    cart_id: result.insertId
                });
            });
        }
    );
});

// ===== دریافت آیتم‌های سبد خرید یک کاربر =====
app.get('/api/cart/:user_id', (req, res) => {
    const userId = req.params.user_id;
    const query = 'SELECT id, item_name, item_price, created_at FROM cart WHERE user_id = ? ORDER BY created_at DESC';
    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error('❌ خطا در دریافت سبد خرید:', err);
            return res.status(500).json({ error: 'خطا در دریافت سبد خرید' });
        }
        res.json(results);
    });
});

// ===== حذف یک آیتم از سبد خرید =====
app.delete('/api/cart/:id', (req, res) => {
    const cartId = req.params.id;
    const query = 'DELETE FROM cart WHERE id = ?';
    db.query(query, [cartId], (err, result) => {
        if (err) {
            console.error('❌ خطا در حذف آیتم از سبد خرید:', err);
            return res.status(500).json({ error: 'خطا در حذف آیتم' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'آیتم یافت نشد' });
        }
        res.json({ message: '✅ آیتم با موفقیت از سبد خرید حذف شد' });
    });
});

// ===== ثبت نهایی درخواست (چک‌اوت) =====
app.post('/api/cart/checkout/:user_id', (req, res) => {
    const userId = req.params.user_id;
    
    db.query('SELECT * FROM cart WHERE user_id = ?', [userId], (err, items) => {
        if (err) {
            console.error('❌ خطا در دریافت آیتم‌های سبد خرید:', err);
            return res.status(500).json({ error: 'خطا در دریافت آیتم‌ها' });
        }
        
        if (items.length === 0) {
            return res.status(400).json({ error: 'سبد خرید شما خالی است.' });
        }
        
        db.query('DELETE FROM cart WHERE user_id = ?', [userId], (err, result) => {
            if (err) {
                console.error('❌ خطا در خالی کردن سبد خرید:', err);
                return res.status(500).json({ error: 'خطا در ثبت درخواست' });
            }
            res.json({ 
                message: '✅ درخواست شما با موفقیت ثبت شد! به زودی با شما تماس می‌گیریم.',
                items: items.length
            });
        });
    });
});

// ==================================================
// ===== APIهای درخواست ساخت چت‌بات سفارشی =====
// ==================================================

// ===== ذخیره درخواست جدید =====
app.post('/api/chatbot-request', (req, res) => {
    const { name, phone, email, description } = req.body;
    
    console.log('📝 دریافت درخواست جدید:', { name, phone, email });
    
    if (!name || !phone || !email || !description) {
        return res.status(400).json({ error: 'همه فیلدها الزامی هستند.' });
    }
    
    const query = 'INSERT INTO chatbot_requests (name, phone, email, description) VALUES (?, ?, ?, ?)';
    db.query(query, [name, phone, email, description], (err, result) => {
        if (err) {
            console.error('❌ خطا در ذخیره درخواست:', err);
            return res.status(500).json({ error: 'خطا در ذخیره درخواست' });
        }
        console.log('✅ درخواست با موفقیت ثبت شد، ID:', result.insertId);
        res.json({ message: '✅ درخواست شما با موفقیت ثبت شد!' });
    });
});

// ===== دریافت لیست درخواست‌ها (برای پنل مدیریت) =====
app.get('/api/chatbot-requests', (req, res) => {
    const query = 'SELECT id, name, phone, email, description, created_at FROM chatbot_requests ORDER BY id DESC';
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

// ===== حذف درخواست =====
app.delete('/api/chatbot-requests/:id', (req, res) => {
    const requestId = req.params.id;
    const query = 'DELETE FROM chatbot_requests WHERE id = ?';
    db.query(query, [requestId], (err, result) => {
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
// ===== APIهای مدیریت سبد خرید (برای ادمین) =====
// ==================================================

// ===== دریافت سبد خرید همه کاربران (برای پنل مدیریت) =====
app.get('/api/admin/cart', (req, res) => {
    const query = `
        SELECT 
            cart.id, 
            cart.user_id, 
            cart.item_name, 
            cart.item_price, 
            cart.created_at, 
            users.name as user_name, 
            users.email as user_email,
            users.phone as user_phone
        FROM cart
        JOIN users ON cart.user_id = users.id
        ORDER BY cart.created_at DESC
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

// ==================================================
// ===== APIهای پنل مدیریت (مقالات، نظرات، تنظیمات) =====
// ==================================================

// ===== آمار داشبورد =====
app.get('/api/admin/stats', (req, res) => {
    const queries = {
        articles: 'SELECT COUNT(*) as count FROM articles',
        comments: 'SELECT COUNT(*) as count FROM comments',
        pending: "SELECT COUNT(*) as count FROM comments WHERE status = 'pending'",
        users: 'SELECT COUNT(*) as count FROM users',
        requests: 'SELECT COUNT(*) as count FROM chatbot_requests',
        cart: 'SELECT COUNT(*) as count FROM cart',
        gallery: 'SELECT COUNT(*) as count FROM gallery'
    };
    
    let results = { articles: 0, comments: 0, pending: 0, users: 0, requests: 0, cart: 0, gallery: 0 };
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
// ===== APIهای مدیریت مقالات =====
// ==================================================

// ===== دریافت لیست مقالات (برای پنل مدیریت) =====
app.get('/api/admin/articles', (req, res) => {
    db.query('SELECT id, title, category, author, status, created_at FROM articles ORDER BY id DESC', (err, results) => {
        if (err) {
            console.error('❌ خطا در دریافت مقالات:', err);
            return res.status(500).json({ error: 'خطا در دریافت اطلاعات: ' + err.message });
        }
        const articlesWithPersianDate = results.map(article => {
            const persianDate = moment(article.created_at).format('jYYYY/jMM/jDD HH:mm');
            return { ...article, created_at: persianDate };
        });
        res.json(articlesWithPersianDate);
    });
});

// ===== دریافت یک مقاله (برای ویرایش) =====
app.get('/api/articles/:id', (req, res) => {
    const articleId = req.params.id;
    db.query('SELECT * FROM articles WHERE id = ?', [articleId], (err, results) => {
        if (err) {
            console.error('❌ خطا در دریافت مقاله:', err);
            return res.status(500).json({ error: 'خطا در دریافت مقاله: ' + err.message });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'مقاله یافت نشد' });
        }
        const article = results[0];
        article.created_at = moment(article.created_at).format('jYYYY/jMM/jDD');
        res.json(article);
    });
});

// ===== دریافت مقالات برای نمایش در صفحه اصلی (فقط منتشر شده) =====
app.get('/api/articles', (req, res) => {
    db.query('SELECT id, title, category, author, content, created_at FROM articles WHERE status = "published" ORDER BY id DESC LIMIT 3', (err, results) => {
        if (err) {
            console.error('❌ خطا در دریافت مقالات:', err);
            return res.status(500).json({ error: 'خطا در دریافت اطلاعات: ' + err.message });
        }
        const articlesWithPersianDate = results.map(article => {
            const persianDate = moment(article.created_at).format('jYYYY/jMM/jDD');
            return { ...article, created_at: persianDate };
        });
        res.json(articlesWithPersianDate);
    });
});

// ===== افزودن مقاله جدید =====
app.post('/api/admin/articles', (req, res) => {
    try {
        const { title, category, content, author, status } = req.body;
        
        console.log('📝 دریافت درخواست مقاله جدید:', { title, category });
        
        if (!title || !category || !content) {
            return res.status(400).json({ error: 'عنوان، دسته‌بندی و متن مقاله الزامی است.' });
        }
        
        const query = 'INSERT INTO articles (title, category, content, author, status) VALUES (?, ?, ?, ?, ?)';
        db.query(query, [title, category, content, author || 'توسعه دهنده هوش مصنوعی سوفیا', status || 'published'], (err, result) => {
            if (err) {
                console.error('❌ خطا در ذخیره مقاله:', err);
                return res.status(500).json({ error: 'خطا در ذخیره مقاله: ' + err.message });
            }
            console.log('✅ مقاله با موفقیت ذخیره شد، ID:', result.insertId);
            res.json({ message: '✅ مقاله با موفقیت ذخیره شد!', id: result.insertId });
        });
    } catch (error) {
        console.error('❌ خطای غیرمنتظره:', error);
        res.status(500).json({ error: 'خطای داخلی سرور: ' + error.message });
    }
});

// ===== ویرایش مقاله =====
app.put('/api/admin/articles/:id', (req, res) => {
    try {
        const articleId = req.params.id;
        const { title, category, content, author, status } = req.body;
        
        console.log('📝 دریافت درخواست ویرایش مقاله:', { articleId, title });
        
        if (!title || !category || !content) {
            return res.status(400).json({ error: 'عنوان، دسته‌بندی و متن مقاله الزامی است.' });
        }
        
        const query = 'UPDATE articles SET title = ?, category = ?, content = ?, author = ?, status = ? WHERE id = ?';
        db.query(query, [title, category, content, author || 'توسعه دهنده هوش مصنوعی سوفیا', status || 'published', articleId], (err, result) => {
            if (err) {
                console.error('❌ خطا در به‌روزرسانی مقاله:', err);
                return res.status(500).json({ error: 'خطا در به‌روزرسانی مقاله: ' + err.message });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'مقاله یافت نشد' });
            }
            console.log('✅ مقاله با موفقیت به‌روزرسانی شد، ID:', articleId);
            res.json({ message: '✅ مقاله با موفقیت به‌روزرسانی شد!' });
        });
    } catch (error) {
        console.error('❌ خطای غیرمنتظره:', error);
        res.status(500).json({ error: 'خطای داخلی سرور: ' + error.message });
    }
});

// ===== حذف مقاله =====
app.delete('/api/admin/articles/:id', (req, res) => {
    try {
        const articleId = req.params.id;
        console.log('📝 دریافت درخواست حذف مقاله:', articleId);
        
        db.query('DELETE FROM articles WHERE id = ?', [articleId], (err, result) => {
            if (err) {
                console.error('❌ خطا در حذف مقاله:', err);
                return res.status(500).json({ error: 'خطا در حذف مقاله: ' + err.message });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'مقاله یافت نشد' });
            }
            console.log('✅ مقاله با موفقیت حذف شد، ID:', articleId);
            res.json({ message: '✅ مقاله با موفقیت حذف شد!' });
        });
    } catch (error) {
        console.error('❌ خطای غیرمنتظره:', error);
        res.status(500).json({ error: 'خطای داخلی سرور: ' + error.message });
    }
});

// ==================================================
// ===== APIهای نظرات =====
// ==================================================

// ===== دریافت نظرات برای پنل مدیریت =====
app.get('/api/admin/comments', (req, res) => {
    db.query('SELECT id, name, email, text, status, created_at FROM comments ORDER BY id DESC', (err, results) => {
        if (err) {
            console.error('❌ خطا در دریافت نظرات:', err);
            return res.status(500).json({ error: 'خطا در دریافت اطلاعات: ' + err.message });
        }
        const commentsWithPersianDate = results.map(comment => {
            const persianDate = moment(comment.created_at).format('jYYYY/jMM/jDD HH:mm');
            return { ...comment, created_at: persianDate };
        });
        res.json(commentsWithPersianDate);
    });
});

// ===== ثبت نظر جدید (با وضعیت pending) =====
app.post('/api/comments', (req, res) => {
    const { name, email, text } = req.body;
    
    if (!name || !text) {
        return res.status(400).json({ error: 'نام و متن نظر الزامی است.' });
    }
    
    const query = 'INSERT INTO comments (name, email, text, status) VALUES (?, ?, ?, "pending")';
    db.query(query, [name, email || null, text], (err, result) => {
        if (err) {
            console.error('❌ خطا در ذخیره نظر:', err);
            return res.status(500).json({ error: 'خطا در ذخیره نظر: ' + err.message });
        }
        res.json({ message: '✅ نظر شما با موفقیت ثبت شد! پس از تایید نمایش داده می‌شود.' });
    });
});

// ===== تایید نظر =====
app.put('/api/admin/comments/:id/approve', (req, res) => {
    const commentId = req.params.id;
    db.query('UPDATE comments SET status = "approved" WHERE id = ?', [commentId], (err, result) => {
        if (err) {
            console.error('❌ خطا در تایید نظر:', err);
            return res.status(500).json({ error: 'خطا در تایید نظر: ' + err.message });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'نظر یافت نشد' });
        }
        res.json({ message: '✅ نظر با موفقیت تایید شد!' });
    });
});

// ===== رد نظر =====
app.put('/api/admin/comments/:id/reject', (req, res) => {
    const commentId = req.params.id;
    db.query('UPDATE comments SET status = "rejected" WHERE id = ?', [commentId], (err, result) => {
        if (err) {
            console.error('❌ خطا در رد نظر:', err);
            return res.status(500).json({ error: 'خطا در رد نظر: ' + err.message });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'نظر یافت نشد' });
        }
        res.json({ message: '✅ نظر با موفقیت رد شد!' });
    });
});

// ===== حذف نظر =====
app.delete('/api/admin/comments/:id', (req, res) => {
    const commentId = req.params.id;
    db.query('DELETE FROM comments WHERE id = ?', [commentId], (err, result) => {
        if (err) {
            console.error('❌ خطا در حذف نظر:', err);
            return res.status(500).json({ error: 'خطا در حذف نظر: ' + err.message });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'نظر یافت نشد' });
        }
        res.json({ message: '✅ نظر با موفقیت حذف شد!' });
    });
});

// ===== دریافت نظرات تایید شده برای نمایش در سایت =====
app.get('/api/comments/approved', (req, res) => {
    db.query('SELECT name, text, created_at FROM comments WHERE status = "approved" ORDER BY id DESC LIMIT 4', (err, results) => {
        if (err) {
            console.error('❌ خطا در دریافت نظرات:', err);
            return res.status(500).json({ error: 'خطا در دریافت اطلاعات: ' + err.message });
        }
        const commentsWithPersianDate = results.map(comment => {
            const persianDate = moment(comment.created_at).format('jYYYY/jMM/jDD');
            return { ...comment, created_at: persianDate };
        });
        res.json(commentsWithPersianDate);
    });
});

// ==================================================
// ===== مدیریت تنظیمات سایت (نسخه کامل) =====
// ==================================================

// ===== دریافت تنظیمات سایت =====
app.get('/api/admin/settings', (req, res) => {
    const query = 'SELECT setting_key, setting_value FROM site_settings';
    db.query(query, (err, results) => {
        if (err) {
            console.error('❌ خطا در دریافت تنظیمات:', err);
            return res.status(500).json({ error: 'خطا در دریافت اطلاعات: ' + err.message });
        }
        const settings = {};
        results.forEach(row => {
            settings[row.setting_key] = row.setting_value;
        });
        res.json(settings);
    });
});

// ===== ذخیره تنظیمات سایت (نسخه کامل) =====
app.put('/api/admin/settings', (req, res) => {
    const settings = req.body;
    
    const allowedKeys = [
        'hero_title', 'hero_subtitle', 'hero_text',
        'about_title', 'about_text', 'about_image',
        'footer_text', 'copyright_text',
        'stat_years', 'stat_projects', 'stat_privacy',
        'site_name', 'site_tagline', 'meta_description', 'meta_keywords',
        'phone', 'phone2', 'email', 'email2', 'address', 'working_hours',
        'whatsapp', 'telegram', 'linkedin', 'instagram', 'eitaa', 'bale',
        'color_primary', 'color_secondary', 'font',
        'analytics', 'header_codes', 'footer_codes'
    ];
    
    const queries = Object.keys(settings)
        .filter(key => allowedKeys.includes(key))
        .map(key => {
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
        .then(() => {
            res.json({ message: '✅ تنظیمات با موفقیت ذخیره شد!' });
        })
        .catch(err => {
            console.error('❌ خطا در ذخیره تنظیمات:', err);
            res.status(500).json({ error: 'خطا در ذخیره تنظیمات: ' + err.message });
        });
});

// ==================================================
// ===== شروع سرور =====
// ==================================================
app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 سرور در حال اجرا روی پورت ${port}`);
    console.log(`🌐 آدرس: http://localhost:${port}`);
});
