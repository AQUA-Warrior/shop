require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult, sanitizeBody } = require('express-validator');
const validator = require('validator');

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

app.use((req, res, next) => {
  for (const key in req.query) {
    if (Array.isArray(req.query[key])) {
      return res.status(400).json({ error: 'Invalid query parameter' });
    }
  }
  next();
});


app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/index.html', (req, res) => {
  res.redirect(301, '/');
});

app.get('/admin.html', (req, res) => {
  res.redirect(301, '/admin');
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

mongoose.connect('mongodb://localhost:27017/shop', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    console.log('MongoDB connected');
    const Admin = require('./models/Admin');
    const testUser = 'user'; // remove later
    const testPass = 'pass';
    let admin = await Admin.findOne({ username: testUser });
    if (!admin) {
      await Admin.create({ username: testUser, password: testPass });
      console.log(`Test admin created: ${testUser} / ${testPass}`);
    } else {
      console.log(`Test admin exists: ${testUser}`);
    }
  })
  .catch(err => console.error('MongoDB connection error:', err));

const Item = require('./models/Item');
const Admin = require('./models/Admin');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);
  jwt.verify(token, process.env.JWT_SECRET || 'secret', (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  return validator.escape(str.trim());
}

function sanitizeItemInput(body) {
  return {
    name: sanitizeString(body.name),
    description: sanitizeString(body.description || ''),
    price: typeof body.price === 'number' ? body.price : parseFloat(body.price),
    category: sanitizeString(body.category || ''),
    image: validator.isURL(body.image || '', { require_protocol: true }) ? body.image : '',
    inStock: !!body.inStock,
    sold: typeof body.sold === 'number' ? body.sold : 0,
    createdAt: body.createdAt ? new Date(body.createdAt) : new Date(),
    isNew: !!body.isNew,
    onSale: !!body.onSale
  };
}

app.get('/api/items', async (req, res) => {
  const items = await Item.find({}, '-__v -rating');
  res.json(items);
});

app.post(
  '/api/admin/items',
  authenticateToken,
  [
    body('name').isString().isLength({ min: 1, max: 100 }).trim().escape(),
    body('description').optional().isString().isLength({ max: 1000 }).trim().escape(),
    body('price').isFloat({ min: 0, max: 100000 }),
    body('category').optional().isString().isLength({ max: 100 }).trim().escape(),
    body('image').optional({ checkFalsy: true }).isURL({ require_protocol: true }),
    body('inStock').optional().isBoolean(),
    body('isNew').optional().isBoolean(),
    body('onSale').optional().isBoolean()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid input', details: errors.array() });
    const itemData = sanitizeItemInput(req.body);
    const item = new Item(itemData);
    await item.save();
    res.json(item);
  }
);

app.put(
  '/api/admin/items/:id',
  authenticateToken,
  [
    body('name').optional().isString().isLength({ min: 1, max: 100 }).trim().escape(),
    body('description').optional().isString().isLength({ max: 1000 }).trim().escape(),
    body('price').optional().isFloat({ min: 0, max: 100000 }),
    body('category').optional().isString().isLength({ max: 100 }).trim().escape(),
    body('image').optional({ checkFalsy: true }).isURL({ require_protocol: true }),
    body('inStock').optional().isBoolean(),
    body('isNew').optional().isBoolean(),
    body('onSale').optional().isBoolean()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid input', details: errors.array() });
    const itemData = sanitizeItemInput(req.body);
    const item = await Item.findByIdAndUpdate(
      req.params.id,
      { ...itemData },
      { new: true }
    );
    res.json(item);
  }
);

app.delete('/api/admin/items/:id', authenticateToken, async (req, res) => {
  if (!validator.isMongoId(req.params.id)) return res.status(400).json({ error: 'Invalid ID' });
  await Item.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

app.post(
  '/api/admin/login',
  [
    body('username').isString().isLength({ min: 1, max: 100 }).trim().escape(),
    body('password').isString().isLength({ min: 1, max: 100 }).trim()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid input', details: errors.array() });
    const { username, password } = req.body;
    const admin = await Admin.findOne({ username });
    if (!admin || !(await admin.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ username: admin.username }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });
    res.json({ token });
  }
);

app.post('/api/checkout', [
  body('items').isArray({ min: 1, max: 50 }),
  body('items.*.name').isString().isLength({ min: 1, max: 100 }).trim().escape(),
  body('items.*.price').isFloat({ min: 0, max: 100000 }),
  body('items.*.quantity').isInt({ min: 1, max: 100 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid input', details: errors.array() });
  const { items } = req.body;
  const line_items = items.map(item => ({
    price_data: {
      currency: 'usd',
      product_data: { name: sanitizeString(item.name) },
      unit_amount: Math.round(item.price * 100),
    },
    quantity: item.quantity,
  }));
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items,
    mode: 'payment',
    success_url: 'http://localhost:3000/success.html',
    cancel_url: 'http://localhost:3000/cancel.html',
  });
  res.json({ url: session.url });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port http://localhost:${PORT}`));
