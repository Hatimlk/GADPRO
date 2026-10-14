import nodemailer from 'nodemailer';
import config from '../config/env.js';

let transporter;
const EMAIL_MODES = new Set(['disabled', 'test', 'production']);

function configurationError(message) {
  const error = new Error(message);
  error.code = 'EMAIL_CONFIG_INVALID';
  return error;
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

export function resolveEmailPolicy(emailConfig = config.email) {
  const mode = String(emailConfig?.mode || 'disabled').trim().toLowerCase();
  if (!EMAIL_MODES.has(mode)) {
    throw configurationError('EMAIL_MODE doit être disabled, test ou production.');
  }
  if (mode === 'disabled') return { mode, enabled: false };
  if (mode === 'test') {
    const testTo = String(emailConfig?.testTo || '').trim();
    if (!isEmail(testTo)) {
      throw configurationError('EMAIL_TEST_TO est obligatoire et doit être une adresse valide en mode test.');
    }
    return { mode, enabled: true, testTo };
  }
  return { mode, enabled: true };
}

export function applyEmailPolicy(message, policy, envelopeFrom) {
  if (policy.mode !== 'test') return { ...message };
  const protectedMessage = {
    ...message,
    to: policy.testTo,
    subject: String(message.subject || '').startsWith('[PREPROD]')
      ? message.subject
      : `[PREPROD] ${message.subject || ''}`.trim(),
    envelope: { from: envelopeFrom, to: [policy.testTo] },
  };
  delete protectedMessage.cc;
  delete protectedMessage.bcc;
  return protectedMessage;
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function getTransporter() {
  const policy = resolveEmailPolicy();
  if (!policy.enabled) return null;
  if (!config.smtp.host || !config.smtp.user || !config.smtp.pass || !config.smtp.fromEmail) {
    throw configurationError('Configuration SMTP incomplète pour le mode e-mail actif.');
  }
  if (!Number.isInteger(config.smtp.port) || config.smtp.port <= 0) {
    throw configurationError('SMTP_PORT doit être un port valide.');
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      requireTLS: !config.smtp.secure,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
      tls: { rejectUnauthorized: true },
    });
  }

  return transporter;
}

async function dispatchEmail(message, { verify = false } = {}) {
  const policy = resolveEmailPolicy();
  if (!policy.enabled) return { sent: false, reason: 'email_disabled' };
  const smtp = getTransporter();
  const protectedMessage = applyEmailPolicy(message, policy, config.smtp.fromEmail);
  if (verify) await smtp.verify();
  await smtp.sendMail(protectedMessage);
  return { sent: true, to: protectedMessage.to, mode: policy.mode };
}

export async function sendCommercialActionNotification({ commercial, dossier, action, auteurNom }) {
  const dossierUrl = `${config.appUrl.replace(/\/$/, '')}/impayes/dossiers/${dossier.id}`;
  const subject = `[PROGAD] Nouveau commentaire - ${dossier.nom_tire || dossier.numero_valeur}`;
  const safeContent = escapeHtml(action.contenu).replaceAll('\n', '<br>');

  return dispatchEmail({
    from: `"${config.smtp.fromName.replaceAll('"', '')}" <${config.smtp.fromEmail}>`,
    to: commercial.email,
    subject,
    text: [
      `Bonjour ${commercial.nom},`,
      '',
      `${auteurNom} a ajouté un commentaire sur l'un de vos dossiers.`,
      `Client : ${dossier.nom_tire || '-'}`,
      `N° valeur : ${dossier.numero_valeur || '-'}`,
      `Type : ${action.type_action}`,
      '',
      action.contenu,
      '',
      `Consulter le dossier : ${dossierUrl}`,
    ].join('\n'),
    html: `
      <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#172033">
        <div style="padding:20px 24px;background:#1d4ed8;color:#fff;border-radius:12px 12px 0 0">
          <h2 style="margin:0;font-size:20px">Nouveau commentaire sur un dossier</h2>
        </div>
        <div style="padding:24px;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px">
          <p>Bonjour <strong>${escapeHtml(commercial.nom)}</strong>,</p>
          <p><strong>${escapeHtml(auteurNom)}</strong> a ajouté un commentaire sur l’un de vos dossiers.</p>
          <div style="padding:14px 16px;background:#f8fafc;border-radius:8px;margin:18px 0">
            <div><strong>Client :</strong> ${escapeHtml(dossier.nom_tire || '-')}</div>
            <div style="margin-top:6px"><strong>N° valeur :</strong> ${escapeHtml(dossier.numero_valeur || '-')}</div>
            <div style="margin-top:6px"><strong>Type :</strong> ${escapeHtml(action.type_action)}</div>
          </div>
          <div style="padding:16px;border-left:4px solid #2563eb;background:#eff6ff;margin-bottom:22px">${safeContent}</div>
          <a href="${escapeHtml(dossierUrl)}" style="display:inline-block;padding:11px 18px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold">Consulter le dossier</a>
          <p style="margin-top:24px;color:#64748b;font-size:12px">Notification automatique — PROGAD-Suivi Impayé</p>
        </div>
      </div>`,
  });
}

