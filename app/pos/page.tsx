import { PosClient, type Product } from '@/app/pos/PosClient';
import { isMissingColumn, supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export default async function POSPage({ searchParams }: { searchParams: Promise<{ folio?: string; error?: string }> }) {
  const { folio, error } = await searchParams;
  let result: Awaited<ReturnType<typeof supabase.from>> | any = await supabase
    .from('inventory_items')
    .select('id, name, category, stock, min_stock, cost_price, sale_price, image_url')
    .gt('stock', 0)
    .order('name');

  if (isMissingColumn(result.error, 'image_url')) {
    result = await supabase
      .from('inventory_items')
      .select('id, name, category, stock, min_stock, cost_price, sale_price')
      .gt('stock', 0)
      .order('name');
  }

  return <PosClient products={(result.data ?? []) as Product[]} folio={folio} error={error} />;
}
