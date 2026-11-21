/**
 * ============================================================================
 * MINIMAL & ELEVATED — STUDENT SUBMISSION PORTAL (app.js)
 * รองรับทั้ง 2 ฝั่ง (นักศึกษา + อาจารย์ผู้สอน) พร้อมระบบ Hybrid Storage:
 *   1. LocalStorage (พร้อมใช้งานทันที 100% มีข้อมูลตัวอย่างครบ)
 *   2. Supabase (PostgreSQL + Storage Bucket) เชื่อมต่อออนไลน์ได้ทันทีเมื่อใส่ URL/Key
 * ============================================================================
 */

const STORAGE_KEYS = {
  STATE: 'minimal_elevated_portal_v1',
  SUPABASE_CFG: 'minimal_elevated_supabase_cfg_v1'
};

// ค่าเริ่มต้นถาวรของฐานข้อมูล Supabase ของโปรเจกต์คุณ (ฝังไว้ในโค้ดเลย ไม่ต้องกรอกใหม่)
const DEFAULT_SUPABASE_CONFIG = {
  url: 'https://grpjpaaayypojltuzptb.supabase.co',
  anonKey: 'sb_publishable_rlX9RzfManwjfqYdYMS0Lw_MH_Av8HB'
};

const SUPABASE_SCHEMA_SQL_TEXT = `-- คัดลอกโค้ดทั้งหมดนี้ไปวางในเมนู SQL Editor ของ Supabase แล้วกด Run
CREATE TABLE IF NOT EXISTS public.course_settings (
  id TEXT PRIMARY KEY DEFAULT 'default_course',
  course_code TEXT NOT NULL DEFAULT 'DES-101',
  course_title TEXT NOT NULL DEFAULT 'INTRO TO VISUAL DESIGN',
  course_subtitle TEXT NOT NULL DEFAULT '1 วิชา',
  semester TEXT NOT NULL DEFAULT 'ภาคการศึกษา 1/2569',
  instructor_name TEXT NOT NULL DEFAULT 'อ.ดร. กิตติพงศ์ (Instructor)',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.portal_users (
  student_id TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  nickname TEXT,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'teacher')),
  section TEXT DEFAULT 'Sec 01',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.assignments (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ NOT NULL,
  max_score NUMERIC(6,2) NOT NULL DEFAULT 100,
  work_type TEXT NOT NULL DEFAULT 'individual' CHECK (work_type IN ('individual', 'group')),
  max_group_members INT NOT NULL DEFAULT 1,
  allow_late BOOLEAN NOT NULL DEFAULT TRUE,
  theme_color TEXT NOT NULL DEFAULT 'navy' CHECK (theme_color IN ('navy', 'olive', 'slate')),
  badge_label TEXT NOT NULL DEFAULT 'กล่องส่ง',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.submissions (
  id TEXT PRIMARY KEY,
  assignment_id TEXT NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  submitted_by TEXT NOT NULL REFERENCES public.portal_users(student_id) ON DELETE CASCADE,
  group_name TEXT,
  member_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  files JSONB NOT NULL DEFAULT '[]'::jsonb,
  external_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  student_note TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_late BOOLEAN NOT NULL DEFAULT FALSE,
  resubmit_count INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'graded', 'needs_revision')),
  score NUMERIC(6,2),
  teacher_feedback TEXT,
  graded_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id TEXT PRIMARY KEY,
  target_user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('new_assignment', 'deadline', 'graded', 'revision', 'info')),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.course_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public access course_settings" ON public.course_settings;
DROP POLICY IF EXISTS "Allow public access portal_users" ON public.portal_users;
DROP POLICY IF EXISTS "Allow public access assignments" ON public.assignments;
DROP POLICY IF EXISTS "Allow public access submissions" ON public.submissions;
DROP POLICY IF EXISTS "Allow public access notifications" ON public.notifications;

CREATE POLICY "Allow public access course_settings" ON public.course_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access portal_users" ON public.portal_users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access assignments" ON public.assignments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access submissions" ON public.submissions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access notifications" ON public.notifications FOR ALL USING (true) WITH CHECK (true);

INSERT INTO storage.buckets (id, name, public)
VALUES ('submissions', 'submissions', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Read Submissions Bucket" ON storage.objects;
DROP POLICY IF EXISTS "Public Upload Submissions Bucket" ON storage.objects;

CREATE POLICY "Public Read Submissions Bucket" ON storage.objects FOR SELECT USING (bucket_id = 'submissions');
CREATE POLICY "Public Upload Submissions Bucket" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'submissions');`;

// ข้อมูลเริ่มต้น (Seed Data) ถอดแบบจากภาพต้นฉบับ + รายชื่อเพื่อนนักศึกษาและอาจารย์
function getInitialSeedState() {
  return {
    course: {
      courseCode: 'DES-101',
      courseSubtitle: '1 วิชา',
      courseTitle: 'INTRO TO VISUAL DESIGN',
      semester: 'ภาคการศึกษา 1/2569',
      instructorName: 'อ.ดร. กิตติพงศ์ (Instructor)'
    },
    currentUserId: '67010101', // เริ่มต้นที่ Sarah Jenkins
    users: [
      {
        studentId: '67010101',
        passwordHash: '1234',
        fullName: 'Sarah Jenkins (ซาร่าห์)',
        nickname: 'Sarah',
        role: 'student',
        section: 'Sec 01',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
      },
      {
        studentId: '67010102',
        passwordHash: '1234',
        fullName: 'นะโม พงศ์พิพัฒน์ (Namo)',
        nickname: 'Namo',
        role: 'student',
        section: 'Sec 01',
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80'
      },
      {
        studentId: '67010103',
        passwordHash: '1234',
        fullName: 'กานต์ธิดา วงศ์สวัสดิ์ (Kanda)',
        nickname: 'Kanda',
        role: 'student',
        section: 'Sec 01',
        avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80'
      },
      {
        studentId: '67010104',
        passwordHash: '1234',
        fullName: 'ธนภัทร ศรีสุวรรณ (Ton)',
        nickname: 'Ton',
        role: 'student',
        section: 'Sec 01',
        avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80'
      },
      {
        studentId: '67010105',
        passwordHash: '1234',
        fullName: 'ลลิตา ชื่นกมล (Lita)',
        nickname: 'Lita',
        role: 'student',
        section: 'Sec 02',
        avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80'
      },
      {
        studentId: 'T001',
        passwordHash: '1234',
        fullName: 'อ.ดร. กิตติพงศ์ วัฒนากุล',
        nickname: 'อ.กิตติพงศ์',
        role: 'teacher',
        section: 'Instructor',
        avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80'
      }
    ],
    // ใบงานหลัก 3 ชิ้นตามภาพต้นฉบับ (ปุ่มสี Navy, Olive, Slate) + ใบงานที่ตรวจแล้ว 1 ชิ้น
    assignments: [
      {
        id: 'assign-03-a',
        title: 'Assignment 03: Visual Identity',
        description: 'ออกแบบชุดอัตลักษณ์แบรนด์ (Logo, Color Palette, Typography) ส่งเป็นไฟล์ PDF หรือลิงก์ Figma/Canva (ส่งเดี่ยวหรือเลือกเพื่อนเข้ากลุ่มได้)',
        dueDate: '2026-11-08T23:59:00',
        displayDue: '08 Nov 2026',
        maxScore: 100,
        workType: 'group',
        allowLate: true,
        themeColor: 'navy',
        badgeLabel: 'กล่องส่ง'
      },
      {
        id: 'assign-03-b',
        title: 'Assignment 03: Brand Moodboard',
        description: 'จัดทำ Visual Concept Board สไตล์ Minimal & Elevated พร้อมวิเคราะห์โทนสีและวัสดุ',
        dueDate: '2026-11-08T23:59:00',
        displayDue: '08 Nov 2026',
        maxScore: 100,
        workType: 'group',
        allowLate: true,
        themeColor: 'olive',
        badgeLabel: 'กล่องส่ง'
      },
      {
        id: 'assign-04',
        title: 'Assignment 04: Editorial Layout & Grid',
        description: 'ออกแบบหน้าเว็บหรือสิ่งพิมพ์โดยใช้หลัก Plenty of Whitespace และระบบ Grid มาตรฐาน',
        dueDate: '2026-10-20T23:59:00', // ตั้งให้เลยกำหนดแล้วเพื่อทดสอบการส่งสาย (Late Submission) ได้ทันที
        displayDue: '20 Oct 2026',
        maxScore: 100,
        workType: 'individual',
        allowLate: true,
        themeColor: 'slate',
        badgeLabel: 'กล่องส่ง'
      }
    ],
    submissions: [
      {
        id: 'sub-demo-1',
        assignmentId: 'assign-03-b',
        submittedBy: '67010101',
        groupName: 'Studio Minimal Team',
        memberIds: ['67010101', '67010102'], // Sarah ส่งคู่กับ Namo
        files: [
          {
            name: 'Brand_Moodboard_Sarah_Namo.pdf',
            size: 2458000,
            type: 'application/pdf',
            contentText: 'Sample PDF Submission for Assignment 03 Brand Moodboard by Sarah (67010101) & Namo (67010102)'
          }
        ],
        externalLinks: [
          {
            label: 'Figma Concept Board',
            url: 'https://www.figma.com/community'
          }
        ],
        studentNote: 'ส่งงานคู่กับเพื่อน (นะโม 67010102) แนบทั้งไฟล์ PDF และลิงก์บอร์ด Figma เรียบร้อยค่ะ',
        submittedAt: '2026-10-25T14:30:00',
        isLate: false,
        resubmitCount: 0,
        status: 'graded',
        score: 95,
        teacherFeedback: 'คุมโทนสี Minimal & Elevated ได้ยอดเยี่ยมมาก การจัดวาง Typography ชัดเจนและมีพื้นที่ว่างสบายตาครับ',
        gradedAt: '2026-10-26T10:15:00'
      }
    ],
    notifications: [
      {
        id: 'notif-1',
        targetUserId: '67010101',
        title: '✅ อาจารย์ตรวจและให้คะแนนแล้ว!',
        message: 'Assignment 03: Brand Moodboard ได้คะแนน 95/100 คะแนน พร้อมคอมเมนต์จากอาจารย์',
        type: 'graded',
        isRead: false,
        createdAt: 'วันนี้ • 10:15 น.'
      },
      {
        id: 'notif-2',
        targetUserId: 'ALL_STUDENTS',
        title: '⏰ ใกล้ครบกำหนดส่งใบงาน',
        message: 'Assignment 03: Visual Identity กำหนดส่งภายใน 08 Nov 2026 (คะแนนเต็ม 100 คะแนน)',
        type: 'deadline',
        isRead: false,
        createdAt: 'วันนี้ • 09:00 น.'
      },
      {
        id: 'notif-3',
        targetUserId: 'ALL_STUDENTS',
        title: '📌 เปิดกล่องรับงานใหม่ (อนุญาตส่งสายได้)',
        message: 'อาจารย์เปิดรับงาน Assignment 04: Editorial Layout & Grid แล้ว สามารถแนบไฟล์และลิงก์ได้ทันที',
        type: 'new_assignment',
        isRead: false,
        createdAt: 'เมื่อวานนี้ • 16:40 น.'
      }
    ]
  };
}

