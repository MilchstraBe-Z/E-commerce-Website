const express = require('express');
const { body, validationResult } = require('express-validator');
const app = express();
const path = require('path');
const bodyParser = require('body-parser');
const mysql = require('mysql'); 
const bcrypt = require('bcrypt'); 
const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const authRoutes = require('./routes/authRoutes');
const cookieParser = require('cookie-parser');
const csrf = require('csurf');
const xss = require('xss');
const session = require('express-session');
const multer = require('multer');  
const crypto = require("crypto");
const qs = require('querystring');
const https = require('https');

const db = mysql.createPool({
    host: 'localhost',
    user: 'root', 
    password: 'cNuE]WW>3Sd`A~hW',
    database: 'shopping_site'
});

app.set('trust proxy', 1);
app.use(cookieParser());
// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
    secret: '4uw5Yf}qXnA=&CK}',
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',  
        maxAge: 24 * 60 * 60 * 1000  
    }
}));

// CSRF Middleware
const csrfProtection = csrf({ cookie: true });
app.use(csrfProtection);

app.use((req, res, next) => {
    const token = req.csrfToken();
    res.cookie('XSRF-TOKEN', token);
    res.locals.csrfToken = token;
    next();
  });

app.use((req, res, next) => {
    if (!req.session.cart) {
        req.session.cart = [];
    }
    res.locals.user = req.session.user || null;
    next();
});

app.use(authRoutes);

app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use((req, res, next) => {
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' https://code.jquery.com; style-src 'self'; img-src 'self';");
    next();
});


////// Main Routes ///////

app.get('/', (req, res) => {
  db.query('SELECT * FROM categories', (err, categories) => {
      if (err) {
          console.error(err);
          return res.status(500).send('Error fetching categories');
      }

      const catid = req.query.catid;
      const categoryQuery = catid ? `WHERE catid = ${mysql.escape(catid)}` : '';

      db.query(`SELECT * FROM products ${categoryQuery}`, (err, products) => {
          if (err) {
              console.error(err);
              return res.status(500).send('Error fetching products');
          }

          if (catid) {
              db.query('SELECT * FROM categories WHERE catid = ?', [catid], (err, catResult) => {
                  const selectedCategory = catResult && catResult[0] ? catResult[0] : null;
                  res.render('index', {
                      categories,
                      products,
                      selectedCategory,
                      user: req.session.user
                  });
              });
          } else {
              res.render('index', {
                  categories,
                  products,
                  selectedCategory: null,
                  user: req.session.user
              });
          }
      });
  });
});

app.get('/product/:pid', (req, res) => {
  const productId = req.params.pid;
  db.query('SELECT * FROM products WHERE pid = ?', [productId], (err, result) => {
      if (err) {
          console.error(err);
          return res.status(500).send('Error fetching product');
      }
      if (result.length > 0) {
          const product = result[0];
          product.name = xss(product.name);
          product.description = xss(product.description);

          db.query('SELECT * FROM categories WHERE catid = ?', [product.catid], (err, catResult) => {
              const selectedCategory = catResult && catResult[0] ? catResult[0] : null;
              res.render('product', {
                  product,
                  selectedProduct: product,
                  selectedCategory,
                  user: req.session.user
              });
          });
      } else {
          res.status(404).send('Product not found');
      }
  });
});

app.get('/api/categories/:catid', (req, res) => {
  const catid = req.params.catid;
  db.query('SELECT * FROM categories WHERE catid = ?', [catid], (err, result) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (result.length === 0) return res.status(404).json({ error: 'Category not found' });
    res.json(result[0]);
  });
});

app.get('/cart', csrfProtection, (req, res) => {
    const token = req.csrfToken();
    const cart = req.session.cart || [];
    const count = cart.reduce((t, i) => t + i.quantity, 0);
    const user = req.session.user || null;
    res.render('cart', { cart, cartItemCount: count, user, csrfToken: token });
  });
  
  


app.get('/api/check-auth', (req, res) => {
    if (req.session.user) {
        res.json({ isAuthenticated: true });
    } else {
        res.json({ isAuthenticated: false });
    }
});

