import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Check,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  Menu,
  Package,
  Play,
  ShieldCheck,
  ShoppingBag,
  Store,
  Users,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PwaInstallButton } from "@/components/pwa/PwaInstallButton";
import { useAuth } from "@/lib/auth-store";
import { LoginDialog } from "@/features/auth/LoginDialog";

const navigation = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "About", href: "#about" },
  { label: "Contact", href: "#contact" },
];

const features = [
  {
    icon: ShoppingBag,
    title: "Point of Sale",
    description: "Fast, simple checkout that keeps working when the internet drops.",
    tint: "bg-teal-50 text-teal-700",
  },
  {
    icon: Package,
    title: "Inventory",
    description: "Real-time stock levels that update automatically with every sale.",
    tint: "bg-emerald-50 text-emerald-700",
  },
  {
    icon: Store,
    title: "Multi-Branch",
    description: "See how every location is doing, all from one clear view.",
    tint: "bg-cyan-50 text-cyan-700",
  },
  {
    icon: BarChart3,
    title: "Reports",
    description: "Sales, expenses, and top products turned into instant insights.",
    tint: "bg-sky-50 text-sky-700",
  },
  {
    icon: Users,
    title: "Staff Access",
    description: "Set clear roles and know who did what, and when.",
    tint: "bg-indigo-50 text-indigo-700",
  },
  {
    icon: ShieldCheck,
    title: "VAT Ready",
    description: "Automatic tax calculations and reports built for your business.",
    tint: "bg-amber-50 text-amber-700",
  },
];

const steps = [
  {
    number: "01",
    title: "Sign up",
    description: "Create your account and set up your business in just a few minutes.",
    icon: Zap,
  },
  {
    number: "02",
    title: "Add your branches",
    description: "Bring your locations, products, and team together in one place.",
    icon: Store,
  },
  {
    number: "03",
    title: "Start selling",
    description: "Ring up sales, track stock, and watch your business grow.",
    icon: ArrowRight,
  },
];

const testimonials = [
  {
    quote:
      "I can finally see what’s happening in each branch without calling everyone for updates.",
    name: "Small business owner",
    location: "Metro Manila",
    initials: "MB",
  },
  {
    quote:
      "Checkout is simple for the team, and our stock stays up to date after every sale.",
    name: "Retail shop owner",
    location: "Cebu City",
    initials: "RO",
  },
  {
    quote:
      "The reports make it much easier to understand what’s selling and where to focus.",
    name: "Growing business owner",
    location: "Davao City",
    initials: "GB",
  },
];

function Brand() {
  return (
    <Link to="/" aria-label="StorePulse home" className="group inline-flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-700 text-white shadow-sm shadow-teal-900/15 transition-transform duration-200 group-hover:-rotate-3">
        <Store className="h-[18px] w-[18px]" strokeWidth={2.2} />
      </span>
      <span className="text-[17px] font-bold tracking-[-0.04em] text-slate-900">
        Store<span className="text-teal-700">Pulse</span>
      </span>
    </Link>
  );
}