// สถานะหลักของแอป
let appState = loadPortalState();
let supabaseClient = null;
let currentFilter = 'all';
let activeAssignmentForModal = null;
let draftFiles = [];
let draftLinks = [];

// ============================================================================
// STATE PERSISTENCE & SUPABASE CLOUD SYNC
// ============================================================================
function loadPortalState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STATE);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Could not load saved state, using seed state:', err);
  }
  const seed = getInitialSeedState();
  localStorage.setItem(STORAGE_KEYS.STATE, JSON.stringify(seed));
  return seed;
}

function savePortalState() {
  localStorage.setItem(STORAGE_KEYS.STATE, JSON.stringify(appState));
  syncStateToSupabaseCloud();
}

async function initSupabaseConnection() {
  try {
    let cfg = { ...DEFAULT_SUPABASE_CONFIG };
    const rawCfg = localStorage.getItem(STORAGE_KEYS.SUPABASE_CFG);
    if (rawCfg) {
      const parsed = JSON.parse(rawCfg);
      if (parsed.url && parsed.anonKey) {
        cfg = parsed;
      }
    } else {
      localStorage.setItem(STORAGE_KEYS.SUPABASE_CFG, JSON.stringify(cfg));
    }

    const urlInput = document.getElementById('supabaseUrlInput');
    const keyInput = document.getElementById('supabaseKeyInput');
    if (urlInput) urlInput.value = cfg.url;
    if (keyInput) keyInput.value = cfg.anonKey;

    if (cfg.url && cfg.anonKey && window.supabase) {
      supabaseClient = window.supabase.createClient(cfg.url, cfg.anonKey);
      const dot = document.getElementById('dbStatusDot');
      const txt = document.getElementById('dbStatusText');

      // ทดสอบว่าสร้างตารางใน Supabase หรือยัง และดึงข้อมูลล่าสุดลงมา
      const { data: courseRows, error: testErr } = await supabaseClient
        .from('course_settings')
        .select('*')
        .limit(1);

      if (testErr) {
        if (dot && txt) {
          dot.classList.remove('cloud');
          txt.textContent = 'รอสร้างตาราง SQL ใน Supabase (คลิกดูวิธี)';
        }
        console.warn('Supabase table check:', testErr.message);
        return;
      }

      if (dot && txt) {
        dot.classList.add('cloud');
        txt.textContent = 'เชื่อมต่อฐานข้อมูล Supabase ถาวรแล้ว';
      }

      // หากตารางว่างเปล่า ให้ Push ข้อมูลเริ่มต้นขึ้นไปสร้างในฐานข้อมูลให้อัตโนมัติ
      if (!courseRows || courseRows.length === 0) {
        await syncStateToSupabaseCloud();
      } else {
        await pullStateFromSupabaseCloud();
      }
    }
  } catch (e) {
    console.warn('Supabase init warning:', e);
  }
}

async function pullStateFromSupabaseCloud() {
  if (!supabaseClient) return;
  try {
    const [courseRes, usersRes, assignRes, subRes, notifRes] = await Promise.all([
      supabaseClient.from('course_settings').select('*').eq('id', 'default_course').maybeSingle(),
      supabaseClient.from('portal_users').select('*'),
      supabaseClient.from('assignments').select('*').order('created_at', { ascending: true }),
      supabaseClient.from('submissions').select('*').order('submitted_at', { ascending: false }),
      supabaseClient.from('notifications').select('*').order('created_at', { ascending: false })
    ]);

    if (courseRes.data) {
      appState.course = {
        courseCode: courseRes.data.course_code,
        courseSubtitle: courseRes.data.course_subtitle,
        courseTitle: courseRes.data.course_title,
        semester: courseRes.data.semester,
        instructorName: courseRes.data.instructor_name
      };
    }

    if (usersRes.data && usersRes.data.length > 0) {
      appState.users = usersRes.data.map((u) => ({
        studentId: u.student_id,
        passwordHash: u.password_hash,
        fullName: u.full_name,
        nickname: u.nickname || u.full_name.split(' ')[0],
        role: u.role,
        section: u.section,
        avatarUrl: u.avatar_url
      }));
    }

    if (assignRes.data && assignRes.data.length > 0) {
      appState.assignments = assignRes.data.map((a) => ({
        id: a.id,
        title: a.title,
        description: a.description,
        dueDate: a.due_date,
        displayDue: formatDueDateDisplay(a.due_date),
        maxScore: Number(a.max_score),
        workType: a.work_type,
        allowLate: a.allow_late,
        themeColor: a.theme_color,
        badgeLabel: a.badge_label || 'กล่องส่ง'
      }));
    }

    if (subRes.data) {
      appState.submissions = subRes.data.map((s) => ({
        id: s.id,
        assignmentId: s.assignment_id,
        submittedBy: s.submitted_by,
        groupName: s.group_name,
        memberIds: s.member_ids || [s.submitted_by],
        files: s.files || [],
        externalLinks: s.external_links || [],
        studentNote: s.student_note,
        submittedAt: s.submitted_at,
        isLate: s.is_late,
        resubmitCount: s.resubmit_count || 0,
        status: s.status,
        score: s.score !== null && s.score !== undefined ? Number(s.score) : undefined,
        teacherFeedback: s.teacher_feedback,
        gradedAt: s.graded_at
      }));
    }

    if (notifRes.data && notifRes.data.length > 0) {
      appState.notifications = notifRes.data.map((n) => ({
        id: n.id,
        targetUserId: n.target_user_id,
        title: n.title,
        message: n.message,
        type: n.type,
        isRead: n.is_read,
        createdAt: formatDateTimeThai(n.created_at)
      }));
    }

    localStorage.setItem(STORAGE_KEYS.STATE, JSON.stringify(appState));
    renderAll();
  } catch (err) {
    console.warn('Pull from Supabase error:', err);
  }
}

