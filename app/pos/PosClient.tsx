'use client';

import { checkoutSale } from '@/lib/actions';
import { productImage } from '@/lib/utils';
import { Search, ShoppingCart, Trash2, Plus, Minus, CreditCard, Banknote, CheckCircle } from 'lucide-react';
import { useMemo, useState } from 'react';

export type Product = {
  id: string;
  name: string;
  category: string | null;
  stock: number;
  min_stock: number;
  cost_price: number;
  sale_price: number;
  image_url: string | null;
};

type CartItem = {
  product: Product;
  quantity: number;
};

function normalizeProduct(product: Partial<Product>): Product | null {
  if (!product.id || !product.name) return null;

  return {
    id: String(product.id),
    name: String(product.name),
    category: product.category ?? null,
    stock: Number(product.stock ?? 0),
    min_stock: Number(product.min_stock ?? 0),
    cost_price: Number(product.cost_price ?? 0),
    sale_price: Number(product.sale_price ?? 0),
    image_url: product.image_url ?? null,
  };
}

export function PosClient({ products = [], folio, error }: { products?: Product[]; folio?: string; error?: string }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const safeProducts = useMemo(() => (Array.isArray(products) ? products.map(normalizeProduct).filter((product): product is Product => Boolean(product)) : []), [products]);

  const filteredProducts = useMemo(
    () =>
      safeProducts.filter((product) => {
        const target = `${product.name} ${product.category ?? ''}`.toLowerCase();
        return target.includes(searchTerm.toLowerCase());
      }),
    [safeProducts, searchTerm],
  );

  const addToCart = (product: Product) => {
    if (product.stock <= 0) return;
    setCart((current) => {
      const existing = current.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return current;
        return current.map((item) => (item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
      }
      return [...current, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((current) =>
      current.map((item) => {
        if (item.product.id !== productId) return item;
        const nextQuantity = item.quantity + delta;
        if (nextQuantity < 1 || nextQuantity > item.product.stock) return item;
        return { ...item, quantity: nextQuantity };
      }),
    );
  };

  const payload = JSON.stringify(
    cart.map((item) => ({
      id: item.product.id,
      name: item.product.name,
      quantity: item.quantity,
      stock: item.product.stock,
      costPrice: Number(item.product.cost_price),
      salePrice: Number(item.product.sale_price),
      imageUrl: item.product.image_url,
    })),
  );

  const cartTotal = cart.reduce((sum, item) => sum + Number(item.product.sale_price) * item.quantity, 0);
  const cartCost = cart.reduce((sum, item) => sum + Number(item.product.cost_price) * item.quantity, 0);
  const cartProfit = cartTotal - cartCost;

  return (
    <div className="relative flex h-[calc(100vh-4rem)] flex-col overflow-hidden bg-slate-50/50 lg:flex-row">
      {folio && (
        <div className="fixed inset-x-4 top-20 z-50 mx-auto max-w-sm rounded-2xl border border-green-200 bg-white p-4 text-center shadow-xl">
          <CheckCircle className="mx-auto mb-2 h-8 w-8 text-green-600" />
          <p className="font-black text-slate-900">Venta registrada</p>
          <p className="text-sm text-slate-500">Folio #{folio}</p>
        </div>
      )}

      {error && (
        <div className="fixed inset-x-4 top-20 z-50 mx-auto max-w-xl rounded-2xl border border-amber-200 bg-white p-4 text-center shadow-xl">
          <p className="font-black text-amber-900">No se pudo registrar la venta</p>
          <p className="mt-1 text-sm text-amber-700">{error}</p>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden p-4 md:p-6 lg:p-8">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Punto de Venta</h1>
            <p className="mt-1 text-sm text-slate-500">Selecciona productos del inventario para generar la venta y descontar stock automaticamente.</p>
          </div>
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar producto..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full rounded-full bg-white py-3 pl-11 pr-4 text-sm font-medium text-slate-700 shadow-sm outline-none transition-all focus:ring-4 focus:ring-blue-100"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredProducts.map((product) => {
              const profit = Number(product.sale_price) - Number(product.cost_price);
              return (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  disabled={product.stock <= 0}
                  className="group rounded-xl border border-slate-100 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <span
                      className="h-14 w-14 flex-shrink-0 rounded-lg bg-slate-100 bg-cover bg-center"
                      style={{ backgroundImage: `url(${product.image_url ?? productImage(product.category)})` }}
                    />
                    <div>
                      <p className="line-clamp-2 text-sm font-extrabold text-slate-800">{product.name}</p>
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{product.category ?? 'General'}</p>
                    </div>
                    <span className="rounded-full bg-blue-50 p-2 text-blue-600">
                      <Plus className="h-4 w-4" />
                    </span>
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-2xl font-black text-slate-900">${Number(product.sale_price).toFixed(2)}</p>
                      <p className="text-xs font-bold text-green-600">Utilidad ${profit.toFixed(2)}</p>
                    </div>
                    <p className="text-xs font-bold text-slate-500">Stock {product.stock}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {filteredProducts.length === 0 && (
            <div className="py-20 text-center text-slate-500">
              <ShoppingCart className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              <p className="font-medium text-slate-600">No hay productos disponibles.</p>
              <p className="mt-1 text-sm text-slate-400">Carga inventario para comenzar a vender.</p>
            </div>
          )}
        </div>
      </div>

      <form action={checkoutSale} onSubmit={() => setIsSubmitting(true)} className="z-20 flex h-[58vh] w-full flex-col border-t border-slate-100 bg-white shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] lg:h-auto lg:w-[430px] lg:border-l lg:border-t-0 lg:shadow-none">
        <input type="hidden" name="payload" value={payload} />
        <div className="flex items-center gap-3 border-b border-slate-100 p-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <ShoppingCart className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-extrabold text-slate-900">Venta Actual</h2>
            <p className="text-xs font-bold text-slate-500">{cart.reduce((sum, item) => sum + item.quantity, 0)} articulos</p>
          </div>
        </div>

        <div className="border-b border-slate-100 bg-white p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Datos para la factura</p>
          <div className="grid grid-cols-2 gap-2">
            <input name="customerName" placeholder="Cliente / razon social" className="col-span-2 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
            <input name="customerDocument" placeholder="NIT / Cedula" className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
            <input name="customerPhone" placeholder="WhatsApp" className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
            <input name="customerEmail" type="email" placeholder="Correo" className="col-span-2 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/30 p-4">
          {cart.length > 0 && (
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
              <p className="text-xs font-black uppercase tracking-wider text-blue-700">Vista previa de factura</p>
              <p className="mt-1 text-xs text-blue-700">
                Revisa productos, cantidades, total y datos del cliente antes de cobrar.
              </p>
            </div>
          )}

          {cart.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
              <ShoppingCart className="mb-4 h-10 w-10 text-slate-300" />
              <p className="font-bold text-slate-700">Carrito vacio</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.product.id} className="group flex gap-3 rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                <span
                  className="h-14 w-14 flex-shrink-0 rounded-lg bg-slate-100 bg-cover bg-center"
                  style={{ backgroundImage: `url(${item.product.image_url ?? productImage(item.product.category)})` }}
                />
                <div className="flex-1 min-w-0">
                  <div className="mb-2 flex items-start justify-between">
                    <p className="truncate pr-2 text-sm font-bold text-slate-800">{item.product.name}</p>
                    <button type="button" onClick={() => setCart((current) => current.filter((cartItem) => cartItem.product.id !== item.product.id))} className="text-slate-300 hover:text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center rounded-lg border border-slate-100 bg-slate-50 p-0.5 text-slate-700">
                      <button type="button" onClick={() => updateQuantity(item.product.id, -1)} className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-white">
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-7 text-center text-xs font-bold">{item.quantity}</span>
                      <button type="button" onClick={() => updateQuantity(item.product.id, 1)} className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-white">
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <span className="font-bold text-slate-900">${(Number(item.product.sale_price) * item.quantity).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-slate-100 bg-white p-6">
          {cart.length > 0 && (
            <div className="mb-6 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-slate-500">Subtotal</span>
                <span className="font-bold text-slate-700">${cartTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-medium text-slate-500">Costo</span>
                <span className="font-bold text-slate-700">${cartCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between rounded-lg bg-green-50/50 p-2 text-sm">
                <span className="font-bold text-green-600">Utilidad</span>
                <span className="font-bold text-green-600">+${cartProfit.toFixed(2)}</span>
              </div>
              <div className="flex items-end justify-between border-t border-slate-100 pt-4">
                <span className="text-sm font-extrabold uppercase tracking-widest text-slate-900">Total</span>
                <span className="text-3xl font-black text-blue-600">${cartTotal.toFixed(2)}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button name="paymentMethod" value="cash" disabled={cart.length === 0 || isSubmitting} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-4 font-bold text-white shadow-lg shadow-slate-900/20 transition-all hover:bg-slate-800 disabled:opacity-30">
              <Banknote className="h-5 w-5" />
              {isSubmitting ? 'Cobrando...' : 'Efectivo'}
            </button>
            <button name="paymentMethod" value="card" disabled={cart.length === 0 || isSubmitting} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-4 font-bold text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-700 disabled:opacity-30">
              <CreditCard className="h-5 w-5" />
              {isSubmitting ? 'Cobrando...' : 'Tarjeta'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
