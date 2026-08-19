// Nova Chat - Client-Side Logic
const SUPABASE_URL = 'https://ecikviwuxfieryrmfgdq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_qZmFog48wGY8aMzEzl3P2Q_bFktF5X3';
const ADMIN_USER = 'nova_admin';

let supabase = null;
let currentUser = null;
let isSubscribed = false;

// Initialize
async function init() {
  try {
    const { createClient } = supabase;
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    
    // Check session
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      currentUser = session.user.email || session.user.id;
      showChatScreen();
    }
  } catch (err) {
    console.error('Init error:', err);
  }
}

// Login with Telegram username
async function login(username) {
  const btn = document.getElementById('loginBtn');
  const errorEl = document.getElementById('loginError');
  
  btn.disabled = true;
  btn.textContent = 'Logging in...';
  errorEl.textContent = '';
  
  // Normalize username
  let tgUsername = username.trim().toLowerCase();
  if (tgUsername.startsWith('@')) tgUsername = tgUsername.slice(1);
  
  try {
    // Use email auth with special format
    const email = tgUsername + '@nova.chat';
    const { data, error } = await supabase.auth.signInWithOtp({ email });
    
    if (error) throw error;
    
    // Store user info
    localStorage.setItem('nova_user', tgUsername);
    localStorage.setItem('nova_email', email);
    
    currentUser = tgUsername;
    document.getElementById('currentUser').textContent = '@' + tgUsername;
    
    showChatScreen();
    
  } catch (err) {
    errorEl.textContent = 'Login failed: ' + err.message;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Login';
  }
}

// Show chat screen
function showChatScreen() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('chatScreen').style.display = 'flex';
  
  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/chat/sw.js')
      .then(reg => console.log('SW registered'))
      .catch(err => console.error('SW error:', err));
  }
  
  // Subscribe to realtime messages
  subscribeToMessages();
  
  // Load initial messages
  loadMessages();
}

// Subscribe to realtime messages
function subscribeToMessages() {
  if (isSubscribed) return;
  
  // Listen for new messages from admin
  supabase
    .channel('nova_messages')
    .on('postgres_changes', 
      { event: 'INSERT', schema: 'public', table: 'nova_messages', filter: eceiver=eq. },
      (payload) => {
        appendMessage(payload.new);
        playNotificationSound();
      }
    )
    .subscribe((status) => {
      isSubscribed = true;
      console.log('Subscribed:', status);
    });
}

// Load messages
async function loadMessages() {
  const { data, error } = await supabase
    .from('nova_messages')
    .select('*')
    .or(sender.eq.,receiver.eq.)
    .or(sender.eq.,receiver.eq.)
    .order('created_at', { ascending: true });
  
  if (error) {
    console.error('Load error:', error);
    return;
  }
  
  const container = document.getElementById('messagesContainer');
  container.innerHTML = '';
  
  if (data && data.length > 0) {
    container.style.display = 'flex';
    document.getElementById('emptyState').style.display = 'none';
    
    data.forEach(msg => appendMessage(msg));
  }
}

// Append message to UI
function appendMessage(msg) {
  const container = document.getElementById('messagesContainer');
  const isMe = msg.sender === currentUser;
  
  const msgEl = document.createElement('div');
  msgEl.className = 'msg ' + (isMe ? 'msg-admin' : 'msg-sender') + (isMe ? ' msg-self' : ' msg-other');
  
  // Media handling
  if (msg.media_url) {
    const mediaTag = msg.media_type === 'video' 
      ? <video src="" controls class="msg-media"></video>
      : <img src="" class="msg-media" loading="lazy">;
    msgEl.innerHTML = mediaTag + <div class="msg-time"></div>;
  } else if (msg.content) {
    msgEl.innerHTML = escapeHtml(msg.content) + <div class="msg-time"></div>;
  }
  
  container.appendChild(msgEl);
  container.scrollTop = container.scrollHeight;
  
  // Mark as read
  if (!isMe) {
    supabase.from('nova_messages').update({ is_read: true }).eq('id', msg.id);
  }
}

// Send message
async function sendMessage(content, mediaUrl = null, mediaType = null) {
  if (!content && !mediaUrl) return;
  
  const { error } = await supabase.from('nova_messages').insert({
    sender: currentUser,
    receiver: ADMIN_USER,
    content: content,
    media_url: mediaUrl,
    media_type: mediaType
  });
  
  if (error) {
    console.error('Send error:', error);
    alert('Failed to send message');
  }
}

// Upload media to Supabase Storage
async function uploadMedia(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  const fileName = ${currentUser}_.;
  const folder = file.type.startsWith('video/') ? 'videos/' : 'images/';
  
  const { data, error } = await supabase.storage
    .from('nova_chat_media')
    .upload(folder + fileName, file);
  
  if (error) throw error;
  
  const { data: { publicUrl } } = supabase.storage
    .from('nova_chat_media')
    .getPublicUrl(folder + fileName);
  
  return publicUrl;
}