async function syncStateToSupabaseCloud() {
  if (!supabaseClient) return;
  try {
    await supabaseClient.from('course_settings').upsert({
      id: 'default_course',
      course_code: appState.course.courseCode || 'DES-101',
      course_subtitle: appState.course.courseSubtitle || '1 วิชา',
      course_title: appState.course.courseTitle || 'INTRO TO VISUAL DESIGN',
      semester: appState.course.semester || 'ภาคการศึกษา 1/2569',
      instructor_name: appState.course.instructorName || 'อ.ดร. กิตติพงศ์'
    });

    if (appState.users?.length) {
      await supabaseClient.from('portal_users').upsert(
        appState.users.map((u) => ({
          student_id: u.studentId,
          password_hash: u.passwordHash,
          full_name: u.fullName,
          nickname: u.nickname,
          role: u.role,
          section: u.section,
          avatar_url: u.avatarUrl
        }))
      );
    }

    if (appState.assignments?.length) {
      await supabaseClient.from('assignments').upsert(
        appState.assignments.map((a) => ({
          id: a.id,
          title: a.title,
          description: a.description || '',
          due_date: new Date(a.dueDate).toISOString(),
          max_score: Number(a.maxScore) || 100,
          work_type: a.workType || 'group',
          allow_late: true,
          theme_color: a.themeColor || 'navy',
          badge_label: a.badgeLabel || 'กล่องส่ง'
        }))
      );
    }

    if (appState.submissions?.length) {
      await supabaseClient.from('submissions').upsert(
        appState.submissions.map((s) => ({
          id: s.id,
          assignment_id: s.assignmentId,
          submitted_by: s.submittedBy,
          group_name: s.groupName || '',
          member_ids: s.memberIds || [s.submittedBy],
          files: s.files || [],
          external_links: s.externalLinks || [],
          student_note: s.studentNote || '',
          submitted_at: new Date(s.submittedAt).toISOString(),
          is_late: Boolean(s.isLate),
          resubmit_count: Number(s.resubmitCount) || 0,
          status: s.status || 'pending_review',
          score: typeof s.score === 'number' ? s.score : null,
          teacher_feedback: s.teacherFeedback || null,
          graded_at: s.gradedAt ? new Date(s.gradedAt).toISOString() : null
        }))
      );
    }
  } catch (err) {
    console.warn('Sync to Supabase warning:', err);
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
const GUEST_USER = {
  studentId: 'GUEST',
  fullName: 'ยังไม่ได้เข้าสู่ระบบ (Guest)',
  nickname: 'Guest',
  role: 'guest',
  section: '-',
  avatarUrl:
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'
};

function getCurrentUser() {
  if (!appState.currentUserId) {
    return GUEST_USER;
  }
  return (
    appState.users.find((u) => u.studentId === appState.currentUserId) ||
    GUEST_USER
  );
}

function getUserById(studentId) {
  return appState.users.find((u) => u.studentId === studentId);
}

// ตรวจหาผลงานของนักศึกษาคนปัจจุบัน (ไม่ว่าจะส่งเอง หรือเพื่อนเลือกเข้ากลุ่ม)
function findStudentSubmission(assignmentId, studentId) {
  return appState.submissions.find(
    (s) =>
      s.assignmentId === assignmentId &&
      (s.submittedBy === studentId ||
        (Array.isArray(s.memberIds) && s.memberIds.includes(studentId)))
  );
}

function formatDueDateDisplay(isoStr) {
  if (!isoStr) return '-';
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return isoStr;
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

function formatDateTimeThai(isoStr) {
  if (!isoStr) return '-';
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return isoStr;
  return d.toLocaleString('th-TH', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function isPastDeadline(dueDateStr) {
  const due = new Date(dueDateStr).getTime();
  const now = Date.now();
  return now > due;
}

function showToast(message) {
  const toast = document.getElementById('portalToast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 3400);
}

// ============================================================================
// RENDER ALL UI SECTIONS
// ============================================================================
function renderAll() {
  const user = getCurrentUser();
  const isGuest = user.role === 'guest';
  const isTeacher = user.role === 'teacher';

  // สลับการแสดงผลมุมขวาบน: ถ้าออกจากระบบแล้ว ให้โชว์ปุ่มสีฟ้า "เข้าสู่ระบบ / สมัครสมาชิก" แทนโปรไฟล์
  const guestAuthBtn = document.getElementById('headerGuestAuthBtn');
  const profileWrap = document.getElementById('headerProfileDropdownWrap');
  if (guestAuthBtn && profileWrap) {
    guestAuthBtn.hidden = !isGuest;
    guestAuthBtn.style.display = isGuest ? 'inline-flex' : 'none';
    profileWrap.hidden = isGuest;
    profileWrap.style.display = isGuest ? 'none' : '';
  }

  // 1. Update Header & Course Banner
  document.getElementById('sidebarCourseCode').textContent =
    `${appState.course.courseCode} • Visual Design`;
  document.getElementById('courseSubtitleDisplay').textContent =
    appState.course.courseSubtitle;
  document.getElementById('courseTitleDisplay').textContent =
    appState.course.courseTitle;
  document.getElementById('headerSemesterText').textContent =
    appState.course.semester;
  document.getElementById('headerStudentIdBadge').textContent = isGuest
    ? 'สถานะ: ยังไม่ได้เข้าสู่ระบบ'
    : isTeacher
    ? `อาจารย์: ${user.studentId}`
    : `รหัส: ${user.studentId}`;
  document.getElementById('headerUserName').textContent =
    user.nickname || user.fullName;
  document.getElementById('headerUserAvatar').src = user.avatarUrl;

  // อัปเดตข้อมูลในกล่องเมนูโปรไฟล์ (Profile Popover)
  const popAvatar = document.getElementById('popoverUserAvatar');
  const popName = document.getElementById('popoverUserName');
  const popHandle = document.getElementById('popoverUserHandle');
  if (popAvatar) popAvatar.src = user.avatarUrl;
  if (popName) popName.textContent = user.fullName;
  if (popHandle) {
    popHandle.textContent = `@${user.studentId} • ${user.section}`;
  }

  // Sidebar Role Indicator & Teacher-Only Buttons Visibility
  const roleTextEl = document.getElementById('sidebarRoleText');
  if (roleTextEl) {
    roleTextEl.textContent = isGuest
      ? 'สถานะ: ยังไม่ได้เข้าสู่ระบบ'
      : isTeacher
      ? `สถานะ: อาจารย์ผู้สอน (${user.nickname})`
      : `สถานะ: นักศึกษา (${user.studentId})`;
  }

  const logoutBtnLabel = document.getElementById('logoutBtnLabel');
  if (logoutBtnLabel) {
    logoutBtnLabel.textContent = isGuest
      ? 'เข้าสู่ระบบ / สมัครสมาชิก'
      : 'ออกจากระบบ (Log Out)';
  }

  const navInstructorBtn = document.getElementById('navInstructorBtn');
  const heroCreateAssignmentBtn = document.getElementById('heroCreateAssignmentBtn');
  if (navInstructorBtn) {
    navInstructorBtn.hidden = !isTeacher;
    navInstructorBtn.style.display = isTeacher ? '' : 'none';
  }
  if (heroCreateAssignmentBtn) {
    const isOnInstructorPage = document
      .getElementById('viewInstructor')
      ?.classList.contains('active');
    const showGreenCreateBtn = isTeacher && Boolean(isOnInstructorPage);
    heroCreateAssignmentBtn.hidden = !showGreenCreateBtn;
    heroCreateAssignmentBtn.style.display = showGreenCreateBtn ? '' : 'none';
  }

  // Quick Role Switcher Highlight
  document.getElementById('quickStudentBtn').classList.toggle(
    'active',
    user.studentId === '67010101'
  );
  document.getElementById('quickStudent2Btn').classList.toggle(
    'active',
    user.studentId === '67010102'
  );
  document.getElementById('quickTeacherBtn').classList.toggle(
    'active',
    user.role === 'teacher'
  );

  // Course Config Form inputs
  document.getElementById('cfgCourseSubtitle').value =
    appState.course.courseSubtitle;
  document.getElementById('cfgCourseTitle').value =
    appState.course.courseTitle;
  document.getElementById('cfgSemester').value = appState.course.semester;

  // Profile Page
  document.getElementById('profilePageAvatar').src = user.avatarUrl;
  document.getElementById('profilePageRoleBadge').textContent =
    user.role === 'teacher' ? 'อาจารย์ผู้สอน (Instructor)' : 'นักศึกษา (Student)';
  document.getElementById('profilePageName').textContent = user.fullName;
  document.getElementById('profilePageStudentId').textContent =
    `รหัสประจำตัว: ${user.studentId} • กลุ่มเรียน: ${user.section}`;

  // Render Sub-components
  renderNotifications();
  renderStudentAssignmentsGrid();
  renderStudentRecentSubmissions();
  renderStudentGradesTable();
  renderInstructorPortal();
}

// ============================================================================
// 1. NOTIFICATIONS BELL & POPOVER
// ============================================================================
function renderNotifications() {
  const user = getCurrentUser();
  const relevant = appState.notifications.filter(
    (n) =>
      n.targetUserId === 'ALL_STUDENTS' ||
      n.targetUserId === user.studentId ||
      (user.role === 'teacher' && n.targetUserId === 'TEACHER')
  );

  const unreadCount = relevant.filter((n) => !n.isRead).length;
  const dot = document.getElementById('bellUnreadDot');
  const badge = document.getElementById('bellUnreadCount');

  if (unreadCount > 0) {
    dot.style.display = 'block';
    badge.style.display = 'inline-block';
    badge.textContent = unreadCount;
  } else {
    dot.style.display = 'none';
    badge.style.display = 'none';
  }

  const listEl = document.getElementById('notificationList');
  if (relevant.length === 0) {
    listEl.innerHTML = `<li class="notif-item"><span class="notif-item-msg">ยังไม่มีการแจ้งเตือนใหม่</span></li>`;
    return;
  }

  listEl.innerHTML = relevant
    .map(
      (n) => `
      <li class="notif-item ${n.isRead ? '' : 'unread'}" data-notif-id="${n.id}">
        <span class="notif-item-title">${n.title}</span>
        <span class="notif-item-msg">${n.message}</span>
        <span class="notif-item-time">${n.createdAt}</span>
      </li>
    `
    )
    .join('');
}

// ============================================================================
// 2. STUDENT ASSIGNMENTS CARDS GRID (Matches Image 1 & Image 2)
// ============================================================================
function renderStudentAssignmentsGrid() {
  const user = getCurrentUser();
  const grid = document.getElementById('assignmentsGrid');

  // Count pending assignments for current student
  const pendingCount = appState.assignments.filter(
    (a) => !findStudentSubmission(a.id, user.studentId)
  ).length;
  document.getElementById('navPendingCount').textContent = pendingCount;
  document.getElementById('pendingStatusSubtext').textContent =
    pendingCount > 0
      ? `Pending Submission (มีงานรอส่ง ${pendingCount} ชิ้น — คลิกหรือลากไฟล์มาวางได้เลย)`
      : `ส่งครบทุกใบงานแล้ว (สามารถกดส่งไฟล์ใหม่ทับไฟล์เดิมได้ตลอดเวลา)`;

  // Filter assignments
  const filtered = appState.assignments.filter((a) => {
    const sub = findStudentSubmission(a.id, user.studentId);
    if (currentFilter === 'pending') return !sub || sub.status === 'needs_revision';
    if (currentFilter === 'submitted') return Boolean(sub);
    if (currentFilter === 'graded') return sub && sub.status === 'graded';
    return true;
  });

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="assignment-card" style="grid-column: 1 / -1; text-align:center; padding: 32px;">
        <p class="card-title">ไม่มีใบงานในหมวดหมู่นี้</p>
        <p style="font-size:0.84rem; color:var(--text-secondary);">ลองสลับตัวกรองด้านบนเป็น "ทั้งหมด"</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered
    .map((assign) => {
      const sub = findStudentSubmission(assign.id, user.studentId);
      const pastDue = isPastDeadline(assign.dueDate);
      const displayDate = assign.displayDue || formatDueDateDisplay(assign.dueDate);

      let badgeHtml = `<span class="card-badge-pill">${assign.badgeLabel || 'กล่องส่ง'}</span>`;
      let buttonLabel = 'Submit Assignment';

      if (sub) {
        if (sub.status === 'graded') {
          badgeHtml = `<span class="card-badge-pill submitted">ได้ ${sub.score}/${assign.maxScore} คะแนน</span>`;
          buttonLabel = 'ส่งงานใหม่ (Resubmit)';
        } else if (sub.status === 'needs_revision') {
          badgeHtml = `<span class="card-badge-pill revision">ให้แก้ไขงาน</span>`;
          buttonLabel = 'ส่งงานแก้ไข (Resubmit)';
        } else if (sub.isLate) {
          badgeHtml = `<span class="card-badge-pill late">ส่งแล้ว (ส่งสาย)</span>`;
          buttonLabel = 'อัปเดตไฟล์งาน (Resubmit)';
        } else {
          badgeHtml = `<span class="card-badge-pill submitted">ส่งแล้ว • รอตรวจ</span>`;
          buttonLabel = 'ส่งงานใหม่ทับไฟล์เดิม';
        }
      } else if (pastDue) {
        badgeHtml = `<span class="card-badge-pill late">เลยกำหนด (ส่งสายได้)</span>`;
        buttonLabel = 'Submit Assignment (ส่งสาย)';
      }

      const workTypeTag =
        assign.workType === 'group'
          ? `<span class="mini-tag group-tag">👥 เดี่ยว / เลือกเพื่อนเข้ากลุ่มได้</span>`
          : `<span class="mini-tag">👤 งานเดี่ยว</span>`;

      const groupMemberInfo =
        sub && sub.memberIds && sub.memberIds.length > 1
          ? `<div style="font-size:0.76rem; color:var(--olive); font-weight:600;">
               กลุ่มร่วมกับ: ${sub.memberIds
                 .map((id) => getUserById(id)?.nickname || id)
                 .join(', ')}
             </div>`
          : '';

      return `
        <article class="assignment-card">
          <div>
            <div class="card-top-row">
              <h3 class="card-title">${assign.title}</h3>
              ${badgeHtml}
            </div>

            <div class="card-meta-list" style="margin-top: 10px;">
              <span>กำหนดส่ง: <strong>${displayDate}</strong></span>
              <span>คะแนน: <strong>${assign.maxScore} คะแนน</strong></span>
              ${assign.description ? `<span style="font-size:0.78rem; margin-top:4px;">${assign.description}</span>` : ''}
            </div>

            <div class="card-tags-row" style="margin-top: 8px;">
              ${workTypeTag}
              ${sub && sub.files?.length ? `<span class="mini-tag">📎 ${sub.files.length} ไฟล์</span>` : ''}
              ${sub && sub.externalLinks?.length ? `<span class="mini-tag">🔗 ${sub.externalLinks.length} ลิงก์</span>` : ''}
            </div>
            ${groupMemberInfo}
          </div>

          <button class="card-submit-btn ${assign.themeColor || 'navy'}" data-open-submit="${assign.id}" type="button">
            <span>${buttonLabel}</span>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
          </button>
        </article>
      `;
    })
    .join('');
}

// ============================================================================
// 3. STUDENT RECENT SUBMISSIONS PANEL
// ============================================================================
function renderStudentRecentSubmissions() {
  const user = getCurrentUser();
  const mySubs = appState.submissions.filter(
    (s) =>
      s.submittedBy === user.studentId ||
      (Array.isArray(s.memberIds) && s.memberIds.includes(user.studentId))
  );

  document.getElementById('mySubmittedCountBadge').textContent =
    `${mySubs.length} รายการ`;

  const listEl = document.getElementById('mySubmissionsList');
  if (mySubs.length === 0) {
    listEl.innerHTML = `
      <div class="sub-history-item">
        <div class="sub-history-info">
          <h4>ยังไม่มีประวัติการส่งงาน</h4>
          <p>กดปุ่ม Submit Assignment บนการ์ดใบงานเพื่อส่งงานชิ้นแรกของคุณ</p>
        </div>
      </div>
    `;
    return;
  }

  listEl.innerHTML = mySubs
    .map((sub) => {
      const assign = appState.assignments.find((a) => a.id === sub.assignmentId);
      const statusBadge =
        sub.status === 'graded'
          ? `<span class="card-badge-pill submitted">ตรวจแล้ว: ${sub.score}/${assign?.maxScore || 100}</span>`
          : sub.status === 'needs_revision'
          ? `<span class="card-badge-pill revision">อาจารย์สั่งให้แก้ไข</span>`
          : `<span class="card-badge-pill">รอตรวจ${sub.isLate ? ' (ส่งสาย)' : ''}</span>`;

      const membersNames = (sub.memberIds || [])
        .map((id) => getUserById(id)?.nickname || id)
        .join(', ');

      return `
        <div class="sub-history-item">
          <div class="sub-history-info">
            <h4>${assign ? assign.title : sub.assignmentId}</h4>
            <p>ส่งเมื่อ: ${formatDateTimeThai(sub.submittedAt)} • สมาชิก: ${membersNames}</p>
            ${
              sub.teacherFeedback
                ? `<p style="color:var(--olive); font-weight:600; margin-top:3px;">💬 อาจารย์: "${sub.teacherFeedback}"</p>`
                : ''
            }
          </div>
          <div style="display:flex; flex-direction:column; align-items:flex-end; gap:6px;">
            ${statusBadge}
            <button class="copy-snippet-btn" data-open-submit="${sub.assignmentId}" type="button">ส่งแก้ / ดูงาน</button>
          </div>
        </div>
      `;
    })
    .join('');
}

// ============================================================================
// 4. GRADES VIEW (สลับอัตโนมัติ: นักศึกษาดูคะแนนตัวเอง vs อาจารย์ดูการ์ดโปรไฟล์นักศึกษาทั้งหมด)
// ============================================================================
function renderStudentGradesTable() {
  const user = getCurrentUser();
  const isTeacher = user.role === 'teacher';
  const studentBox = document.getElementById('studentGradesBox');
  const teacherBox = document.getElementById('teacherGradesBox');

  if (studentBox && teacherBox) {
    studentBox.hidden = isTeacher;
    studentBox.style.display = isTeacher ? 'none' : '';
    teacherBox.hidden = !isTeacher;
    teacherBox.style.display = isTeacher ? '' : 'none';
  }

  if (isTeacher) {
    renderTeacherAllStudentsGrades();
    return;
  }

  const tbody = document.getElementById('studentGradesTableBody');
  let earnedTotal = 0;
  let maxTotal = 0;

  tbody.innerHTML = appState.assignments
    .map((assign) => {
      const sub = findStudentSubmission(assign.id, user.studentId);
      maxTotal += Number(assign.maxScore) || 0;
      if (sub && typeof sub.score === 'number') {
        earnedTotal += Number(sub.score);
      }

      const statusText = !sub
        ? `<span class="card-badge-pill late">ยังไม่ส่งงาน</span>`
        : sub.status === 'graded'
        ? `<span class="card-badge-pill submitted">ตรวจแล้ว${sub.isLate ? ' (ส่งสาย)' : ''}</span>`
        : sub.status === 'needs_revision'
        ? `<span class="card-badge-pill revision">ให้แก้ไขงาน</span>`
        : `<span class="card-badge-pill">ส่งแล้ว • รอตรวจ${sub.isLate ? ' (ส่งสาย)' : ''}</span>`;

      const scoreDisplay =
        sub && typeof sub.score === 'number'
          ? `<strong>${sub.score} / ${assign.maxScore}</strong>`
          : `- / ${assign.maxScore}`;

      return `
        <tr>
          <td><strong>${assign.title}</strong></td>
          <td>${assign.workType === 'group' ? '👥 เดี่ยว/กลุ่ม' : '👤 งานเดี่ยว'}</td>
          <td>${assign.displayDue || formatDueDateDisplay(assign.dueDate)}</td>
          <td>${statusText}</td>
          <td>${scoreDisplay}</td>
          <td>${sub?.teacherFeedback ? `💬 ${sub.teacherFeedback}` : '<span style="color:var(--text-muted);">ยังไม่มีคอมเมนต์</span>'}</td>
          <td>
            <button class="btn-cream-outline" data-open-submit="${assign.id}" type="button">
              ${sub ? 'ส่งงานใหม่ (Resubmit)' : 'ส่งงาน'}
            </button>
          </td>
        </tr>
      `;
    })
    .join('');

  document.getElementById('studentTotalScoreBanner').innerHTML =
    `คะแนนรวมของคุณ: <strong>${earnedTotal} / ${maxTotal} คะแนน</strong>`;
}

function renderTeacherAllStudentsGrades() {
  const gridEl = document.getElementById('teacherStudentsGradesGrid');
  const summaryBanner = document.getElementById('teacherClassSummaryBanner');
  if (!gridEl) return;

  const students = appState.users.filter((u) => u.role === 'student');
  const maxCourseScore = appState.assignments.reduce(
    (sum, a) => sum + (Number(a.maxScore) || 0),
    0
  );

  if (summaryBanner) {
    summaryBanner.innerHTML = `นักศึกษาทั้งหมด: <strong>${students.length} คน</strong> • คะแนนเต็มรวม: <strong>${maxCourseScore} คะแนน</strong>`;
  }

  if (students.length === 0) {
    gridEl.innerHTML = `<p style="grid-column:1/-1; text-align:center; padding:24px;">ยังไม่มีนักศึกษาในระบบ</p>`;
    return;
  }

  gridEl.innerHTML = students
    .map((stu) => {
      let stuEarned = 0;
      let submittedCount = 0;

      const assignRowsHtml = appState.assignments
        .map((assign) => {
          const sub = findStudentSubmission(assign.id, stu.studentId);
          if (sub) submittedCount += 1;
          if (sub && typeof sub.score === 'number') {
            stuEarned += Number(sub.score);
          }

          let badgeHtml = `<span class="card-badge-pill late" style="font-size:0.7rem; padding:2px 8px;">ยังไม่ส่ง</span>`;
          let actionBtnHtml = '';

          if (sub) {
            if (sub.status === 'graded' && typeof sub.score === 'number') {
              badgeHtml = `<span class="card-badge-pill submitted" style="font-size:0.72rem; padding:2px 9px;">${sub.score} / ${assign.maxScore} คะแนน</span>`;
            } else if (sub.status === 'needs_revision') {
              badgeHtml = `<span class="card-badge-pill revision" style="font-size:0.7rem; padding:2px 8px;">สั่งให้แก้ไข</span>`;
            } else {
              badgeHtml = `<span class="card-badge-pill" style="font-size:0.7rem; padding:2px 8px;">รอตรวจ${sub.isLate ? ' (สาย)' : ''}</span>`;
            }
            actionBtnHtml = `<button type="button" class="copy-snippet-btn" data-open-grade="${sub.id}" style="padding:3px 9px; font-size:0.72rem;">ตรวจ/แก้ไขคะแนน</button>`;
          }

          return `
            <div class="sg-assign-row">
              <span class="sg-assign-title">${assign.title}</span>
              <div class="sg-assign-right">
                ${badgeHtml}
                ${actionBtnHtml}
              </div>
            </div>
          `;
        })
        .join('');

      return `
        <article class="student-grade-profile-card">
          <div class="sg-card-header">
            <img src="${stu.avatarUrl}" alt="${stu.fullName}" class="sg-avatar" />
            <div class="sg-user-meta">
              <strong class="sg-user-name">${stu.fullName}</strong>
              <span class="sg-user-id">รหัสนักศึกษา: ${stu.studentId} • ${stu.section} (ส่งแล้ว ${submittedCount}/${appState.assignments.length} งาน)</span>
            </div>
            <div class="sg-score-badge">
              ${stuEarned} / ${maxCourseScore} คะแนน
            </div>
          </div>

          <div class="sg-assignments-breakdown">
            ${assignRowsHtml}
          </div>
        </article>
      `;
    })
    .join('');
}

// ============================================================================
// 5. INSTRUCTOR PORTAL (สร้างใบงาน / ตรวจงาน / ให้คะแนน / CSV / ZIP)
// ============================================================================
function renderInstructorPortal() {
  const studentsCount = appState.users.filter((u) => u.role === 'student').length;
  const pendingReviewCount = appState.submissions.filter(
    (s) => s.status === 'pending_review'
  ).length;

  document.getElementById('statTotalAssignments').textContent =
    appState.assignments.length;
  document.getElementById('statTotalSubmissions').textContent =
    appState.submissions.length;
  document.getElementById('statPendingReviewText').textContent =
    `รอตรวจ ${pendingReviewCount} รายการ`;
  document.getElementById('statTotalStudents').textContent = studentsCount;

  // Populate assignment dropdown filter in Instructor view
  const filterSelect = document.getElementById('instructorAssignmentFilter');
  const prevValue = filterSelect.value || 'all';
  filterSelect.innerHTML =
    `<option value="all">ทุกใบงาน (${appState.assignments.length} ชิ้น)</option>` +
    appState.assignments
      .map((a) => `<option value="${a.id}">${a.title}</option>`)
      .join('');
  filterSelect.value = prevValue;

  // Filter submissions
  const selectedAssignId = filterSelect.value;
  const subsToDisplay = appState.submissions.filter(
    (s) => selectedAssignId === 'all' || s.assignmentId === selectedAssignId
  );

  const tbody = document.getElementById('instructorSubmissionsTableBody');
  if (subsToDisplay.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; padding: 24px; color:var(--text-secondary);">
          ยังไม่มีนักศึกษาส่งงานในรายการที่เลือก
        </td>
      </tr>
    `;
  } else {
    tbody.innerHTML = subsToDisplay
      .map((sub) => {
        const assign = appState.assignments.find((a) => a.id === sub.assignmentId);
        const membersList = (sub.memberIds || [sub.submittedBy])
          .map((id) => {
            const u = getUserById(id);
            return u ? `${u.fullName} (${u.studentId})` : id;
          })
          .join('<br/>');

        const filesHtml = (sub.files || [])
          .map(
            (f, idx) =>
              `<div>📎 <a href="#" data-download-sub="${sub.id}" data-file-idx="${idx}">${f.name}</a></div>`
          )
          .join('');

        const linksHtml = (sub.externalLinks || [])
          .map(
            (l) =>
              `<div>🔗 <a href="${l.url}" target="_blank" rel="noopener">${l.label || l.url}</a></div>`
          )
          .join('');

        const timeBadge = sub.isLate
          ? `<span class="card-badge-pill late">ส่งสาย (Late)</span>`
          : `<span class="card-badge-pill submitted">ส่งตรงเวลา</span>`;

        const reviewStatusBadge =
          sub.status === 'graded'
            ? `<span class="card-badge-pill submitted">✅ ตรวจแล้ว</span>`
            : sub.status === 'needs_revision'
            ? `<span class="card-badge-pill revision">🔄 สั่งให้แก้ไข</span>`
            : `<span class="card-badge-pill">⏳ รอตรวจ</span>`;

        return `
          <tr>
            <td><strong>${assign ? assign.title : sub.assignmentId}</strong></td>
            <td>
              ${sub.groupName ? `<strong>[${sub.groupName}]</strong><br/>` : ''}
              ${membersList}
            </td>
            <td>
              <div>${formatDateTimeThai(sub.submittedAt)}</div>
              <div style="margin-top:4px;">${timeBadge} ${sub.resubmitCount > 0 ? `<small>(ส่งแก้ครั้งที่ ${sub.resubmitCount})</small>` : ''}</div>
            </td>
            <td>
              ${filesHtml || ''}
              ${linksHtml || ''}
              ${sub.studentNote ? `<div style="font-size:0.75rem; color:var(--text-secondary); margin-top:4px;">โน้ต: "${sub.studentNote}"</div>` : ''}
            </td>
            <td>${reviewStatusBadge}</td>
            <td>
              <strong>${typeof sub.score === 'number' ? `${sub.score} / ${assign?.maxScore || 100}` : '-'}</strong>
              ${sub.teacherFeedback ? `<div style="font-size:0.74rem; color:var(--olive);">💬 ${sub.teacherFeedback}</div>` : ''}
            </td>
            <td>
              <button class="btn-navy-pill" data-open-grade="${sub.id}" type="button" style="padding:7px 14px; font-size:0.78rem;">
                ✏️ ตรวจงาน / ให้คะแนน
              </button>
            </td>
          </tr>
        `;
      })
      .join('');
  }

  // Render Manage Assignments List
  const assignListEl = document.getElementById('instructorAssignmentsList');
  assignListEl.innerHTML = appState.assignments
    .map(
      (a) => `
      <div class="inst-assign-item">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
          <strong>${a.title}</strong>
          <span class="card-badge-pill">${a.workType === 'group' ? 'เดี่ยว/กลุ่ม' : 'เดี่ยว'}</span>
        </div>
        <div style="font-size:0.8rem; color:var(--text-secondary);">
          กำหนดส่ง: <strong>${a.displayDue || formatDueDateDisplay(a.dueDate)}</strong> • คะแนนเต็ม: <strong>${a.maxScore}</strong>
        </div>
        <div style="display:flex; gap:8px; margin-top:6px;">
          <button class="btn-cream-outline" data-edit-assign="${a.id}" type="button">แก้ไขใบงาน</button>
          <button class="btn-cream-outline" data-delete-assign="${a.id}" type="button" style="color:var(--danger-text);">ลบ</button>
        </div>
      </div>
    `
    )
    .join('');
}

// ============================================================================
// MODAL 1: OPEN & SUBMIT WORK (Files + Links + Group Friend Selector + Resubmit)
// ============================================================================
function openSubmitModal(assignmentId, preloadedFileList = null) {
  const assign =
    appState.assignments.find((a) => a.id === assignmentId) ||
    appState.assignments[0];
  if (!assign) return;

  activeAssignmentForModal = assign;
  const user = getCurrentUser();
  const existingSub = findStudentSubmission(assign.id, user.studentId);

  document.getElementById('submitModalHeading').textContent = assign.title;
  document.getElementById('submitModalMeta').textContent =
    `กำหนดส่ง: ${assign.displayDue || formatDueDateDisplay(assign.dueDate)} • คะแนนเต็ม ${assign.maxScore} คะแนน`;

  // Late warning check
  const lateBanner = document.getElementById('submitLateWarning');
  lateBanner.hidden = !isPastDeadline(assign.dueDate);

  // Resubmit notice check
  const resubmitBanner = document.getElementById('submitResubmitNotice');
  resubmitBanner.hidden = !existingSub;

  // Populate existing or fresh files/links
  draftFiles = existingSub ? [...(existingSub.files || [])] : [];
  draftLinks = existingSub ? [...(existingSub.externalLinks || [])] : [];

  if (preloadedFileList && preloadedFileList.length > 0) {
    handleAddFilesToDraft(preloadedFileList);
  }

  document.getElementById('groupNameInput').value = existingSub?.groupName || '';
  document.getElementById('submissionNoteInput').value =
    existingSub?.studentNote || '';

  // Populate Classmates Group Selector
  const groupBlock = document.getElementById('groupSelectionBlock');
  const checklistEl = document.getElementById('classmatesChecklist');
  const classmates = appState.users.filter((u) => u.role === 'student');

  if (assign.workType === 'individual') {
    document.getElementById('groupModeTitle').textContent =
      'รูปแบบการส่งงาน: งานเดี่ยว (Individual Assignment)';
    document.getElementById('groupLimitTag').textContent = 'งานเดี่ยว';
    document.getElementById('groupNameInput').style.display = 'none';
  } else {
    document.getElementById('groupModeTitle').textContent =
      'รูปแบบการส่งงาน: ส่งเดี่ยว หรือ เลือกเพื่อนเข้ากลุ่มได้';
    document.getElementById('groupLimitTag').textContent =
      'เลือกเพื่อนร่วมกลุ่มได้';
    document.getElementById('groupNameInput').style.display = 'block';
  }

  const selectedMemberIds = existingSub?.memberIds || [user.studentId];

  checklistEl.innerHTML = classmates
    .map((stu) => {
      const isSelf = stu.studentId === user.studentId;
      const isChecked = isSelf || selectedMemberIds.includes(stu.studentId);
      const isDisabled = isSelf || assign.workType === 'individual';
      return `
        <label class="classmate-check-label">
          <input
            type="checkbox"
            name="groupMemberCheckbox"
            value="${stu.studentId}"
            ${isChecked ? 'checked' : ''}
            ${isDisabled ? 'disabled' : ''}
          />
          <span>${stu.fullName} (${stu.studentId}) ${isSelf ? '— คุณ' : ''}</span>
        </label>
      `;
    })
    .join('');

  renderDraftFilesAndLinks();
  openModalById('submitModalBackdrop');
}

function handleAddFilesToDraft(fileList) {
  Array.from(fileList).forEach((file) => {
    draftFiles.push({
      name: file.name,
      size: file.size || 102400,
      type: file.type || 'application/octet-stream',
      rawFile: file,
      contentText: `Submitted file: ${file.name} (${file.size} bytes) by ${getCurrentUser().fullName}`
    });
  });
  renderDraftFilesAndLinks();
}

function renderDraftFilesAndLinks() {
  const filesListEl = document.getElementById('attachedFilesList');
  filesListEl.innerHTML = draftFiles
    .map(
      (f, idx) => `
      <li class="attached-chip-item">
        <span>📎 <strong>${f.name}</strong> <small>(${Math.round((f.size || 1024) / 1024)} KB)</small></span>
        <button type="button" class="remove-chip-btn" data-remove-file="${idx}">ลบไฟล์</button>
      </li>
    `
    )
    .join('');

  const linksListEl = document.getElementById('attachedLinksList');
  linksListEl.innerHTML = draftLinks
    .map(
      (l, idx) => `
      <li class="attached-chip-item">
        <span>🔗 <strong>${l.label}:</strong> <a href="${l.url}" target="_blank" rel="noopener">${l.url}</a></span>
        <button type="button" class="remove-chip-btn" data-remove-link="${idx}">ลบลิงก์</button>
      </li>
    `
    )
    .join('');
}

// ============================================================================
// EXPORT CSV (EXCEL) & BULK ZIP DOWNLOAD FOR INSTRUCTOR
// ============================================================================
function exportGradesToCsv() {
  const headers = [
    'รหัสนักศึกษา',
    'ชื่อ-นามสกุล',
    'กลุ่มเรียน',
    'ใบงาน',
    'ชื่อกลุ่ม',
    'สถานะการส่ง',
    'เวลาส่ง',
    'ส่งสายหรือไม่',
    'คะแนนที่ได้',
    'คะแนนเต็ม',
    'คอมเมนต์อาจารย์'
  ];

  const rows = [];
  const students = appState.users.filter((u) => u.role === 'student');

  students.forEach((stu) => {
    appState.assignments.forEach((assign) => {
      const sub = findStudentSubmission(assign.id, stu.studentId);
      rows.push([
        stu.studentId,
        `"${stu.fullName}"`,
        stu.section,
        `"${assign.title}"`,
        `"${sub?.groupName || '-'}"`,
        sub ? sub.status : 'ยังไม่ส่ง',
        sub ? formatDateTimeThai(sub.submittedAt) : '-',
        sub ? (sub.isLate ? 'ส่งสาย (Late)' : 'ตรงเวลา') : '-',
        sub && typeof sub.score === 'number' ? sub.score : '',
        assign.maxScore,
        `"${(sub?.teacherFeedback || '').replace(/"/g, '""')}"`
      ]);
    });
  });

  const csvContent =
    '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Grades_${appState.course.courseCode}_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  showToast('📊 ดาวน์โหลดไฟล์คะแนน Excel (CSV) เรียบร้อยแล้ว');
}

