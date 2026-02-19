import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Product } from '../types';
import { ShoppingCart, Store, AlertCircle } from 'lucide-react';
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

  // All users can see discounts (guests and customers only)
  const canSeeDiscounts = !user || user.role === 'customer';
  
  // Determine if user can use cart (only admin and worker roles)
  const canUseCart = user && ['admin', 'worker'].includes(user.role);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select(`
            *,
            product_variants(*)
          `)
          .eq('id', id)
          .single();

        if (error) throw error;
        setProduct(data);

        useStore.getState().addViewedProduct(data);

        // Load discount information if user can see discounts
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

    if (id) {
      fetchProduct();
    }
  }, [id, canSeeDiscounts, user?.id]);

  const handleAddToCart = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    if (!canUseCart) {
      // Show message for customers/guests
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

    addToCart({
      product,
      variant: selectedVariantData,
      quantity
    });

    // Show success message and navigate
    alert(`${product.name} added to cart successfully!`);
    setTimeout(() => navigate('/cart'), 500);
  };

  const openGoogleMaps = () => {
    window.open('https://maps.google.com/?q=-0.303099,36.080025', '_blank');
  };

  const getStockDisplay = (stock: number) => {
    if (canViewStock) {
      // Admin/Worker: Show exact stock numbers
      if (stock <= 0) return { text: `Out of Stock (${stock})`, color: 'text-red-500' };
      if (stock <= 5) return { text: `Low Stock (${stock} left)`, color: 'text-yellow-600' };
      return { text: `In Stock (${stock} available)`, color: 'text-green-600' };
    } else {
      // Guest/Customer: Show only status
      if (stock <= 0) return { text: 'Out of Stock', color: 'text-red-500' };
      return { text: 'In Stock', color: 'text-green-600' };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <p className="text-neutral-900 text-xl">Product not found</p>
      </div>
    );
  }

  const displayProduct = productWithDiscount || product;
  const hasDiscount = canSeeDiscounts && displayProduct.discount && displayProduct.discount.value > 0;
  const stockDisplay = getStockDisplay(product.stock);

  return (
    <div className="min-h-screen bg-neutral-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="relative aspect-square">
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover rounded-lg"
            />
          </div>

          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold mb-2 text-neutral-900">{product.name}</h1>
              <span className="inline-block bg-neutral-100 text-neutral-700 px-3 py-1 rounded-full text-sm font-medium mb-4">
                {product.category}
              </span>
              <p className="text-neutral-700">{product.description}</p>
            </div>

            <div className="border-t border-neutral-300 pt-6">
              {/* Enhanced Pricing Section with Discount Display */}
              {hasDiscount ? (
                <div className="space-y-4">
                  {displayProduct.discount.type === 'buy_x_get_y' ? (
                    <div>
                      {/* Regular price for BOGO */}
                      <div className="text-center mb-4">
                        <span className="text-4xl font-bold text-neutral-900">
                          KES {displayProduct.discount.original_price.toLocaleString()}
                        </span>
                      </div>
                      {/* BOGO Offer Display */}
                      <div className="bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl p-6 border-2 border-green-300">
                        <p className="text-green-800 font-bold text-center text-2xl">
                          Buy {displayProduct.discount.buy_quantity} Get {displayProduct.discount.get_quantity} Free!
                        </p>
                        <p className="text-green-700 text-center text-lg mt-2">
                          Special Promotional Offer
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {/* Discount Badge */}
                      <div className="mb-4">
                        <DiscountBadge
                          type={displayProduct.discount.type}
                          value={displayProduct.discount.value}
                          size="large"
                        />
                      </div>
                      
                      {/* Discount Price Display: "Was X Now Y" Format */}
                      <div className="text-center mb-4">
                        <div className="text-lg text-neutral-500 mb-2">
                          <span className="line-through">Was KES {displayProduct.discount.original_price.toLocaleString()}</span>
                        </div>
                        <div className="text-4xl font-bold text-red-600">
                          Now KES {displayProduct.discount.discounted_price.toLocaleString()}
                        </div>
                      </div>
                      
                      {/* Savings Display */}
                      <div className="bg-gradient-to-r from-red-100 to-pink-100 rounded-xl p-4 border-2 border-red-300">
                        <p className="text-red-800 font-bold text-center text-xl">
                          Save KES {displayProduct.discount.savings.toLocaleString()}
                        </p>
                        <p className="text-red-700 text-center text-lg">
                          {displayProduct.discount.value}% OFF
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center">
                  <span className="text-4xl font-bold text-primary">
                    KES {product.price.toLocaleString()}
                  </span>
                </div>
              )}

              <div className={`flex items-center gap-2 mt-6 ${stockDisplay.color}`}>
                <AlertCircle className="w-5 h-5" />
                <span className="text-lg font-medium">{stockDisplay.text}</span>
              </div>

              {product.product_variants && product.product_variants.length > 0 && (
                <div className="mt-4">
                  <label className="block text-sm font-medium mb-2 text-neutral-900">Size</label>
                  <div className="grid grid-cols-3 gap-2">
                    {product.product_variants.map((variant) => (
                      <button
                        key={variant.id}
                        onClick={() => setSelectedVariant(variant.id)}
                        className={`py-2 px-4 rounded-lg ${
                          selectedVariant === variant.id
                            ? 'bg-primary text-white'
                            : 'bg-neutral-200 text-neutral-900 hover:bg-neutral-300'
                        }`}
                        disabled={variant.stock <= 0}
                      >
                        {variant.size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {canUseCart ? (
                <div className="mt-6 space-y-4">
                  <div className="flex items-center">
                    <label className="block text-sm font-medium mr-4 text-neutral-900">Quantity:</label>
                    <input
                      type="number"
                      min="1"
                      max={product.stock}
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-20 px-3 py-1 bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                  </div>

                  <button
                    onClick={handleAddToCart}
                    disabled={product.stock <= 0}
                    className={`w-full flex items-center justify-center py-3 px-8 rounded-lg text-lg font-medium ${
                      product.stock > 0
                        ? 'bg-primary text-white hover:bg-primary-dark'
                        : 'bg-neutral-400 text-neutral-600 cursor-not-allowed'
                    }`}
                  >
                    <ShoppingCart className="w-6 h-6 mr-2" />
                    {product.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
                  </button>
                </div>
              ) : (
                <div className="mt-6">
                  {!user ? (
                    <div className="text-center p-6 bg-neutral-100 rounded-xl">
                      <p className="text-lg text-neutral-700 mb-4">Please login to purchase this item</p>
                      <button
                        onClick={() => navigate('/login')}
                        className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary-dark transition-colors"
                      >
                        Login to Purchase
                      </button>
                    </div>
                  ) : (
                    <div className="text-center p-6 bg-neutral-100 rounded-xl">
                      <p className="text-lg text-neutral-700 mb-4">Contact our staff to purchase this item</p>
                      <button
                        onClick={openGoogleMaps}
                        className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary-dark transition-colors flex items-center justify-center mx-auto"
                      >
                        <Store className="w-5 h-5 mr-2" />
                        Visit Our Store
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;