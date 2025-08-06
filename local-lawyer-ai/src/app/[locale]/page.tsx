import Link from 'next/link'
import { Scale, Shield, Zap, Users } from 'lucide-react'
import LanguageSwitcher from '@/components/LanguageSwitcher';

type Props = {
  params: Promise<{locale: string}>;
};

export default async function HomePage({ params, searchParams }: Props & { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const { locale } = await params;
  const urlParams = await searchParams;
  
  // Check for authentication errors
  if (urlParams.error === 'auth_failed') {
    // You could show an error message here or redirect to login with error
    console.log('Authentication failed, redirecting to login');
  }
  
  const translations = {
    en: {
      brand: { name: "Local Lawyer AI" },
      nav: { signIn: "Sign In", getStarted: "Get Started" },
      hero: {
        title: "AI-Powered Legal Assistant",
        subtitle: "Get instant answers to legal questions based on the most up-to-date local law documents",
        cta: "Start Your Legal Journey"
      },
      features: {
        instantAnswers: {
          title: "Instant Answers",
          description: "Get immediate responses to your legal questions powered by advanced AI"
        },
        upToDateLaws: {
          title: "Up-to-Date Laws",
          description: "Access the latest local law documents and regulations"
        },
        securePrivate: {
          title: "Secure & Private",
          description: "Your questions and data are handled with the highest security standards"
        }
      },
      pricing: {
        title: "One time tokens purchase",
        subtitle: "Choose the token package that works best for your needs",
        free: "Starter Pack",
        weekly: "Popular",
        monthly: "Power",
        yearly: "Enterprise Pack"
      },
      footer: { copyright: "© 2024 Local Lawyer AI. All rights reserved." }
    },
    fr: {
      brand: { name: "Local Lawyer AI" },
      nav: { signIn: "Se connecter", getStarted: "Commencer" },
      hero: {
        title: "Assistant Juridique IA",
        subtitle: "Obtenez des réponses instantanées aux questions juridiques basées sur les documents de loi locaux les plus récents",
        cta: "Commencez votre parcours juridique"
      },
      features: {
        instantAnswers: {
          title: "Réponses instantanées",
          description: "Obtenez des réponses immédiates à vos questions juridiques grâce à une IA avancée"
        },
        upToDateLaws: {
          title: "Lois à jour",
          description: "Accédez aux derniers documents de loi et réglementations locaux"
        },
        securePrivate: {
          title: "Sécurisé et privé",
          description: "Vos questions et données sont traitées avec les plus hauts standards de sécurité"
        }
      },
      pricing: {
        title: "Achat de jetons unique",
        subtitle: "Choisissez le package de jetons qui convient le mieux à vos besoins",
        free: "Pack Débutant",
        weekly: "Populaire",
        monthly: "Puissance",
        yearly: "Pack Enterprise"
      },
      footer: { copyright: "© 2024 Local Lawyer AI. Tous droits réservés." }
    }
  };

  const t = translations[locale as keyof typeof translations];

  return (
    <div className="bg-white">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Scale className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">{t.brand.name}</span>
            </div>
            <div className="flex items-center space-x-4">
              <LanguageSwitcher />
              <Link href={`/${locale}/login`} className="text-gray-500 hover:text-gray-900">
                {t.nav.signIn}
              </Link>
              <Link 
                href={`/${locale}/login`} 
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                {t.nav.getStarted}
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-20">
          <div className="text-center">
            <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
              {t.hero.title}
            </h1>
            <p className="max-w-xl mt-5 mx-auto text-xl text-gray-500">
              {t.hero.subtitle}
            </p>
            <div className="mt-8">
              <Link 
                href={`/${locale}/login`}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-md text-lg font-medium"
              >
                {t.hero.cta}
              </Link>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="py-16">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div className="text-center">
              <div className="flex justify-center">
                <Zap className="h-12 w-12 text-blue-600" />
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">{t.features.instantAnswers.title}</h3>
              <p className="mt-2 text-gray-500">
                {t.features.instantAnswers.description}
              </p>
            </div>
            
            <div className="text-center">
              <div className="flex justify-center">
                <Shield className="h-12 w-12 text-blue-600" />
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">{t.features.upToDateLaws.title}</h3>
              <p className="mt-2 text-gray-500">
                {t.features.upToDateLaws.description}
              </p>
            </div>
            
            <div className="text-center">
              <div className="flex justify-center">
                <Users className="h-12 w-12 text-blue-600" />
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">{t.features.securePrivate.title}</h3>
              <p className="mt-2 text-gray-500">
                {t.features.securePrivate.description}
              </p>
            </div>
          </div>
        </div>

        {/* Pricing Preview */}
        <div className="py-16">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">
              {t.pricing.title}
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              {t.pricing.subtitle}
            </p>
            <div className="mt-8 flex justify-center space-x-4 flex-wrap gap-4">
              <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
                <span className="text-sm text-green-600">{t.pricing.free}</span>
                <div className="text-2xl font-bold text-gray-900">$0</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <span className="text-sm text-gray-500">{t.pricing.weekly}</span>
                <div className="text-2xl font-bold text-gray-900">$9.99</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
                <span className="text-sm text-blue-600">{t.pricing.monthly}</span>
                <div className="text-2xl font-bold text-gray-900">$29.99</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <span className="text-sm text-gray-500">{t.pricing.yearly}</span>
                <div className="text-2xl font-bold text-gray-900">$299.99</div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-50">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="text-center text-gray-500">
            <p>{t.footer.copyright}</p>
          </div>
        </div>
      </footer>
    </div>
  )
}