app.get('/user-portal', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
  
    const email = req.session.user.email;
  
    db.query(
      'SELECT * FROM orders WHERE username = ? ORDER BY created_at DESC LIMIT 5',
      [email],
      (err, orders) => {
        if (err) return res.status(500).send('DB error');
  
        const ids = orders.map(o => o.order_id);
        if (ids.length === 0) {
          return res.render('user-portal', {
            user: req.session.user,
            orders: [],
            txMap: {}
          });
        }
  
        db.query('SELECT * FROM transactions WHERE order_id IN (?)', [ids], (err, txs) => {
          if (err) return res.status(500).send('DB error');
  
          const txMap = {};
          txs.forEach(tx => {
            if (!txMap[tx.order_id]) txMap[tx.order_id] = [];
            txMap[tx.order_id].push(tx);
          });
  
          orders.forEach(order => {
            try {
              order.paypalFields = JSON.parse(order.paypal_fields);
            } catch (e) {
            console.error('Failed to parse paypal_fields for order:', order.order_id, e);
              order.paypalFields = [];
            }
          });
  
          res.render('user-portal', {
            user: req.session.user,
            orders,
            txMap
          });
        });
      }
    );
  });  

/////////////////////// Admin page //////////////////////////

// Protect admin page
const authenticateAdmin = (req, res, next) => {
    if (!req.session.user || !req.session.user.admin) {
        return res.redirect('/login');
    }
    next();
};

app.get('/admin', authenticateAdmin, csrfProtection, (req, res) => {
    const token = req.csrfToken();
    db.query('SELECT * FROM categories', (err, categories) => {
      if (err) return res.status(500).send('Error fetching categories');
  
      db.query('SELECT * FROM products', (err, products) => {
        if (err) return res.status(500).send('Error fetching products');
  
        db.query('SELECT * FROM orders ORDER BY created_at DESC', (err, orders) => {
          if (err) return res.status(500).send('Error fetching orders');
  
          db.query('SELECT * FROM transactions', (err, transactions) => {
            if (err) return res.status(500).send('Error fetching transactions');
  
            const txMap = {};
            transactions.forEach(tx => {
              if (!txMap[tx.order_id]) txMap[tx.order_id] = [];
              txMap[tx.order_id].push(tx);
            });
  
            res.render('admin', {
              products,
              categories,
              orders,
              txMap,
              csrfToken: token,
              message: req.session.message || null
            });
          });
        });
      });
    });
  });
  
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../uploads/product_images')); 
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); 
    }
});
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, 
    fileFilter: (req, file, cb) => {
        const filetypes = /jpg|jpeg|png|gif/; 
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Error: Images only!'));
    }
});

app.post('/admin/add-product', authenticateAdmin, upload.single('image'), (req, res) => {
  const { name, description, catid } = req.body;
  let price = parseFloat(req.body.price);
  if (isNaN(price)) {
    return res.status(400).json({ success: false, message: 'Invalid price' });
  }
  price = parseFloat(price.toFixed(2));

  if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image uploaded' });
  }

  const imagePath = '/uploads/product_images/' + req.file.filename;

  db.query(
      'INSERT INTO products (name, description, price, catid, image) VALUES (?, ?, ?, ?, ?)',
      [ name, description, price, catid, imagePath ],
      (err, result) => {
          if (err) {
              console.error('DB error inserting product:', err);
              return res.status(500).json({ success: false, message: 'Error adding product' });
          }
          res.json({ success: true, message: 'Product added successfully!' });
      }
  );
});

app.post('/admin/add-category', (req, res) => {
    const { name } = req.body;

    if (!name) {
        return res.json({ success: false, message: 'Category name is required.' });
    }

    db.query('INSERT INTO categories (name) VALUES (?)', [name], (err, result) => {
        if (err) {
            console.error(err);
            return res.json({ success: false, message: 'Error adding category.' });
        }
        res.json({ success: true, message: 'Category added successfully!' });
    });
});

app.post('/admin/delete-product', (req, res) => {
    const productId = req.body.productId;

    db.query('DELETE FROM products WHERE pid = ?', [productId], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error deleting product');
        }
        res.redirect('/admin'); 
    });
});


///////////////////// PayPal /////////////////////////////

app.use('/api/create-order', (req, res, next) => {
    console.log("DEBUG: CSRF middleware reached");
    console.log("Cookie _csrf:", req.cookies._csrf);
    console.log("Header CSRF-Token:", req.headers['csrf-token']);
    console.log("req.csrfToken exists?", typeof req.csrfToken === 'function');
    next();
  });
  

