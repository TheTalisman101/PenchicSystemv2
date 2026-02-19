import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { supabase } from '../../lib/supabase';
import AdminLayout from '../../components/admin/AdminLayout';
import {
  Plus, Pencil, Trash2, Search, Package2, Upload,
  X, CheckCircle, AlertCircle, Filter, RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Types ──────────────────────────────────────────────────────────────────────
interface Product {
  id: string; name: string; description: string;
  price: number; category: string; stock: number;
  image_url: string; created_at: string;
}
interface FormData {
  name: string; description: string; price: string;
  category: string; stock: string; image: File | null;
}
interface Toast { message: string; type: 'success' | 'error' }

// ── Product image with fallback ────────────────────────────────────────────────
const ProductImage: React.FC<{ src?: string; alt: string }> = ({ src, alt }) => {
  const [err, setErr] = useState(false);
  if (!src || err) return (
    <div className="w-full h-full flex items-center justify-center bg-neutral-50">
      <Package2 className="w-7 h-7 sm:w-10 sm:h-10 text-neutral-200" />
    </div>
  );
  return (
    <img src={src} alt={alt} onError={() => setErr(true)}
      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
  );
};

// ── Skeleton card ──────────────────────────────────────────────────────────────
const ProductCardSkeleton = () => (
  <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden animate-pulse">
    <div className="aspect-square bg-neutral-200" />
    <div className="p-3 sm:p-4 space-y-1.5 sm:space-y-2">
      <div className="w-14 sm:w-16 h-3 sm:h-3.5 bg-neutral-100 rounded-full" />
      <div className="w-3/4 h-3.5 sm:h-4 bg-neutral-200 rounded-full" />
      <div className="w-2/5 h-4 sm:h-5 bg-neutral-200 rounded-full" />
      <div className="w-full h-6 sm:h-7 bg-neutral-100 rounded-lg mt-1.5 sm:mt-2" />
    </div>
  </div>
);

// ── Inline field error ─────────────────────────────────────────────────────────
const FieldError: React.FC<{ msg?: string }> = ({ msg }) =>
  msg ? <p className="text-[11px] text-red-500 mt-1 font-medium">{msg}</p> : null;

// ── Input className helper ─────────────────────────────────────────────────────
const inputCls = (err?: string) =>
  `w-full px-3 sm:px-3.5 py-2 sm:py-2.5 border rounded-xl text-sm text-neutral-800 placeholder:text-neutral-400 bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900/[0.06] transition-all ${
    err ? 'border-red-300 bg-red-50/30' : 'border-neutral-200 focus:border-neutral-300'
  }`;

// ── Stock badge ────────────────────────────────────────────────────────────────
const stockBadge = (stock: number) => {
  if (stock > 10) return { cls: 'bg-emerald-100/90 text-emerald-700', label: `${stock} in stock` };
  if (stock > 0)  return { cls: 'bg-amber-100/90  text-amber-700',   label: `${stock} left`     };
  return               { cls: 'bg-red-100/90    text-red-700',       label: 'Out of stock'       };
};

// ── Main component ─────────────────────────────────────────────────────────────
const Products = () => {
  const navigate = useNavigate();
  const user     = useStore((s) => s.user);
  const dropRef  = useRef<HTMLDivElement>(null);

  const [products,        setProducts]        = useState<Product[]>([]);
  const [loadingProds,    setLoadingProds]    = useState(true);
  const [submitting,      setSubmitting]      = useState(false);
  const [editingProduct,  setEditingProduct]  = useState<Product | null>(null);
  const [showForm,        setShowForm]        = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [searchTerm,      setSearchTerm]      = useState('');
  const [categoryFilter,  setCategoryFilter]  = useState('all');
  const [toast,           setToast]           = useState<Toast | null>(null);
  const [imagePreview,    setImagePreview]    = useState<string | null>(null);
  const [isDragging,      setIsDragging]      = useState(false);
  const [fieldErrors,     setFieldErrors]     = useState<Partial<Record<keyof FormData, string>>>({});
  const [formData,        setFormData]        = useState<FormData>({
    name: '', description: '', price: '', category: '', stock: '', image: null,
  });

  useEffect(() => {
    if (!user || user.role !== 'admin') navigate('/');
  }, [user, navigate]);

  useEffect(() => { fetchProducts(); }, []);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const showToast = (message: string, type: Toast['type']) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), type === 'error' ? 5000 : 3000);
  };

  const applyImage = (file: File) => {
    setFormData(f => ({ ...f, image: file }));
    setFieldErrors(fe => ({ ...fe, image: undefined }));
    const reader = new FileReader();
    reader.onload = e => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const updateField = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setFormData(f => ({ ...f, [key]: value }));
    setFieldErrors(fe => ({ ...fe, [key]: undefined }));
  };

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (!formData.name.trim())                                  e.name        = 'Product name is required';
    if (!formData.price || parseFloat(formData.price) <= 0)    e.price       = 'Enter a valid price greater than 0';
    if (!formData.category.trim())                              e.category    = 'Category is required';
    if (formData.stock === '' || parseInt(formData.stock) < 0) e.stock       = 'Enter a valid stock quantity (≥ 0)';
    if (!formData.description.trim())                          e.description = 'Description is required';
    if (!editingProduct && !formData.image)                    e.image       = 'Product image is required';
    setFieldErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Data ───────────────────────────────────────────────────────────────────
  const fetchProducts = async () => {
    setLoadingProds(true);
    try {
      const { data, error } = await supabase
        .from('products').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setProducts(data ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingProds(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      let imageUrl = editingProduct?.image_url ?? '';
      if (formData.image) {
        const ext      = formData.image.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${ext}`;
        const { data: imgData, error: imgErr } = await supabase.storage
          .from('products').upload(`images/${fileName}`, formData.image);
        if (imgErr) throw imgErr;
        const { data: { publicUrl } } = supabase.storage.from('products').getPublicUrl(imgData.path);
        imageUrl = publicUrl;
      }
      const payload = {
        name: formData.name.trim(), description: formData.description.trim(),
        price: parseFloat(formData.price), category: formData.category.trim(),
        stock: parseInt(formData.stock), image_url: imageUrl,
      };
      if (editingProduct) {
        const { error } = await supabase.from('products').update(payload).eq('id', editingProduct.id);
        if (error) throw error;
        showToast('Product updated successfully', 'success');
      } else {
        const { error } = await supabase.from('products').insert([payload]);
        if (error) throw error;
        showToast('Product added successfully', 'success');
      }
      resetForm(); fetchProducts();
    } catch (err) {
      console.error(err);
      showToast('Failed to save product. Please try again.', 'error');
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (productId: string) => {
    setSubmitting(true);
    try {
      const { error } = await supabase.from('products').delete().eq('id', productId);
      if (error) throw error;
      setProducts(prev => prev.filter(p => p.id !== productId));
      setDeleteConfirmId(null);
      showToast('Product deleted', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to delete product.', 'error');
    } finally { setSubmitting(false); }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name, description: product.description,
      price: product.price.toString(), category: product.category,
      stock: product.stock.toString(), image: null,
    });
    setImagePreview(product.image_url ?? null);
    setFieldErrors({});
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', price: '', category: '', stock: '', image: null });
    setEditingProduct(null);
    setShowForm(false);
    setImagePreview(null);
    setFieldErrors({});
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const categories = ['all', ...Array.from(new Set(products.map(p => p.category)))];
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (categoryFilter === 'all' || p.category === categoryFilter)
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <AdminLayout title="Products" subtitle="Manage your product inventory">
      <div className="space-y-4 sm:space-y-6">

        {/* ── Toolbar ───────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5 sm:gap-3">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 flex-1 w-full sm:w-auto">

            {/* Search */}
            <div className="relative flex-1 sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-neutral-400 pointer-events-none" />
              <input
                type="text" placeholder="Search products…" value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-8 sm:pl-9 pr-8 sm:pr-9 py-2 sm:py-2.5 bg-white border border-neutral-200 rounded-xl text-sm text-neutral-800 placeholder:text-neutral-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/[0.06] focus:border-neutral-300 transition-all"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors">
                  <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>
              )}
            </div>

            {/* Category filter */}
            <div className="flex items-center gap-1.5 sm:gap-2 bg-white border border-neutral-200 rounded-xl px-2.5 sm:px-3 shadow-sm">
              <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-neutral-400 flex-shrink-0" />
              <select
                value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
                className="text-sm font-medium text-neutral-700 bg-transparent border-none outline-none py-2 sm:py-2.5 pr-1 cursor-pointer"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat === 'all' ? 'All categories' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Add button */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => { setFieldErrors({}); setShowForm(true); }}
            className="flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white text-sm font-medium rounded-xl transition-colors shadow-sm flex-shrink-0 w-full sm:w-auto justify-center sm:justify-start"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Add Product
          </motion.button>
        </div>

        {/* Results meta */}
        {!loadingProds && (
          <p className="text-xs text-neutral-400 font-medium -mt-1 sm:-mt-2">
            <span className="text-neutral-700 font-semibold">{filteredProducts.length}</span>
            {' '}of {products.length} product{products.length !== 1 ? 's' : ''}
            {categoryFilter !== 'all' && (
              <> in <span className="text-neutral-700">{categoryFilter}</span></>
            )}
          </p>
        )}

        {/* ── Product grid — 2-col on mobile ────────────────────────────────── */}
        {loadingProds ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
            {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
            {filteredProducts.map((product, idx) => {
              const { cls: sCls, label: sLabel } = stockBadge(product.stock);
              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx * 0.05, 0.35), duration: 0.28 }}
                  className="bg-white rounded-xl border border-neutral-200 overflow-hidden hover:shadow-lg hover:border-neutral-300 transition-all duration-200 group"
                >
                  {/* Image */}
                  <div className="relative aspect-square overflow-hidden bg-neutral-100">
                    <ProductImage src={product.image_url} alt={product.name} />

                    {/* Stock badge */}
                    <div className="absolute top-2 left-2">
                      <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[11px] font-semibold backdrop-blur-sm ${sCls}`}>
                        {/* Short label on mobile to save space */}
                        <span className="sm:hidden">
                          {product.stock > 10 ? `${product.stock}` : product.stock > 0 ? `${product.stock}` : 'Out'}
                        </span>
                        <span className="hidden sm:inline">{sLabel}</span>
                      </span>
                    </div>

                    {/* Action overlay:
                        - On desktop: hidden until hover
                        - On mobile: always visible (no hover state) */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-all duration-200 flex items-end justify-end p-2">
                      <div className="flex gap-1 sm:gap-1.5
                        opacity-100 translate-y-0
                        sm:opacity-0 sm:translate-y-1
                        sm:group-hover:opacity-100 sm:group-hover:translate-y-0
                        transition-all duration-200">
                        <button
                          onClick={e => { e.stopPropagation(); handleEdit(product); }}
                          className="p-1.5 sm:p-2 bg-white rounded-lg shadow-md text-neutral-600 hover:text-neutral-900 transition-colors"
                          title="Edit product"
                        >
                          <Pencil className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); setDeleteConfirmId(product.id); }}
                          className="p-1.5 sm:p-2 bg-white rounded-lg shadow-md text-red-500 hover:text-red-700 transition-colors"
                          title="Delete product"
                        >
                          <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Card body */}
                  <div className="p-3 sm:p-4">
                    <span className="inline-block px-1.5 sm:px-2 py-0.5 bg-neutral-100 text-neutral-500 text-[9px] sm:text-[10px] font-semibold uppercase tracking-wide rounded-full mb-1.5 sm:mb-2">
                      {product.category}
                    </span>
                    <h3 className="text-xs sm:text-sm font-semibold text-neutral-900 truncate leading-snug">
                      {product.name}
                    </h3>
                    <p className="text-sm sm:text-base font-bold text-primary mt-0.5">
                      KES {product.price.toLocaleString('en-KE')}
                    </p>
                    {/* Description hidden on mobile to keep cards tight */}
                    <p className="hidden sm:block text-xs text-neutral-400 line-clamp-2 mt-1.5 leading-relaxed">
                      {product.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          /* Empty state */
          <div className="flex flex-col items-center gap-3 sm:gap-4 py-14 sm:py-20 bg-white rounded-xl border border-neutral-200">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-neutral-100 rounded-2xl flex items-center justify-center">
              <Package2 className="w-6 h-6 sm:w-7 sm:h-7 text-neutral-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-neutral-700">
                {searchTerm || categoryFilter !== 'all' ? 'No products found' : 'No products yet'}
              </p>
              <p className="text-xs text-neutral-400 mt-1 max-w-[200px] sm:max-w-none">
                {searchTerm || categoryFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Get started by adding your first product'}
              </p>
            </div>
            {!searchTerm && categoryFilter === 'all' ? (
              <button onClick={() => setShowForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white text-sm font-medium rounded-xl hover:bg-neutral-800 transition-colors">
                <Plus className="w-4 h-4" /> Add Product
              </button>
            ) : (
              <button onClick={() => { setSearchTerm(''); setCategoryFilter('all'); }}
                className="text-xs font-medium text-neutral-600 hover:text-neutral-900 px-3 py-1.5 border border-neutral-200 hover:border-neutral-300 rounded-lg transition-all">
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Delete confirmation ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {deleteConfirmId && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1,    opacity: 1 }}
              exit={{    scale: 0.92, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 30 }}
              className="bg-white rounded-2xl p-5 sm:p-6 w-full max-w-sm shadow-2xl"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <Trash2 className="w-5 h-5 sm:w-6 sm:h-6 text-red-500" />
              </div>
              <h3 className="text-sm sm:text-base font-semibold text-neutral-900 text-center">Delete Product?</h3>
              <p className="text-xs sm:text-sm text-neutral-500 text-center mt-1.5 mb-5 sm:mb-6">
                This action is permanent and cannot be undone.
              </p>
              <div className="flex gap-2.5 sm:gap-3">
                <button
                  onClick={() => setDeleteConfirmId(null)} disabled={submitting}
                  className="flex-1 px-4 py-2 sm:py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirmId!)} disabled={submitting}
                  className="flex-1 px-4 py-2 sm:py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting
                    ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Deleting…</>
                    : 'Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Add / Edit form modal ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 sm:p-4"
          >
            <motion.div
              initial={{ scale: 0.93, opacity: 0, y: 40 }}
              animate={{ scale: 1,    opacity: 1, y: 0  }}
              exit={{    scale: 0.93, opacity: 0, y: 40 }}
              transition={{ type: 'spring', stiffness: 420, damping: 30 }}
              className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[96vh] sm:max-h-[92vh] overflow-y-auto shadow-2xl"
            >
              {/* Sticky header */}
              <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 bg-white/90 backdrop-blur-sm border-b border-neutral-100">
                {/* Drag handle on mobile */}
                <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-8 h-1 bg-neutral-200 rounded-full sm:hidden" />
                <div className="mt-3 sm:mt-0">
                  <h2 className="text-sm sm:text-base font-semibold text-neutral-900">
                    {editingProduct ? 'Edit Product' : 'Add New Product'}
                  </h2>
                  <p className="text-xs text-neutral-400 mt-0.5 hidden sm:block">
                    {editingProduct ? 'Update the product details' : 'Fill in the details to create a new product'}
                  </p>
                </div>
                <button onClick={resetForm}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors">
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">

                  {/* Name */}
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-500 mb-1.5 uppercase tracking-wider">
                      Product Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text" value={formData.name} placeholder="e.g. Free-Range Chicken"
                      onChange={e => updateField('name', e.target.value)}
                      className={inputCls(fieldErrors.name)}
                    />
                    <FieldError msg={fieldErrors.name} />
                  </div>

                  {/* Price */}
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-500 mb-1.5 uppercase tracking-wider">
                      Price <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 text-sm text-neutral-400 font-medium pointer-events-none">KES</span>
                      <input
                        type="number" value={formData.price} placeholder="0.00"
                        min="0.01" step="0.01"
                        onChange={e => updateField('price', e.target.value)}
                        className={`${inputCls(fieldErrors.price)} pl-11 sm:pl-12`}
                      />
                    </div>
                    <FieldError msg={fieldErrors.price} />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-500 mb-1.5 uppercase tracking-wider">
                      Category <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text" value={formData.category} placeholder="e.g. Poultry, Cattle, Fish"
                      onChange={e => updateField('category', e.target.value)}
                      className={inputCls(fieldErrors.category)}
                    />
                    <FieldError msg={fieldErrors.category} />
                  </div>

                  {/* Stock */}
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-500 mb-1.5 uppercase tracking-wider">
                      Stock Quantity <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="number" value={formData.stock} placeholder="0" min="0"
                      onChange={e => updateField('stock', e.target.value)}
                      className={inputCls(fieldErrors.stock)}
                    />
                    <FieldError msg={fieldErrors.stock} />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-500 mb-1.5 uppercase tracking-wider">
                    Description <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={formData.description} rows={3} placeholder="Describe the product…"
                    onChange={e => updateField('description', e.target.value)}
                    className={`${inputCls(fieldErrors.description)} resize-none`}
                  />
                  <FieldError msg={fieldErrors.description} />
                </div>

                {/* Image upload */}
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-500 mb-1.5 uppercase tracking-wider">
                    Product Image {!editingProduct && <span className="text-red-400">*</span>}
                  </label>
                  <div
                    ref={dropRef}
                    onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={e => {
                      e.preventDefault(); setIsDragging(false);
                      const file = e.dataTransfer.files[0];
                      if (file?.type.startsWith('image/')) applyImage(file);
                    }}
                    className={[
                      'border-2 border-dashed rounded-xl transition-all duration-200 overflow-hidden',
                      isDragging        ? 'border-neutral-500 bg-neutral-50 scale-[1.01]' :
                      fieldErrors.image ? 'border-red-300 bg-red-50/20'                    :
                      'border-neutral-200 hover:border-neutral-300',
                    ].join(' ')}
                  >
                    <input type="file" id="img-upload" accept="image/*" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) applyImage(f); }} />
                    <label htmlFor="img-upload" className="cursor-pointer block">
                      {imagePreview ? (
                        <div className="relative group/img">
                          <img src={imagePreview} alt="Preview"
                            className="w-full h-40 sm:h-52 object-cover" />
                          <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/35 flex items-center justify-center transition-all">
                            <span className="opacity-0 group-hover/img:opacity-100 transition-opacity text-white text-xs font-semibold bg-black/50 px-3 py-1.5 rounded-lg">
                              Click or drop to replace
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2.5 sm:gap-3 py-7 sm:py-9 px-4">
                          <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center transition-colors ${isDragging ? 'bg-neutral-200' : 'bg-neutral-100'}`}>
                            <Upload className="w-4 h-4 sm:w-5 sm:h-5 text-neutral-400" />
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-medium text-neutral-700">
                              {isDragging ? 'Drop to upload' : <><span className="hidden sm:inline">Drop an image here, or </span><span className="text-neutral-900 underline underline-offset-2">Browse files</span></>}
                            </p>
                            <p className="text-xs text-neutral-400 mt-1">PNG, JPG, WebP up to 10 MB</p>
                          </div>
                        </div>
                      )}
                    </label>
                  </div>
                  <FieldError msg={fieldErrors.image} />
                </div>

                {/* Actions */}
                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3 pt-3 sm:pt-4 border-t border-neutral-100">
                  <button type="button" onClick={resetForm} disabled={submitting}
                    className="px-5 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-sm font-medium rounded-xl transition-colors disabled:opacity-50">
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-60">
                    {submitting
                      ? <><RefreshCw className="w-4 h-4 animate-spin" />{editingProduct ? 'Updating…' : 'Adding…'}</>
                      : editingProduct ? 'Update Product' : 'Add Product'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Toast — full-width on mobile ───────────────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit={{    opacity: 0, y: 16, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={`fixed bottom-4 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 z-[70] flex items-center gap-2.5 sm:gap-3 px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-white shadow-lg shadow-neutral-900/10 border ${
              toast.type === 'success' ? 'border-emerald-200' : 'border-red-200'
            }`}
          >
            {toast.type === 'success'
              ? <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              : <AlertCircle className="w-4 h-4 text-red-500    flex-shrink-0" />}
            <span className={`text-sm font-medium flex-1 ${toast.type === 'success' ? 'text-emerald-700' : 'text-red-600'}`}>
              {toast.message}
            </span>
            <button onClick={() => setToast(null)} className="text-neutral-400 hover:text-neutral-600 transition-colors ml-1">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
};

export default Products;
