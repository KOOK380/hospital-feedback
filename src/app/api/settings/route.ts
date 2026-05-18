import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const authUser = verifyToken(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const settings = await db.systemSetting.findMany({
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    })

    // Group by category
    const grouped: Record<string, Record<string, string>> = {}
    for (const setting of settings) {
      if (!grouped[setting.category]) grouped[setting.category] = {}
      grouped[setting.category][setting.key] = setting.value
    }

    return NextResponse.json({
      settings: grouped,
      raw: settings,
    })
  } catch (error) {
    console.error('Get settings error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authUser = verifyToken(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { settings } = body as { settings: Array<{ key: string; value: string; category?: string }> }

    if (!settings || !Array.isArray(settings)) {
      return NextResponse.json(
        { error: 'Settings array is required' },
        { status: 400 }
      )
    }

    const results = []
    for (const setting of settings) {
      const result = await db.systemSetting.upsert({
        where: { key: setting.key },
        update: { value: setting.value, category: setting.category || 'GENERAL' },
        create: { key: setting.key, value: setting.value, category: setting.category || 'GENERAL' },
      })
      results.push(result)
    }

    // Audit log
    await db.auditLog.create({
      data: {
        userId: authUser.id,
        action: 'UPDATE',
        entityType: 'SETTINGS',
        details: JSON.stringify({ updatedKeys: settings.map(s => s.key) }),
      },
    })

    return NextResponse.json({ updated: results.length, settings: results })
  } catch (error) {
    console.error('Update settings error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
