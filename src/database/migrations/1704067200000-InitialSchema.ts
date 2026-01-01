import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1704067200000 implements MigrationInterface {
  name = 'InitialSchema1704067200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create ENUM types
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE user_role AS ENUM ('parent', 'student', 'admin');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE auth_provider AS ENUM ('local', 'google', 'facebook');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE gender AS ENUM ('male', 'female', 'other');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE learning_style AS ENUM ('visual', 'auditory', 'kinesthetic', 'reading_writing');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE medium AS ENUM ('english', 'hindi', 'tamil', 'telugu', 'kannada', 'malayalam', 'marathi', 'bengali', 'gujarati');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE block_type AS ENUM ('text', 'heading', 'definition', 'example', 'formula', 'image', 'video', 'audio', 'diagram', 'table', 'quiz', 'note', 'tip', 'warning');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE plan_status AS ENUM ('active', 'completed', 'paused', 'cancelled');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE item_status AS ENUM ('pending', 'in_progress', 'completed', 'skipped');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE session_type AS ENUM ('learning', 'revision', 'doubt', 'quiz', 'practice');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE session_status AS ENUM ('active', 'paused', 'completed', 'abandoned');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE sender_type AS ENUM ('student', 'ai', 'system');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE message_type AS ENUM ('text', 'voice', 'image', 'audio', 'explanation', 'question', 'answer', 'hint', 'summary');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE mastery_level AS ENUM ('beginner', 'learning', 'practicing', 'proficient', 'mastered');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE doubt_type AS ENUM ('text', 'voice', 'image');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE doubt_status AS ENUM ('pending', 'ai_answered', 'escalated', 'resolved');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE quiz_type AS ENUM ('topic', 'chapter', 'subject', 'mock_test', 'practice', 'revision');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE difficulty_level AS ENUM ('easy', 'medium', 'hard', 'mixed');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE question_type AS ENUM ('mcq', 'true_false', 'fill_blank', 'short_answer', 'long_answer', 'match', 'ordering');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE attempt_status AS ENUM ('in_progress', 'submitted', 'timed_out', 'abandoned');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE subscription_status AS ENUM ('active', 'expired', 'cancelled', 'paused', 'trial');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'success', 'failed', 'refunded', 'cancelled');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE payment_gateway AS ENUM ('razorpay', 'stripe', 'paytm', 'upi');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE discount_type AS ENUM ('percentage', 'fixed');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE achievement_category AS ENUM ('streak', 'learning', 'quiz', 'doubt', 'xp', 'level', 'social', 'special');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE notification_type AS ENUM ('system', 'reminder', 'achievement', 'quiz', 'subscription', 'streak', 'promotion', 'update');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE notification_priority AS ENUM ('low', 'medium', 'high', 'urgent');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE otp_purpose AS ENUM ('registration', 'login', 'password_reset', 'phone_verification', 'email_verification');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE report_type AS ENUM ('daily', 'weekly', 'monthly', 'term', 'custom');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create tables
    // Users table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        full_name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE,
        phone VARCHAR(20) UNIQUE NOT NULL,
        password TEXT,
        role user_role DEFAULT 'parent',
        auth_provider auth_provider DEFAULT 'local',
        google_id VARCHAR(255),
        facebook_id VARCHAR(255),
        profile_image_url TEXT,
        is_active BOOLEAN DEFAULT true,
        is_email_verified BOOLEAN DEFAULT false,
        is_phone_verified BOOLEAN DEFAULT false,
        last_login_at TIMESTAMP,
        fcm_token TEXT,
        refresh_token TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      );
    `);

    // Boards table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS boards (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(50) UNIQUE NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        state VARCHAR(100),
        description TEXT,
        logo_url TEXT,
        is_active BOOLEAN DEFAULT true,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      );
    `);

    // Classes table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS classes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        board_id UUID REFERENCES boards(id),
        class_name VARCHAR(20) NOT NULL,
        display_name VARCHAR(50) NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP,
        UNIQUE(board_id, class_name)
      );
    `);

    // Students table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS students (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        student_name VARCHAR(100) NOT NULL,
        date_of_birth DATE,
        gender gender,
        profile_image_url TEXT,
        school_name VARCHAR(255) NOT NULL,
        school_address TEXT,
        board_id UUID REFERENCES boards(id),
        class_id UUID REFERENCES classes(id),
        section VARCHAR(10),
        roll_number VARCHAR(50),
        medium medium DEFAULT 'english',
        academic_year VARCHAR(10),
        previous_percentage DECIMAL(5,2),
        learning_style learning_style,
        special_needs TEXT,
        daily_study_hours INTEGER DEFAULT 2,
        preferred_study_time JSONB,
        career_goal TEXT,
        target_exam VARCHAR(100),
        xp INTEGER DEFAULT 0,
        level INTEGER DEFAULT 1,
        streak_days INTEGER DEFAULT 0,
        last_activity_date DATE,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      );
    `);

    // Subjects table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS subjects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        class_id UUID REFERENCES classes(id),
        subject_name VARCHAR(100) NOT NULL,
        display_name VARCHAR(100) NOT NULL,
        medium medium DEFAULT 'english',
        description TEXT,
        icon_name VARCHAR(50),
        color_code VARCHAR(7),
        is_active BOOLEAN DEFAULT true,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP,
        UNIQUE(class_id, subject_name, medium)
      );
    `);

    // Books table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS books (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        subject_id UUID REFERENCES subjects(id),
        book_title VARCHAR(255) NOT NULL,
        publisher VARCHAR(255),
        edition VARCHAR(50),
        publication_year INTEGER,
        cover_image_url TEXT,
        description TEXT,
        total_chapters INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP,
        UNIQUE(subject_id, book_title)
      );
    `);

    // Chapters table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS chapters (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        book_id UUID REFERENCES books(id),
        chapter_number INTEGER NOT NULL,
        chapter_title VARCHAR(255) NOT NULL,
        description TEXT,
        learning_objectives TEXT,
        estimated_duration_minutes INTEGER DEFAULT 0,
        thumbnail_url TEXT,
        is_active BOOLEAN DEFAULT true,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP,
        UNIQUE(book_id, chapter_number)
      );
    `);

    // Topics table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS topics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        chapter_id UUID REFERENCES chapters(id),
        topic_title VARCHAR(255) NOT NULL,
        content TEXT,
        ai_teaching_prompt TEXT,
        key_concepts TEXT,
        estimated_duration_minutes INTEGER DEFAULT 0,
        video_url TEXT,
        pdf_url TEXT,
        is_active BOOLEAN DEFAULT true,
        display_order INTEGER DEFAULT 0,
        difficulty_level INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP,
        UNIQUE(chapter_id, topic_title)
      );
    `);

    // Content blocks table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS content_blocks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        topic_id UUID REFERENCES topics(id),
        block_type block_type DEFAULT 'text',
        content TEXT NOT NULL,
        ai_explanation TEXT,
        media_url TEXT,
        sequence_order INTEGER NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      );
    `);

    // Study plans table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS study_plans (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        student_id UUID REFERENCES students(id),
        plan_title VARCHAR(255) NOT NULL,
        description TEXT,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        daily_hours INTEGER DEFAULT 2,
        target_subjects JSONB,
        target_exam VARCHAR(100),
        status plan_status DEFAULT 'active',
        completion_percentage DECIMAL(5,2) DEFAULT 0,
        is_ai_generated BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      );
    `);

    // Study plan items table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS study_plan_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        study_plan_id UUID REFERENCES study_plans(id),
        topic_id UUID REFERENCES topics(id),
        scheduled_date DATE NOT NULL,
        scheduled_time TIME,
        duration_minutes INTEGER DEFAULT 30,
        status item_status DEFAULT 'pending',
        completed_at TIMESTAMP,
        notes TEXT,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      );
    `);

    // Learning sessions table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS learning_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        student_id UUID REFERENCES students(id),
        topic_id UUID REFERENCES topics(id),
        session_type session_type DEFAULT 'learning',
        status session_status DEFAULT 'active',
        started_at TIMESTAMP,
        ended_at TIMESTAMP,
        duration_seconds INTEGER DEFAULT 0,
        content_blocks_viewed INTEGER DEFAULT 0,
        ai_interactions INTEGER DEFAULT 0,
        session_data JSONB,
        xp_earned INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      );
    `);

    // Chat messages table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID REFERENCES learning_sessions(id),
        sender_type sender_type NOT NULL,
        message_type message_type DEFAULT 'text',
        content TEXT NOT NULL,
        media_url TEXT,
        voice_transcript TEXT,
        metadata JSONB,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      );
    `);

    // Student progress table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS student_progress (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        student_id UUID REFERENCES students(id),
        topic_id UUID REFERENCES topics(id),
        progress_percentage DECIMAL(5,2) DEFAULT 0,
        mastery_level mastery_level DEFAULT 'beginner',
        total_time_spent_minutes INTEGER DEFAULT 0,
        content_blocks_completed INTEGER DEFAULT 0,
        quiz_attempts INTEGER DEFAULT 0,
        best_quiz_score DECIMAL(5,2) DEFAULT 0,
        doubts_asked INTEGER DEFAULT 0,
        last_accessed_at TIMESTAMP,
        completed_at TIMESTAMP,
        revision_count INTEGER DEFAULT 0,
        next_revision_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP,
        UNIQUE(student_id, topic_id)
      );
    `);

    // Doubts table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS doubts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        student_id UUID REFERENCES students(id),
        topic_id UUID REFERENCES topics(id),
        question TEXT NOT NULL,
        doubt_type doubt_type DEFAULT 'text',
        image_url TEXT,
        voice_url TEXT,
        voice_transcript TEXT,
        ai_answer TEXT,
        status doubt_status DEFAULT 'pending',
        is_resolved BOOLEAN DEFAULT false,
        resolved_at TIMESTAMP,
        rating INTEGER,
        feedback TEXT,
        is_bookmarked BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      );
    `);

    // Quizzes table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS quizzes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        topic_id UUID REFERENCES topics(id),
        quiz_title VARCHAR(255) NOT NULL,
        description TEXT,
        quiz_type quiz_type DEFAULT 'topic',
        difficulty_level difficulty_level DEFAULT 'medium',
        total_questions INTEGER DEFAULT 0,
        total_marks INTEGER DEFAULT 0,
        time_limit_minutes INTEGER,
        passing_percentage DECIMAL(5,2) DEFAULT 0,
        shuffle_questions BOOLEAN DEFAULT true,
        show_answer_after_submit BOOLEAN DEFAULT true,
        is_active BOOLEAN DEFAULT true,
        is_ai_generated BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      );
    `);

    // Questions table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS questions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        quiz_id UUID REFERENCES quizzes(id),
        question_type question_type DEFAULT 'mcq',
        question_text TEXT NOT NULL,
        question_image_url TEXT,
        options JSONB,
        correct_answer TEXT NOT NULL,
        explanation TEXT,
        marks INTEGER DEFAULT 1,
        negative_marks DECIMAL(5,2),
        sequence_order INTEGER NOT NULL,
        difficulty_level VARCHAR(20) DEFAULT 'medium',
        hint TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      );
    `);

    // Quiz attempts table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS quiz_attempts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        student_id UUID REFERENCES students(id),
        quiz_id UUID REFERENCES quizzes(id),
        started_at TIMESTAMP NOT NULL,
        submitted_at TIMESTAMP,
        status attempt_status DEFAULT 'in_progress',
        total_questions INTEGER DEFAULT 0,
        attempted_questions INTEGER DEFAULT 0,
        correct_answers INTEGER DEFAULT 0,
        wrong_answers INTEGER DEFAULT 0,
        marks_obtained DECIMAL(8,2) DEFAULT 0,
        total_marks DECIMAL(8,2) DEFAULT 0,
        percentage DECIMAL(5,2) DEFAULT 0,
        time_taken_seconds INTEGER DEFAULT 0,
        is_passed BOOLEAN DEFAULT false,
        xp_earned INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      );
    `);

    // Answer responses table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS answer_responses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        attempt_id UUID REFERENCES quiz_attempts(id),
        question_id UUID REFERENCES questions(id),
        student_answer TEXT,
        is_correct BOOLEAN DEFAULT false,
        marks_obtained DECIMAL(5,2) DEFAULT 0,
        time_taken_seconds INTEGER DEFAULT 0,
        is_skipped BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      );
    `);

    // Subscription plans table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS subscription_plans (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        plan_name VARCHAR(100) NOT NULL,
        display_name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        original_price DECIMAL(10,2),
        currency VARCHAR(3) DEFAULT 'INR',
        duration_months INTEGER NOT NULL,
        max_students INTEGER DEFAULT 1,
        ai_minutes_per_day INTEGER DEFAULT 30,
        features JSONB,
        doubt_types JSONB,
        has_live_sessions BOOLEAN DEFAULT false,
        has_personal_mentor BOOLEAN DEFAULT false,
        support_type VARCHAR(50) DEFAULT 'email',
        report_frequency VARCHAR(20) DEFAULT 'weekly',
        is_active BOOLEAN DEFAULT true,
        is_popular BOOLEAN DEFAULT false,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      );
    `);

    // User subscriptions table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_subscriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        plan_id UUID REFERENCES subscription_plans(id),
        status subscription_status DEFAULT 'active',
        started_at TIMESTAMP NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        cancelled_at TIMESTAMP,
        auto_renew BOOLEAN DEFAULT false,
        payment_id VARCHAR(255),
        coupon_code VARCHAR(50),
        discount_amount DECIMAL(10,2) DEFAULT 0,
        final_amount DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      );
    `);

    // Payments table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        gateway_order_id VARCHAR(255),
        gateway_payment_id VARCHAR(255),
        gateway_signature TEXT,
        gateway payment_gateway DEFAULT 'razorpay',
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'INR',
        status payment_status DEFAULT 'pending',
        payment_method VARCHAR(50),
        description TEXT,
        failure_reason TEXT,
        metadata JSONB,
        refund_id VARCHAR(255),
        refund_amount DECIMAL(10,2),
        refunded_at TIMESTAMP,
        invoice_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      );
    `);

    // Coupons table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS coupons (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        coupon_code VARCHAR(50) UNIQUE NOT NULL,
        description TEXT,
        discount_type discount_type DEFAULT 'percentage',
        discount_value DECIMAL(10,2) NOT NULL,
        max_discount_amount DECIMAL(10,2),
        min_order_amount DECIMAL(10,2),
        max_uses INTEGER,
        current_uses INTEGER DEFAULT 0,
        max_uses_per_user INTEGER,
        valid_from TIMESTAMP NOT NULL,
        valid_until TIMESTAMP NOT NULL,
        applicable_plans JSONB,
        is_active BOOLEAN DEFAULT true,
        is_first_time_only BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      );
    `);

    // Daily progress table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS daily_progress (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        student_id UUID REFERENCES students(id),
        date DATE NOT NULL,
        total_study_time_minutes INTEGER DEFAULT 0,
        topics_completed INTEGER DEFAULT 0,
        quizzes_attempted INTEGER DEFAULT 0,
        doubts_asked INTEGER DEFAULT 0,
        xp_earned INTEGER DEFAULT 0,
        streak_days INTEGER DEFAULT 0,
        goal_achieved BOOLEAN DEFAULT false,
        subject_wise_time JSONB,
        session_details JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP,
        UNIQUE(student_id, date)
      );
    `);

    // Achievements table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS achievements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        achievement_name VARCHAR(100) NOT NULL,
        display_name VARCHAR(255) NOT NULL,
        description TEXT,
        category achievement_category DEFAULT 'learning',
        icon_name VARCHAR(50),
        badge_image_url TEXT,
        criteria JSONB,
        xp_reward INTEGER DEFAULT 0,
        tier INTEGER DEFAULT 1,
        is_active BOOLEAN DEFAULT true,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      );
    `);

    // Student achievements table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS student_achievements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        student_id UUID REFERENCES students(id),
        achievement_id UUID REFERENCES achievements(id),
        earned_at TIMESTAMP NOT NULL,
        progress_data JSONB,
        is_notified BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP,
        UNIQUE(student_id, achievement_id)
      );
    `);

    // Notifications table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        notification_type notification_type DEFAULT 'system',
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        image_url TEXT,
        action_url TEXT,
        data JSONB,
        priority notification_priority DEFAULT 'medium',
        is_read BOOLEAN DEFAULT false,
        read_at TIMESTAMP,
        is_push_sent BOOLEAN DEFAULT false,
        push_sent_at TIMESTAMP,
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      );
    `);

    // Student interests table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS student_interests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        student_id UUID REFERENCES students(id),
        subject_id UUID REFERENCES subjects(id),
        interest_level INTEGER DEFAULT 5,
        is_favorite BOOLEAN DEFAULT false,
        career_relevance TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP,
        UNIQUE(student_id, subject_id)
      );
    `);

    // OTPs table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS otps (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        identifier VARCHAR(255) NOT NULL,
        code VARCHAR(10) NOT NULL,
        purpose otp_purpose DEFAULT 'login',
        expires_at TIMESTAMP NOT NULL,
        is_used BOOLEAN DEFAULT false,
        used_at TIMESTAMP,
        attempts INTEGER DEFAULT 0,
        ip_address VARCHAR(50),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      );
    `);

    // Parent reports table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS parent_reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        student_id UUID REFERENCES students(id),
        report_type report_type DEFAULT 'weekly',
        period_start DATE NOT NULL,
        period_end DATE NOT NULL,
        report_data JSONB NOT NULL,
        pdf_url TEXT,
        is_sent BOOLEAN DEFAULT false,
        sent_at TIMESTAMP,
        sent_to TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      );
    `);

    // Create indexes
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_learning_sessions_student ON learning_sessions(student_id, created_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id, created_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_student_progress_student ON student_progress(student_id, topic_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student ON quiz_attempts(student_id, quiz_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id, created_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_daily_progress_student ON daily_progress(student_id, date);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order
    const tables = [
      'parent_reports', 'otps', 'student_interests', 'notifications',
      'student_achievements', 'achievements', 'daily_progress', 'coupons',
      'payments', 'user_subscriptions', 'subscription_plans', 'answer_responses',
      'quiz_attempts', 'questions', 'quizzes', 'doubts', 'student_progress',
      'chat_messages', 'learning_sessions', 'study_plan_items', 'study_plans',
      'content_blocks', 'topics', 'chapters', 'books', 'subjects', 'students',
      'classes', 'boards', 'users'
    ];

    for (const table of tables) {
      await queryRunner.query(`DROP TABLE IF EXISTS ${table} CASCADE;`);
    }

    // Drop ENUM types
    const types = [
      'report_type', 'otp_purpose', 'notification_priority', 'notification_type',
      'achievement_category', 'discount_type', 'payment_gateway', 'payment_status',
      'subscription_status', 'attempt_status', 'question_type', 'difficulty_level',
      'quiz_type', 'doubt_status', 'doubt_type', 'mastery_level', 'message_type',
      'sender_type', 'session_status', 'session_type', 'item_status', 'plan_status',
      'block_type', 'medium', 'learning_style', 'gender', 'auth_provider', 'user_role'
    ];

    for (const type of types) {
      await queryRunner.query(`DROP TYPE IF EXISTS ${type};`);
    }
  }
}
