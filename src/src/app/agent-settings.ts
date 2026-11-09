export const DEFAULT_AGENT_EMAIL = 'eliska.petrasova@re-max.cz';
export const DEFAULT_AGENT_PHONE = '775 946 596';
export const AGENT_EMAIL_OPTIONS = [DEFAULT_AGENT_EMAIL, 'eliska.petrasova@artem-saykin.cz'];
export const BROKER_DRIVING_VISIBILITY_FIELD = 'Dojezd__broker-info-visible';

interface AgentContacts {
  email: string;
  phone: string;
  emailOptions?: string[];
  phoneOptions?: string[];
  additionalPhone?: string;
}

export function agentContactOptions(profile: AgentContacts, kind: 'email' | 'phone'): string[] {
  const saved = kind === 'email' ? profile.emailOptions : profile.phoneOptions;
  const defaults = kind === 'email' ? AGENT_EMAIL_OPTIONS : [DEFAULT_AGENT_PHONE];
  return [...new Set([...defaults, ...(Array.isArray(saved) ? saved : []), profile[kind], ...(kind === 'phone' ? [profile.additionalPhone] : [])]
    .filter((value): value is string => typeof value === 'string' && Boolean(value.trim())).map(value => value.trim()))];
}
