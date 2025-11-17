// frontend/src/App.jsx
import React, { useState, useEffect } from 'react';
import {
  ShoppingCart, Search, X, ChevronDown, ChevronUp, Filter,
  ArrowLeft, Plus, Minus, Check
} from 'lucide-react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AdminPanel from './AdminPanel';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const CBCEcommerce = () => {
  const [grades, setGrades] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState('home');
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    grades: [], subjects: [], categories: [], priceRange: [0, 1500], sortBy: 'recent'
  });
  const [checkoutData, setCheckoutData] = useState({
    name: '', phone: '', location: '', deliveryOption: 'pickup'
  });
  const [orderSuccess, setOrderSuccess] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [g, s, c, p] = await Promise.all([
          fetch(`${API_URL}/api/grades`).then(r => r.json()),
          fetch(`${API_URL}/api/subjects`).then(r => r.json()),
          fetch(`${API_URL}/api/categories`).then(r => r.json()),
          fetch(`${API_URL}/api/products`).then(r => r.json())
        ]);
        setGrades(g);
        setSubjects(s);
        setCategories(c);
        setProducts(p);
      } catch (err) {
        console.error('Failed to load data:', err);
        alert('Backend not running? Check http://localhost:5000');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredProducts = products
    .filter(p => {
      const matchSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchGrade = filters.grades.length === 0 || filters.grades.includes(p.grade_id);
      const matchSubject = filters.subjects.length === 0 || filters.subjects.includes(p.subject_id);
      const matchCategory = filters.categories.length === 0 || filters.categories.includes(p.category_id);
      const matchPrice = p.price >= filters.priceRange[0] && p.price <= filters.priceRange[1];
      return matchSearch && matchGrade && matchSubject && matchCategory && matchPrice;
    })
    .sort((a, b) => {
      if (filters.sortBy === 'price_low') return a.price - b.price;
      if (filters.sortBy === 'price_high') return b.price - a.price;
      return b.id - a.id;
    });

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (id, delta) => {
    setCart(prev => prev
      .map(item => item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item)
      .filter(item => item.quantity > 0)
    );
  };

  const cartTotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  const handleCheckout = async () => {
    if (!checkoutData.name || !checkoutData.phone) return alert('Please fill name and phone');
    try {
      const res = await fetch(`${API_URL}/api/checkout/mpesa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: checkoutData.phone,
          amount: cartTotal + (checkoutData.deliveryOption === 'delivery' ? 200 : 0),
          items: cart.map(i => ({ product_id: i.id, quantity: i.quantity, price: i.price })),
          customer_name: checkoutData.name,
          location: checkoutData.location,
          delivery_option: checkoutData.deliveryOption
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('STK Push sent! Check your phone.');
        setOrderSuccess(true);
        setCart([]);
        setCurrentPage('home');
      } else {
        alert('Payment failed: ' + (data.error || 'Try again'));
      }
    } catch {
      alert('Network error');
    }
  };

  const toggleFilter = (type, value) => {
    setFilters(prev => ({
      ...prev,
      [type]: prev[type].includes(value)
        ? prev[type].filter(v => v !== value)
        : [...prev[type], value]
    }));
  };

  const fetchProduct = async (id) => {
    try {
      const res = await fetch(`${API_URL}/api/products/${id}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSelectedProduct(data);
      setCurrentPage('details');
    } catch {
      alert('Product not found');
      setCurrentPage('home');
    }
  };

  const Header = () => (
    <header className="sticky top-0 z-40 bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-3">
          {currentPage !== 'home' && (
            <button onClick={() => setCurrentPage('home')} className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft size={20} />
            </button>
          )}
          <h1 className="text-xl font-bold text-blue-600">CBC Books</h1>
        </div>
        <button onClick={() => setShowCart(true)} className="relative p-2 hover:bg-gray-100 rounded-lg">
          <ShoppingCart size={24} />
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {cartCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );

  const ProductCard = ({ product }) => {
    const gradeName = grades.find(g => g.id === product.grade_id)?.name || '';
    const subjectName = subjects.find(s => s.id === product.subject_id)?.name || '';

    return (
      <div onClick={() => fetchProduct(product.id)} className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
        <div className="aspect-[3/4] bg-gray-100">
          <img src={product.image || "https://via.placeholder.com/300"} alt={product.title} className="w-full h-full object-cover" />
        </div>
        <div className="p-3">
          <div className="text-xs text-gray-500 mb-1">{gradeName} • {subjectName}</div>
          <h3 className="font-semibold text-sm mb-2 line-clamp-2">{product.title}</h3>
          <div className="flex justify-between items-center">
            <span className="text-lg font-bold text-blue-600">KSh {product.price}</span>
            <button onClick={(e) => { e.stopPropagation(); addToCart(product); }} className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
              <Plus size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const HomePage = () => (
    <div className="pb-20">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search for books..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-2xl focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-bold mb-4">Browse by Grade</h2>
          <div className="grid grid-cols-2 gap-3">
            {grades.map(grade => (
              <button
                key={grade.id}
                onClick={() => {
                  setFilters({ ...filters, grades: [grade.id] });
                  setCurrentPage('products');
                }}
                className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl shadow-md hover:shadow-lg transition-all"
              >
                <div className="font-bold text-lg">{grade.name}</div>
                <div className="text-sm opacity-90">View Books</div>
              </button>
            ))}
          </div>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Top Picks</h2>
            <button onClick={() => setCurrentPage('products')} className="text-blue-600 text-sm font-medium">View All</button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {products.slice(0, 4).map(product => <ProductCard key={product.id} product={product} />)}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Learning Supplies</h2>
            <button onClick={() => { setFilters({ ...filters, categories: [5] }); setCurrentPage('products'); }} className="text-blue-600 text-sm font-medium">View All</button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {products.filter(p => p.category_id === 5).slice(0, 4).map(product => <ProductCard key={product.id} product={product} />)}
          </div>
        </div>
      </div>
    </div>
  );

  const ProductsPage = () => (
    <div className="pb-20">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <button onClick={() => setShowFilters(!showFilters)} className="w-full mb-4 p-3 bg-white border-2 border-gray-200 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2"><Filter size={20} /><span className="font-medium">Filters</span></div>
          {showFilters ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>

        {showFilters && (
          <div className="mb-4 p-4 bg-white rounded-2xl shadow-md space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Grade</h3>
              <div className="flex flex-wrap gap-2">
                {grades.map(grade => (
                  <button key={grade.id} onClick={() => toggleFilter('grades', grade.id)} className={`px-3 py-1 rounded-full text-sm ${filters.grades.includes(grade.id) ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'}`}>
                    {grade.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Subject</h3>
              <div className="flex flex-wrap gap-2">
                {subjects.map(subject => (
                  <button key={subject.id} onClick={() => toggleFilter('subjects', subject.id)} className={`px-3 py-1 rounded-full text-sm ${filters.subjects.includes(subject.id) ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'}`}>
                    {subject.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Sort By</h3>
              <select value={filters.sortBy} onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })} className="w-full p-2 border rounded-lg">
                <option value="recent">Recently Added</option>
                <option value="price_low">Price: Low to High</option>
                <option value="price_high">Price: High to Low</option>
              </select>
            </div>
            <button onClick={() => setFilters({ grades: [], subjects: [], categories: [], priceRange: [0, 1500], sortBy: 'recent' })} className="w-full p-2 bg-gray-100 rounded-lg text-sm font-medium">
              Clear All Filters
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {filteredProducts.map(product => <ProductCard key={product.id} product={product} />)}
        </div>
        {filteredProducts.length === 0 && !loading && <div className="text-center py-12 text-gray-500">No products found. Try adjusting your filters.</div>}
      </div>
    </div>
  );

  const DetailsPage = () => {
    if (!selectedProduct) return null;
    const gradeName = grades.find(g => g.id === selectedProduct.grade_id)?.name || 'Unknown';
    const subjectName = subjects.find(s => s.id === selectedProduct.subject_id)?.name || 'Unknown';
    const categoryName = categories.find(c => c.id === selectedProduct.category_id)?.name || 'Unknown';

    return (
      <div className="pb-20">
        <div className="max-w-7xl mx-auto">
          <div className="aspect-square bg-gray-100">
            <img src={selectedProduct.image} alt={selectedProduct.title} className="w-full h-full object-cover" />
          </div>
          <div className="p-4">
            <div className="mb-4">
              <div className="text-sm text-gray-500 mb-2">{gradeName} • {subjectName}</div>
              <h1 className="text-2xl font-bold mb-2">{selectedProduct.title}</h1>
              <div className="text-3xl font-bold text-blue-600 mb-4">KSh {selectedProduct.price}</div>
            </div>
            <div className="mb-6 space-y-2 text-sm">
              <div><span className="font-semibold">Publisher:</span> {selectedProduct.publisher}</div>
              <div><span className="font-semibold">ISBN:</span> {selectedProduct.isbn}</div>
              <div><span className="font-semibold">Category:</span> {categoryName}</div>
              <div><span className="font-semibold">Stock:</span> {selectedProduct.stock} available</div>
            </div>
            <div className="mb-6">
              <h2 className="font-semibold mb-2">Description</h2>
              <p className="text-gray-600 text-sm">{selectedProduct.description}</p>
            </div>
            <button onClick={() => { addToCart(selectedProduct); setShowCart(true); }} className="w-full p-4 bg-blue-500 text-white rounded-2xl font-semibold hover:bg-blue-600">
              Add to Cart
            </button>
          </div>
        </div>
      </div>
    );
  };

  const CartModal = () => (
    <div className={`fixed inset-0 z-50 transition-all duration-300 ${showCart ? 'visible' : 'invisible'}`}>
      <div className={`absolute inset-0 bg-black transition-opacity duration-300 ${showCart ? 'opacity-50' : 'opacity-0'}`} onClick={() => setShowCart(false)} />
      <div className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl transition-transform duration-300 ${showCart ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Your Cart ({cartCount})</h2>
            <button onClick={() => setShowCart(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={24} /></button>
          </div>
          <div className="max-h-[50vh] overflow-y-auto mb-4 space-y-3">
            {cart.map(item => (
              <div key={item.id} className="flex gap-3 p-3 bg-gray-50 rounded-xl">
                <img src={item.image} alt={item.title} className="w-16 h-20 object-cover rounded-lg" />
                <div className="flex-1">
                  <h3 className="font-semibold text-sm mb-1">{item.title}</h3>
                  <div className="text-sm text-gray-600 mb-2">KSh {item.price}</div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQuantity(item.id, -1)} className="p-1 bg-white border rounded-lg"><Minus size={16} /></button>
                    <span className="w-8 text-center font-medium">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)} className="p-1 bg-white border rounded-lg"><Plus size={16} /></button>
                  </div>
                </div>
                <div className="text-right font-bold">KSh {item.price * item.quantity}</div>
              </div>
            ))}
          </div>
          {cart.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Your cart is empty</div>
          ) : (
            <div className="border-t pt-4">
              <div className="flex justify-between text-lg font-bold mb-4">
                <span>Total</span>
                <span className="text-blue-600">KSh {cartTotal}</span>
              </div>
              <button onClick={() => { setShowCart(false); setCurrentPage('checkout'); }} className="w-full p-4 bg-blue-500 text-white rounded-2xl font-semibold hover:bg-blue-600">
                Checkout with M-Pesa
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const CheckoutPage = () => (
    <div className="max-w-xl mx-auto px-4 py-6 pb-20">
      <h2 className="text-2xl font-bold mb-6">Checkout</h2>
      <div className="bg-white rounded-2xl shadow-md p-4 mb-4">
        <h3 className="font-semibold mb-3">Order Summary</h3>
        {cart.map(item => (
          <div key={item.id} className="flex justify-between text-sm mb-2">
            <span>{item.title} x{item.quantity}</span>
            <span>KSh {item.price * item.quantity}</span>
          </div>
        ))}
        <div className="border-t mt-3 pt-3 flex justify-between font-bold">
          <span>Total</span>
          <span className="text-blue-600">KSh {cartTotal}</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-md p-4 mb-4 space-y-4">
        <input placeholder="Full Name *" value={checkoutData.name} onChange={e => setCheckoutData({ ...checkoutData, name: e.target.value })} className="w-full p-3 border rounded-xl" />
        <input placeholder="Phone Number (M-Pesa) *" value={checkoutData.phone} onChange={e => setCheckoutData({ ...checkoutData, phone: e.target.value })} className="w-full p-3 border rounded-xl" />
        <input placeholder="Location *" value={checkoutData.location} onChange={e => setCheckoutData({ ...checkoutData, location: e.target.value })} className="w-full p-3 border rounded-xl" />
        <select value={checkoutData.deliveryOption} onChange={e => setCheckoutData({ ...checkoutData, deliveryOption: e.target.value })} className="w-full p-3 border rounded-xl">
          <option value="pickup">Pickup (Free)</option>
          <option value="delivery">Home Delivery (+KSh 200)</option>
        </select>
      </div>

      <button onClick={handleCheckout} className="w-full p-4 bg-green-600 text-white rounded-2xl font-semibold hover:bg-green-700 flex items-center justify-center gap-2">
        <Check size={20} /> Complete Payment (KSh {cartTotal + (checkoutData.deliveryOption === 'delivery' ? 200 : 0)})
      </button>
    </div>
  );

  const SuccessPage = () => (
    <div className="max-w-xl mx-auto px-4 py-12 text-center">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Check size={40} className="text-green-600" />
      </div>
      <h2 className="text-2xl font-bold mb-2">Order Successful!</h2>
      <p className="text-gray-600 mb-8">STK Push sent to your phone</p>
      <button onClick={() => { setOrderSuccess(false); setCheckoutData({ name: '', phone: '', location: '', deliveryOption: 'pickup' }); setCurrentPage('home'); }} className="w-full p-4 bg-blue-500 text-white rounded-2xl font-semibold hover:bg-blue-600">
        Continue Shopping
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {loading ? (
        <div className="flex items-center justify-center h-screen text-xl">Loading CBC Books...</div>
      ) : (
        <>
          <Header />
          {orderSuccess ? <SuccessPage /> : (
            <>
              {currentPage === 'home' && <HomePage />}
              {currentPage === 'products' && <ProductsPage />}
              {currentPage === 'details' && selectedProduct && <DetailsPage />}
              {currentPage === 'checkout' && <CheckoutPage />}
            </>
          )}
          <CartModal />
          {!showCart && cartCount > 0 && currentPage !== 'checkout' && (
            <button onClick={() => setShowCart(true)} className="fixed bottom-6 right-6 bg-blue-500 text-white p-4 rounded-full shadow-lg z-30">
              <ShoppingCart size={24} />
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {cartCount}
              </span>
            </button>
          )}
        </>
      )}
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CBCEcommerce />} />
        <Route path="/admin" element={<AdminPanel />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;