export async function sendSmtpTestEmail({ to, nom }) {
  return dispatchEmail({
    from: `"${config.smtp.fromName.replaceAll('"', '')}" <${config.smtp.fromEmail}>`,
    to,
    subject: '[PROGAD] Test de configuration SMTP',
    text: `Bonjour ${nom || ''},\n\nLa configuration SMTP de PROGAD fonctionne correctement.\n\nCet e-mail est un test automatique.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#172033">
        <div style="padding:20px 24px;background:#1d4ed8;color:#fff;border-radius:12px 12px 0 0">
          <h2 style="margin:0;font-size:20px">Test SMTP réussi</h2>
        </div>
        <div style="padding:24px;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px">
          <p>Bonjour <strong>${escapeHtml(nom || '')}</strong>,</p>
          <p>La configuration SMTP de <strong>PROGAD-Suivi Impayé</strong> fonctionne correctement.</p>
          <p style="margin-top:24px;color:#64748b;font-size:12px">Cet e-mail est un test automatique.</p>
        </div>
      </div>`,
  }, { verify: true });
}

export async function sendActionDeadlineReminder({ user, dossier, action }) {
  const dossierUrl = `${config.appUrl.replace(/\/$/, '')}/impayes/dossiers/erp-${dossier.erp_voucher_id}`;
  const deadline = new Date(`${action.date_rappel}T12:00:00Z`).toLocaleDateString('fr-FR');
  const safeContent = escapeHtml(action.contenu).replaceAll('\n', '<br>');

  return dispatchEmail({
    from: `"${config.smtp.fromName.replaceAll('"', '')}" <${config.smtp.fromEmail}>`,
    to: user.email,
    subject: `[PROGAD] Date limite dépassée - ${dossier.nom_tire || dossier.numero_valeur}`,
    text: [
      `Bonjour ${user.nom},`,
      '',
      `La date limite du ${deadline} est dépassée pour l'action suivante :`,
      `Client : ${dossier.nom_tire || '-'}`,
      `N° valeur : ${dossier.numero_valeur || '-'}`,
      `Type : ${action.type_action}`,
      '',
      action.contenu,
      '',
      `Consulter le dossier : ${dossierUrl}`,
    ].join('\n'),
    html: `
      <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#172033">
        <div style="padding:20px 24px;background:#dc2626;color:#fff;border-radius:12px 12px 0 0">
          <h2 style="margin:0;font-size:20px">Date limite dépassée</h2>
        </div>
        <div style="padding:24px;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px">
          <p>Bonjour <strong>${escapeHtml(user.nom)}</strong>,</p>
          <p>La date limite du <strong>${escapeHtml(deadline)}</strong> est dépassée pour votre action.</p>
          <div style="padding:14px 16px;background:#f8fafc;border-radius:8px;margin:18px 0">
            <div><strong>Client :</strong> ${escapeHtml(dossier.nom_tire || '-')}</div>
            <div style="margin-top:6px"><strong>N° valeur :</strong> ${escapeHtml(dossier.numero_valeur || '-')}</div>
            <div style="margin-top:6px"><strong>Type :</strong> ${escapeHtml(action.type_action)}</div>
          </div>
          <div style="padding:16px;border-left:4px solid #dc2626;background:#fef2f2;margin-bottom:22px">${safeContent}</div>
          <a href="${escapeHtml(dossierUrl)}" style="display:inline-block;padding:11px 18px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold">Consulter le dossier</a>
          <p style="margin-top:24px;color:#64748b;font-size:12px">Rappel automatique — PROGAD-Suivi Impayé</p>
        </div>
      </div>`,
  });
}
