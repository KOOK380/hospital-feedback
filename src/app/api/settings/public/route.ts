import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Public endpoint - no auth required
// Returns only public-facing branding settings for login page and footer
export async function GET() {
  try {
    const settings = await db.systemSetting.findMany({
      where: {
        key: {
          in: ['hospitalName', 'hospitalLogoUrl', 'hospitalSubtitle', 'footerText'],
        },
      },
    })

    const result: Record<string, string> = {
      hospitalName: 'City General Hospital',
      hospitalLogoUrl: '',
      hospitalSubtitle: 'Hospital Survey System',
      footerText: 'Hospital Survey Management System © 2024',
    }

    for (const setting of settings) {
      result[setting.key] = setting.value
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Get public settings error:', error)
    return NextResponse.json({
      hospitalName: 'City General Hospital',
      hospitalLogoUrl: '',
      hospitalSubtitle: 'Hospital Survey System',
      footerText: 'Hospital Survey Management System © 2024',
    })
  }
}
