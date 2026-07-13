import { LoginClient } from '@/app/login/LoginClient';
import { getWorkshopBusinessInfo } from '@/lib/workshop';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  const business = await getWorkshopBusinessInfo();

  return <LoginClient business={business} />;
}
