# HTML Email Templates

Use these templates in your Supabase Dashboard -> Authentication -> Email Templates.

## Common Styles
These templates use inline CSS for maximum compatibility with email clients.
Primary Color: `#0f172a` (Slate 900)
Accent Color: `#2563eb` (Blue 600)

---

## 1. Confirm Your Signup (تأكيد التسجيل)
**Subject:** `تأكيد تسجيل حسابك في منصة معلم القرآن`

```html
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <title>تأكيد الحساب</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); margin-top: 40px; margin-bottom: 40px;">
    
    <!-- Header -->
    <div style="background-color: #0f172a; padding: 24px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">منصة معلم القرآن</h1>
    </div>

    <!-- Content -->
    <div style="padding: 32px 24px; text-align: right; direction: rtl;">
      <h2 style="color: #1e293b; margin-top: 0; font-size: 20px;">مرحباً بك!</h2>
      <p style="color: #475569; line-height: 1.6; font-size: 16px;">
        لقد قمت بالتسجيل في منصة معلم القرآن. لتفعيل حسابك والبدء في الاستخدام، يرجى تأكيد بريدك الإلكتروني بالضغط على الرابط أدناه:
      </p>

      <div style="text-align: center; margin: 32px 0;">
        <a href="{{ .ConfirmationURL }}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; font-size: 16px;">تأكيد البريد الإلكتروني</a>
      </div>

      <p style="color: #64748b; font-size: 14px; margin-top: 24px;">
        إذا لم تقم بطلب هذا التسجيل، يمكنك تجاهل هذه الرسالة بأمان.
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #f1f5f9; padding: 16px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="color: #94a3b8; font-size: 12px; margin: 0;">&copy; 2026 منصة معلم القرآن. جميع الحقوق محفوظة.</p>
    </div>
  </div>
</body>
</html>
```

---

## 2. Reset Password (إعادة تعيين كلمة المرور)
**Subject:** `طلب إعادة تعيين كلمة المرور`

```html
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <title>استعادة كلمة المرور</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); margin-top: 40px; margin-bottom: 40px;">
    
    <!-- Header -->
    <div style="background-color: #0f172a; padding: 24px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">منصة معلم القرآن</h1>
    </div>

    <!-- Content -->
    <div style="padding: 32px 24px; text-align: right; direction: rtl;">
      <h2 style="color: #1e293b; margin-top: 0; font-size: 20px;">هل نسيت كلمة المرور؟</h2>
      <p style="color: #475569; line-height: 1.6; font-size: 16px;">
        لقد تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك. يمكنك إنشاء كلمة مرور جديدة من خلال الرابط التالي:
      </p>

      <div style="text-align: center; margin: 32px 0;">
        <a href="{{ .ConfirmationURL }}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; font-size: 16px;">إعادة تعيين كلمة المرور</a>
      </div>

      <p style="color: #64748b; font-size: 14px; margin-top: 24px;">
        إذا لم تطلب إعادة تعيين كلمة المرور، يرجى تجاهل هذا البريد الإلكتروني.
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #f1f5f9; padding: 16px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="color: #94a3b8; font-size: 12px; margin: 0;">&copy; 2026 منصة معلم القرآن. جميع الحقوق محفوظة.</p>
    </div>
  </div>
</body>
</html>
```

---

## 3. Invite User (دعوة مستخدم)
**Subject:** `دعوة للانضمام إلى منصة معلم القرآن`

```html
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <title>دعوة للانضمام</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); margin-top: 40px; margin-bottom: 40px;">
    
    <!-- Header -->
    <div style="background-color: #0f172a; padding: 24px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">منصة معلم القرآن</h1>
    </div>

    <!-- Content -->
    <div style="padding: 32px 24px; text-align: right; direction: rtl;">
      <h2 style="color: #1e293b; margin-top: 0; font-size: 20px;">دعوة خاصة لك</h2>
      <p style="color: #475569; line-height: 1.6; font-size: 16px;">
        يسعدنا دعوتك للانضمام إلى فريقنا في منصة معلم القرآن. انقر على الزر أدناه لقبول الدعوة وإنشاء حسابك:
      </p>

      <div style="text-align: center; margin: 32px 0;">
        <a href="{{ .ConfirmationURL }}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; font-size: 16px;">قبول الدعوة</a>
      </div>

      <p style="color: #64748b; font-size: 14px; margin-top: 24px;">
        هذه الدعوة صالحة لفترة محدودة.
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #f1f5f9; padding: 16px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="color: #94a3b8; font-size: 12px; margin: 0;">&copy; 2026 منصة معلم القرآن. جميع الحقوق محفوظة.</p>
    </div>
  </div>
</body>
</html>
```

---

## 4. Magic Link (رابط تسجيل الدخول السريع)
**Subject:** `رابط الدخول السريع`

```html
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <title>رابط الدخول</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); margin-top: 40px; margin-bottom: 40px;">
    
    <!-- Header -->
    <div style="background-color: #0f172a; padding: 24px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">منصة معلم القرآن</h1>
    </div>

    <!-- Content -->
    <div style="padding: 32px 24px; text-align: right; direction: rtl;">
      <h2 style="color: #1e293b; margin-top: 0; font-size: 20px;">تسجيل الدخول السريع</h2>
      <p style="color: #475569; line-height: 1.6; font-size: 16px;">
        انقر على الزر أدناه لتسجيل الدخول إلى حسابك مباشرة دون الحاجة لكلمة مرور:
      </p>

      <div style="text-align: center; margin: 32px 0;">
        <a href="{{ .ConfirmationURL }}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; font-size: 16px;">تسجيل الدخول الآن</a>
      </div>
      
       <p style="color: #64748b; font-size: 14px; margin-top: 24px;">
        إذا لم تطلب هذا الرابط، يمكنك تجاهل هذه الرسالة.
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #f1f5f9; padding: 16px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="color: #94a3b8; font-size: 12px; margin: 0;">&copy; 2026 منصة معلم القرآن. جميع الحقوق محفوظة.</p>
    </div>
  </div>
</body>
</html>
```