// Format time
function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Play notification sound
function playNotificationSound() {
  const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbsGczIjx/pdDW2uHZcgYCIB0wXyGe2Nne3uDt8/f5+h8gIyEhHTNfoKDb3+Lh5ens8fPz8/v/Gh4fH+Ds8/Pz+PwbHiAfIODv8/Pz8/P8/hweIB/g7O/z8/Pz/PweIB/g7O/z8/Pz8/zn5x4gH+Ds7/Pz8/Pz/OYgICEg4O/y8/Pz8/zkISAgIOHv8/Pz8/z+4yEg4e/y8/Pz/P7jISDh7/Hx8fH8/uMhIOHu8fHx8fz+4yEg4e/x8fHx/P7jISDh7/Hx8fH8/uMhIOHu8fHx8fz+4yEg4e/x8fHx/P7jISDh7/Hx8fH8/uMhIOHu8fHx8fz+4yEg4e/x8fHx/P7jISDh7/Hx8fH8/uMhIOHu8fHx8fz+4yEg4e/x8fHx/P7jISDh7/Hx8fH8/uMhIOHu8fHx8fz+4yEg4e/x8fHx/P7jISDh7/Hx8fH8/uMhIOHu8fHx8fz+4yEg4e/x8fHx/P7jISDh7/Hx8fH8/uMhIOHu8fHx8fz+4yEg4e/x8fHx/P7jISDh7/Hx8fH8/uMhIOHu8fHx8fz+4yEg4e/x8fHx/P7jISDh7/Hx8fH8/uMhIOHu8fHx8fz+4yEg4e/x8fHx/P7jISDh7/Hx8fH8/uMhIOHu8fHx8fz+4yEg4e/x8fHx/P7jISDh7/Hx8fH8/uMhIOHu8fHx8fz+4yEg4e/x8fHx/P7jISDh7/Hx8fH8/uMhIOHu8fHx8fz+4yEg4e/x8fHx/P7jISDh7/Hx8fH8/uMhIOHu8fHx8fz+4yEg4e/x8fHx/P7jISDh7/Hx8fH8/uMhIOHu8fHx8fz+4yEg4e/x8fHx/P7jISDh7/Hx8fH8/uMhIOHu8fHx8fz+4yEg4e/x8fHx/P7jISDh7/Hx8fH8/uMhIOHu8fHx8fz+4yEg4e/x8fHx/P7jISDh7/Hx8fH8/uMhIOHu8fHx8fz+4yEg4e/x8fHx/P7jISDh7/Hx8fH8/uMhIOHu8fHx8fz+4yEg4e/x8fHx/P7jISDh7/Hx8fH8/uMhIOHu8fHx8fz+4yEg4e/x8fHx/P7jISDh7/Hx8fH8/uMhIOHu8fHx8fz+4yEg4e/x8fHx/P7jISDh7/Hx8fH8/uMhIOHu8fHx8fz+4yEg4e/x8fHx/P7jISDh7/Hx8fH8/uMhIOHu8fHx8fz+4yEg4e/x8fHx/P7jISDh7/Hx8fH8/uMhIOHu8fHx8fz+4yEg4e/x8fHx/P7jISDh7/Hx8fH8/uMhIOHu8fHx8fz+4yEg4e/x8fHx/P7jISDh7/Hx8fH8/uMhIOHu8fHx8fz+4yEg4e');
  audio.volume = 0.3;
  audio.play().catch(() => {});
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  init();
  
  // Login button
  document.getElementById('loginBtn').addEventListener('click', () => {
    const username = document.getElementById('tgUsername').value;
    if (username.trim()) login(username);
  });
  
  // Enter key for login
  document.getElementById('tgUsername').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const username = e.target.value;
      if (username.trim()) login(username);
    }
  });
  
  // Back button
  document.getElementById('backBtn').addEventListener('click', () => {
    if (confirm('Logout?')) {
      localStorage.removeItem('nova_user');
      localStorage.removeItem('nova_email');
      location.reload();
    }
  });
  
  // Message input
  const messageInput = document.getElementById('messageInput');
  const sendBtn = document.getElementById('sendBtn');
  
  messageInput.addEventListener('input', () => {
    sendBtn.disabled = !messageInput.value.trim();
    // Auto-resize textarea
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
  });
  
  messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const content = messageInput.value.trim();
      if (content) {
        sendMessage(content);
        messageInput.value = '';
        messageInput.style.height = 'auto';
        sendBtn.disabled = true;
      }
    }
  });
  
  sendBtn.addEventListener('click', () => {
    const content = messageInput.value.trim();
    if (content) {
      sendMessage(content);
      messageInput.value = '';
      messageInput.style.height = 'auto';
      sendBtn.disabled = true;
    }
  });
  
  // Media button
  document.getElementById('mediaBtn').addEventListener('click', () => {
    document.getElementById('fileInput').click();
  });
  
  document.getElementById('fileInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file size (max 10MB for images, 50MB for video)
    const maxSize = file.type.startsWith('video/') ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('File too large. Max ' + (maxSize / 1024 / 1024) + 'MB for ' + (file.type.startsWith('video/') ? 'video' : 'image'));
      return;
    }
    
    sendBtn.disabled = true;
    sendBtn.textContent = '⏳';
    
    try {
      const url = await uploadMedia(file);
      const mediaType = file.type.startsWith('video/') ? 'video' : 'image';
      await sendMessage(null, url, mediaType);
    } catch (err) {
      console.error('Upload error:', err);
      alert('Failed to upload media');
    } finally {
      sendBtn.disabled = false;
      sendBtn.textContent = '➤';
      e.target.value = '';
    }
  });
});