function DashboardPreview() {
  return (
    <div id="demo" className="relative mx-auto w-full max-w-[590px]">
      <div className="absolute -inset-5 rounded-[2.5rem] bg-gradient-to-br from-teal-200/50 via-emerald-100/40 to-sky-100/50 blur-2xl" />
      <Card className="relative overflow-hidden rounded-2xl border-slate-200/80 bg-white shadow-[0_32px_90px_-36px_rgba(15,23,42,0.3)]">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
              <Store className="h-[18px] w-[18px]" />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900">Business overview</p>
              <p className="text-xs text-slate-500">All branches · Today</p>
            </div>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
          >
            This week <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 sm:p-6">
          <div className="rounded-xl border border-slate-100 bg-white p-3.5 sm:p-4">
            <p className="text-xs text-slate-500">Total sales</p>
            <p className="mt-2 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              ₱48,290
            </p>
            <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
              <ArrowDown className="h-3 w-3 rotate-180" /> 12.8% this week
            </p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-white p-3.5 sm:p-4">
            <p className="text-xs text-slate-500">Transactions</p>
            <p className="mt-2 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              186
            </p>
            <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
              <ArrowDown className="h-3 w-3 rotate-180" /> 8.2% this week
            </p>
          </div>
          <div className="col-span-2 rounded-xl border border-slate-100 bg-white p-3.5 sm:col-span-1 sm:p-4">
            <p className="text-xs text-slate-500">Active branches</p>
            <p className="mt-2 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              3 locations
            </p>
            <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-teal-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              All branches online
            </p>
          </div>
        </div>

        <div className="px-4 pb-5 sm:px-6 sm:pb-6">
          <div className="rounded-xl border border-slate-100 p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">Sales activity</p>
                <p className="text-xs text-slate-400">Across all locations</p>
              </div>
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="h-2 w-2 rounded-full bg-teal-600" />
                This week
              </span>
            </div>
            <div className="relative h-28 sm:h-36">
              <div className="absolute inset-0 flex flex-col justify-between">
                <span className="border-t border-dashed border-slate-100" />
                <span className="border-t border-dashed border-slate-100" />
                <span className="border-t border-dashed border-slate-100" />
                <span className="border-t border-dashed border-slate-100" />
              </div>
              <svg
                viewBox="0 0 520 130"
                preserveAspectRatio="none"
                className="absolute inset-0 h-full w-full overflow-visible"
                role="img"
                aria-label="Illustrative weekly sales trend rising through the week"
              >
                <defs>
                  <linearGradient id="sales-fill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#0d9488" stopOpacity=".2" />
                    <stop offset="100%" stopColor="#0d9488" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0 104 C30 98 40 79 74 83 S116 105 148 75 S196 72 222 62 S267 75 296 56 S342 67 370 40 S416 55 444 29 S490 35 520 12 V130 H0Z"
                  fill="url(#sales-fill)"
                />
                <path
                  d="M0 104 C30 98 40 79 74 83 S116 105 148 75 S196 72 222 62 S267 75 296 56 S342 67 370 40 S416 55 444 29 S490 35 520 12"
                  fill="none"
                  stroke="#0d9488"
                  strokeLinecap="round"
                  strokeWidth="3"
                  vectorEffect="non-scaling-stroke"
                />
                <circle cx="520" cy="12" r="5" fill="#0d9488" />
                <circle cx="520" cy="12" r="9" fill="#0d9488" fillOpacity=".12" />
              </svg>
            </div>
            <div className="mt-3 flex justify-between text-[10px] font-medium text-slate-400 sm:text-[11px]">
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
              <span>Sun</span>
            </div>
          </div>
        </div>
      </Card>

      <div className="absolute -bottom-5 -left-3 hidden items-center gap-2.5 rounded-2xl border border-slate-100 bg-white p-3.5 shadow-xl shadow-slate-900/10 sm:flex sm:-left-8">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
          <Check className="h-4 w-4" />
        </span>
        <span>
          <span className="block text-xs font-semibold text-slate-800">Stock updated</span>
          <span className="block text-[11px] text-slate-500">Sale synced automatically</span>
        </span>
      </div>
    </div>
  );
}

interface StorePulseLandingPageProps {
  initialLoginOpen?: boolean;
}

