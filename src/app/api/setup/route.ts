import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { execSync } from 'child_process'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

async function isDatabaseInitialized(): Promise<{ initialized: boolean; userCount: number; error?: string }> {
  try {
    const userCount = await db.user.count()
    return { initialized: userCount > 0, userCount }
  } catch (err: any) {
    return { initialized: false, userCount: 0, error: err.message }
  }
}

export async function GET() {
  try {
    const status = await isDatabaseInitialized()

    if (status.initialized) {
      return NextResponse.json({
        status: 'ready',
        message: `Database is ready with ${status.userCount} users. You can log in now!`,
        login: { email: 'admin@hospital.com', password: 'admin123' },
      })
    }

    if (status.error && status.error.includes('does not exist')) {
      try {
        execSync('npx prisma db push --accept-data-loss', { stdio: 'pipe', timeout: 60000 })
      } catch (pushErr: any) {
        return NextResponse.json({
          status: 'error',
          message: 'Failed to create database tables.',
          error: pushErr.message,
        }, { status: 500 })
      }
    }

    await seedDatabase()
    const finalCount = await db.user.count()

    return NextResponse.json({
      status: 'initialized',
      message: `Database setup complete! ${finalCount} users created.`,
      login: { email: 'admin@hospital.com', password: 'admin123' },
    })
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      message: error.message || String(error),
      hint: 'Make sure DATABASE_URL is set in Railway → Variables tab.',
    }, { status: 500 })
  }
}

export async function POST() {
  try {
    try { execSync('npx prisma db push --accept-data-loss', { stdio: 'pipe', timeout: 60000 }) } catch (e) {}
    await seedDatabase()
    const finalCount = await db.user.count()
    return NextResponse.json({ status: 'reseeded', message: `Database re-seeded! ${finalCount} users.`, login: { email: 'admin@hospital.com', password: 'admin123' } })
  } catch (error: any) {
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 })
  }
}

