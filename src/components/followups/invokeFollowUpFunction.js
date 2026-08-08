import { base44 } from '@/api/base44Client';

// Backend invokes can resolve with an error payload instead of throwing.
// This helper turns any failure into a real exception so the UI never
// reports success for an action that did not happen.
export async function invokeFollowUpFunction(functionName, payload) {
  const response = await base44.functions.invoke(functionName, payload);
  const data = response?.data ?? response;

  if (data?.error) throw new Error(data.error);
  if (!data || data.success === false) throw new Error('Não foi possível concluir a ação. Tente novamente.');

  return data;
}