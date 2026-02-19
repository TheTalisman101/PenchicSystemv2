import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Product } from '../types';
import { ShoppingCart, Store, AlertCircle, ChevronLeft, Tag, Sparkles } from 'lucide-react';
import { useStore } from '../store';
import { useDiscounts } from '../hooks/useDiscounts';
import { useInventoryVisibility } from '../hooks/useInventoryVisibility';
import DiscountBadge from '../components/DiscountBadge';

const ProductDetails = () => {
  const { id } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [productWithDiscount, setProductWithDiscount] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const addToCart = useStore((state) => state.addToCart);
  const user = useStore((state) => state.user);
  const navigate = useNavigate();
  const { getProductDiscount } = useDiscounts();
  const { canViewStock } = useInventoryVisibility(user?.role);

  const canSeeDiscounts = !user || user.role === 'customer';
  const canUseCart = user && ['admin', 'worker'].includes(user.role);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select(`*, product_variants(*)`)
          .eq('id', id)
          .single();

        if (error) throw error;
        setProduct(data);
        useStore.getState().addViewedProduct(data);

        if (canSeeDiscounts && data) {
          try {
            const discountInfo = await getProductDiscount(data.id, 1);
            if (discountInfo) {
              setProductWithDiscount({
                ...data,
                discount: {
                  type: 'percentage' as const,
                  value: discountInfo.savings_percentage,
                  original_price: discountInfo.original_price,
                  discounted_price: discountInfo.final_price,
                  savings: discountInfo.discount_amount,
                  campaign_name: discountInfo.offer_description.split(':')[0] || 'Special Offer'
                }
              });
            } else {
              setProductWithDiscount(data);
            }
          } catch (error) {
            console.error('Error loading discount:', error);
            setProductWithDiscount(data);
          }
        } else {
          setProductWithDiscount(data);
        }
      } catch (error) {
        console.error('Error fetching product:', error);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchProduct();
  }, [id, canSeeDiscounts, user?.id]);

  const handleAddToCart = () => {
    if (!user) { navigate('/login'); return; }
    if (!canUseCart) {
      alert('Cart functionality is only available to staff members. Please contact our staff to make a purchase.');
      return;
    }
    if (!product) return;

    const selectedVariantData = selectedVariant
      ? product.product_variants?.find(v => v.id === selectedVariant)
      : null;

    if (quantity > (selectedVariantData?.stock ?? product.stock)) {
      alert('Not enough stock available for this quantity');
      return;
    }

    addToCart({ product, variant: selectedVariantData, quantity });
    alert(`${product.name} added to cart successfully!`);
    setTimeout(() => navigate('/cart'), 500);
  };

  const openGoogleMaps = () => {
    window.open('https://maps.google.com/?q=-0.303099,36.080025', '_blank');
  };

  const getStockDisplay = (stock: number) => {
    if (canViewStock) {
      if (stock <= 0) return { text: `Out of Stock (${stock})`, color: 'text-red-500', dot: 'bg-red-500' };
      if (stock <= 5) return { text: `Low Stock — only ${stock} left`, color: 'text-amber-600', dot: 'bg-amber-500' };
      return { text: `In Stock (${stock} available)`, color: 'text-emerald-600', dot: 'bg-emerald-500' };
    } else {
      if (stock <= 0) return { text: 'Out of Stock', color: 'text-red-500', dot: 'bg-red-500' };
      return { text: 'In Stock', color: 'text-emerald-600', dot: 'bg-emerald-500' };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-neutral-200 border-t-neutral-900 animate-spin"></div>
          <p className="text-sm text-neutral-400">Loading product...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <p className="text-neutral-400 text-lg">Product not found</p>
      </div>
    );
  }

  const displayProduct = productWithDiscount || product;
  const hasDiscount = canSeeDiscounts && displayProduct.discount && displayProduct.discount.value > 0;
  const stockDisplay = getStockDisplay(product.stock);

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Back nav */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-0">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900 transition-colors group"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16">

          {/* Product Image */}
          <div className="relative">
            <div className="aspect-square rounded-3xl overflow-hidden bg-neutral-100 shadow-sm">
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-700 ease-out"
              />
            </div>
            {/* Discount badge overlay on image */}
            {hasDiscount && displayProduct.discount.type !== 'buy_x_get_y' && (
              <div className="absolute top-4 left-4">
                <span className="inline-flex items-center gap-1 bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                  <Tag className="w-3 h-3" />
                  {displayProduct.discount.value}% OFF
                </span>
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="flex flex-col justify-center space-y-7">

            {/* Category + Title */}
            <div>
              <span className="inline-block text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-3">
                {product.category}
              </span>
              <h1 className="text-4xl font-bold text-neutral-900 leading-tight tracking-tight">
                {product.name}
              </h1>
              <p className="mt-4 text-neutral-500 leading-relaxed text-sm">
                {product.description}
              </p>
            </div>

            {/* Divider */}
            <div className="h-px bg-neutral-200" />

            {/* Pricing */}
            <div>
              {hasDiscount ? (
                displayProduct.discount.type === 'buy_x_get_y' ? (
                  <div>
                    <p className="text-3xl font-bold text-neutral-900 mb-4">
                      KES {displayProduct.discount.original_price.toLocaleString()}
                    </p>
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-bold text-emerald-800">
                          Buy {displayProduct.discount.buy_quantity} Get {displayProduct.discount.get_quantity} Free
                        </p>
                        <p className="text-emerald-600 text-sm">Limited promotional offer</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-baseline gap-3 mb-1">
                      <span className="text-4xl font-bold text-neutral-900">
                        KES {displayProduct.discount.discounted_price.toLocaleString()}
                      </span>
                      <span className="text-lg text-neutral-400 line-through">
                        KES {displayProduct.discount.original_price.toLocaleString()}
                      </span>
                    </div>
                    <div className="mt-3 inline-flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-xl text-sm font-semibold">
                      <Tag className="w-3.5 h-3.5" />
                      You save KES {displayProduct.discount.savings.toLocaleString()}
                    </div>
                  </div>
                )
              ) : (
                <p className="text-4xl font-bold text-neutral-900 tracking-tight">
                  KES {product.price.toLocaleString()}
                </p>
              )}

              {/* Stock indicator */}
              <div className="flex items-center gap-2 mt-4">
                <span className={`w-2 h-2 rounded-full ${stockDisplay.dot} flex-shrink-0`}></span>
                <span className={`text-sm font-medium ${stockDisplay.color}`}>
                  {stockDisplay.text}
                </span>
              </div>
            </div>

            {/* Variants */}
            {product.product_variants && product.product_variants.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-3">Size</p>
                <div className="flex flex-wrap gap-2">
                  {product.product_variants.map((variant) => (
                    <button
                      key={variant.id}
                      onClick={() => setSelectedVariant(variant.id)}
                      disabled={variant.stock <= 0}
                      className={`px-5 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all duration-150 ${
                        selectedVariant === variant.id
                          ? 'bg-neutral-900 text-white border-neutral-900'
                          : variant.stock <= 0
                          ? 'bg-neutral-50 text-neutral-300 border-neutral-200 cursor-not-allowed'
                          : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400'
                      }`}
                    >
                      {variant.size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Cart Actions */}
            {canUseCart ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <label className="text-xs font-semibold uppercase tracking-widest text-neutral-400">Qty</label>
                  <div className="flex items-center bg-white border border-neutral-200 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setQuantity(q => Math.max(1, q - 1))}
                      className="w-10 h-10 flex items-center justify-center hover:bg-neutral-50 text-neutral-600 transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      min="1"
                      max={product.stock}
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-14 text-center text-sm font-bold text-neutral-900 bg-transparent focus:outline-none"
                    />
                    <button
                      onClick={() => setQuantity(q => Math.min(product.stock, q + 1))}
                      className="w-10 h-10 flex items-center justify-center hover:bg-neutral-50 text-neutral-600 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleAddToCart}
                  disabled={product.stock <= 0}
                  className={`w-full flex items-center justify-center gap-2.5 py-4 px-8 rounded-2xl text-sm font-bold transition-all duration-150 ${
                    product.stock > 0
                      ? 'bg-neutral-900 text-white hover:bg-neutral-700 active:scale-[0.98] shadow-lg shadow-neutral-900/10'
                      : 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                  }`}
                >
                  <ShoppingCart className="w-5 h-5" />
                  {product.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
                </button>
              </div>
            ) : (
              <div>
                {!user ? (
                  <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-6 text-center">
                    <p className="text-neutral-600 text-sm mb-4">Sign in to purchase this item</p>
                    <button
                      onClick={() => navigate('/login')}
                      className="bg-neutral-900 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-neutral-700 transition-all duration-150"
                    >
                      Login to Purchase
                    </button>
                  </div>
                ) : (
                  <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-6 text-center">
                    <p className="text-neutral-600 text-sm mb-4">Visit us in-store to purchase this item</p>
                    <button
                      onClick={openGoogleMaps}
                      className="bg-neutral-900 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-neutral-700 transition-all duration-150 flex items-center justify-center gap-2 mx-auto"
                    >
                      <Store className="w-4 h-4" />
                      Get Directions
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;