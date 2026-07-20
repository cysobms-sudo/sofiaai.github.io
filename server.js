const express = require('express');
const mysql = require('mysql2');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// ===== تابع تبدیل تاریخ میلادی به شمسی (دقیق) =====
function toPersianDate(gregorianDate) {
    const date = new Date(gregorianDate);
    
    // تنظیم منطقه زمانی ایران (UTC+3:30)
    const iranTime = new Date(date.getTime() + (3.5 * 60 * 60 * 1000));
    
    const year = iranTime.getFullYear();
    const month = iranTime.getMonth() + 1;
    const day = iranTime.getDate();
    const hours = String(iranTime.getHours()).padStart(2, '0');
    const minutes = String(iranTime.getMinutes()).padStart(2, '0');
    
    // محاسبه سال شمسی
    let persianYear = year - 621;
    let persianMonth = month + 2;
    let persianDay = day;
    
    // تنظیم ماه و روز
    if (persianMonth > 12) {
        persianMonth = persianMonth - 12;
        persianYear = persianYear + 1;
    }
    
    // تنظیم روزهای ماه (تقریبی)
    const persianDaysInMonth = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];
    if (persianDay > persianDaysInMonth[persianMonth - 1]) {
        persianDay = persianDay - persianDaysInMonth[persianMonth - 1];
        persianMonth = persianMonth + 1;
        if (persianMonth > 12) {
            persianMonth = 1;
            persianYear = persianYear + 1;
        }
    }
    
    return `${persianYear}/${String(persianMonth).padStart(2, '0')}/${String(persianDay).padStart(2, '0')} ${hours}:${minutes}`;
}

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

// ===== دریافت لیست کاربران با تاریخ شمسی =====
app.get('/api/users', (req, res) => {
    db.query('SELECT id, name, email, phone, created_at FROM users ORDER BY id DESC', (err, results) => {
        if (err) {
            console.error('❌ خطا در دریافت کاربران:', err);
            return res.status(500).json({ error: 'خطا در دریافت اطلاعات' });
        }
        
        // ===== تبدیل تاریخ میلادی به شمسی =====
        const usersWithPersianDate = results.map(user => {
            return {
                ...user,
                created_at: toPersianDate(user.created_at)
            };
        });
        
        res.json(usersWithPersianDate);
    });
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

// ===== شروع سرور =====
app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 سرور در حال اجرا روی پورت ${port}`);
    console.log(`🌐 آدرس: http://localhost:${port}`);
});
