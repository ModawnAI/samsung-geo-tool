-- Create templates table for storing generation presets
CREATE TABLE IF NOT EXISTS public.templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    keywords TEXT[] DEFAULT '{}',
    campaign_tag TEXT,
    brief_usps TEXT[] DEFAULT '{}',
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view all templates"
    ON public.templates FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can create templates"
    ON public.templates FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own templates"
    ON public.templates FOR UPDATE
    TO authenticated
    USING (auth.uid() = created_by)
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete own templates"
    ON public.templates FOR DELETE
    TO authenticated
    USING (auth.uid() = created_by);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER templates_updated_at
    BEFORE UPDATE ON public.templates
    FOR EACH ROW
    EXECUTE FUNCTION update_templates_updated_at();

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_templates_product_id ON public.templates(product_id);
CREATE INDEX IF NOT EXISTS idx_templates_created_by ON public.templates(created_by);
