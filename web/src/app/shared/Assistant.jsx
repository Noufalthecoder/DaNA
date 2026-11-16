/* DaNA guide: a floating helper inside the app (couple accounts). Free, offline, no API key.
   Answers come from DaNA's own reviewed wording, personalised to this person's result, in text first.
   "Listen" lets the person choose English, Arabic or Urdu: the answer is shown and read aloud in that
   language with the browser's own voices. Nothing typed here leaves the browser. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore, EMPTY_OBJ } from './store.js';
import { guide } from './explain.js';
import { COND, headline } from './reportText.js';
import { isLinked, isRealReport, personalStatus } from './journey.js';
import { PEOPLE, GENES } from './data.js';
import { useCouple } from '../couple/useCouple.js';
import { logAudit } from './db.js';
import './assistant.css';
import { useLang, getLang } from './i18n.js';

/* friendly counsellor illustrations: Emirati dress, no real person's likeness */
export function CounsellorFace({ sex, size = 56 }) {
  const female = sex === 'F';
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
      <circle cx="32" cy="32" r="32" fill="#E8F3EC" />
      {female ? (
        <>
          <path d="M14 64 Q14 42 32 40 Q50 42 50 64Z" fill="#1F2A24" />
          <path d="M17 34 Q16 12 32 11 Q48 12 47 34 Q47 46 32 47 Q17 46 17 34Z" fill="#2B3A32" />
          <ellipse cx="32" cy="31" rx="10.5" ry="12" fill="#D9A77F" />
          <path d="M21 27 Q22 17 32 17 Q42 17 43 27 Q38 21 32 21 Q26 21 21 27Z" fill="#2B3A32" />
        </>
      ) : (
        <>
          <path d="M14 64 Q14 43 32 41 Q50 43 50 64Z" fill="#FFFFFF" stroke="#DDE5E0" />
          <path d="M18 36 Q15 14 32 12 Q49 14 46 36 L44 50 Q32 44 20 50Z" fill="#FFFFFF" stroke="#DDE5E0" />
          <ellipse cx="32" cy="31" rx="10" ry="11.5" fill="#C99268" />
          <path d="M21 22 Q32 15 43 22 L43 25 Q32 19 21 25Z" fill="#1F2A24" />
          <path d="M25 37 Q32 43 39 37 Q38 41 32 42 Q26 41 25 37Z" fill="#3A2A20" />
        </>
      )}
      <circle cx="28" cy="30" r="1.4" fill="#2B2B2B" />
      <circle cx="36" cy="30" r="1.4" fill="#2B2B2B" />
      <path d="M28.5 35 Q32 37.5 35.5 35" stroke="#7A4A35" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </svg>
  );
}

const LANGS = { en: { name: 'English', dir: 'ltr' }, ar: { name: 'العربية', dir: 'rtl' }, ur: { name: 'اردو', dir: 'rtl' } };

