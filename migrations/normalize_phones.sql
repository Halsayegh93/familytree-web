-- تطبيع أرقام الهاتف على السيرفر
-- نفس منطق format-phone.ts:
--   - يبدأ بـ +              → نتركه (ندوّر كود دولة معروف)
--   - يبدأ بـ 00             → نحوله +
--   - 8 خانات                → +965 (كويت)
--   - 9 خانات يبدأ بـ 5      → +966 (سعودي)
--   - يبدأ بكود دولة معروف  → نضيف +

-- (1) دالة التطبيع
create or replace function public.normalize_phone(raw text)
returns text
language plpgsql
immutable
as $$
declare
  cleaned text;
  digits text;
  codes text[] := array['965','966','971','974','973','968','20','44','1'];
  c text;
begin
  if raw is null or trim(raw) = '' then return null; end if;

  -- إزالة المسافات والأحرف غير الرقمية ما عدا +
  cleaned := regexp_replace(trim(raw), '[\s\-()]', '', 'g');

  -- 00 → +
  if cleaned like '00%' then
    cleaned := '+' || substring(cleaned from 3);
  end if;

  -- لو يبدأ بـ + → نحلل كود الدولة
  if cleaned like '+%' then
    digits := substring(cleaned from 2);
    foreach c in array codes loop
      if digits like c || '%' then
        return '+' || c || substring(digits from length(c) + 1);
      end if;
    end loop;
    return cleaned; -- ما عرفنا الكود، نحفظ كما هو
  end if;

  digits := cleaned;

  -- 8 خانات → كويت
  if length(digits) = 8 and digits ~ '^[0-9]+$' then
    return '+965' || digits;
  end if;

  -- 9 خانات يبدأ بـ 5 → سعودي
  if length(digits) = 9 and digits ~ '^5[0-9]+$' then
    return '+966' || digits;
  end if;

  -- يبدأ بكود دولة معروف بدون +
  foreach c in array codes loop
    if digits like c || '%' then
      -- الكويت 965 + 8 = 11
      -- السعودية 966 + 9 = 12
      -- نقبل لو الطول الكلي معقول (≥10)
      if length(digits) >= length(c) + 7 then
        return '+' || c || substring(digits from length(c) + 1);
      end if;
    end if;
  end loop;

  -- لو ما طابقنا أي شيء، نحفظ كما هو (ما نخرّب البيانات)
  return digits;
end;
$$;

-- (2) تطبيع كل الأرقام الموجودة في profiles
update public.profiles
set phone_number = public.normalize_phone(phone_number)
where phone_number is not null
  and phone_number <> public.normalize_phone(phone_number);

-- (3) trigger يطبّع تلقائياً عند insert/update
create or replace function public.normalize_phone_trigger()
returns trigger
language plpgsql
as $$
begin
  if new.phone_number is not null then
    new.phone_number := public.normalize_phone(new.phone_number);
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_normalize_phone on public.profiles;
create trigger profiles_normalize_phone
  before insert or update of phone_number on public.profiles
  for each row execute function public.normalize_phone_trigger();

-- (4) تأكد من النتائج — اختبار سريع
-- شغّل لتشوف العيّنة:
-- select full_name, phone_number from profiles
-- where phone_number is not null
-- order by updated_at desc limit 20;
