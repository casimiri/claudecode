-- Migration: Add Chat History Persistence and Token Management
-- This migration adds chat conversation storage and improved token period management

-- 1. Create chat_conversations table
CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL DEFAULT 'New Conversation',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create chat_messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.chat_conversations(id) ON DELETE CASCADE NOT NULL,
  role TEXT CHECK (role IN ('user', 'assistant')) NOT NULL,
  content TEXT NOT NULL,
  tokens_used INTEGER DEFAULT 0,
  sources_count INTEGER DEFAULT 0,
  metadata JSONB, -- Store additional message data like sources, response time, etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_id ON public.chat_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_updated_at ON public.chat_conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON public.chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at);

-- 4. Enable RLS for chat tables
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for chat_conversations
CREATE POLICY "Users can view their own conversations" ON public.chat_conversations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own conversations" ON public.chat_conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations" ON public.chat_conversations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations" ON public.chat_conversations
  FOR DELETE USING (auth.uid() = user_id);

-- 6. Create RLS policies for chat_messages
CREATE POLICY "Users can view messages from their conversations" ON public.chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.chat_conversations 
      WHERE id = conversation_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages in their conversations" ON public.chat_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_conversations 
      WHERE id = conversation_id AND user_id = auth.uid()
    )
  );

-- 7. Function to auto-update conversation updated_at timestamp
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.chat_conversations 
  SET updated_at = NOW() 
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Trigger to update conversation timestamp when messages are added
CREATE TRIGGER update_conversation_on_message_insert
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_timestamp();

-- 9. Function to reset user tokens at period end
CREATE OR REPLACE FUNCTION reset_user_tokens_for_period()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the user's period has ended
  IF OLD.period_end_date <= NOW() AND NEW.period_end_date > OLD.period_end_date THEN
    -- Reset tokens for new period
    NEW.tokens_used_this_period = 0;
    NEW.period_start_date = NOW();
    
    -- Set new period end date based on subscription plan
    NEW.period_end_date = CASE
      WHEN NEW.subscription_plan = 'free' THEN NOW() + INTERVAL '30 days'
      WHEN NEW.subscription_plan = 'weekly' THEN NOW() + INTERVAL '7 days'
      WHEN NEW.subscription_plan = 'monthly' THEN NOW() + INTERVAL '30 days'
      WHEN NEW.subscription_plan = 'yearly' THEN NOW() + INTERVAL '365 days'
      ELSE NOW() + INTERVAL '30 days'
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Trigger to auto-reset tokens when period ends
CREATE TRIGGER auto_reset_user_tokens
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION reset_user_tokens_for_period();

-- 11. Function to get user's chat conversations with message count
CREATE OR REPLACE FUNCTION get_user_conversations(user_uuid UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  message_count BIGINT,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.title,
    COUNT(m.id) as message_count,
    MAX(m.created_at) as last_message_at,
    c.created_at,
    c.updated_at
  FROM public.chat_conversations c
  LEFT JOIN public.chat_messages m ON c.id = m.conversation_id
  WHERE c.user_id = user_uuid
  GROUP BY c.id, c.title, c.created_at, c.updated_at
  ORDER BY c.updated_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 12. Function to get conversation messages
CREATE OR REPLACE FUNCTION get_conversation_messages(conversation_uuid UUID, user_uuid UUID)
RETURNS TABLE (
  id UUID,
  role TEXT,
  content TEXT,
  tokens_used INTEGER,
  sources_count INTEGER,
  metadata JSONB,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  -- Verify user owns this conversation
  IF NOT EXISTS (
    SELECT 1 FROM public.chat_conversations 
    WHERE id = conversation_uuid AND user_id = user_uuid
  ) THEN
    RAISE EXCEPTION 'Conversation not found or access denied';
  END IF;

  RETURN QUERY
  SELECT 
    m.id,
    m.role,
    m.content,
    m.tokens_used,
    m.sources_count,
    m.metadata,
    m.created_at
  FROM public.chat_messages m
  WHERE m.conversation_id = conversation_uuid
  ORDER BY m.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- 13. Function to create a new conversation
CREATE OR REPLACE FUNCTION create_user_conversation(user_uuid UUID, conversation_title TEXT DEFAULT 'New Conversation')
RETURNS UUID AS $$
DECLARE
  new_conversation_id UUID;
BEGIN
  INSERT INTO public.chat_conversations (user_id, title)
  VALUES (user_uuid, conversation_title)
  RETURNING id INTO new_conversation_id;
  
  RETURN new_conversation_id;
END;
$$ LANGUAGE plpgsql;

-- 14. Function to add message to conversation
CREATE OR REPLACE FUNCTION add_message_to_conversation(
  conversation_uuid UUID,
  user_uuid UUID,
  message_role TEXT,
  message_content TEXT,
  message_tokens_used INTEGER DEFAULT 0,
  message_sources_count INTEGER DEFAULT 0,
  message_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  new_message_id UUID;
BEGIN
  -- Verify user owns this conversation
  IF NOT EXISTS (
    SELECT 1 FROM public.chat_conversations 
    WHERE id = conversation_uuid AND user_id = user_uuid
  ) THEN
    RAISE EXCEPTION 'Conversation not found or access denied';
  END IF;

  INSERT INTO public.chat_messages (
    conversation_id, role, content, tokens_used, sources_count, metadata
  )
  VALUES (
    conversation_uuid, message_role, message_content, 
    message_tokens_used, message_sources_count, message_metadata
  )
  RETURNING id INTO new_message_id;
  
  RETURN new_message_id;
END;
$$ LANGUAGE plpgsql;

-- 15. Function to check and reset expired token periods
CREATE OR REPLACE FUNCTION check_and_reset_expired_periods()
RETURNS INTEGER AS $$
DECLARE
  reset_count INTEGER := 0;
BEGIN
  UPDATE public.users
  SET 
    tokens_used_this_period = 0,
    period_start_date = NOW(),
    period_end_date = CASE
      WHEN subscription_plan = 'free' THEN NOW() + INTERVAL '30 days'
      WHEN subscription_plan = 'weekly' THEN NOW() + INTERVAL '7 days'
      WHEN subscription_plan = 'monthly' THEN NOW() + INTERVAL '30 days'
      WHEN subscription_plan = 'yearly' THEN NOW() + INTERVAL '365 days'
      ELSE NOW() + INTERVAL '30 days'
    END
  WHERE period_end_date <= NOW();
  
  GET DIAGNOSTICS reset_count = ROW_COUNT;
  RETURN reset_count;
END;
$$ LANGUAGE plpgsql;

-- 16. Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_conversations TO authenticated;
GRANT SELECT, INSERT ON public.chat_messages TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_conversations(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_conversation_messages(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_user_conversation(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION add_message_to_conversation(UUID, UUID, TEXT, TEXT, INTEGER, INTEGER, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION check_and_reset_expired_periods() TO authenticated;

-- Success message
SELECT 'Chat persistence and token management migration completed successfully!' as result;