/* fixed answers, reviewed wording, in all three languages */
const A = {
  carrier: {
    en: 'A carrier has one changed copy of a gene and one working copy. The working copy does the job, so carriers are healthy and need no treatment. Most people carry at least one change like this.',
    ar: 'حامل الصفة لديه نسخة متغيّرة من الجين ونسخة سليمة. النسخة السليمة تقوم بالعمل، لذلك حاملو الصفة أصحاء ولا يحتاجون إلى علاج. معظم الناس يحملون تغيّراً واحداً على الأقل من هذا النوع.',
    ur: 'کیریئر کے پاس جین کی ایک بدلی ہوئی کاپی اور ایک صحیح کاپی ہوتی ہے۔ صحیح کاپی اپنا کام کرتی ہے، اس لیے کیریئر صحت مند ہوتے ہیں اور انہیں علاج کی ضرورت نہیں ہوتی۔ زیادہ تر لوگوں میں ایسی کم از کم ایک تبدیلی ہوتی ہے۔',
  },
  notSick: {
    en: 'No. A carrier is a healthy person. A carrier result is not a diagnosis.',
    ar: 'لا. حامل الصفة شخص سليم. نتيجة الحامل ليست تشخيصاً لمرض.',
    ur: 'نہیں۔ کیریئر ایک صحت مند شخص ہوتا ہے۔ کیریئر کا نتیجہ کسی بیماری کی تشخیص نہیں ہے۔',
  },
  marry: {
    en: 'Yes. This result never stops a marriage. It is information to help you plan, and every choice stays yours. DaNA never tells anyone whom to marry.',
    ar: 'نعم. هذه النتيجة لا تمنع الزواج أبداً. إنها معلومات تساعدكما على التخطيط، وكل قرار يبقى لكما. دانا لا تخبر أحداً بمن يتزوج.',
    ur: 'جی ہاں۔ یہ نتیجہ کبھی شادی نہیں روکتا۔ یہ منصوبہ بندی میں مدد کے لیے معلومات ہے، اور ہر فیصلہ آپ کا ہے۔ دانا کبھی کسی کو نہیں بتاتا کہ کس سے شادی کرے۔',
  },
  childrenUnlinked: {
    en: 'The chance for a child depends on both of you. Link your partner and DaNA explains what your two results mean together.',
    ar: 'احتمال إصابة الطفل يعتمد عليكما معاً. اربط حساب شريكك، وستشرح دانا ما تعنيه نتيجتاكما معاً.',
    ur: 'بچے کے لیے امکان آپ دونوں پر منحصر ہے۔ اپنے شریکِ حیات کو جوڑیں، اور دانا بتائے گا کہ آپ دونوں کے نتائج مل کر کیا معنی رکھتے ہیں۔',
  },
  options: {
    en: 'If you both carry the same change there are three accepted paths: IVF with embryo testing, testing during pregnancy, or going ahead fully informed with care ready. There is no right answer and no deadline.',
    ar: 'إذا كنتما تحملان التغيّر نفسه فهناك ثلاثة خيارات مقبولة: أطفال الأنابيب مع فحص الأجنة، أو الفحص أثناء الحمل، أو المضي قدماً بمعرفة كاملة مع رعاية جاهزة. لا توجد إجابة صحيحة واحدة ولا موعد نهائي.',
    ur: 'اگر آپ دونوں میں ایک ہی تبدیلی ہے تو تین قابلِ قبول راستے ہیں: جنین کی جانچ کے ساتھ آئی وی ایف، حمل کے دوران جانچ، یا پوری معلومات کے ساتھ آگے بڑھنا جبکہ دیکھ بھال تیار ہو۔ کوئی ایک صحیح جواب نہیں اور کوئی آخری تاریخ نہیں۔',
  },
  partnerHow: {
    en: 'Ask your partner for their DaNA ID (shown at the top of their Connections page), then search for it on Connections and send a request.',
    ar: 'اطلب من شريكك رقم دانا الخاص به (يظهر في أعلى صفحة الاتصالات لديه)، ثم ابحث عنه في صفحة الاتصالات وأرسل طلباً.',
    ur: 'اپنے شریکِ حیات سے ان کی دانا آئی ڈی مانگیں (جو ان کے کنکشنز صفحے کے اوپر دکھائی دیتی ہے)، پھر اسے کنکشنز میں تلاش کریں اور درخواست بھیجیں۔',
  },
  privacy: {
    en: 'Only you, your linked partner once you both agree, and the counsellor you choose. You can see who opened your data and withdraw consent on the Privacy page.',
    ar: 'أنت فقط، وشريكك المرتبط بعد موافقتكما، والمستشار الذي تختاره. يمكنك رؤية من اطّلع على بياناتك وسحب موافقتك من صفحة الخصوصية.',
    ur: 'صرف آپ، آپ کا جڑا ہوا شریکِ حیات جب آپ دونوں راضی ہوں، اور وہ کونسلر جسے آپ چنیں۔ پرائیویسی صفحے پر آپ دیکھ سکتے ہیں کہ کس نے آپ کا ڈیٹا کھولا، اور اپنی رضامندی واپس لے سکتے ہیں۔',
  },
  report: {
    en: 'Your standard premarital report is ready in English, Arabic or Urdu. Open it and press Save as PDF.',
    ar: 'تقرير الفحص قبل الزواج جاهز بالعربية أو الإنجليزية أو الأردية. افتحه واضغط حفظ بصيغة PDF.',
    ur: 'آپ کی شادی سے پہلے کی معیاری رپورٹ انگریزی، عربی یا اردو میں تیار ہے۔ اسے کھولیں اور پی ڈی ایف کے طور پر محفوظ کریں دبائیں۔',
  },
  malaffi: {
    en: 'Your Malaffi record shows the genetic carrier test and the premarital blood tests exactly as received, with what is normal and what to discuss.',
    ar: 'سجلّك في ملفي يعرض فحص حمل الصفات الوراثية وفحوصات الدم قبل الزواج كما وصلت تماماً، مع ما هو طبيعي وما يحتاج إلى نقاش.',
    ur: 'آپ کا ملفی ریکارڈ جینیاتی کیریئر ٹیسٹ اور شادی سے پہلے کے خون کے ٹیسٹ بالکل ویسے دکھاتا ہے جیسے موصول ہوئے، یہ بتاتے ہوئے کہ کیا نارمل ہے اور کس پر بات کرنی ہے۔',
  },
  counsellor: {
    en: 'A genetic counsellor can explain everything in a private session, free of charge. You can choose online or in person.',
    ar: 'يمكن لمستشار الوراثة أن يشرح كل شيء في جلسة خاصة مجاناً. يمكنك اختيار جلسة عبر الإنترنت أو حضورياً.',
    ur: 'جینیاتی کونسلر ایک نجی سیشن میں سب کچھ مفت سمجھا سکتا ہے۔ آپ آن لائن یا بالمشافہ ملاقات چن سکتے ہیں۔',
  },
  fault: {
    en: 'No. You were born with it. These changes pass quietly through families for generations. Nothing you did caused it.',
    ar: 'لا. لقد وُلدت به. هذه التغيّرات تنتقل بهدوء في العائلات عبر الأجيال. لا شيء فعلته تسبّب في ذلك.',
    ur: 'نہیں۔ آپ اس کے ساتھ پیدا ہوئے۔ یہ تبدیلیاں نسلوں سے خاندانوں میں خاموشی سے چلی آتی ہیں۔ آپ کے کسی عمل کی وجہ سے ایسا نہیں ہوا۔',
  },
  unknown: {
    en: "I can only help with your screening, result, partner, report and privacy. For anything else, or if you'd like to talk it through, a counsellor is happy to help.",
    ar: 'يمكنني المساعدة فقط في الفحص ونتيجتك وشريكك والتقرير والخصوصية. لأي أمر آخر، أو إذا أردت التحدث، يسعد المستشار بمساعدتك.',
    ur: 'میں صرف آپ کی اسکریننگ، نتیجے، شریکِ حیات، رپورٹ اور پرائیویسی میں مدد کر سکتا ہوں۔ کسی اور چیز کے لیے، یا اگر آپ بات کرنا چاہیں، تو کونسلر خوشی سے مدد کرے گا۔',
  },
};

