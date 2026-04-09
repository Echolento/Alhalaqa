# Supabase Email Templates (Alhalaqa - الحلقة)

These email templates have been designed to match the branding of **Alhalaqa (الحلقة)**, including your primary theme color (`#4d938b`). 

> **Important Note about the Logo Image:**
> Email clients require **absolute URLs** for images. In the templates below, the logo is set to https://www.alhalaqa.com/Logo.png**Before saving in Supabase, make sure you replace this URL with your actual production App URL!** (e.g., `https://my-app.com/Logo.png`).

To use these, go to your **Supabase Dashboard -> Authentication -> Email Templates** and copy/paste each snippet.

---

## 1. Confirm Signup (تأكيد التسجيل)
**Subject:** `تأكيد تسجيل حسابك في منصة الحلقة`

```html
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <title>تأكيد الحساب</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); margin-top: 40px; margin-bottom: 40px; border: 1px solid #e2e8f0;">
    
    <!-- Header -->
    <div style="background-color: #4d938b; padding: 32px 24px; text-align: center;">
      <!-- REPLACE URL BELOW WITH YOUR PRODUCTION DOMAIN (e.g., https://my-app.com/Logo.png) -->
      <img src="https://your-vercel-domain.vercel.app/Logo.png" alt="شعار منصة الحلقة" style="height: 64px; width: auto; margin-bottom: 16px; border-radius: 12px;" />
      <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: bold;">منصة الحلقة</h1>
    </div>

    <!-- Content -->
    <div style="padding: 40px 32px; text-align: right; direction: rtl;">
      <h2 style="color: #0f172a; margin-top: 0; font-size: 22px;">مرحباً بك!</h2>
      <p style="color: #475569; line-height: 1.8; font-size: 16px;">
        لقد قمت بالتسجيل في <strong>منصة الحلقة</strong> لإدارة حلقات تحفيظ القرآن الكريم. لتفعيل حسابك والبدء في الاستخدام، يرجى تأكيد بريدك الإلكتروني بالضغط على الرابط أدناه:
      </p>

      <div style="text-align: center; margin: 40px 0;">
        <a href="{{ .ConfirmationURL }}" style="display: inline-block; background-color: #4d938b; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 2px 4px rgba(77, 147, 139, 0.3);">تأكيد البريد الإلكتروني</a>
      </div>

      <p style="color: #64748b; font-size: 14px; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
        إذا لم تقم بطلب هذا التسجيل، يمكنك تجاهل هذه الرسالة بأمان.
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="color: #94a3b8; font-size: 13px; margin: 0;">&copy; 2026 منصة الحلقة. جميع الحقوق محفوظة.</p>
    </div>
  </div>
</body>
</html>
```

---

## 2. Reset Password (إعادة تعيين كلمة المرور)
**Subject:** `طلب إعادة تعيين مسار الدخول (كلمة المرور)`

```html
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <title>استعادة كلمة المرور</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); margin-top: 40px; margin-bottom: 40px; border: 1px solid #e2e8f0;">
    
    <!-- Header -->
    <div style="background-color: #4d938b; padding: 32px 24px; text-align: center;">
      <!-- REPLACE URL BELOW WITH YOUR PRODUCTION DOMAIN -->
      <img src="https://your-vercel-domain.vercel.app/Logo.png" alt="شعار منصة الحلقة" style="height: 64px; width: auto; margin-bottom: 16px; border-radius: 12px;" />
      <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: bold;">منصة الحلقة</h1>
    </div>

    <!-- Content -->
    <div style="padding: 40px 32px; text-align: right; direction: rtl;">
      <h2 style="color: #0f172a; margin-top: 0; font-size: 22px;">هل نسيت كلمة المرور؟</h2>
      <p style="color: #475569; line-height: 1.8; font-size: 16px;">
        لقد تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك في <strong>منصة الحلقة</strong>. يمكنك إنشاء كلمة مرور جديدة من خلال الرابط التالي:
      </p>

      <div style="text-align: center; margin: 40px 0;">
        <a href="{{ .ConfirmationURL }}" style="display: inline-block; background-color: #4d938b; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 2px 4px rgba(77, 147, 139, 0.3);">إعادة تعيين كلمة المرور</a>
      </div>

      <p style="color: #64748b; font-size: 14px; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
        إذا لم تطلب إعادة تعيين كلمة المرور، يرجى تجاهل هذا البريد الإلكتروني.
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="color: #94a3b8; font-size: 13px; margin: 0;">&copy; 2026 منصة الحلقة. جميع الحقوق محفوظة.</p>
    </div>
  </div>
</body>
</html>
```

---

## 3. Invite User (دعوة مستخدم)
**Subject:** `دعوة خاصة للانضمام إلى منصة الحلقة`

