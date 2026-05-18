import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { signToken } from '@/lib/auth'

// Public signup endpoint for survey respondents (patients/employees)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password, phone, departmentId, type } = body

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      )
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existing = await db.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists. Please log in instead.' },
        { status: 409 }
      )
    }

    // Find the appropriate role based on survey type
    // PATIENT type surveys → AUTHORIZED (Patient) role → Patient Dashboard
    // EMPLOYEE type surveys → RESPONDENT (Employee) role → Employee Dashboard
    const surveyType = type || 'respondent'
    let roleName = 'RESPONDENT'
    if (surveyType === 'PATIENT' || surveyType === 'patient') {
      roleName = 'AUTHORIZED'
    }

    let role = await db.role.findFirst({ where: { name: roleName } })
    if (!role) {
      // Create the role if it doesn't exist
      role = await db.role.create({
        data: {
          name: roleName,
          displayName: roleName === 'AUTHORIZED' ? 'Patient' : 'Employee',
          permissions: '[]',
          description: roleName === 'AUTHORIZED'
            ? 'Patient - can access patient dashboard and take surveys'
            : 'Employee - can access employee dashboard and take surveys',
          isDefault: false,
        },
      })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    const user = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone: phone || null,
        departmentId: departmentId || null,
        roleId: role.id,
        isActive: true,
        isVerified: false,
      },
      include: {
        role: true,
        department: true,
      },
    })

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'CREATE',
        entityType: 'USER',
        entityId: user.id,
        details: JSON.stringify({
          method: 'SURVEY_SIGNUP',
          type: type || 'respondent',
          email: user.email,
        }),
        ipAddress: request.headers.get('x-forwarded-for') || null,
        userAgent: request.headers.get('user-agent') || null,
      },
    })

    // Generate token
    const token = signToken({
      id: user.id,
      email: user.email,
      name: user.name,
      roleId: user.roleId,
    })

    return NextResponse.json(
      {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          role: {
            id: user.role.id,
            name: user.role.name,
            displayName: user.role.displayName,
          },
          department: user.department
            ? {
                id: user.department.id,
                name: user.department.name,
                code: user.department.code,
              }
            : null,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
