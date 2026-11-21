# Minimal & Elevated Design System (`DESIGN_SYSTEM.md`)

เอกสารฉบับนี้เป็น **หลักการออกแบบและพัฒนาเว็บไซต์ (Design System & Frontend Guidelines)** ของโปรเจกต์ **Student Submission Portal** โดยยึดแนวคิด **"Minimal & Elevated"** ที่เน้นความเรียบง่าย อบอุ่น สบายตา มีพื้นที่ว่าง (Plenty of Whitespace) และยกระดับประสบการณ์ใช้งานให้ดูพรีเมียมทั้งบน Desktop และ Mobile

---

## 1. โทนสีหลัก (Color Palette)

ใช้โทนสีเอิร์ธโทนอบอุ่น (Warm Earth & Cream Tones) ตัดกับสีเข้มที่มีความลุ่มลึก (Deep Navy & Olive Green) เพื่อสร้าง Contrast ที่อ่านง่ายแต่ไม่แข็งกระด้าง

| ชื่อสี (Token) | รหัสสี (Hex) | ตัวอย่างการใช้งาน |
| :--- | :--- | :--- |
| **`--bg-canvas`** | `#FAF8F5` | พื้นหลังหลักของหน้าเว็บ (Off-White / Warm Alabaster) |
| **`--bg-cream`** | `#EFECE3` | พื้นหลัง Sidebar, การ์ดงาน (Assignment Card), แถบเมนู |
| **`--bg-sand`** | `#D5C7B2` | สีเน้นพื้นหลังรอง, ขอบการ์ด, Badge หรือสถานะรอง |
| **`--bg-stone`** | `#DCE0E2` | สีเทาอมฟ้าอ่อนสำหรับสถานะ Inactive / โซนรออัปโหลด |
| **`--accent-navy`** | `#0F2942` | สีหลัก (Primary Action), ปุ่ม Submit หลัก, หัวข้อสำคัญ |
| **`--accent-olive`** | `#4A5638` | สีรอง (Secondary Action), ปุ่มทางเลือก, สถานะส่งแล้ว/วิชาที่ 2 |
| **`--accent-slate`** | `#657477` | สีปุ่มสถานะรอง หรือวิชาที่ 3 |
| **`--text-primary`** | `#18222C` | สีตัวอักษรหลัก (เข้มเกือบดำอมกรมท่า) |
| **`--text-secondary`** | `#5A626A` | สีตัวอักษรคำอธิบาย วันที่กำหนดส่ง และสถานะ |

---

## 2. การจัดวางตัวอักษร (Typography)

ผสมผสานระหว่างความคลาสสิกน่าเชื่อถือของ **Serif** (สำหรับหัวข้อระดับ Concept / Editorial) และความคมชัดทันสมัยของ **Sans-Serif** (สำหรับ UI และภาษาไทย)

- **Display / Editorial Serif**: `'Playfair Display'`, `'Cormorant Garamond'`, serif
  - ใช้กับหัวข้อแบนเนอร์ขนาดใหญ่ หรือตัวเลขลำดับที่ต้องการความโดดเด่น
- **UI & Thai Sans-Serif**: `'Plus Jakarta Sans'`, `'Noto Sans Thai'`, `'IBM Plex Sans Thai'`, sans-serif
  - ใช้กับชื่อวิชา (`INTRO TO VISUAL DESIGN`), การ์ดงาน, ปุ่มกด และเนื้อหาภาษาไทยทั้งหมด
- **Hierarchy & Scale**:
  - **Course Title (H1)**: `1.75rem - 2.25rem` (`font-weight: 700`, ตัวพิมพ์ใหญ่ `uppercase` สำหรับชื่อวิชาภาษาอังกฤษ)
  - **Section Heading (H2)**: `1.125rem - 1.25rem` (`font-weight: 600`)
  - **Card Title (H3)**: `1rem - 1.1rem` (`font-weight: 600`, Line-height `1.4`)
  - **Body / Meta Text**: `0.875rem` (`14px`) สำหรับกำหนดส่งและคะแนน

---

