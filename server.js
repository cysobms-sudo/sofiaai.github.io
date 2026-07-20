const express = require('express');
const mysql = require('mysql2');
const path = require('path');
const bcrypt = require('bcryptjs');
const moment = require('moment-jalaali');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// ===== تنظیمات CORS برای جلوگیری از خطای اتصال =====
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

// ===== صفحات =====
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

// ===== حذف کاربر (فقط مدیر) =====
app.delete('/api/users/:id', (req, res) => {
    const userId = req.params.id;
    
    // بررسی اینکه کاربر وجود دارد
    db.query('SELECT * FROM users WHERE id = ?', [userId], (err, results) => {
        if (err) {
            console.error('❌ خطا در بررسی کاربر:', err);
            return res.status(500).json({ error: 'خطا در دیتابیس' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'کاربر پیدا نشد.' });
        }
        
        // حذف کاربر
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
        // دریافت کاربر از دیتابیس
        db.query('SELECT * FROM users WHERE id = ?', [userId], async (err, results) => {
            if (err) {
                console.error('❌ خطا در بررسی کاربر:', err);
                return res.status(500).json({ error: 'خطا در دیتابیس' });
            }
            if (results.length === 0) {
                return res.status(404).json({ error: 'کاربر پیدا نشد.' });
            }
            
            const user = results[0];
            
            // بررسی رمز فعلی
            const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
            if (!isPasswordValid) {
                return res.status(400).json({ error: 'رمز فعلی اشتباه است.' });
            }
            
            // هش کردن رمز جدید
            const hashedNewPassword = await bcrypt.hash(newPassword, 10);
            
            // به‌روزرسانی رمز در دیتابیس
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

// ===== ورود کاربر =====
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
            
            res.json({ 
                message: '✅ ورود با موفقیت انجام شد!',
                user: { 
                    id: user.id, 
                    name: user.name, 
                    email: user.email, 
                    phone: user.phone, 
                    created_at: user.created_at 
                }
            });
        });
    } catch (error) {
        console.error('❌ خطا در ورود:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
});

// ===== شروع سرور =====
app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 سرور در حال اجرا روی پورت ${port}`);
    console.log(`🌐 آدرس: http://localhost:${port}`);
});
