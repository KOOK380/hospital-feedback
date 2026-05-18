import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const authUser = verifyToken(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { templateId, recipientName, recipientPhone, message, provider, departmentId, appointmentId } = body

    if (!recipientPhone || !message) {
      return NextResponse.json(
        { error: 'Recipient phone and message are required' },
        { status: 400 }
      )
    }

    // In a real implementation, this would call an SMS provider API
    // For now, we simulate a successful send
    const isSent = Math.random() > 0.1 // 90% success rate simulation

    const smsLog = await db.smsLog.create({
      data: {
        templateId,
        recipientName,
        recipientPhone,
        message,
        status: isSent ? 'SENT' : 'FAILED',
        provider: provider || 'SYSTEM',
        providerMsgId: isSent ? `msg-${Date.now()}` : null,
        sentAt: isSent ? new Date() : null,
        failureReason: isSent ? null : 'Simulated failure',
        departmentId,
        appointmentId,
      },
    })

    // Audit log
    await db.auditLog.create({
      data: {
        userId: authUser.id,
        action: 'CREATE',
        entityType: 'SMS',
        entityId: smsLog.id,
        details: JSON.stringify({
          recipientPhone,
          status: smsLog.status,
          templateId,
        }),
      },
    })

    // Create notification for relevant users
    if (isSent) {
      const admins = await db.user.findMany({
        where: {
          roleId: { in: (await db.role.findMany({ where: { name: { in: ['SUPER_ADMIN', 'RECEPTION', 'IT_ADMIN'] } } })).map(r => r.id) },
          isActive: true,
          deletedAt: null,
        },
        take: 5,
      })

      for (const admin of admins) {
        await db.notification.create({
          data: {
            userId: admin.id,
            title: 'SMS Sent',
            message: `SMS sent to ${recipientName || recipientPhone}`,
            type: 'SMS',
          },
        })
      }
    }

    return NextResponse.json(smsLog, { status: 201 })
  } catch (error) {
    console.error('Send SMS error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
