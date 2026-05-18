import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function seed() {
  console.log('🌱 Seeding database...')

  const roles = await Promise.all([
    prisma.role.upsert({ where: { name: 'SUPER_ADMIN' }, update: {}, create: { name: 'SUPER_ADMIN', displayName: 'Super Admin', permissions: JSON.stringify(['all']), description: 'Full system access', isDefault: false } }),
    prisma.role.upsert({ where: { name: 'IT_ADMIN' }, update: {}, create: { name: 'IT_ADMIN', displayName: 'IT Admin', permissions: JSON.stringify(['manage_users', 'manage_system', 'view_analytics', 'manage_integrations']), description: 'IT Administration', isDefault: false } }),
    prisma.role.upsert({ where: { name: 'HR' }, update: {}, create: { name: 'HR', displayName: 'HR', permissions: JSON.stringify(['manage_employees', 'view_surveys', 'view_analytics', 'manage_departments']), description: 'Human Resources', isDefault: false } }),
    prisma.role.upsert({ where: { name: 'ACCOUNTS' }, update: {}, create: { name: 'ACCOUNTS', displayName: 'Accounts', permissions: JSON.stringify(['view_reports', 'view_analytics', 'export_data']), description: 'Accounts Department', isDefault: false } }),
    prisma.role.upsert({ where: { name: 'RECEPTION' }, update: {}, create: { name: 'RECEPTION', displayName: 'Reception', permissions: JSON.stringify(['manage_appointments', 'send_sms', 'view_surveys']), description: 'Front Desk/Reception', isDefault: false } }),
    prisma.role.upsert({ where: { name: 'QUALITY' }, update: {}, create: { name: 'QUALITY', displayName: 'Quality', permissions: JSON.stringify(['manage_surveys', 'view_analytics', 'view_reports', 'export_data']), description: 'Quality Assurance', isDefault: false } }),
    prisma.role.upsert({ where: { name: 'AUTHORIZED' }, update: {}, create: { name: 'AUTHORIZED', displayName: 'Authorized User', permissions: JSON.stringify(['view_surveys', 'view_analytics']), description: 'Standard authorized user', isDefault: true } }),
  ])

  const departments = await Promise.all([
    prisma.department.upsert({ where: { code: 'GEN' }, update: {}, create: { name: 'General Medicine', code: 'GEN', description: 'General Medicine Department' } }),
    prisma.department.upsert({ where: { code: 'CARD' }, update: {}, create: { name: 'Cardiology', code: 'CARD', description: 'Heart & Cardiovascular Department' } }),
    prisma.department.upsert({ where: { code: 'ORTHO' }, update: {}, create: { name: 'Orthopedics', code: 'ORTHO', description: 'Bone & Joint Department' } }),
    prisma.department.upsert({ where: { code: 'PED' }, update: {}, create: { name: 'Pediatrics', code: 'PED', description: 'Child Care Department' } }),
    prisma.department.upsert({ where: { code: 'NEURO' }, update: {}, create: { name: 'Neurology', code: 'NEURO', description: 'Brain & Nervous System Department' } }),
    prisma.department.upsert({ where: { code: 'OBS' }, update: {}, create: { name: 'Obstetrics & Gynecology', code: 'OBS', description: "Women's Health Department" } }),
    prisma.department.upsert({ where: { code: 'EMRG' }, update: {}, create: { name: 'Emergency', code: 'EMRG', description: 'Emergency & Trauma Department' } }),
    prisma.department.upsert({ where: { code: 'HR' }, update: {}, create: { name: 'Human Resources', code: 'HR', description: 'HR Department' } }),
    prisma.department.upsert({ where: { code: 'IT' }, update: {}, create: { name: 'Information Technology', code: 'IT', description: 'IT Department' } }),
    prisma.department.upsert({ where: { code: 'ADMIN' }, update: {}, create: { name: 'Administration', code: 'ADMIN', description: 'Hospital Administration' } }),
  ])

  const hashedPassword = await bcrypt.hash('admin123', 10)
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@hospital.com' },
    update: {},
    create: {
      email: 'admin@hospital.com',
      name: 'Dr. Admin Super',
      password: hashedPassword,
      phone: '+919876543210',
      roleId: roles[0].id,
      departmentId: departments[9].id,
      isActive: true,
      isVerified: true,
    },
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
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        name: u.name,
        password: hashedPassword,
        phone: u.phone,
        roleId: role.id,
        departmentId: dept.id,
        isActive: true,
        isVerified: true,
      },
    })
  }

  const patientSurvey = await prisma.survey.upsert({
    where: { id: 'patient-survey-001' },
    update: {},
    create: {
      id: 'patient-survey-001',
      title: 'Patient Satisfaction Survey',
      description: 'Help us improve our healthcare services by sharing your experience',
      type: 'PATIENT',
      isActive: true,
      isAnonymous: true,
      createdBy: superAdmin.id,
      departmentId: null,
    },
  })

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
    await prisma.surveyQuestion.upsert({
      where: { id: `pq-${q.order}` },
      update: {},
      create: {
        id: `pq-${q.order}`,
        surveyId: patientSurvey.id,
        questionText: q.questionText,
        questionType: q.questionType,
        options: q.options || '[]',
        category: q.category,
        order: q.order,
        isRequired: q.questionType !== 'TEXT',
      },
    })
  }

  const employeeSurvey = await prisma.survey.upsert({
    where: { id: 'employee-survey-001' },
    update: {},
    create: {
      id: 'employee-survey-001',
      title: 'Employee Satisfaction Survey',
      description: 'Share your workplace experience to help us create a better work environment',
      type: 'EMPLOYEE',
      isActive: true,
      isAnonymous: true,
      createdBy: superAdmin.id,
      departmentId: null,
    },
  })

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
    await prisma.surveyQuestion.upsert({
      where: { id: `eq-${q.order}` },
      update: {},
      create: {
        id: `eq-${q.order}`,
        surveyId: employeeSurvey.id,
        questionText: q.questionText,
        questionType: q.questionType,
        options: q.options || '[]',
        category: q.category,
        order: q.order,
        isRequired: q.questionType !== 'TEXT',
      },
    })
  }

  const existingResponses = await prisma.surveyResponse.count()
  if (existingResponses === 0) {
    const ratingValues = [1, 2, 3, 4, 5, 4, 5, 3, 4, 5, 2, 4, 5, 3, 4, 5, 4, 3, 5, 4]
    const patientQs = await prisma.surveyQuestion.findMany({ where: { surveyId: patientSurvey.id }, orderBy: { order: 'asc' } })

    for (let i = 0; i < 50; i++) {
      const response = await prisma.surveyResponse.create({
        data: {
          surveyId: patientSurvey.id,
          departmentId: departments[Math.floor(Math.random() * 7)].id,
          status: 'COMPLETED',
          isAnonymous: true,
          overallRating: ratingValues[Math.floor(Math.random() * ratingValues.length)],
          submittedAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000),
        },
      })

      for (const q of patientQs) {
        let answerData: any = {}
        if (q.questionType === 'STAR_RATING') {
          answerData.answerNumber = ratingValues[Math.floor(Math.random() * ratingValues.length)]
        } else if (q.questionType === 'YES_NO') {
          answerData.answerChoice = Math.random() > 0.3 ? 'Yes' : 'No'
        } else if (q.questionType === 'MULTIPLE_CHOICE') {
          const opts = JSON.parse(q.options)
          answerData.answerChoice = opts[Math.floor(Math.random() * opts.length)]
        } else if (q.questionType === 'DROPDOWN') {
          const opts = JSON.parse(q.options)
          answerData.answerChoice = opts[Math.floor(Math.random() * opts.length)]
        } else if (q.questionType === 'TEXT') {
          const comments = ['Great service!', 'Could be better', 'Very professional staff', 'Long wait times', 'Clean facility', 'Excellent care', 'Need more staff', 'Good experience overall']
          answerData.answerText = comments[Math.floor(Math.random() * comments.length)]
        }
        await prisma.surveyAnswer.create({ data: { responseId: response.id, questionId: q.id, ...answerData } })
      }
    }

    const empQs = await prisma.surveyQuestion.findMany({ where: { surveyId: employeeSurvey.id }, orderBy: { order: 'asc' } })
    for (let i = 0; i < 35; i++) {
      const response = await prisma.surveyResponse.create({
        data: {
          surveyId: employeeSurvey.id,
          departmentId: departments[Math.floor(Math.random() * departments.length)].id,
          status: 'COMPLETED',
          isAnonymous: true,
          overallRating: ratingValues[Math.floor(Math.random() * ratingValues.length)],
          submittedAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000),
        },
      })
      for (const q of empQs) {
        let answerData: any = {}
        if (q.questionType === 'STAR_RATING') {
          answerData.answerNumber = ratingValues[Math.floor(Math.random() * ratingValues.length)]
        } else if (q.questionType === 'YES_NO') {
          answerData.answerChoice = Math.random() > 0.4 ? 'Yes' : 'No'
        } else if (q.questionType === 'MULTIPLE_CHOICE') {
          const opts = JSON.parse(q.options)
          answerData.answerChoice = opts[Math.floor(Math.random() * opts.length)]
        } else if (q.questionType === 'DROPDOWN') {
          const opts = JSON.parse(q.options)
          answerData.answerChoice = opts[Math.floor(Math.random() * opts.length)]
        } else if (q.questionType === 'TEXT') {
          const comments = ['Need better compensation', 'Great team culture', 'More training needed', 'Flexible hours would help', 'Management needs improvement', 'Love the mission']
          answerData.answerText = comments[Math.floor(Math.random() * comments.length)]
        }
        await prisma.surveyAnswer.create({ data: { responseId: response.id, questionId: q.id, ...answerData } })
      }
    }
  }

  const existingTemplates = await prisma.smsTemplate.count()
  if (existingTemplates === 0) {
    await prisma.smsTemplate.createMany({
      data: [
        { name: 'Patient Survey Link', content: 'Dear {{patientName}}, thank you for visiting {{hospitalName}}. Please share your feedback: {{surveyLink}}', variables: JSON.stringify(['patientName', 'hospitalName', 'surveyLink']), type: 'SURVEY', category: 'PATIENT', isActive: true },
        { name: 'Appointment Reminder', content: 'Reminder: {{patientName}}, your appointment at {{hospitalName}} is on {{date}} at {{time}}. Dept: {{department}}.', variables: JSON.stringify(['patientName', 'hospitalName', 'date', 'time', 'department']), type: 'APPOINTMENT', category: 'PATIENT', isActive: true },
        { name: 'Employee Survey', content: 'Dear {{employeeName}}, please complete the employee satisfaction survey: {{surveyLink}}', variables: JSON.stringify(['employeeName', 'surveyLink']), type: 'SURVEY', category: 'EMPLOYEE', isActive: true },
        { name: 'Thank You', content: 'Thank you {{patientName}} for your visit to {{hospitalName}}. We wish you good health!', variables: JSON.stringify(['patientName', 'hospitalName']), type: 'CUSTOM', category: 'PATIENT', isActive: true },
      ],
    })
  }

  const existingAppointments = await prisma.appointment.count()
  if (existingAppointments === 0) {
    const appointmentData = [
      { patientName: 'Ramesh Patel', patientPhone: '+919876540001', doctorName: 'Dr. Sharma', visitType: 'OPD' },
      { patientName: 'Anita Kumari', patientPhone: '+919876540002', doctorName: 'Dr. Verma', visitType: 'OPD' },
      { patientName: 'Mohan Das', patientPhone: '+919876540003', doctorName: 'Dr. Reddy', visitType: 'IPD' },
      { patientName: 'Sita Ram', patientPhone: '+919876540004', doctorName: 'Dr. Gupta', visitType: 'OPD' },
      { patientName: 'Kavita Joshi', patientPhone: '+919876540005', doctorName: 'Dr. Singh', visitType: 'EMERGENCY' },
    ]
    for (const apt of appointmentData) {
      await prisma.appointment.create({
        data: {
          ...apt,
          departmentId: departments[Math.floor(Math.random() * 7)].id,
          appointmentDate: new Date(Date.now() + Math.floor(Math.random() * 7) * 24 * 60 * 60 * 1000),
          appointmentTime: `${10 + Math.floor(Math.random() * 8)}:${Math.random() > 0.5 ? '00' : '30'}`,
          status: 'SCHEDULED',
          surveySent: Math.random() > 0.6,
        },
      })
    }
  }

  const existingSmsLogs = await prisma.smsLog.count()
  if (existingSmsLogs === 0) {
    const smsStatuses = ['SENT', 'DELIVERED', 'FAILED', 'PENDING']
    for (let i = 0; i < 15; i++) {
      await prisma.smsLog.create({
        data: {
          recipientName: `Patient ${i + 1}`,
          recipientPhone: `+9198765400${String(i + 10).padStart(2, '0')}`,
          message: `Thank you for visiting City Hospital. Share feedback: https://survey.hospital.com/s/p${i}`,
          status: smsStatuses[Math.floor(Math.random() * smsStatuses.length)],
          provider: ['TWILIO', 'MSG91', 'TEXTLOCAL'][Math.floor(Math.random() * 3)],
          sentAt: new Date(Date.now() - Math.floor(Math.random() * 7) * 24 * 60 * 60 * 1000),
          departmentId: departments[Math.floor(Math.random() * 7)].id,
        },
      })
    }
  }

  const existingNotifications = await prisma.notification.count()
  if (existingNotifications === 0) {
    const allUsers = await prisma.user.findMany()
    for (const user of allUsers.slice(0, 5)) {
      await prisma.notification.createMany({
        data: [
          { userId: user.id, title: 'New Survey Response', message: 'A new patient satisfaction survey response has been submitted', type: 'SURVEY', isRead: Math.random() > 0.5 },
          { userId: user.id, title: 'SMS Campaign Complete', message: 'Your scheduled SMS campaign has been completed', type: 'SMS', isRead: Math.random() > 0.5 },
          { userId: user.id, title: 'Weekly Report Ready', message: 'Your weekly analytics report is ready for review', type: 'INFO', isRead: Math.random() > 0.5 },
        ],
      })
    }
  }

  const existingAuditLogs = await prisma.auditLog.count()
  if (existingAuditLogs === 0) {
    const allUsers = await prisma.user.findMany()
    const actions = ['LOGIN', 'CREATE', 'UPDATE', 'DELETE', 'EXPORT']
    const entityTypes = ['SURVEY', 'USER', 'DEPARTMENT', 'SMS', 'REPORT']
    for (let i = 0; i < 20; i++) {
      await prisma.auditLog.create({
        data: {
          userId: allUsers[Math.floor(Math.random() * allUsers.length)].id,
          action: actions[Math.floor(Math.random() * actions.length)],
          entityType: entityTypes[Math.floor(Math.random() * entityTypes.length)],
          details: JSON.stringify({ timestamp: new Date().toISOString() }),
        },
      })
    }
  }

  const existingSettings = await prisma.systemSetting.count()
  if (existingSettings === 0) {
    await prisma.systemSetting.createMany({
      data: [
        { key: 'hospital_name', value: 'City General Hospital', category: 'GENERAL' },
        { key: 'sms_provider', value: 'TWILIO', category: 'SMS' },
        { key: 'sms_auto_send', value: 'true', category: 'SMS' },
        { key: 'session_timeout', value: '3600', category: 'SECURITY' },
        { key: 'max_login_attempts', value: '5', category: 'SECURITY' },
      ],
    })
  }

  console.log('✅ Seed completed successfully!')
  console.log('📧 Admin login: admin@hospital.com / admin123')
}

seed()
  .catch((e) => {
    console.error('Seed error:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())