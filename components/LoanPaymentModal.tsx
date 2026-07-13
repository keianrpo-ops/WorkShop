'use client';

import { recordEmployeeLoanPayment } from '@/lib/actions';
import { useId, useRef } from 'react';

type LoanPaymentModalProps = {
  loanId: string;
  mechanicId: string;
  employeeName: string;
  balance: number;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function LoanPaymentModal({ loanId, mechanicId, employeeName, balance }: LoanPaymentModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
      >
        Registrar abono
      </button>

      <dialog ref={dialogRef} aria-labelledby={titleId} className="w-full max-w-lg rounded-2xl border border-slate-200 p-0 shadow-2xl backdrop:bg-slate-950/40">
        <div className="border-b border-slate-100 p-5">
          <p id={titleId} className="text-lg font-black text-slate-900">Abono a prestamo</p>
          <p className="mt-1 text-sm text-slate-500">{employeeName} - saldo pendiente COP {Number(balance).toLocaleString('es-CO')}</p>
        </div>

        <form action={recordEmployeeLoanPayment} className="grid gap-3 p-5 md:grid-cols-2">
          <input type="hidden" name="loanId" value={loanId} />
          <input type="hidden" name="mechanicId" value={mechanicId} />
          <input name="paymentDate" type="date" defaultValue={today()} className="rounded border border-slate-300 px-3 py-2 text-sm" />
          <input name="amount" required type="number" min="0" max={balance} step="0.01" placeholder="Valor del abono" className="rounded border border-slate-300 px-3 py-2 text-sm" />
          <select name="paymentMethod" defaultValue="Caja" className="rounded border border-slate-300 px-3 py-2 text-sm">
            <option>Nomina</option>
            <option>Caja</option>
            <option>Transferencia</option>
            <option>Efectivo</option>
          </select>
          <input name="reference" placeholder="Referencia" className="rounded border border-slate-300 px-3 py-2 text-sm" />
          <textarea name="notes" placeholder="Notas del abono" className="min-h-20 rounded border border-slate-300 px-3 py-2 text-sm md:col-span-2" />

          <div className="flex justify-end gap-2 md:col-span-2">
            <button type="button" onClick={() => dialogRef.current?.close()} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700">
              Cancelar
            </button>
            <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">
              Guardar abono
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
