'use strict';
const boats = [
{id:'marina-1',name:'Marina I',model:'Jeanneau Sun Odyssey 439',type:'Monohull',base:'Skiathos',length:'13.34',guests:10,cabins:'4',deposit:2000,image:'marina-1.png',rates:[2310,3020,3630,4290,4890,4290,3630,3020,2310]},
{id:'marina-2',name:'Marina II',model:'Jeanneau Sun Odyssey 490',type:'Monohull',base:'Skiathos',length:'14.42',guests:12,cabins:'5+1',deposit:2500,image:'marina-2.jpg',rates:[3630,4620,5720,6540,7540,6540,5720,4620,3630]},
{id:'marina-3',name:'Marina III',model:'Lagoon 42',type:'Catamaran',base:'Skiathos',length:'12.94',guests:12,cabins:'4+1',deposit:3500,image:'marina-3.jpg',rates:[4620,6490,7920,9460,10780,9460,7920,6490,4620]},
{id:'marina-4',name:'Marina IV',model:'Lagoon 42',type:'Catamaran',base:'Skiathos',length:'12.94',guests:12,cabins:'4+2',deposit:3500,image:'marina-4.jpg',rates:[null,null,7650,null,10350,null,null,null,4300],pricingNote:'Some published 2027 rates differ between the desktop and mobile price tables. Our team will confirm the quote for those weeks.'},
{id:'vetrohod',name:'Vetrohod',model:'Fountaine Pajot Isla 40',type:'Catamaran',base:'Volos',length:'12.26',guests:12,cabins:'4+2',deposit:3000,image:'vetrohod.jpg',rates:[4180,4950,6490,7590,8690,7590,6490,4950,4180]}
];
const boundaries=['2027-04-03','2027-04-24','2027-05-22','2027-06-19','2027-07-24','2027-08-28','2027-09-11','2027-09-25','2027-10-16','2027-10-30'];
const $=selector=>document.querySelector(selector);
const currency=value=>new Intl.NumberFormat('en-IE',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(value);
const dateOf=value=>new Date(value+'T12:00:00Z');
const addWeeks=(value,weeks)=>{const date=dateOf(value);date.setUTCDate(date.getUTCDate()+7*weeks);return date.toISOString().slice(0,10)};
const formatDate=value=>new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(dateOf(value));
function quote(boat,start,weeks){if(!boundaries.includes(start)&&(!start||Number.isNaN(dateOf(start).getTime())))return null;if(dateOf(start).getUTCDay()!==6||!Number.isInteger(weeks)||weeks<1)return null;let total=0;for(let week=0;week<weeks;week++){const date=addWeeks(start,week);const index=boundaries.findIndex((boundary,i)=>i<9&&date>=boundary&&date<boundaries[i+1]);if(index<0||boat.rates[index]===null)return null;total+=boat.rates[index]}return total}
const starts=[];for(let start=boundaries[0];start<boundaries[9];start=addWeeks(start,1))starts.push(start);
function populateDates(input){input.value=starts[0]}
function validSearchRange(){return (!$('#departure').value&&!$('#return-date').value)||validRange($('#departure'),$('#return-date'))}
function selectedWeeks(start,end){return (dateOf(end)-dateOf(start))/(7*24*60*60*1000)}
function validRange(startInput,endInput){const startValid=validDeparture(startInput);const end=endInput.value;const returnValid=!!end&&end>=addWeeks(starts[0],1)&&end<=boundaries[9]&&dateOf(end).getUTCDay()===6;const later=startValid&&returnValid&&end>startInput.value;endInput.setCustomValidity(!returnValid?'Please choose a Saturday return within the published 2027 season.':!later?'Return must be after departure.':'');return startValid&&returnValid&&later}
const availability={state:'loading',records:[],updated:null,pending:null};
// Read-only link access approved by the owner; no private credentials in the site.
const availabilityUrl='https://docs.google.com/spreadsheets/d/1oPS9nnAxBUWn15sBhV8uDpom0Xb1IRv5_Wx9HmzI6_g/gviz/tq?gid=883023712&range=A5:F1000&headers=1&tq=select%20A%2CD%2CE%2CF&tqx=out:json';
function boatRangeStatus(id,start,end){return availability.state==='ready'?SailingAvailability.rangeStatus(availability.records,id,start,end):'Unknown'}
function boatWeekStatus(id,start){return availability.state==='ready'?SailingAvailability.weekStatus(availability.records,id,start):'Unknown'}
function availabilityMessage(){return availability.state==='ready'?'Example availability · synced with Google Sheets. Final confirmation is made by our team.':availability.state==='loading'?'Checking availability…':'Availability could not be refreshed. Please retry or contact our team.'}
async function refreshAvailability(){
 if(availability.pending)return availability.pending;
 const previous=availability.state+JSON.stringify(availability.records);
 availability.pending=(async()=>{
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),12000);
  try{
   const response=await fetch(availabilityUrl+'&_='+Date.now(),{signal:controller.signal,cache:'no-store',credentials:'omit'});
   if(!response.ok)throw new Error('Sheet is not readable');
   const text=await response.text();const first=text.indexOf('{'),last=text.lastIndexOf('}');
   const data=JSON.parse(text.slice(first,last+1));
   if(data.status!=='ok'||!data.table?.rows)throw new Error('Invalid sheet response');
   availability.records=SailingAvailability.normalize(data.table.rows.map(row=>row.c.map(cell=>cell?.v??null)));
   availability.state='ready';availability.updated=Date.now();
  }catch(error){availability.state='error';availability.records=[]}
  finally{clearTimeout(timer);availability.pending=null;if(previous!==availability.state+JSON.stringify(availability.records)){renderFleet();document.dispatchEvent(new Event('availabilitychange'))}}
 })();
 return availability.pending;
}
let activeFilter='all';
let fleetBase='all';
function setFleetBase(base){base=base||'all';fleetBase=base;$('#base').value=base==='all'?'':base;document.querySelectorAll('[data-fleet-base]').forEach(button=>{const active=button.dataset.fleetBase===base;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active))});renderFleet()}
function currentSelection(){return {start:$('#departure').value,weeks:selectedWeeks($('#departure').value,$('#return-date').value),base:$('#base').value}}
function renderFleet(){if(!validSearchRange())return;const {start,weeks}=currentSelection();const base=fleetBase;const matches=boats.filter(boat=>(base==='all'||boat.base===base)&&(activeFilter==='all'||boat.type===activeFilter)&&(!start||boatRangeStatus(boat.id,start,addWeeks(start,weeks))==='Available'));$('#results-summary').textContent=`${matches.length} yacht${matches.length===1?'':'s'} · ${start?`${formatDate(start)} — ${formatDate(addWeeks(start,weeks))}`:'All dates'}`;$('.availability-note').textContent=start?'Browse the available yachts for your selected dates.':'Select your dates to discover available yachts and charter prices.';$('#availability-status').textContent=availabilityMessage();$('#empty-state').textContent=availability.state!=='ready'&&start?'Availability is not available yet. Retry below, or clear your dates to browse every yacht.':'No yachts are available for the full selected period with these filters. Try other dates, another base, or clear your dates to browse the fleet.';$('#empty-state').hidden=matches.length>0;$('#fleet-grid').innerHTML=matches.map(boat=>{const price=quote(boat,start,weeks);return `<article class="yacht-card"><button type="button" class="card-image yacht-image-button" data-boat="${boat.id}" aria-label="Open ${boat.name} yacht details"><img src="assets/${boat.image}" alt="${boat.name}, ${boat.model}" loading="lazy"><span class="card-tag">${boat.type.toUpperCase()}</span></button><div class="card-body"><span class="card-base">⌖ ${boat.base} · Bareboat / skippered</span><h3>${boat.name}</h3><div class="card-model">${boat.model}</div><div class="specs"><span>↔ ${boat.length} m</span><span>${boat.guests} guests</span><span>${boat.cabins} cabins</span></div><div class="card-bottom"><div class="card-price ${start?'':'no-dates'}">${!start?'Select dates for pricing':price===null?'Request quote':currency(price)}<small>${!start?'':price===null?'Rate to be confirmed':`Charter rate · ${weeks} week${weeks>1?'s':''}`}</small></div><button class="card-button" data-boat="${boat.id}" aria-label="View ${boat.name} and request booking">View yacht <span aria-hidden="true">↗</span></button></div></div></article>`}).join('');document.querySelectorAll('[data-boat]').forEach(button=>button.addEventListener('click',()=>openBoat(button.dataset.boat)))}
function setFilter(filter){activeFilter=filter;document.querySelectorAll('[data-filter]').forEach(button=>{const active=button.dataset.filter===filter;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active))});renderFleet()}
$('#search-form').addEventListener('submit',event=>{event.preventDefault();if(!validSearchRange())return;setFleetBase($('#base').value);scrollToSection($('#fleet'))});
function validDeparture(input){const valid=starts.includes(input.value);input.setCustomValidity(valid?'':'Please choose a Saturday within the published 2027 season.');return valid}
['departure','return-date'].forEach(id=>$('#'+id).addEventListener('change',()=>{if(validSearchRange())renderFleet()}));
document.querySelectorAll('[data-fleet-base]').forEach(button=>button.addEventListener('click',()=>setFleetBase(button.dataset.fleetBase)));
document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>setFilter(button.dataset.filter)));
document.querySelectorAll('[data-category]').forEach(link=>link.addEventListener('click',()=>setFilter(link.dataset.category)));
document.querySelectorAll('[data-base]').forEach(link=>link.addEventListener('click',()=>{$('#base').value=link.dataset.base;activeFilter='all';setFilter('all');setFleetBase(link.dataset.base)}));
$('#menu-toggle').addEventListener('click',()=>{const open=$('#navigation').classList.toggle('open');$('#menu-toggle').setAttribute('aria-expanded',String(open))});
$('#navigation').querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>{$('#navigation').classList.remove('open');$('#menu-toggle').setAttribute('aria-expanded','false')}));
const dialog=$('#boat-dialog');let previousFocus;
function openBoat(id){const boat=boats.find(item=>item.id===id);if(!boat)return;previousFocus=document.activeElement;const {start,weeks}=currentSelection();$('#dialog-content').innerHTML=`<div class="dialog-grid"><div><div id="yacht-gallery" class="yacht-gallery" role="region" aria-label="${boat.name} photo gallery"></div><div class="dialog-info"><span class="eyebrow">${boat.type.toUpperCase()} · ${boat.base.toUpperCase()}</span><h2 id="dialog-title">${boat.name}</h2><p>${boat.model}</p><div class="detail-specs"><div><small>LENGTH</small>${boat.length} m</div><div><small>CAPACITY</small>Up to ${boat.guests} guests</div><div><small>CABINS</small>${boat.cabins}</div><div><small>SECURITY DEPOSIT</small>${currency(boat.deposit)}</div></div><p>Weekly charters: Saturday check-in at 17:00 and Saturday check-out at 09:00. Choose bareboat or request an experienced skipper.</p>${boat.pricingNote?`<p>${boat.pricingNote}</p>`:''}<p>Skipper fees, mandatory charges and optional extras will be itemised in your final quote. The charter rate shown does not include those extras. Security deposit is separate.</p></div></div><div class="request-panel"><span class="demo-label">CLIENT DEMO · NO REQUESTS ARE SENT</span><h3>Make this week yours.</h3><form id="request-form"><div class="request-date-field"><label>Charter dates</label><button type="button" id="request-dates" class="range-trigger" aria-haspopup="dialog"></button><input type="hidden" id="request-start"><input type="hidden" id="request-end"></div><div class="form-row"><label>Charter type<select id="charter-type"><option>Bareboat</option><option>With a skipper</option></select></label><label>Guests<select id="guests">${Array.from({length:boat.guests},(_,i)=>`<option value="${i+1}">${i+1} guest${i?'s':''}</option>`).join('')}</select></label></div><div id="request-quote" class="quote-box" aria-live="polite"></div><div class="form-row"><label>Full name<input name="name" autocomplete="name" maxlength="100" required></label><label>Email address<input type="email" name="email" autocomplete="email" maxlength="200" required></label></div><label>Phone (optional)<input type="tel" name="phone" autocomplete="tel" maxlength="50"></label><label>Your sailing plans (optional)<textarea name="message" maxlength="2000" placeholder="Tell us a little about your trip…"></textarea></label><label class="consent"><input type="checkbox" required><span>I understand this is a demonstration. No request will be sent, no details will be stored, and no reservation will be made.</span></label><p id="form-status" class="form-status" role="status"></p><button class="primary" type="submit">PREVIEW BOOKING REQUEST ↗</button></form></div></div>`;$('#request-start').value=start;$('#request-end').value=start?addWeeks(start,weeks):'';$('#guests').value=String(Math.min(4,boat.guests));
mountYachtGallery($('#yacht-gallery'),boat);
mountRangePicker($('#request-dates'),$('#request-start'),$('#request-end'),updateQuote,boat.id);
const onAvailabilityChange=()=>{if($('#request-start'))updateQuote()};document.addEventListener('availabilitychange',onAvailabilityChange);dialog.addEventListener('close',()=>document.removeEventListener('availabilitychange',onAvailabilityChange),{once:true});
const selectedWeeksForRequest=selectedWeeks;
function updateQuote(){if(!$('#request-start').value&&!$('#request-end').value){$('#request-quote').textContent='Select dates for pricing.';$('#form-status').textContent='Choose your charter dates before sending a request.';$('#request-form button[type="submit"]').disabled=true;return}if(!validRange($('#request-start'),$('#request-end'))){$('#request-quote').textContent='Choose a valid Saturday-to-Saturday period to see your charter rate.';$('#form-status').textContent=$('#request-start').validationMessage||$('#request-end').validationMessage;$('#request-form button[type="submit"]').disabled=true;return}const status=boatRangeStatus(boat.id,$('#request-start').value,$('#request-end').value);if(status!=='Available'){$('#request-quote').textContent=status==='Unknown'?'Availability cannot be confirmed for these dates.':'This period includes weeks marked '+status.toLowerCase()+'.';$('#form-status').textContent='Choose another period or contact our team.';$('#request-form button[type="submit"]').disabled=true;return}const selectedStart=$('#request-start').value;const end=$('#request-end').value;const selectedWeeks=selectedWeeksForRequest(selectedStart,end);const valid=true;const rate=quote(boat,selectedStart,selectedWeeks);$('#request-quote').innerHTML=`<span>Charter rate · ${selectedWeeks} week${selectedWeeks>1?'s':''}</span><strong>${rate===null?'Quote on request':currency(rate)}</strong><small>Check-in: Saturday, ${formatDate(selectedStart)} at 17:00 · ${boat.base}</small><small>Check-out: Saturday, ${formatDate(end)} at 09:00</small><small>${$('#charter-type').value==='With a skipper'?'Skipper fee to be confirmed separately. ':''}Extras and security deposit excluded. Subject to availability and final confirmation.</small>`;$('#form-status').textContent=valid?'':'This trip ends outside the published 2027 season. Choose an earlier departure or a shorter duration.';$('#request-form button[type="submit"]').disabled=!valid}
['request-start','request-end','charter-type'].forEach(key=>$('#'+key).addEventListener('change',updateQuote));updateQuote();
$('#request-form').addEventListener('submit',async event=>{event.preventDefault();if(!event.currentTarget.reportValidity())return;const departure=$('#request-start').value;const end=$('#request-end').value;if(!validRange($('#request-start'),$('#request-end')))return;$('#request-form button[type="submit"]').disabled=true;await refreshAvailability();if(!dialog.open||!$('#request-start'))return;if($('#request-start').value!==departure||$('#request-end').value!==end||boatRangeStatus(boat.id,departure,end)!=='Available'){updateQuote();return}const duration=selectedWeeks(departure,end);const rate=quote(boat,departure,duration);$('#dialog-content').innerHTML=`<div class="success"><div class="success-mark">✓</div><span class="eyebrow">DEMONSTRATION COMPLETE</span><h2 id="dialog-title">Your sailing plans, ready to review.</h2><p>${boat.name} · ${boat.base}<br>${formatDate(departure)} at 17:00 — ${formatDate(addWeeks(departure,duration))} at 09:00<br>${rate===null?'Charter quote to be confirmed':`Charter rate: ${currency(rate)} · extras excluded`}</p><p>On the live platform, your request would now go to the Perfect Sailing team. We would check availability, contact you, and confirm your booking manually.</p><p><strong>This was a preview. Nothing was sent or saved, and no boat has been reserved.</strong></p><button class="primary" id="back-to-fleet">BACK TO THE FLEET</button></div>`;$('#back-to-fleet').addEventListener('click',()=>dialog.close());$('#back-to-fleet').focus()});dialog.showModal();$('.close-dialog').focus()}
$('.close-dialog').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',event=>{if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close()}});dialog.addEventListener('close',()=>{if(previousFocus&&previousFocus.isConnected)previousFocus.focus()});mountRangePicker($('#charter-dates'),$('#departure'),$('#return-date'),renderFleet);renderFleet();


