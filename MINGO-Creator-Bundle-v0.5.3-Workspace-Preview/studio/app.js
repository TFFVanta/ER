const STORAGE='exotic.workspace.v053';
const defaults={workspace:'MINGO / Exotic',version:'VX.0.5.3',projects:[
{id:'platform',name:'Exotic Platform',description:'Foundation architecture and platform services',status:'active',tasks:[
{id:'p1',title:'Core architecture',done:true},{id:'p2',title:'Platform CLI',done:true},{id:'p3',title:'Graph runtime',done:false},{id:'p4',title:'Security boundaries',done:false}]},
{id:'studio',name:'Exotic Studio',description:'Desktop creator command center',status:'active',tasks:[
{id:'s1',title:'Dashboard shell',done:true},{id:'s2',title:'Persistent workspace',done:true},{id:'s3',title:'Workflow editor',done:false},{id:'s4',title:'Native data bridge',done:false}]},
{id:'continuity',name:'Continuity Engine',description:'Cross-device workspace state',status:'planned',tasks:[
{id:'c1',title:'State snapshot format',done:true},{id:'c2',title:'Device synchronization',done:false},{id:'c3',title:'Conflict resolution',done:false}]}]};
let state=JSON.parse(localStorage.getItem(STORAGE)||'null')||structuredClone(defaults);
let selected=state.projects[0]?.id||null;
const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
function save(){localStorage.setItem(STORAGE,JSON.stringify(state));render()}
function pct(p){if(!p.tasks.length)return 0;return Math.round(p.tasks.filter(t=>t.done).length/p.tasks.length*100)}
function render(){
 $('#projectCount').textContent=state.projects.length;
 const tasks=state.projects.flatMap(p=>p.tasks), done=tasks.filter(t=>t.done).length;
 const overall=tasks.length?Math.round(done/tasks.length*100):0;
 $('#overallProgress').textContent=overall+'%';$('#overallBar').style.width=overall+'%';
 $('#activeTasks').textContent=tasks.length-done;
 $('#projects').innerHTML='';
 state.projects.forEach(p=>{
  const d=document.createElement('div');d.className='project-item'+(p.id===selected?' selected':'');
  d.innerHTML=`<b>${escapeHtml(p.name)}</b><small>${escapeHtml(p.description||'No description')}</small><div class="project-meta"><span>${p.tasks.filter(t=>!t.done).length} open</span><span>${pct(p)}%</span></div>`;
  d.onclick=()=>{selected=p.id;render()};$('#projects').appendChild(d)
 });
 const p=state.projects.find(x=>x.id===selected);
 $('#emptyState').classList.toggle('hidden',!!p);$('#projectDetail').classList.toggle('hidden',!p);
 if(!p)return;
 $('#detailName').textContent=p.name;$('#detailDescription').textContent=p.description||'No description';
 $('#detailProgressText').textContent=pct(p)+'%';$('#detailProgressBar').style.width=pct(p)+'%';
 $('#tasks').innerHTML='';
 p.tasks.forEach(t=>{
  const row=document.createElement('div');row.className='task'+(t.done?' done':'');
  row.innerHTML=`<input type="checkbox" ${t.done?'checked':''}><span>${escapeHtml(t.title)}</span><button>×</button>`;
  row.querySelector('input').onchange=e=>{t.done=e.target.checked;save()};
  row.querySelector('button').onclick=()=>{p.tasks=p.tasks.filter(x=>x.id!==t.id);save()};
  $('#tasks').appendChild(row)
 })
}
function escapeHtml(v){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function openProjectModal(){$('#projectModal').classList.remove('hidden');$('#projectName').focus()}
function closeProjectModal(){$('#projectModal').classList.add('hidden');$('#projectForm').reset()}
$('#newProject').onclick=openProjectModal;$('#addProjectSmall').onclick=openProjectModal;$('#cancelProject').onclick=closeProjectModal;
$('#projectForm').onsubmit=e=>{e.preventDefault();const id='p'+Date.now();state.projects.push({id,name:$('#projectName').value.trim(),description:$('#projectDescription').value.trim(),status:'active',tasks:[]});selected=id;closeProjectModal();save()};
$('#taskForm').onsubmit=e=>{e.preventDefault();const p=state.projects.find(x=>x.id===selected);if(!p)return;p.tasks.push({id:'t'+Date.now(),title:$('#taskInput').value.trim(),done:false});$('#taskInput').value='';save()};
$('#deleteProject').onclick=()=>{if(!selected)return;state.projects=state.projects.filter(p=>p.id!==selected);selected=state.projects[0]?.id||null;save()};
function exportWorkspace(){const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='exotic-workspace-vx-0-5-3.json';a.click();URL.revokeObjectURL(a.href)}
$('#exportBtn').onclick=exportWorkspace;
$('#importBtn').onclick=()=>$('#fileInput').click();
$('#fileInput').onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const data=JSON.parse(r.result);if(!Array.isArray(data.projects))throw new Error();state=data;selected=state.projects[0]?.id||null;save()}catch{alert('Invalid Exotic workspace file.')}};r.readAsText(f)};
$('#resetBtn').onclick=()=>{if(confirm('Reset the workspace to defaults?')){state=structuredClone(defaults);selected=state.projects[0].id;save()}};
const palette=$('#palette');$('#cmd').onclick=()=>palette.classList.remove('hidden');
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();palette.classList.remove('hidden');$('#commandInput').focus()}if(e.key==='Escape'){$$('.overlay').forEach(x=>x.classList.add('hidden'))}});
palette.onclick=e=>{if(e.target===palette)palette.classList.add('hidden')};
$$('[data-command]').forEach(b=>b.onclick=()=>{palette.classList.add('hidden');const c=b.dataset.command;if(c==='new-project')openProjectModal();if(c==='export')exportWorkspace();if(c==='reset')$('#resetBtn').click()});
render();