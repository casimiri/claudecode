import Link from 'next/link'
import { Scale, Shield, Zap, Users, Star, CheckCircle, ArrowRight } from 'lucide-react'
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
        title: "Choose Your Plan",
        subtitle: "Flexible pricing options to match your legal consultation needs",
        free: "Starter Pack",
        weekly: "Popular",
        monthly: "Power",
        yearly: "Enterprise Pack",
        freeDesc: "Perfect for occasional questions",
        weeklyDesc: "Most popular for regular users",
        monthlyDesc: "Best value for professionals",
        yearlyDesc: "Complete enterprise solution"
      },
      testimonials: {
        title: "Trusted by Legal Professionals",
        subtitle: "See what our users say about Local Lawyer AI",
        testimonial1: {
          text: "This AI assistant has transformed how I research legal questions. The accuracy and speed are incredible.",
          author: "Sarah Johnson",
          role: "Legal Consultant"
        },
        testimonial2: {
          text: "The up-to-date legal documents feature saves me hours of research time every week.",
          author: "Michael Chen",
          role: "Solo Practitioner"
        },
        testimonial3: {
          text: "Secure, reliable, and incredibly helpful for quick legal references.",
          author: "Emma Davis",
          role: "Legal Advisor"
        }
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
        title: "Choisissez votre plan",
        subtitle: "Options de tarification flexibles pour répondre à vos besoins de consultation juridique",
        free: "Pack Débutant",
        weekly: "Populaire",
        monthly: "Puissance",
        yearly: "Pack Enterprise",
        freeDesc: "Parfait pour les questions occasionnelles",
        weeklyDesc: "Le plus populaire pour les utilisateurs réguliers",
        monthlyDesc: "Meilleur rapport qualité-prix pour les professionnels",
        yearlyDesc: "Solution entreprise complète"
      },
      testimonials: {
        title: "Approuvé par les professionnels du droit",
        subtitle: "Découvrez ce que nos utilisateurs disent de Local Lawyer AI",
        testimonial1: {
          text: "Cet assistant IA a transformé ma façon de rechercher des questions juridiques. La précision et la rapidité sont incroyables.",
          author: "Sarah Johnson",
          role: "Consultante juridique"
        },
        testimonial2: {
          text: "La fonction de documents juridiques à jour me fait économiser des heures de recherche chaque semaine.",
          author: "Michael Chen",
          role: "Praticien indépendant"
        },
        testimonial3: {
          text: "Sécurisé, fiable et incroyablement utile pour les références juridiques rapides.",
          author: "Emma Davis",
          role: "Conseillère juridique"
        }
      },
      footer: { copyright: "© 2024 Local Lawyer AI. Tous droits réservés." }
    }
  };

  const t = translations[locale as keyof typeof translations];

  return (
    <div className="bg-white">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Scale className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">{t.brand.name}</span>
            </div>
            <div className="flex items-center space-x-4">
              <LanguageSwitcher />
              <Link href={`/${locale}/login`} className="text-gray-500 hover:text-gray-900 transition-colors">
                {t.nav.signIn}
              </Link>
              <Link 
                href={`/${locale}/login`} 
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 transform hover:scale-105"
              >
                {t.nav.getStarted}
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-purple-600/5"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="text-center">
            <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-7xl">
              <span className="block">{t.hero.title.split(' ')[0]}</span>
              <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {t.hero.title.split(' ').slice(1).join(' ')}
              </span>
            </h1>
            <p className="max-w-2xl mt-6 mx-auto text-xl text-gray-600 leading-relaxed">
              {t.hero.subtitle}
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href={`/${locale}/login`}
                className="group bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg text-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl inline-flex items-center justify-center"
              >
                {t.hero.cta}
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link 
                href="#features"
                className="border border-gray-300 hover:border-gray-400 text-gray-700 px-8 py-4 rounded-lg text-lg font-medium transition-all duration-200 hover:bg-gray-50"
              >
                Learn More
              </Link>
            </div>
          </div>
        </div>
      </section>

      <main>

        {/* Features */}
        <section id="features" className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                Why Choose Local Lawyer AI?
              </h2>
              <p className="mt-4 text-xl text-gray-600">
                Advanced AI technology meets legal expertise
              </p>
            </div>
            <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-3">
              <div className="group text-center p-8 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100/50 hover:from-blue-100 hover:to-blue-200/50 transition-all duration-300 transform hover:-translate-y-2 hover:shadow-xl">
                <div className="flex justify-center mb-6">
                  <div className="p-4 bg-blue-600 rounded-full group-hover:bg-blue-700 transition-colors">
                    <Zap className="h-8 w-8 text-white" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">{t.features.instantAnswers.title}</h3>
                <p className="text-gray-600 leading-relaxed">
                  {t.features.instantAnswers.description}
                </p>
              </div>
              
              <div className="group text-center p-8 rounded-2xl bg-gradient-to-br from-green-50 to-green-100/50 hover:from-green-100 hover:to-green-200/50 transition-all duration-300 transform hover:-translate-y-2 hover:shadow-xl">
                <div className="flex justify-center mb-6">
                  <div className="p-4 bg-green-600 rounded-full group-hover:bg-green-700 transition-colors">
                    <Shield className="h-8 w-8 text-white" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">{t.features.upToDateLaws.title}</h3>
                <p className="text-gray-600 leading-relaxed">
                  {t.features.upToDateLaws.description}
                </p>
              </div>
              
              <div className="group text-center p-8 rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100/50 hover:from-purple-100 hover:to-purple-200/50 transition-all duration-300 transform hover:-translate-y-2 hover:shadow-xl">
                <div className="flex justify-center mb-6">
                  <div className="p-4 bg-purple-600 rounded-full group-hover:bg-purple-700 transition-colors">
                    <Users className="h-8 w-8 text-white" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">{t.features.securePrivate.title}</h3>
                <p className="text-gray-600 leading-relaxed">
                  {t.features.securePrivate.description}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Preview */}
        <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                {t.pricing.title}
              </h2>
              <p className="mt-4 text-xl text-gray-600">
                {t.pricing.subtitle}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {/* Starter Pack */}
              <div className="bg-white rounded-2xl p-8 shadow-lg border border-green-200 relative overflow-hidden group hover:shadow-xl transition-all duration-300">
                <div className="absolute top-0 right-0 bg-green-500 text-white px-3 py-1 text-sm font-medium rounded-bl-lg">
                  Free
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{t.pricing.free}</h3>
                  <div className="text-4xl font-extrabold text-gray-900 mb-2">$0</div>
                  <p className="text-sm text-gray-500 mb-6">{t.pricing.freeDesc}</p>
                  <ul className="space-y-3 mb-8 text-sm">
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      <span>10K tokens/month</span>
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      <span>Basic legal queries</span>
                    </li>
                  </ul>
                  <Link href={`/${locale}/login`} className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-medium transition-colors inline-block">
                    Get Started
                  </Link>
                </div>
              </div>

              {/* Popular Plan */}
              <div className="bg-white rounded-2xl p-8 shadow-xl border-2 border-blue-500 relative overflow-hidden group hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
                <div className="absolute top-0 right-0 bg-blue-500 text-white px-3 py-1 text-sm font-medium rounded-bl-lg">
                  Most Popular
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{t.pricing.weekly}</h3>
                  <div className="text-4xl font-extrabold text-gray-900 mb-2">$9.99</div>
                  <p className="text-sm text-gray-500 mb-6">{t.pricing.weeklyDesc}</p>
                  <ul className="space-y-3 mb-8 text-sm">
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-blue-500 mr-2" />
                      <span>50K tokens</span>
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-blue-500 mr-2" />
                      <span>Advanced queries</span>
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-blue-500 mr-2" />
                      <span>Priority support</span>
                    </li>
                  </ul>
                  <Link href={`/${locale}/login`} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors inline-block">
                    Choose Plan
                  </Link>
                </div>
              </div>

              {/* Power Plan */}
              <div className="bg-white rounded-2xl p-8 shadow-lg border border-purple-200 relative overflow-hidden group hover:shadow-xl transition-all duration-300">
                <div className="absolute top-0 right-0 bg-purple-500 text-white px-3 py-1 text-sm font-medium rounded-bl-lg">
                  Best Value
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{t.pricing.monthly}</h3>
                  <div className="text-4xl font-extrabold text-gray-900 mb-2">$29.99</div>
                  <p className="text-sm text-gray-500 mb-6">{t.pricing.monthlyDesc}</p>
                  <ul className="space-y-3 mb-8 text-sm">
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-purple-500 mr-2" />
                      <span>200K tokens</span>
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-purple-500 mr-2" />
                      <span>Complex legal analysis</span>
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-purple-500 mr-2" />
                      <span>Document review</span>
                    </li>
                  </ul>
                  <Link href={`/${locale}/login`} className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-lg font-medium transition-colors inline-block">
                    Choose Plan
                  </Link>
                </div>
              </div>

              {/* Enterprise Plan */}
              <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200 relative overflow-hidden group hover:shadow-xl transition-all duration-300">
                <div className="text-center">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{t.pricing.yearly}</h3>
                  <div className="text-4xl font-extrabold text-gray-900 mb-2">$299.99</div>
                  <p className="text-sm text-gray-500 mb-6">{t.pricing.yearlyDesc}</p>
                  <ul className="space-y-3 mb-8 text-sm">
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-gray-500 mr-2" />
                      <span>Unlimited tokens</span>
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-gray-500 mr-2" />
                      <span>Enterprise features</span>
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-gray-500 mr-2" />
                      <span>24/7 support</span>
                    </li>
                  </ul>
                  <Link href={`/${locale}/login`} className="w-full bg-gray-800 hover:bg-gray-900 text-white py-3 px-4 rounded-lg font-medium transition-colors inline-block">
                    Contact Sales
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                {t.testimonials.title}
              </h2>
              <p className="mt-4 text-xl text-gray-600">
                {t.testimonials.subtitle}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-8 shadow-lg">
                <div className="flex mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-700 mb-6 italic">&ldquo;{t.testimonials.testimonial1.text}&rdquo;</p>
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {t.testimonials.testimonial1.author.charAt(0)}
                  </div>
                  <div className="ml-4">
                    <p className="font-semibold text-gray-900">{t.testimonials.testimonial1.author}</p>
                    <p className="text-gray-500 text-sm">{t.testimonials.testimonial1.role}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-8 shadow-lg">
                <div className="flex mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-700 mb-6 italic">&ldquo;{t.testimonials.testimonial2.text}&rdquo;</p>
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {t.testimonials.testimonial2.author.charAt(0)}
                  </div>
                  <div className="ml-4">
                    <p className="font-semibold text-gray-900">{t.testimonials.testimonial2.author}</p>
                    <p className="text-gray-500 text-sm">{t.testimonials.testimonial2.role}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-8 shadow-lg">
                <div className="flex mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-700 mb-6 italic">&ldquo;{t.testimonials.testimonial3.text}&rdquo;</p>
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {t.testimonials.testimonial3.author.charAt(0)}
                  </div>
                  <div className="ml-4">
                    <p className="font-semibold text-gray-900">{t.testimonials.testimonial3.author}</p>
                    <p className="text-gray-500 text-sm">{t.testimonials.testimonial3.role}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center mb-4">
                <Scale className="h-8 w-8 text-blue-400" />
                <span className="ml-2 text-xl font-bold text-white">{t.brand.name}</span>
              </div>
              <p className="text-gray-400 mb-4">
                AI-powered legal assistance based on the most up-to-date local law documents.
              </p>
              <div className="flex space-x-4">
                <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                  Privacy Policy
                </Link>
                <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </div>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Product</h3>
              <ul className="space-y-2">
                <li><Link href="#features" className="text-gray-400 hover:text-white transition-colors">Features</Link></li>
                <li><Link href="#pricing" className="text-gray-400 hover:text-white transition-colors">Pricing</Link></li>
                <li><Link href={`/${locale}/login`} className="text-gray-400 hover:text-white transition-colors">Get Started</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Support</h3>
              <ul className="space-y-2">
                <li><Link href="#" className="text-gray-400 hover:text-white transition-colors">Help Center</Link></li>
                <li><Link href="#" className="text-gray-400 hover:text-white transition-colors">Contact Us</Link></li>
                <li><Link href="#" className="text-gray-400 hover:text-white transition-colors">Status</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 text-center">
            <p className="text-gray-400">{t.footer.copyright}</p>
          </div>
        </div>
      </footer>
    </div>
  )
}