function mountRangePicker(trigger,startInput,endInput,onChange,boatId=null){
 const refresh=()=>{if(!startInput.value||!endInput.value){trigger.textContent='Select dates';trigger.setAttribute('aria-label','Select dates');return}trigger.textContent=`${formatDate(startInput.value)} — ${formatDate(endInput.value)}  ▦`;trigger.setAttribute('aria-label',`Charter dates: ${formatDate(startInput.value)} to ${formatDate(endInput.value)}. Choose departure and return.`)};
 refresh();
 startInput.addEventListener('change',refresh);endInput.addEventListener('change',refresh);
 trigger.addEventListener('click',()=>{
  const picker=document.createElement('dialog');picker.className='range-calendar';picker.setAttribute('aria-label','Choose charter dates');
  let start=startInput.value,end=endInput.value,choosingEnd=false,month=start?Number(start.slice(5,7))-1:3;
  function draw(){
   const title=new Intl.DateTimeFormat('en-GB',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(2027,month,1)));
   const first=(new Date(Date.UTC(2027,month,1)).getUTCDay()+6)%7;const days=new Date(Date.UTC(2027,month+1,0)).getUTCDate();
   let cells='<span class="calendar-blank"></span>'.repeat(first);
   for(let day=1;day<=days;day++){
    const value=`2027-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const saturday=dateOf(value).getUTCDay()===6;
    let enabled=saturday&&value>=boundaries[0]&&value<=boundaries[9]&&(choosingEnd||value<boundaries[9]);
    const weekStart=new Date(Date.parse(value)-(dateOf(value).getUTCDay()+1)%7*86400000).toISOString().slice(0,10);
    const status=boatId&&weekStart>=boundaries[0]&&weekStart<boundaries[9]?boatWeekStatus(boatId,weekStart):'';
    const statusClass=status?'status-'+status.toLowerCase().replace(' ','-'):'';
    if(boatId&&enabled)enabled=choosingEnd&&value>start?boatRangeStatus(boatId,start,value)==='Available':boatWeekStatus(boatId,value)==='Available';
    const endpoint=value===start||value===end;
    cells+=`<button type="button" data-day="${value}" ${enabled?'':'disabled'} class="calendar-day ${statusClass} ${endpoint?'endpoint':''} ${start&&end&&value>start&&value<end?'in-range':''}" aria-label="${formatDate(value)}${status?' · Week: '+status:''}${boatId&&choosingEnd&&value>start&&enabled?' · Return available':''}" title="${status?'Week starting '+formatDate(weekStart)+': '+status:''}" ${endpoint?'aria-pressed="true"':''}>${day}</button>`;
   }
   picker.innerHTML=`<div class="calendar-top"><h2>Choose your charter dates</h2><button type="button" data-close aria-label="Close calendar">✕</button></div><p class="calendar-instruction" aria-live="polite">${choosingEnd?'Now choose your return Saturday.':'Choose a departure Saturday, then a return Saturday.'}</p><div class="calendar-month"><button type="button" data-prev aria-label="Previous month" ${month<=3?'disabled':''}>‹</button><h3>${title}</h3><button type="button" data-next aria-label="Next month" ${month>=9?'disabled':''}>›</button></div><div class="calendar-weekdays">${['Mo','Tu','We','Th','Fr','Sa','Su'].map(d=>`<span>${d}</span>`).join('')}</div><div class="calendar-grid">${cells}</div><div class="calendar-selection" aria-live="polite"><span>DEPARTURE · 17:00<strong>${start?formatDate(start):'Choose date'}</strong></span><span>RETURN · 09:00<strong>${end?formatDate(end):'Choose date'}</strong></span></div>${boatId?'<div class="calendar-legend"><span class="legend-available">Available</span><span class="legend-booked">Booked</span><span class="legend-hold">On hold</span><span class="legend-unknown">Unavailable / unknown</span></div><p class="calendar-source">'+availabilityMessage()+'</p>':''}<p class="calendar-note">${boatId?'Colours show each week from Saturday departure. A return Saturday can fall on the start of a booked week. ':''}Saturday-to-Saturday charters. Select any number of weeks within the 2027 season.</p><button type="button" class="primary calendar-apply" ${!start||!end||(boatId&&boatRangeStatus(boatId,start,end)!=='Available')?'disabled':''}>APPLY DATES ↗</button>`;
   picker.querySelector('[data-close]').onclick=()=>picker.close();
   picker.querySelector('[data-prev]').onclick=()=>{month--;draw();picker.querySelector('[data-prev]').focus()};
   picker.querySelector('[data-next]').onclick=()=>{month++;draw();picker.querySelector('[data-next]').focus()};
   picker.querySelectorAll('[data-day]').forEach(button=>button.onclick=()=>{
    const value=button.dataset.day;
    if(!choosingEnd||value<=start){start=value;end='';choosingEnd=true}else{end=value;choosingEnd=false}
    draw();picker.querySelector(`[data-day="${value}"]`).focus();
   });
   picker.querySelector('.calendar-apply').onclick=()=>{if(boatId&&boatRangeStatus(boatId,start,end)!=='Available'){draw();return}startInput.value=start;endInput.value=end;refresh();onChange();picker.close()};
  }
  const redraw=()=>{const focused=document.activeElement?.getAttribute('data-day');draw();if(focused)picker.querySelector(`[data-day="${focused}"]`)?.focus()};document.addEventListener('availabilitychange',redraw);
  picker.addEventListener('close',()=>{document.removeEventListener('availabilitychange',redraw);picker.remove();trigger.focus()});document.body.append(picker);draw();picker.showModal();picker.querySelector('[data-close]').focus();
 });
}


// Ease section navigation to a gradual stop; leave wheel and touch scrolling native.
let sectionScrollFrame=0;
function cancelSectionScroll(){cancelAnimationFrame(sectionScrollFrame);sectionScrollFrame=0}
function scrollToSection(target){
 cancelSectionScroll();
 const from=window.scrollY;
 const top=target?target.getBoundingClientRect().top+from-28:0;
 const to=Math.max(0,Math.min(top,document.documentElement.scrollHeight-window.innerHeight));
 if(matchMedia('(prefers-reduced-motion: reduce)').matches){window.scrollTo({top:to,behavior:'instant'});return}
 const distance=to-from;if(Math.abs(distance)<2)return;
 const duration=Math.min(1100,Math.max(550,Math.abs(distance)*.3));
 const began=performance.now();
 function step(now){const progress=Math.min(1,(now-began)/duration);const eased=1-Math.pow(1-progress,4);window.scrollTo({top:from+distance*eased,behavior:'instant'});if(progress<1)sectionScrollFrame=requestAnimationFrame(step);else sectionScrollFrame=0}
 sectionScrollFrame=requestAnimationFrame(step);
}
document.addEventListener('click',event=>{
 if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
 const link=event.target.closest('a[href^="#"]');if(!link)return;
 const hash=link.getAttribute('href');const target=hash==='#'?null:document.getElementById(hash.slice(1));
 if(hash!=='#'&&!target)return;
 event.preventDefault();history.pushState(null,'',hash);scrollToSection(target);
});
window.addEventListener('wheel',cancelSectionScroll,{passive:true});
window.addEventListener('touchstart',cancelSectionScroll,{passive:true});
window.addEventListener('pointerdown',cancelSectionScroll,{passive:true});
window.addEventListener('keydown',event=>{if(['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' ','Escape'].includes(event.key))cancelSectionScroll()});

const linkedBase=new URLSearchParams(location.search).get("base");if(["Skiathos","Volos"].includes(linkedBase)){$("#base").value=linkedBase;setFleetBase(linkedBase)}


const yachtGalleries={"marina-1": {"folder": "marina-i", "files": ["Marina-I-01.webp", "Marina-I-02.webp", "Marina-I-03.webp", "Marina-I-04.webp", "Marina-I-05.webp", "Marina-I-06.webp", "Marina-I-07.webp", "Marina-I-08.webp", "Marina-I-09.webp"]}, "marina-2": {"folder": "marina-ii", "files": ["Marina-II-01.webp", "Marina-II-02.webp", "Marina-II-03.webp", "Marina-II-04.webp", "Marina-II-05.webp", "Marina-II-06.webp", "Marina-II-07.webp", "Marina-II-08.webp", "Marina-II-09.webp"]}, "marina-3": {"folder": "marina-iii", "files": ["Marina-III-01.webp", "Marina-III-02.webp", "Marina-III-03.webp", "Marina-III-04.webp", "Marina-III-05.webp", "Marina-III-06.webp", "Marina-III-07.webp", "Marina-III-09.webp", "Marina-III-10-layout.webp"]}, "marina-4": {"folder": "marina-iv", "files": ["Marina-IV-01.webp", "Marina-IV-02.webp", "Marina-IV-03.webp", "Marina-IV-04.webp", "Marina-IV-05.webp", "Marina-IV-06.webp", "Marina-IV-07.webp", "Marina-IV-08.webp", "Marina-IV-09.webp"]}, "vetrohod": {"folder": "vetrohod-gallery", "files": ["Vetrohod-01.webp", "Vetrohod-02.webp", "Vetrohod-03.webp", "Vetrohod-04.webp", "Vetrohod-05.webp", "Vetrohod-06.webp", "Vetrohod-07.webp", "Vetrohod-08.webp", "Vetrohod-09.webp"]}};
function mountYachtGallery(host,boat){
 const {files,folder}=yachtGalleries[boat.id];
 let index=0;
 host.innerHTML=`<button type="button" class="gallery-open" aria-label="Enlarge ${boat.name} photo"><img width="1280" height="720"><span class="gallery-expand">View full size ↗</span></button><button type="button" class="gallery-prev" aria-label="Previous photo">‹</button><button type="button" class="gallery-next" aria-label="Next photo">›</button><span class="gallery-count" role="status" aria-live="polite"></span>`;
 const update=(container,size)=>{const img=container.querySelector('img');img.src=`assets/${folder}/${size}/${files[index]}`;img.alt=files[index].includes('layout')?`${boat.name} yacht layout`:`${boat.name} — photo ${index+1}`;container.querySelector('.gallery-count').textContent=`${index+1} / ${files.length}`};
 const wire=(container,refresh)=>{
  const move=step=>{index=(index+step+files.length)%files.length;refresh()};
  container.querySelector('.gallery-prev').onclick=()=>move(-1);
  container.querySelector('.gallery-next').onclick=()=>move(1);
  container.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();event.stopPropagation();move(event.key==='ArrowRight'?1:-1)}});
  let touch;
  container.addEventListener('touchstart',event=>{touch=event.touches.length===1?{x:event.touches[0].clientX,y:event.touches[0].clientY}:null},{passive:true});
  container.addEventListener('touchend',event=>{if(!touch)return;const dx=event.changedTouches[0].clientX-touch.x,dy=event.changedTouches[0].clientY-touch.y;if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)){move(dx<0?1:-1)}touch=null},{passive:true});
 };
 wire(host,()=>update(host,'Gallery'));update(host,'Gallery');
 host.querySelector('.gallery-open').onclick=()=>{
  const viewer=document.createElement('dialog');viewer.className='yacht-lightbox';viewer.setAttribute('aria-label',`${boat.name} enlarged photo gallery`);
  viewer.innerHTML=`<div class="lightbox-top"><span>${boat.name}</span><button type="button" class="lightbox-close" aria-label="Close enlarged photos">✕</button></div><div class="lightbox-stage"><img width="2560" height="1440"><button type="button" class="gallery-prev" aria-label="Previous photo">‹</button><button type="button" class="gallery-next" aria-label="Next photo">›</button></div><span class="gallery-count" role="status" aria-live="polite"></span>`;
  wire(viewer,()=>update(viewer,'Enlarged'));update(viewer,'Enlarged');
  viewer.querySelector('.lightbox-close').onclick=()=>viewer.close();
  viewer.addEventListener('close',()=>{update(host,'Gallery');viewer.remove();host.querySelector('.gallery-open').focus()});
  document.body.append(viewer);viewer.showModal();viewer.querySelector('.lightbox-close').focus();
 };
}

$('#clear-dates').addEventListener('click',()=>{for(const id of ['departure','return-date']){const input=$('#'+id);input.value='';input.setCustomValidity('');input.dispatchEvent(new Event('change'))}renderFleet()});
$('#clear-base').addEventListener('click',()=>setFleetBase('all'));

$('#retry-availability').addEventListener('click',refreshAvailability);
refreshAvailability();
setInterval(()=>{if(!document.hidden)refreshAvailability()},60000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshAvailability()});
