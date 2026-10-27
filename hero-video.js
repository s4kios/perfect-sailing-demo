// Decorative hero footage, with a still-image fallback and explicit motion control.
(()=>{
 const video=document.querySelector('#hero-video');
 const toggle=document.querySelector('#hero-video-toggle');
 if(!video||!toggle)return;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let manuallyPaused=false,visible=true,failed=false;
 video.muted=true;
 const label=()=>{const playing=!video.paused;toggle.textContent=playing?'Pause video':'Play video';toggle.setAttribute('aria-label',playing?'Pause background video':'Play background video')};
 const play=async()=>{
  if(failed)return;
  if(!video.getAttribute('src'))video.src=video.dataset.src;
  try{await video.play()}catch{label()}
 };
 video.addEventListener('playing',()=>{video.classList.add('is-playing');label()});
 video.addEventListener('pause',label);
 video.addEventListener('error',()=>{failed=true;video.classList.remove('is-playing');toggle.hidden=true});
 toggle.addEventListener('click',()=>{if(video.paused){manuallyPaused=false;play()}else{manuallyPaused=true;video.pause()}});
 const sync=()=>{if(document.hidden||!visible||reduced.matches||manuallyPaused)video.pause();else play()};
 document.addEventListener('visibilitychange',sync);
 reduced.addEventListener('change',()=>{if(reduced.matches)video.classList.remove('is-playing');sync()});
 const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync()},{threshold:0});
 observer.observe(video.closest('.hero'));
 toggle.hidden=false;label();
})();
