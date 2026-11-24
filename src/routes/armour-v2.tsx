// /armory/armour_v2 was the preview of the new armour page, which is now
// /armory/armour. Forward there, keeping any shared-build link (?p=…&r=…).
import { redirect, type ClientLoaderFunctionArgs } from 'react-router';

export async function clientLoader({ request }: ClientLoaderFunctionArgs) {
  const { search } = new URL(request.url);
  throw redirect(`/armory/armour${search}`);
}

export function HydrateFallback() {
  return null;
}

export default function Route() {
  return null;
}
