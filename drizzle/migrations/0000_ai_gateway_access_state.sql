CREATE TABLE public.ai_gateway_access_state (id text PRIMARY KEY, message text NOT NULL, status integer NOT NULL DEFAULT 403, updated_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.ai_gateway_access_state TO service_role;
ALTER TABLE public.ai_gateway_access_state ENABLE ROW LEVEL SECURITY;