async function seedDatabase() {
  const roles = await Promise.all([
    db.role.upsert({ where: { name: 'SUPER_ADMIN' }, update: {}, create: { name: 'SUPER_ADMIN', displayName: 'Super Admin', permissions: JSON.stringify(['all']), description: 'Full system access', isDefault: false } }),
    db.role.upsert({ where: { name: 'IT_ADMIN' }, update: {}, create: { name: 'IT_ADMIN', displayName: 'IT Admin', permissions: JSON.stringify(['manage_users', 'manage_system', 'view_analytics', 'manage_integrations']), description: 'IT Administration', isDefault: false } }),
    db.role.upsert({ where: { name: 'HR' }, update: {}, create: { name: 'HR', displayName: 'HR', permissions: JSON.stringify(['manage_employees', 'view_surveys', 'view_analytics', 'manage_departments']), description: 'Human Resources', isDefault: false } }),
    db.role.upsert({ where: { name: 'ACCOUNTS' }, update: {}, create: { name: 'ACCOUNTS', displayName: 'Accounts', permissions: JSON.stringify(['view_reports', 'view_analytics', 'export_data']), description: 'Accounts Department', isDefault: false } }),
    db.role.upsert({ where: { name: 'RECEPTION' }, update: {}, create: { name: 'RECEPTION', displayName: 'Reception', permissions: JSON.stringify(['manage_appointments', 'send_sms', 'view_surveys']), description: 'Front Desk/Reception', isDefault: false } }),
    db.role.upsert({ where: { name: 'QUALITY' }, update: {}, create: { name: 'QUALITY', displayName: 'Quality', permissions: JSON.stringify(['manage_surveys', 'view_analytics', 'view_reports', 'export_data']), description: 'Quality Assurance', isDefault: false } }),
    db.role.upsert({ where: { name: 'AUTHORIZED' }, update: {}, create: { name: 'AUTHORIZED', displayName: 'Authorized User', permissions: JSON.stringify(['view_surveys', 'view_analytics']), description: 'Standard authorized user', isDefault: true } }),
  ])

  const departments = await Promise.all([
    db.department.upsert({ where: { code: 'GEN' }, update: {}, create: { name: 'General Medicine', code: 'GEN', description: 'General Medicine Department' } }),
    db.department.upsert({ where: { code: 'CARD' }, update: {}, create: { name: 'Cardiology', code: 'CARD', description: 'Heart & Cardiovascular Department' } }),
    db.department.upsert({ where: { code: 'ORTHO' }, update: {}, create: { name: 'Orthopedics', code: 'ORTHO', description: 'Bone & Joint Department' } }),
    db.department.upsert({ where: { code: 'PED' }, update: {}, create: { name: 'Pediatrics', code: 'PED', description: 'Child Care Department' } }),
    db.department.upsert({ where: { code: 'NEURO' }, update: {}, create: { name: 'Neurology', code: 'NEURO', description: 'Brain & Nervous System Department' } }),
    db.department.upsert({ where: { code: 'OBS' }, update: {}, create: { name: 'Obstetrics & Gynecology', code: 'OBS', description: "Women's Health Department" } }),
    db.department.upsert({ where: { code: 'EMRG' }, update: {}, create: { name: 'Emergency', code: 'EMRG', description: 'Emergency & Trauma Department' } }),
    db.department.upsert({ where: { code: 'HR' }, update: {}, create: { name: 'Human Resources', code: 'HR', description: 'HR Department' } }),
    db.department.upsert({ where: { code: 'IT' }, update: {}, create: { name: 'Information Technology', code: 'IT', description: 'IT Department' } }),
    db.department.upsert({ where: { code: 'ADMIN' }, update: {}, create: { name: 'Administration', code: 'ADMIN', description: 'Hospital Administration' } }),
  ])

  const hashedPassword = await bcrypt.hash('admin123', 10)
  const superAdmin = await db.user.upsert({
    where: { email: 'admin@hospital.com' },
    update: {},
    create: { email: 'admin@hospital.com', name: 'Dr. Admin Super', password: hashedPassword, phone: '+919876543210', roleId: roles[0].id, departmentId: departments[9].id, isActive: true, isVerified: true },
  })

  const sampleUsers = [
    { email: 'itadmin@hospital.com', name: 'Rajesh Kumar', phone: '+919876543211', roleName: 'IT_ADMIN', deptCode: 'IT' },
    { email: 'hr@hospital.com', name: 'Priya Sharma', phone: '+919876543212', roleName: 'HR', deptCode: 'HR' },
    { email: 'accounts@hospital.com', name: 'Amit Verma', phone: '+919876543213', roleName: 'ACCOUNTS', deptCode: 'ADMIN' },
    { email: 'reception@hospital.com', name: 'Sunita Devi', phone: '+919876543214', roleName: 'RECEPTION', deptCode: 'GEN' },
    { email: 'quality@hospital.com', name: 'Dr. Meena Patel', phone: '+919876543215', roleName: 'QUALITY', deptCode: 'ADMIN' },
    { email: 'user1@hospital.com', name: 'Vikram Singh', phone: '+919876543216', roleName: 'AUTHORIZED', deptCode: 'CARD' },
    { email: 'user2@hospital.com', name: 'Neha Gupta', phone: '+919876543217', roleName: 'AUTHORIZED', deptCode: 'ORTHO' },
    { email: 'user3@hospital.com', name: 'Suresh Reddy', phone: '+919876543218', roleName: 'AUTHORIZED', deptCode: 'PED' },
  ]

  for (const u of sampleUsers) {
    const role = roles.find(r => r.name === u.roleName)!
    const dept = departments.find(d => d.code === u.deptCode)!
    await db.user.upsert({ where: { email: u.email }, update: {}, create: { email: u.email, name: u.name, password: hashedPassword, phone: u.phone, roleId: role.id, departmentId: dept.id, isActive: true, isVerified: true } })
  }

  const patientSurvey = await db.survey.upsert({ where: { id: 'patient-survey-001' }, update: {}, create: { id: 'patient-survey-001', title: 'Patient Satisfaction Survey', description: 'Help us improve our healthcare services by sharing your experience', type: 'PATIENT', isActive: true, isAnonymous: true, createdBy: superAdmin.id, departmentId: null } })

  const patientQuestions = [
    { questionText: 'How would you rate the overall quality of care received?', questionType: 'STAR_RATING', category: 'Overall', order: 1 },
    { questionText: 'How satisfied were you with the friendliness and courtesy of the staff?', questionType: 'STAR_RATING', category: 'Staff Behavior', order: 2 },
    { questionText: 'How would you rate the cleanliness of the facility?', questionType: 'STAR_RATING', category: 'Cleanliness', order: 3 },
    { questionText: 'Was the waiting time reasonable?', questionType: 'YES_NO', category: 'Wait Time', order: 4 },
    { questionText: 'How would you rate the communication from your doctor?', questionType: 'STAR_RATING', category: 'Communication', order: 5 },
    { questionText: 'Would you recommend our hospital to others?', questionType: 'MULTIPLE_CHOICE', options: JSON.stringify(['Definitely', 'Probably', 'Not Sure', 'Probably Not', 'Definitely Not']), category: 'Recommendation', order: 6 },
    { questionText: 'Which department did you visit?', questionType: 'DROPDOWN', options: JSON.stringify(['General Medicine', 'Cardiology', 'Orthopedics', 'Pediatrics', 'Neurology', 'OB/GYN', 'Emergency']), category: 'Department', order: 7 },
    { questionText: 'Any additional comments or suggestions?', questionType: 'TEXT', category: 'Feedback', order: 8 },
  ]
  for (const q of patientQuestions) {
    await db.surveyQuestion.upsert({ where: { id: `pq-${q.order}` }, update: {}, create: { id: `pq-${q.order}`, surveyId: patientSurvey.id, questionText: q.questionText, questionType: q.questionType, options: q.options || '[]', category: q.category, order: q.order, isRequired: q.questionType !== 'TEXT' } })
  }

  const employeeSurvey = await db.survey.upsert({ where: { id: 'employee-survey-001' }, update: {}, create: { id: 'employee-survey-001', title: 'Employee Satisfaction Survey', description: 'Share your workplace experience to help us create a better work environment', type: 'EMPLOYEE', isActive: true, isAnonymous: true, createdBy: superAdmin.id, departmentId: null } })
  const employeeQuestions = [
    { questionText: 'How satisfied are you with your current role and responsibilities?', questionType: 'STAR_RATING', category: 'Job Satisfaction', order: 1 },
    { questionText: 'How would you rate the work-life balance?', questionType: 'STAR_RATING', category: 'Work-Life Balance', order: 2 },
    { questionText: 'How effective is the communication from management?', questionType: 'STAR_RATING', category: 'Communication', order: 3 },
    { questionText: 'Do you feel your work is recognized and appreciated?', questionType: 'YES_NO', category: 'Recognition', order: 4 },
    { questionText: 'How would you rate the professional development opportunities?', questionType: 'STAR_RATING', category: 'Growth', order: 5 },
    { questionText: 'Which aspect needs the most improvement?', questionType: 'MULTIPLE_CHOICE', options: JSON.stringify(['Compensation', 'Work Environment', 'Management Support', 'Training', 'Career Growth', 'Work-Life Balance']), category: 'Improvement', order: 6 },
    { questionText: 'Your department', questionType: 'DROPDOWN', options: JSON.stringify(['General Medicine', 'Cardiology', 'Orthopedics', 'Pediatrics', 'Neurology', 'OB/GYN', 'Emergency', 'HR', 'IT', 'Administration']), category: 'Department', order: 7 },
    { questionText: 'What would make your workplace better?', questionType: 'TEXT', category: 'Feedback', order: 8 },
  ]
  for (const q of employeeQuestions) {
    await db.surveyQuestion.upsert({ where: { id: `eq-${q.order}` }, update: {}, create: { id: `eq-${q.order}`, surveyId: employeeSurvey.id, questionText: q.questionText, questionType: q.questionType, options: q.options || '[]', category: q.category, order: q.order, isRequired: q.questionType !== 'TEXT' } })
  }

  // Sample data (only created if none exists)
  const existingResponses = await db.surveyResponse.count()
  if (existingResponses === 0) {
    const ratingValues = [1, 2, 3, 4, 5, 4, 5, 3, 4, 5, 2, 4, 5, 3, 4, 5, 4, 3, 5, 4]
    const patientQs = await db.surveyQuestion.findMany({ where: { surveyId: patientSurvey.id }, orderBy: { order: 'asc' } })
    for (let i = 0; i < 50; i++) {
      const response = await db.surveyResponse.create({ data: { surveyId: patientSurvey.id, departmentId: departments[Math.floor(Math.random() * 7)].id, status: 'COMPLETED', isAnonymous: true, overallRating: ratingValues[Math.floor(Math.random() * ratingValues.length)], submittedAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000) } })
      for (const q of patientQs) {
        let answerData: any = {}
        if (q.questionType === 'STAR_RATING') answerData.answerNumber = ratingValues[Math.floor(Math.random() * ratingValues.length)]
        else if (q.questionType === 'YES_NO') answerData.answerChoice = Math.random() > 0.3 ? 'Yes' : 'No'
        else if (q.questionType === 'MULTIPLE_CHOICE') { const opts = JSON.parse(q.options); answerData.answerChoice = opts[Math.floor(Math.random() * opts.length)] }
        else if (q.questionType === 'DROPDOWN') { const opts = JSON.parse(q.options); answerData.answerChoice = opts[Math.floor(Math.random() * opts.length)] }
        else if (q.questionType === 'TEXT') answerData.answerText = ['Great service!', 'Could be better', 'Very professional staff', 'Long wait times', 'Clean facility', 'Excellent care'][Math.floor(Math.random() * 6)]
        await db.surveyAnswer.create({ data: { responseId: response.id, questionId: q.id, ...answerData } })
      }
    }
    const empQs = await db.surveyQuestion.findMany({ where: { surveyId: employeeSurvey.id }, orderBy: { order: 'asc' } })
    for (let i = 0; i < 35; i++) {
      const response = await db.surveyResponse.create({ data: { surveyId: employeeSurvey.id, departmentId: departments[Math.floor(Math.random() * departments.length)].id, status: 'COMPLETED', isAnonymous: true, overallRating: ratingValues[Math.floor(Math.random() * ratingValues.length)], submittedAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000) } })
      for (const q of empQs) {
        let answerData: any = {}
        if (q.questionType === 'STAR_RATING') answerData.answerNumber = ratingValues[Math.floor(Math.random() * ratingValues.length)]
        else if (q.questionType === 'YES_NO') answerData.answerChoice = Math.random() > 0.4 ? 'Yes' : 'No'
        else if (q.questionType === 'MULTIPLE_CHOICE') { const opts = JSON.parse(q.options); answerData.answerChoice = opts[Math.floor(Math.random() * opts.length)] }
        else if (q.questionType === 'DROPDOWN') { const opts = JSON.parse(q.options); answerData.answerChoice = opts[Math.floor(Math.random() * opts.length)] }
        else if (q.questionType === 'TEXT') answerData.answerText = ['Need better compensation', 'Great team culture', 'More training needed', 'Flexible hours would help'][Math.floor(Math.random() * 4)]
        await db.surveyAnswer.create({ data: { responseId: response.id, questionId: q.id, ...answerData } })
      }
    }
  }

  const existingTemplates = await db.smsTemplate.count()
  if (existingTemplates === 0) {
    await db.smsTemplate.createMany({ data: [
      { name: 'Patient Survey Link', content: 'Dear {{patientName}}, thank you for visiting {{hospitalName}}. Please share your feedback: {{surveyLink}}', variables: JSON.stringify(['patientName', 'hospitalName', 'surveyLink']), type: 'SURVEY', category: 'PATIENT', isActive: true },
      { name: 'Appointment Reminder', content: 'Reminder: {{patientName}}, your appointment at {{hospitalName}} is on {{date}} at {{time}}. Dept: {{department}}.', variables: JSON.stringify(['patientName', 'hospitalName', 'date', 'time', 'department']), type: 'APPOINTMENT', category: 'PATIENT', isActive: true },
      { name: 'Employee Survey', content: 'Dear {{employeeName}}, please complete the employee satisfaction survey: {{surveyLink}}', variables: JSON.stringify(['employeeName', 'surveyLink']), type: 'SURVEY', category: 'EMPLOYEE', isActive: true },
      { name: 'Thank You', content: 'Thank you {{patientName}} for your visit to {{hospitalName}}. We wish you good health!', variables: JSON.stringify(['patientName', 'hospitalName']), type: 'CUSTOM', category: 'PATIENT', isActive: true },
    ] })
  }

  const existingAppointments = await db.appointment.count()
  if (existingAppointments === 0) {
    for (const apt of [{ patientName: 'Ramesh Patel', patientPhone: '+919876540001', doctorName: 'Dr. Sharma', visitType: 'OPD' }, { patientName: 'Anita Kumari', patientPhone: '+919876540002', doctorName: 'Dr. Verma', visitType: 'OPD' }, { patientName: 'Mohan Das', patientPhone: '+919876540003', doctorName: 'Dr. Reddy', visitType: 'IPD' }]) {
      await db.appointment.create({ data: { ...apt, departmentId: departments[Math.floor(Math.random() * 7)].id, appointmentDate: new Date(Date.now() + Math.floor(Math.random() * 7) * 24 * 60 * 60 * 1000), appointmentTime: '10:00', status: 'SCHEDULED', surveySent: false } })
    }
  }

  const existingSettings = await db.systemSetting.count()
  if (existingSettings === 0) {
    await db.systemSetting.createMany({ data: [
      { key: 'hospital_name', value: 'City General Hospital', category: 'GENERAL' },
      { key: 'sms_provider', value: 'TWILIO', category: 'SMS' },
      { key: 'sms_auto_send', value: 'true', category: 'SMS' },
      { key: 'session_timeout', value: '3600', category: 'SECURITY' },
      { key: 'max_login_attempts', value: '5', category: 'SECURITY' },
    ] })
  }

  console.log('✅ Database seeded successfully!')
}