import * as db from './db';

/**
 * Email notification service
 * Note: This is a simplified implementation. In production, integrate with actual email service (SendGrid, AWS SES, etc.)
 */

interface EmailParams {
  to: string;
  toName?: string;
  subject: string;
  body: string;
  eventId?: number;
  notificationType: string;
}

/**
 * Send email notification
 */
export async function sendEmail(params: EmailParams): Promise<boolean> {
  try {
    // Create notification record
    await db.createNotification({
      eventId: params.eventId,
      recipientEmail: params.to,
      recipientName: params.toName,
      subject: params.subject,
      body: params.body,
      notificationType: params.notificationType,
      status: 'pending',
    });

    // In production, integrate with email service here
    // For now, we just log and mark as sent
    console.log(`[Email] To: ${params.to}, Subject: ${params.subject}`);
    
    // Simulate email sending
    // await actualEmailService.send(params);
    
    return true;
  } catch (error) {
    console.error('[Email] Failed to send:', error);
    return false;
  }
}

/**
 * Send D-10 notification (registration opening)
 */
export async function sendD10Notification(eventId: number): Promise<void> {
  const event = await db.getEventById(eventId);
  if (!event) return;

  // Get all active suppliers
  const suppliers = await db.getAllSuppliers();

  for (const supplier of suppliers) {
    if (!supplier.contactEmail) continue;

    const subject = `[SporTV] Abertura de Cadastro - ${event.name}`;
    const body = `
Prezado(a) ${supplier.contactName || supplier.name},

Informamos que o cadastro de colaboradores para o evento "${event.name}" está aberto.

Detalhes do Evento:
- Nome: ${event.name}
- Data do Evento: ${new Date(event.eventDate).toLocaleDateString('pt-BR')}
- Local: ${event.location || 'A definir'}
- Prazo de Cadastro: até ${new Date(event.registrationDeadline).toLocaleDateString('pt-BR')}

Por favor, cadastre seus colaboradores através do sistema de credenciamento.

Atenciosamente,
Equipe SporTV
    `.trim();

    await sendEmail({
      to: supplier.contactEmail,
      toName: supplier.contactName || supplier.name,
      subject,
      body,
      eventId,
      notificationType: 'D10_OPENING',
    });
  }
}

/**
 * Send D-4 notification (registration closing soon)
 */
export async function sendD4Notification(eventId: number): Promise<void> {
  const event = await db.getEventById(eventId);
  if (!event) return;

  const suppliers = await db.getAllSuppliers();

  for (const supplier of suppliers) {
    if (!supplier.contactEmail) continue;

    const subject = `[SporTV] URGENTE: Fechamento de Cadastro em 4 dias - ${event.name}`;
    const body = `
Prezado(a) ${supplier.contactName || supplier.name},

ATENÇÃO: O prazo para cadastro de colaboradores para o evento "${event.name}" encerra em 4 dias!

Detalhes do Evento:
- Nome: ${event.name}
- Data do Evento: ${new Date(event.eventDate).toLocaleDateString('pt-BR')}
- Prazo FINAL de Cadastro: ${new Date(event.registrationDeadline).toLocaleDateString('pt-BR')}

Após esta data, não será possível adicionar novos colaboradores.

Por favor, finalize os cadastros pendentes o quanto antes.

Atenciosamente,
Equipe SporTV
    `.trim();

    await sendEmail({
      to: supplier.contactEmail,
      toName: supplier.contactName || supplier.name,
      subject,
      body,
      eventId,
      notificationType: 'D4_CLOSING_WARNING',
    });
  }
}

/**
 * Send D-3 notification (credentials released)
 */
export async function sendD3Notification(eventId: number): Promise<void> {
  const event = await db.getEventById(eventId);
  if (!event) return;

  const suppliers = await db.getAllSuppliers();

  for (const supplier of suppliers) {
    if (!supplier.contactEmail) continue;

    const subject = `[SporTV] Credenciais Liberadas - ${event.name}`;
    const body = `
Prezado(a) ${supplier.contactName || supplier.name},

As credenciais para o evento "${event.name}" foram liberadas!

Detalhes do Evento:
- Nome: ${event.name}
- Data do Evento: ${new Date(event.eventDate).toLocaleDateString('pt-BR')}
- Local: ${event.location || 'A definir'}

Você pode acessar o sistema para visualizar e imprimir as credenciais dos colaboradores aprovados.

Atenciosamente,
Equipe SporTV
    `.trim();

    await sendEmail({
      to: supplier.contactEmail,
      toName: supplier.contactName || supplier.name,
      subject,
      body,
      eventId,
      notificationType: 'D3_CREDENTIALS_RELEASED',
    });
  }
}

/**
 * Send accreditation status change notification
 */
export async function sendAccreditationStatusNotification(
  accreditationId: number,
  newStatus: string
): Promise<void> {
  const accreditation = await db.getAccreditationById(accreditationId);
  if (!accreditation) return;

  const collaborator = await db.getCollaboratorById(accreditation.collaboratorId);
  const event = await db.getEventById(accreditation.eventId);
  
  if (!collaborator || !event) return;

  const supplier = await db.getSupplierById(collaborator.supplierId);
  if (!supplier?.contactEmail) return;

  const statusText = {
    aprovado: 'APROVADO',
    rejeitado: 'REJEITADO',
    credenciado: 'CREDENCIADO',
    pendente: 'PENDENTE',
  }[newStatus] || newStatus;

  const subject = `[SporTV] Status de Credenciamento: ${statusText} - ${collaborator.name}`;
  const body = `
Prezado(a) ${supplier.contactName || supplier.name},

O status do credenciamento foi atualizado:

Colaborador: ${collaborator.name}
CPF: ${collaborator.cpf}
Evento: ${event.name}
Novo Status: ${statusText}

${newStatus === 'rejeitado' && accreditation.notes ? `Motivo: ${accreditation.notes}` : ''}

Atenciosamente,
Equipe SporTV
  `.trim();

  await sendEmail({
    to: supplier.contactEmail,
    toName: supplier.contactName || supplier.name,
    subject,
    body,
    eventId: event.id,
    notificationType: 'ACCREDITATION_STATUS_CHANGE',
  });
}

/**
 * Process pending notifications (to be called by cron job)
 */
export async function processPendingNotifications(): Promise<void> {
  const pending = await db.getPendingNotifications();

  for (const notification of pending) {
    try {
      // In production, actually send the email here
      console.log(`[Email] Processing: ${notification.subject} to ${notification.recipientEmail}`);
      
      // Mark as sent
      await db.updateNotificationStatus(notification.id, 'sent');
    } catch (error: any) {
      console.error(`[Email] Failed to send notification ${notification.id}:`, error);
      await db.updateNotificationStatus(notification.id, 'failed', error.message);
    }
  }
}
