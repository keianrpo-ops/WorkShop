export type PlanId = 'basico' | 'pro' | 'premium';

export type PlanConfig = {
  id: PlanId;
  name: string;
  priceCop: number;
  monthlyLabel: string;
  description: string;
  popular?: boolean;
  features: string[];
};

export const WORKSHOP_PLANS: PlanConfig[] = [
  {
    id: 'basico',
    name: 'Basico',
    priceCop: 120000,
    monthlyLabel: 'COP $120.000/mes',
    description: 'Perfecto para talleres pequenos, motos o negocios que estan empezando a organizar su operacion.',
    features: [
      'Hasta 2 usuarios',
      'Recepcion con fotos e historial',
      'Tablero operativo',
      'Cotizaciones basicas',
      'Directorio de clientes',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    priceCop: 200000,
    monthlyLabel: 'COP $200.000/mes',
    description: 'Gestion completa para talleres en crecimiento que necesitan inventario, ventas y control financiero.',
    popular: true,
    features: [
      'Usuarios ilimitados',
      'Punto de venta e inventario',
      'Cotizaciones y documentos PDF',
      'Nomina, anticipos y prestamos',
      'Tesoreria, gastos y reportes',
      'WhatsApp e integraciones configurables',
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    priceCop: 320000,
    monthlyLabel: 'COP $320.000/mes',
    description: 'Herramientas empresariales para talleres con varias sedes, mayor volumen y control gerencial.',
    features: [
      'Multi-taller y multi-sucursal',
      'Reportes gerenciales avanzados',
      'Facturacion, impuestos y auditoria',
      'Integraciones Make, n8n y Google Calendar',
      'Automatizaciones WhatsApp',
      'Soporte prioritario',
    ],
  },
];

export function getPlanById(planId: string | null | undefined) {
  return WORKSHOP_PLANS.find((plan) => plan.id === planId);
}

export function formatCop(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
}
