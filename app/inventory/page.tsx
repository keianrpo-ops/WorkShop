import { Card, CardContent } from '@/components/ui/card';
import { createInventoryItem } from '@/lib/actions';
import { isMissingColumn, supabase } from '@/lib/supabase';
import { productImage } from '@/lib/utils';
import { AlertTriangle, Package, Plus } from 'lucide-react';

export const dynamic = 'force-dynamic';

type InventoryItem = {
  id: string;
  name: string;
  category: string | null;
  stock: number;
  min_stock: number;
  cost_price: number;
  sale_price: number;
  image_url: string | null;
};

async function getInventory() {
  let result: Awaited<ReturnType<typeof supabase.from>> | any = await supabase.from('inventory_items').select('id, name, category, stock, min_stock, cost_price, sale_price, image_url').order('name');
  if (isMissingColumn(result.error, 'image_url')) {
    result = await supabase.from('inventory_items').select('id, name, category, stock, min_stock, cost_price, sale_price').order('name');
  }
  const { data, error } = result;
  return { items: (data ?? []) as InventoryItem[], error: error?.message ?? null };
}

export default async function InventoryPage() {
  const { items, error } = await getInventory();
  const totalGrossProfit = items.reduce((sum, item) => sum + (Number(item.sale_price) - Number(item.cost_price)) * Number(item.stock), 0);

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">Inventario y Repuestos</h1>
          <p className="text-slate-500">Productos reales disponibles para venta y consumo del taller, con margen para informes financieros.</p>
        </div>
        <div className="rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-right">
          <p className="text-[10px] font-bold uppercase tracking-wider text-green-700">Utilidad bruta potencial</p>
          <p className="text-2xl font-black text-green-800">COP ${totalGrossProfit.toFixed(2)}</p>
        </div>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <form action={createInventoryItem} className="grid gap-3 md:grid-cols-8">
            <input name="name" required placeholder="Producto" className="rounded border border-slate-300 px-3 py-2 text-sm md:col-span-2" />
            <input name="category" placeholder="Categoria" className="rounded border border-slate-300 px-3 py-2 text-sm" />
            <input name="stock" type="number" min="0" placeholder="Stock" className="rounded border border-slate-300 px-3 py-2 text-sm" />
            <input name="minStock" type="number" min="0" placeholder="Minimo" className="rounded border border-slate-300 px-3 py-2 text-sm" />
            <input name="costPrice" type="number" min="0" step="0.01" placeholder="Costo" className="rounded border border-slate-300 px-3 py-2 text-sm" />
            <input name="salePrice" type="number" min="0" step="0.01" placeholder="Venta" className="rounded border border-slate-300 px-3 py-2 text-sm" />
            <input name="image" type="file" accept="image/*" className="rounded border border-slate-300 bg-white px-3 py-2 text-sm md:col-span-2 lg:col-span-1" />
            <button className="flex items-center justify-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 md:col-span-8 lg:col-span-1">
              <Plus className="h-4 w-4" />
              Agregar
            </button>
          </form>
        </CardContent>
      </Card>

      {error && (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <CardContent className="p-4 text-sm text-amber-800">{error}</CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full whitespace-nowrap text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 font-medium text-slate-500">
              <tr>
                <th className="px-6 py-4">Producto</th>
                <th className="px-6 py-4">Categoria</th>
                <th className="px-6 py-4">Stock Actual</th>
                <th className="px-6 py-4">Stock Minimo</th>
                <th className="px-6 py-4 text-right">Costo</th>
                <th className="px-6 py-4 text-right">Venta</th>
                <th className="px-6 py-4 text-right">Utilidad Bruta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => {
                const isLowStock = item.stock <= item.min_stock;
                const grossProfitUnit = Number(item.sale_price) - Number(item.cost_price);
                const grossProfitStock = grossProfitUnit * Number(item.stock);
                return (
                  <tr key={item.id} className="transition-colors hover:bg-slate-50">
                    <td className="px-6 py-4 font-bold text-slate-800">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-slate-400" />
                        <span
                          className="h-10 w-10 rounded bg-slate-100 bg-cover bg-center"
                          style={{ backgroundImage: `url(${item.image_url ?? productImage(item.category)})` }}
                        />
                        {item.name}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded-md border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-700">
                        {item.category ?? 'General'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={isLowStock ? 'font-bold text-red-600' : 'font-bold text-slate-800'}>{item.stock} u.</span>
                        {isLowStock && <AlertTriangle className="h-4 w-4 text-red-500" />}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500">{item.min_stock} u.</td>
                    <td className="px-6 py-4 text-right text-slate-500">${Number(item.cost_price).toFixed(2)}</td>
                    <td className="px-6 py-4 text-right font-medium text-slate-800">${Number(item.sale_price).toFixed(2)}</td>
                    <td className="px-6 py-4 text-right">
                      <p className="font-bold text-green-700">${grossProfitUnit.toFixed(2)}</p>
                      <p className="text-[10px] text-slate-400">Stock: ${grossProfitStock.toFixed(2)}</p>
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    No hay productos cargados. Agrega el primer repuesto para usar el punto de venta.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="mt-6 text-sm text-slate-500">Mostrando {items.length} productos reales</div>
    </div>
  );
}
