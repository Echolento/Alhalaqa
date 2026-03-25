const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const envPath = path.resolve(process.cwd(), '.env.local')
const envContent = fs.readFileSync(envPath, 'utf8')
const env = {}
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=')
  if (key && value) env[key.trim()] = value.trim().replace(/^"|"$/g, '')
})

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function diagnose() {
  console.log('--- DIAGNOSTIC START ---')
  
  // 1. Fetch Students
  const { data: students, error: sError } = await supabase
    .from('students')
    .select('id, monthly_price, payment_day, profile:profiles(full_name)')
  
  if (sError) {
    console.error('Error fetching students:', sError)
  } else {
    console.log('Students in DB:', JSON.stringify(students, null, 2))
    
    // 2. Try to update one student (test RLS as anon - should fail if not authorized)
    if (students && students.length > 0) {
      const testStudent = students[0]
      console.log(`Attempting test update for student ${testStudent.id}...`)
      const { error: uError } = await supabase
        .from('students')
        .update({ monthly_price: (testStudent.monthly_price || 0) + 1 })
        .eq('id', testStudent.id)
      
      if (uError) {
        console.log('Update failed (as expected if No Policy):', uError.message)
      } else {
        console.log('Update succeeded! RLS might be too permissive or correctly set but UI is failing.')
      }
    }
  }

  // 3. Check Payments
  const { data: payments, error: pError } = await supabase
    .from('student_payments')
    .select('*')
    .order('month', { ascending: false })
    .limit(10)

  if (pError) {
    console.error('Error fetching payments:', pError)
  } else {
    console.log('Recent Payments in DB:', JSON.stringify(payments, null, 2))
  }

  console.log('--- DIAGNOSTIC END ---')
}

diagnose()