```html
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <title>دعوة للانضمام</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); margin-top: 40px; margin-bottom: 40px; border: 1px solid #e2e8f0;">
    
    <!-- Header -->
    <div style="background-color: #4d938b; padding: 32px 24px; text-align: center;">
      <!-- REPLACE URL BELOW WITH YOUR PRODUCTION DOMAIN -->
      <img src="https://your-vercel-domain.vercel.app/Logo.png" alt="شعار منصة الحلقة" style="height: 64px; width: auto; margin-bottom: 16px; border-radius: 12px;" />
      <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: bold;">منصة الحلقة</h1>
    </div>

    <!-- Content -->
    <div style="padding: 40px 32px; text-align: right; direction: rtl;">
      <h2 style="color: #0f172a; margin-top: 0; font-size: 22px;">دعوة خاصة لك</h2>
      <p style="color: #475569; line-height: 1.8; font-size: 16px;">
        يسعدنا دعوتك للانضمام إلى <strong>منصة الحلقة</strong>، المنصة الرائدة لإدارة حلقات تحفيظ القرآن الكريم. انقر على الزر أدناه لقبول الدعوة وإنشاء حسابك:
      </p>

      <div style="text-align: center; margin: 40px 0;">
        <a href="{{ .ConfirmationURL }}" style="display: inline-block; background-color: #4d938b; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 2px 4px rgba(77, 147, 139, 0.3);">قبول الدعوة واستكمال التسجيل</a>
      </div>

      <p style="color: #64748b; font-size: 14px; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
        هذه الدعوة صالحة لفترة محدودة، نأمل رؤيتك معنا قريباً.
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="color: #94a3b8; font-size: 13px; margin: 0;">&copy; 2026 منصة الحلقة. جميع الحقوق محفوظة.</p>
    </div>
  </div>
</body>
</html>
```

---

## 4. Magic Link (رابط تسجيل الدخول السريع)
**Subject:** `رابط الدخول السريع إلى منصة الحلقة`

```html
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <title>رابط الدخول</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); margin-top: 40px; margin-bottom: 40px; border: 1px solid #e2e8f0;">
    
    <!-- Header -->
    <div style="background-color: #4d938b; padding: 32px 24px; text-align: center;">
      <!-- REPLACE URL BELOW WITH YOUR PRODUCTION DOMAIN -->
      <img src="https://your-vercel-domain.vercel.app/Logo.png" alt="شعار منصة الحلقة" style="height: 64px; width: auto; margin-bottom: 16px; border-radius: 12px;" />
      <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: bold;">منصة الحلقة</h1>
    </div>

    <!-- Content -->
    <div style="padding: 40px 32px; text-align: right; direction: rtl;">
      <h2 style="color: #0f172a; margin-top: 0; font-size: 22px;">تسجيل الدخول السريع</h2>
      <p style="color: #475569; line-height: 1.8; font-size: 16px;">
        انقر على الزر أدناه لتسجيل الدخول إلى حسابك في <strong>منصة الحلقة</strong> مباشرة، دون الحاجة لكتابة كلمة المرور:
      </p>

      <div style="text-align: center; margin: 40px 0;">
        <a href="{{ .ConfirmationURL }}" style="display: inline-block; background-color: #4d938b; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 2px 4px rgba(77, 147, 139, 0.3);">تسجيل الدخول إلى حسابي</a>
      </div>
      
       <p style="color: #64748b; font-size: 14px; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
        الرابط صالح للاستخدام مرة واحدة. إذا لم تطلب هذا الرابط، يمكنك تجاهل هذه الرسالة.
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="color: #94a3b8; font-size: 13px; margin: 0;">&copy; 2026 منصة الحلقة. جميع الحقوق محفوظة.</p>
    </div>
  </div>
</body>
</html>
```

---

## 5. Change Email (تغيير البريد الإلكتروني)
**Subject:** `تأكيد البريد الإلكتروني الجديد`

```html
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <title>تأكيد البريد الإلكتروني</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); margin-top: 40px; margin-bottom: 40px; border: 1px solid #e2e8f0;">
    
    <!-- Header -->
    <div style="background-color: #4d938b; padding: 32px 24px; text-align: center;">
      <!-- REPLACE URL BELOW WITH YOUR PRODUCTION DOMAIN -->
      <img src="https://your-vercel-domain.vercel.app/Logo.png" alt="شعار منصة الحلقة" style="height: 64px; width: auto; margin-bottom: 16px; border-radius: 12px;" />
      <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: bold;">منصة الحلقة</h1>
    </div>

    <!-- Content -->
    <div style="padding: 40px 32px; text-align: right; direction: rtl;">
      <h2 style="color: #0f172a; margin-top: 0; font-size: 22px;">طلب تغيير البريد الإلكتروني</h2>
      <p style="color: #475569; line-height: 1.8; font-size: 16px;">
        لقد قمت بطلب تغيير عنوان البريد الإلكتروني المرتبط بحسابك في <strong>منصة الحلقة</strong>. يرجى تأكيد هذا التغيير بالضغط على الزر أدناه:
      </p>

      <div style="text-align: center; margin: 40px 0;">
        <a href="{{ .ConfirmationURL }}" style="display: inline-block; background-color: #4d938b; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 2px 4px rgba(77, 147, 139, 0.3);">تأكيد البريد الإلكتروني الجديد</a>
      </div>
      
       <p style="color: #64748b; font-size: 14px; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
        إذا لم تقم بطلب هذا التغيير، يرجى التواصل مع الدعم الفني فوراً.
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="color: #94a3b8; font-size: 13px; margin: 0;">&copy; 2026 منصة الحلقة. جميع الحقوق محفوظة.</p>
    </div>
  </div>
</body>
</html>
```
