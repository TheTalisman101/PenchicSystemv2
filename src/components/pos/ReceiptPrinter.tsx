import React, { useState, useEffect } from 'react';
import { Tag, Percent, DollarSign, Gift, Package, Calculator, X, Check } from 'lucide-react';
import { useDiscounts } from '../../hooks/useDiscounts';
import { Product } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';

interface DiscountCalculatorProps {
  cartItems: Array<{
    product: Product;
    quantity: number;
    variant?: any;
  }>;
  onDiscountApplied: (discounts: Array<{
    productId: string;
    campaignId: string;
    discountAmount: number;
    finalPrice: number;
    description: string;
    type: string;
    originalPrice: number;
    savings: number;
    buyQuantity?: number;
    getQuantity?: number;
  }>) => void;
  userId?: string;
}

const DiscountCalculator: React.FC<DiscountCalculatorProps> = ({
  cartItems,
  onDiscountApplied,
  userId
}) => {
  const [appliedDiscounts, setAppliedDiscounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const { getProductDiscount, validateDiscountUsage } = useDiscounts();

  useEffect(() => {
    calculateDiscounts();
  }, [cartItems, userId]);

  const calculateDiscounts = async () => {

    if (!cartItems || cartItems.length === 0) {
      setAppliedDiscounts([]);
      onDiscountApplied([]);
      return;
    }

    setLoading(true);
    try {
      const discounts = [];

      for (const item of cartItems) {
        if (!item.product || !item.product.id) continue;
        
        try {
          const discountInfo = await getProductDiscount(
            item.product.id,
            item.quantity
          );

          if (discountInfo) {
            discounts.push({
              productId: item.product.id,
              productName: item.product.name,
              campaignId: discountInfo.campaign_id,
              discountType: discountInfo.discount_type,
              originalPrice: discountInfo.original_price,
              discountAmount: discountInfo.discount_amount * item.quantity,
              finalPrice: discountInfo.final_price,
              description: discountInfo.offer_description,
              quantity: item.quantity,
              savings: discountInfo.discount_amount * item.quantity,
              type: discountInfo.discount_type,
              buyQuantity: discountInfo.buy_quantity,
              getQuantity: discountInfo.get_quantity
            });
          }
        } catch (error) {
          console.error(`Error calculating discount for ${item.product.name}:`, error);
          // Continue with other items even if one fails
        }
      }
      setAppliedDiscounts(discounts);
      onDiscountApplied(discounts);
    } catch (error) {
      console.error('Error calculating discounts:', error);
      setAppliedDiscounts([]);
      onDiscountApplied([]);
    } finally {
      setLoading(false);
    }
  };

  const totalSavings = appliedDiscounts.reduce((sum, discount) => sum + discount.savings, 0);
  const totalOriginal = cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const totalWithDiscounts = totalOriginal - totalSavings;

  if (appliedDiscounts.length === 0 && !loading) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 m-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Tag className="w-5 h-5 text-green-600" />
          <h3 className="font-semibold text-green-800">Active Discounts</h3>
          {appliedDiscounts.length > 0 && (
            <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
              {appliedDiscounts.length}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-green-600 hover:text-green-700 transition-colors"
        >
          {showDetails ? <X className="w-4 h-4" /> : <Calculator className="w-4 h-4" />}
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-green-600"></div>
          <span className="ml-2 text-sm text-green-600">Calculating discounts...</span>
        </div>
      )}

      {appliedDiscounts.length > 0 && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div className="text-center">
              <p className="text-sm text-green-600">Total Savings</p>
              <p className="text-xl font-bold text-green-800">
                KES {totalSavings.toLocaleString()}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-green-600">Final Total</p>
              <p className="text-xl font-bold text-green-800">
                KES {totalWithDiscounts.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Detailed Breakdown */}
          <AnimatePresence>
            {showDetails && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="border-t border-green-200 pt-3 space-y-2"
              >
                {appliedDiscounts.map((discount, index) => (
                  <motion.div
                    key={`${discount.productId}-${discount.campaignId}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white rounded-lg p-3 border border-green-200"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm text-neutral-900 truncate">
                        {discount.productName}
                      </h4>
                      <div className="flex items-center gap-1">
                        {discount.discountType === 'percentage' && <Percent className="w-3 h-3 text-green-600" />}
                        {discount.discountType === 'fixed_amount' && <DollarSign className="w-3 h-3 text-green-600" />}
                        {discount.discountType === 'buy_x_get_y' && <Gift className="w-3 h-3 text-green-600" />}
                        {discount.discountType === 'bundle' && <Package className="w-3 h-3 text-green-600" />}
                      </div>
                    </div>
                    
                    <p className="text-xs text-green-700 mb-2">{discount.description}</p>
                    
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-neutral-500">Original:</span>
                        <p className="font-medium">KES {(discount.originalPrice * discount.quantity).toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-neutral-500">Discount:</span>
                        <p className="font-medium text-red-600">-KES {discount.savings.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-neutral-500">Final:</span>
                        <p className="font-medium text-green-600">KES {(discount.finalPrice * discount.quantity).toLocaleString()}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
};

export default DiscountCalculator;