/* the couple result, in all three languages, by result type */
function coupleLine(type, gene) {
  const c = (l) => (gene && COND[gene]?.[l]) || { en: 'the condition', ar: 'الحالة', ur: 'یہ بیماری' }[l];
  return {
    plan: {
      en: `You are both healthy. A child could have ${c('en')} only if they get the change from both of you. In each pregnancy, 3 out of 4 children are healthy.`,
      ar: `كلاكما سليم. لا يُصاب الطفل بـ${c('ar')} إلا إذا ورث التغيّر منكما معاً. في كل حمل، 3 من كل 4 أطفال يكونون أصحاء.`,
      ur: `آپ دونوں صحت مند ہیں۔ بچے کو ${c('ur')} صرف تب ہو سکتی ہے جب اسے آپ دونوں سے تبدیلی ملے۔ ہر حمل میں 4 میں سے 3 بچے صحت مند ہوتے ہیں۔`,
    },
    xlinked: {
      en: 'This change is on the X chromosome, so it affects boys and girls differently. Daughters are usually healthy.',
      ar: 'هذا التغيّر على الكروموسوم X، لذلك يختلف تأثيره بين الأولاد والبنات. البنات عادةً سليمات.',
      ur: 'یہ تبدیلی X کروموسوم پر ہے، اس لیے بیٹوں اور بیٹیوں پر اس کا اثر مختلف ہوتا ہے۔ بیٹیاں عام طور پر صحت مند ہوتی ہیں۔',
    },
    carrier: {
      en: `Only one of you carries a change, and the other does not carry the same one. Your children cannot get ${c('en')} from you.`,
      ar: `أحدكما فقط يحمل تغيّراً، والآخر لا يحمل التغيّر نفسه. لا يمكن لأطفالكما أن يرثوا ${c('ar')} منكما.`,
      ur: `آپ میں سے صرف ایک میں تبدیلی ہے، اور دوسرے میں وہی تبدیلی نہیں۔ آپ کے بچوں کو آپ سے ${c('ur')} نہیں مل سکتی۔`,
    },
    clear: {
      en: 'Neither of you carries a change in the same gene. Your chance of a child with a screened condition is low, like most couples.',
      ar: 'لا يحمل أي منكما تغيّراً في الجين نفسه. احتمال إنجاب طفل مصاب بإحدى الحالات المفحوصة منخفض، مثل معظم الأزواج.',
      ur: 'آپ دونوں میں سے کسی میں ایک ہی جین کی تبدیلی نہیں۔ جانچی گئی بیماریوں میں سے کسی والے بچے کا امکان کم ہے، زیادہ تر جوڑوں کی طرح۔',
    },
    uncertain: {
      en: 'The lab found a change whose effect is not known yet. Most of these turn out to be harmless. A specialist checks it first.',
      ar: 'وجد المختبر تغيّراً لم يُعرف تأثيره بعد. معظم هذه التغيّرات تكون غير ضارة، وسيراجعه أخصائي أولاً.',
      ur: 'لیب کو ایک ایسی تبدیلی ملی جس کا اثر ابھی معلوم نہیں۔ زیادہ تر ایسی تبدیلیاں بے ضرر نکلتی ہیں۔ ایک ماہر پہلے اس کا جائزہ لے گا۔',
    },
  }[type] || null;
}

