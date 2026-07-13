'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useRef, useState } from 'react';
import { Plus } from 'lucide-react';

type FormState = {
  status: 'idle' | 'success' | 'error';
  message: string;
};

function TeamSubmitButton({ pending }: { pending: boolean }) {
  return (
    <button type="submit" disabled={pending} className="flex items-center justify-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">
      <Plus className="h-4 w-4" />
      {pending ? 'Agregando...' : 'Agregar'}
    </button>
  );
}

export function TeamForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<FormState>({ status: 'idle', message: '' });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20000);

    setPending(true);
    setState({ status: 'idle', message: '' });

    try {
      const response = await fetch('/api/mechanics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error ?? 'No se pudo guardar el empleado.');
      }

      const mechanicName = result?.mechanic?.name ?? payload.name ?? 'El empleado';
      setState({ status: 'success', message: `${mechanicName} fue guardado correctamente.` });
      formRef.current?.reset();
      router.refresh();
    } catch (error) {
      setState({
        status: 'error',
        message: error instanceof Error && error.name === 'AbortError'
          ? 'La conexion tardo demasiado. Revisa internet/Supabase e intenta de nuevo.'
          : error instanceof Error ? error.message : 'No se pudo guardar el empleado.',
      });
    } finally {
      window.clearTimeout(timeout);
      setPending(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="grid gap-3 lg:grid-cols-6">
      <input name="name" required placeholder="Nombre completo" className="rounded border border-slate-300 px-3 py-2 text-sm lg:col-span-2" />
      <input name="documentNumber" required placeholder="Documento / Cedula" autoComplete="off" className="rounded border border-slate-300 px-3 py-2 text-sm" />
      <input name="phone" type="tel" placeholder="Telefono" autoComplete="tel" className="rounded border border-slate-300 px-3 py-2 text-sm" />
      <input name="email" type="email" placeholder="Correo" autoComplete="email" className="rounded border border-slate-300 px-3 py-2 text-sm lg:col-span-2" />
      <input name="address" placeholder="Direccion" className="rounded border border-slate-300 px-3 py-2 text-sm lg:col-span-2" />
      <label className="space-y-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Fecha nacimiento</span>
        <input name="birthDate" type="date" className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
      </label>
      <input name="role" placeholder="Cargo" className="rounded border border-slate-300 px-3 py-2 text-sm" />
      <input name="specialty" placeholder="Especialidad" className="rounded border border-slate-300 px-3 py-2 text-sm" />
      <label className="space-y-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Fecha ingreso</span>
        <input name="hireDate" type="date" className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
      </label>
      <select name="employmentStatus" className="rounded border border-slate-300 px-3 py-2 text-sm">
        <option>Activo</option>
        <option>Inactivo</option>
      </select>
      <select name="contractType" className="rounded border border-slate-300 px-3 py-2 text-sm">
        <option value="">Tipo contrato</option>
        <option>Termino indefinido</option>
        <option>Termino fijo</option>
        <option>Prestacion de servicios</option>
        <option>Aprendiz</option>
      </select>
      <select name="payScheme" defaultValue="Salario fijo" className="rounded border border-slate-300 px-3 py-2 text-sm">
        <option>Salario fijo</option>
        <option>Por hora</option>
        <option>Por comision</option>
        <option>Salario + comision</option>
        <option>Hora + comision</option>
      </select>
      <select name="paymentFrequency" defaultValue="Quincenal" className="rounded border border-slate-300 px-3 py-2 text-sm">
        <option>Semanal</option>
        <option>Quincenal</option>
        <option>Mensual</option>
        <option>Por trabajo</option>
      </select>
      <input name="baseSalary" type="number" min="0" step="0.01" placeholder="Salario base COP" className="rounded border border-slate-300 px-3 py-2 text-sm" />
      <input name="hourlyRate" type="number" min="0" step="0.01" placeholder="Valor hora COP" className="rounded border border-slate-300 px-3 py-2 text-sm" />
      <input name="commissionRate" type="number" min="0" step="0.01" placeholder="% comision" className="rounded border border-slate-300 px-3 py-2 text-sm" />
      <input name="bankName" placeholder="Banco" className="rounded border border-slate-300 px-3 py-2 text-sm" />
      <input name="bankAccountType" placeholder="Tipo cuenta" className="rounded border border-slate-300 px-3 py-2 text-sm" />
      <input name="bankAccountNumber" placeholder="Numero de cuenta" className="rounded border border-slate-300 px-3 py-2 text-sm" />
      <textarea name="internalNotes" placeholder="Notas internas" className="min-h-20 rounded border border-slate-300 px-3 py-2 text-sm lg:col-span-5" />
      <TeamSubmitButton pending={pending} />

      {state.status !== 'idle' && (
        <p className={state.status === 'success' ? 'rounded bg-emerald-50 p-3 text-sm font-bold text-emerald-700 lg:col-span-6' : 'rounded bg-red-50 p-3 text-sm font-bold text-red-700 lg:col-span-6'}>
          {state.message}
        </p>
      )}
    </form>
  );
}
