import express from 'express';
import cors from 'cors';
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const sql = neon(process.env.DATABASE_URL);

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'CBC Bookstore API is running' });
});

// Get all grades
app.get('/api/grades', async (req, res) => {
  try {
    const grades = await sql`SELECT * FROM grades ORDER BY id`;
    res.json(grades);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all subjects
app.get('/api/subjects', async (req, res) => {
  try {
    const subjects = await sql`SELECT * FROM subjects ORDER BY name`;
    res.json(subjects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all categories
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await sql`SELECT * FROM categories ORDER BY name`;
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single product
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
    
    if (product.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(product[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/products - FIXED + DEBUG
// GET /api/products - FULLY WORKING with Neon v0.7+
// GET /api/products - 100% WORKING with Neon v0.7+
// GET /api/products - 100% WORKING with Neon v0.7+
app.get('/api/products', async (req, res) => {
  console.log('=== /api/products HIT ===');
  console.log('Query params:', req.query);

  try {
    const { grade_ids, subject_ids, category_ids, min_price, max_price, sort, search } = req.query;

    let query = `
      SELECT p.*, g.name as grade_name, s.name as subject_name, c.name as category_name
      FROM products p
      LEFT JOIN grades g ON p.grade_id = g.id
      LEFT JOIN subjects s ON p.subject_id = s.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `;

    const values = [];

    if (grade_ids) {
      const ids = grade_ids.split(',').map(Number).filter(Boolean);
      if (ids.length) {
        query += ` AND p.grade_id = ANY($${values.length + 1})`;
        values.push(ids);
      }
    }
    if (subject_ids) {
      const ids = subject_ids.split(',').map(Number).filter(Boolean);
      if (ids.length) {
        query += ` AND p.subject_id = ANY($${values.length + 1})`;
        values.push(ids);
      }
    }
    if (category_ids) {
      const ids = category_ids.split(',').map(Number).filter(Boolean);
      if (ids.length) {
        query += ` AND p.category_id = ANY($${values.length + 1})`;
        values.push(ids);
      }
    }
    if (min_price) {
      query += ` AND p.price >= $${values.length + 1}`;
      values.push(Number(min_price));
    }
    if (max_price) {
      query += ` AND p.price <= $${values.length + 1}`;
      values.push(Number(max_price));
    }
    if (search) {
      query += ` AND (p.title ILIKE $${values.length + 1} OR p.description ILIKE $${values.length + 1})`;
      values.push(`%${search}%`);
    }

    if (sort === 'price_low') query += ' ORDER BY p.price ASC';
    else if (sort === 'price_high') query += ' ORDER BY p.price DESC';
    else query += ' ORDER BY p.id DESC';

    console.log('Final SQL:', query);
    console.log('Values:', values);

    // CORRECT: Use sql.query()
    const result = await sql.query(query, values);

    console.log('Query success! Products count:', result.length);
    res.json(result);
  } catch (error) {
    console.error('FATAL ERROR in /api/products:', error);
    res.status(500).json({ error: error.message });
  }
});
// Update product (Admin)
app.put('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, grade_id, subject_id, category_id, price, image, publisher, isbn, description, stock } = req.body;
    
    const result = await sql`
      UPDATE products
      SET title = ${title}, grade_id = ${grade_id}, subject_id = ${subject_id}, 
          category_id = ${category_id}, price = ${price}, image = ${image},
          publisher = ${publisher}, isbn = ${isbn}, description = ${description}, stock = ${stock}
      WHERE id = ${id}
      RETURNING *
    `;
    
    res.json(result[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// MPesa STK Push
app.post('/api/checkout/mpesa', async (req, res) => {
  try {
    const { phone, amount, items, customer_name, location, delivery_option } = req.body;
    
    // Simulate STK Push (integrate Daraja API in production)
    const mockResponse = {
      MerchantRequestID: `MR${Date.now()}`,
      CheckoutRequestID: `CR${Date.now()}`,
      ResponseCode: '0',
      ResponseDescription: 'Success. Request accepted for processing',
      CustomerMessage: 'Success. Request accepted for processing'
    };
    
    // Create order in database
    const order = await sql`
      INSERT INTO orders (customer_name, phone, location, delivery_option, total_amount, status)
      VALUES (${customer_name}, ${phone}, ${location}, ${delivery_option}, ${amount}, 'pending')
      RETURNING *
    `;
    
    // Insert order items
    for (const item of items) {
      await sql`
        INSERT INTO order_items (order_id, product_id, quantity, price)
        VALUES (${order[0].id}, ${item.product_id}, ${item.quantity}, ${item.price})
      `;
    }
    
    res.json({
      success: true,
      order_id: order[0].id,
      mpesa_response: mockResponse
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get orders (Admin)
app.get('/api/orders', async (req, res) => {
  try {
    const orders = await sql`
      SELECT o.*, 
        json_agg(json_build_object(
          'product_id', oi.product_id,
          'title', p.title,
          'quantity', oi.quantity,
          'price', oi.price
        )) as items
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
// === ADMIN PANEL - SECURE PRODUCT UPLOAD ===
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Veronica2024!'; // Change in .env

// Middleware to check password
const requireAdmin = (req, res, next) => {
  const { password } = req.headers;
  if (password === ADMIN_PASSWORD) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized: Invalid password" });
};

// Secure: Create product
app.post('/api/admin/products', requireAdmin, async (req, res) => {
  try {
    const { title, grade_id, subject_id, category_id, price, image, publisher, isbn, description, stock } = req.body;

    const result = await sql`
      INSERT INTO products (title, grade_id, subject_id, category_id, price, image, publisher, isbn, description, stock)
      VALUES (${title}, ${grade_id}, ${subject_id}, ${category_id}, ${price}, ${image}, ${publisher}, ${isbn}, ${description}, ${stock})
      ON CONFLICT (isbn) DO UPDATE SET
        title = EXCLUDED.title,
        price = EXCLUDED.price,
        stock = EXCLUDED.stock
      RETURNING *
    `;

    res.json({ success: true, product: result[0] });
  } catch (error) {
    console.error("Admin product insert error:", error);
    res.status(500).json({ error: error.message });
  }
});
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});