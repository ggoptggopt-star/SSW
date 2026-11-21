-- ============================================================================
-- SUPABASE POSTGRESQL SCHEMA: Minimal & Elevated Student Submission Portal
-- วิธีใช้งาน: คัดลอกโค้ด SQL ทั้งหมดนี้ไปรันในเมนู SQL Editor ของโปรเจกต์ Supabase
-- ============================================================================

-- 1. ตารางตั้งค่ารายวิชา (Course Settings - สำหรับเว็บประจำวิชาเดียว)
CREATE TABLE IF NOT EXISTS public.course_settings (
  id TEXT PRIMARY KEY DEFAULT 'default_course',
  course_code TEXT NOT NULL DEFAULT 'DES-101',
  course_title TEXT NOT NULL DEFAULT 'INTRO TO VISUAL DESIGN',
  course_subtitle TEXT NOT NULL DEFAULT '1 วิชา',
  semester TEXT NOT NULL DEFAULT 'ภาคการศึกษาที่ 1/2569',
  instructor_name TEXT NOT NULL DEFAULT 'อ.ดร. กิตติพงศ์ (Instructor)',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. ตารางผู้ใช้งาน (Users: นักศึกษา และ อาจารย์)
CREATE TABLE IF NOT EXISTS public.portal_users (
  student_id TEXT PRIMARY KEY, -- รหัสนักศึกษา เช่น 67010101 หรือ รหัสอาจารย์ T001
  password_hash TEXT NOT NULL, -- รหัสผ่านสำหรับเข้าสู่ระบบ
  full_name TEXT NOT NULL,
  nickname TEXT,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'teacher')),
  section TEXT DEFAULT 'Sec 01',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. ตารางใบงาน (Assignments)
CREATE TABLE IF NOT EXISTS public.assignments (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,               -- เช่น Assignment 03: Visual Identity
  description TEXT,                  -- คำอธิบายใบงาน/โจทย์
  due_date TIMESTAMPTZ NOT NULL,     -- วันและเวลาปิดรับงาน (Deadline)
  max_score NUMERIC(6,2) NOT NULL DEFAULT 100,
  work_type TEXT NOT NULL DEFAULT 'individual' CHECK (work_type IN ('individual', 'group')),
  max_group_members INT NOT NULL DEFAULT 1,
  allow_late BOOLEAN NOT NULL DEFAULT TRUE, -- อนุญาตให้ส่งสายได้
  theme_color TEXT NOT NULL DEFAULT 'navy' CHECK (theme_color IN ('navy', 'olive', 'slate')),
  badge_label TEXT NOT NULL DEFAULT 'กล่องส่ง',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. ตารางการส่งงาน (Submissions)
CREATE TABLE IF NOT EXISTS public.submissions (
  id TEXT PRIMARY KEY,
  assignment_id TEXT NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  submitted_by TEXT NOT NULL REFERENCES public.portal_users(student_id) ON DELETE CASCADE,
  group_name TEXT,
  member_ids JSONB NOT NULL DEFAULT '[]'::jsonb,       -- รายชื่อรหัสนักศึกษาในกลุ่ม เช่น ["67010101", "67010102"]
  files JSONB NOT NULL DEFAULT '[]'::jsonb,            -- รายการไฟล์ [{name, size, type, url}]
  external_links JSONB NOT NULL DEFAULT '[]'::jsonb,   -- ลิงก์ภายนอก [{label, url}]
  student_note TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_late BOOLEAN NOT NULL DEFAULT FALSE,              -- คำนวณอัตโนมัติว่าส่งหลัง due_date หรือไม่
  resubmit_count INT NOT NULL DEFAULT 0,               -- จำนวนครั้งที่ส่งแก้
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'graded', 'needs_revision')),
  score NUMERIC(6,2),
  teacher_feedback TEXT,
  graded_at TIMESTAMPTZ
);

-- 5. ตารางการแจ้งเตือน (Notifications)
CREATE TABLE IF NOT EXISTS public.notifications (
  id TEXT PRIMARY KEY,
  target_user_id TEXT NOT NULL, -- 'ALL_STUDENTS', 'TEACHER', หรือรหัสนักศึกษาเฉพาะคน
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('new_assignment', 'deadline', 'graded', 'revision', 'info')),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- เปิดใช้งาน Row Level Security (สำหรับโหมด Demo/เริ่มต้น อนุญาตให้เข้าถึงผ่าน anon key ได้สะดวก)
ALTER TABLE public.course_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access course_settings" ON public.course_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access portal_users" ON public.portal_users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access assignments" ON public.assignments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access submissions" ON public.submissions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access notifications" ON public.notifications FOR ALL USING (true) WITH CHECK (true);

-- สร้าง Storage Bucket สำหรับเก็บไฟล์งานนักศึกษา (ชื่อ bucket: submissions)
INSERT INTO storage.buckets (id, name, public)
VALUES ('submissions', 'submissions', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Read Submissions Bucket" ON storage.objects
  FOR SELECT USING (bucket_id = 'submissions');

CREATE POLICY "Public Upload Submissions Bucket" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'submissions');
