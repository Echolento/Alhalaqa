import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role for diagnosis

const supabase = createClient(supabaseUrl, supabaseKey)

async function diagnose() {
  console.log('--- DIAGNOSTIC START ---')
  
  const { data: students, error: sError } = await supabase
    .from('students')
    .select('id, monthly_price, payment_day, profile:profiles(full_name)')
  
  if (sError) {
    console.error('Error fetching students:', sError)
  } else {
    console.log('Students in DB:', JSON.stringify(students, null, 2))
  }

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