/* the topics: trigger words (English, Arabic, Urdu) and an answer {en, ar, ur} built from the person's own data */
function useTopics() {
  const session = useStore((s) => s.session);
  const reports = useStore((s) => s.reports) || EMPTY_OBJ;
  const { me, partner, result } = useCouple();
  const linked = isLinked(session);
  const status = personalStatus(me.sex, me.carrier, GENES[me.carrier]?.inheritance);
  const theirs = linked && isRealReport(reports[partner.id]);
  const couple = linked && theirs;
  const g = guide(couple
    ? { stage: 'couple', type: result.type, gene: result.gene, partnerName: partner.short, partnerIsCarrier: !!partner.carrier && !me.carrier }
    : { stage: linked ? 'partner-waiting' : 'individual', status, gene: me.carrier, partnerName: partner.short })
    || guide({ stage: 'individual', status, gene: me.carrier });

  return useMemo(() => {
    const own = (l) => {
      let [t, x] = headline(l, status, me.carrier);
      if (l === 'ar' && me.sex === 'F' && status === 'carrier') t = t.replace('أنت سليم: حامل', 'أنتِ سليمة: حاملة');
      return `${t}${l === 'ur' ? '۔' : '.'}\n\n${x}`;
    };
    const together = couple ? coupleLine(result.type, result.gene) : null;
    const waiting = {
      en: `We are waiting for ${partner.short}'s result. Your couple answer appears as soon as it arrives.`,
      ar: `ننتظر نتيجة ${partner.short}. ستظهر نتيجتكما معاً فور وصولها.`,
      ur: `ہم ${partner.short} کے نتیجے کا انتظار کر رہے ہیں۔ آپ دونوں کا مشترکہ جواب اس کے آتے ہی ظاہر ہو گا۔`,
    };
    const xlMale = {
      en: headline('en', 'xl_male', me.carrier).join('.\n\n'),
      ar: headline('ar', 'xl_male', me.carrier).join('.\n\n'),
      ur: headline('ur', 'xl_male', me.carrier).join('۔\n\n'),
    };
    return [
      { id: 'result', label: 'What is my result?', words: ['my result', 'result', 'mean', 'explain', 'نتيجة', 'نتیجہ'],
        answer: () => ({ en: `${g.title}\n\n${g.line}`, ar: together ? together.ar : own('ar'), ur: together ? together.ur : own('ur'), link: ['#/app/result', 'Open my result'] }) },
      { id: 'carrier', label: 'What does carrier mean?', words: ['carrier', 'carry', 'حامل', 'کیریئر'], answer: () => A.carrier },
      { id: 'sick', label: 'Am I sick?', words: ['sick', 'ill', 'disease', 'healthy', 'مريض', 'بیمار'],
        answer: () => (status === 'xl_male' ? { ...xlMale, link: ['#/app/counsellor', 'Talk to a counsellor'] } : A.notSick) },
      { id: 'marry', label: 'Can we still marry?', words: ['marry', 'married', 'marri', 'wedding', 'nikah', 'زواج', 'شادی'], answer: () => A.marry },
      { id: 'children', label: 'What about our children?', words: ['child', 'children', 'baby', 'pregnan', 'kids', 'أطفال', 'طفل', 'بچ'],
        answer: () => (!linked ? { ...A.childrenUnlinked, link: ['#/app/connections', 'Link my partner'] }
          : !theirs ? waiting : { ...together, link: ['#/app/bonds', 'See our options'] }) },
      { id: 'options', label: 'What are our options?', words: ['option', 'ivf', 'pgt', 'prenatal', 'plan', 'خيار', 'آپشن'],
        answer: () => ({ ...A.options, link: ['#/app/bonds', 'Compare options'] }) },
      { id: 'partner', label: 'How do I link my partner?', words: ['partner', 'link', 'connect', 'dana id', 'شريك', 'پارٹنر'],
        answer: () => (linked
          ? { en: `You are already linked with ${partner.short}.`, ar: `أنت مرتبط بالفعل مع ${partner.short}.`, ur: `آپ پہلے ہی ${partner.short} کے ساتھ جڑے ہوئے ہیں۔` }
          : { ...A.partnerHow, link: ['#/app/connections', 'Open Connections'] }) },
      { id: 'privacy', label: 'Who can see my data?', words: ['privacy', 'private', 'see my', 'share', 'consent', 'withdraw', 'خصوصية', 'پرائیویسی'],
        answer: () => ({ ...A.privacy, link: ['#/app/privacy', 'Open Privacy'] }) },
      { id: 'report', label: 'How do I get my report?', words: ['report', 'pdf', 'download', 'print', 'تقرير', 'رپورٹ'],
        answer: () => ({ ...A.report, link: ['#/app/my-report', 'Open my report'] }) },
      { id: 'malaffi', label: 'What did Malaffi send?', words: ['malaffi', 'blood', 'test', 'lab', 'ملفي', 'ملافی'],
        answer: () => ({ ...A.malaffi, link: ['#/app/malaffi', 'Open Malaffi record'] }) },
      { id: 'counsellor', label: 'Talk to a person', words: ['counsel', 'doctor', 'human', 'talk', 'appointment', 'book', 'مستشار', 'ڈاکٹر'],
        answer: () => ({ ...A.counsellor, link: ['#/app/counsellor', 'Book a counsellor'] }) },
      { id: 'fault', label: 'Is it my fault?', words: ['fault', 'blame', 'why me', 'ذنب', 'قصور'], answer: () => A.fault },
    ];
  }, [g, status, me.carrier, linked, theirs, couple, result.type, result.gene, partner.short]);
}

