import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { supabase } from '@/lib/supabase';

const WORKSHOP_ID = '00000000-0000-0000-0000-000000000001';

function cleanText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function cleanEmail(value: unknown) {
  return cleanText(value)?.toLowerCase() ?? null;
}

function cleanDocument(value: unknown) {
  return cleanText(value)?.replace(/\s+/g, '').toUpperCase() ?? null;
}

function cleanNumber(value: unknown) {
  const text = cleanText(value);
  if (!text) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function isMissingColumn(error: { message?: string } | null, column: string) {
  return Boolean(error?.message?.includes(column) && error.message.includes('does not exist'));
}

async function findDuplicate(column: string, value: string) {
  const { data, error } = await supabase
    .from('mechanics')
    .select('id, name')
    .eq('workshop_id', WORKSHOP_ID)
    .eq(column, value)
    .limit(1)
    .maybeSingle();

  if (error && !isMissingColumn(error, column)) throw new Error(error.message);
  return data;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = cleanText(body.name);
    const documentNumber = cleanDocument(body.documentNumber);
    const phone = cleanText(body.phone);
    const email = cleanEmail(body.email);
    const employmentStatus = cleanText(body.employmentStatus) ?? 'Activo';

    if (!name) {
      return NextResponse.json({ error: 'El empleado necesita nombre.' }, { status: 400 });
    }

    if (!documentNumber) {
      return NextResponse.json({ error: 'La cedula/documento del empleado es obligatoria.' }, { status: 400 });
    }

    const duplicateChecks = [
      { column: 'document_number', value: documentNumber, label: 'cedula/documento' },
      { column: 'email', value: email, label: 'correo' },
      { column: 'phone', value: phone, label: 'telefono' },
    ].filter((check): check is { column: string; value: string; label: string } => Boolean(check.value));

    for (const check of duplicateChecks) {
      const duplicate = await findDuplicate(check.column, check.value);
      if (duplicate) {
        return NextResponse.json({ error: `Ya existe un empleado con ese ${check.label}: ${duplicate.name}.` }, { status: 409 });
      }
    }

    const payload = {
      workshop_id: WORKSHOP_ID,
      name,
      role: cleanText(body.role),
      specialty: cleanText(body.specialty),
      phone,
      email,
      hourly_rate: cleanNumber(body.hourlyRate) ?? 0,
      document_number: documentNumber,
      address: cleanText(body.address),
      birth_date: cleanText(body.birthDate),
      hire_date: cleanText(body.hireDate),
      employment_status: employmentStatus,
      is_active: employmentStatus === 'Activo',
      contract_type: cleanText(body.contractType),
      pay_scheme: cleanText(body.payScheme) ?? 'Salario fijo',
      payment_frequency: cleanText(body.paymentFrequency) ?? 'Quincenal',
      base_salary: cleanNumber(body.baseSalary) ?? 0,
      commission_rate: cleanNumber(body.commissionRate) ?? 0,
      supervisor_id: cleanText(body.supervisorId),
      bank_name: cleanText(body.bankName),
      bank_account_type: cleanText(body.bankAccountType),
      bank_account_number: cleanText(body.bankAccountNumber),
      internal_notes: cleanText(body.internalNotes),
    };

    const { data, error } = await supabase.from('mechanics').insert(payload).select('id, name').single();

    if (error?.code === '23505') {
      return NextResponse.json({ error: 'Ese empleado ya existe. Revisa cedula, correo o telefono.' }, { status: 409 });
    }

    if (error?.message?.includes('does not exist')) {
      const fallbackPayload = {
        workshop_id: WORKSHOP_ID,
        name,
        role: payload.role,
        specialty: payload.specialty,
        phone: payload.phone,
        email: payload.email,
        hourly_rate: payload.hourly_rate,
        is_active: payload.is_active,
      };
      const fallback = await supabase.from('mechanics').insert(fallbackPayload).select('id, name').single();
      if (fallback.error) throw new Error(fallback.error.message);

      revalidatePath('/team');
      revalidatePath('/board');
      revalidatePath('/mechanic');
      revalidatePath('/employee-portal');
      revalidatePath('/hr');
      revalidatePath('/payroll');

      return NextResponse.json({ mechanic: fallback.data });
    }

    if (error) throw new Error(error.message);

    revalidatePath('/team');
    revalidatePath('/board');
    revalidatePath('/mechanic');
    revalidatePath('/employee-portal');
    revalidatePath('/hr');
    revalidatePath('/payroll');

    return NextResponse.json({ mechanic: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'No se pudo guardar el empleado.' },
      { status: 500 },
    );
  }
}
