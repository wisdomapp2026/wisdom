-- 1. Users Table (Maps to users collection, references auth.users)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    phone TEXT NOT NULL,
    name TEXT NOT NULL,
    avatar TEXT,
    role TEXT NOT NULL CHECK (role IN ('admin', 'student')),
    grade TEXT,
    is_banned BOOLEAN DEFAULT false,
    banned_at BIGINT,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);

-- 2. Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    "order" BIGINT NOT NULL,
    created_at BIGINT NOT NULL
);

-- 3. Courses Table
CREATE TABLE IF NOT EXISTS courses (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    cover_image TEXT,
    cover_position TEXT,
    cover_fit TEXT,
    hero_image TEXT,
    hero_image_position TEXT,
    hero_image_fit TEXT,
    is_premium BOOLEAN DEFAULT false,
    is_hidden BOOLEAN DEFAULT false,
    show_on_homepage BOOLEAN DEFAULT true,
    price BIGINT,
    course_price BIGINT,
    pricing_type TEXT,
    subscription_plans JSONB, -- Array of pricing plans
    premium_benefits JSONB, -- Array of strings
    total_students BIGINT DEFAULT 0,
    online_now BIGINT DEFAULT 0,
    test_after_every BIGINT DEFAULT 0,
    unlock_mode TEXT DEFAULT 'open',
    tags JSONB, -- Array of strings
    "order" BIGINT NOT NULL,
    introduction JSONB, -- CourseIntroduction object
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- 4. Folders Table (Subcollection of courses)
CREATE TABLE IF NOT EXISTS folders (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    cover_image TEXT,
    "order" BIGINT NOT NULL,
    is_premium BOOLEAN DEFAULT false,
    is_hidden BOOLEAN DEFAULT false,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);

-- 5. Topics Table (Subcollection of courses)
CREATE TABLE IF NOT EXISTS topics (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    folder_id TEXT REFERENCES folders(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT,
    "order" BIGINT NOT NULL,
    is_premium BOOLEAN DEFAULT false,
    is_hidden BOOLEAN DEFAULT false,
    introduction JSONB,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);

-- 6. Problems Table (Subcollection of topics)
CREATE TABLE IF NOT EXISTS problems (
    id TEXT PRIMARY KEY,
    topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    image TEXT,
    difficulty TEXT NOT NULL,
    "order" BIGINT NOT NULL,
    is_premium BOOLEAN DEFAULT false,
    is_hidden BOOLEAN DEFAULT false,
    video_url TEXT,
    video_type TEXT,
    solution JSONB, -- Array of SolutionStep
    solution_image TEXT,
    tags JSONB, -- Array of tags
    estimated_minutes BIGINT,
    created_at BIGINT NOT NULL
);

-- 7. Tests Table (Subcollection of courses)
CREATE TABLE IF NOT EXISTS tests (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    folder_id TEXT REFERENCES folders(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    version TEXT NOT NULL,
    status TEXT NOT NULL,
    is_premium BOOLEAN DEFAULT false,
    grade_level TEXT,
    subject TEXT,
    passing_score BIGINT NOT NULL,
    shuffle_questions BOOLEAN DEFAULT false,
    total_points BIGINT NOT NULL,
    total_time BIGINT NOT NULL,
    questions JSONB NOT NULL, -- Array of Question
    after_topic_order BIGINT,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- 8. Test Lists Table
CREATE TABLE IF NOT EXISTS test_lists (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    test_ids JSONB NOT NULL, -- Array of test IDs
    status TEXT NOT NULL,
    course_id TEXT REFERENCES courses(id) ON DELETE CASCADE,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- 9. Test Results Table
CREATE TABLE IF NOT EXISTS test_results (
    id TEXT PRIMARY KEY,
    test_id TEXT REFERENCES tests(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    score BIGINT NOT NULL,
    correct_count BIGINT NOT NULL,
    total_questions BIGINT NOT NULL,
    time_taken BIGINT NOT NULL,
    grade TEXT NOT NULL,
    answers JSONB NOT NULL, -- Array of AnswerRecord
    completed_at BIGINT NOT NULL
);

-- 10. User Progress Table
CREATE TABLE IF NOT EXISTS user_progress (
    id TEXT PRIMARY KEY, -- user_id + course_id
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    completed_topics JSONB DEFAULT '[]'::jsonb, -- Array of topic IDs
    completed_problems JSONB DEFAULT '[]'::jsonb, -- Array of problem IDs
    current_topic_id TEXT,
    progress_percent BIGINT DEFAULT 0,
    total_xp BIGINT DEFAULT 0,
    streak BIGINT DEFAULT 0,
    weekly_minutes JSONB DEFAULT '[0,0,0,0,0,0,0]'::jsonb,
    last_accessed_at BIGINT NOT NULL,
    is_joined BOOLEAN DEFAULT false,
    enrolled_at BIGINT,
    test_xp BIGINT DEFAULT 0,
    test_results JSONB DEFAULT '{}'::jsonb
);

-- 11. Subscriptions Table
CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id TEXT REFERENCES courses(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    plan TEXT NOT NULL,
    price_per_month BIGINT NOT NULL,
    start_date BIGINT NOT NULL,
    end_date BIGINT NOT NULL,
    cancelled_at BIGINT,
    payment_method TEXT,
    promo_code TEXT
);

-- 12. Payments Table
CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    subscription_id TEXT,
    course_id TEXT REFERENCES courses(id) ON DELETE CASCADE,
    course_title TEXT NOT NULL,
    amount BIGINT NOT NULL,
    method TEXT NOT NULL,
    status TEXT NOT NULL,
    promo_code TEXT,
    discount BIGINT DEFAULT 0,
    card_number TEXT,
    sender_phone TEXT,
    recipient_card TEXT,
    screenshot_url TEXT,
    confirmed_at BIGINT,
    created_at BIGINT NOT NULL
);

-- 13. Messages Table
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    from_name TEXT NOT NULL,
    from_role TEXT NOT NULL,
    to_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at BIGINT NOT NULL
);

-- 14. Favorites Table
CREATE TABLE IF NOT EXISTS favorites (
    id TEXT PRIMARY KEY, -- user_id + topic_id
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    topic_title TEXT NOT NULL,
    created_at BIGINT NOT NULL
);

-- 15. User Activity Table
CREATE TABLE IF NOT EXISTS user_activity (
    id TEXT PRIMARY KEY, -- user_id + dateStr
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    "date" TEXT NOT NULL,
    total_minutes BIGINT DEFAULT 0,
    sessions JSONB NOT NULL, -- Array of ActivitySession
    last_active_at BIGINT NOT NULL
);

-- 16. News Items Table
CREATE TABLE IF NOT EXISTS news_items (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    body TEXT,
    "type" TEXT NOT NULL,
    image_url TEXT,
    video_url TEXT,
    video_type TEXT,
    duration TEXT,
    link_url TEXT,
    is_active BOOLEAN DEFAULT true,
    "order" BIGINT NOT NULL,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);

-- 17. Home Banners Table
CREATE TABLE IF NOT EXISTS home_banners (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    subtitle TEXT,
    button_text TEXT NOT NULL,
    course_id TEXT REFERENCES courses(id) ON DELETE CASCADE,
    link_url TEXT,
    bg_color TEXT NOT NULL,
    image_url TEXT,
    image_position TEXT,
    image_fit TEXT,
    image_full_width BOOLEAN DEFAULT false,
    image_opacity BIGINT DEFAULT 100,
    image_crop_top BIGINT DEFAULT 0,
    image_crop_bottom BIGINT DEFAULT 0,
    text_color TEXT,
    text_opacity BIGINT DEFAULT 100,
    show_button BOOLEAN DEFAULT true,
    button_position TEXT,
    is_active BOOLEAN DEFAULT true,
    "order" BIGINT NOT NULL,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);

-- 18. Testimonials Table
CREATE TABLE IF NOT EXISTS testimonials (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    avatar_url TEXT,
    role TEXT,
    text TEXT NOT NULL,
    rating BIGINT NOT NULL,
    is_active BOOLEAN DEFAULT false,
    "order" BIGINT DEFAULT 999,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);

-- 19. Motivational Phrases Table
CREATE TABLE IF NOT EXISTS motivational_phrases (
    id TEXT PRIMARY KEY,
    placement TEXT NOT NULL,
    text TEXT NOT NULL,
    "order" BIGINT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at BIGINT NOT NULL
);

-- 20. Motivation Settings Table
CREATE TABLE IF NOT EXISTS motivation_settings (
    id TEXT PRIMARY KEY, -- e.g. placement name
    placement TEXT NOT NULL,
    rotate_hours BIGINT NOT NULL,
    display_order TEXT NOT NULL,
    updated_at BIGINT NOT NULL
);

-- 21. Social Links Table (Combines root and course social links)
CREATE TABLE IF NOT EXISTS social_links (
    id TEXT PRIMARY KEY,
    course_id TEXT REFERENCES courses(id) ON DELETE CASCADE, -- null if root social link
    platform TEXT NOT NULL,
    label TEXT NOT NULL,
    url TEXT NOT NULL,
    icon_url TEXT,
    is_active BOOLEAN DEFAULT true,
    "order" BIGINT NOT NULL,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);

-- 22. Promo Codes Table
CREATE TABLE IF NOT EXISTS promo_codes (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    discount_percent BIGINT NOT NULL,
    max_uses BIGINT NOT NULL,
    used_count BIGINT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    expires_at BIGINT,
    created_at BIGINT NOT NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- 23. Admin Notifications Table
CREATE TABLE IF NOT EXISTS admin_notifications (
    id TEXT PRIMARY KEY,
    "type" TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    data JSONB,
    created_at BIGINT NOT NULL
);

-- 24. Certificates Table
CREATE TABLE IF NOT EXISTS certificates (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    course_title TEXT NOT NULL,
    completion_percent BIGINT NOT NULL,
    issued_at BIGINT NOT NULL,
    verification_code TEXT NOT NULL
);

-- 25. User Devices Table
CREATE TABLE IF NOT EXISTS user_devices (
    id TEXT PRIMARY KEY, -- user_id + '_' + device_id
    device_id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_name TEXT NOT NULL,
    last_seen BIGINT NOT NULL,
    created_at BIGINT NOT NULL,
    is_active BOOLEAN DEFAULT true
);

-- 26. Settings Table (For single-key settings like AuthorInfo)
CREATE TABLE IF NOT EXISTS settings (
    "key" TEXT PRIMARY KEY,
    value JSONB NOT NULL
);

-- 27. Advices Table (Subcollection of courses)
CREATE TABLE IF NOT EXISTS advices (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    folder_id TEXT REFERENCES folders(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    text TEXT NOT NULL,
    icon TEXT,
    after_topic_order BIGINT NOT NULL,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);

-- Enable Replication for realtime messages
alter publication supabase_realtime add table messages;
