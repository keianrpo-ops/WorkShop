import { ReceptionForm } from '@/app/reception/ReceptionForm';

export default async function ReceptionPage({
  searchParams,
}: {
  searchParams?: Promise<{
    customerName?: string;
    phone?: string;
    email?: string;
    vehicleType?: string;
    plate?: string;
    makeModel?: string;
    year?: string;
    mileage?: string;
  }>;
}) {
  const params = searchParams ? await searchParams : {};

  return <ReceptionForm defaults={params} />;
}
