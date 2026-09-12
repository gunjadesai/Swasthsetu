import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Stethoscope,
  UserRound,
  HeartHandshake,
  Building2,
  ClipboardCheck,
  Video,
  WifiOff,
  Languages,
  ArrowRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role_id, roles(role_name)")
      .eq("id", user.id)
      .single();

    const roleName = (profile?.roles as { role_name?: string } | null)
      ?.role_name;
    redirect(roleName === "Doctor" ? "/doctor/dashboard" : "/patient/dashboard");
  }

  const t = await getDictionary();

  const roles = [
    { icon: UserRound, title: t("landing.roles.patient"), desc: t("landing.roles.patient.desc") },
    { icon: Stethoscope, title: t("landing.roles.doctor"), desc: t("landing.roles.doctor.desc") },
    { icon: HeartHandshake, title: t("landing.roles.asha"), desc: t("landing.roles.asha.desc") },
    { icon: Building2, title: t("landing.roles.hospital"), desc: t("landing.roles.hospital.desc") },
  ];

  const features = [
    { icon: ClipboardCheck, title: t("landing.features.triage"), desc: t("landing.features.triage.desc") },
    { icon: Video, title: t("landing.features.teleconsult"), desc: t("landing.features.teleconsult.desc") },
    { icon: WifiOff, title: t("landing.features.offline"), desc: t("landing.features.offline.desc") },
    { icon: Languages, title: t("landing.features.multilingual"), desc: t("landing.features.multilingual.desc") },
  ];

  return (
    <div className="min-h-screen bg-sage-50">
      {/* Nav */}
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-lg font-semibold text-teal-600">{t("app.name")}</span>
          <nav className="hidden items-center gap-6 text-sm font-medium text-ink/70 sm:flex">
            <a href="#roles" className="hover:text-ink">
              {t("landing.nav.roles")}
            </a>
            <a href="#features" className="hover:text-ink">
              {t("landing.nav.features")}
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <LanguageSwitcher variant="light" />
            <ThemeToggle variant="light" className="hidden sm:flex" />
            <Link href="/login">
              <Button size="sm" variant="secondary">
                {t("landing.login")}
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">{t("landing.signup")}</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-hero">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
          <div className="max-w-2xl">
            {/* marigold-300, not -400: on the hero fill the brighter
                accent only reached 3.9:1, under AA for this size. */}
            <span className="inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-marigold-300">
              {t("landing.hero.badge")}
            </span>
            <h1 className="mt-5 text-4xl font-semibold leading-tight text-white sm:text-5xl">
              {t("landing.title")}
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/80">
              {t("landing.subtitle")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup">
                <Button size="md" className="bg-marigold-500 text-ink-fixed hover:bg-marigold-600">
                  {t("landing.signup")}
                </Button>
              </Link>
              <Link href="/login">
                <Button
                  size="md"
                  variant="secondary"
                  className="border-white/30 bg-transparent text-white hover:border-white"
                >
                  {t("landing.login")}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Roles */}
      <section id="roles" className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-2xl font-semibold text-ink">{t("landing.roles.title")}</h2>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {roles.map((r) => (
            <div
              key={r.title}
              className="rounded-lg border border-line bg-surface p-5 transition-colors hover:border-teal-500"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-teal-50 text-teal-600">
                <r.icon className="h-5 w-5" />
              </div>
              <p className="mt-4 font-semibold text-ink">{r.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-ink/70">{r.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-2xl font-semibold text-ink">{t("landing.features.title")}</h2>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div key={f.title}>
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-marigold-400/15 text-marigold-600">
                  <f.icon className="h-5 w-5" />
                </div>
                <p className="mt-4 font-semibold text-ink">{f.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-ink/70">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA band */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="flex flex-col items-start justify-between gap-6 rounded-lg border border-line bg-surface p-8 sm:flex-row sm:items-center">
          <div>
            <p className="text-xl font-semibold text-ink">{t("landing.title")}</p>
            <p className="mt-1 text-sm text-ink/70">{t("landing.footer.tagline")}</p>
          </div>
          <Link href="/signup">
            <Button size="md" className="whitespace-nowrap">
              {t("landing.signup")}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-ink/70 sm:flex-row">
          <span>{t("app.name")}</span>
          <span>{t("landing.footer.tagline")}</span>
        </div>
      </footer>
    </div>
  );
}
