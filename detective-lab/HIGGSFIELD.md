# נכסי Higgsfield: פרומפטים מוכנים

כל הנכסים אופציונליים. האפליקציה עובדת במלואה בלעדיהם, עם חלופה מקומית לכל אחד מהם. הטקסט בעברית מוצג תמיד בממשק ולא בתוך התמונה. ההמחשות המדעיות (מאזניים, שנתות, מפלסים, יחידות ותרשים האחוזים) נבנות בקוד, ואין להשתמש בתמונה גנרטיבית כמקור לנתונים או לתשובה.

סגנון משותף לכל הנכסים (מופיע בכל פרומפט):

> Stylized film noir, soft painterly cinematic illustration, charcoal and midnight blue palette with warm amber lamplight and ivory paper accents, gentle rain, calm and curious mood, suitable for 12 to 13 year old students, no people in focus, no horror, no violence, no weapons, no smoking, no alcohol, no text, no letters, no numbers, no logos.

## 1. משרד הבלש בלילה

- **קובץ:** `public/assets/higgsfield/office.jpg`, שדה `office` ב-`assets.json`
- **מיקום:** מסך הבית, לצד הכותרת
- **תפקיד בלמידה:** יוצר מסגרת רגשית ומזמין לפתוח תיק. אינו נושא מידע מדעי.
- **יחס תמונה:** 16:10 (אפשר 16:9)

```
Stylized film noir, soft painterly cinematic illustration. A small detective's study at night seen from a slightly low three-quarter angle. A wooden desk in the foreground with five closed manila case folders neatly stacked and fanned, a brass desk lamp casting a warm amber cone of light onto the folders, a cork evidence board on the side wall with blank paper notes pinned by red pins and no writing on them. Behind the desk a tall window shows a rainy city at night with soft blue streetlights and a few lit windows. Charcoal and midnight blue palette with warm amber lamplight and ivory paper accents, gentle rain streaks on the glass, calm and curious mood, suitable for 12 to 13 year old students, no people, no horror, no violence, no weapons, no smoking, no alcohol, no text, no letters, no numbers, no logos. Leave the right third of the frame darker and uncluttered for interface overlay. Aspect ratio 16:10.
```

## 2. קליפ פתיחה: רחוב גשום וחלון מעבדה מואר

- **קובץ:** `public/assets/higgsfield/intro.mp4` (ותמונת פתיחה `intro-poster.jpg`), שדה `introClip`
- **מיקום:** כפתור "צפייה בפתיח הקצר" במסך הבית. אינו מופעל אוטומטית.
- **תפקיד בלמידה:** פתיח אווירה קצר. ניתן לעצירה ולדילוג, ואין בו מידע הנדרש להבנת שאלה.
- **יחס תמונה:** 16:9, משך 4 עד 6 שניות, ללא קול

```
Stylized film noir, soft painterly cinematic animation. A quiet city street at night in gentle rain, wet cobblestones reflecting soft blue streetlights. The camera slowly dollies forward and tilts up toward a school building where one second-floor window is warmly lit in amber, showing the silhouette of laboratory shelves with glass jars and a balance scale, no people visible. Light drizzle, slow and calm motion, no flashes, no lightning, no sudden movement. Charcoal and midnight blue palette with warm amber window light, calm and curious mood, suitable for 12 to 13 year old students, no horror, no violence, no smoking, no alcohol, no text, no letters, no numbers, no logos. Duration 5 seconds, aspect ratio 16:9, silent.
```

## 3. ראיות: חפצים יומיומיים על שולחן

- **קובץ:** `public/assets/higgsfield/evidence.jpg`, שדה `evidence`
- **מיקום:** מסך הפתיח של כל תיק, לצד טקסט העלילה
- **תפקיד בלמידה:** מחבר את רעיון "גוף וחומר" לחפצים מוכרים. התמונה אווירתית בלבד, ושאלות אינן נשענות עליה.
- **יחס תמונה:** 16:10

```
Stylized film noir, soft painterly cinematic still life. Everyday objects laid out as evidence on a dark wooden table under a single warm desk lamp: a clear glass jar with a lid, a metal key, a wooden pencil, a white ceramic cup, a rubber ball and a folded sheet of paper, each with a small blank ivory paper tag tied with string, tags completely blank. Top-down three-quarter view, generous spacing between objects, soft shadows, rain-streaked window reflection faintly visible on the table surface. Charcoal and midnight blue palette with warm amber light and ivory accents, calm and curious mood, suitable for 12 to 13 year old students, no people, no horror, no violence, no weapons, no smoking, no alcohol, no text, no letters, no numbers, no logos. Aspect ratio 16:10.
```

## 4. קליפ סיום: סגירת תיק החקירה

- **קובץ:** `public/assets/higgsfield/outro.mp4` (ותמונת פתיחה `outro-poster.jpg`), שדה `outroClip`
- **מיקום:** מסך "התעלומה נפתרה", בכפתור "קליפ סגירת התיק"
- **תפקיד בלמידה:** סגירה רגשית של הסיפור. מיד אחריו מוצעים הבוחן המסכם ודוח ההבנה, כי פתרון התעלומה אינו מדד לשליטה בחומר.
- **יחס תמונה:** 16:9, משך 4 עד 6 שניות, ללא קול

```
Stylized film noir, soft painterly cinematic animation. Close view of a manila case folder on a wooden desk under a warm brass desk lamp. No hands appear; in a gentle motion the folder cover slowly closes on its own, a soft puff of paper settles, and a lab notebook with a plain dark cover rests safely beside it. Outside the window the rain softens and the first light of dawn appears in pale blue. Slow, calm motion, no flashes, no sudden movement. Charcoal and midnight blue palette with warm amber lamplight and ivory paper accents, satisfied and calm mood, suitable for 12 to 13 year old students, no people, no horror, no violence, no smoking, no alcohol, no text, no letters, no numbers, no logos, no stamps with writing. Duration 5 seconds, aspect ratio 16:9, silent.
```

## אחרי ההפקה

1. לבדוק שאין בתמונה טקסט, מספרים או פרטים מפחידים, ולהפיק מחדש אם יש.
2. להקטין תמונות לרוחב של כ-1600 פיקסלים בפורמט JPG או WEBP, וקליפים לכ-720p.
3. לשמור בתיקייה `public/assets/higgsfield/` ולעדכן את `assets.json`.
