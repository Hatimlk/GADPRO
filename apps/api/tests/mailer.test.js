import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mailMocks = vi.hoisted(() => ({
  sendMail: vi.fn(),
  verify: vi.fn(),
  createTransport: vi.fn(),
}));

vi.mock('nodemailer', () => ({
  default: { createTransport: mailMocks.createTransport },
}));

const ENV_KEYS = [
  'EMAIL_MODE', 'EMAIL_TEST_TO', 'SMTP_HOST', 'SMTP_PORT', 'SMTP_SECURE',
  'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM_NAME', 'SMTP_FROM_EMAIL', 'SMTP_FROM',
  'PUBLIC_URL',
];
const originalEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));

function configure(mode, testTo = '') {
  process.env.EMAIL_MODE = mode;
  if (testTo) process.env.EMAIL_TEST_TO = testTo;
  else delete process.env.EMAIL_TEST_TO;
  process.env.SMTP_HOST = 'smtp.example.invalid';
  process.env.SMTP_PORT = '587';
  process.env.SMTP_SECURE = 'false';
  process.env.SMTP_USER = 'smtp-user-placeholder';
  process.env.SMTP_PASS = 'smtp-password-placeholder';
  process.env.SMTP_FROM_NAME = 'GADPRO';
  process.env.SMTP_FROM_EMAIL = 'no-reply@example.invalid';
  process.env.PUBLIC_URL = 'https://preprod.gadimat.pro';
}

const commercialPayload = {
  commercial: { nom: 'Commercial', email: 'commercial@example.com' },
  dossier: { id: 'dossier-1', nom_tire: 'Client', numero_valeur: 'CH-1' },
  action: { contenu: 'Relance client', type_action: 'relance' },
  auteurNom: 'Responsable',
};
const reminderPayload = {
  user: { nom: 'Auteur', email: 'auteur@example.com' },
  dossier: { erp_voucher_id: 42, nom_tire: 'Client', numero_valeur: 'CH-2' },
  action: { contenu: 'Rappel à traiter', type_action: 'relance', date_rappel: '2026-10-01' },
};

async function loadMailer() {
  vi.resetModules();
  return import('../src/domains/impayes/services/mailer.js');
}

describe('politique de livraison des e-mails', () => {
  beforeEach(() => {
    mailMocks.sendMail.mockReset().mockResolvedValue({ messageId: 'test-id' });
    mailMocks.verify.mockReset().mockResolvedValue(true);
    mailMocks.createTransport.mockReset().mockReturnValue({
      sendMail: mailMocks.sendMail,
      verify: mailMocks.verify,
    });
  });

  afterAll(() => {
    for (const key of ENV_KEYS) {
      if (originalEnv[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnv[key];
    }
  });

  it('n’ouvre aucun transport et n’envoie rien en mode disabled', async () => {
    configure('disabled');
    const mailer = await loadMailer();
    const results = await Promise.all([
      mailer.sendCommercialActionNotification(commercialPayload),
      mailer.sendActionDeadlineReminder(reminderPayload),
      mailer.sendSmtpTestEmail({ to: 'admin@example.com', nom: 'Admin' }),
    ]);
    expect(results.every((result) => result.sent === false && result.reason === 'email_disabled')).toBe(true);
    expect(mailMocks.createTransport).not.toHaveBeenCalled();
    expect(mailMocks.sendMail).not.toHaveBeenCalled();
  });

  it('redirige notifications, rappels et tests vers EMAIL_TEST_TO avec le préfixe préproduction', async () => {
    configure('test', 'capture@example.net');
    const mailer = await loadMailer();
    await mailer.sendCommercialActionNotification(commercialPayload);
    await mailer.sendActionDeadlineReminder(reminderPayload);
    await mailer.sendSmtpTestEmail({ to: 'admin@example.com', nom: 'Admin' });

    expect(mailMocks.sendMail).toHaveBeenCalledTimes(3);
    for (const [message] of mailMocks.sendMail.mock.calls) {
      expect(message.to).toBe('capture@example.net');
      expect(message.subject).toMatch(/^\[PREPROD\]/);
      expect(message.envelope).toEqual({ from: 'no-reply@example.invalid', to: ['capture@example.net'] });
      expect(JSON.stringify(message)).not.toMatch(/commercial@example\.com|auteur@example\.com|admin@example\.com/);
    }
    for (const [message] of mailMocks.sendMail.mock.calls.slice(0, 2)) {
      expect(message.text + message.html).toContain('https://preprod.gadimat.pro');
    }
    expect(mailMocks.createTransport).toHaveBeenCalledWith(expect.objectContaining({
      tls: { rejectUnauthorized: true },
    }));
  });

  it('retire to, cc, bcc et l’enveloppe d’origine en mode test', async () => {
    configure('test', 'capture@example.net');
    const { applyEmailPolicy, resolveEmailPolicy } = await loadMailer();
    const protectedMessage = applyEmailPolicy({
      to: 'original@example.com',
      cc: ['copy@example.com'],
      bcc: 'hidden@example.com',
      envelope: { from: 'old@example.com', to: ['raw@example.com'] },
      subject: 'Sujet',
    }, resolveEmailPolicy(), 'no-reply@example.invalid');

    expect(protectedMessage).not.toHaveProperty('cc');
    expect(protectedMessage).not.toHaveProperty('bcc');
    expect(protectedMessage.to).toBe('capture@example.net');
    expect(protectedMessage.envelope).toEqual({ from: 'no-reply@example.invalid', to: ['capture@example.net'] });
    expect(JSON.stringify(protectedMessage)).not.toMatch(/original|copy|hidden|raw|old@example/);
  });

  it('refuse le mode test sans EMAIL_TEST_TO avant de créer le transport', async () => {
    configure('test');
    const mailer = await loadMailer();
    await expect(mailer.sendCommercialActionNotification(commercialPayload))
      .rejects.toMatchObject({ code: 'EMAIL_CONFIG_INVALID' });
    expect(mailMocks.createTransport).not.toHaveBeenCalled();
    expect(mailMocks.sendMail).not.toHaveBeenCalled();
  });

  it('conserve les destinataires métier en mode production', async () => {
    configure('production');
    const mailer = await loadMailer();
    await mailer.sendCommercialActionNotification(commercialPayload);
    await mailer.sendActionDeadlineReminder(reminderPayload);
    await mailer.sendSmtpTestEmail({ to: 'admin@example.com', nom: 'Admin' });

    expect(mailMocks.sendMail.mock.calls.map(([message]) => message.to)).toEqual([
      'commercial@example.com', 'auteur@example.com', 'admin@example.com',
    ]);
    for (const [message] of mailMocks.sendMail.mock.calls) {
      expect(message.subject).not.toMatch(/^\[PREPROD\]/);
      expect(message).not.toHaveProperty('envelope');
    }
  });

  it('refuse une valeur EMAIL_MODE inconnue', async () => {
    configure('preview');
    const mailer = await loadMailer();
    await expect(mailer.sendSmtpTestEmail({ to: 'admin@example.com', nom: 'Admin' }))
      .rejects.toMatchObject({ code: 'EMAIL_CONFIG_INVALID' });
    expect(mailMocks.sendMail).not.toHaveBeenCalled();
  });
});
