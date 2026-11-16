'use client';

import Link from 'next/link';
import { ArrowRight, CalendarCheck, Heart, Lock, ShieldCheck, Star, Users } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { IconPanel } from '@/components/shared/IconPanel';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useT } from '@/i18n/provider';

export default function AboutPage() {
  const t = useT();
  const features = [
    { icon: ShieldCheck, title: t('info.verifiedTitle'), body: t('info.verifiedBody') },
    { icon: CalendarCheck, title: t('info.realTimeTitle'), body: t('info.realTimeBody') },
    { icon: Lock, title: t('info.privacyTitle'), body: t('info.privacyBody') },
  ];

  return (
    <MainLayout>
      <section className="border-b bg-card">
        <div className="container-page grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-2 lg:gap-16">
          <div className="space-y-5">
            <h1 className="text-[clamp(2rem,1.5rem+2vw,3rem)] leading-tight font-bold">
              {t('info.aboutTitle')}
            </h1>
            <p className="text-lg text-muted-foreground">{t('info.aboutIntro')}</p>
            <Button asChild size="lg">
              <Link href="/search">
                {t('home.allDoctorsButton')}
                <ArrowRight className="rtl:rotate-180" aria-hidden />
              </Link>
            </Button>
          </div>
          <IconPanel
            icon={Users}
            className="min-h-80"
            chips={[
              { icon: ShieldCheck, label: t('info.verifiedTitle') },
              { icon: CalendarCheck, label: t('info.realTimeTitle') },
              { icon: Lock, label: t('info.privacyTitle') },
            ]}
          />
        </div>
      </section>

      <section className="py-12 sm:py-16">
        <div className="container-page grid gap-6 lg:grid-cols-2">
          {[
            { icon: Heart, title: t('info.missionTitle'), body: t('info.missionBody') },
            { icon: Star, title: t('info.visionTitle'), body: t('info.visionBody') },
          ].map(({ icon: Icon, title, body }) => (
            <Card key={title} className="gap-4 px-6 sm:px-8">
              <span className="flex size-12 items-center justify-center rounded-xl bg-accent text-primary">
                <Icon className="size-6" aria-hidden />
              </span>
              <h2 className="text-2xl font-semibold">{title}</h2>
              <p className="leading-relaxed text-muted-foreground">{body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-t bg-card py-12 sm:py-16">
        <div className="container-page grid gap-8 md:grid-cols-3">
          {features.map(({ icon: Icon, title, body }) => (
            <div key={title} className="space-y-3">
              <span className="flex size-12 items-center justify-center rounded-xl bg-accent text-primary">
                <Icon className="size-6" aria-hidden />
              </span>
              <h3 className="text-lg font-semibold">{title}</h3>
              <p className="text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </MainLayout>
  );
}