async function downloadAllSubmissionsZip() {
  if (!window.JSZip) {
    showToast('กำลังโหลดโมดูลบีบอัดไฟล์ ZIP...');
    return;
  }

  const zip = new window.JSZip();
  const rootFolder = zip.folder(
    `${appState.course.courseCode}_All_Submissions`
  );

  if (appState.submissions.length === 0) {
    showToast('ยังไม่มีงานที่ส่งเข้ามาให้ดาวน์โหลด');
    return;
  }

  appState.submissions.forEach((sub) => {
    const assign = appState.assignments.find((a) => a.id === sub.assignmentId);
    const folderName = `${assign ? assign.title.replace(/[^a-zA-Z0-9ก-๙_-]/g, '_') : sub.assignmentId}/${sub.submittedBy}`;
    const subFolder = rootFolder.folder(folderName);

    // สร้างไฟล์สรุปข้อมูลการส่งงาน + ลิงก์ภายนอก + รายชื่อกลุ่ม
    const memberNames = (sub.memberIds || [sub.submittedBy])
      .map((id) => {
        const u = getUserById(id);
        return u ? `${u.fullName} (${u.studentId})` : id;
      })
      .join(', ');

    const infoSummary = [
      `ใบงาน: ${assign ? assign.title : sub.assignmentId}`,
      `ชื่อกลุ่ม: ${sub.groupName || 'งานเดี่ยว'}`,
      `สมาชิก: ${memberNames}`,
      `เวลาที่ส่ง: ${formatDateTimeThai(sub.submittedAt)} (${sub.isLate ? 'ส่งสาย Late' : 'ส่งตรงเวลา'})`,
      `โน้ตจากนักศึกษา: ${sub.studentNote || '-'}`,
      `คะแนนที่ได้: ${typeof sub.score === 'number' ? sub.score : 'รอตรวจ'}`,
      `คอมเมนต์อาจารย์: ${sub.teacherFeedback || '-'}`,
      `ลิงก์แนบภายนอก:`,
      ...(sub.externalLinks || []).map((l) => `  - ${l.label}: ${l.url}`)
    ].join('\n');

    subFolder.file('Submission_Details.txt', infoSummary);

    (sub.files || []).forEach((f) => {
      subFolder.file(
        f.name,
        f.contentText || `ไฟล์งานของนักศึกษา: ${f.name}`
      );
    });
  });

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${appState.course.courseCode}_Submissions_Bundle.zip`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('📦 ดาวน์โหลดไฟล์งานทั้งหมดเป็น ZIP เรียบร้อยแล้ว');
}

// ============================================================================
// MODAL HELPERS & NAVIGATION WIRING
// ============================================================================
function openModalById(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.add('open');
    el.setAttribute('aria-hidden', 'false');
  }
}

function closeModalById(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.remove('open');
    el.setAttribute('aria-hidden', 'true');
  }
}

function switchActiveTab(tabName) {
  // Map 'assignments' to 'dashboard' view and scroll to assignments box
  const viewMap = {
    dashboard: 'viewDashboard',
    assignments: 'viewDashboard',
    grades: 'viewGrades',
    instructor: 'viewInstructor',
    profile: 'viewProfile'
  };

  const targetViewId = viewMap[tabName] || 'viewDashboard';

  document.querySelectorAll('.tab-view').forEach((v) => {
    v.classList.toggle('active', v.id === targetViewId);
  });

  document.querySelectorAll('.sidebar-nav .nav-item').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });

  document.querySelectorAll('.mobile-bottom-nav .m-nav-tab').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });

  // แสดงปุ่มเขียว "+ สร้างใบงานใหม่" เฉพาะเมื่อเป็นอาจารย์ และกำลังเปิดหน้าจัดการใบงาน (instructor) เท่านั้น
  const heroCreateBtn = document.getElementById('heroCreateAssignmentBtn');
  if (heroCreateBtn) {
    const isTeacher = getCurrentUser().role === 'teacher';
    const showGreenCreateBtn = isTeacher && tabName === 'instructor';
    heroCreateBtn.hidden = !showGreenCreateBtn;
    heroCreateBtn.style.display = showGreenCreateBtn ? '' : 'none';
  }

  // Close mobile sidebar drawer if open
  document.getElementById('mainSidebar').classList.remove('mobile-open');
}

// ============================================================================
// EVENT LISTENERS INITIALIZATION
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  initSupabaseConnection();
  renderAll();

  // 1. Quick Role Switcher (Sarah / Namo / Teacher)
  document.getElementById('quickStudentBtn').addEventListener('click', () => {
    appState.currentUserId = '67010101';
    savePortalState();
    renderAll();
    switchActiveTab('dashboard');
    showToast('👩‍🎓 สลับเป็นบัญชีนักศึกษา: Sarah Jenkins (67010101)');
  });

  document.getElementById('quickStudent2Btn').addEventListener('click', () => {
    appState.currentUserId = '67010102';
    savePortalState();
    renderAll();
    switchActiveTab('dashboard');
    showToast('🧑‍🎓 สลับเป็นบัญชีนักศึกษา: นะโม (67010102) — เห็นงานกลุ่มที่ส่งคู่กับ Sarah');
  });

  document.getElementById('quickTeacherBtn').addEventListener('click', () => {
    appState.currentUserId = 'T001';
    savePortalState();
    renderAll();
    switchActiveTab('instructor');
    showToast('👨‍🏫 สลับเป็นฝั่งอาจารย์ผู้สอน: จัดการใบงานและตรวจให้คะแนน');
  });

  // 3. Sidebar & Mobile Bottom Tab Navigation
  document.querySelectorAll('[data-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      switchActiveTab(btn.dataset.tab);
    });
  });

  // Mobile Hamburger Drawer
  document.getElementById('mobileDrawerBtn').addEventListener('click', () => {
    document.getElementById('mainSidebar').classList.toggle('mobile-open');
  });

  // 4. Notification Bell Toggle & Mark Read
  const bellPopover = document.getElementById('notificationPopover');
  const toggleNotifications = () => {
    document.getElementById('profileMenuPopover')?.classList.remove('open');
    bellPopover.classList.toggle('open');
  };
  document
    .getElementById('bellToggleBtn')
    .addEventListener('click', toggleNotifications);

  document.getElementById('markAllReadBtn').addEventListener('click', () => {
    appState.notifications.forEach((n) => {
      n.isRead = true;
    });
    savePortalState();
    renderNotifications();
    showToast('ทำเครื่องหมายว่าอ่านการแจ้งเตือนทั้งหมดแล้ว');
  });

  // 5. Filter Chips on Student Dashboard
  document.querySelectorAll('[data-filter]').forEach((chip) => {
    chip.addEventListener('click', () => {
      currentFilter = chip.dataset.filter;
      document
        .querySelectorAll('[data-filter]')
        .forEach((c) => c.classList.toggle('active', c === chip));
      renderStudentAssignmentsGrid();
    });
  });

  // 6. Delegated Click Events (Open Submit Modal, Download File, Open Grade Modal, Edit/Delete Assignment)
  document.body.addEventListener('click', (e) => {
    // Close modal button
    const closeBtn = e.target.closest('[data-close-modal]');
    if (closeBtn) {
      closeModalById(closeBtn.dataset.closeModal);
      return;
    }

    // Open Submit Assignment Modal
    const submitTrigger = e.target.closest('[data-open-submit]');
    if (submitTrigger) {
      if (!appState.currentUserId) {
        showToast('🔒 กรุณาเข้าสู่ระบบก่อนส่งงาน');
        openFullAuthPage('login');
        return;
      }
      openSubmitModal(submitTrigger.dataset.openSubmit);
      return;
    }

    // Remove draft file
    const rmFileBtn = e.target.closest('[data-remove-file]');
    if (rmFileBtn) {
      draftFiles.splice(Number(rmFileBtn.dataset.removeFile), 1);
      renderDraftFilesAndLinks();
      return;
    }

    // Remove draft link
    const rmLinkBtn = e.target.closest('[data-remove-link]');
    if (rmLinkBtn) {
      draftLinks.splice(Number(rmLinkBtn.dataset.removeLink), 1);
      renderDraftFilesAndLinks();
      return;
    }

    // Copy Hex Swatch in Style Guide
    const swatchBtn = e.target.closest('[data-copy]');
    if (swatchBtn) {
      const code = swatchBtn.dataset.copy;
      navigator.clipboard?.writeText(code);
      showToast(`🎨 คัดลอกรหัสสี ${code} เรียบร้อยแล้ว`);
      return;
    }

    // Download individual submitted file
    const dlFileLink = e.target.closest('[data-download-sub]');
    if (dlFileLink) {
      e.preventDefault();
      const sub = appState.submissions.find(
        (s) => s.id === dlFileLink.dataset.downloadSub
      );
      const fileObj = sub?.files?.[Number(dlFileLink.dataset.fileIdx)];
      if (fileObj) {
        if (fileObj.url) {
          window.open(fileObj.url, '_blank', 'noopener');
          showToast(`กำลังเปิดไฟล์จาก Supabase Storage: ${fileObj.name}`);
          return;
        }
        const blob = new Blob(
          [fileObj.contentText || `ไฟล์งาน: ${fileObj.name}`],
          { type: 'text/plain;charset=utf-8' }
        );
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileObj.name;
        a.click();
        URL.revokeObjectURL(url);
        showToast(`กำลังดาวน์โหลดไฟล์ ${fileObj.name}`);
      }
      return;
    }

    // Open Instructor Grading Modal
    const gradeBtn = e.target.closest('[data-open-grade]');
    if (gradeBtn) {
      const subId = gradeBtn.dataset.openGrade;
      const sub = appState.submissions.find((s) => s.id === subId);
      if (!sub) return;
      const assign = appState.assignments.find(
        (a) => a.id === sub.assignmentId
      );

      document.getElementById('gradeSubmissionId').value = sub.id;
      document.getElementById('gradeModalTitle').textContent =
        `ตรวจงาน: ${assign ? assign.title : sub.assignmentId}`;
      document.getElementById('gradeModalSub').textContent =
        `ส่งเมื่อ ${formatDateTimeThai(sub.submittedAt)} ${sub.isLate ? '(ส่งสาย Late)' : '(ตรงเวลา)'}`;
      document.getElementById('gradeMaxScoreLabel').textContent =
        `เต็ม ${assign ? assign.maxScore : 100}`;
      document.getElementById('gradeScoreInput').value =
        typeof sub.score === 'number' ? sub.score : assign?.maxScore || 100;
      document.getElementById('gradeStatusSelect').value =
        sub.status === 'pending_review' ? 'graded' : sub.status;
      document.getElementById('gradeFeedbackInput').value =
        sub.teacherFeedback || '';

      const membersStr = (sub.memberIds || [sub.submittedBy])
        .map((id) => getUserById(id)?.fullName || id)
        .join(', ');

      document.getElementById('gradeSubmissionDetailsBox').innerHTML = `
        <div><strong>ผู้ส่ง / สมาชิกกลุ่ม:</strong> ${sub.groupName ? `[${sub.groupName}] ` : ''}${membersStr}</div>
        <div><strong>ไฟล์ที่แนบ:</strong> ${(sub.files || []).map((f) => f.name).join(', ') || 'ไม่มีไฟล์'}</div>
        <div><strong>ลิงก์ภายนอก:</strong> ${(sub.externalLinks || []).map((l) => `<a href="${l.url}" target="_blank">${l.label}</a>`).join(', ') || 'ไม่มีลิงก์'}</div>
        <div><strong>บันทึกจากนักศึกษา:</strong> ${sub.studentNote || '-'}</div>
      `;

      openModalById('gradeModalBackdrop');
      return;
    }

    // Edit Assignment
    const editAssignBtn = e.target.closest('[data-edit-assign]');
    if (editAssignBtn) {
      const assign = appState.assignments.find(
        (a) => a.id === editAssignBtn.dataset.editAssign
      );
      if (!assign) return;
      document.getElementById('editAssignmentId').value = assign.id;
      document.getElementById('createAssignModalTitle').textContent =
        'แก้ไขใบงาน (Edit Assignment)';
      document.getElementById('assignTitleInput').value = assign.title;
      document.getElementById('assignDescInput').value =
        assign.description || '';
      document.getElementById('assignDueDateInput').value =
        assign.dueDate.slice(0, 16);
      document.getElementById('assignMaxScoreInput').value = assign.maxScore;
      document.getElementById('assignWorkTypeInput').value = assign.workType;
      document.getElementById('assignThemeColorInput').value =
        assign.themeColor || 'navy';
      openModalById('createAssignmentBackdrop');
      return;
    }

    // Delete Assignment
    const delAssignBtn = e.target.closest('[data-delete-assign]');
    if (delAssignBtn) {
      const id = delAssignBtn.dataset.deleteAssign;
      appState.assignments = appState.assignments.filter((a) => a.id !== id);
      if (supabaseClient) {
        supabaseClient.from('assignments').delete().eq('id', id).then(() => {});
      }
      savePortalState();
      renderAll();
      showToast('ลบใบงานเรียบร้อยแล้ว');
    }
  });

  // 7. Upload Modal File Picker & Drag-and-Drop
  const modalDropArea = document.getElementById('modalDropArea');
  const modalFilePicker = document.getElementById('modalFilePicker');

  document.getElementById('browseFilesBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    modalFilePicker.click();
  });

  modalDropArea.addEventListener('click', () => modalFilePicker.click());
  modalDropArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    modalDropArea.style.borderColor = 'var(--navy)';
  });
  modalDropArea.addEventListener('dragleave', () => {
    modalDropArea.style.borderColor = '';
  });
  modalDropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    modalDropArea.style.borderColor = '';
    if (e.dataTransfer.files?.length) {
      handleAddFilesToDraft(e.dataTransfer.files);
    }
  });

  modalFilePicker.addEventListener('change', () => {
    if (modalFilePicker.files?.length) {
      handleAddFilesToDraft(modalFilePicker.files);
      modalFilePicker.value = '';
    }
  });

  // Quick Dropzone on Dashboard
  const quickDropzone = document.getElementById('quickDropzone');
  const quickDropInput = document.getElementById('quickDropInput');

  quickDropzone.addEventListener('click', () => quickDropInput.click());
  quickDropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    quickDropzone.classList.add('dragover');
  });
  quickDropzone.addEventListener('dragleave', () => {
    quickDropzone.classList.remove('dragover');
  });
  quickDropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    quickDropzone.classList.remove('dragover');
    const firstPending =
      appState.assignments.find(
        (a) => !findStudentSubmission(a.id, getCurrentUser().studentId)
      ) || appState.assignments[0];
    if (firstPending) {
      openSubmitModal(firstPending.id, e.dataTransfer.files);
    }
  });

  quickDropInput.addEventListener('change', () => {
    const firstPending =
      appState.assignments.find(
        (a) => !findStudentSubmission(a.id, getCurrentUser().studentId)
      ) || appState.assignments[0];
    if (firstPending && quickDropInput.files?.length) {
      openSubmitModal(firstPending.id, quickDropInput.files);
      quickDropInput.value = '';
    }
  });

  // Add External Link Button
  document.getElementById('addExtLinkBtn').addEventListener('click', () => {
    const titleEl = document.getElementById('extLinkTitleInput');
    const urlEl = document.getElementById('extLinkUrlInput');
    const url = urlEl.value.trim();
    if (!url) {
      showToast('กรุณากรอก URL ลิงก์งานก่อนกดเพิ่ม');
      return;
    }
    draftLinks.push({
      label: titleEl.value.trim() || 'ลิงก์งานแนบ',
      url: url.startsWith('http') ? url : `https://${url}`
    });
    titleEl.value = '';
    urlEl.value = '';
    renderDraftFilesAndLinks();
  });

  // Submit Work Form
  document
    .getElementById('submissionForm')
    .addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!activeAssignmentForModal) return;

      if (draftFiles.length === 0 && draftLinks.length === 0) {
        showToast('⚠️ กรุณาอัปโหลดไฟล์อย่างน้อย 1 ไฟล์ หรือแนบลิงก์งานก่อนกดส่ง');
        return;
      }

      const user = getCurrentUser();
      const checkedMembers = Array.from(
        document.querySelectorAll('input[name="groupMemberCheckbox"]:checked')
      ).map((cb) => cb.value);

      if (!checkedMembers.includes(user.studentId)) {
        checkedMembers.unshift(user.studentId);
      }

      const lateStatus = isPastDeadline(activeAssignmentForModal.dueDate);
      const existingIdx = appState.submissions.findIndex(
        (s) =>
          s.assignmentId === activeAssignmentForModal.id &&
          (s.submittedBy === user.studentId ||
            (Array.isArray(s.memberIds) &&
              s.memberIds.includes(user.studentId)))
      );

      // อัปโหลดไฟล์จริงขึ้น Supabase Storage Bucket ('submissions') หากเชื่อมต่อแล้ว
      const uploadedFilesMeta = [];
      for (const f of draftFiles) {
        let publicFileUrl = f.url || null;
        if (supabaseClient && f.rawFile) {
          try {
            const safeName = f.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            const storagePath = `${activeAssignmentForModal.id}/${user.studentId}_${Date.now()}_${safeName}`;
            const { error: upErr } = await supabaseClient.storage
              .from('submissions')
              .upload(storagePath, f.rawFile, { upsert: true });
            if (!upErr) {
              const { data: pubData } = supabaseClient.storage
                .from('submissions')
                .getPublicUrl(storagePath);
              publicFileUrl = pubData?.publicUrl || null;
            }
          } catch (storageErr) {
            console.warn('Storage upload warning:', storageErr);
          }
        }
        uploadedFilesMeta.push({
          name: f.name,
          size: f.size,
          type: f.type,
          url: publicFileUrl,
          contentText: f.contentText
        });
      }

      const newSubmissionObj = {
        id:
          existingIdx >= 0
            ? appState.submissions[existingIdx].id
            : `sub-${Date.now()}`,
        assignmentId: activeAssignmentForModal.id,
        submittedBy: user.studentId,
        groupName: document.getElementById('groupNameInput').value.trim(),
        memberIds: checkedMembers,
        files: uploadedFilesMeta,
        externalLinks: [...draftLinks],
        studentNote: document
          .getElementById('submissionNoteInput')
          .value.trim(),
        submittedAt: new Date().toISOString(),
        isLate: lateStatus,
        resubmitCount:
          existingIdx >= 0
            ? (appState.submissions[existingIdx].resubmitCount || 0) + 1
            : 0,
        status: 'pending_review',
        score:
          existingIdx >= 0 ? appState.submissions[existingIdx].score : undefined,
        teacherFeedback:
          existingIdx >= 0
            ? appState.submissions[existingIdx].teacherFeedback
            : ''
      };

      if (existingIdx >= 0) {
        appState.submissions[existingIdx] = newSubmissionObj;
      } else {
        appState.submissions.unshift(newSubmissionObj);
      }

      // Add notification
      appState.notifications.unshift({
        id: `notif-${Date.now()}`,
        targetUserId: user.studentId,
        title: lateStatus
          ? '📤 ส่งงานเรียบร้อยแล้ว (สถานะ: ส่งสาย Late)'
          : '📤 ส่งงานสำเร็จเรียบร้อยแล้ว!',
        message: `${activeAssignmentForModal.title} • สมาชิก: ${checkedMembers.length} คน`,
        type: 'info',
        isRead: false,
        createdAt: 'เมื่อสักครู่'
      });

      savePortalState();
      closeModalById('submitModalBackdrop');
      renderAll();
      showToast(
        lateStatus
          ? '✅ ส่งงานสำเร็จ (บันทึกสถานะ: ส่งสาย Late)'
          : '✅ ส่งงานสำเร็จเรียบร้อยแล้ว!'
      );
    });

  // 8. Dedicated Full-Page Authentication Screen (แยกหน้าล็อกอินและสมัครสมาชิกสลับกันแบบเต็มหน้า)
  const authScreenEl = document.getElementById('authPageScreen');
  const deviceStageEl = document.getElementById('deviceStage');

  const switchAuthFormTab = (mode) => {
    document
      .querySelectorAll('.auth-tabs [data-auth-tab]')
      .forEach((b) => b.classList.toggle('active', b.dataset.authTab === mode));
    document
      .getElementById('loginForm')
      .classList.toggle('active', mode === 'login');
    document
      .getElementById('registerForm')
      .classList.toggle('active', mode === 'register');
  };

  const openFullAuthPage = (defaultTab = 'login') => {
    switchAuthFormTab(defaultTab);
    deviceStageEl.hidden = true;
    authScreenEl.hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeFullAuthPage = () => {
    authScreenEl.hidden = true;
    deviceStageEl.hidden = false;
  };

  // เมนูโปรไฟล์มุมขวาบน (Compact Profile Dropdown Menu ตามภาพที่ 2)
  const profileChipEl = document.getElementById('headerProfileChip');
  const profilePopoverEl = document.getElementById('profileMenuPopover');

  if (profileChipEl && profilePopoverEl) {
    profileChipEl.addEventListener('click', (e) => {
      e.stopPropagation();
      // ปิดกล่องแจ้งเตือนถ้าเปิดค้างอยู่
      document.getElementById('notificationPopover')?.classList.remove('open');
      profilePopoverEl.classList.toggle('open');
    });
  }

  // ฟังก์ชันออกจากระบบจริง (Log Out) -> ล้างผู้ใช้ปัจจุบันและแสดงปุ่มสีฟ้า "เข้าสู่ระบบ / สมัครสมาชิก" มุมขวาบน
  const performLogout = () => {
    profilePopoverEl?.classList.remove('open');
    appState.currentUserId = null;
    savePortalState();
    renderAll();
    switchActiveTab('dashboard');
    showToast('👋 ออกจากระบบเรียบร้อยแล้ว กดปุ่ม "เข้าสู่ระบบ / สมัครสมาชิก" มุมขวาบนเพื่อเข้าใช้งาน');
  };

  // ปุ่ม "ดูโปรไฟล์ของคุณ" ในเมนูโปรไฟล์ -> เปิดหน้า Profile
  const goProfileBtn = document.getElementById('popoverGoProfileBtn');
  if (goProfileBtn) {
    goProfileBtn.addEventListener('click', () => {
      profilePopoverEl?.classList.remove('open');
      switchActiveTab('profile');
    });
  }

  // ปุ่ม "เข้าสู่ระบบ / สมัครสมาชิกใหม่" ในเมนูโปรไฟล์
  const popSwitchAuthBtn = document.getElementById('popoverSwitchAuthBtn');
  if (popSwitchAuthBtn) {
    popSwitchAuthBtn.addEventListener('click', () => {
      profilePopoverEl?.classList.remove('open');
      openFullAuthPage('login');
    });
  }

  // ปุ่มสีฟ้า "เข้าสู่ระบบ / สมัครสมาชิก" มุมขวาบน (แสดงเมื่อออกจากระบบแล้ว)
  const headerGuestAuthBtn = document.getElementById('headerGuestAuthBtn');
  if (headerGuestAuthBtn) {
    headerGuestAuthBtn.addEventListener('click', () => {
      openFullAuthPage('login');
    });
  }

  // ปุ่ม "ออกจากระบบ (Log Out)" ในเมนูโปรไฟล์ -> ออกจากระบบจริง
  const popLogoutBtn = document.getElementById('popoverLogoutBtn');
  if (popLogoutBtn) {
    popLogoutBtn.addEventListener('click', performLogout);
  }

  // คลิกพื้นที่ว่างข้างนอกให้ปิดเมนูโปรไฟล์และกล่องแจ้งเตือนอัตโนมัติ
  document.addEventListener('click', (e) => {
    if (
      profilePopoverEl?.classList.contains('open') &&
      !e.target.closest('.profile-dropdown-wrapper')
    ) {
      profilePopoverEl.classList.remove('open');
    }
    if (
      bellPopover?.classList.contains('open') &&
      !e.target.closest('.notification-wrapper')
    ) {
      bellPopover.classList.remove('open');
    }
  });

  document
    .getElementById('profileSwitchAccountBtn')
    ?.addEventListener('click', () => openFullAuthPage('login'));

  const backToPortalBtn = document.getElementById('backToPortalFromAuthBtn');
  if (backToPortalBtn) {
    backToPortalBtn.addEventListener('click', closeFullAuthPage);
  }

  document.querySelectorAll('[data-auth-tab]').forEach((tabBtn) => {
    tabBtn.addEventListener('click', () => {
      switchAuthFormTab(tabBtn.dataset.authTab);
    });
  });

  // ปุ่มคลิกเข้าสู่ระบบด่วนในหน้าล็อกอิน (1-Click Demo Login)
  document.querySelectorAll('[data-quick-login]').forEach((quickBtn) => {
    quickBtn.addEventListener('click', () => {
      const targetId = quickBtn.dataset.quickLogin;
      const matched = appState.users.find((u) => u.studentId === targetId);
      if (matched) {
        appState.currentUserId = matched.studentId;
        savePortalState();
        closeFullAuthPage();
        renderAll();
        switchActiveTab(matched.role === 'teacher' ? 'instructor' : 'dashboard');
        showToast(`👋 เข้าสู่ระบบสำเร็จ: ${matched.fullName}`);
      }
    });
  });

  document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('loginStudentId').value.trim();
    const pw = document.getElementById('loginPassword').value.trim();
    const matched = appState.users.find(
      (u) =>
        u.studentId.toLowerCase() === id.toLowerCase() && u.passwordHash === pw
    );

    if (!matched) {
      showToast('❌ รหัสนักศึกษาหรือรหัสผ่านไม่ถูกต้อง (บัญชีตัวอย่างใช้รหัสผ่าน 1234)');
      return;
    }

    appState.currentUserId = matched.studentId;
    savePortalState();
    closeFullAuthPage();
    renderAll();
    switchActiveTab(matched.role === 'teacher' ? 'instructor' : 'dashboard');
    showToast(`👋 ยินดีต้อนรับ ${matched.fullName}`);
  });

  // เปลี่ยนข้อความป้ายกำกับอัตโนมัติเวลาเลือกประเภทบัญชี (นักศึกษา vs อาจารย์) ในหน้าสมัครสมาชิกใหม่
  const regRoleSelectEl = document.getElementById('regRoleSelect');
  if (regRoleSelectEl) {
    regRoleSelectEl.addEventListener('change', () => {
      const isTeacherRole = regRoleSelectEl.value === 'teacher';
      const idLabel = document.getElementById('regIdLabel');
      const idInput = document.getElementById('regStudentId');
      const secInput = document.getElementById('regSection');
      if (idLabel) {
        idLabel.textContent = isTeacherRole
          ? 'รหัสอาจารย์ผู้สอน (ใช้สำหรับเข้าสู่ระบบ)'
          : 'รหัสนักศึกษา (ใช้สำหรับเข้าสู่ระบบ)';
      }
      if (idInput) {
        idInput.placeholder = isTeacherRole ? 'เช่น T002' : 'เช่น 67010106';
      }
      if (secInput) {
        secInput.value = isTeacherRole ? 'Instructor' : 'Sec 01';
      }
    });
  }

  document.getElementById('registerForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const selectedRole =
      document.getElementById('regRoleSelect')?.value || 'student';
    const studentId = document.getElementById('regStudentId').value.trim();
    const fullName = document.getElementById('regFullName').value.trim();
    const section = document.getElementById('regSection').value.trim();
    const passwordHash = document.getElementById('regPassword').value.trim();

    if (
      appState.users.some(
        (u) => u.studentId.toLowerCase() === studentId.toLowerCase()
      )
    ) {
      showToast('⚠️ รหัสผู้ใช้งานนี้มีในระบบแล้ว กรุณาเข้าสู่ระบบ');
      return;
    }

    const newUser = {
      studentId,
      passwordHash,
      fullName,
      nickname: fullName.split(' ')[0],
      role: selectedRole,
      section: section || (selectedRole === 'teacher' ? 'Instructor' : 'Sec 01'),
      avatarUrl:
        selectedRole === 'teacher'
          ? 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80'
          : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'
    };

    appState.users.push(newUser);
    appState.currentUserId = newUser.studentId;
    savePortalState();
    closeFullAuthPage();
    renderAll();
    switchActiveTab(newUser.role === 'teacher' ? 'instructor' : 'dashboard');
    showToast(
      `🎉 สมัครสมาชิก (${newUser.role === 'teacher' ? 'อาจารย์ผู้สอน' : 'นักศึกษา'}) สำเร็จ! เข้าสู่ระบบในชื่อ ${newUser.fullName}`
    );
  });

  // 9. Instructor Actions: Create/Edit Assignment, Course Config, Grade Submission
  const openCreateAssign = () => {
    document.getElementById('editAssignmentId').value = '';
    document.getElementById('createAssignModalTitle').textContent =
      'สร้างใบงานใหม่ (Create Assignment)';
    document.getElementById('assignTitleInput').value = '';
    document.getElementById('assignDescInput').value = '';
    document.getElementById('assignDueDateInput').value = '2026-11-15T23:59';
    document.getElementById('assignMaxScoreInput').value = '100';
    openModalById('createAssignmentBackdrop');
  };

  document
    .getElementById('openCreateAssignmentModalBtn')
    ?.addEventListener('click', openCreateAssign);
  document
    .getElementById('heroCreateAssignmentBtn')
    ?.addEventListener('click', openCreateAssign);

  document
    .getElementById('createAssignmentForm')
    .addEventListener('submit', (e) => {
      e.preventDefault();
      const editId = document.getElementById('editAssignmentId').value;
      const title = document.getElementById('assignTitleInput').value.trim();
      const description = document
        .getElementById('assignDescInput')
        .value.trim();
      const dueDate = document.getElementById('assignDueDateInput').value;
      const maxScore = Number(
        document.getElementById('assignMaxScoreInput').value
      );
      const workType = document.getElementById('assignWorkTypeInput').value;
      const themeColor = document.getElementById('assignThemeColorInput').value;

      if (editId) {
        const idx = appState.assignments.findIndex((a) => a.id === editId);
        if (idx >= 0) {
          appState.assignments[idx] = {
            ...appState.assignments[idx],
            title,
            description,
            dueDate,
            displayDue: formatDueDateDisplay(dueDate),
            maxScore,
            workType,
            themeColor
          };
        }
        showToast('✅ อัปเดตข้อมูลใบงานเรียบร้อยแล้ว');
      } else {
        const newAssign = {
          id: `assign-${Date.now()}`,
          title,
          description,
          dueDate,
          displayDue: formatDueDateDisplay(dueDate),
          maxScore,
          workType,
          allowLate: true,
          themeColor,
          badgeLabel: 'กล่องส่ง'
        };
        appState.assignments.push(newAssign);

        appState.notifications.unshift({
          id: `notif-${Date.now()}`,
          targetUserId: 'ALL_STUDENTS',
          title: '📌 อาจารย์สั่งใบงานใหม่!',
          message: `${title} • กำหนดส่ง ${formatDueDateDisplay(dueDate)} (${maxScore} คะแนน)`,
          type: 'new_assignment',
          isRead: false,
          createdAt: 'เมื่อสักครู่'
        });
        showToast('✅ สร้างใบงานใหม่และแจ้งเตือนนักศึกษาเรียบร้อยแล้ว');
      }

      savePortalState();
      closeModalById('createAssignmentBackdrop');
      renderAll();
    });

  document
    .getElementById('courseConfigForm')
    .addEventListener('submit', (e) => {
      e.preventDefault();
      appState.course.courseSubtitle = document
        .getElementById('cfgCourseSubtitle')
        .value.trim();
      appState.course.courseTitle = document
        .getElementById('cfgCourseTitle')
        .value.trim();
      appState.course.semester = document
        .getElementById('cfgSemester')
        .value.trim();
      savePortalState();
      renderAll();
      showToast('บันทึกการตั้งค่าชื่อวิชาเรียบร้อยแล้ว');
    });

  document
    .getElementById('instructorAssignmentFilter')
    .addEventListener('change', () => {
      renderInstructorPortal();
    });

  document
    .getElementById('gradeSubmissionForm')
    .addEventListener('submit', (e) => {
      e.preventDefault();
      const subId = document.getElementById('gradeSubmissionId').value;
      const score = Number(document.getElementById('gradeScoreInput').value);
      const status = document.getElementById('gradeStatusSelect').value;
      const feedback = document
        .getElementById('gradeFeedbackInput')
        .value.trim();

      const sub = appState.submissions.find((s) => s.id === subId);
      if (!sub) return;
      const assign = appState.assignments.find(
        (a) => a.id === sub.assignmentId
      );

      sub.score = score;
      sub.status = status;
      sub.teacherFeedback = feedback;
      sub.gradedAt = new Date().toISOString();

      // Notify all group members
      (sub.memberIds || [sub.submittedBy]).forEach((stuId) => {
        appState.notifications.unshift({
          id: `notif-${Date.now()}-${stuId}`,
          targetUserId: stuId,
          title:
            status === 'needs_revision'
              ? '🔄 อาจารย์แจ้งให้แก้ไขงาน (Resubmit)'
              : '🎉 อาจารย์ตรวจและให้คะแนนงานแล้ว!',
          message: `${assign ? assign.title : sub.assignmentId}: ได้ ${score}/${assign?.maxScore || 100} คะแนน ${feedback ? `("${feedback}")` : ''}`,
          type: status === 'needs_revision' ? 'revision' : 'graded',
          isRead: false,
          createdAt: 'เมื่อสักครู่'
        });
      });

      savePortalState();
      closeModalById('gradeModalBackdrop');
      renderAll();
      showToast('✅ บันทึกคะแนนและแจ้งเตือนนักศึกษาทุกคนในกลุ่มแล้ว');
    });

  // Export CSV & Bulk ZIP
  document
    .getElementById('exportGradesCsvBtn')
    .addEventListener('click', exportGradesToCsv);
  document
    .getElementById('downloadAllZipBtn')
    .addEventListener('click', downloadAllSubmissionsZip);

  // 10. Database Connection Settings Modal
  const openDbModal = () => openModalById('dbConfigBackdrop');
  document
    .getElementById('openDbConfigBtn')
    .addEventListener('click', openDbModal);
  document
    .getElementById('profileOpenDbModalBtn')
    .addEventListener('click', openDbModal);

  const copySqlBtn = document.getElementById('copySqlSchemaBtn');
  if (copySqlBtn) {
    copySqlBtn.addEventListener('click', () => {
      navigator.clipboard?.writeText(SUPABASE_SCHEMA_SQL_TEXT);
      showToast('📋 คัดลอกโค้ด SQL เรียบร้อย! นำไปวางในเมนู SQL Editor ของ Supabase แล้วกด Run ได้เลย');
    });
  }

  document.getElementById('dbConfigForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const url = document.getElementById('supabaseUrlInput').value.trim();
    const anonKey = document.getElementById('supabaseKeyInput').value.trim();
    localStorage.setItem(
      STORAGE_KEYS.SUPABASE_CFG,
      JSON.stringify({ url, anonKey })
    );
    initSupabaseConnection();
    closeModalById('dbConfigBackdrop');
    showToast('☁️ บันทึกและเชื่อมต่อฐานข้อมูล Supabase เรียบร้อยแล้ว');
  });

  document.getElementById('resetDemoDataBtn').addEventListener('click', () => {
    appState = getInitialSeedState();
    savePortalState();
    renderAll();
    closeModalById('dbConfigBackdrop');
    showToast('🔄 รีเซ็ตข้อมูลตัวอย่างเริ่มต้นเรียบร้อยแล้ว');
  });
});