function match(topics, q) {
  const t = q.toLowerCase();
  let best = null; let score = 0;
  for (const tp of topics) {
    // English words match from the start of a word ("ill" never matches "still"); Arabic/Urdu match anywhere
    const hit = (w) => (/^[a-z ]+$/.test(w) ? new RegExp(`(^|[^a-z])${w}`).test(t) : t.includes(w));
    const s = tp.words.reduce((n, w) => n + (hit(w) ? w.length : 0), 0);
    if (s > score) { score = s; best = tp; }
  }
  return best;
}

/* ---- voice: the browser's own speech (free, no key). Nothing plays until the person presses Listen. ---- */
const SR = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;
const LISTEN_LANGS = [['en-US', 'English'], ['ar-AE', 'العربية'], ['ur-PK', 'اردو']];

/* the most natural voice this device has for the language (neural/online voices sound far better) */
function pickVoice(lang, sex) {
  const vs = window.speechSynthesis.getVoices().filter((v) => v.lang?.toLowerCase().startsWith(lang));
  if (!vs.length) return null;
  const female = /female|zira|aria|jenny|samantha|sonia|libby|emma|ava|hoda|salma|zariyah|fatima|amina|uzma|gul/i;
  const male = /\bmale\b|david|guy|ryan|daniel|george|andrew|naayf|hamed|shakir|hamdan|asad|salman/i;
  const natural = (v) => (/natural|neural|online|google/i.test(v.name) ? 2 : 0) + (/-(ae|sa|pk|gb|us)/i.test(v.lang) ? 1 : 0);
  const fits = (v) => ((sex === 'F' ? female.test(v.name) : male.test(v.name) && !/female/i.test(v.name)) ? 3 : 0);
  return [...vs].sort((a, b) => (fits(b) + natural(b)) - (fits(a) + natural(a)))[0];
}

