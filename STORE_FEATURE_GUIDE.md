# Store Enhancement - Feature Guide

## Recently Viewed Products: How It Works

### For Users

#### Browsing Products
```
1. Open Shop Page
   ↓
2. Click on any product
   ↓
3. View product details
   ↓
4. Product automatically added to history
   ↓
5. Navigate back to Shop
   ↓
6. See product in "Recently Viewed" section
```

#### Accessing Recently Viewed
**Location:** Top of Shop page, above search bar

**View:** Grid of product cards (2-6 per row depending on screen size)

**Information Shown:**
- Product image (with zoom on hover)
- Product name
- Product price (KES format)

**Actions:**
- Click any card to view full product details
- Click "X" button to clear entire history
- Hover for "View" text overlay

#### On Different Devices

**Mobile Phone:**
- 2 columns wide
- Compact spacing
- Large touch targets
- Full-width layout

**Tablet:**
- 3-4 columns
- Medium spacing
- Touch optimized

**Desktop:**
- 6 columns
- Spacious layout
- Smooth hover animations

### For Developers

#### Using the Store

**Track a Product View:**
```typescript
import { useStore } from '../store';
import { Product } from '../types';

// In your component
const addViewedProduct = useStore((state) => state.addViewedProduct);

// When product is viewed
const handleViewProduct = (product: Product) => {
  addViewedProduct(product);
};
```

**Get Recently Viewed Products:**
```typescript
// Get last 5 products
const recentlyViewed = useStore((state) => state.getRecentlyViewed(5));

// Get all stored products (up to 20)
const allViewed = useStore((state) => state.getRecentlyViewed());

// Render them
{recentlyViewed.map(product => (
  <div key={product.id}>
    {product.name} - KES {product.price}
  </div>
))}
```

**Clear History:**
```typescript
const clearViewHistory = useStore((state) => state.clearViewHistory);
clearViewHistory();
```

**Manage Quick View (Future):**
```typescript
const setSelectedProduct = useStore((state) => state.setSelectedProduct);
const setShowQuickView = useStore((state) => state.setShowQuickView);

// Open quick view
setSelectedProduct('product-id');
setShowQuickView(true);

// Close quick view
setShowQuickView(false);
setSelectedProduct(null);
```

### Data Model

```typescript
interface ViewedProduct {
  id: string;              // Product ID
  name: string;            // Product name
  image_url: string;       // Product image URL
  price: number;           // Product price (KES)
  viewedAt: number;        // Unix timestamp of when viewed
}
```

### Storage Details

**Where:** Browser localStorage
**Key:** 'penchic-farm-storage'
**Size:** ~5-10KB for 20 products
**Persistence:** Survives page reloads and browser sessions

**Storage Format:**
```json
{
  "state": {
    "viewedProducts": [
      {
        "id": "prod-001",
        "name": "Organic Eggs",
        "image_url": "https://images.example.com/eggs.jpg",
        "price": 350,
        "viewedAt": 1708137600000
      }
    ]
  }
}
```

## Component Structure

### RecentlyViewed Component

**Location:** `/src/components/RecentlyViewed.tsx`

**Props:** None (uses Zustand store directly)

**Exports:** Single default component

**Features:**
- Responsive grid layout
- Product cards with images
- Clear history button
- Graceful empty state handling
- Smooth animations

**Internal Structure:**
```typescript
RecentlyViewed
├── Header (with History icon + Clear button)
├── Grid Container
│   └── Product Cards (map over recently viewed)
│       ├── Image container
│       ├── Product info
│       └── Hover overlay
└── Empty state (hidden if no products)
```

### Integration Points

**Used in:** `/src/pages/Shop.tsx`
**Line:** `<RecentlyViewed />`
**Position:** Top of page, above search bar
**Display:** Only shows if products viewed

**Triggered in:** `/src/pages/ProductDetails.tsx`
**Line:** `useStore.getState().addViewedProduct(data);`
**When:** Product details page fully loaded

## Customization Options

### Change History Limit

Edit `/src/store/index.ts`:
```typescript
// Line 133: Change from 20 to desired limit
const updated = [viewed, ...filtered].slice(0, 20);  // Change this number
```

### Change Display Count

Edit `/src/components/RecentlyViewed.tsx`:
```typescript
// Line 13: Change from 6 to desired count
const recentlyViewed = useStore((state) => state.getRecentlyViewed(6));  // Change this number
```

### Customize Grid Columns

Edit `/src/components/RecentlyViewed.tsx`:
```tsx
// Line 26: Modify grid classes
<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 p-4">
  {/*
  grid-cols-2:      Mobile - 2 columns (change to grid-cols-1 for 1 column)
  sm:grid-cols-3:   Tablet - 3 columns (change to sm:grid-cols-2 for 2 columns)
  md:grid-cols-4:   Tablet - 4 columns (change to md:grid-cols-3 for 3 columns)
  lg:grid-cols-6:   Desktop - 6 columns (change to lg:grid-cols-4 for 4 columns)
  gap-4:            Spacing between items (change to gap-2 for tighter, gap-6 for looser)
  */}
</div>
```

