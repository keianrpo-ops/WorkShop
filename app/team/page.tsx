import { Card, CardContent } from '@/components/ui/card';
import { TeamForm } from '@/app/team/TeamForm';
import { isMissingColumn, supabase } from '@/lib/supabase';
import { BadgeDollarSign, BriefcaseBusiness, CarFront, Mail, Phone, UserRound, WalletCards, Wrench } from 'lucide-react';

export const dynamic = 'force-dynamic';

type Mechanic = {
  id: string;
  name: string;
  document_number: string | null;
  role: string | null;
  specialty: string | null;
  phone: string | null;
  email: string | null;
  employment_status: string | null;
  contract_type: string | null;
  pay_scheme: string | null;
  payment_frequency: string | null;
  hire_date: string | null;
  base_salary: number;
  hourly_rate: number;
  commission_rate: number;
  bank_name: string | null;
  bank_account_type: string | null;
  bank_account_number: string | null;
  work_orders: { id: string }[];
};

export default async function TeamPage() {
  let result: Awaited<ReturnType<typeof supabase.from>> | any = await supabase
    .from('mechanics')
    .select('id, name, document_number, role, specialty, phone, email, employment_status, contract_type, pay_scheme, payment_frequency, hire_date, base_salary, hourly_rate, commission_rate, bank_name, bank_account_type, bank_account_number, work_orders(id)')
    .order('name');

  if (isMissingColumn(result.error, 'document_number')) {
    result = await supabase
      .from('mechanics')
      .select('id, name, role, specialty, phone, email, hourly_rate, work_orders(id)')
      .eq('is_active', true)
      .order('name');
  }

  const { data, error } = result;
  const mechanics = (data ?? []) as Mechanic[];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Personal, RRHH y Productividad</h1>
        <p className="mt-1 text-slate-500">Registra empleados, datos laborales, datos bancarios y reglas base para nomina y productividad.</p>
      </div>

      <Card>
        <CardContent className="space-y-5 p-5">
          <div className="flex items-center gap-2">
            <UserRound className="h-5 w-5 text-blue-600" />
            <h2 className="font-bold text-slate-900">Nuevo empleado</h2>
          </div>
          <TeamForm />
        </CardContent>
      </Card>

      {error && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 text-sm text-amber-800">{error.message}</CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {mechanics.map((mechanic) => (
          <Card key={mechanic.id} className="overflow-hidden border-0 bg-white shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] transition-all hover:shadow-xl">
            <CardContent className="p-0">
              <div className="relative flex h-24 items-center justify-center bg-slate-100">
                <span className="absolute right-3 top-3 rounded bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600">{mechanic.employment_status ?? 'Activo'}</span>
                <div className="absolute -bottom-8 left-6 h-16 w-16 rounded-2xl border border-slate-100 bg-white p-1 shadow-sm">
                  <div className="flex h-full w-full items-center justify-center rounded-xl bg-blue-50">
                    <Wrench className="h-6 w-6 text-blue-500" />
                  </div>
                </div>
              </div>

              <div className="space-y-4 px-6 pb-6 pt-10">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">{mechanic.name}</h3>
                  <p className="mt-1 text-xs font-bold uppercase tracking-wider text-blue-600">{mechanic.role ?? 'Personal'} · {mechanic.specialty ?? 'Sin especialidad'}</p>
                  <p className="mt-1 text-xs text-slate-500">{mechanic.document_number ?? 'Documento pendiente'}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <CarFront className="h-3 w-3" />
                      Trabajos
                    </p>
                    <p className="text-lg font-black text-slate-800">{mechanic.work_orders?.length ?? 0}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <BadgeDollarSign className="h-3 w-3" />
                      Comision
                    </p>
                    <p className="text-lg font-black text-slate-800">{Number(mechanic.commission_rate ?? 0)}%</p>
                  </div>
                </div>

                <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm">
                  <p className="flex items-center gap-2 font-bold text-slate-700">
                    <BriefcaseBusiness className="h-4 w-4 text-slate-500" />
                    {mechanic.contract_type ?? 'Contrato pendiente'}
                  </p>
                  <p className="text-slate-500">Pago: {mechanic.pay_scheme ?? 'Salario fijo'} - {mechanic.payment_frequency ?? 'Quincenal'}</p>
                  <p className="text-slate-500">Ingreso: {mechanic.hire_date ? new Date(mechanic.hire_date).toLocaleDateString('es-CO') : 'Sin fecha'}</p>
                  <p className="text-slate-500">Salario: COP ${Number(mechanic.base_salary ?? 0).toFixed(2)} · Hora: COP ${Number(mechanic.hourly_rate ?? 0).toFixed(2)}</p>
                </div>

                <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm">
                  <p className="flex items-center gap-2 font-bold text-slate-700">
                    <WalletCards className="h-4 w-4 text-slate-500" />
                    {mechanic.bank_name ?? 'Banco pendiente'}
                  </p>
                  <p className="text-slate-500">{mechanic.bank_account_type ?? 'Tipo cuenta'} · {mechanic.bank_account_number ?? 'Numero pendiente'}</p>
                </div>

                <div className="flex gap-2">
                  <a href={mechanic.phone ? `tel:${mechanic.phone}` : undefined} className="flex flex-1 items-center justify-center rounded-lg bg-slate-100 py-2 text-slate-600 hover:bg-slate-200">
                    <Phone className="h-4 w-4" />
                  </a>
                  <a href={mechanic.email ? `mailto:${mechanic.email}` : undefined} className="flex flex-1 items-center justify-center rounded-lg bg-slate-100 py-2 text-slate-600 hover:bg-slate-200">
                    <Mail className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {mechanics.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          <Wrench className="mx-auto mb-3 h-9 w-9 text-slate-400" />
          <p className="font-bold text-slate-800">Registra tu primer mecanico o asesor.</p>
          <p className="mt-1 text-sm">Cuando agregues personal, podras asignarle trabajos desde el tablero, medir productividad y liquidar nomina.</p>
        </div>
      )}
    </div>
  );
}
