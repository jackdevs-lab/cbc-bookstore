import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ShoppingCart, Search, X, ChevronDown, ChevronUp, Filter,
  ArrowLeft, Plus, Minus, Check, Package, MapPin, Phone
} from 'lucide-react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AdminPanel from './AdminPanel';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL || 'https://cbc-books-backend.onrender.com';

const CBCEcommerce = () => {
  const [grades, setGrades] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [categories, setCategories] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const [currentPage, setCurrentPage] = useState('home');
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  const [filters, setFilters] = useState({
    grades: [],
    subjects: [],
    categories: [],
    sortBy: 'recent'
  });

  const [checkoutData, setCheckoutData] = useState({
    name: '', phone: '', location: '', deliveryOption: 'pickup'
  });

  const pageRef = useRef(1);
  const observer = useRef();

  useEffect(() => {
    const fetchStaticData = async () => {
      try {
        const [g, s, c] = await Promise.all([
          fetch(`${API_URL}/api/grades`).then(r => r.json()),
          fetch(`${API_URL}/api/subjects`).then(r => r.json()),
          fetch(`${API_URL}/api/categories`).then(r => r.json())
        ]);
        setGrades(g || []);
        setSubjects(s || []);
        setCategories(c || []);
      } catch (err) {
        console.error('Failed to load static data');
      }
    };
    fetchStaticData();
  }, []);

  const loadAllProducts = async () => {
    try {
      const res = await fetch(`${API_URL}/api/products?limit=200`);
      const data = await res.json();
      setAllProducts(data);
      setFilteredProducts(data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllProducts();
  }, []);

  useEffect(() => {
    let filtered = allProducts;

    if (filters.grades.length > 0) {
      filtered = filtered.filter(p => filters.grades.includes(p.grade_id));
    }
    if (filters.categories.length > 0) {
      filtered = filtered.filter(p => filters.categories.includes(p.category_id));
    }
    if (searchQuery) {
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.isbn.includes(searchQuery)
      );
    }

    if (filters.sortBy === 'price_low') filtered.sort((a, b) => a.price - b.price);
    if (filters.sortBy === 'price_high') filtered.sort((a, b) => b.price - a.price);

    setFilteredProducts(filtered);
    setHasMore(filtered.length > 20);
  }, [filters, searchQuery, allProducts]);

  const lastProductRef = useCallback(node => {
    if (loadingMore || filteredProducts.length <= 20) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setLoadingMore(true);
        setTimeout(() => setLoadingMore(false), 500);
      }
    });
    if (node) observer.current.observe(node);
  }, [loadingMore, hasMore, filteredProducts.length]);

  const cartTotal = cart.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0);
  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) {
        return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (id, delta) => {
    setCart(prev => prev
      .map(item => item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item)
      .filter(item => item.quantity > 0)
    );
  };

  const handleCheckout = async () => {
    if (!checkoutData.name || !checkoutData.phone) return alert('Fill name and phone');
    try {
      const res = await fetch(`${API_URL}/api/checkout/mpesa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: checkoutData.phone.replace(/\D/g, ''),
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
        alert('Payment failed');
      }
    } catch {
      alert('Network error');
    }
  };

  const goToAll = () => {
    setFilters({ grades: [], subjects: [], categories: [], sortBy: 'recent' });
    setSearchQuery('');
    setCurrentPage('products');
  };

  const goToGrade = (id) => {
    setFilters({ grades: [id], subjects: [], categories: [], sortBy: 'recent' });
    setSearchQuery('');
    setCurrentPage('products');
  };

  const goToCategory = (id) => {
    setFilters({ grades: [], subjects: [], categories: [id], sortBy: 'recent' });
    setSearchQuery('');
    setCurrentPage('products');
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

  const ProductCard = React.forwardRef(({ product }, ref) => {
    const gradeName = grades.find(g => g.id === product.grade_id)?.name || 'All Grades';
    const subjectName = subjects.find(s => s.id === product.subject_id)?.name || '';

    return (
      <div ref={ref} onClick={() => fetchProduct(product.id)} className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
        <div className="aspect-[3/4] bg-gray-100">
          <img src={product.image || "https://via.placeholder.com/400x600.png?text=No+Image"} alt={product.title} className="w-full h-full object-cover" loading="lazy" />
        </div>
        <div className="p-3">
          <div className="text-xs text-gray-500 mb-1">{gradeName} • {subjectName}</div>
          <h3 className="font-semibold text-sm mb-2 line-clamp-2">{product.title}</h3>
          <div className="flex justify-between items-center">
            <span className="text-lg font-bold text-blue-600">KSh {product.price}</span>
            <button onClick={(e) => { e.stopPropagation(); addToCart(product); }} className="p-2 bg-blue-500 text- white rounded-lg hover:bg-blue-600">
              <Plus size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  });

  const HomePage = () => (
    <div className="pb-20">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search books, ISBN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && goToAll()}
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-2xl focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-bold mb-4">Browse by Grade</h2>
          <div className="grid grid-cols-2 gap-3">
            {grades.map(grade => (
              <button key={grade.id} onClick={() => goToGrade(grade.id)} className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl shadow-md hover:shadow-lg transition-all">
                <div className="font-bold text-lg">{grade.name}</div>
                <div className="text-sm opacity-90">View Books</div>
              </button>
            ))}
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-bold mb-4">Top Picks</h2>
          <div className="grid grid-cols-2 gap-3">
            {allProducts.slice(0, 8).map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-bold mb-4">Learning Supplies</h2>
          <div className="grid grid-cols-2 gap-3">
            {allProducts.filter(p => p.category_id === 5).slice(0, 6).map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        </div>
      </div>
    </div>
  );

  const ProductsPage = () => (
    <div className="pb-20">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <button onClick={() => setShowFilters(!showFilters)} className="w-full mb-4 p-3 bg-white border-2 border-gray-200 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2"><Filter size={20} /><span className="font-medium">Filters & Sort</span></div>
          {showFilters ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>

        {showFilters && (
          <div className="mb-4 p-4 bg-white rounded-2xl shadow-md space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Grade</h3>
              <div className="flex flex-wrap gap-2">
                {grades.map(g => (
                  <button key={g.id} onClick={() => setFilters(prev => ({
                    ...prev,
                    grades: prev.grades.includes(g.id)
                      ? prev.grades.filter(v => v !== g.id)
                      : [...prev.grades, g.id]
                  }))} className={`px-3 py-1 rounded-full text-sm ${filters.grades.includes(g.id) ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}>
                    {g.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Sort By</h3>
              <select value={filters.sortBy} onChange={e => setFilters(prev => ({ ...prev, sortBy: e.target.value }))} className="w-full p-2 border rounded-lg">
                <option value="recent">Recently Added</option>
                <option value="price_low">Price: Low to High</option>
                <option value="price_high">Price: High to Low</option>
              </select>
            </div>
            <button onClick={() => setFilters({ grades: [], subjects: [], categories: [], sortBy: 'recent' })} className="w-full p-2 bg-gray-100 rounded-lg text-sm font-medium">Clear Filters</button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {filteredProducts.slice(0, 60).map((product, i) => (
            <ProductCard
              key={product.id}
              product={product}
              ref={i === filteredProducts.length - 1 ? lastProductRef : null}
            />
          ))}
        </div>

        {loading && <div className="text-center py-12">Loading products...</div>}
        {filteredProducts.length === 0 && !loading && <div className="text-center py-12 text-gray-500">No products found</div>}
      </div>
    </div>
  );

  const DetailsPage = () => selectedProduct && (
    <div className="pb-20">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <img src={selectedProduct.image} alt={selectedProduct.title} className="w-full h-96 object-cover" />
          <div className="p-6">
            <h1 className="text-2xl font-bold mb-2">{selectedProduct.title}</h1>
            <p className="text-gray-600 mb-4">{selectedProduct.description || 'No description available'}</p>
            <div className="flex items-center gap-4 text-sm text-gray-500 mb-6">
              <span>{grades.find(g => g.id === selectedProduct.grade_id)?.name}</span>
              <span>•</span>
              <span>{subjects.find(s => s.id === selectedProduct.subject_id)?.name}</span>
              <span>•</span>
              <span>In stock: {selectedProduct.stock}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-3xl font-bold text-blue-600">KSh {selectedProduct.price}</span>
              <button onClick={() => addToCart(selectedProduct)} className="px-8 py-4 bg-blue-600 text-white text-lg rounded-xl hover:bg-blue-700">
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const CartModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end">
      <div className="bg-white w-full max-h-96 rounded-t-3xl overflow-y-auto">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold">Your Cart ({cartCount})</h2>
          <button onClick={() => setShowCart(false)}><X size={24} /></button>
        </div>
        <div className="p-4 space-y-4">
          {cart.map(item => (
            <div key={item.id} className="flex gap-4 bg-gray-50 p-4 rounded-xl">
              <img src={item.image} alt={item.title} className="w-20 h-28 object-cover rounded" />
              <div className="flex-1">
                <h3 className="font-semibold">{item.title}</h3>
                <p className="text-blue-600 font-bold">KSh {item.price}</p>
                <div className="flex items-center gap-3 mt-2">
                  <button onClick={() => updateQuantity(item.id, -1)} className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center"><Minus size={16} /></button>
                  <span className="font-bold">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, 1)} className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center"><Plus size={16} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 border-t">
          <div className="flex justify-between text-xl font-bold mb-4">
            <span>Total</span>
            <span>KSh {cartTotal}</span>
          </div>
          <button onClick={() => { setShowCart(false); setCurrentPage('checkout'); }} className="w-full py-4 bg-blue-600 text-white rounded-xl text-lg font-bold">
            Checkout
          </button>
        </div>
      </div>
    </div>
  );

  const CheckoutPage = () => (
    <div className="pb-20">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">Checkout</h1>
        <div className="bg-white rounded-2xl p-6 space-y-6">
          <input type="text" placeholder="Full Name" value={checkoutData.name} onChange={e => setCheckoutData(prev => ({ ...prev, name: e.target.value }))} className="w-full p-4 border rounded-xl" />
          <input type="text" placeholder="Phone Number" value={checkoutData.phone} onChange={e => setCheckoutData(prev => ({ ...prev, phone: e.target.value }))} className="w-full p-4 border rounded-xl" />
          <input type="text" placeholder="Location (e.g. Nairobi CBD)" value={checkoutData.location} onChange={e => setCheckoutData(prev => ({ ...prev, location: e.target.value }))} className="w-full p-4 border rounded-xl" />
          <select value={checkoutData.deliveryOption} onChange={e => setCheckoutData(prev => ({ ...prev, deliveryOption: e.target.value }))} className="w-full p-4 border rounded-xl">
            <option value="pickup">Pickup (Free)</option>
            <option value="delivery">Delivery (+KSh 200)</option>
          </select>
          <button onClick={handleCheckout} className="w-full py-5 bg-green-600 text-white text-xl font-bold rounded-xl">
            Pay KSh {cartTotal + (checkoutData.deliveryOption === 'delivery' ? 200 : 0)} via M-Pesa
          </button>
        </div>
      </div>
    </div>
  );

  const SuccessPage = () => (
    <div className="flex flex-col items-center justify-center h-screen text-center px-6">
      <Check size={80} className="text-green-600 mb-6" />
      <h1 className="text-3xl font-bold mb-4">Order Placed Successfully!</h1>
      <p className="text-gray-600 text-lg">Check your phone for M-Pesa STK push</p>
      <button onClick={() => { setOrderSuccess(false); setCurrentPage('home'); }} className="mt-8 px-8 py-4 bg-blue-600 text-white rounded-xl">
        Continue Shopping
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {loading ? (
        <div className="flex items-center justify-center h-screen text-xl">Loading...</div>
      ) : (
        <>
          <Header />
          {orderSuccess ? <SuccessPage /> : (
            <>
              {currentPage === 'home' && <HomePage />}
              {currentPage === 'products' && <ProductsPage />}
              {currentPage === 'details' && <DetailsPage />}
              {currentPage === 'checkout' && <CheckoutPage />}
            </>
          )}
          {showCart && <CartModal />}
          {!showCart && cartCount > 0 && currentPage !== 'checkout' && (
            <button onClick={() => setShowCart(true)} className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-2xl z-30">
              <ShoppingCart size={28} />
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold">
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