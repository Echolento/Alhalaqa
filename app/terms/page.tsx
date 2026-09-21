import Link from 'next/link'

const LAST_UPDATED = '19 سبتمبر 2026'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-12 max-w-3xl">
        <h1 className="text-3xl font-bold text-foreground">شروط الاستخدام</h1>
        <p className="mt-2 text-sm text-muted-foreground">آخر تحديث: {LAST_UPDATED}</p>

        <div className="mt-8 space-y-6 text-muted-foreground leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-xl font-bold text-foreground">الخدمة</h2>
            <p>
              منصة الحلقة (Alhalaqa) توفر لمعلمي القرآن الكريم أدوات لتنظيم الطلاب
              ومتابعة المستحقات المالية. باستخدامك للمنصة فأنت توافق على هذه الشروط.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-bold text-foreground">الحساب</h2>
            <ul className="list-disc pr-5 space-y-1">
              <li>يجب أن تكون البيانات المقدمة عند التسجيل صحيحة.</li>
              <li>أنت مسؤول عن الحفاظ على سرية بيانات الدخول الخاصة بك (كلمة المرور أو حساب Google) وعن أي نشاط يتم عبر حسابك.</li>
              <li>يمكنك التسجيل بالبريد الإلكتروني أو عبر حساب Google الخاص بك.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-bold text-foreground">الاستخدام المقبول</h2>
            <ul className="list-disc pr-5 space-y-1">
              <li>استخدام المنصة للأغراض المشروعة فقط.</li>
              <li>عدم محاولة الوصول إلى بيانات معلمين آخرين أو الإضرار بالخدمة.</li>
              <li>أنت مسؤول عن دقة بيانات طلابك ومدفوعاتهم التي تدخلها.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-bold text-foreground">توفر الخدمة والمسؤولية</h2>
            <p>
              نسعى لتوفير الخدمة باستمرار لكننا لا نضمن خلوها من الانقطاع. تُقدم
              الخدمة &laquo;كما هي&raquo;، وبأقصى حد يسمح به القانون لا نتحمل
              مسؤولية أي أضرار غير مباشرة ناتجة عن استخدام المنصة.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-bold text-foreground">إنهاء الحساب</h2>
            <p>
              يمكنك التوقف عن استخدام المنصة في أي وقت وطلب حذف حسابك عبر مراسلتنا
              على <span dir="ltr">hello@alhalaqa.com</span>، كما يحق لنا تعليق
              الحسابات المخالفة لهذه الشروط.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-bold text-foreground">تغييرات الشروط</h2>
            <p>قد نحدّث هذه الشروط من وقت لآخر، وسيُعرض تاريخ آخر تحديث أعلاه.</p>
          </section>
        </div>

        <div className="mt-10">
          <Link href="/" className="text-primary hover:underline font-medium">
            العودة إلى الصفحة الرئيسية
          </Link>
        </div>
      </div>
    </div>
  )
}
