/* Read-only Google Sheets availability; no credentials are shipped to visitors. */
(function(root){
'use strict';
const DAY=86400000;
const statuses=['Available','Booked','On hold','Unavailable'];
const ids=['marina-1','marina-2','marina-3','marina-4','vetrohod'];
function iso(value){
 if(typeof value==='number')return new Date(Date.UTC(1899,11,30)+value*DAY).toISOString().slice(0,10);
 const match=String(value||'').match(/^Date\((\d{4}),(\d{1,2}),(\d{1,2})(?:,.*)?\)$/);
 if(match)return new Date(Date.UTC(+match[1],+match[2],+match[3])).toISOString().slice(0,10);
 if(/^\d{4}-\d{2}-\d{2}$/.test(value||'')&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value)return value;
 throw new Error('Invalid availability date');
}
function normalize(rows){
 const records=[];const keys=new Set();
 for(const row of rows){
  if(row.every(value=>value==null||value===''))continue;
  const [id,rawStart,rawEnd,rawStatus]=row;
  if(!ids.includes(id))throw new Error('Unknown yacht in availability sheet');
  const start=iso(rawStart),end=iso(rawEnd),status=String(rawStatus||'').trim();
  if(!statuses.includes(status)||Date.parse(end)-Date.parse(start)!==7*DAY||new Date(start).getUTCDay()!==6)throw new Error('Invalid weekly availability row');
  const key=id+'|'+start;if(keys.has(key))throw new Error('Duplicate yacht/week in availability sheet');keys.add(key);
  records.push({id,start,end,status});
 }
 if(!records.length)throw new Error('Availability sheet is empty');
 return records;
}
function weekStatus(records,id,start){return records.find(row=>row.id===id&&row.start===start)?.status||'Unknown'}
function rangeStatus(records,id,start,end){
 if(!start||!end||end<=start||new Date(start).getUTCDay()!==6||new Date(end).getUTCDay()!==6)return 'Unknown';
 const found=[];
 for(let time=Date.parse(start);time<Date.parse(end);time+=7*DAY)found.push(weekStatus(records,id,new Date(time).toISOString().slice(0,10)));
 return ['Booked','Unavailable','On hold','Unknown'].find(status=>found.includes(status))||'Available';
}
const api={normalize,weekStatus,rangeStatus,iso};
root.SailingAvailability=api;
if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
