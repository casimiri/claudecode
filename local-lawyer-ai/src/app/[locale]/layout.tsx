import {notFound} from 'next/navigation';
import {NextIntlClientProvider} from 'next-intl';
import {getMessages} from 'next-intl/server';

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

  const messages = await getMessages({locale});

  return (
    <div data-locale={locale}>
      <NextIntlClientProvider messages={messages}>
        {children}
      </NextIntlClientProvider>
    </div>
  );
}