'use server'

export {
  getTeacherStudents,
  addStudent,
  updateStudent,
  deleteStudent,
} from './student-actions'

export {
  getTeacherPayments,
  updateStudentMonthlyPrice,
  toggleStudentPayment,
  updateStudentPaymentDay,
} from './payment-actions'
