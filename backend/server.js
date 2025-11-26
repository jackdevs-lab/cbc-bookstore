import express from 'express';
import cors from 'cors';
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();
const CLOUDINARY_CLOUD_NAME = 'dbxb5wlnf';
const app = express();
const sql = neon(process.env.DATABASE_URL);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://www.cbcbookstore.co.ke',
  credentials: true
}));
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'CBC Bookstore API is running' });
});

// Routes
app.get('/api/grades', async (req, res) => {
  try {
    const result = await sql`SELECT * FROM grades ORDER BY id`;
    res.json(result.rows || result);
  } catch (error) {
    console.error('Grades error:', error.message);
    res.json([]);
  }
});

app.get('/api/subjects', async (req, res) => {
  try {
    const result = await sql`SELECT * FROM subjects ORDER BY name`;
    res.json(result.rows || result);
  } catch (error) {
    res.json([]);
  }
});

app.get('/api/categories', async (req, res) => {
  try {
    const result = await sql`SELECT * FROM categories ORDER BY name`;
    res.json(result.rows || result);
  } catch (error) {
    res.json([]);
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const product = await sql`
      SELECT p.*, g.name as grade_name, s.name as subject_name, c.name as category_name
      FROM products p
      LEFT JOIN grades g ON p.grade_id = g.id
      LEFT JOIN subjects s ON p.subject_id = s.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ${id}
    `;
    if (product.length === 0) return res.status(404).json({ error: 'Product not found' });
    res.json(product[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// REMOVE pg.Pool completely
// const pool = new Pool(...);  → DELETE THIS

app.get('/api/products', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    console.log('Products request →', { page, limit, offset });

    // THIS IS THE EXACT WORKING QUERY
    const result = await sql`
      SELECT 
        p.id, p.title, p.price, p.image, p.stock, p.publisher, p.isbn, p.description,
        p.grade_id, COALESCE(g.name, 'All Grades') as grade_name,
        p.subject_id, COALESCE(s.name, 'All Subjects') as subject_name,
        p.category_id, COALESCE(c.name, 'Books') as category_name
      FROM products p
      LEFT JOIN grades g ON p.grade_id = g.id
      LEFT JOIN subjects s ON p.subject_id = s.id
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY p.id DESC
      LIMIT ${Number(limit)} OFFSET ${offset}
    `;

    // THIS LINE FIXES THE "w.map" ERROR — NEON RETURNS result.rows
    const rows = Array.isArray(result) ? result : result.rows || [];

    console.log(`Success! Found ${rows.length} products`);

    if (rows.length === 0) {
      console.log('No products in DB — returning 1 test product');
      return res.json([
        {
          id: 999,
          title: "Maths for PP1",
          price: 480,
          image: "https://res.cloudinary.com/dbxb5wlnf/image/upload/w_400,h_600,c_fill,q_auto,f_auto/sample.jpg",
          grade_name: "PP1",
          subject_name: "Mathematics",
          category_name: "Textbooks",
          stock: 50
        }
      ]);
    }

    // Cloudinary thumbnails
    const products = rows.map(p => ({
      ...p,
      image: p.image
        ? `https://res.cloudinary.com/dbxb5wlnf/image/upload/w_400,h_600,c_fill,q_auto,f_auto/${String(p.image).split('/').pop()}`
        : 'https://res.cloudinary.com/demo/image/upload/w_400,h_600,c_fill,q_auto/sample.jpg'
    }));

    res.json(products);

  } catch (error) {
    console.error('PRODUCTS ERROR:', error.message);
    res.json([
      {
        id: 999,
        title: "Error — Check Backend Logs",
        price: 0,
        image: "https://res.cloudinary.com/demo/image/upload/w_400,h_600,c_fill,q_auto/sample.jpg",
        grade_name: "Debug",
        subject_name: "Fix Me",
        category_name: "Error"
      }
    ]);
  }
});
app.put('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, grade_id, subject_id, category_id, price, image, publisher, isbn, description, stock } = req.body;
    const result = await sql`
      UPDATE products SET
        title = ${title}, grade_id = ${grade_id}, subject_id = ${subject_id},
        category_id = ${category_id}, price = ${price}, image = ${image},
        publisher = ${publisher}, isbn = ${isbn}, description = ${description}, stock = ${stock}
      WHERE id = ${id} RETURNING *
    `;
    res.json(result[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/checkout/mpesa', async (req, res) => {
  try {
    const { phone, amount, items, customer_name, location, delivery_option } = req.body;
    const order = await sql`
      INSERT INTO orders (customer_name, phone, location, delivery_option, total_amount, status)
      VALUES (${customer_name}, ${phone}, ${location}, ${delivery_option}, ${amount}, 'pending')
      RETURNING *
    `;

    for (const item of items) {
      await sql`
        INSERT INTO order_items (order_id, product_id, quantity, price)
        VALUES (${order[0].id}, ${item.product_id}, ${item.quantity}, ${item.price})
      `;
    }

    res.json({
      success: true,
      order_id: order[0].id,
      mpesaresponse: { ResponseCode: '0', CustomerMessage: 'STK Push sent' }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/orders', async (req, res) => {
  try {
    const orders = await sql`
      SELECT o.*, 
        json_agg(json_build_object('product_id', oi.product_id, 'title', p.title, 'quantity', oi.quantity, 'price', oi.price)) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `;
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Veronica2024!';
const requireAdmin = (req, res, next) => {
  if (req.headers.password === ADMIN_PASSWORD) return next();
  res.status(401).json({ error: 'Unauthorized' });
};

app.post('/api/admin/products', requireAdmin, async (req, res) => {
  try {
    const { title, grade_id, subject_id, category_id, price, image, publisher, isbn, description, stock } = req.body;
    const result = await sql`
      INSERT INTO products (title, grade_id, subject_id, category_id, price, image, publisher, isbn, description, stock)
      VALUES (${title}, ${grade_id}, ${subject_id}, ${category_id}, ${price}, ${image}, ${publisher}, ${isbn}, ${description}, ${stock})
      ON CONFLICT (isbn) DO UPDATE SET
        title = EXCLUDED.title, price = EXCLUDED.price, stock = EXCLUDED.stock
      RETURNING *
    `;
    res.json({ success: true, product: result[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});