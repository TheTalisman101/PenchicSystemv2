import React from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store';
import { ChevronRight, History, X } from 'lucide-react';

const RecentlyViewed = () => {
  const recentlyViewed = useStore((state) => state.getRecentlyViewed(6));
  const clearViewHistory = useStore((state) => state.clearViewHistory);

  if (recentlyViewed.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
      <div className="flex items-center justify-between p-6 border-b border-neutral-200">
        <div className="flex items-center gap-3">
          <History className="w-5 h-5 text-neutral-700" />
          <h3 className="text-lg font-semibold text-neutral-900">Recently Viewed</h3>
        </div>
        <button
          onClick={clearViewHistory}
          className="p-1.5 hover:bg-neutral-100 rounded-lg transition-colors text-neutral-500 hover:text-neutral-700"
          title="Clear history"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 p-4">
        {recentlyViewed.map((product) => (
          <Link
            key={product.id}
            to={`/product/${product.id}`}
            className="group flex flex-col gap-2 p-3 rounded-lg hover:bg-neutral-50 transition-all"
          >
            <div className="relative aspect-square overflow-hidden rounded-lg bg-neutral-100 border border-neutral-200">
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-neutral-900 truncate group-hover:text-primary transition-colors">
                {product.name}
              </p>
              <p className="text-xs text-neutral-600 font-semibold">
                KES {product.price.toLocaleString('en-KE')}
              </p>
            </div>
            <div className="flex items-center text-primary opacity-0 group-hover:opacity-100 transition-opacity text-xs font-medium">
              View <ChevronRight className="w-3 h-3 ml-1" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default RecentlyViewed;
