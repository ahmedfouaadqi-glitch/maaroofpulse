# Maaroofpulse

بناء منصة MAAROOF PULSE لرصد النبض والترندات والفعاليات والتطبيقات الأكثر انتشاراً محلياً وعالمياً حسب الموقع الجغرافي للمستخدم (IP / GPS) مع دورة تحديث 12 ساعة:

1. واجهة المستخدم وصفحة الهبوط (Freemium Landing & Experience):
- مصطلحات الواجهة جذابة وبسيطة للمستخدمين ورواد الأعمال والشركات، خالية تماماً من كلمات "استخبارات أو استخبار". استخدام عبارات: "يلوح في الأفق"، "ترند صاعد بقوة"، "مؤشر قوة النبض"، "المصادر الموثوقة"، "وقت السبق"، "سجل الدقة والشفافية".
- للزائر غير المشترك: عرض صفحة هبوط كاملة ومحفزة مع ظهور أجزاء من الأخبار والتحليلات والترندات وتعتيم (Blur) وتأمين الباقي مع شريط تحفيز للاشتراك (Paywall/Teaser).
- للمشتركين: تسجيل وتعرف تلقائي يفتح البيانات كاملة، النبض اللحظي، تفاصيل الأحداث والفعاليات، روابط الخرائط المباشرة وروابط التسجيل، والمؤشرات المتقدمة.
- رصد وتوزيع مخصص: الفعاليات والأحداث القادمة، روابط الموقع الجغرافي (Google Maps)، التطبيقات الأكثر نمواً وانتشاراً في المنطقة، وتحليل أسباب الصعود.
- دعم إظهار وتحسين التواجد في محركات البحث التوليدية (GEO & AI-SXO) ومؤشر حضور 10 نماذج ذكاء عالمية (DeepSeek, ChatGPT, Gemini, Claude, Perplexity, Copilot, Grok, Mistral, Kimi, Qwen) مع وكيل مساعد ذكي مخصص للمشتركين.

2. المصادقة وإدارة الحسابات (Authentication & Access):
- تسجيل دخول تلقائي وسهل عبر Google و Apple و Microsoft.
- خيار التسجيل اليدوي بالبريد الإلكتروني المؤسسي / الشخصي وكلمة المرور مع تأكيد الحساب.
- دعم مستويات الصلاحيات (Super Admin, Editor, Subscriber, Guest).

3. لوحة تحكم إدارية موسعة وشاملة (Super Admin Dashboard):
- إدارة الاشتراكات والباقات: تعديل الأسعار، الخصائص، المزايا، وتفعيل/تعطيل الخطط بضغطة زر.
- إدارة المستخدمين: عرض الحسابات، ترقية الاشتراكات يدوياً، الحظر، تعديل الصلاحيات وتتبع النشاط.
- إدارة المحتوى والإشارات: التحكم في قائمة المصادر وروابط الاستهداف (Target Registry لـ Firecrawl)، دورات التحديث (12 ساعة)، تنقيح الضوضاء، ومراجعة المحتوى.
- تعديل وضبط كل إعدادات النظام والمظهر ومفاتيح المزايا بنقرة زر (Feature Flags & Settings).

4. البنية والبيانات:
- واجهة عصرية وسريعة مع وضع ليلي/نهاري، ودعم كامل للغتين العربية والإنجليزية، وتكامل جاهز مع Lovable Cloud / Supabase لإدارة الجداول والمصادقة والبيانات.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://maaroofpulse.lovable.app

## Agent skills

The repository includes reusable, project-specific agent workflows for deep source research, page-change monitoring, social trend analysis, evidence verification, and connector governance. See [`skills/README.md`](./skills/README.md) for the skill index, Manus capability mapping, and source references. These skills guide research and development; they do not themselves add provider integrations or access credentials.

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/fe264e07-b828-4233-b3ab-d3fac0ce79b6).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
