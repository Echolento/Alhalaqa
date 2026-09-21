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
              <li>اشتراكات الإشعارات: نقطة نهاية متصفحك فقط عند تفعيلك للإشعارات.</li>
              <li>
                بيانات تقنية: ملفات تعريف الارتباط (الكوكيز) الخاصة بتسجيل الدخول،
                وإحصاءات استخدام مجهولة عبر Google Analytics وVercel Analytics.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-bold text-foreground">تسجيل الدخول عبر Google</h2>
            <p>
              عند التسجيل باستخدام حساب Google، نستلم اسمك وبريدك الإلكتروني
              ونستخدمهما فقط لإنشاء حسابك وتسجيل دخولك. قد تمر صورتك الشخصية عبر
              عملية التسجيل لكننا لا نخزنها ولا نستخدمها. لا نشارك بيانات Google
              الخاصة بك مع أي طرف ثالث، ولا نستخدمها لأي غرض آخر.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-bold text-foreground">كيف نستخدم البيانات</h2>
            <ul className="list-disc pr-5 space-y-1">
              <li>تشغيل الخدمة: حسابك، طلابك، ومدفوعاتك.</li>
              <li>إرسال رسائل ضرورية: تأكيد البريد، إعادة تعيين كلمة المرور، وتذكيرات الدفع عبر البريد والإشعارات.</li>
              <li>فهم استخدام المنصة وتحسينها عبر إحصاءات مجهولة.</li>
              <li>لا نبيع بياناتك ولا نشاركها مع أطراف ثالثة لأغراض تسويقية.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-bold text-foreground">الأطراف التي تعالج البيانات</h2>
            <ul className="list-disc pr-5 space-y-1">
              <li>Supabase: استضافة قاعدة البيانات وخدمة الدخول (الاتحاد الأوروبي).</li>
              <li>Vercel: استضافة الموقع وخدمة تحليلات تحترم الخصوصية.</li>
              <li>Resend: إرسال رسائل البريد الضرورية (التأكيد، الاستعادة، التذكيرات).</li>
              <li>Google: تسجيل الدخول وخدمة Google Analytics للإحصاءات.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-bold text-foreground">تخزين البيانات وحمايتها</h2>
            <p>
              تُستضاف بياناتك في الاتحاد الأوروبي مع تشفير أثناء النقل والتخزين.
              بيانات طلابك ومدفوعاتك لا تظهر إلا لك، ولا يطلع عليها غير المشرفين
              عند الحاجة للدعم الفني.
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