## 3. โครงสร้างและการจัดวาง (Layout & Responsive Architecture)

1. **Plenty of Whitespace**:
   - เว้นระยะห่างรอบนอก (Container Padding) อย่างน้อย `24px - 40px` บน Desktop และ `20px` บน Mobile
   - ไม่ยัดเนื้อหาแน่นเกินไป ให้สายตาโฟกัสที่ "งานที่ต้องส่ง (Next Assignment Due)" เป็นอันดับแรก
2. **Desktop View (`>= 960px`)**:
   - **Left Sidebar (`240px`)**: พื้นหลังสีครีม (`#EFECE3`) แสดงเมนูหลัก (`Dashboard`, `Assignments`, `Grades`, `Profile`) และปุ่ม `Log Out` ด้านล่างสุด
   - **Main Workspace**: พื้นหลังสีขาวนวล (`#FAF8F5`) แบ่งเป็นส่วน Header ทักทายผู้ใช้ (`Welcome back, Sarah`), ชื่อวิชา, แถวการ์ดงานแบบ 3 คอลัมน์ และโซนสถานะการส่งงาน
3. **Mobile View (`< 960px`)**:
   - ซ่อน Left Sidebar และเปลี่ยนเป็น **Top App Bar** (ปุ่มเมนูแฮมเบอร์เกอร์ + กระดิ่งแจ้งเตือน + รูปโปรไฟล์)
   - เปลี่ยนเมนูหลักเป็น **Fixed Bottom Navigation Bar** 4 แท็บ (`Dashboard`, `Assignments`, `Grades`, `Profile`) โดยแท็บที่เลือกจะมีพื้นหลังสีครีม (`#EFECE3`)
   - การ์ดงานเรียงซ้อนแนวตั้ง (Single Column) หรือปัดซ้าย-ขวาอย่างเป็นระเบียบ พร้อมกล่อง `Pending Submission` ด้านล่างการ์ด

---

## 4. ส่วนประกอบหลัก (Core UI Components)

### 4.1 การ์ดงาน (Assignment Card)
- พื้นหลังสี `#EFECE3` มุมโค้งมน `16px - 20px` (`border-radius: 18px`)
- เงาบางเบา (`0 10px 25px -5px rgba(24, 34, 44, 0.06)`) และมีเส้นขอบบางๆ สีครีมเข้ม
- ด้านบนมีชื่อชิ้นงาน (เช่น `Assignment 03: Visual Identity`) คู่กับ **Status Pill / Badge** มุมขวาบน (`กล่องส่ง`)
- แสดงรายละเอียด **กำหนดส่ง (Due Date)** และ **คะแนนเต็ม (Points)** ชัดเจน
- ด้านล่างสุดเป็นปุ่มทรงแคปซูล (`border-radius: 999px`) เต็มความกว้างของการ์ด (`Submit Assignment`)

### 4.2 หน้าต่างและโซนอัปโหลดงาน (Upload Modal & Dropzone)
- ใช้กรอบเส้นประ (`border: 1.5px dashed #C5B9A5`) มุมโค้งมน `16px`
- มีไอคอนอัปโหลดตรงกลาง พร้อมข้อความ `Drag & drop your files here` และปุ่มกดเลือกไฟล์
- รองรับทั้งการคลิกปุ่ม `Submit Assignment` เพื่อเปิด **Upload Modal** (แบบลอยตัวพร้อมปุ่มปิด `×`) และการลากไฟล์วางในโซน **สถานะการส่งงาน (Pending Submission)**

---

## 5. แนวทางการนำไปใช้ต่อ (Reusable Principles)
- ทุกครั้งที่สร้างหน้าใหม่ในระบบ ให้ดึงค่าตัวแปร CSS (`:root`) จากไฟล์ `styles.css` เสมอ
- รักษาสัดส่วนพื้นที่ว่างอย่างน้อย 30% ของหน้าจอ เพื่อให้ได้อารมณ์ **Minimal & Elevated**
- ปุ่มหลักต้องเป็นทรง Pill (`border-radius: 999px`) และการ์ดต้องมีความโค้งมนระดับ `16px+` เสมอ
