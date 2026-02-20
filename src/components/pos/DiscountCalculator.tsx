import React, { useState, useEffect } from 'react';
import { Tag, Percent, DollarSign, Gift, Package, ChevronDown, Sparkles } from 'lucide-react';
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

// ── Discount type icon + label ────────────────────────────────────────────────
const DISCOUNT_TYPE_CFG: Record<string, { Icon: React.FC<any>; label: string; cls: string }> = {
  percentage:    { Icon: Percent,     label: '% Off',   cls: 'bg-violet-50 text-violet-600' },
  fixed_amount:  { Icon: DollarSign,  label: 'Fixed',   cls: 'bg-sky-50 text-sky-600'       },
  buy_x_get_y:   { Icon: Gift,        label: 'BOGO',    cls: 'bg-amber-50 text-amber-600'   },
  bundle:        { Icon: Package,     label: 'Bundle',  cls: 'bg-rose-50 text-rose-600'     },
};

const DiscountCalculator: React.FC<DiscountCalculatorProps> = ({
  cartItems,
  onDiscountApplied,
  userId,
}) => {
  const [appliedDiscounts, setAppliedDiscounts] = useState<any[]>([]);
  const [loading, setLoading]                   = useState(false);
  const [showDetails, setShowDetails]           = useState(false);
  const { getProductDiscount }                  = useDiscounts();

  useEffect(() => { calculateDiscounts(); }, [cartItems, userId]);

  const calculateDiscounts = async () => {
    if (!cartItems?.length) {
      setAppliedDiscounts([]);
      onDiscountApplied([]);
      return;
    }
    setLoading(true);
    try {
      const discounts: any[] = [];
      for (const item of cartItems) {
        if (!item.product?.id) continue;
        try {
          const info = await getProductDiscount(item.product.id, item.quantity);
          if (info) {
            discounts.push({
              productId:    item.product.id,
              productName:  item.product.name,
              campaignId:   info.campaign_id,
              discountType: info.discount_type,
              originalPrice: info.original_price,
              discountAmount: info.discount_amount * item.quantity,
              finalPrice:   info.final_price,
              description:  info.offer_description,
              quantity:     item.quantity,
              savings:      info.discount_amount * item.quantity,
              type:         info.discount_type,
              buyQuantity:  info.buy_quantity,
              getQuantity:  info.get_quantity,
            });
          }
        } catch (err) {
          console.error(`Discount error for ${item.product.name}:`, err);
        }
      }
      setAppliedDiscounts(discounts);
      onDiscountApplied(discounts);
    } catch (err) {
      console.error('calculateDiscounts:', err);
      setAppliedDiscounts([]);
      onDiscountApplied([]);
    } finally {
      setLoading(false);
    }
  };

  const totalSavings       = appliedDiscounts.reduce((s, d) => s + d.savings, 0);
  const totalOriginal      = cartItems.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const totalWithDiscounts = totalOriginal - totalSavings;

  // Loading shimmer
  if (loading) {
    return (
      <div className="mx-2.5 mb-2.5 rounded-xl border border-neutral-100 bg-neutral-50 px-3.5 py-3 animate-pulse">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-neutral-200 rounded-full" />
          <div className="w-28 h-3 bg-neutral-200 rounded-full" />
          <div className="w-5 h-5 bg-neutral-100 rounded-full ml-auto" />
        </div>
        <div className="mt-2.5 flex gap-2">
          <div className="flex-1 h-8 bg-neutral-100 rounded-lg" />
          <div className="flex-1 h-8 bg-neutral-100 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!appliedDiscounts.length) return null;

  return (
    <div className="mx-2.5 mb-2.5">
      {/* ── Main pill ─────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 overflow-hidden">

        {/* Header row */}
        <button
          onClick={() => setShowDetails(v => !v)}
          className="w-full flex items-center gap-2 px-3.5 py-2.5 text-left
            hover:bg-emerald-100/60 active:bg-emerald-100 transition-colors touch-manipulation"
        >
          {/* Icon */}
          <div className="w-6 h-6 bg-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>

          {/* Label + count */}
          <span className="text-xs font-semibold text-emerald-800 flex-1">
            {appliedDiscounts.length} discount{appliedDiscounts.length !== 1 ? 's' : ''} applied
          </span>

          {/* Savings pill */}
          <span className="text-xs font-bold text-emerald-700 bg-emerald-100
            border border-emerald-200 px-2 py-0.5 rounded-full tabular-nums flex-shrink-0">
            -KES {totalSavings.toLocaleString()}
          </span>

          {/* Chevron */}
          <motion.div
            animate={{ rotate: showDetails ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="flex-shrink-0"
          >
            <ChevronDown className="w-3.5 h-3.5 text-emerald-600" />
          </motion.div>
        </button>

        {/* ── Expanded detail panel ──────────────────────────────────────── */}
        <AnimatePresence initial={false}>
          {showDetails && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="border-t border-emerald-200 px-3.5 pt-3 pb-3 space-y-2">

                {/* ── Per-product rows ──────────────────────────────────── */}
                {appliedDiscounts.map((d, idx) => {
                  const cfg = DISCOUNT_TYPE_CFG[d.discountType] ?? DISCOUNT_TYPE_CFG.percentage;
                  const { Icon: TypeIcon } = cfg;
                  return (
                    <motion.div
                      key={`${d.productId}-${d.campaignId}`}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.06, duration: 0.18 }}
                      className="bg-white rounded-lg border border-emerald-100 p-2.5"
                    >
                      {/* Product name + type badge */}
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <p className="text-xs font-semibold text-neutral-800 leading-snug flex-1 line-clamp-1">
                          {d.productName}
                        </p>
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md
                          text-[10px] font-semibold flex-shrink-0 ${cfg.cls}`}>
                          <TypeIcon className="w-2.5 h-2.5" />
                          {cfg.label}
                        </span>
                      </div>

                      {/* Description */}
                      <p className="text-[10px] text-emerald-700 mb-2 leading-snug">{d.description}</p>

                      {/* Price breakdown — 3 columns */}
                      <div className="grid grid-cols-3 gap-1 text-[10px]">
                        <div className="bg-neutral-50 rounded-md px-2 py-1.5">
                          <p className="text-neutral-400 mb-0.5">Original</p>
                          <p className="font-semibold text-neutral-700 tabular-nums">
                            KES {(d.originalPrice * d.quantity).toLocaleString()}
                          </p>
                        </div>
                        <div className="bg-red-50 rounded-md px-2 py-1.5">
                          <p className="text-red-400 mb-0.5">Saved</p>
                          <p className="font-semibold text-red-600 tabular-nums">
                            -KES {d.savings.toLocaleString()}
                          </p>
                        </div>
                        <div className="bg-emerald-50 rounded-md px-2 py-1.5">
                          <p className="text-emerald-500 mb-0.5">You pay</p>
                          <p className="font-semibold text-emerald-700 tabular-nums">
                            KES {(d.finalPrice * d.quantity).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}

                {/* ── Totals summary row ────────────────────────────────── */}
                <div className="bg-emerald-600 rounded-lg px-3 py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium text-emerald-200 mb-0.5">Total savings</p>
                    <p className="text-sm font-bold text-white tabular-nums">
                      KES {totalSavings.toLocaleString()}
                    </p>
                  </div>
                  <div className="w-px h-8 bg-emerald-500 flex-shrink-0" />
                  <div className="min-w-0 text-right">
                    <p className="text-[10px] font-medium text-emerald-200 mb-0.5">After discounts</p>
                    <p className="text-sm font-bold text-white tabular-nums">
                      KES {totalWithDiscounts.toLocaleString()}
                    </p>
                  </div>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default DiscountCalculator;
