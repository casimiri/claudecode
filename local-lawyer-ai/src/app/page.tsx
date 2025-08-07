import { redirect } from 'next/navigation';

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function RootPage({ searchParams }: Props) {
  const params = await searchParams;
  
  // Check if this is an OAuth callback with a code parameter
  if (params.code) {
    // Redirect to the proper auth callback route with all parameters
    const urlParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (typeof value === 'string') {
        urlParams.append(key, value);
      }
    });
    redirect(`/auth/callback?${urlParams.toString()}`);
  }
  
  redirect('/en');
}