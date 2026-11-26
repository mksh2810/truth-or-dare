export type LegalTab = 'terms' | 'privacy' | 'content' | 'safe-dares' | 'recording';

export const DRAFT_LEGAL_BANNER = 'DRAFT — NOT LEGALLY REVIEWED (Private Beta)';

export interface PolicySection {
  heading: string;
  body: string;
}

export interface PolicyDocument {
  id: LegalTab;
  label: string;
  title: string;
  banner: string;
  sections: PolicySection[];
}

export const POLICY_DOCUMENTS: PolicyDocument[] = [
  {
    id: 'terms',
    label: 'Terms',
    title: 'Terms of Use (Draft)',
    banner: DRAFT_LEGAL_BANNER,
    sections: [
      {
        heading: '1. Eligibility (18+ Self-Declaration)',
        body: 'Vowlet is intended strictly for adults aged 18 and older playing with consenting friends. By entering a table, you self-declare that you are at least 18 years old.',
      },
      {
        heading: '2. Respect & Consent',
        body: 'Every player may Skip any prompt at any time without pressure. Never coerce anyone to perform a truth or dare they are uncomfortable with.',
      },
      {
        heading: '3. Private Beta',
        body: 'Vowlet is provided as-is during Private Beta for non-commercial play. Features, rooms, and policies may change prior to public launch.',
      },
    ],
  },
  {
    id: 'privacy',
    label: 'Privacy',
    title: 'Privacy Policy (Draft)',
    banner: DRAFT_LEGAL_BANNER,
    sections: [
      {
        heading: 'Data We Store',
        body: 'Guest players only store a temporary display name and session score while a room is active. Rooms expire automatically 4 hours after last activity.',
      },
      {
        heading: 'Optional Sign-In',
        body: 'If you sign in with Google, Vowlet stores your Lifetime XP, level, unlocked bottle skins, and saved table summaries.',
      },
      {
        heading: 'Delete My Data',
        body: 'You can delete your server-side profile data and clear all local preferences anytime from Profile & Settings → Delete My Data.',
      },
    ],
  },
  {
    id: 'content',
    label: 'Content',
    title: 'Content Policy (Draft)',
    banner: DRAFT_LEGAL_BANNER,
    sections: [
      {
        heading: 'Prohibited Content',
        body: 'All chits must be alcohol-free, drug-free, non-explicit, and free of hate speech, harassment, self-harm, or violence. Never include minors or real non-participants.',
      },
      {
        heading: 'No Personal Information (PII)',
        body: 'Do not submit phone numbers, email addresses, home addresses, or private handles in chits or room names.',
      },
      {
        heading: 'Moderation & Reporting',
        body: 'Chits are screened by Judge Owl before entering the deck. Players can report or block abusive participants directly from the lobby table.',
      },
    ],
  },
  {
    id: 'safe-dares',
    label: 'Safe Dares',
    title: 'Safe Dares Policy (Draft)',
    banner: DRAFT_LEGAL_BANNER,
    sections: [
      {
        heading: 'Physical & Social Safety',
        body: 'Dares must never involve trespassing, driving or operating vehicles, fire, heights, ingesting unknown or harmful substances, nudity, or public harassment.',
      },
      {
        heading: 'Instant vs. Social Dares',
        body: 'Instant dares happen right at the table. Social/External dares (such as sending a harmless text) must never target strangers or cause real-world harm.',
      },
      {
        heading: 'Right to Skip',
        body: 'Any performer can tap Skip at any moment during a turn. The table must respect a Skip immediately.',
      },
    ],
  },
  {
    id: 'recording',
    label: 'Recording',
    title: 'Recording Notice (Draft)',
    banner: DRAFT_LEGAL_BANNER,
    sections: [
      {
        heading: 'External Call & Room Recording Notice',
        body: 'Vowlet does not record your room audio or video. However, others in the same room or on an external video call (Meet, WhatsApp, Discord) can record audio or video. Play accordingly.',
      },
    ],
  },
];

export function getPolicyDocument(tab: LegalTab): PolicyDocument {
  return POLICY_DOCUMENTS.find((doc) => doc.id === tab) ?? POLICY_DOCUMENTS[0]!;
}
