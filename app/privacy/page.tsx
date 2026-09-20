import Link from 'next/link'

const LAST_UPDATED = '19 سبتمبر 2026'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-12 max-w-3xl">
        <h1 className="text-3xl font-bold text-foreground">سياسة الخصوصية</h1>
        <p className="mt-2 text-sm text-muted-foreground">آخر تحديث: {LAST_UPDATED}</p>

        <div className="mt-8 space-y-6 text-muted-foreground leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-xl font-bold text-foreground">من نحن</h2>
            <p>
              منصة الحلقة (Alhalaqa) هي خدمة لمعلمي القرآن الكريم لمتابعة الطلاب
              والمستحقات المالية. يمكنك التواصل معنا عبر البريد الإلكتروني:{' '}
              <span dir="ltr">hello@alhalaqa.com</span>
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-bold text-foreground">البيانات التي نجمعها</h2>
            <ul className="list-disc pr-5 space-y-1">
              <li>بيانات الحساب: الاسم، البريد الإلكتروني، ورقم الهاتف (اختياري).</li>
              <li>البيانات التي تدخلها بنفسك: أسماء الطلاب وأرقامهم وأسعارهم وحالات الدفع.</li>
              <li>بيانات تقنية ضرورية لعمل الخدمة: ملفات تعريف الارتباط (الكوكيز) الخاصة بتسجيل الدخول.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-bold text-foreground">تسجيل الدخول عبر Google</h2>
            <p>
              عند التسجيل باستخدام حساب Google، نصل فقط إلى اسمك وبريدك الإلكتروني
              وصورتك الشخصية، ونستخدمها حصرياً لإنشاء حسابك وتسجيل دخولك. لا نشارك
              بيانات Google الخاصة بك مع أي طرف ثالث، ولا نستخدمها لأي غرض آخر.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-bold text-foreground">كيف نستخدم البيانات</h2>
            <ul className="list-disc pr-5 space-y-1">
              <li>تشغيل الخدمة: حسابك، طلابك، ومدفوعاتك.</li>
              <li>إرسال رسائل ضرورية: تأكيد البريد، إعادة تعيين كلمة المرور، وتذكيرات الدفع.</li>
              <li>لا نبيع بياناتك ولا نشاركها مع أطراف ثالثة لأغراض تسويقية.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-bold text-foreground">تخزين البيانات وحمايتها</h2>
            <p>
              تُخزَّن بياناتك لدى مزود البنية التحتية (Supabase) مع تشفير أثناء النقل
              والتخزين، ولا يمكن لأي معلم الوصول إلا إلى بياناته الخاصة.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-bold text-foreground">حقوقك</h2>
            <p>
              يمكنك تعديل بياناتك من صفحة الإعدادات في أي وقت، ويمكنك طلب حذف حسابك
              وبياناتك نهائياً عبر مراسلتنا على{' '}
              <span dir="ltr">hello@alhalaqa.com</span>
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-bold text-foreground">تغييرات السياسة</h2>
            <p>قد نحدّث هذه السياسة من وقت لآخر، وسنعرض تاريخ آخر تحديث أعلاه.</p>
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
