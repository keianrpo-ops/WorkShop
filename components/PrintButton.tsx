'use client';

function goBack() {
  if (window.history.length > 1) {
    window.history.back();
    return;
  }

  const pathname = window.location.pathname;
  if (pathname.startsWith('/documents/sale')) {
    window.location.href = '/pos';
    return;
  }

  if (pathname.startsWith('/documents/quotation')) {
    window.location.href = '/quotations';
    return;
  }

  if (pathname.startsWith('/documents/payroll') || pathname.startsWith('/documents/liquidation')) {
    window.location.href = '/payroll';
    return;
  }

  window.location.href = '/';
}

function finishPrinting(mode: 'regular' | 'thermal') {
  if (document.body.dataset.printMode === mode) {
    delete document.body.dataset.printMode;
  }

  window.setTimeout(goBack, 250);
}

function printWithMode(mode: 'regular' | 'thermal') {
  document.body.dataset.printMode = mode;
  window.addEventListener(
    'afterprint',
    () => finishPrinting(mode),
    { once: true },
  );
  window.print();
  window.setTimeout(() => {
    if (document.body.dataset.printMode === mode) {
      delete document.body.dataset.printMode;
    }
  }, 1000);
}

export function PrintButton() {
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <button type="button" onClick={goBack} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-900">
        Volver atras
      </button>
      <button type="button" onClick={() => printWithMode('regular')} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white">
        Imprimir Carta/A4
      </button>
      <button type="button" onClick={() => printWithMode('thermal')} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-900">
        Imprimir Termica
      </button>
    </div>
  );
}
