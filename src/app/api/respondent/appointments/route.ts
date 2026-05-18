import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const authUser = verifyToken(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch user details to match appointments by email or phone
    const user = await db.user.findUnique({
      where: { id: authUser.id },
      select: { email: true, phone: true, name: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Find appointments matching this patient's email or phone
    const appointments = await db.appointment.findMany({
      where: {
        OR: [
          { patientEmail: user.email },
          ...(user.phone ? [{ patientPhone: user.phone }] : []),
        ],
      },
      include: {
        department: { select: { id: true, name: true, code: true } },
      },
      orderBy: { appointmentDate: 'desc' },
    })

    // Separate upcoming and past
    const now = new Date()
    const upcoming = appointments.filter(
      (a) => new Date(a.appointmentDate) >= now && a.status !== 'CANCELLED'
    )
    const past = appointments.filter(
      (a) => new Date(a.appointmentDate) < now || a.status === 'CANCELLED'
    )

    return NextResponse.json({
      appointments,
      upcoming,
      past,
      total: appointments.length,
    })
  } catch (error) {
    console.error('Patient appointments error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
