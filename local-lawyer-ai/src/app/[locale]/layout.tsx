import {notFound} from 'next/navigation';

type Props = {
  children: React.ReactNode;
  params: Promise<{locale: string}>;
};

export default async function LocaleLayout({
  children,
  params
}: Props) {
  const {locale} = await params;
  
  // Validate that the incoming `locale` parameter is valid
  if (!['en', 'fr'].includes(locale)) {
    notFound();
  }

  return children;
}