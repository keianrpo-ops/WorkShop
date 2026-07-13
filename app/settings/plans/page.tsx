import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { WORKSHOP_PLANS, formatCop } from '@/lib/plans';
import { Check, Key, Shield, Zap } from 'lucide-react';
import { PlanCheckoutButton } from '@/app/settings/plans/PlanCheckoutButton';

const icons = {
  basico: Key,
  pro: Zap,
  premium: Shield,
};

const colors = {
  basico: 'text-slate-500 bg-slate-50',
  pro: 'text-blue-600 bg-blue-50',
  premium: 'text-purple-600 bg-purple-50',
};

type PlansPageProps = {
  searchParams?: Promise<{
    payment?: string;
    plan?: string;
  }>;
};

export default async function PlansPage({ searchParams }: PlansPageProps) {
  const params = await searchParams;

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-8">
      <div className="mb-10 text-center">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Mercado Pago Colombia</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Planes y pagos</h1>
        <p className="mt-2 text-slate-500">Selecciona el plan, genera el checkout seguro y paga con Mercado Pago.</p>
      </div>

      {params?.payment && (
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900">
          Estado de pago: {params.payment}. Plan: {params.plan ?? 'sin identificar'}.
        </div>
      )}

      {!process.env.MERCADOPAGO_ACCESS_TOKEN && (
        <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Mercado Pago esta listo en codigo. Falta agregar <span className="font-mono font-bold">MERCADOPAGO_ACCESS_TOKEN</span> en
          <span className="font-mono font-bold"> .env.local</span> para generar links reales de pago.
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {WORKSHOP_PLANS.map((plan) => {
          const Icon = icons[plan.id];

          return (
            <Card key={plan.id} className={`relative flex flex-col rounded-xl ${plan.popular ? 'z-10 border-blue-500 shadow-lg md:scale-105' : ''}`}>
              {plan.popular && (
                <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                  Mas popular
                </div>
              )}
              <CardHeader className="border-b border-slate-100 pb-8 text-center">
                <div className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg ${colors[plan.id]}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <CardTitle className="mb-2 text-xl">{plan.name}</CardTitle>
                <div className="mb-2">
                  <span className="text-3xl font-extrabold text-slate-800">{formatCop(plan.priceCop)}</span>
                  <span className="block text-sm font-medium text-slate-500">/mes</span>
                </div>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="mb-0 flex flex-1 flex-col justify-between p-6">
                <ul className="mb-8 space-y-4">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm text-slate-700">
                      <Check className="h-5 w-5 flex-shrink-0 text-green-500" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <PlanCheckoutButton planId={plan.id} popular={plan.popular} />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