/* Chrome loads its voice list late: wait for it (at most 1.5 s) instead of speaking with none */
function voicesReady() {
  const synth = window.speechSynthesis;
  if (synth.getVoices().length) return Promise.resolve();
  return new Promise((done) => {
    const t = setTimeout(done, 1500);
    synth.addEventListener('voiceschanged', () => { clearTimeout(t); done(); }, { once: true });
  });
}

/* reads English text aloud, sentence by sentence; onEnd runs when it finishes or is stopped */
async function speakEnglish(text, sex, onEnd) {
  if (!canSpeak) return false;
  const synth = window.speechSynthesis;
  synth.cancel();
  await voicesReady();
  await new Promise((r) => setTimeout(r, 60)); // Chrome stays silent if speak() follows cancel() at once
  const voice = pickVoice('en', sex); // null = the device default voice, still English
  const parts = text.replace(/\n+/g, ' ').match(/[^.!?]+[.!?]*/g) || [text];
  parts.forEach((part, i) => {
    const u = new SpeechSynthesisUtterance(part.trim());
    if (voice) u.voice = voice;
    u.lang = voice?.lang || 'en-GB';
    u.rate = 0.95;
    if (i === parts.length - 1) { u.onend = onEnd; u.onerror = onEnd; }
    synth.speak(u);
  });
  if (synth.paused) synth.resume(); // a paused engine never starts the queue
  return true;
}

