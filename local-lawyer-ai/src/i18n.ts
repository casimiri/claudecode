import {getRequestConfig} from 'next-intl/server';
 
export const locales = ['en', 'fr'] as const;
export const defaultLocale = 'en';
 
export default getRequestConfig(async ({locale}) => {
  // Ensure locale defaults to 'en' if undefined or invalid
  const validLocale = locale && locales.includes(locale as any) ? locale : defaultLocale;
  
  return {
    locale: validLocale,
    messages: (await import(`../messages/${validLocale}.json`)).default
  };
});