export function StorePulseLandingPage({
  initialLoginOpen = false,
}: StorePulseLandingPageProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(initialLoginOpen);

  return (
    <div className="font-inter min-h-dvh scroll-smooth bg-white text-slate-800">
      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/90 backdrop-blur-xl">
        <nav
          aria-label="Main navigation"
          className="mx-auto flex h-[68px] max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10"
        >
          <Brand />

          <div className="hidden items-center gap-8 md:flex">
            {navigation.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-[13px] font-medium text-slate-500 transition-colors hover:text-teal-700"
              >
                {item.label}
              </a>
            ))}
          </div>

          <div className="hidden items-center gap-2.5 md:flex">
            <PwaInstallButton className="h-10 border-teal-200 px-3.5 font-semibold text-teal-800 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-900" />
            <Button
              type="button"
              variant="ghost"
              className="text-slate-600 hover:text-teal-700"
              onClick={() => setLoginOpen(true)}
            >
              Sign In
            </Button>
            <Button
              asChild
              className="rounded-xl bg-teal-700 px-4 text-white shadow-sm shadow-teal-900/15 transition-all hover:-translate-y-0.5 hover:bg-teal-800 hover:shadow-md"
            >
              <Link to="/register">
                Get Started <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <PwaInstallButton
              iconOnly
              className="border-teal-200 text-teal-800 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-900"
            />
            <button
              type="button"
              aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={menuOpen}
              aria-controls="mobile-navigation"
              onClick={() => setMenuOpen((open) => !open)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700 transition-colors hover:bg-slate-50"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </nav>
        {menuOpen && (
          <div
            id="mobile-navigation"
            className="border-t border-slate-100 bg-white px-5 py-4 shadow-lg shadow-slate-900/5 md:hidden"
          >
            <div className="mx-auto flex max-w-7xl flex-col gap-1">
              {navigation.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-teal-50 hover:text-teal-800"
                >
                  {item.label}
                </a>
              ))}
              <div className="mt-2 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => {
                    setMenuOpen(false);
                    setLoginOpen(true);
                  }}
                >
                  Sign In
                </Button>
                <Button asChild className="rounded-xl bg-teal-700 hover:bg-teal-800">
                  <Link to="/register">Get Started</Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </header>

      <main>
        <section className="relative overflow-hidden bg-gradient-to-b from-teal-50/70 via-white to-white">
          <div className="pointer-events-none absolute -right-48 -top-40 h-[34rem] w-[34rem] rounded-full bg-emerald-100/50 blur-3xl" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 pb-20 pt-14 sm:px-8 sm:pb-24 sm:pt-20 lg:grid-cols-[0.92fr_1.08fr] lg:gap-10 lg:px-10 lg:pb-28 lg:pt-24">
            <div className="max-w-xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal-100 bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-teal-800 shadow-sm shadow-teal-900/5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Business clarity, all in one place
              </div>
              <h1 className="text-[2.65rem] font-bold leading-[1.08] tracking-[-0.055em] text-slate-950 sm:text-5xl lg:text-[3.7rem]">
                Run Your Entire Business{" "}
                <span className="text-teal-700">From One Place</span>
              </h1>
              <p className="mt-6 max-w-lg text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
                Track sales, inventory, staff, and performance across all your
                branches — from anywhere.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button
                  asChild
                  size="lg"
                  className="h-12 rounded-xl bg-teal-700 px-6 text-sm font-semibold text-white shadow-lg shadow-teal-800/15 transition-all hover:-translate-y-0.5 hover:bg-teal-800 hover:shadow-xl"
                >
                  <Link to="/register">
                    Start Free Trial <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-12 rounded-xl border-slate-200 bg-white/80 px-6 text-sm font-semibold text-slate-700 transition-all hover:border-teal-200 hover:bg-teal-50/70 hover:text-teal-800"
                >
                  <a href="#demo">
                    <Play className="h-4 w-4 fill-current" /> Watch Demo
                  </a>
                </Button>
              </div>
              <div className="mt-7 flex items-start gap-2.5 text-sm leading-6 text-slate-500">
                <ShieldCheck className="mt-0.5 h-[18px] w-[18px] shrink-0 text-teal-700" />
                <span>
                  Built for Philippine small businesses — VAT inclusive, GCash &
                  Maya ready
                </span>
              </div>
              <div className="mt-10 flex flex-wrap items-center gap-x-7 gap-y-3 border-t border-slate-200/80 pt-6 text-xs font-medium text-slate-500">
                <span className="inline-flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600" /> Easy to use
                </span>
                <span className="inline-flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600" /> Works offline
                </span>
                <span className="inline-flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600" /> Built to grow
                </span>
              </div>
            </div>

            <div className="lg:pl-4">
              <DashboardPreview />
            </div>
          </div>
        </section>

        <section id="features" className="scroll-mt-24 px-5 py-20 sm:px-8 sm:py-24 lg:px-10">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto mb-12 max-w-2xl text-center sm:mb-14">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">
                Everything in sync
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-[-0.045em] text-slate-950 sm:text-4xl">
                One platform. Every part of your business.
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-500">
                Spend less time switching tools and more time growing your business.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <Card
                  key={feature.title}
                  className="group rounded-2xl border-slate-200/80 bg-white p-6 shadow-[0_4px_20px_-12px_rgba(15,23,42,0.14)] transition-all duration-200 hover:-translate-y-1 hover:border-teal-200 hover:shadow-[0_18px_40px_-22px_rgba(13,148,136,0.3)] sm:p-7"
                >
                  <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${feature.tint}`}>
                    <feature.icon className="h-5 w-5" strokeWidth={1.9} />
                  </span>
                  <h3 className="mt-5 text-base font-semibold tracking-tight text-slate-900">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {feature.description}
                  </p>
                  <ArrowUpRight className="mt-4 h-4 w-4 text-slate-300 transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-teal-700" />
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="about" className="scroll-mt-24 bg-slate-50/80 px-5 py-20 sm:px-8 sm:py-24 lg:px-10">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:gap-20">
              <div className="max-w-md">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">
                  How it works
                </p>
                <h2 className="mt-3 text-3xl font-bold tracking-[-0.045em] text-slate-950 sm:text-4xl">
                  Simple to start. Ready to scale.
                </h2>
                <p className="mt-4 text-base leading-7 text-slate-500">
                  Get a clearer view of your business without a complicated setup.
                  Start with one location and bring every branch along.
                </p>
                <Button
                  asChild
                  className="mt-7 rounded-xl bg-teal-700 text-white transition-all hover:-translate-y-0.5 hover:bg-teal-800"
                >
                  <Link to="/register">
                    Get started <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <div className="space-y-4">
                {steps.map((step, index) => (
                  <div
                    key={step.number}
                    className="relative flex gap-5 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-900/[0.03] sm:gap-6 sm:p-6"
                  >
                    {index < steps.length - 1 && (
                      <span className="absolute bottom-[-18px] left-[2.45rem] z-10 hidden h-5 border-l border-dashed border-teal-200 sm:block" />
                    )}
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
                      <step.icon className="h-5 w-5" />
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-slate-900">{step.title}</h3>
                        <span className="text-[11px] font-bold tracking-widest text-teal-700/60">
                          {step.number}
                        </span>
                      </div>
                      <p className="mt-1.5 text-sm leading-6 text-slate-500">
                        {step.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="px-5 py-20 sm:px-8 sm:py-24 lg:px-10">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">
                  Made for local businesses
                </p>
                <h2 className="mt-3 text-3xl font-bold tracking-[-0.045em] text-slate-950 sm:text-4xl">
                  Growing together, branch by branch.
                </h2>
              </div>
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600">
                <Users className="h-4 w-4 text-teal-700" />
                Trusted by 1,000+ store owners across the Philippines
              </p>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {testimonials.map((testimonial) => (
                <Card
                  key={testimonial.location}
                  className="flex h-full flex-col rounded-2xl border-slate-200/80 p-6 shadow-[0_4px_20px_-12px_rgba(15,23,42,0.14)] sm:p-7"
                >
                  <div className="flex gap-1 text-amber-400" aria-label="5 out of 5 stars">
                    {Array.from({ length: 5 }, (_, index) => (
                      <span key={index} aria-hidden="true">★</span>
                    ))}
                  </div>
                  <blockquote className="mt-5 flex-1 text-[15px] leading-7 text-slate-700">
                    “{testimonial.quote}”
                  </blockquote>
                  <div className="mt-6 flex items-center gap-3 border-t border-slate-100 pt-5">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-50 text-xs font-bold text-teal-800">
                      {testimonial.initials}
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-slate-900">
                        {testimonial.name}
                      </span>
                      <span className="block text-xs text-slate-500">
                        {testimonial.location}
                      </span>
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section
          id="pricing"
          className="scroll-mt-24 px-5 pb-20 sm:px-8 sm:pb-24 lg:px-10"
        >
          <div className="mx-auto max-w-7xl">
            <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-teal-700 via-teal-700 to-emerald-700 px-6 py-12 text-white shadow-xl shadow-teal-900/15 sm:px-10 sm:py-14 lg:px-16">
              <div className="absolute -right-20 -top-36 h-80 w-80 rounded-full border border-white/10" />
              <div className="absolute -right-5 -top-24 h-64 w-64 rounded-full border border-white/10" />
              <div className="absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl" />
              <div className="relative flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
                <div className="max-w-2xl">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-teal-50 ring-1 ring-white/15">
                    <CircleDollarSign className="h-3.5 w-3.5" /> Get started for free
                  </span>
                  <h2 className="mt-5 text-3xl font-bold leading-tight tracking-[-0.04em] sm:text-4xl">
                    Ready to take full control of your business?
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-teal-50/80 sm:text-base">
                    See every branch clearly, keep your team in sync, and make
                    your next move with confidence.
                  </p>
                </div>
                <Button
                  asChild
                  size="lg"
                  className="h-12 shrink-0 rounded-xl bg-white px-5 font-semibold text-teal-800 shadow-md transition-all hover:-translate-y-0.5 hover:bg-teal-50 hover:shadow-lg"
                >
                  <Link to="/register">
                    Get Started — It&apos;s Free <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer id="contact" className="scroll-mt-24 border-t border-slate-200 bg-slate-50/70 px-5 pb-8 pt-12 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.3fr_0.7fr_0.7fr_1fr]">
            <div>
              <Brand />
              <p className="mt-4 max-w-xs text-sm leading-6 text-slate-500">
                A simpler way to run and grow your business, wherever you are.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Explore</h3>
              <div className="mt-4 flex flex-col gap-3 text-sm text-slate-500">
                <a className="transition-colors hover:text-teal-700" href="#features">Features</a>
                <a className="transition-colors hover:text-teal-700" href="#pricing">Pricing</a>
                <a className="transition-colors hover:text-teal-700" href="#about">How it works</a>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Account</h3>
              <div className="mt-4 flex flex-col gap-3 text-sm text-slate-500">
                <button
                  type="button"
                  className="w-fit text-left transition-colors hover:text-teal-700"
                  onClick={() => setLoginOpen(true)}
                >
                  Sign in
                </button>
                <Link className="transition-colors hover:text-teal-700" to="/register">Get started</Link>
                <Link className="transition-colors hover:text-teal-700" to="/privacy">Privacy</Link>
                <Link className="transition-colors hover:text-teal-700" to="/terms">Terms</Link>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Contact</h3>
              <p className="mt-4 text-sm leading-6 text-slate-500">
                Have a question about managing multiple branches? We&apos;re here to help.
              </p>
              <a
                href="mailto:hello@storepulse.ph"
                className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-teal-700 transition-colors hover:text-teal-900"
              >
                Get in touch <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
          <div className="mt-10 flex flex-col gap-3 border-t border-slate-200 pt-6 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
            <p>© 2026 StorePulse. All rights reserved.</p>
            <p className="inline-flex items-center gap-1.5">
              <Clock3 className="h-3.5 w-3.5" />
              Made for Philippine small businesses
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

interface PublicHomeRouteProps {
  initialLoginOpen?: boolean;
}

export function PublicHomeRoute({
  initialLoginOpen = false,
}: PublicHomeRouteProps) {
  const user = useAuth((state) => state.user);
  return user ? (
    <HomeRedirect />
  ) : (
    <StorePulseLandingPage initialLoginOpen={initialLoginOpen} />
  );
}

function HomeRedirect() {
  const user = useAuth((state) => state.user);
  return (
    <Navigate
      to={user?.role === "STAFF" ? "/sales-history" : "/dashboard"}
      replace
    />
  );
}
