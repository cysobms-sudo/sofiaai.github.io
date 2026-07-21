const express = require('express');
const mysql = require('mysql2');
const path = require('path');
const bcrypt = require('bcryptjs');
const moment = require('moment-jalaali');
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
        // تبدیل تاریخ به شمسی
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
        SELECT cart.id, cart.user_id, cart.item_name, cart.item_price, cart.created_at, users.name as user_name, users.email as user_email
        FROM cart
        JOIN users ON cart.user_id = users.id
        ORDER BY cart.created_at DESC
    `;
    db.query(query, (err, results) => {
        if (err) {
            console.error('❌ خطا در دریافت سبد خرید همه کاربران:', err);
            return res.status(500).json({ error: 'خطا در دریافت اطلاعات' });
        }
        // ===== تبدیل تاریخ به شمسی و ساعت ایران =====
        const itemsWithPersianDate = results.map(item => {
            // تنظیم منطقه زمانی ایران (UTC+3:30)
            const persianDate = moment(item.created_at).tz('Asia/Tehran').format('jYYYY/jMM/jDD HH:mm');
            return { ...item, created_at: persianDate };
        });
        res.json(itemsWithPersianDate);
    });
});

// ==================================================
// ===== شروع سرور =====
// ==================================================
app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 سرور در حال اجرا روی پورت ${port}`);
    console.log(`🌐 آدرس: http://localhost:${port}`);
});