### Style Customization

All styling uses Tailwind CSS and can be modified:

```tsx
// Colors (in RecentlyViewed.tsx)
<div className="bg-white">  {/* Change to bg-blue-50, etc */}
<p className="text-primary">  {/* Change to text-red-600, etc */}
<div className="hover:bg-neutral-50">  {/* Change hover color */}

// Sizing
"w-full h-full" {/* Change dimensions */}
"rounded-lg" {/* Change to rounded-xl, rounded-full, etc */}
"p-4" {/* Change padding from p-2 to p-6, etc */}

// Animations
"hover:scale-110 transition-transform duration-300"
{/* Modify scale, duration, animation properties */}
```

## Future Enhancements

### Quick View Modal
Use existing `selectedProductId` and `showQuickView` state:

```typescript
// Example implementation
const QuickViewModal = () => {
  const selectedProductId = useStore((state) => state.selectedProductId);
  const showQuickView = useStore((state) => state.showQuickView);

  if (!showQuickView || !selectedProductId) return null;

  return <Modal productId={selectedProductId} />;
};
```

### Wishlist Feature
Extend ViewedProduct interface:

```typescript
interface ViewedProduct {
  id: string;
  name: string;
  image_url: string;
  price: number;
  viewedAt: number;
  isFavorite?: boolean;  // Add this
}
```

### Analytics Integration
Track viewing patterns:

```typescript
// In addViewedProduct
const trackViewEvent = (product: Product) => {
  // Send to analytics service
  analytics.track('product_viewed', {
    productId: product.id,
    productName: product.name,
    productPrice: product.price,
    timestamp: Date.now()
  });
};
```

### Personalized Recommendations
Use viewing history:

```typescript
const getRecommendations = () => {
  const viewed = useStore((state) => state.getRecentlyViewed());
  // Fetch products similar to viewed items
  // Return recommendations based on category, price range, etc
};
```

## Performance Considerations

### Storage Efficiency
- Max 20 products stored
- Each product ~250 bytes
- Total: ~5KB for full history
- Minimal impact on app performance

### Rendering Performance
- Grid uses CSS for responsive layout
- No re-renders on hover (CSS-based animations)
- Images lazy-loaded with next-gen optimization
- Component memoized to prevent unnecessary updates

### Network Efficiency
- No API calls for viewing history
- Uses browser localStorage (instant access)
- No server-side tracking required
- Minimal bandwidth usage

## Troubleshooting

### Recently Viewed Not Showing

**Issue:** Component visible but empty
**Solution:** Products only show after viewing at least one product

**Issue:** Products disappear after refresh
**Solution:** Check browser settings - localStorage might be disabled

### History Not Persisting

**Issue:** Viewing history cleared on page reload
**Solution:** Enable localStorage in browser settings

**Issue:** Different devices show different history
**Solution:** This is expected - localStorage is device-specific

### Styling Issues

**Issue:** Grid not responsive
**Solution:** Ensure Tailwind CSS is properly built

**Issue:** Images not displaying
**Solution:** Check product image_url values in database

### Performance Issues

**Issue:** Slow loading with many viewed products
**Solution:** Reduce history limit from 20 to lower number

**Issue:** Memory usage high
**Solution:** Implement clearViewHistory() on logout

## API Reference

### Store Methods

#### `addViewedProduct(product: Product)`
- **Parameters:** Product object with id, name, image_url, price
- **Returns:** void
- **Behavior:** Adds product to history, removes duplicates, maintains chronological order
- **Example:**
  ```typescript
  const product = { id: '123', name: 'Eggs', image_url: '...', price: 350 };
  useStore.getState().addViewedProduct(product);
  ```

#### `getRecentlyViewed(limit?: number)`
- **Parameters:** Optional limit (default: all, max: 20)
- **Returns:** Array of ViewedProduct objects
- **Example:**
  ```typescript
  const recent5 = useStore((state) => state.getRecentlyViewed(5));
  ```

#### `clearViewHistory()`
- **Parameters:** None
- **Returns:** void
- **Example:**
  ```typescript
  useStore.getState().clearViewHistory();
  ```

#### `setSelectedProduct(productId: string | null)`
- **Parameters:** Product ID string or null
- **Returns:** void
- **Example:**
  ```typescript
  useStore.getState().setSelectedProduct('prod-123');
  ```

#### `setShowQuickView(show: boolean)`
- **Parameters:** Boolean
- **Returns:** void
- **Example:**
  ```typescript
  useStore.getState().setShowQuickView(true);
  ```

---

**Last Updated:** February 17, 2026
**Status:** Production Ready ✓
**Version:** 1.0.0