export default function Assistant() {
  const session = useStore((s) => s.session);
  const topics = useTopics();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([]);   // dana messages: { from, en, ar, ur, link, shown, picking, playing, note }
  const [q, setQ] = useState('');
  const [listening, setListening] = useState(false);
  const appLang = useLang(); // answers open in the app's language; the tabs still switch per answer
  const [inLang, setInLang] = useState(() => ({ ar: 'ar-AE', ur: 'ur-PK' }[getLang()] || 'en-US'));
  useEffect(() => { setInLang({ ar: 'ar-AE', ur: 'ur-PK' }[appLang] || 'en-US'); }, [appLang]);
  const [voiceErr, setVoiceErr] = useState('');
  const end = useRef(null);
  const rec = useRef(null);
  const sex = PEOPLE[session?.id]?.sex === 'F' ? 'F' : 'M';
  const first = (session?.name || '').split(' ')[0];

  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, open]);
  useEffect(() => { if (canSpeak) window.speechSynthesis.getVoices(); }, []); // loads the voice list early
  useEffect(() => { if (!open && canSpeak) window.speechSynthesis.cancel(); }, [open]);

  const upd = (i, patch) => setMsgs((m) => m.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  const ask = (text, topic) => {
    const tp = topic || match(topics, text);
    const a = tp ? tp.answer() : { ...A.unknown, link: ['#/app/counsellor', 'Talk to a counsellor'] };
    if (canSpeak) window.speechSynthesis.cancel();
    setMsgs((m) => [...m, { from: 'me', en: text }, { from: 'dana', ...a, shown: getLang() }]);
    setQ('');
    logAudit(`Asked the DaNA guide (${tp ? tp.id : 'unmatched'})`).catch(() => {}); // the topic only, never the words typed
  };

  // sound: English only for now; the text can be read in any of the three languages
  const play = async (i) => {
    setMsgs((all) => all.map((x, j) => ({ ...x, playing: j === i })));
    const ok = await speakEnglish(msgs[i].en, sex, () => upd(i, { playing: false }));
    if (!ok) upd(i, { playing: false, note: 'Sound is not available in this browser.' });
  };
  const stop = (i) => { if (canSpeak) window.speechSynthesis.cancel(); upd(i, { playing: false }); };

  const listen = () => {
    if (!SR) { setVoiceErr('Voice input works in Chrome, Edge and Safari.'); return; }
    if (listening) { rec.current?.stop(); return; }
    setVoiceErr('');
    if (canSpeak) window.speechSynthesis.cancel();
    const r = new SR();
    r.lang = inLang; r.interimResults = true; r.maxAlternatives = 1;
    let finalText = '';
    r.onresult = (e) => {
      const t = Array.from(e.results).map((x) => x[0].transcript).join(' ');
      setQ(t);
      if (e.results[e.results.length - 1].isFinal) finalText = t;
    };
    r.onerror = (e) => setVoiceErr(e.error === 'not-allowed' ? 'Allow the microphone in your browser to ask by voice.'
      : e.error === 'no-speech' ? 'I did not hear anything. Tap the mic and try again.' : 'Voice input stopped. Try again or type your question.');
    r.onend = () => { setListening(false); if (finalText.trim()) ask(finalText.trim()); };
    rec.current = r;
    setListening(true);
    r.start();
  };

  return (
    <>
      {open && (
        <section className="as-panel" role="dialog" aria-label="DaNA guide">
          <header className="as-head">
            <CounsellorFace sex={sex} size={44} />
            <div><b>DaNA guide</b><small>Answers from your own result · not medical advice</small></div>
            <button className="as-x" onClick={() => setOpen(false)} aria-label="Close">×</button>
          </header>
          <div className="as-body">
            <div className="as-msg dana" dir={appLang === 'en' ? 'ltr' : 'rtl'}>{{
              en: `Hello ${first}. I can explain your result in simple words. What would you like to know?`,
              ar: `مرحبًا ${first}. يمكنني شرح نتيجتك بكلمات بسيطة. ماذا تود أن تعرف؟`,
              ur: `السلام علیکم ${first}۔ میں آپ کا نتیجہ آسان الفاظ میں سمجھا سکتا ہوں۔ آپ کیا جاننا چاہیں گے؟`,
            }[appLang]}</div>
            {msgs.map((m, i) => {
              const text = m[m.shown || 'en'] || m.en;
              const dir = LANGS[m.shown || 'en']?.dir || 'ltr';
              return (
                <div key={i} className={`as-msg ${m.from}`}>
                  <div dir={m.from === 'dana' ? dir : 'auto'} lang={m.shown || undefined}>
                    {text.split('\n').map((l, j) => (l ? <p key={j}>{l}</p> : null))}
                  </div>
                  {m.link && <a className="as-link" href={m.link[0]} onClick={() => setOpen(false)}>{m.link[1]} →</a>}
                  {m.from === 'dana' && (
                    <div className="as-voice">
                      <div className="as-langs" role="group" aria-label="Show this answer in">
                        {Object.entries(LANGS).map(([k, v]) => (
                          <button key={k} type="button" className={(m.shown || 'en') === k ? 'on' : ''} aria-pressed={(m.shown || 'en') === k} onClick={() => upd(i, { shown: k })}>{v.name}</button>
                        ))}
                      </div>
                      {canSpeak && (m.playing
                        ? <button type="button" className="as-play on" onClick={() => stop(i)}>■ Stop</button>
                        : <button type="button" className="as-play" onClick={() => play(i)}>🔊 Listen (English)</button>)}
                      {m.note && <small className="as-note">{m.note}</small>}
                    </div>
                  )}
                </div>
              );
            })}
            <div className="as-chips">
              {topics.filter((t) => !msgs.some((m) => m.en === t.label)).slice(0, 4).map((t) => (
                <button key={t.id} onClick={() => ask(t.label, t)}>{t.label}</button>
              ))}
            </div>
            <div ref={end} />
          </div>
          {voiceErr && <p className="as-verr" role="status">{voiceErr}</p>}
          <form className="as-input" onSubmit={(e) => { e.preventDefault(); if (q.trim()) ask(q.trim()); }}>
            {SR && (
              <select className="as-lang" value={inLang} onChange={(e) => setInLang(e.target.value)} aria-label="Language you speak">
                {LISTEN_LANGS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            )}
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={listening ? 'Listening…' : 'Ask or tap the mic…'} aria-label="Your question" maxLength={300} dir="auto" />
            {SR && (
              <button type="button" className={`as-mic${listening ? ' on' : ''}`} onClick={listen} aria-pressed={listening} aria-label={listening ? 'Stop listening' : 'Ask by voice'}>
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-2.08A7 7 0 0 0 19 12h-2Z" /></svg>
              </button>
            )}
            <button className="btn" disabled={!q.trim()}>Ask</button>
          </form>
          <a className="as-human" href="#/app/counsellor" onClick={() => setOpen(false)}>Prefer a person? Talk to a counsellor</a>
        </section>
      )}
      <button className={`as-fab${open ? ' on' : ''}`} onClick={() => setOpen(!open)} aria-label={open ? 'Close DaNA guide' : 'Open DaNA guide'}>
        <CounsellorFace sex={sex} size={58} />
        {!open && <span className="as-dot" aria-hidden="true">?</span>}
      </button>
    </>
  );
}
