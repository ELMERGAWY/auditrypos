// @ts-nocheck
import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, MessageSquare, Users, Search, Hash, Shield, Smile, Paperclip, Image, FileText, File, Play, Volume2, Building2, UserPlus, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
  department_id?: string;
  recipient_user_id?: string;
  file_url?: string;
  file_name?: string;
  file_type?: string;
}

interface ChatRoom {
  id: string;
  type: 'general' | 'department' | 'dm';
  name: string;
  userId?: string;
  role?: string;
  status?: string;
}

export function EmployeeChat({ restaurantId }: Props) {
  const [staff, setStaff] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [text, setText] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Room State
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom>({
    id: 'general',
    type: 'general',
    name: 'المجلس العام'
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch current user, staff list, departments, and messages
  useEffect(() => {
    const initChat = async () => {
      setLoading(true);
      try {
        // 1. Get authenticated user
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Get profile
          const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
          const { data: staffProf } = await supabase.from('staff_profiles').select('full_name, position').eq('email', user.email).maybeSingle();
          
          setCurrentUser({
            id: user.id,
            email: user.email,
            name: staffProf?.full_name || profile?.full_name || user.email.split('@')[0],
            role: staffProf?.position || 'مسؤول النظام'
          });
        }

        // 2. Fetch staff profiles & profiles to map auth.user ids
        const [staffRes, profilesRes, deptRes, recentMsgsRes] = await Promise.all([
          supabase.from('staff_profiles').select('id, full_name, position, status, email').eq('restaurant_id', restaurantId),
          supabase.from('profiles').select('user_id, email'),
          supabase.from('staff_departments').select('id, name, code').eq('restaurant_id', restaurantId),
          supabase.from('employee_chat_messages').select('*').eq('restaurant_id', restaurantId).order('created_at', { ascending: true }).limit(200)
        ]);

        const profilesMap = new Map((profilesRes.data || []).map(p => [p.email?.toLowerCase(), p.user_id]));
        const mappedStaff = (staffRes.data || []).map((s: any) => ({
          id: s.id,
          full_name: s.full_name,
          position: s.position,
          status: s.status,
          email: s.email,
          user_id: profilesMap.get(s.email?.toLowerCase()) || null // mapped auth.users id
        }));

        setStaff(mappedStaff);
        setDepartments(deptRes.data || []);
        setMessages(recentMsgsRes.data || []);
      } catch (e: any) {
        console.error('Chat initialization error:', e);
        toast.error('حدث خطأ في تحميل الدردشة: ' + e.message);
      } finally {
        setLoading(false);
      }
    };

    initChat();
  }, [restaurantId]);

  // Real-time subscription
  useEffect(() => {
    if (!restaurantId) return;

    const channel = supabase
      .channel('employee_chat_global_' + restaurantId)
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

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedRoom]);

  // Send Message function
  const handleSendMessage = async (e?: React.FormEvent, attachmentUrl?: string, attachmentName?: string, attachmentType?: string) => {
    if (e) e.preventDefault();
    if ((!text.trim() && !attachmentUrl) || !currentUser) return;

    const content = text.trim();
    setText(''); // clear input optimistically

    try {
      const { error } = await supabase.from('employee_chat_messages').insert({
        restaurant_id: restaurantId,
        sender_user_id: currentUser.id,
        sender_name: currentUser.name,
        sender_role: currentUser.role,
        message_content: content || (attachmentType === 'image' ? '📸 صورة مشتركة' : '📁 ملف مشترك'),
        department_id: selectedRoom.type === 'department' ? selectedRoom.id : null,
        recipient_user_id: selectedRoom.type === 'dm' ? selectedRoom.userId : null,
        file_url: attachmentUrl || null,
        file_name: attachmentName || null,
        file_type: attachmentType || null
      });

      if (error) throw error;
    } catch (err: any) {
      toast.error('فشل في إرسال الرسالة: ' + err.message);
    }
  };

  // Upload attachment file
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileId = crypto.randomUUID();
    const cleanFileName = file.name.replace(/[^\w\d\.\-]/g, '_');
    const path = `chat-attachments/${restaurantId}/${fileId}_${cleanFileName}`;

    toast.info('جاري رفع الملف...');
    try {
      const { error: uploadError } = await supabase.storage.from('restaurant-assets').upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('restaurant-assets').getPublicUrl(path);

      let fileType = 'other';
      if (file.type.startsWith('image/')) fileType = 'image';
      else if (file.type.startsWith('video/')) fileType = 'video';
      else if (file.type.startsWith('audio/')) fileType = 'audio';

      await handleSendMessage(undefined, publicUrl, file.name, fileType);
      toast.success('تم رفع الملف بنجاح ✅');
    } catch (err: any) {
      toast.error('خطأ في رفع الملف: ' + err.message);
    }
  };

  // Click attachment button
  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  // Chat Rooms list grouping (Slack style)
  const chatRooms = useMemo(() => {
    const list: ChatRoom[] = [
      { id: 'general', type: 'general', name: 'المجلس العام' }
    ];
    
    // Add departments
    departments.forEach(d => {
      list.push({ id: d.id, type: 'department', name: d.name });
    });

    // Add active staff members as DM candidates
    staff.forEach(s => {
      if (s.user_id && s.user_id !== currentUser?.id) {
        list.push({ id: s.id, type: 'dm', name: s.full_name, userId: s.user_id, role: s.position, status: s.status });
      }
    });

    return list;
  }, [departments, staff, currentUser]);

  // Filter messages for current room
  const filteredMessages = useMemo(() => {
    return messages.filter(msg => {
      if (selectedRoom.type === 'general') {
        return !msg.department_id && !msg.recipient_user_id;
      }
      if (selectedRoom.type === 'department') {
        return msg.department_id === selectedRoom.id;
      }
      if (selectedRoom.type === 'dm') {
        const partnerUserId = selectedRoom.userId;
        const currentUserId = currentUser?.id;
        if (!partnerUserId || !currentUserId) return false;
        return (msg.sender_user_id === currentUserId && msg.recipient_user_id === partnerUserId) ||
               (msg.sender_user_id === partnerUserId && msg.recipient_user_id === currentUserId);
      }
      return false;
    });
  }, [messages, selectedRoom, currentUser]);

  // Search filter for room list
  const filteredRooms = useMemo(() => {
    if (!searchQuery.trim()) return chatRooms;
    return chatRooms.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [chatRooms, searchQuery]);

  // format text to make links clickable
  const formatMessageText = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a key={index} href={part} target="_blank" rel="noopener noreferrer" className="underline font-bold text-sky-400 hover:text-sky-300 break-all">
            {part}
          </a>
        );
      }
      return part;
    });
  };

  return (
    <div className="flex h-[calc(100vh-5rem)] gap-4 overflow-hidden p-4">
      {/* Sidebar: Chat Channels & Direct Messages */}
      <Card className="hidden md:flex flex-col w-72 shrink-0 border border-primary/10 glass-card overflow-hidden">
        <div className="p-4 border-b bg-muted/20 space-y-3">
          <div className="flex items-center gap-2 text-primary font-black">
            <MessageSquare className="w-5 h-5 animate-pulse" />
            <span>مساحة عمل تيم التسويق</span>
          </div>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="بحث عن قناة أو زميل..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pr-9 h-9 text-xs"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-4 custom-scrollbar">
          {/* Channels Section */}
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-muted-foreground px-3 py-1 uppercase tracking-wider">القنوات العامة والأقسام</p>
            {filteredRooms.filter(r => r.type === 'general' || r.type === 'department').map((room) => (
              <button
                key={room.id}
                onClick={() => setSelectedRoom(room)}
                className={`flex items-center gap-2 w-full p-2.5 rounded-xl text-right text-xs transition-all ${
                  selectedRoom.id === room.id 
                    ? 'gradient-bg text-white shadow-md' 
                    : 'hover:bg-primary/5 text-foreground/80'
                }`}
              >
                {room.type === 'general' ? <Hash className="w-4 h-4 shrink-0" /> : <Building2 className="w-4 h-4 shrink-0" />}
                <span className="truncate font-bold">{room.name}</span>
              </button>
            ))}
          </div>

          {/* DMs Section */}
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-muted-foreground px-3 py-1 uppercase tracking-wider">الرسائل المباشرة (DMs)</p>
            {filteredRooms.filter(r => r.type === 'dm').map((room) => (
              <button
                key={room.id}
                onClick={() => setSelectedRoom(room)}
                className={`flex items-center gap-2.5 w-full p-2.5 rounded-xl text-right text-xs transition-all ${
                  selectedRoom.id === room.id 
                    ? 'gradient-bg text-white shadow-md' 
                    : 'hover:bg-primary/5 text-foreground/80'
                }`}
              >
                <div className="relative">
                  <Avatar className="w-6 h-6 border">
                    <AvatarFallback className="text-[9px] font-bold bg-primary/10 text-primary">
                      {room.name.slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <span className={`absolute -bottom-0.5 -left-0.5 w-2 h-2 rounded-full border border-card ${
                    room.status === 'active' ? 'bg-emerald-500' : 'bg-muted-foreground/30'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate font-bold">{room.name}</p>
                  <p className={`text-[8px] truncate ${selectedRoom.id === room.id ? 'text-white/70' : 'text-muted-foreground'}`}>
                    {room.role || 'موظف'}
                  </p>
                </div>
              </button>
            ))}
            {filteredRooms.filter(r => r.type === 'dm').length === 0 && (
              <p className="text-[10px] text-muted-foreground text-center py-2 italic">لا يوجد زملاء متصلين حالياً</p>
            )}
          </div>
        </div>
      </Card>

      {/* Main Chat Area */}
      <Card className="flex-1 flex flex-col border border-primary/10 glass-card overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b bg-muted/20 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center text-white font-black text-sm shadow-md">
              {selectedRoom.type === 'general' ? (
                <Hash className="w-5 h-5" />
              ) : selectedRoom.type === 'department' ? (
                <Building2 className="w-5 h-5" />
              ) : (
                <Users className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="font-black text-sm text-primary flex items-center gap-1.5">
                {selectedRoom.name}
                {selectedRoom.type === 'dm' && <Badge variant="outline" className="text-[8px] py-0 px-1">{selectedRoom.role}</Badge>}
              </h3>
              <p className="text-[10px] text-muted-foreground">
                {selectedRoom.type === 'general' 
                  ? 'المجلس العام لوكالة التسويق لمناقشة كافة الأمور والمشاريع' 
                  : selectedRoom.type === 'department'
                  ? `قناة قسم: ${selectedRoom.name} - للتواصل الخاص بالقسم والمهام`
                  : `محادثة خاصة ومباشرة مع الزميل(ة) ${selectedRoom.name}`}
              </p>
            </div>
          </div>
        </div>

        {/* Message Ledger */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-secondary/5 custom-scrollbar">
          <AnimatePresence initial={false}>
            {filteredMessages.map((msg) => {
              const isOwn = currentUser && msg.sender_user_id === currentUser.id;
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 max-w-[75%] ${isOwn ? 'mr-auto flex-row-reverse' : 'ml-auto'}`}
                >
                  <Avatar className="w-8 h-8 shrink-0 shadow-sm border border-primary/10">
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
                    
                    <div className={`p-3 rounded-2xl text-xs shadow-sm border space-y-2 ${
                      isOwn 
                        ? 'gradient-bg text-white rounded-tl-none border-0' 
                        : 'bg-card border-border/50 text-foreground rounded-tr-none'
                    }`}>
                      {/* Message Content */}
                      <p className="leading-relaxed whitespace-pre-wrap">{formatMessageText(msg.message_content)}</p>

                      {/* File Attachment Render */}
                      {msg.file_url && (
                        <div className="pt-2 mt-2 border-t border-white/10">
                          {msg.file_type === 'image' ? (
                            <a href={msg.file_url} target="_blank" rel="noreferrer">
                              <img 
                                src={msg.file_url} 
                                alt={msg.file_name || "صورة"} 
                                className="max-w-xs max-h-48 rounded-lg shadow cursor-zoom-in hover:opacity-95 transition-all border bg-secondary"
                              />
                            </a>
                          ) : msg.file_type === 'video' ? (
                            <video src={msg.file_url} controls className="max-w-xs rounded-lg shadow border" />
                          ) : msg.file_type === 'audio' ? (
                            <audio src={msg.file_url} controls className="max-w-xs rounded" />
                          ) : (
                            <a 
                              href={msg.file_url} 
                              target="_blank" 
                              rel="noreferrer" 
                              className={`flex items-center gap-2 p-2 rounded-lg text-[10px] font-bold ${
                                isOwn ? 'bg-black/20 text-white' : 'bg-secondary/40 text-foreground'
                              }`}
                            >
                              <FileText className="w-5 h-5 text-primary" />
                              <div className="flex-1 min-w-0">
                                <p className="truncate">{msg.file_name || 'ملف مرفق'}</p>
                              </div>
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {filteredMessages.length === 0 && (
            <div className="text-center py-20 text-muted-foreground space-y-2">
              <Info className="w-8 h-8 mx-auto opacity-30" />
              <p className="text-xs">بداية هذه المحادثة. أرسل رسالة للبدء!</p>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSendMessage} className="p-3 border-t bg-card flex gap-2 items-center">
          {/* File attachment upload input */}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden"
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar" 
          />
          <Button 
            type="button" 
            variant="ghost" 
            onClick={triggerFileSelect} 
            className="h-10 w-10 p-0 rounded-xl hover:bg-secondary text-muted-foreground hover:text-primary transition-all"
            title="إرفاق ملف"
          >
            <Paperclip className="w-5 h-5" />
          </Button>

          <Input 
            value={text} 
            onChange={e => setText(e.target.value)}
            placeholder={`اكتب رسالة إلى ${selectedRoom.name}...`} 
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
