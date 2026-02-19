import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Product } from '../types';
import {
  ShoppingCart, Plus, Minus, Store, Search, SlidersHorizontal,
  X, Zap, TrendingUp, Tag
} from 'lucide-react';
import { useStore } from '../store';
import RecentlyViewed from '../components/RecentlyViewed';

export default function Shop() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [quantities, setQuantities] = useState<{ [key: string]: number }>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'default' | 'price-asc' | 'price-desc' | 'name'>('default');
  const [stockFilter, setStockFilter] = useState<'all' | 'instock'>('all');
  const [error, setError] = useState<string>('');

  const addToCart = useStore((state) => state.addToCart);
  const user = useStore((state) => state.user);
  const cart = useStore((state) => state.cart);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const canUseCart = user && ['admin', 'worker'].includes(user.role);
  const navigate = useNavigate();

  useEffect(() => { fetchProducts(); }, []);

  async function fetchProducts() {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const now = new Date().toISOString();
      const { data: discounts, error: discountError } = await supabase
        .from('discounts')
        .select('*')
        .lte('start_date', now)
        .gte('end_date', now);

      if (discountError) console.error('Error fetching discounts:', discountError);

      if (data) {
        const productsWithDiscounts = data.map(product => ({
          ...product,
          discount: discounts?.find(d => d.product_id === product.id) || null,
        }));
        const initialQuantities: { [key: string]: number } = {};
        productsWithDiscounts.forEach(p => { initialQuantities[p.id] = 1; });
        setQuantities(initialQuantities);
        setProducts(productsWithDiscounts);
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Failed to load products. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const handleQuantityChange = (productId: string, value: string | number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    let newQty: number;
    if (typeof value === 'string') {
      newQty = parseInt(value) || 1;
    } else {
      newQty = (quantities[productId] || 1) + value;
    }
    newQty = Math.max(1, Math.min(newQty, product.stock));
    setQuantities(prev => ({ ...prev, [productId]: newQty }));
  };

  const handleQtyBlur = (productId: string, raw: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const parsed = parseInt(raw) || 1;
    const clamped = Math.max(1, Math.min(parsed, product.stock));
    setQuantities(prev => ({ ...prev, [productId]: clamped }));
  };

  const handleAddToCart = (product: Product) => {
    if (!user) { navigate('/login'); return; }
    const quantity = quantities[product.id] || 1;
    if (quantity > product.stock) { alert('Not enough stock available'); return; }
    addToCart({ product, quantity });
    setProducts(prev => prev.map(p => p.id === product.id ? { ...p, stock: p.stock - quantity } : p));
    setQuantities(prev => ({ ...prev, [product.id]: 1 }));
  };

  const formatPrice = (price: number) => `KES ${price.toLocaleString('en-KE')}`;

  const categories = ['all', ...Array.from(new Set(products.map(p => p.category))).sort()];

  const filteredProducts = products
    .filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
      const matchStock = stockFilter === 'all' || p.stock > 0;
      return matchSearch && matchCat && matchStock;
    })
    .sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return 0;
    });

  const hasActiveFilters = selectedCategory !== 'all' || stockFilter !== 'all' || sortBy !== 'default';

  const resetFilters = () => {
    setSelectedCategory('all');
    setStockFilter('all');
    setSortBy('default');
    setSearchQuery('');
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7faf8] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-11 h-11 rounded-full border-2 border-[#d0ece1] border-t-[#1a6b47] animate-spin" />
          <p className="text-sm text-neutral-400 tracking-wide">Loading products…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7faf8]">

      {/* ══ STICKY HEADER ══════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-neutral-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-[60px] flex items-center gap-3">

          {/* Brand mark */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-[#1a6b47] flex items-center justify-center shadow-sm">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <span className="font-extrabold text-neutral-900 text-[15px] tracking-tight hidden sm:block">Shop</span>
          </div>

          {/* Search */}
          <div className="flex-grow relative max-w-lg mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search products…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-9 rounded-xl border-2 border-neutral-200 bg-neutral-50 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-[#2d9e6b] focus:bg-white focus:ring-2 focus:ring-[#2d9e6b]/20 transition-all"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setShowFilters(v => !v)}
              className={`flex items-center gap-1.5 px-3 h-9 rounded-xl border-2 text-sm font-semibold transition-all ${
                showFilters || hasActiveFilters
                  ? 'border-[#2d9e6b] bg-[#eaf5f0] text-[#1a6b47]'
                  : 'border-neutral-200 bg-white text-neutral-600 hover:border-[#a8dcc5] hover:bg-[#f0faf5] hover:text-[#1a6b47]'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:block">Filters</span>
              {hasActiveFilters && (
                <span className="w-4 h-4 rounded-full bg-[#1a6b47] text-white text-[10px] font-bold flex items-center justify-center">•</span>
              )}
            </button>

            {canUseCart && (
              <button
                onClick={() => navigate('/cart')}
                className="relative flex items-center gap-1.5 px-3 h-9 rounded-xl border-2 border-neutral-200 bg-white text-sm font-semibold text-neutral-600 hover:border-[#a8dcc5] hover:bg-[#f0faf5] hover:text-[#1a6b47] transition-all"
              >
                <ShoppingCart className="w-4 h-4" />
                <span className="hidden sm:block">Cart</span>
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#1a6b47] text-white text-[10px] font-bold flex items-center justify-center shadow-sm">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        {/* ── Expandable filter bar ── */}
        {showFilters && (
          <div className="border-t border-neutral-100 bg-white/95 px-4 sm:px-6 py-3">
            <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-4">
              {/* Sort */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-neutral-400">Sort</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="h-8 px-2.5 rounded-lg border border-neutral-200 bg-white text-xs font-semibold text-neutral-700 focus:outline-none focus:border-[#2d9e6b] cursor-pointer"
                >
                  <option value="default">Default</option>
                  <option value="price-asc">Price: Low → High</option>
                  <option value="price-desc">Price: High → Low</option>
                  <option value="name">Name A–Z</option>
                </select>
              </div>

              {/* Stock */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-neutral-400">Stock</span>
                <div className="flex rounded-lg border border-neutral-200 overflow-hidden text-xs font-semibold">
                  {(['all', 'instock'] as const).map(val => (
                    <button
                      key={val}
                      onClick={() => setStockFilter(val)}
                      className={`px-3 h-8 transition-colors ${
                        stockFilter === val ? 'bg-[#1a6b47] text-white' : 'bg-white text-neutral-600 hover:bg-neutral-50'
                      }`}
                    >
                      {val === 'all' ? 'All' : 'In Stock'}
                    </button>
                  ))}
                </div>
              </div>

              {hasActiveFilters && (
                <button onClick={resetFilters} className="flex items-center gap-1 text-xs font-bold text-red-500 hover:text-red-700 transition-colors ml-auto">
                  <X className="w-3.5 h-3.5" /> Reset all
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-12">

        {/* Error banner */}
        {error && (
          <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 text-sm font-medium flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* ══ RECENTLY VIEWED ════════════════════════════════════════════════ */}
        <div>
          <RecentlyViewed />
        </div>

        {/* ══ CATEGORY PILLS ═════════════════════════════════════════════════ */}
        {!searchQuery && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:-mx-6 sm:px-6 scrollbar-none">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all duration-150 ${
                  selectedCategory === cat
                    ? 'bg-[#1a6b47] text-white border-[#1a6b47] shadow-md shadow-green-900/20'
                    : 'bg-white text-neutral-600 border-neutral-200 hover:border-[#a8dcc5] hover:text-[#1a6b47] hover:bg-[#f0faf5]'
                }`}
              >
                {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        )}

        {/* ══ PRODUCTS GRID ══════════════════════════════════════════════════ */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <div>
              {searchQuery ? (
                <h2 className="text-xl font-extrabold text-neutral-900">
                  Results for <span className="text-[#1a6b47]">"{searchQuery}"</span>
                </h2>
              ) : (
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-5 h-0.5 bg-[#2d9e6b]" />
                    <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#2d9e6b]">
                      {selectedCategory === 'all' ? 'All Products' : selectedCategory}
                    </span>
                  </div>
                  <h2 className="text-[1.5rem] font-extrabold text-neutral-900 tracking-tight leading-tight">
                    {selectedCategory === 'all' ? 'Browse Everything' : selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)}
                  </h2>
                </div>
              )}
            </div>
            <span className="text-sm text-neutral-400 font-semibold flex-shrink-0">
              {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'}
            </span>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="text-center py-24 bg-white rounded-2xl border border-neutral-200">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#eaf5f0] flex items-center justify-center">
                <Search className="w-8 h-8 text-[#2d9e6b]" strokeWidth={1.5} />
              </div>
              <p className="font-bold text-neutral-900 text-lg mb-2">No products found</p>
              <p className="text-neutral-400 text-sm mb-6">Try adjusting your search or filters.</p>
              <button
                onClick={resetFilters}
                className="inline-flex items-center gap-2 bg-[#1a6b47] text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-[#155a3b] transition-all shadow-md shadow-green-900/20"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredProducts.map(product => {
                const hasDiscount = !!product.discount;
                const discountedPrice = hasDiscount
                  ? product.price - (product.price * product.discount.percentage / 100)
                  : product.price;
                const inStock = product.stock > 0;
                const lowStock = product.stock > 0 && product.stock <= 5;
                const qty = quantities[product.id] || 1;

                return (
                  <article
                    key={product.id}
                    className="group bg-white rounded-2xl border border-neutral-200 hover:border-[#a8dcc5] hover:shadow-xl hover:shadow-green-900/8 transition-all duration-300 flex flex-col overflow-hidden"
                  >
                    {/* ── Image ── */}
                    <Link to={`/product/${product.id}`} className="block relative flex-shrink-0">
                      <div className="relative aspect-[4/3] overflow-hidden bg-neutral-100">
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-[1.06] transition-transform duration-500 ease-out"
                        />

                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                        {/* Out of stock overlay */}
                        {!inStock && (
                          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center">
                            <span className="bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg">
                              Out of Stock
                            </span>
                          </div>
                        )}

                        {/* Badges */}
                        <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5">
                          <span className="inline-flex items-center bg-[#1a6b47] text-white text-[10px] font-extrabold px-2.5 py-1 rounded-lg uppercase tracking-widest shadow-md">
                            {product.category}
                          </span>
                          {hasDiscount && (
                            <span className="inline-flex items-center gap-1 bg-red-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-md">
                              <Tag className="w-2.5 h-2.5" />
                              -{product.discount.percentage}%
                            </span>
                          )}
                        </div>

                        {/* Low stock badge */}
                        {lowStock && (
                          <div className="absolute top-3 left-3">
                            <span className="inline-flex items-center gap-1 bg-amber-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-md">
                              <Zap className="w-2.5 h-2.5" />
                              {product.stock} left
                            </span>
                          </div>
                        )}

                        {/* Quick view hint */}
                        <div className="absolute inset-x-0 bottom-0 flex justify-center pb-3 opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-300">
                          <span className="bg-white/95 text-neutral-800 text-xs font-bold px-3 py-1.5 rounded-xl shadow-lg">
                            View details →
                          </span>
                        </div>
                      </div>
                    </Link>

                    {/* ── Body ── */}
                    <div className="p-4 flex flex-col flex-grow gap-3">
                      {/* Name + description */}
                      <div className="flex-grow">
                        <Link to={`/product/${product.id}`}>
                          <h3 className="font-bold text-neutral-900 text-[15px] leading-snug group-hover:text-[#1a6b47] transition-colors line-clamp-1">
                            {product.name}
                          </h3>
                        </Link>
                        <p className="text-neutral-400 text-xs mt-1 leading-relaxed line-clamp-2">
                          {product.description}
                        </p>
                      </div>

                      {/* Price + stock */}
                      <div className="flex items-end justify-between pt-3 border-t border-neutral-100">
                        <div>
                          {hasDiscount ? (
                            <div>
                              <p className="text-xs text-neutral-400 line-through leading-none mb-0.5">
                                {formatPrice(product.price)}
                              </p>
                              <p className="text-[1.15rem] font-extrabold text-neutral-900 leading-none">
                                {formatPrice(Math.round(discountedPrice))}
                              </p>
                            </div>
                          ) : (
                            <p className="text-[1.15rem] font-extrabold text-neutral-900 leading-none">
                              {formatPrice(product.price)}
                            </p>
                          )}
                        </div>

                        <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-lg ${
                          inStock
                            ? 'bg-[#eaf5f0] text-[#1a6b47] border border-[#c5e8d9]'
                            : 'bg-red-50 text-red-600 border border-red-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${inStock ? 'bg-[#2d9e6b]' : 'bg-red-500'}`} />
                          {inStock ? 'In Stock' : 'Out of Stock'}
                        </span>
                      </div>

                      {/* ── Actions (staff: qty + add to cart) ── */}
                      {canUseCart && inStock && (
                        <div className="space-y-2.5">
                          {/* Quantity stepper */}
                          <div className="flex items-center rounded-xl border-2 border-neutral-200 bg-white overflow-hidden hover:border-[#a8dcc5] focus-within:border-[#2d9e6b] focus-within:ring-2 focus-within:ring-[#2d9e6b]/20 transition-all">
                            <button
                              onClick={() => handleQuantityChange(product.id, -1)}
                              disabled={qty <= 1}
                              className="w-9 h-9 flex items-center justify-center text-neutral-400 hover:text-[#1a6b47] hover:bg-[#f0faf5] disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>

                            <input
                              type="number"
                              min={1}
                              max={product.stock}
                              value={qty}
                              onChange={(e) => handleQuantityChange(product.id, e.target.value)}
                              onBlur={(e) => handleQtyBlur(product.id, e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                              className="flex-grow h-9 text-center text-sm font-bold text-neutral-900 bg-transparent border-none outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />

                            <button
                              onClick={() => handleQuantityChange(product.id, 1)}
                              disabled={qty >= product.stock}
                              className="w-9 h-9 flex items-center justify-center text-neutral-400 hover:text-[#1a6b47] hover:bg-[#f0faf5] disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Add to cart */}
                          <button
                            onClick={() => handleAddToCart(product)}
                            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[#1a6b47] text-white rounded-xl text-sm font-bold hover:bg-[#155a3b] active:scale-[0.98] transition-all shadow-md shadow-green-900/15"
                          >
                            <ShoppingCart className="w-4 h-4" />
                            Add to Cart
                          </button>
                        </div>
                      )}

                      {/* ── Guest / customer: visit store ── */}
                      {!canUseCart && inStock && (
                        <button
                          onClick={() => window.open('https://maps.google.com/?q=-1.1166,36.6333', '_blank')}
                          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[#eaf5f0] text-[#1a6b47] border-2 border-[#a8dcc5] rounded-xl text-sm font-bold hover:bg-[#d6f0e5] transition-all"
                        >
                          <Store className="w-4 h-4" />
                          Visit Shop
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}