app.post("/api/create-order", csrfProtection, (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.json({ success: false });
  }

  const pidList = items.map(i => i.pid);
  const qMap = Object.fromEntries(items.map(i => [i.pid, i.quantity]));

  db.query(`SELECT pid, name, price FROM products WHERE pid IN (?)`, [pidList], (err, products) => {
    if (err) return res.json({ success: false });

    const salt = crypto.randomBytes(8).toString("hex");
    const merchant = "sb-lvfsz41252110@business.example.com";
    const currency = "USD";

    let total = 0;
    const parts = [currency, merchant, salt];
    const paypalFields = [];

    products.forEach((p, i) => {
      const quantity = qMap[p.pid];
      const subtotal = p.price * quantity;
      total += subtotal;

      parts.push(p.pid, quantity);

      paypalFields.push({ name: `item_name_${i + 1}`, value: p.name });
      paypalFields.push({ name: `item_number_${i + 1}`, value: p.pid });
      paypalFields.push({ name: `quantity_${i + 1}`, value: quantity });
      paypalFields.push({ name: `amount_${i + 1}`, value: p.price });
    });

    const digest = crypto.createHash("sha256").update(parts.join("|")).digest("hex");
    const username = req.session.user ? req.session.user.email : "guest";
    const paypalFieldsJSON = JSON.stringify(paypalFields);

    db.query(
        `INSERT INTO orders (username, salt, digest, total, currency, merchant, paypal_fields)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [username, salt, digest, total, currency, merchant, paypalFieldsJSON],
        (err, result) => {
          if (err) return res.json({ success: false });
      
          const orderId = result.insertId;
          res.json({ success: true, orderId, digest, paypalFields });
        }
      );      
  });
});


app.post('/paypal/webhook', express.urlencoded({ extended: true }), (req, res) => {
  const rawBody = req.body;
  const postData = 'cmd=_notify-validate&' + qs.stringify(rawBody);

  const options = {
    hostname: 'ipnpb.paypal.com',
    path: '/cgi-bin/webscr',
    method: 'POST',
    headers: {
      'Content-Length': Buffer.byteLength(postData),
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  };

  const verificationReq = https.request(options, (paypalRes) => {
    let body = '';
    paypalRes.on('data', chunk => body += chunk);
    paypalRes.on('end', () => {
      if (body !== 'VERIFIED') return res.status(400).send('Invalid');

      const {
        custom,
        invoice,
        payment_status,
        currency_code,
        mc_gross,
        payer_email
      } = rawBody;

      if (payment_status !== 'Completed') return res.status(200).send('Ignored');

      db.query('SELECT * FROM orders WHERE order_id = ?', [invoice], (err, orders) => {
        if (err || orders.length === 0) return res.status(400).send('Order not found');

        const order = orders[0];
        if (order.verified) return res.status(200).send('Already processed');

        const parts = [order.currency, "sb-lvfsz41252110@business.example.com", order.salt];
        for (let i = 1; rawBody[`item_number_${i}`]; i++) {
          parts.push(rawBody[`item_number_${i}`], rawBody[`quantity_${i}`]);
        }
        const digest = require("crypto").createHash("sha256").update(parts.join("|")).digest("hex");

        if (digest !== order.digest) return res.status(400).send('Digest mismatch');

        db.query('UPDATE orders SET verified = 1, payer_email = ? WHERE order_id = ?', [payer_email, invoice]);

        const txInserts = [];
        for (let i = 1; rawBody[`item_number_${i}`]; i++) {
          txInserts.push([
            invoice,
            rawBody[`item_number_${i}`],
            rawBody[`quantity_${i}`],
            rawBody[`amount_${i}`]
          ]);
        }

        db.query('INSERT INTO transactions (order_id, pid, quantity, price) VALUES ?', [txInserts]);

        console.log("Verified IPN from PayPal:", rawBody);
        res.status(200).send('OK');
      });
    });
  });

  verificationReq.write(postData);
  verificationReq.end();
});

app.get('/thank-you', (req, res) => {
    res.send('<h2>Thank you for your purchase!</h2><a href="/">Back to shop</a>');
});  
  

app.use('/api', productRoutes);
app.use('/api', categoryRoutes);

app.disable('x-powered-by');

const PORT = 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log("Server is running on port 5000");
});

