-- Create profiles table to store user information
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create manual_labels table
CREATE TABLE IF NOT EXISTS manual_labels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ingredient_name TEXT NOT NULL,
  ingredient_name_normalized TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('safe', 'danger', 'unknown')),
  notes TEXT,
  created_by UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_manual_labels_normalized
ON manual_labels(ingredient_name_normalized);

-- Create label_votes table
CREATE TABLE IF NOT EXISTS label_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  label_id UUID REFERENCES manual_labels(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  vote INTEGER NOT NULL CHECK (vote IN (-1, 1)),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(label_id, user_id)
);

-- Create index for faster vote lookups
CREATE INDEX IF NOT EXISTS idx_label_votes_label
ON label_votes(label_id);

CREATE INDEX IF NOT EXISTS idx_label_votes_user
ON label_votes(user_id);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE manual_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE label_votes ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
ON profiles FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own profile"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Manual labels policies
CREATE POLICY "Manual labels are viewable by everyone"
ON manual_labels FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create labels"
ON manual_labels FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = created_by);

CREATE POLICY "Users can update their own labels"
ON manual_labels FOR UPDATE
USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own labels"
ON manual_labels FOR DELETE
USING (auth.uid() = created_by);

-- Label votes policies
CREATE POLICY "Votes are viewable by everyone"
ON label_votes FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can vote"
ON label_votes FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can update their own votes"
ON label_votes FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own votes"
ON label_votes FOR DELETE
USING (auth.uid() = user_id);

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
