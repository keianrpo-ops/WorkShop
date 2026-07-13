import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function productImage(category?: string | null) {
  const key = (category ?? 'repuesto').toLowerCase();
  const query = key.includes('moto')
    ? 'motorcycle-parts'
    : key.includes('freno')
      ? 'brake-pads'
      : key.includes('aceite') || key.includes('lubric')
        ? 'motor-oil'
        : key.includes('bateria')
          ? 'car-battery'
          : key.includes('filtro')
            ? 'oil-filter'
            : 'auto-parts';

  return `https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=320&q=70&${query}`;
}
