/* ============================================================
   PastorAbayomiBibleStories — Bible Heroes Adventure
   Version 1.1 — Client-side educational Bible game
   ============================================================ */
(function () {
  'use strict';

  const STORAGE_KEY = 'pabs_bible_heroes_v1';
  const defaultState = { unlockedLevel: 1, scores: {}, stars: {}, badges: {}, totalScore: 0, soundOn: true };
  let state = loadState();
  let currentLevel = null, currentChallenge = 0, levelScore = 0, levelStars = 0, mistakes = 0;
  let selectedItems = [], aimAngle = 0, hasFired = false;

  const LEVELS = {
    1: { id:1, title:'David & Goliath', badge:{id:'david',name:'DAVID THE BRAVE',icon:'🏅'}, challenges:5 },
    2: { id:2, title:'The Walls of Jericho', badge:{id:'jericho',name:'FAITHFUL WARRIOR',icon:'🏅'}, challenges:4, comingSoon:true },
    3: { id:3, title:'Joseph and His Dreams', badge:{id:'joseph',name:'DREAM KEEPER',icon:'🏅'}, challenges:4, comingSoon:true },
    4: { id:4, title:'The Three Hebrew Boys', badge:{id:'hebrew',name:'FAITH UNDER FIRE',icon:'🏅'}, challenges:4, comingSoon:true },
    5: { id:5, title:'Daniel in the Lions’ Den', badge:{id:'daniel',name:'LION’S DEN HERO',icon:'🏅'}, challenges:4, comingSoon:true },
    6: { id:6, title:'Jonah and the Great Fish', badge:{id:'jonah',name:'GREAT FISH ADVENTURER',icon:'🏅'}, challenges:4, comingSoon:true }
  };
  const BADGES = [
    {id:'david',name:'DAVID THE BRAVE',icon:'🏹',level:1},
    {id:'jericho',name:'FAITHFUL WARRIOR',icon:'🏛️',level:2},
    {id:'joseph',name:'DREAM KEEPER',icon:'🌈',level:3},
    {id:'hebrew',name:'FAITH UNDER FIRE',icon:'🔥',level:4},
    {id:'daniel',name:'LION’S DEN HERO',icon:'🦁',level:5},
    {id:'jonah',name:'GREAT FISH ADVENTURER',icon:'🐋',level:6}
  ];

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  function loadState(){
    try { const raw=localStorage.getItem(STORAGE_KEY); if(raw) return {...defaultState,...JSON.parse(raw)}; }
    catch(e) {}
    return {...defaultState};
  }
  function saveState(){ try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch(e) {} }

  function init(){
    bindEvents(); updateSoundButton(); updateLevelSelect(); showScreen('home');
  }
  function showScreen(name){
    $$('.screen').forEach(s=>s.classList.remove('active'));
    const screen=$(`#screen-${name}`); if(screen) screen.classList.add('active');
    if(name==='levels') updateLevelSelect();
    if(name==='achievements') renderAchievements();
  }
  function bindEvents(){
    const on=(id,fn)=>{const el=$(id); if(el) el.addEventListener('click',fn);};
    on('#btn-play',()=>{playSound('click');showScreen('levels');});
    on('#btn-howto',()=>{playSound('click');showScreen('howto');});
    on('#btn-stories',()=>{playSound('click');showScreen('stories');});
    on('#btn-achievements',()=>{playSound('click');showScreen('achievements');});
    on('#btn-parent',()=>{playSound('click');showScreen('parent');});
    on('#btn-sound',toggleSound);
    document.body.addEventListener('click',e=>{const goto=e.target.closest('[data-goto]');if(goto){playSound('click');showScreen(goto.dataset.goto);}});
    $$('.level-card').forEach(card=>card.addEventListener('click',()=>{
      const level=parseInt(card.dataset.level,10);
      if(card.classList.contains('unlocked')){playSound('click');startLevel(level);} else showToast('Complete previous levels to unlock!');
    }));
    on('#btn-quit-level',()=>{playSound('click');if(confirm('Leave this level? Progress in this level will be lost.'))showScreen('levels');});
    on('#btn-next-level',()=>{playSound('click');const next=currentLevel+1;if(next<=6&&state.unlockedLevel>=next)startLevel(next);else showScreen('levels');});
    on('#btn-replay',()=>{playSound('click');startLevel(currentLevel);});
    on('#btn-results-home',()=>{playSound('click');showScreen('home');});
  }

  function toggleSound(){ state.soundOn=!state.soundOn; saveState(); updateSoundButton(); if(state.soundOn) playSound('click'); }
  function updateSoundButton(){const btn=$('#btn-sound');if(btn)btn.textContent=state.soundOn?'🔊':'🔇';}
  let audioCtx=null;
  function getAudioCtx(){
    if(!audioCtx){try{audioCtx=new(window.AudioContext||window.webkitAudioContext)();}catch(e){return null;}}
    if(audioCtx.state==='suspended') audioCtx.resume().catch(()=>{}); return audioCtx;
  }
  function playTone(freq,duration,type='sine',vol=0.15){
    if(!state.soundOn)return; const ctx=getAudioCtx(); if(!ctx)return;
    try{const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type=type;osc.frequency.value=freq;gain.gain.setValueAtTime(vol,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+duration);osc.connect(gain);gain.connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+duration);}catch(e){}
  }
  function playSound(name){
    if(!state.soundOn)return;
    if(name==='click')playTone(600,.08,'square',.08);
    else if(name==='correct'){playTone(523,.12);setTimeout(()=>playTone(659,.15),100);setTimeout(()=>playTone(784,.2),200);}
    else if(name==='wrong')playTone(200,.25,'sawtooth',.1);
    else if(name==='complete'){playTone(523,.15);setTimeout(()=>playTone(659,.15),120);setTimeout(()=>playTone(784,.15),240);setTimeout(()=>playTone(1046,.3,'sine',.18),360);}
  }

  function updateLevelSelect(){
    $$('.level-card').forEach(card=>{
      const level=parseInt(card.dataset.level,10), unlocked=level<=state.unlockedLevel;
      card.classList.toggle('unlocked',unlocked);card.classList.toggle('locked',!unlocked);
      const status=card.querySelector('.level-status'); if(status)status.textContent=unlocked?(state.stars[level]?'✓ PLAY':'PLAY'):'🔒';
      const starsEl=$(`#stars-${level}`);if(starsEl){const s=state.stars[level]||0;starsEl.textContent='★'.repeat(s)+'☆'.repeat(3-s);}
    });
    const totalEl=$('#total-score');if(totalEl)totalEl.textContent=`⭐ ${state.totalScore}`;
  }
  function startLevel(levelId){
    const level=LEVELS[levelId];if(!level)return;
    if(level.comingSoon){showComingSoon(level);return;}
    currentLevel=levelId;currentChallenge=0;levelScore=0;levelStars=0;mistakes=0;selectedItems=[];aimAngle=0;hasFired=false;
    showScreen('game');updateGameHeader();renderChallenge();
  }
  function showComingSoon(level){
    showScreen('game');currentLevel=level.id;
    const content=$('#game-content');
    content.innerHTML=`<div class="narrative"><span class="story-emoji">✨</span><h3>${level.title}</h3><p>This adventure is coming soon! Complete previous levels and check back later.</p><p style="margin-top:1rem;color:var(--text-light);font-size:.9rem;">God has more exciting Bible stories waiting for you!</p><button class="btn btn-continue" id="btn-back-levels">BACK TO LEVELS</button></div>`;
    $('#btn-back-levels').addEventListener('click',()=>{playSound('click');showScreen('levels');});
    updateGameHeader(); $('#progress-fill').style.width='0%'; $('#challenge-indicator').textContent='Coming Soon';
  }
  function updateGameHeader(){
    const total=LEVELS[currentLevel]?.challenges||5,pct=(currentChallenge/total)*100;
    const fill=$('#progress-fill');if(fill)fill.style.width=pct+'%';
    const ind=$('#challenge-indicator');if(ind)ind.textContent=`Challenge ${Math.min(currentChallenge+1,total)}/${total}`;
    const score=$('#game-score');if(score)score.textContent=levelScore;
    const stars=$('#game-stars');if(stars)stars.textContent='⭐'+levelStars;
  }
  function renderChallenge(){
    const content=$('#game-content');if(!content)return;content.innerHTML='';
    if(currentLevel!==1){showComingSoon(LEVELS[currentLevel]);return;}
    switch(currentChallenge){case 0:renderIntro();break;case 1:renderItemSelect();break;case 2:renderQuiz();break;case 3:renderSling();break;case 4:renderLesson();break;default:finishLevel();}
    updateGameHeader();
  }
  function renderIntro(){
    $('#game-content').innerHTML=`<div class="narrative"><span class="story-emoji">🏹</span><h3>David &amp; Goliath</h3><p>Long ago, a young shepherd named <strong>David</strong> heard about a giant warrior named Goliath who challenged God's people.</p><p>Everyone was afraid — but David trusted God. He knew God would help him!</p><p>Are you ready to help David show courage and faith?</p><button class="btn btn-continue" id="btn-start-challenges">LET'S GO! ▶</button></div>`;
    $('#btn-start-challenges').addEventListener('click',()=>{playSound('click');currentChallenge=1;renderChallenge();});
  }
  function renderItemSelect(){
    selectedItems=[];
    const items=[{id:'sling',emoji:'🪢',name:'Sling',correct:true},{id:'stones',emoji:'🪨',name:'Smooth Stones',correct:true},{id:'sword',emoji:'⚔️',name:'Heavy Sword',correct:false},{id:'armor',emoji:'🛡️',name:'Big Armor',correct:false},{id:'staff',emoji:'🪵',name:'Shepherd Staff',correct:true},{id:'helmet',emoji:'⛑️',name:'Metal Helmet',correct:false}];
    $('#game-content').innerHTML=`<div class="challenge-box"><h3>🎒 Choose David's Items</h3><p class="instruction">Tap the things David actually used. He trusted God, not heavy armor!</p><div class="items-grid" id="items-grid"></div><div id="item-feedback"></div><button class="btn btn-continue" id="btn-check-items" disabled>CHECK SELECTION</button></div>`;
    const grid=$('#items-grid');items.forEach(item=>{const div=document.createElement('div');div.className='item-card';div.dataset.id=item.id;div.dataset.correct=item.correct;div.innerHTML=`<span class="item-emoji">${item.emoji}</span>${item.name}`;div.addEventListener('click',()=>toggleItem(div,item));grid.appendChild(div);});
    $('#btn-check-items').addEventListener('click',checkItems);
  }
  function toggleItem(el,item){playSound('click');if(el.classList.contains('selected')){el.classList.remove('selected');selectedItems=selectedItems.filter(i=>i.id!==item.id);}else{el.classList.add('selected');selectedItems.push(item);}$('#btn-check-items').disabled=selectedItems.length===0;}
  function checkItems(){
    const needed=['sling','stones','staff'],ids=selectedItems.map(i=>i.id),allCorrect=needed.every(id=>ids.includes(id))&&selectedItems.every(i=>i.correct),feedback=$('#item-feedback'),btn=$('#btn-check-items');
    if(allCorrect){playSound('correct');levelScore+=150;levelStars=Math.max(levelStars,1);feedback.innerHTML='<div class="feedback good">✅ Great job! David used his sling, stones, and staff — and trusted God!</div>';btn.textContent='CONTINUE ▶';btn.disabled=false;btn.onclick=()=>{playSound('click');currentChallenge=2;renderChallenge();};$$('.item-card').forEach(c=>c.style.pointerEvents='none');}
    else{playSound('wrong');mistakes++;levelScore=Math.max(0,levelScore-20);feedback.innerHTML='<div class="feedback bad">Hmm, not quite. David did not need heavy armor or a big sword. Try again!</div>';$$('.item-card.selected').forEach(c=>{if(c.dataset.correct==='false'){c.classList.add('wrong-select');setTimeout(()=>c.classList.remove('wrong-select','selected'),600);}});selectedItems=selectedItems.filter(i=>i.correct);$$('.item-card').forEach(c=>{if(c.dataset.correct==='false')c.classList.remove('selected');});}
    updateGameHeader();
  }
  function renderQuiz(){
    $('#game-content').innerHTML=`<div class="challenge-box"><h3>📖 Bible Knowledge</h3><p class="instruction">Who did the young shepherd David face?</p><div class="quiz-options" id="quiz-options"><button class="quiz-option" data-correct="false">A. Pharaoh</button><button class="quiz-option" data-correct="true">B. Goliath</button><button class="quiz-option" data-correct="false">C. Jonah</button><button class="quiz-option" data-correct="false">D. Daniel</button></div><div id="quiz-feedback"></div></div>`;
    $$('.quiz-option').forEach(btn=>btn.addEventListener('click',()=>answerQuiz(btn)));
  }
  function answerQuiz(btn){
    const correct=btn.dataset.correct==='true';$$('.quiz-option').forEach(b=>b.style.pointerEvents='none');
    if(correct){playSound('correct');btn.classList.add('correct');levelScore+=200;levelStars=Math.max(levelStars,2);$('#quiz-feedback').innerHTML='<div class="feedback good">✅ Yes! David faced the giant Goliath.</div><button class="btn btn-continue" id="btn-quiz-next">CONTINUE ▶</button>';}
    else{playSound('wrong');btn.classList.add('wrong');mistakes++;levelScore=Math.max(0,levelScore-30);$$('.quiz-option').forEach(b=>{if(b.dataset.correct==='true')b.classList.add('correct');});$('#quiz-feedback').innerHTML='<div class="feedback bad">Not quite. The correct answer is Goliath!</div><button class="btn btn-continue" id="btn-quiz-next">CONTINUE ▶</button>';}
    updateGameHeader();$('#btn-quiz-next').addEventListener('click',()=>{playSound('click');currentChallenge=3;renderChallenge();});
  }
  function renderSling(){
    hasFired=false;aimAngle=0;
    $('#game-content').innerHTML=`<div class="challenge-box"><h3>🎯 Help David Aim!</h3><p class="instruction">Use the arrows to aim, then tap FIRE! Aim carefully at Goliath.</p><div class="sling-area"><div class="sling-scene" id="sling-scene"><div class="goliath-target" id="goliath">🧍</div><div class="aim-line" id="aim-line"></div><div class="stone" id="stone"></div><div class="david-slinger">🧒</div></div><div class="aim-controls"><button class="aim-btn" id="aim-left">◀</button><button class="aim-btn fire-btn" id="aim-fire">FIRE!</button><button class="aim-btn" id="aim-right">▶</button></div></div><div id="sling-feedback"></div></div>`;
    updateAimVisual();$('#aim-left').addEventListener('click',()=>{if(hasFired)return;playSound('click');aimAngle=Math.max(aimAngle-8,-35);updateAimVisual();});$('#aim-right').addEventListener('click',()=>{if(hasFired)return;playSound('click');aimAngle=Math.min(aimAngle+8,35);updateAimVisual();});$('#aim-fire').addEventListener('click',fireSling);
  }
  function updateAimVisual(){const line=$('#aim-line');if(line)line.style.transform=`rotate(${aimAngle}deg)`;}
  function fireSling(){
    if(hasFired)return;hasFired=true;const stone=$('#stone'),goliath=$('#goliath');if(!stone||!goliath)return;
    const hit=Math.abs(aimAngle)<=12,tx=80+aimAngle*2.5,ty=-140+Math.abs(aimAngle)*1.5;stone.style.setProperty('--tx',tx+'px');stone.style.setProperty('--ty',ty+'px');stone.classList.add('flying');
    setTimeout(()=>{if(hit){playSound('correct');goliath.classList.add('hit');levelScore+=250;levelStars=3;$('#sling-feedback').innerHTML='<div class="feedback good">🎉 Bullseye! David trusted God and the stone hit its mark!</div><button class="btn btn-continue" id="btn-sling-next">CONTINUE ▶</button>';}else{playSound('wrong');mistakes++;levelScore=Math.max(0,levelScore+50);$('#sling-feedback').innerHTML='<div class="feedback bad">Almost! Try aiming more toward the center next time. David still trusted God!</div><button class="btn btn-continue" id="btn-sling-next">CONTINUE ▶</button>';}updateGameHeader();$('#btn-sling-next').addEventListener('click',()=>{playSound('click');currentChallenge=4;renderChallenge();});},700);
  }
  function renderLesson(){
    $('#game-content').innerHTML=`<div class="lesson-box"><div class="lesson-emoji">💡</div><h3>Bible Lesson</h3><p>David was not the strongest or biggest person in the army. But he <strong>trusted God</strong>. God helped David, and God can help you too when you trust Him!</p><p>Remember: True courage comes from faith in God.</p><div class="verse-ref">📖 1 Samuel 17</div><button class="btn btn-continue" id="btn-finish" style="margin-top:1.2rem;">FINISH LEVEL 🎉</button></div>`;
    $('#btn-finish').addEventListener('click',()=>{playSound('click');finishLevel();});
  }
  function finishLevel(){
    if(mistakes===0)levelScore+=100;else if(mistakes<=1)levelScore+=50;
    if(levelStars<1)levelStars=1;if(levelScore>=500&&levelStars<2)levelStars=2;if(levelScore>=700&&mistakes<=1)levelStars=3;
    const prevBest=state.scores[currentLevel]||0;if(levelScore>prevBest){state.totalScore=state.totalScore-prevBest+levelScore;state.scores[currentLevel]=levelScore;}
    const prevStars=state.stars[currentLevel]||0;if(levelStars>prevStars)state.stars[currentLevel]=levelStars;
    if(state.unlockedLevel<currentLevel+1&&currentLevel<6)state.unlockedLevel=currentLevel+1;
    const badge=LEVELS[currentLevel].badge;state.badges[badge.id]=true;saveState();playSound('complete');showResults();
  }
  function showResults(){
    showScreen('results');const badge=LEVELS[currentLevel].badge;$('#results-title').textContent='LEVEL COMPLETE!';$('#results-stars').textContent='⭐'.repeat(levelStars)+'☆'.repeat(3-levelStars);$('#results-score-val').textContent=levelScore;$('#badge-name').textContent=badge.name;$('#results-lesson').textContent='You showed courage and learned that trusting God makes us brave!';
    const nextBtn=$('#btn-next-level');if(currentLevel<6&&state.unlockedLevel>currentLevel){nextBtn.style.display='block';nextBtn.textContent='PLAY NEXT LEVEL';}else if(currentLevel>=6){nextBtn.style.display='block';nextBtn.textContent='ALL LEVELS DONE! 🎉';}else nextBtn.style.display='none';
  }
  function renderAchievements(){
    const grid=$('#badges-grid');if(!grid)return;grid.innerHTML='';BADGES.forEach(b=>{const unlocked=!!state.badges[b.id],div=document.createElement('div');div.className='badge-card'+(unlocked?' unlocked':'');div.innerHTML=`<span class="b-icon">${unlocked?b.icon:'🔒'}</span><span class="b-name">${b.name}</span>`;grid.appendChild(div);});
    const total=$('#ach-total-score');if(total)total.textContent=state.totalScore;const completed=$('#ach-levels');if(completed)completed.textContent=Object.keys(state.stars).length;let totalStars=0;Object.values(state.stars).forEach(s=>totalStars+=s);const stars=$('#ach-stars');if(stars)stars.textContent=totalStars;
  }
  let toastTimer;function showToast(msg){const t=$('#toast');if(!t)return;t.textContent=msg;t.classList.remove('hidden');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.add('hidden'),2500);}
  document.addEventListener('DOMContentLoaded',init);
})();
