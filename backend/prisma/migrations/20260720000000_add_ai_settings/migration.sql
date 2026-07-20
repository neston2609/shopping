-- CreateTable: ai_settings (AI provider configuration)
CREATE TABLE "ai_settings" (
    "id" SERIAL NOT NULL,
    "brand" TEXT NOT NULL DEFAULT 'openai',
    "endpoint_url" TEXT,
    "api_key_enc" TEXT,
    "model" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_settings_pkey" PRIMARY KEY ("id")
);
