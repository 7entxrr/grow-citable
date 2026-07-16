export interface Tier {
  name: 'Starter' | 'Growth' | 'Ultra';
  description: string;
  features: string[];
  priceId: { month: string; year: string };
}

export const tiers: Tier[] = [
  {
    name: 'Starter',
    description: 'For small teams getting started with SEO audits.',
    features: [
      '1 website tracked',
      '500 prompts / month',
      'Basic SEO & AEO audits',
      'Email support',
      'Content recommendations',
    ],
    priceId: {
      month: 'pri_01kwzg87yb1127xkbdjt3szez6',
      year: 'pri_01kwzg87yb1127xkbdjt3szez6',
    },
  },
  {
    name: 'Growth',
    description: 'For growing companies that need full visibility.',
    features: [
      '5 websites tracked',
      '2,000 prompts / month',
      'Full AEO + GEO audits',
      'Priority email support',
      'Custom integrations',
      'API access',
    ],
    priceId: {
      month: 'pri_01kwzg7ex4dwyjgrdthmdqt9ae',
      year: 'pri_01kwzg7ex4dwyjgrdthmdqt9ae',
    },
  },
  {
    name: 'Ultra',
    description: 'For large organizations with advanced needs.',
    features: [
      'Unlimited websites',
      'Unlimited prompts',
      'All AI engine tracking',
      'Dedicated support team',
      'SSO / SAML',
      'SLA guarantees',
      'Custom AI models',
    ],
    priceId: {
      month: 'pri_01kx46z00r3w6d0v3cb5smpfz3',
      year: 'pri_01kx46z00r3w6d0v3cb5smpfz3',
    },
  },
];
