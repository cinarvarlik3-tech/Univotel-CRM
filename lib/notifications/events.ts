/** Discriminated union of every notification event the system can fire. */
export type NotificationEvent =
  | {
      kind: 'new_message';
      suppressible: true;
      leadId: string;
      leadName: string;
      conversationId: number | null;
      messageBody: string;
      isUnclaimed: boolean;
    }
  | {
      kind: 'webhook_failure';
      suppressible: false;
      source: string;
      status: 'rejected' | 'failed' | 'partial';
      reasonCode: string | null;
      errorMessage: string;
      webhookLogId: string;
    }
  | {
      kind: 'visit_scheduled';
      suppressible: true;
      visitId: string;
      leadId: string;
      leadName: string;
      propertyId: string;
      propertyName: string;
      visitAt: string;
    }
  | {
      kind: 'visit_reminder';
      suppressible: true;
      visitId: string;
      leadId: string;
      leadName: string;
      propertyId: string;
      propertyName: string;
      visitAt: string;
      conversationId: number | null;
    }
  | {
      kind: 'deal_signed';
      suppressible: true;
      leadId: string;
      leadName: string;
      propertyName: string;
      roomType: string;
    }
  | {
      kind: 'visit_resolution_ping';
      suppressible: true;
      recipientChatId: string;
      unresolvedCount: number;
    }
  | {
      kind: 'move_in_tomorrow';
      suppressible: true;
      leadId: string;
      leadName: string;
      propertyId: string;
      propertyName: string;
      roomType: string;
    }
  | {
      kind: 'move_in_today';
      suppressible: true;
      leadId: string;
      leadName: string;
      propertyId: string;
      propertyName: string;
      roomType: string;
    }
  | {
      kind: 'nurture_nudge';
      suppressible: true;
      recipientChatId: string;
    };
