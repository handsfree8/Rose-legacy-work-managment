import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export type ReminderPayload = {
  tenantName: string
  tenantEmail: string
  amount: number
  dueDay: number
  month: number   // 1-12
  year: number
  portalUrl: string
}

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

export async function sendRentReminder(p: ReminderPayload): Promise<void> {
  const monthName = MONTH_NAMES[p.month - 1]
  const formatted = p.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })

  await resend.emails.send({
    from: 'Rose Legacy <onboarding@resend.dev>',
    to: p.tenantEmail,
    subject: `Rent reminder: ${formatted} due ${monthName} ${p.dueDay}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8f7fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">
    <div style="background:linear-gradient(135deg,#1a0838,#4a2080);padding:28px 28px 24px;">
      <div style="font-size:10px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.4);margin-bottom:8px;">Rose Legacy · Rent Reminder</div>
      <div style="font-size:22px;font-weight:800;color:#fff;">Your rent is due in 3 days</div>
    </div>
    <div style="padding:28px;">
      <p style="font-size:15px;color:#111827;margin:0 0 18px;">Hi <strong>${p.tenantName.split(' ')[0]}</strong>,</p>
      <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 20px;">
        Your rent of <strong>${formatted}</strong> for <strong>${monthName} ${p.year}</strong>
        is due on <strong>${monthName} ${p.dueDay}</strong>.
      </p>
      <div style="background:#f3eeff;border:1px solid #ddd6fe;border-radius:10px;padding:16px 18px;margin-bottom:24px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#6b21a8;margin-bottom:6px;">Payment due</div>
        <div style="font-size:26px;font-weight:800;color:#111827;">${formatted}</div>
        <div style="font-size:12px;color:#6b7280;margin-top:4px;">Due ${monthName} ${p.dueDay}, ${p.year}</div>
      </div>
      <p style="font-size:13px;color:#6b7280;line-height:1.6;margin:0 0 24px;">
        Please deliver your check to your property manager before the due date.
        Once recorded, you can see the updated status in your portal.
      </p>
      <a href="${p.portalUrl}" style="display:inline-block;background:linear-gradient(135deg,#6b21a8,#7c3aed);color:#fff;text-decoration:none;border-radius:10px;padding:13px 24px;font-size:14px;font-weight:700;">
        View My Portal →
      </a>
      <p style="font-size:11px;color:#9ca3af;margin:24px 0 0;line-height:1.5;">
        Rose Legacy Home Solutions · This is an automated reminder.
      </p>
    </div>
  </div>
</body>
</html>`,
  })
}
