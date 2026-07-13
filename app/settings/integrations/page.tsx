'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Bot, Calendar, ExternalLink, FileText, Mail, MessageCircle, Save } from 'lucide-react';
import { useEffect, useState } from 'react';

const WHATSAPP_NUMBER = '573244490660';

export default function IntegrationsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const saved = localStorage.getItem('workshop-integrations');
      setSettings(saved ? JSON.parse(saved) : {});
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  const updateSetting = (key: string, value: string) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const saveSettings = () => {
    localStorage.setItem('workshop-integrations', JSON.stringify(settings));
  };

  const integrations = [
    {
      name: 'WhatsApp API',
      description: 'Envia notificaciones del estado del vehiculo, presupuestos para aprobar y recordatorios de servicio.',
      icon: MessageCircle,
      connected: true,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      href: `https://wa.me/${WHATSAPP_NUMBER}`,
      fields: [['whatsappNumber', 'Numero WhatsApp', WHATSAPP_NUMBER], ['whatsappToken', 'Token API Meta o proveedor', '']],
    },
    {
      name: 'Google Calendar',
      description: 'Sincroniza las citas de recepcion y fechas de entrega de vehiculos.',
      icon: Calendar,
      connected: Boolean(settings.calendarClientId),
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      fields: [['calendarClientId', 'Google Client ID', ''], ['calendarId', 'Calendar ID o correo Gmail', '']],
    },
    {
      name: 'Automatizacion de Correos',
      description: 'Configura correos de bienvenida, recordatorios de mantenimiento y facturas.',
      icon: Mail,
      connected: Boolean(settings.smtpUser),
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      fields: [['smtpUser', 'Correo remitente', ''], ['smtpProvider', 'Proveedor SMTP', '']],
    },
    {
      name: 'Facturacion Electronica',
      description: 'Conecta con tu proveedor de facturacion.',
      icon: FileText,
      connected: Boolean(settings.billingProvider),
      color: 'text-slate-700',
      bgColor: 'bg-slate-100',
      fields: [['billingProvider', 'Proveedor', ''], ['billingApiKey', 'API Key', '']],
    },
    {
      name: 'Webhooks (Make / n8n)',
      description: 'Crea flujos de trabajo personalizados con plataformas de automatizacion externas.',
      icon: Bot,
      connected: Boolean(settings.webhookUrl),
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      fields: [['webhookUrl', 'Webhook URL', 'https://']],
    },
  ];

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">Integraciones</h1>
        <p className="text-slate-500">Conecta Workshop con tus herramientas favoritas.</p>
      </div>

      <div className="space-y-4">
        {integrations.map((integration) => (
          <Card key={integration.name} className="overflow-visible">
            <CardContent className="flex flex-col items-center gap-6 p-6 sm:flex-row">
              <div className={`flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl ${integration.bgColor} ${integration.color}`}>
                <integration.icon className="h-8 w-8" />
              </div>

              <div className="flex-1 text-center sm:text-left">
                <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  <h3 className="text-lg font-bold text-slate-800">{integration.name}</h3>
                  {integration.connected && <span className="rounded-full bg-green-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-green-700">Listo</span>}
                </div>
                <p className="mt-1 text-sm text-slate-600">{integration.description}</p>
              </div>

              <div className="flex flex-shrink-0 items-center gap-2">
                {integration.href && (
                  <a href={integration.href} target="_blank" className="inline-flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm font-semibold text-green-700">
                    WhatsApp
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
                <details className="relative">
                  <summary className="list-none cursor-pointer rounded-lg border-2 border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50">
                    {integration.connected ? 'Configurar' : 'Conectar'}
                  </summary>
                  <div className="absolute right-0 z-20 mt-3 w-80 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-2xl">
                    <p className="mb-3 text-sm font-bold text-slate-900">{integration.name}</p>
                    <div className="space-y-3">
                      {integration.fields.map(([key, label, placeholder]) => (
                        <label key={key} className="block space-y-1">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
                          <input
                            value={settings[key] ?? (key === 'whatsappNumber' ? placeholder : '')}
                            onChange={(event) => updateSetting(key, event.target.value)}
                            placeholder={placeholder}
                            className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                          />
                        </label>
                      ))}
                      <button onClick={saveSettings} className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800">
                        <Save className="h-4 w-4" />
                        Guardar configuracion
                      </button>
                    </div>
                  </div>
                </details>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
