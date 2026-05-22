import { cookies } from 'next/headers';

export async function getServerTheme(): Promise<'light' | 'dark'> {
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get('theme');
  
  if (themeCookie?.value === 'light' || themeCookie?.value === 'dark') {
    return themeCookie.value;
  }
  
  return 'dark';
}