(function(){
  'use strict';

  if (window.__BO_LIVECHAT_GLOBAL_NOTIFICATION__) return;
  window.__BO_LIVECHAT_GLOBAL_NOTIFICATION__ = true;

  var SOUND_URL = 'assets/audio/livechat_sound.mp3';
  var REMINDER_INTERVAL_MS = 8000;
  var REMINDER_LOCK_MS = 6500;
  var audio = null;
  var audioUnlocked = false;
  var queuedSound = false;
  var firstSnapshot = true;
  var lastUnreadTotal = Number(localStorage.getItem('bo_livechat_last_unread_total') || 0);
  var lastIncomingTime = Number(localStorage.getItem('bo_livechat_last_incoming_time') || 0);
  var currentUnreadTotal = 0;
  var latestUnreadConversation = null;
  var unsubscribe = null;
  var reminderTimer = null;
  var originalTitle = document.title;
  var activeBrandId = Number(localStorage.getItem('bo_active_brand_id') || 1) || 1;
  var activeBrandDomains = [];

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  async function init(){
    // SPA replay re-dispatches DOMContentLoaded; installSoundUnlock()/startReminderLoop() add document/window listeners and timers that accumulate, so init once.
    if(window.__BO_LIVECHAT_INITED) return; window.__BO_LIVECHAT_INITED=1;
    installSoundUnlock();
    requestNotificationPermission();
    await resolveActiveBrand();
    startListener();
    startReminderLoop();
  }

  async function resolveActiveBrand(){
    activeBrandId = Number(localStorage.getItem('bo_active_brand_id') || 1) || 1;
    activeBrandDomains = [];
    try{
      if(window.BO_BRAND && typeof window.BO_BRAND.context === 'function'){
        var payload = await window.BO_BRAND.context(false);
        var data = payload && payload.data ? payload.data : {};
        var brands = Array.isArray(data.brands) ? data.brands : [];
        var brand = brands.find(function(b){ return Number(b.id) === activeBrandId; });
        if(brand){
          activeBrandDomains = [brand.primaryDomain].concat(String(brand.domainAliases || '').split(/[\s,;]+/)).map(function(v){
            return String(v || '').trim().toLowerCase().replace(/^https?:\/\//,'').replace(/\/.*$/,'');
          }).filter(Boolean);
        }
      }
    }catch(e){}
    if(activeBrandId === 1 && activeBrandDomains.indexOf('titanx7.com') === -1) activeBrandDomains.push('titanx7.com','www.titanx7.com');
  }

  function belongsToActiveBrand(item){
    var id = Number(item && item.brandId || 0);
    if(id > 0) return id === activeBrandId;
    var domain = String(item && item.brandDomain || '').trim().toLowerCase().replace(/^https?:\/\//,'').replace(/\/.*$/,'');
    if(domain) return activeBrandDomains.indexOf(domain) !== -1;
    return activeBrandId === 1;
  }

  function startListener(){
    if (!window.firebase || !window.NAGA_FIREBASE_CONFIG || window.NAGA_FIREBASE_CONFIG.apiKey === 'YOUR_FIREBASE_API_KEY') {
      console.warn('[Livechat notification] Firebase is not available on this page.');
      return;
    }
    try{
      if (!firebase.apps.length) firebase.initializeApp(window.NAGA_FIREBASE_CONFIG);
      var db = firebase.firestore();
      if (unsubscribe) unsubscribe();
      unsubscribe = db.collection('conversations').orderBy('updatedAt', 'desc').limit(100)
        .onSnapshot(handleSnapshot, function(error){
          console.warn('[Livechat notification] Listener unavailable:', error && error.message ? error.message : error);
        });
    }catch(error){
      console.warn('[Livechat notification] Unable to initialise:', error && error.message ? error.message : error);
    }
  }

  function handleSnapshot(snapshot){
    var total = 0;
    var latestIncoming = null;
    var latestIncomingMs = 0;

    snapshot.forEach(function(doc){
      var item = Object.assign({id: doc.id}, doc.data() || {});
      if(!belongsToActiveBrand(item)) return;
      var unread = Number(item.adminUnreadCount || 0);
      var senderIsMember = String(item.lastSenderType || '').toLowerCase() === 'member';
      var itemMs = timestampValue(item.updatedAt);
      total += unread;
      if (unread > 0 && senderIsMember && itemMs >= latestIncomingMs){
        latestIncoming = item;
        latestIncomingMs = itemMs;
      }
    });

    currentUnreadTotal = total;
    latestUnreadConversation = latestIncoming;
    updatePageIndicators(total);

    if (!total){
      queuedSound = false;
      stopCurrentSound();
      clearReminderClaim();
    }

    if (firstSnapshot){
      firstSnapshot = false;
      // Establish the incoming-message baseline without treating old messages as
      // newly arrived. The separate reminder loop will still keep sounding while
      // any admin unread count remains above zero, exactly until all are read.
      if (!lastIncomingTime){
        lastIncomingTime = latestIncomingMs;
        lastUnreadTotal = total;
        persistState(total, latestIncomingMs);
        return;
      }
    }

    var hasNewIncoming = latestIncoming && latestIncomingMs > lastIncomingTime;
    var unreadIncreased = total > lastUnreadTotal;
    if ((hasNewIncoming || unreadIncreased) && latestIncoming && claimNotification(latestIncoming, latestIncomingMs)){
      notifyIncoming(latestIncoming);
    }

    lastUnreadTotal = total;
    if (latestIncomingMs > lastIncomingTime) lastIncomingTime = latestIncomingMs;
    persistState(total, lastIncomingTime);
  }

  function startReminderLoop(){
    if (reminderTimer) clearInterval(reminderTimer);
    reminderTimer = setInterval(function(){
      if (currentUnreadTotal <= 0) return;
      if (!claimReminderSound()) return;
      playSound();
    }, REMINDER_INTERVAL_MS);
  }

  function claimReminderSound(){
    var now = Date.now();
    try{
      var previous = Number(localStorage.getItem('bo_livechat_reminder_sound_at') || 0);
      if (previous && now - previous < REMINDER_LOCK_MS) return false;
      localStorage.setItem('bo_livechat_reminder_sound_at', String(now));
    }catch(e){}
    return true;
  }

  function clearReminderClaim(){
    try{ localStorage.removeItem('bo_livechat_reminder_sound_at'); }catch(e){}
  }

  function persistState(total, incomingMs){
    try{
      localStorage.setItem('bo_livechat_last_unread_total', String(total));
      localStorage.setItem('bo_livechat_last_incoming_time', String(incomingMs || 0));
    }catch(e){}
  }

  function updatePageIndicators(total){
    document.title = total ? '(' + total + ') ' + originalTitle : originalTitle;
    document.querySelectorAll('[data-livechat-unread-total]').forEach(function(badge){
      badge.textContent = total;
      badge.style.display = total ? 'inline-flex' : 'none';
    });
  }

  function claimNotification(conversation, messageTime){
    var key = [conversation.id || '', messageTime || 0, conversation.lastMessage || ''].join('|');
    var now = Date.now();
    try{
      var previous = JSON.parse(localStorage.getItem('bo_livechat_global_sound_lock') || '{}');
      if (previous.key === key && now - Number(previous.time || 0) < 10000) return false;
      localStorage.setItem('bo_livechat_global_sound_lock', JSON.stringify({key:key, time:now}));
    }catch(e){}
    return true;
  }

  function timestampValue(value){
    try{
      if (value && typeof value.toMillis === 'function') return value.toMillis();
      if (value && typeof value.seconds === 'number') return value.seconds * 1000 + Math.floor(Number(value.nanoseconds || 0) / 1000000);
      if (typeof value === 'number') return value;
      if (typeof value === 'string') return Date.parse(value) || 0;
    }catch(e){}
    return 0;
  }

  function getAudio(){
    if (!audio){
      audio = new Audio(SOUND_URL);
      audio.preload = 'auto';
      audio.load();
    }
    return audio;
  }

  function installSoundUnlock(){
    var unlock = function(){ unlockSound(); };
    document.addEventListener('pointerdown', unlock, true);
    document.addEventListener('keydown', unlock, true);
    document.addEventListener('touchstart', unlock, true);
    window.addEventListener('focus', function(){
      if (queuedSound && currentUnreadTotal > 0) playSound();
      else if (currentUnreadTotal <= 0) queuedSound = false;
    });
  }

  function unlockSound(){
    if (audioUnlocked) return;
    try{
      var player = getAudio();
      player.muted = true;
      player.currentTime = 0;
      var played = player.play();
      if (played && typeof played.then === 'function'){
        played.then(function(){
          player.pause();
          player.currentTime = 0;
          player.muted = false;
          audioUnlocked = true;
          if (queuedSound && currentUnreadTotal > 0){ queuedSound = false; playSound(); }
          else if (currentUnreadTotal <= 0) queuedSound = false;
        }).catch(function(){ player.muted = false; });
      }
    }catch(e){}
  }

  function stopCurrentSound(){
    try{
      if (!audio) return;
      audio.pause();
      audio.currentTime = 0;
    }catch(e){}
  }

  function playSound(){
    if (currentUnreadTotal <= 0) return;
    try{
      var player = getAudio();
      player.muted = false;
      player.pause();
      player.currentTime = 0;
      var played = player.play();
      if (played && typeof played.then === 'function'){
        played.then(function(){ audioUnlocked = true; queuedSound = false; })
          .catch(function(){ queuedSound = currentUnreadTotal > 0; });
      }
    }catch(e){ queuedSound = currentUnreadTotal > 0; }
  }

  function notifyIncoming(conversation){
    playSound();
    try{
      if ('Notification' in window && Notification.permission === 'granted'){
        var notification = new Notification('New live chat message', {
          body: (conversation.memberName || conversation.memberUsername || 'Member') + ': ' + (conversation.lastMessage || 'New message'),
          tag: 'livechat-' + conversation.id,
          renotify: true,
          silent: true
        });
        notification.onclick = function(){
          try{ window.focus(); }catch(e){}
          location.href = 'livechat.html' + (conversation.id ? '?conversation=' + encodeURIComponent(conversation.id) : '');
          notification.close();
        };
      }
    }catch(e){}
  }

  function requestNotificationPermission(){
    if ('Notification' in window && Notification.permission === 'default'){
      setTimeout(function(){ try{ Notification.requestPermission().catch(function(){}); }catch(e){} }, 1200);
    }
  }
})();
