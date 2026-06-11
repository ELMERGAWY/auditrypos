// @ts-nocheck
import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, MessageSquare, Users, Search, Activity, User, Hash, Shield, Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  restaurantId: string;
}

interface ChatMessage {
  id: string;
  sender_user_id: string;
  sender_name: string;
  sender_role: string;
  message_content: string;
  created_at: string;
}

export function EmployeeChat({ restaurantId }: Props) {
  const [staff, setStaff] = useState<any[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [text, setText] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch current user & staff list
  useEffect(() => {
    const initChat = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Get user profile name
          const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
          const { data: staffProf } = await supabase.from('staff_profiles').select('full_name, position').eq('email', user.email).maybeSingle();
          
          setCurrentUser({
            id: user.id,
            email: user.email,
            name: staffProf?.full_name || profile?.full_name || user.email.split('@')[0],
            role: staffProf?.position || 'مسؤول النظام'
          });
        }

        // Get staff
        const { data: staffList } = await supabase.from('staff_profiles').select('id, full_name, position, status').eq('restaurant_id', restaurantId);
        setStaff(staffList || []);

        // Load recent messages
        const { data: recentMsgs } = await supabase
          .from('employee_chat_messages')
          .select('*')
          .eq('restaurant_id', restaurantId)
          .order('created_at', { ascending: true })
          .limit(100);
        
        setMessages(recentMsgs || []);
      } catch (e: any) {
        console.error('Chat error:', e);
      } finally {
        setLoading(false);
      }
    };

    initChat();
  }, [restaurantId]);

  // Real-time Subscription for instant message updates
  useEffect(() => {
    if (!restaurantId) return;

    const channel = supabase
      .channel('employee_chat_' + restaurantId)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'employee_chat_messages', filter: `restaurant_id=eq.${restaurantId}` },
        (payload) => {
          setMessages((prev) => {
            if (prev.some(m => m.id === payload.new.id)) return prev;
            return [...prev, payload.new as ChatMessage];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId]);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text.trim() || !currentUser) return;

    const content = text.trim();
    setText(''); // Optimistically clear input for speed

    try {
      const { error } = await supabase.from('employee_chat_messages').insert({
        restaurant_id: restaurantId,
        sender_user_id: currentUser.id,
        sender_name: currentUser.name,
        sender_role: currentUser.role,
        message_content: content
      });

      if (error) throw error;
    } catch (err: any) {
      toast.error('فشل في إرسال الرسالة: ' + err.message);
    }
  };

  const filteredStaff = useMemo(() => {
    return staff.filter(s => 
      s.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.position?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [staff, searchQuery]);

  return (
    <div className="flex h-[calc(100vh-5rem)] gap-4 overflow-hidden p-4">
      {/* Sidebar: Staff Members / Team Directory */}
      <Card className="hidden md:flex flex-col w-80 shrink-0 border border-primary/10 glass-card overflow-hidden">
        <div className="p-4 border-b bg-muted/20 space-y-3">
          <div className="flex items-center gap-2 text-primary font-black">
            <Users className="w-5 h-5" />
            <span>فريق العمل والنشطين</span>
          </div>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="بحث عن زميل..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pr-9 h-9 text-xs"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {filteredStaff.map((member) => (
            <div key={member.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-primary/5 transition-all cursor-pointer border border-transparent hover:border-primary/5">
              <Avatar className="w-10 h-10 border border-primary/10 shadow-sm">
                <AvatarFallback className="bg-primary/5 text-primary font-black text-xs">
                  {member.full_name?.slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-xs truncate">{member.full_name}</p>
                  <div className="flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${member.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-muted'}`} />
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground truncate">{member.position || 'موظف'}</p>
              </div>
            </div>
          ))}

          {filteredStaff.length === 0 && (
            <div className="text-center py-8 text-xs text-muted-foreground">لم يتم العثور على موظفين</div>
          )}
        </div>
      </Card>

      {/* Main Chat Area */}
      <Card className="flex-1 flex flex-col border border-primary/10 glass-card overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b bg-muted/20 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center text-white font-black text-sm shadow-md">
              <Hash className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm text-primary">المجلس العام لوكالة التسويق</h3>
              <p className="text-[10px] text-muted-foreground">مساحة تواصل تيم العمل بالكامل لمناقشة المشاريع والحملات</p>
            </div>
          </div>
          <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-0">
            {messages.length} رسائل
          </Badge>
        </div>

        {/* Message Ledger */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-secondary/5 custom-scrollbar">
          <AnimatePresence initial={false}>
            {messages.map((msg) => {
              const isOwn = currentUser && msg.sender_user_id === currentUser.id;
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 max-w-[80%] ${isOwn ? 'mr-auto flex-row-reverse' : 'ml-auto'}`}
                >
                  <Avatar className="w-8 h-8 shrink-0 shadow-sm border">
                    <AvatarFallback className={isOwn ? "bg-primary text-white text-[10px] font-bold" : "bg-muted text-muted-foreground text-[10px] font-bold"}>
                      {msg.sender_name?.slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="space-y-1">
                    <div className={`flex items-center gap-2 text-[9px] text-muted-foreground ${isOwn ? 'justify-end' : ''}`}>
                      <span className="font-bold text-xs text-foreground/80">{msg.sender_name}</span>
                      <Badge variant="outline" className="text-[8px] h-4 py-0 px-1 border-primary/10 text-primary bg-primary/5">{msg.sender_role}</Badge>
                      <span>{new Date(msg.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    
                    <div className={`p-3.5 rounded-2xl text-xs shadow-sm border ${
                      isOwn 
                        ? 'gradient-bg text-white rounded-tl-none border-0' 
                        : 'bg-card border-border/50 text-foreground rounded-tr-none'
                    }`}>
                      <p className="leading-relaxed whitespace-pre-wrap">{msg.message_content}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSendMessage} className="p-3 border-t bg-card flex gap-2 items-center">
          <Input 
            value={text} 
            onChange={e => setText(e.target.value)}
            placeholder="اكتب رسالة إلى تيم العمل..." 
            className="flex-1 h-10 text-xs rounded-xl pr-4"
          />
          <Button type="submit" disabled={!text.trim()} className="h-10 px-5 rounded-xl gradient-bg border-0 text-white gap-2">
            <Send className="w-4 h-4" />
            <span>إرسال</span>
          </Button>
        </form>
      </Card>
    </div>
  );
}
