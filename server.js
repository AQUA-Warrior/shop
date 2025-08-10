require('dotenv').config();
const express = require('express');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const axios = require('axios');
const https = require('https');

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

const PRINTIFY_TOKEN = process.env.PRINTIFY_TOKEN || 'your_printify_token_here';
const PRINTIFY_SHOP_ID = process.env.PRINTIFY_SHOP_ID || 'your_printify_shop_id_here';

app.get('/api/items', async (req, res) => {
  try {
    const resp = await axios.get(
      `https://api.printify.com/v1/shops/${PRINTIFY_SHOP_ID}/products.json`,
      { headers: { Authorization: `Bearer ${PRINTIFY_TOKEN}` } }
    );
    const products = Array.isArray(resp.data?.data) ? resp.data.data : [];
    const items = products.map(p => {
      let price = p.variants[0]?.price || 0;
      if (typeof price === 'number' && price > 1000) price = price / 100;
      let image = '';
      if (Array.isArray(p.images) && p.images.length > 0) {
        image = p.images[0].src || '';
      }
      return {
        _id: p.id,
        name: p.title,
        price,
        category: p.tags?.[0] || '',
        createdAt: p.created_at,
        variant_id: p.variants[0]?.id || undefined,
        description: p.description || '',
        image
      };
    });
    res.json(items);
  } catch (err) {
    console.error('Printify API error:', err?.response?.data || err);
    res.status(500).json({ error: 'Failed to fetch products from Printify', details: err?.response?.data || err.message });
  }
});

app.post('/api/checkout', async (req, res) => {
  try {
    const { items } = req.body;
    const orderItems = items.map(item => ({
      product_id: item._id,
      quantity: item.quantity,
      variant_id: item.variant_id || undefined
    }));
    const orderPayload = {
      shop_id: PRINTIFY_SHOP_ID,
      line_items: orderItems,
    };
    await axios.post(
      `https://api.printify.com/v1/orders.json`,
      orderPayload,
      { headers: { Authorization: `Bearer ${PRINTIFY_TOKEN}` } }
    );
    res.json({ url: `/success.html` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create Printify order' });
  }
});

app.get('/api/proxy-image', (req, res) => {
  const imageUrl = req.query.url;
  if (!imageUrl || !/^https:\/\/images-api\.printify\.com\//.test(imageUrl)) {
    return res.status(400).send('Invalid image URL');
  }
  https.get(imageUrl, (imgRes) => {
    if (imgRes.statusCode !== 200) {
      res.status(imgRes.statusCode).end();
      return;
    }
    res.setHeader('Content-Type', imgRes.headers['content-type'] || 'image/jpeg');
    imgRes.pipe(res);
  }).on('error', () => {
    res.status(500).end();
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port http://localhost:${PORT}`));
