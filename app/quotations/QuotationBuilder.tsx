'use client';

import { createQuotation } from '@/lib/actions';
import { Plus, Save, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';

type CustomerOption = {
  id: string;
  name: string;
};

type WorkOrderOption = {
  id: string;
  label: string;
};

type QuotationLine = {
  id: string;
  category: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
};

const formatCOP = (value: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);

function newLine(index: number): QuotationLine {
  return {
    id: `line-${index}`,
    category: 'Mano de obra',
    description: index === 0 ? 'Cambio 1: ' : `Cambio ${index + 1}: `,
    quantity: 1,
    unitPrice: 0,
    taxRate: 0,
  };
}

function hasMeaningfulDescription(description: string) {
  return Boolean(description.trim()) && !/^Cambio\s+\d+\s*:\s*$/i.test(description.trim());
}

export function QuotationBuilder({ customers, workOrders }: { customers: CustomerOption[]; workOrders: WorkOrderOption[] }) {
  const [lines, setLines] = useState<QuotationLine[]>([newLine(0), newLine(1)]);

  const subtotal = useMemo(
    () => lines.reduce((sum, line) => sum + Number(line.quantity || 0) * Number(line.unitPrice || 0), 0),
    [lines],
  );
  const taxes = useMemo(
    () => lines.reduce((sum, line) => {
      const base = Number(line.quantity || 0) * Number(line.unitPrice || 0);
      return sum + base * (Number(line.taxRate || 0) / 100);
    }, 0),
    [lines],
  );
  const total = subtotal + taxes;

  const itemsJson = JSON.stringify(
    lines
      .filter((line) => hasMeaningfulDescription(line.description) && Number(line.quantity) > 0 && Number(line.unitPrice) >= 0)
      .map((line) => ({
        description: `${line.category}: ${line.description.trim()}`,
        quantity: Number(line.quantity),
        unitPrice: Number(line.unitPrice),
        taxRate: Number(line.taxRate || 0),
      })),
  );

  const updateLine = <K extends keyof QuotationLine>(id: string, key: K, value: QuotationLine[K]) => {
    setLines((current) => current.map((line) => (line.id === id ? { ...line, [key]: value } : line)));
  };

  const addLine = () => {
    setLines((current) => [...current, { ...newLine(current.length), id: `line-${current.length}-${Date.now()}` }]);
  };

  const removeLine = (id: string) => {
    setLines((current) => (current.length > 1 ? current.filter((line) => line.id !== id) : current));
  };

  return (
    <form action={createQuotation} className="grid gap-5">
      <input type="hidden" name="itemsJson" value={itemsJson} />

      <div className="grid gap-3 lg:grid-cols-2">
        <label className="space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Cliente</span>
          <select name="customerId" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100">
            <option value="">Seleccionar cliente</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>{customer.name}</option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Orden de trabajo</span>
          <select name="workOrderId" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100">
            <option value="">Seleccionar orden</option>
            {workOrders.map((order) => (
              <option key={order.id} value={order.id}>{order.label}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="grid grid-cols-[1fr_120px_90px_130px_110px_42px] gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
          <span>Trabajo / repuesto</span>
          <span>Tipo</span>
          <span>Cantidad</span>
          <span>Precio</span>
          <span>IVA</span>
          <span />
        </div>

        <div className="divide-y divide-slate-100">
          {lines.map((line, index) => {
            const lineSubtotal = Number(line.quantity || 0) * Number(line.unitPrice || 0);
            const lineTax = lineSubtotal * (Number(line.taxRate || 0) / 100);
            const lineTotal = lineSubtotal + lineTax;

            return (
              <div key={line.id} className="grid grid-cols-1 gap-2 px-3 py-3 lg:grid-cols-[1fr_120px_90px_130px_110px_42px]">
                <label className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 lg:hidden">Trabajo / repuesto</span>
                  <input
                    value={line.description}
                    onChange={(event) => updateLine(line.id, 'description', event.target.value)}
                    placeholder={`Cambio ${index + 1}: descripcion del trabajo`}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                  />
                  <span className="block text-[11px] font-semibold text-slate-500">
                    Base {formatCOP(lineSubtotal)} · IVA {formatCOP(lineTax)} · Total {formatCOP(lineTotal)}
                  </span>
                </label>

                <label className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 lg:hidden">Tipo</span>
                  <select
                    value={line.category}
                    onChange={(event) => updateLine(line.id, 'category', event.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    <option>Mano de obra</option>
                    <option>Repuesto</option>
                    <option>Servicio</option>
                    <option>Diagnostico</option>
                    <option>Otro</option>
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 lg:hidden">Cantidad</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={line.quantity}
                    onChange={(event) => updateLine(line.id, 'quantity', Number(event.target.value))}
                    className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 lg:hidden">Precio</span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={line.unitPrice}
                    onChange={(event) => updateLine(line.id, 'unitPrice', Number(event.target.value))}
                    className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 lg:hidden">IVA</span>
                  <select
                    value={line.taxRate}
                    onChange={(event) => updateLine(line.id, 'taxRate', Number(event.target.value))}
                    className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    <option value={0}>Sin IVA</option>
                    <option value={19}>IVA 19%</option>
                  </select>
                </label>

                <button
                  type="button"
                  onClick={() => removeLine(line.id)}
                  disabled={lines.length === 1}
                  className="flex h-10 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-600 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                  title="Eliminar renglon"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <button
          type="button"
          onClick={addLine}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 hover:bg-blue-100"
        >
          <Plus className="h-4 w-4" />
          Agregar cambio o repuesto
        </button>

        <div className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 lg:w-80">
          <div className="flex justify-between text-sm text-slate-500">
            <span>Subtotal</span>
            <span>{formatCOP(subtotal)}</span>
          </div>
          <div className="mt-2 flex justify-between text-sm text-slate-500">
            <span>IVA aplicado</span>
            <span>{formatCOP(taxes)}</span>
          </div>
          <div className="mt-3 flex justify-between border-t border-slate-200 pt-3 text-lg font-black text-slate-950">
            <span>Total</span>
            <span>{formatCOP(total)}</span>
          </div>
          <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800">
            <Save className="h-4 w-4" />
            Guardar cotizacion
          </button>
        </div>
      </div>
    </form>
  );
}
