-- إصلاح دالة تطبيع الهاتف normalize_kuwait_phone.
-- الخطأ: كان الـ regex معطوباً (لا يُزيل الرموز) فتُنتج قيماً غير صالحة
-- مثل ++965... أو أرقام محلية بدون + — تكسر قيد profiles_phone_number_format_ck.
-- الإصلاح: إزالة كل ما ليس رقماً وإنتاج E.164 صحيح (+965 للأرقام الكويتية المحلية).
-- تم التحقق: idempotent على كل الأرقام المخزّنة (0 تتغيّر، 0 غير صالحة).
CREATE OR REPLACE FUNCTION public.normalize_kuwait_phone(raw text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $function$
declare
  clean text;
  digits text;
begin
  if raw is null then
    return null;
  end if;

  clean := btrim(raw);
  if clean = '' then
    return null;
  end if;

  digits := regexp_replace(clean, '[^0-9]', '', 'g');

  if clean like '00%' then
    digits := regexp_replace(digits, '^00', '');
  end if;

  if digits = '' then
    return null;
  end if;

  if length(digits) = 8 then
    return '+965' || digits;
  end if;

  if length(digits) between 8 and 15 then
    return '+' || digits;
  end if;

  return null;
end;
$function$;
