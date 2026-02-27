document.addEventListener('DOMContentLoaded', () => {
    const $ = (s) => document.querySelector(s);
    const $$ = (s) => document.querySelectorAll(s);

    const SUPABASE_URL = 'https://zmhshfqpyekrcddsqhuz.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptaHNoZnFweWVrcmNkZHNxaHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxMzgxNDAsImV4cCI6MjA3NTcxNDE0MH0.I_AMK5MYj4Ett8fFnAEq-w8HHSqL9NYKnfuaTZOy4O8';
    const VAPID_PUBLIC_KEY = 'BOGxyDihJa42olM4Y_rO3za2VQ6cojG89XkE3O38V1p_vLxzeYPaa2PS2QX7ciJfwpt0bEdDQPjB_qMOAQhN_KY';

    const { createClient } = window.supabase;
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // --- FUNGSI DEBUG CONSOLE (Tetap Ada) ---
    function showDebugMessage(message) {
        try {
            let debugConsole = document.getElementById('debug-console');
            if (!debugConsole) {
                debugConsole = document.createElement('div');
                debugConsole.id = 'debug-console';
                document.body.appendChild(debugConsole);
            }
            const entry = document.createElement('pre');
            entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
            debugConsole.insertBefore(entry, debugConsole.firstChild);
        } catch (e) { console.error(e); }
    }

    // --- FUNGSI TOAST NOTIFIKASI (BARU & DIPERBAIKI) ---
    function showLuminoxNotify(title, message, type = 'success', icon = 'fa-bell') {
        const container = $('#notification-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type} show`;
        toast.innerHTML = `
            <i class="fas ${icon}"></i>
            <div style="flex:1;">
                <strong style="display:block; font-size: 14px; margin-bottom: 2px;">${title}</strong>
                <span style="font-size: 12px; opacity: 0.9;">${message}</span>
            </div>
        `;
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('hide');
            setTimeout(() => toast.remove(), 500);
        }, 5000);
    }

    // --- LOGIKA REALTIME LISTENER (BARU) ---
    function listenToUpdates() {
        // Pantau tabel posts untuk postingan baru admin
        supabase
            .channel('realtime-posts')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, payload => {
                showLuminoxNotify("Postingan Baru!", payload.new.title, "success", "fa-cloud-upload-alt");
                fetchPosts(); // Refresh list otomatis
            })
            .subscribe();

        // Pantau tabel announcements untuk pesan kustom admin
        supabase
            .channel('realtime-announcements')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'announcements' }, payload => {
                const data = payload.new;
                showLuminoxNotify(data.title, data.message, data.type || 'info', data.icon || 'fa-bullhorn');
            })
            .subscribe();
    }

    // --- STATE MANAGEMENT ---
    const state = {
        posts: [],
        user: null,
        profile: null,
        currentCategory: '',
        activeView: 'home',
        wishlist: JSON.parse(localStorage.getItem('luminox_wishlist') || '[]'),
        history: JSON.parse(localStorage.getItem('luminox_history') || '[]'),
        isSearchActive: false
    };

    // --- FUNGSI FETCH & RENDER (FITUR ASLI ANDA) ---
    const fetchPosts = async () => {
        const { data, error } = await supabase.from('posts').select('*').order('created_at', { ascending: false });
        if (error) { showDebugMessage('Error fetch: ' + error.message); return; }
        state.posts = data;
        renderPosts();
    };

    const renderPosts = () => {
        const grid = $('#posts-grid');
        const skeleton = $('#skeleton-grid');
        if (!grid) return;
        
        grid.innerHTML = '';
        if (skeleton) skeleton.style.display = 'none';

        const filtered = state.currentCategory 
            ? state.posts.filter(p => p.category === state.currentCategory)
            : state.posts;

        filtered.forEach(post => {
            const card = document.createElement('div');
            card.className = 'post-card';
            card.innerHTML = `
                <img src="${post.image_url}" alt="${post.title}" loading="lazy">
                <div class="post-content">
                    <span class="post-category">${post.category}</span>
                    <h3 class="post-title">${post.title}</h3>
                </div>
            `;
            card.onclick = () => showPostDetail(post);
            grid.appendChild(card);
        });
    };

    // --- HANDLING TOMBOL LONCENG ---
    const setupNotificationBtn = () => {
        const btn = $('#notifications-toggle');
        if (!btn) return;

        // Cek izin awal
        if (Notification.permission === "granted") btn.classList.add('subscribed');

        btn.addEventListener('click', async () => {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                btn.classList.toggle('subscribed');
                const isSub = btn.classList.contains('subscribed');
                showLuminoxNotify(
                    isSub ? "Notifikasi Aktif" : "Notifikasi Senyap",
                    isSub ? "Anda akan menerima update otomatis." : "Popup dinonaktifkan.",
                    "info"
                );
            } else {
                alert("Harap aktifkan izin notifikasi di browser Anda.");
            }
        });
    };

    // --- INISIALISASI ---
    const init = async () => {
        // Setup Skeleton
        const skeletonGrid = $('#skeleton-grid');
        if (skeletonGrid) {
            const skeletonHTML = `<div class="skeleton-card"><div class="skeleton-img shimmer"></div><div class="skeleton-content"><div class="skeleton-line shimmer" style="width: 80%;"></div></div></div>`;
            skeletonGrid.innerHTML = Array(4).fill(skeletonHTML).join('');
        }

        setupNotificationBtn();
        listenToUpdates();
        
        await fetchPosts();
        // Cek Auth Session
        const { data: { session } } = await supabase.auth.getSession();
        state.user = session?.user || null;
        
        showDebugMessage('Luminox System Ready');
    };

    // --- LISTENER NAVIGASI (FITUR ASLI ANDA) ---
    $('#auth-menu-btn')?.addEventListener('click', () => showDebugMessage('Opening Auth...'));
    $('#chat-menu-btn')?.addEventListener('click', () => {
        showLuminoxNotify("Chat", "Membuka ruang obrolan...", "info", "fa-comments");
    });

    init();
});
