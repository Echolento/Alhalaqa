import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'fake-key'
const supabase = createClient(supabaseUrl, supabaseKey)

async function testUpdate() {
  // get a real student id
  const { data: students, error: err1 } = await supabase.from('students').select('id, monthly_price').limit(1)
  if (err1) { console.error('Error fetching student:', err1); return; }
  
  if (students && students.length > 0) {
    const student = students[0]
    console.log('Original student:', student)
    
    // try to update it
    const { data: updated, error: err2 } = await supabase.from('students').update({ monthly_price: 99 }).eq('id', student.id).select()
    if (err2) { console.error('Error updating student:', err2); return; }
    
    console.log('Update result (if RLS allowed it, it should return row):', updated)
    
    // reset it
    await supabase.from('students').update({ monthly_price: student.monthly_price }).eq('id', student.id)
  }
}

testUpdate()
