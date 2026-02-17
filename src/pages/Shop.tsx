import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Product } from '../types';
import { ShoppingCart, Plus, Minus, Store, AlertCircle, Search, Filter, X } from 'lucide-react';
import { useStore } from '../store';
import RecentlyViewed from '../components/RecentlyViewed';

export default function Shop() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [quantities, setQuantities] = useState<{ [key: string]: number }>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState<string>('');
  const addToCart = useStore((state) => state.addToCart);
  const user = useStore((state) => state.user);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProducts();
  }, []);

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

      if (discountError) {
        console.error('Error fetching discounts:', discountError);
      }

      if (data) {
        const productsWithDiscounts = data.map(product => {
          const discount = discounts?.find(d => d.product_id === product.id);
          return {
            ...product,
            discount: discount || null
          };
        });

        const initialQuantities = {};
        productsWithDiscounts.forEach(product => {
          initialQuantities[product.id] = 1;
        });
        setQuantities(initialQuantities);
        setProducts(productsWithDiscounts);
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Failed to load products. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const handleQuantityChange = (productId: string, value: string | number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    let newQuantity: number;
    if (typeof value === 'string') {
      newQuantity = parseInt(value) || 1;
    } else {
      const currentQty = quantities[productId] || 1;
      newQuantity = currentQty + value;
    }

    newQuantity = Math.max(1, Math.min(newQuantity, product.stock));
    setQuantities(prev => ({
      ...prev,
      [productId]: newQuantity
    }));
  };

  const handleAddToCart = (product: Product) => {
    if (!user) {
      navigate('/login');
      return;
    }

    const quantity = quantities[product.id] || 1;
    if (quantity > product.stock) {
      alert('Not enough stock available');
      return;
    }

    addToCart({
      product,
      quantity
    });

    setProducts(prev =>
      prev.map(p =>
        p.id === product.id ? { ...p, stock: p.stock - quantity } : p
      )
    );

    setQuantities(prev => ({
      ...prev,
      [product.id]: 1
    }));
  };

  const getStockStatus = (stock: number) => {
    if (stock <= 0) return { text: 'Out of Stock', color: 'text-red-500' };
    if (stock <= 5) return { text: 'Low in Stock', color: 'text-yellow-500' };
    return { text: 'In Stock', color: 'text-green-500' };
  };

  const formatPrice = (price: number) => {
    return `KES ${price.toLocaleString('en-KE')}`;
  };

  const filteredProducts = products
    .filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          product.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });

  const categories = ['all', ...new Set(products.map(p => p.category))];

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-neutral-800"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Recently Viewed Products */}
        <div className="mb-12">
          <RecentlyViewed />
        </div>

        {/* Search and Filter Bar */}
        <div className="mb-8 bg-white rounded-xl p-6 shadow-lg border border-neutral-200">
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg border border-red-200">
              {error}
            </div>
          )}
          
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-grow">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-neutral-500" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-neutral-100 text-neutral-900 rounded-xl focus:ring-2 focus:ring-primary focus:outline-none transition-all border border-neutral-300"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-neutral-500 hover:text-neutral-800"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-6 py-3 bg-neutral-200 text-neutral-800 rounded-xl hover:bg-neutral-300 transition-colors"
            >
              <Filter className="w-5 h-5" />
              <span>Filters</span>
            </button>
          </div>

          {/* Category Filters */}
          {showFilters && (
            <div className="mt-4 flex flex-wrap gap-2 animate-fadeIn">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all transform hover:scale-105 ${
                    selectedCategory === category
                      ? 'bg-primary text-white'
                      : 'bg-neutral-200 text-neutral-800 hover:bg-neutral-300'
                  }`}
                >
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => {
            const stockStatus = getStockStatus(product.stock);
            const hasDiscount = product.discount;
            const discountedPrice = hasDiscount
              ? product.price - (product.price * product.discount.percentage / 100)
              : product.price;

            return (
              <div
                key={product.id}
                className="group bg-white rounded-xl overflow-hidden transform transition-all duration-300 hover:scale-[1.02] hover:shadow-xl border border-neutral-200"
              >
                <Link to={`/product/${product.id}`} className="block">
                  <div className="relative aspect-square overflow-hidden">
                    {hasDiscount && (
                      <div className="absolute top-3 right-3 z-10 bg-red-500 text-white px-3 py-1 rounded-lg text-sm font-bold shadow-lg">
                        -{product.discount.percentage}% OFF
                      </div>
                    )}
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    {product.stock <= 0 && (
                      <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center backdrop-blur-sm">
                        <span className="text-white font-medium px-4 py-2 bg-red-500 rounded-lg">
                          Out of Stock
                        </span>
                      </div>
                    )}
                  </div>
                </Link>

                <div className="p-6">
                  <Link to={`/product/${product.id}`}>
                    <h3 className="text-xl font-semibold mb-2 text-neutral-900 group-hover:text-primary transition-colors">
                      {product.name}
                    </h3>
                  </Link>
                  
                  <p className="text-neutral-600 text-sm mb-4 line-clamp-2">
                    {product.description}
                  </p>

                  <div className="flex items-center justify-between mb-4">
                    <div>
                      {hasDiscount ? (
                        <div>
                          <p className="text-sm text-neutral-400 line-through">{formatPrice(product.price)}</p>
                          <p className="text-2xl font-bold text-primary">{formatPrice(Math.round(discountedPrice))}</p>
                          <p className="text-sm text-green-600 font-semibold">Save {product.discount.percentage}%</p>
                        </div>
                      ) : (
                        <p className="text-2xl font-bold text-neutral-900">{formatPrice(product.price)}</p>
                      )}
                    </div>
                    <div className={`flex items-center gap-2 ${stockStatus.color}`}>
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">{stockStatus.text}</span>
                    </div>
                  </div>

                  {user && product.stock > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between bg-neutral-100 rounded-lg p-2 border border-neutral-300">
                        <button
                          onClick={() => handleQuantityChange(product.id, -1)}
                          className="p-2 hover:bg-neutral-200 text-neutral-800 rounded-lg transition-colors disabled:opacity-50"
                          disabled={quantities[product.id] <= 1}
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          max={product.stock}
                          value={quantities[product.id] || 1}
                          onChange={(e) => handleQuantityChange(product.id, e.target.value)}
                          className="w-16 text-center bg-transparent text-neutral-900"
                        />
                        <button
                          onClick={() => handleQuantityChange(product.id, 1)}
                          className="p-2 hover:bg-neutral-200 text-neutral-800 rounded-lg transition-colors disabled:opacity-50"
                          disabled={(quantities[product.id] || 1) >= product.stock}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      <button
                        onClick={() => handleAddToCart(product)}
                        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-all transform hover:scale-105"
                      >
                        <ShoppingCart className="w-5 h-5" />
                        Add to Cart
                      </button>
                    </div>
                  )}

                  {!user && product.stock > 0 && (
                    <button
                      onClick={() => window.open('https://maps.google.com/?q=-1.1166,36.6333', '_blank')}
                      className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all transform hover:scale-105"
                    >
                      <Store className="w-5 h-5" />
                      Visit Shop to Purchase
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-neutral-200">
            <Store className="w-16 h-16 mx-auto mb-4 text-neutral-400" />
            <h3 className="text-xl font-semibold mb-2 text-neutral-900">No Products Found</h3>
            <p className="text-neutral-600">
              Try adjusting your search or filter criteria
            </p>
          </div>
        )}
      </div>
    </div>
  );
}