-- CreateTable
CREATE TABLE "sys_user" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "password_hash" TEXT NOT NULL,
    "avatar_url" TEXT,
    "preferences" TEXT,
    "status" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_deleted" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "sys_user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "busi_note" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "color" TEXT NOT NULL DEFAULT 'blue',
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "tags" TEXT,
    "due_date" TIMESTAMP(3),
    "pin_top" INTEGER NOT NULL DEFAULT 0,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_deleted" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "busi_note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "busi_subtask" (
    "id" TEXT NOT NULL,
    "note_id" TEXT NOT NULL,
    "parent_id" TEXT,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "due_date" TIMESTAMP(3),
    "assignee" TEXT,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "busi_subtask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "busi_attachment" (
    "id" TEXT NOT NULL,
    "note_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "file_type" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "md5_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_deleted" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "busi_attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sys_activity_log" (
    "id" TEXT NOT NULL,
    "note_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action_type" TEXT NOT NULL,
    "detail" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sys_activity_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sys_user_username_key" ON "sys_user"("username");

-- CreateIndex
CREATE UNIQUE INDEX "sys_user_email_key" ON "sys_user"("email");

-- CreateIndex
CREATE INDEX "idx_user_created" ON "busi_note"("user_id", "is_deleted", "created_at");

-- CreateIndex
CREATE INDEX "idx_user_due" ON "busi_note"("user_id", "is_deleted", "due_date");

-- CreateIndex
CREATE INDEX "idx_user_status" ON "busi_note"("user_id", "status", "is_deleted");

-- CreateIndex
CREATE INDEX "busi_subtask_note_id_idx" ON "busi_subtask"("note_id");

-- CreateIndex
CREATE INDEX "busi_subtask_parent_id_idx" ON "busi_subtask"("parent_id");

-- CreateIndex
CREATE INDEX "busi_attachment_note_id_idx" ON "busi_attachment"("note_id");

-- CreateIndex
CREATE INDEX "busi_attachment_md5_hash_idx" ON "busi_attachment"("md5_hash");

-- CreateIndex
CREATE INDEX "sys_activity_log_note_id_idx" ON "sys_activity_log"("note_id");

-- CreateIndex
CREATE INDEX "sys_activity_log_created_at_idx" ON "sys_activity_log"("created_at");

-- AddForeignKey
ALTER TABLE "busi_note" ADD CONSTRAINT "busi_note_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "sys_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "busi_subtask" ADD CONSTRAINT "busi_subtask_note_id_fkey" FOREIGN KEY ("note_id") REFERENCES "busi_note"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "busi_subtask" ADD CONSTRAINT "busi_subtask_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "busi_subtask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "busi_attachment" ADD CONSTRAINT "busi_attachment_note_id_fkey" FOREIGN KEY ("note_id") REFERENCES "busi_note"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sys_activity_log" ADD CONSTRAINT "sys_activity_log_note_id_fkey" FOREIGN KEY ("note_id") REFERENCES "busi_note"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sys_activity_log" ADD CONSTRAINT "sys_activity_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "sys_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
