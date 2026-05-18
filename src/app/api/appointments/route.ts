import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const authUser = verifyToken(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const departmentId = searchParams.get('departmentId')
    const date = searchParams.get('date')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (departmentId) where.departmentId = departmentId
    if (date) {
      const start = new Date(date)
      const end = new Date(date)
      end.setDate(end.getDate() + 1)
      where.appointmentDate = { gte: start, lt: end }
    }

    const [appointments, total] = await Promise.all([
      db.appointment.findMany({
        where,
        include: {
          department: { select: { id: true, name: true, code: true } },
        },
        orderBy: { appointmentDate: 'asc' },
        skip,
        take: limit,
      }),
      db.appointment.count({ where }),
    ])

    return NextResponse.json({
      appointments,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('List appointments error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = verifyToken(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      patientName,
      patientPhone,
      patientEmail,
      departmentId,
      doctorName,
      appointmentDate,
      appointmentTime,
      status,
      visitType,
      notes,
    } = body

    if (!patientName || !patientPhone || !departmentId || !appointmentDate) {
      return NextResponse.json(
        { error: 'Patient name, phone, department, and appointment date are required' },
        { status: 400 }
      )
    }

    const appointment = await db.appointment.create({
      data: {
        patientName,
        patientPhone,
        patientEmail,
        departmentId,
        doctorName,
        appointmentDate: new Date(appointmentDate),
        appointmentTime,
        status: status || 'SCHEDULED',
        visitType,
        notes,
      },
      include: {
        department: { select: { id: true, name: true, code: true } },
      },
    })

    // Audit log
    await db.auditLog.create({
      data: {
        userId: authUser.id,
        action: 'CREATE',
        entityType: 'APPOINTMENT',
        entityId: appointment.id,
        details: JSON.stringify({ patientName, departmentId }),
      },
    })

    return NextResponse.json({ appointment }, { status: 201 })
  } catch (error) {
    console.error('Create appointment error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
