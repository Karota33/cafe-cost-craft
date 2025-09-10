import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  phone: string | null;
}

interface Membership {
  id: string;
  organization_id: string;
  role: 'owner' | 'admin' | 'manager' | 'kitchen_staff' | 'hall_staff' | 'hr_manager';
  is_active: boolean;
  organization: {
    id: string;
    name: string;
  };
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  memberships: Membership[];
  currentOrganization: Membership | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, firstName?: string, lastName?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  setCurrentOrganization: (membership: Membership) => void;
  hasRole: (roles: string[]) => boolean;
  refreshMemberships: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [currentOrganization, setCurrentOrganizationState] = useState<Membership | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Use setTimeout to defer Supabase calls and prevent deadlock
        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id);
            fetchMemberships(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setMemberships([]);
          setCurrentOrganizationState(null);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id);
        fetchMemberships(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchMemberships = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('memberships')
        .select(`
          *,
          organization:organizations(id, name)
        `)
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching memberships:', error);
        return;
      }

      const formattedMemberships = data?.map(membership => ({
        ...membership,
        organization: {
          id: membership.organization.id,
          name: membership.organization.name
        }
      })) || [];

      setMemberships(formattedMemberships);

      // Set first organization as current if none selected
      if (formattedMemberships.length > 0 && !currentOrganization) {
        setCurrentOrganizationState(formattedMemberships[0]);
      }
    } catch (error) {
      console.error('Error fetching memberships:', error);
    }
  };

  const refreshMemberships = async () => {
    if (user) {
      await fetchMemberships(user.id);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, firstName?: string, lastName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          first_name: firstName,
          last_name: lastName,
        }
      }
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setMemberships([]);
    setCurrentOrganizationState(null);
    setSession(null);
  };

  const setCurrentOrganization = (membership: Membership) => {
    setCurrentOrganizationState(membership);
    // Store in localStorage for persistence
    localStorage.setItem('currentOrganization', JSON.stringify(membership));
  };

  const hasRole = (roles: string[]): boolean => {
    if (!currentOrganization) return false;
    return roles.includes(currentOrganization.role);
  };

  // Load current organization from localStorage on startup
  useEffect(() => {
    const stored = localStorage.getItem('currentOrganization');
    if (stored && memberships.length > 0) {
      try {
        const parsed = JSON.parse(stored);
        const validMembership = memberships.find(m => m.organization_id === parsed.organization_id);
        if (validMembership) {
          setCurrentOrganizationState(validMembership);
        }
      } catch (error) {
        console.error('Error parsing stored organization:', error);
      }
    }
  }, [memberships]);

  const value = {
    user,
    profile,
    memberships,
    currentOrganization,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    setCurrentOrganization,
    hasRole,
    refreshMemberships,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};