(function(){
"use strict";
var HEAD='<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>DMP Pádel · Resultados y clasificaciones</title>\n<link rel="preconnect" href="https://fonts.googleapis.com">\n<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,700;0,800;1,700;1,800;1,900&family=Barlow:wght@400;500;600;700;800&display=swap" rel="stylesheet">\n';
var DATA=JSON.parse(document.getElementById('data').textContent);
var LOGO='data:image/webp;base64,'+document.getElementById('logo-data').textContent.trim();
var root=document.getElementById('root');
var IN_CLAUDE=!!(window.claude&&window.claude.use);
var edit=null, sub='clasificacion', rankFilter='all', artifactNS=null, clearArmed=false;
/* ---------- contador de visitas (servicio gratuito Abacus; si falla, no se muestra) ---------- */
var VISITS=null;
(function(){
  if(IN_CLAUDE||!/^https?:$/.test(location.protocol))return;
  var base='https://abacus.jasoncameron.dev/',k='dmp-padel-github-io/visitas',seen=false;
  try{seen=sessionStorage.getItem('dmp_v')==='1';}catch(e){}
  try{
    fetch(base+(seen?'get/':'hit/')+k).then(function(r){return r.ok?r.json():null;}).then(function(j){
      if(j&&typeof j.value==='number'){VISITS=j.value;try{sessionStorage.setItem('dmp_v','1');}catch(e){}
        var el=document.querySelector('.visits');if(el){el.hidden=false;el.querySelector('b').textContent=VISITS.toLocaleString('es-ES');}}
    }).catch(function(){});
  }catch(e){}
})();
var toastEl=document.createElement('div');toastEl.id='toast';document.body.appendChild(toastEl);
try{ if(window.claude&&window.claude.use){ window.claude.use('artifact').then(function(a){artifactNS=a;}).catch(function(){}); } }catch(e){}

var NUMK={pj:1,pg:1,pp:1,sf:1,sc:1,pts:1,j:1,dmp:1,riv:1,sg:1,sp:1};
var TPL={
  clasificacion:{equipo:'',pj:0,pg:0,pp:0,sf:0,sc:0,pts:0},
  partidos:{j:'',fecha:'',rival:'',lugar:'Local',dmp:'',riv:''},
  jugadores:{nombre:'',pj:0,pg:0,sg:0,sp:0}
};

function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function num(v){var n=parseInt(v,10);return isNaN(n)?0:n;}
function played(p){return p.dmp!==''&&p.dmp!=null&&p.riv!==''&&p.riv!=null;}
function outcome(p){if(!played(p))return null;var a=num(p.dmp),b=num(p.riv);return a>b?'V':a<b?'D':'E';}
function byJ(a,b){return (num(a.j)-num(b.j))||String(a.fecha).localeCompare(String(b.fecha));}
function byDate(a,b){return String(a.p.fecha).localeCompare(String(b.p.fecha))||(num(a.p.j)-num(b.p.j));}
function isUs(r,t){return String(r.equipo).trim().toLowerCase()===String(t.nombre).trim().toLowerCase();}
function sortedTable(t){return t.clasificacion.slice().sort(function(a,b){return num(b.pts)-num(a.pts)||((num(b.sf)-num(b.sc))-(num(a.sf)-num(a.sc)))||num(b.pg)-num(a.pg);});}
function fmtDate(s){var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s||'');if(!m)return esc(s||'Fecha por definir');var d=new Date(+m[1],+m[2]-1,+m[3]);try{return d.toLocaleDateString('es-ES',{weekday:'short',day:'numeric',month:'short'});}catch(e){return esc(s);}}
var compFilter='total';
function pstat(p,mode){mode=mode||compFilter;var L=[num(p.pj),num(p.pg),num(p.sg),num(p.sp)],C=[num(p.cpj),num(p.cpg),num(p.csg),num(p.csp)];
  var v=mode==='liga'?L:mode==='copa'?C:[L[0]+C[0],L[1]+C[1],L[2]+C[2],L[3]+C[3]];
  return {nombre:p.nombre,pj:v[0],pg:v[1],pp:Math.max(0,v[0]-v[1]),dif:v[2]-v[3],sg:v[2],sp:v[3],pct:v[0]?Math.round(v[1]*100/v[0]):0};}
var RONDAS=['Treintaidosavos de final','Dieciseisavos de final','Octavos de final','Cuartos de final','Semifinales','Final'];
function rIdx(r){var i=RONDAS.indexOf(r);return i<0?99:i;}
function byRonda(a,b){return rIdx(a.ronda)-rIdx(b.ronda)||String(a.fecha).localeCompare(String(b.fecha));}
function rondaCorta(r){return String(r||'').replace(/ de final$/,'');}
function copaPartidos(t){return (t.copa&&t.copa.partidos)||[];}
function allMatchesOf(t){return t.partidos.concat(copaPartidos(t));}
function copaEstado(t){
  var ps=copaPartidos(t).slice().sort(byRonda);if(!ps.length)return null;
  var fem=/femen/i.test(t.categoria),jug=ps.filter(played),pend=ps.filter(function(p){return !played(p);}),last=jug[jug.length-1];
  var low=function(r){return r==='Final'?'la final':String(r).toLowerCase();};
  if(last&&last.ronda==='Final')return outcome(last)==='V'?{txt:'¡'+(fem?'Campeonas':'Campeones')+'!',cls:'win'}:{txt:(fem?'Subcampeonas':'Subcampeones'),cls:'win'};
  if(last&&outcome(last)==='D')return {txt:(fem?'Eliminadas':'Eliminados')+' en '+low(last.ronda),cls:'out'};
  if(pend.length)return {txt:pend[0].ronda==='Final'?'¡En la final!':'En '+low(pend[0].ronda),cls:'live'};
  return {txt:'En competición',cls:'live'};
}
function rankSort(a,b){return (b.pj>0)-(a.pj>0)||b.pct-a.pct||b.pg-a.pg||b.pj-a.pj||b.dif-a.dif;}

function teamStats(t){
  var tab=sortedTable(t),idx=-1;
  for(var i=0;i<tab.length;i++){if(isUs(tab[i],t)){idx=i;break;}}
  var jug=t.partidos.filter(played).sort(byJ);
  var v=jug.filter(function(p){return outcome(p)==='V';}).length;
  var d=jug.filter(function(p){return outcome(p)==='D';}).length;
  var pend=t.partidos.filter(function(p){return !played(p);}).sort(byJ);
  return {pos:idx>=0?idx+1:null,total:tab.length,row:idx>=0?tab[idx]:null,jug:jug.length,v:v,d:d,
    pct:jug.length?Math.round(v*100/jug.length):0,forma:jug.slice(-5).map(outcome),prox:pend[0]||null};
}
function formaDots(f){var h='';for(var i=0;i<5;i++){var o=f[i];h+='<span class="dot '+(o||'n')+'">'+(o||'')+'</span>';}return h;}

function getPath(o,path){var ps=path.split('.');for(var i=0;i<ps.length;i++){o=o[ps[i]];}return o;}
function setPath(o,path,v){var ps=path.split('.'),k=ps.pop();getPath(o,ps.join('.'))[k]=v;}
function toast(msg,ms){toastEl.textContent=msg;toastEl.className='on';clearTimeout(toast._t);toast._t=setTimeout(function(){toastEl.className='';},ms||3200);}

function views(D){return ['inicio','noticias'].concat(D.equipos.map(function(t){return t.id;}),['plantilla','ranking']);}
function view(D){var h=location.hash.slice(1);return views(D).indexOf(h)>=0?h:'inicio';}

/* ---------- render ---------- */
function render(){
  var D=edit||DATA, v=view(D), body;
  if(v==='inicio') body=edit?editClub(D):viewInicio(D);
  else if(v==='ranking') body=viewRanking(D);
  else if(v==='noticias') body=edit?editNews(D):viewNews(D);
  else if(v==='plantilla') body=viewPlantilla(D);
  else { var ti=D.equipos.findIndex(function(t){return t.id===v;}); body=edit?editTeam(D.equipos[ti],ti):viewTeam(D.equipos[ti]); }
  root.innerHTML=header(D,v)+'<main class="wrap">'+(D.actualizado&&!edit&&!D.demo?'<div class="upd">Datos de la <a href="https://www.bizkaiapadel.com/Home/Liga" target="_blank" rel="noopener">Federación Bizkaina de Pádel</a> · actualizado '+esc(D.actualizado)+'</div>':'')+(D.demo&&!edit?'<div class="demo">⚠️ Las clasificaciones, partidos y jugadores son <b>datos de ejemplo</b> para ver cómo queda la web. Pulsa <b>Editar</b> (abajo) para poner los resultados reales.</div>':'')+body+'</main>'+footer(D)+(edit?editBar():'');
}

function header(D,v){
  var items=[['inicio','Inicio'],['noticias','Noticias']].concat(D.equipos.map(function(t){return [t.id,t.corto||t.nombre];}),[['plantilla','Plantilla'],['ranking','Ranking']]);
  return '<header class="top"><div class="tbar"><span class="visits" title="Visitas a la web"'+(VISITS==null?' hidden':'')+'><i class="vdot"></i><b>'+(VISITS==null?'':VISITS.toLocaleString('es-ES'))+'</b> visitas</span></div><div class="top-in"><a class="brand" href="#inicio"><img src="'+LOGO+'" alt="Logo DMP"><span><b>'+esc(D.club)+'</b><small>'+esc(D.sede)+'</small></span></a><nav class="nav">'+
    items.map(function(it){return '<a href="#'+it[0]+'" class="'+(v===it[0]?'on':'')+'">'+esc(it[1])+'</a>';}).join('')+'</nav></div></header>';
}
function igUrl(D){return D.instagram?'https://www.instagram.com/'+String(D.instagram).replace(/^@/,'')+'/':'';}
var IG_ICON='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>';
function igBtn(D,big){var u=igUrl(D);return u?'<a class="ig'+(big?' big':'')+'" href="'+u+'" target="_blank" rel="noopener">'+IG_ICON+'<span>@'+esc(String(D.instagram).replace(/^@/,''))+'</span></a>':'';}
function footer(D){
  return '<footer class="foot"><span>'+esc(D.club)+' · '+esc(D.sede)+' · Temporada '+esc(D.temporada)+'</span>'+igBtn(D)+(edit||!IN_CLAUDE?'':'<button class="btn" data-act="edit">✎ Editar</button>')+'</footer>';
}
function secH(title,link){return '<div class="sec-h"><h2>'+title+'</h2>'+(link||'')+'</div>';}

function matchRow(p,t,showTeam,detail){
  var o=outcome(p);
  return '<div class="match '+(o?'m-'+o:'')+'"><div class="m-meta">'+(p.ronda?'<span class="j">'+esc(rondaCorta(p.ronda))+'</span><span class="tag copa">🏆 Copa</span>':'<span class="j">J'+esc(p.j)+'</span>')+'<span>'+fmtDate(p.fecha)+'</span>'+(showTeam?'<span class="tag">'+esc(t.corto||t.nombre)+'</span>':'')+(p.hora?'<span>'+esc(p.hora)+'</span>':'')+'<span>· '+esc(p.lugar)+(p.sede?' · '+esc(p.sede):'')+'</span></div>'+
  '<div class="m-body"><span class="m-team us">'+esc(t.nombre)+'</span>'+(o?'<span class="m-score">'+num(p.dmp)+'<i>–</i>'+num(p.riv)+'</span>':'<span class="m-score vs">VS</span>')+'<span class="m-team">'+esc(p.rival)+'</span></div>'+
  (detail&&p.parejas&&p.parejas.length?'<div class="prs">'+p.parejas.map(function(x){return '<div class="pr '+(x.g?'w':'l')+'"><span class="pr-r">'+(x.g?'✓':'✗')+'</span><div><b>'+esc(x.dmp)+'</b><small>vs '+esc(x.riv)+'</small></div><span class="pr-s">'+esc(x.sets)+'</span></div>';}).join('')+'</div>':'')+
  '<div class="m-foot">'+(o?'<span class="badge b-'+o+'">'+(o==='V'?'Victoria':o==='D'?'Derrota':'Empate')+'</span>':'<span class="badge b-P">Pendiente</span>')+'</div></div>';
}

function teamCard(t){
  var s=teamStats(t);
  return '<a class="card tcard" href="#'+esc(t.id)+'"><div class="tc-top"><span class="chip">'+esc(t.categoria)+'</span><span class="tc-liga">'+esc(t.liga)+'</span></div><h3>'+esc(t.nombre)+'</h3>'+
  '<div class="tc-main"><div class="pos"><b>'+(s.pos?s.pos+'º':'–')+'</b><small>'+(s.total?'de '+s.total+' equipos':'Sin clasificación')+'</small></div><div class="tc-kpis"><div><b>'+(s.row?num(s.row.pts):'–')+'</b><small>Puntos</small></div><div><b>'+s.v+'/'+s.jug+'</b><small>Victorias</small></div></div></div>'+
  '<div class="forma"><span class="lbl">Forma</span>'+formaDots(s.forma)+'</div>'+
  '<div class="tc-next">'+(s.prox?'Próximo · J'+esc(s.prox.j)+' vs <b>'+esc(s.prox.rival)+'</b> · '+fmtDate(s.prox.fecha):'Sin partidos pendientes')+'</div>'+(copaEstado(t)?'<div class="tc-copa '+copaEstado(t).cls+'">🏆 Copa · <b>'+esc(copaEstado(t).txt)+'</b></div>':'')+'</a>';
}

function allPlayers(D,mode){
  var out=[];D.equipos.forEach(function(t){t.jugadores.forEach(function(p){var s=pstat(p,mode);s.team=t;if(s.pj>0||(mode||compFilter)==='total')out.push(s);});});
  return out.sort(rankSort);
}

function viewInicio(D){
  var nj=0,np=0,all=[];
  D.equipos.forEach(function(t){nj+=t.jugadores.length;allMatchesOf(t).forEach(function(p){all.push({p:p,t:t});if(played(p))np++;});});
  var rec=all.filter(function(x){return played(x.p);}).sort(byDate).reverse().slice(0,6);
  var up=all.filter(function(x){return !played(x.p);}).sort(byDate).slice(0,6);
  var top=allPlayers(D,'total').filter(function(p){return p.pj>0;}).slice(0,5);
  return '<section class="hero"><div class="logo-wrap"><img src="'+LOGO+'" alt="Logo DMP"></div><h1>'+esc(D.club)+'</h1><p>'+esc(D.sede)+' · Temporada '+esc(D.temporada)+'</p>'+
    (igUrl(D)?'<div class="hero-ig">'+igBtn(D,true)+'</div>':'')+'<div class="stats"><div class="stat"><b>'+D.equipos.length+'</b><small>Equipos</small></div><div class="stat"><b>'+nj+'</b><small>Jugadores</small></div><div class="stat"><b>'+np+'</b><small>Partidos</small></div></div></section>'+
    (news(D).length?'<section class="sec">'+secH('Última hora','<a href="#noticias">Todas las noticias →</a>')+'<div class="news-list">'+news(D).slice(0,2).map(function(n){return newsCard(D,n,true);}).join('')+'</div></section>':'')+
    '<section class="sec">'+secH('Nuestros equipos')+'<div class="grid">'+D.equipos.map(teamCard).join('')+'</div></section>'+
    '<section class="sec grid">'+
      '<div>'+secH('Últimos resultados')+(rec.length?'<div class="list">'+rec.map(function(x){return matchRow(x.p,x.t,true);}).join('')+'</div>':'<div class="empty">Aún no hay resultados.</div>')+'</div>'+
      '<div>'+secH('Próximos partidos')+(up.length?'<div class="list">'+up.map(function(x){return matchRow(x.p,x.t,true);}).join('')+'</div>':'<div class="empty">No hay partidos programados.</div>')+'</div>'+
    '</section>'+
    '<section class="sec">'+secH('Top jugadores <small class="h-sub">liga + copa</small>','<a href="#ranking">Ver ranking →</a>')+(top.length?'<div class="list">'+top.map(function(p,i){return playerRow(p,i,true);}).join('')+'</div>':'<div class="empty">Sin estadísticas todavía.</div>')+'</section>';
}

function playerRow(p,i,showTeam){
  return '<div class="pl"><span class="rk">'+(i+1)+'</span><div><div class="nm">'+esc(p.nombre)+(showTeam?' <span class="tag">'+esc(p.team.corto||p.team.nombre)+'</span>':'')+'</div>'+
  '<div class="sub">'+p.pj+' PJ · '+p.pg+' G · '+p.pp+' P · Sets '+(p.dif>0?'+':'')+p.dif+'</div><div class="bar"><i style="width:'+p.pct+'%"></i></div></div><span class="pc">'+p.pct+'<small>%</small></span></div>';
}

function viewTeam(t){
  var s=teamStats(t),c;
  if(sub==='clasificacion'){
    var tab=sortedTable(t);
    c=tab.length?'<div class="tbl-wrap"><table><thead><tr><th>#</th><th class="l">Equipo</th><th>PJ</th><th>PG</th><th>PP</th><th>Dif</th><th>Pts</th></tr></thead><tbody>'+
      tab.map(function(r,i){var d=num(r.sf)-num(r.sc);return '<tr class="'+(isUs(r,t)?'us':'')+'"><td><span class="pn '+(i<3?'top':'')+'">'+(i+1)+'</span></td><td class="l">'+esc(r.equipo)+'</td><td>'+num(r.pj)+'</td><td>'+num(r.pg)+'</td><td>'+num(r.pp)+'</td><td>'+(d>0?'+':'')+d+'</td><td class="pts">'+num(r.pts)+'</td></tr>';}).join('')+
      '</tbody></table></div><p class="legend">PJ jugados · PG ganados · PP perdidos · Dif sets a favor − en contra · Pts puntos</p>':'<div class="empty">Clasificación sin publicar.</div>';
  } else if(sub==='partidos'){
    var ps=t.partidos.slice().sort(byJ);
    c=ps.length?'<div class="list">'+ps.map(function(p){return matchRow(p,t,false,true);}).join('')+'</div>':'<div class="empty">Calendario sin publicar.</div>';
  } else if(sub==='copa'&&t.copa){
    var ce=copaEstado(t),cp=copaPartidos(t).slice().sort(byRonda);
    c='<div class="card copa-hero '+(ce?ce.cls:'')+'"><span class="trophy">🏆</span><div><small>'+esc(t.copa.nombre||'Copa')+'</small><b>'+esc(ce?ce.txt:'Sin partidos')+'</b>'+(t.copa.fuente?'<a class="src" href="'+esc(t.copa.fuente)+'" target="_blank" rel="noopener">Ver cuadro en la Federación ↗</a>':'')+'</div></div>'+
      (cp.length?'<div class="list" style="margin-top:14px">'+cp.map(function(p){return matchRow(p,t,false,true);}).join('')+'</div>':'');
  } else {
    var pl=t.jugadores.map(function(p){return pstat(p);}).filter(function(p){return p.pj>0||compFilter==='total';}).sort(rankSort);
    c=compChips()+(pl.length?'<div class="list">'+pl.map(function(p,i){return playerRow(p,i,false);}).join('')+'</div>':'<div class="empty">Sin partidos en esta competición.</div>');
  }
  var tabs=[['clasificacion','Liga'],['partidos','Partidos'],['copa','Copa'],['jugadores','Jugadores']].filter(function(x){return x[0]!=='copa'||t.copa;});
  return '<section class="thero"><span class="chip">'+esc(t.categoria)+'</span><h1>'+esc(t.nombre)+'</h1><p>'+esc(t.liga)+(t.fuente?' · <a class="src" href="'+esc(t.fuente)+'" target="_blank" rel="noopener">Ver en la Federación ↗</a>':'')+'</p>'+
    '<div class="kpis"><div class="card kpi"><div><b>'+(s.pos?s.pos+'º':'–')+'</b><small>Posición'+(s.total?' / '+s.total:'')+'</small></div></div>'+
    '<div class="card kpi"><div><b>'+(s.row?num(s.row.pts):'–')+'</b><small>Puntos</small></div></div>'+
    '<div class="card kpi"><div><b>'+s.v+'<span style="color:var(--muted);font-size:22px"> – '+s.d+'</span></b><small>Victorias – Derrotas</small></div></div>'+
    '<div class="card kpi"><div class="ring" style="--p:'+s.pct+'"><span>'+s.pct+'%</span></div><div><small>Victorias</small><div class="forma" style="margin:6px 0 0">'+formaDots(s.forma)+'</div></div></div></div></section>'+
    '<div class="subtabs">'+tabs.map(function(x){return '<button data-act="sub" data-v="'+x[0]+'" class="'+(sub===x[0]?'on':'')+'">'+x[1]+'</button>';}).join('')+'</div>'+
    '<section class="sec" style="margin-top:16px">'+c+'</section>';
}

function compChips(){return '<div class="filters comp">'+[['total','Liga + Copa'],['liga','Liga'],['copa','Copa']].map(function(x){return '<button data-act="cf" data-v="'+x[0]+'" class="'+(compFilter===x[0]?'on':'')+'">'+x[1]+'</button>';}).join('')+'</div>';}
function initials(n){var w=String(n).split(/\s+/).filter(Boolean);return ((w[0]||'')[0]||'').toUpperCase()+((w[1]||'')[0]||'').toUpperCase();}
function viewPlantilla(D){
  var total=0;
  var secs=D.equipos.map(function(t){
    var ps=t.jugadores.map(function(p){var s=pstat(p,'total');s.liga=num(p.pj);s.copa=num(p.cpj);return s;}).filter(function(p){return p.pj>0;})
      .sort(function(a,b){return String(a.nombre).localeCompare(String(b.nombre),'es');});
    total+=ps.length;
    return '<section class="card squad"><div class="squad-h"><div><span class="chip">'+esc(t.categoria)+'</span><h3>'+esc(t.nombre)+'</h3></div><span class="squad-n"><b>'+ps.length+'</b><small>jugador'+(/femen/i.test(t.categoria)?'as':'es')+'</small></span></div>'+
      (ps.length?'<div class="squad-grid">'+ps.map(function(p){return '<div class="sp"><span class="av">'+esc(initials(p.nombre))+'</span><div><b>'+esc(p.nombre)+'</b><small>'+p.pj+' partido'+(p.pj===1?'':'s')+(p.copa?' · '+p.copa+' de copa':'')+'</small></div></div>';}).join('')+'</div>':'<div class="empty">Sin partidos todavía.</div>')+
      '<a class="src" href="#'+esc(t.id)+'">Ver estadísticas de '+esc(t.corto||t.nombre)+' →</a></section>';
  });
  return '<section class="thero"><span class="chip">Temporada '+esc(D.temporada)+'</span><h1>Plantilla</h1><p>'+total+' jugadores y jugadoras que han jugado con el DMP esta temporada, en liga o copa, según las actas de la Federación. Se actualiza sola.</p></section>'+
    '<div class="squads">'+secs.join('')+'</div>'+
    (igUrl(D)?'<section class="card ig-cta"><div><b>Síguenos en Instagram</b><small>Fotos y el día a día del club.</small></div>'+igBtn(D,true)+'</section>':'');
}
function viewRanking(D){
  var all=allPlayers(D).filter(function(p){return rankFilter==='all'||p.team.id===rankFilter;});
  var top=all.filter(function(p){return p.pj>0;}).slice(0,3);
  var pod='';
  if(top.length===3){
    var order=[1,0,2],med=['🥇','🥈','🥉'];
    pod='<div class="podium">'+order.map(function(i){var p=top[i];return '<div class="pod p'+(i+1)+'"><div class="med">'+med[i]+'</div><div class="nm">'+esc(p.nombre)+'</div><div class="pc">'+p.pct+'%</div><small>'+p.pg+'/'+p.pj+' · '+esc(p.team.corto||p.team.nombre)+'</small></div>';}).join('')+'</div>';
  }
  var f=[['all','Todos']].concat(D.equipos.map(function(t){return [t.id,t.corto||t.nombre];}));
  return '<section class="thero"><span class="chip">Todos los equipos</span><h1>Ranking de jugadores</h1><p>Liga y copa de la Federación. Ordenado por % de victorias y, después, por partidos ganados.</p></section>'+
    compChips()+'<div class="filters">'+f.map(function(x){return '<button data-act="rf" data-v="'+esc(x[0])+'" class="'+(rankFilter===x[0]?'on':'')+'">'+esc(x[1])+'</button>';}).join('')+'</div>'+
    pod+(all.length?'<div class="list">'+all.map(function(p,i){return playerRow(p,i,true);}).join('')+'</div>':'<div class="empty">Sin jugadores todavía.</div>')+
    (edit?'<p class="hint" style="margin-top:14px">Los jugadores se editan desde la pestaña de cada equipo.</p>':'');
}

/* ---------- noticias ---------- */
function news(D){return (D.noticias||[]).slice().sort(function(a,b){return String(b.fecha+b.hora).localeCompare(String(a.fecha+a.hora));});}
function teamById(D,id){for(var i=0;i<D.equipos.length;i++){if(D.equipos[i].id===id)return D.equipos[i];}return null;}
function longDate(s){var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s||'');if(!m)return esc(s||'');try{return new Date(+m[1],+m[2]-1,+m[3]).toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'});}catch(e){return esc(s);}}
function newsCard(D,n,short){
  var t=teamById(D,n.equipo),fotos=n.fotos||[],has=n.dmp!==''&&n.dmp!=null&&n.riv!==''&&n.riv!=null,o=has?(num(n.dmp)>num(n.riv)?'V':num(n.dmp)<num(n.riv)?'D':'E'):null;
  var txt=String(n.texto||'');if(short&&txt.length>170)txt=txt.slice(0,170).replace(/\s+\S*$/,'')+'…';
  return '<article class="card news">'+
    (fotos.length?'<div class="ph-strip'+(fotos.length===1?' one':'')+'">'+fotos.map(function(f,i){return '<button class="ph" data-act="photo" data-src="'+esc(f)+'"><img src="'+esc(f)+'" alt="Foto '+(i+1)+'" loading="lazy"></button>';}).join('')+'</div>':'')+
    '<div class="news-in"><div class="m-meta"><span class="j">'+longDate(n.fecha)+(n.hora?' · '+esc(n.hora):'')+'</span>'+(t?'<span class="tag">'+esc(t.corto||t.nombre)+'</span>':'')+'</div>'+
    '<h3>'+esc(n.titulo)+'</h3>'+
    (has?'<div class="score-band b'+o+'"><span class="m-team us">'+esc(t?t.nombre:D.club)+'</span><span class="m-score">'+num(n.dmp)+'<i>–</i>'+num(n.riv)+'</span><span class="m-team">'+esc(n.rival||'Rival')+'</span><span class="badge b-'+o+'">'+(o==='V'?'Victoria':o==='D'?'Derrota':'Empate')+'</span></div>':'')+
    (txt?'<p class="news-txt">'+esc(txt).replace(/\n/g,'<br>')+'</p>':'')+
    (short&&String(n.texto||'').length>170?'<a class="more" href="#noticias">Leer más →</a>':'')+
    '</div></article>';
}
function viewNews(D){
  var ns=news(D);
  return '<section class="thero"><span class="chip">Crónicas y fotos</span><h1>Noticias</h1><p>Resultados de cada jornada, fotos y novedades del club.</p></section>'+
    (ns.length?'<div class="news-list">'+ns.map(function(n){return newsCard(D,n,false);}).join('')+'</div>':'<div class="empty">Todavía no hay noticias.</div>');
}
function editNews(D){
  var opts=[['','General (club)']].concat(D.equipos.map(function(t){return [t.id,t.nombre];}));
  var h='<section class="thero"><span class="chip">Modo edición</span><h1>Noticias</h1><p>El resultado es opcional: déjalo vacío si la noticia no es de un partido.</p></section>';
  h+='<button class="btn pri add" data-act="addnews">+ Nueva noticia</button>';
  (D.noticias||[]).forEach(function(n,i){
    var b='noticias.'+i;
    h+='<section class="esec card"><div class="fgrid">'+field('Título',b+'.titulo',n.titulo)+field('Fecha',b+'.fecha',n.fecha,'date')+field('Hora',b+'.hora',n.hora,'time')+
      '<label class="f">Equipo<select data-path="'+b+'.equipo">'+opts.map(function(o){return '<option value="'+esc(o[0])+'"'+(o[0]===n.equipo?' selected':'')+'>'+esc(o[1])+'</option>';}).join('')+'</select></label>'+
      field('Rival',b+'.rival',n.rival)+field('Puntos DMP',b+'.dmp',n.dmp,'num')+field('Puntos rival',b+'.riv',n.riv,'num')+'</div>'+
      '<label class="f" style="margin-top:10px">Texto<textarea rows="4" data-path="'+b+'.texto">'+esc(n.texto)+'</textarea></label>'+
      '<div class="thumbs">'+(n.fotos||[]).map(function(f,k){return '<div class="th"><img src="'+esc(f)+'" alt=""><button class="del" data-act="delphoto" data-path="'+b+'.fotos.'+k+'">✕</button></div>';}).join('')+
      '<label class="th addph">＋ Foto<input type="file" accept="image/*" multiple data-photos="'+b+'.fotos"></label></div>'+
      '<button class="btn warn add" data-act="del" data-path="'+b+'">Borrar noticia</button></section>';
  });
  return h;
}
function shrink(file){return new Promise(function(res,rej){
  var url=URL.createObjectURL(file),img=new Image();
  img.onload=function(){var M=1280,w=img.naturalWidth,h=img.naturalHeight,k=Math.min(1,M/Math.max(w,h));var c=document.createElement('canvas');c.width=Math.round(w*k);c.height=Math.round(h*k);c.getContext('2d').drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);var d=c.toDataURL('image/webp',0.75);if(d.indexOf('data:image/webp')!==0)d=c.toDataURL('image/jpeg',0.78);res(d);};
  img.onerror=function(){URL.revokeObjectURL(url);rej();};img.src=url;});}
var lb=document.createElement('div');lb.className='lb';lb.innerHTML='<img alt="Foto">';lb.addEventListener('click',function(){lb.classList.remove('on');});document.body.appendChild(lb);

/* ---------- edit ---------- */
function field(label,path,val,type){return '<label class="f">'+label+'<input '+(type==='num'?'type="number" inputmode="numeric" data-num ':'type="'+(type||'text')+'" ')+'data-path="'+path+'" value="'+esc(val)+'"></label>';}
function editTable(path,sec,cols,rows){
  var h='<div class="tbl-wrap etbl"><table><thead><tr>'+cols.map(function(c){return '<th class="'+(c.t==='text'?'l':'')+'">'+c.l+'</th>';}).join('')+'<th></th></tr></thead><tbody>';
  rows.forEach(function(r,i){
    h+='<tr>'+cols.map(function(c){var p=path+'.'+i+'.'+c.k,v=r[c.k];
      if(c.t==='sel')return '<td><select data-path="'+p+'">'+c.o.map(function(o){return '<option'+(o===v?' selected':'')+'>'+o+'</option>';}).join('')+'</select></td>';
      if(c.t==='num')return '<td><input class="n" type="number" inputmode="numeric" data-num data-path="'+p+'" value="'+esc(v)+'"></td>';
      if(c.t==='date')return '<td><input class="d" type="date" data-path="'+p+'" value="'+esc(v)+'"></td>';
      return '<td class="l"><input class="t" type="text" data-path="'+p+'" value="'+esc(v)+'"'+(c.ph?' placeholder="'+c.ph+'"':'')+'></td>';
    }).join('')+'<td><button class="del" title="Borrar fila" data-act="del" data-path="'+path+'.'+i+'">✕</button></td></tr>';
  });
  return h+'</tbody></table></div><button class="btn add" data-act="add" data-path="'+path+'" data-sec="'+sec+'">+ Añadir fila</button>';
}
function editTeam(t,ti){
  var b='equipos.'+ti;
  return '<section class="thero"><span class="chip">Modo edición</span><h1>'+esc(t.nombre)+'</h1></section>'+
  '<section class="esec"><h2>Datos del equipo</h2><div class="fgrid">'+field('Nombre',b+'.nombre',t.nombre)+field('Nombre corto (menú)',b+'.corto',t.corto)+field('Categoría',b+'.categoria',t.categoria)+field('Liga / grupo',b+'.liga',t.liga)+'</div></section>'+
  '<section class="esec"><h2>Clasificación</h2><p class="hint">Escribe tu equipo con el mismo nombre de arriba («'+esc(t.nombre)+'») para que salga resaltado. Se ordena sola por puntos.</p>'+
    editTable(b+'.clasificacion','clasificacion',[{k:'equipo',l:'Equipo',t:'text'},{k:'pj',l:'PJ',t:'num'},{k:'pg',l:'PG',t:'num'},{k:'pp',l:'PP',t:'num'},{k:'sf',l:'Sets +',t:'num'},{k:'sc',l:'Sets −',t:'num'},{k:'pts',l:'Pts',t:'num'}],t.clasificacion)+'</section>'+
  '<section class="esec"><h2>Partidos</h2><p class="hint">Resultado: lo de DMP y lo del rival (p. ej. 2 y 1). Déjalo vacío si está pendiente.</p>'+
    editTable(b+'.partidos','partidos',[{k:'j',l:'Jor.',t:'num'},{k:'fecha',l:'Fecha',t:'date'},{k:'rival',l:'Rival',t:'text'},{k:'lugar',l:'Lugar',t:'sel',o:['Local','Visitante']},{k:'dmp',l:'DMP',t:'num'},{k:'riv',l:'Rival',t:'num'}],t.partidos)+'</section>'+
  '<section class="esec"><h2>Jugadores</h2><p class="hint">PJ partidos jugados, PG ganados, sets ganados y perdidos.</p>'+
    editTable(b+'.jugadores','jugadores',[{k:'nombre',l:'Nombre',t:'text'},{k:'pj',l:'PJ',t:'num'},{k:'pg',l:'PG',t:'num'},{k:'sg',l:'Sets +',t:'num'},{k:'sp',l:'Sets −',t:'num'}],t.jugadores)+'</section>';
}
function editClub(D){
  return '<section class="thero"><span class="chip">Modo edición</span><h1>Datos del club</h1><p>Los equipos se editan desde su pestaña del menú.</p></section>'+
  '<section class="esec"><div class="fgrid">'+field('Nombre del club','club',D.club)+field('Sede','sede',D.sede)+field('Temporada','temporada',D.temporada)+field('Datos actualizados el','actualizado',D.actualizado)+'</div></section>'+
  '<section class="esec"><h2>Datos de ejemplo</h2><p class="hint">Vacía todas las clasificaciones, partidos y jugadores para empezar con los datos reales. No se publica hasta que pulses «Guardar y publicar».</p><button class="btn warn" data-act="clear">'+(clearArmed?'¿Seguro? Toca otra vez':'Vaciar datos de ejemplo')+'</button></section>';
}
function editBar(){return '<div class="ebar"><span>✎ Editando</span><div><button class="btn" data-act="cancel">Cancelar</button><button class="btn pri" data-act="save">Guardar y publicar</button></div></div>';}

function clean(D){
  var d=JSON.parse(JSON.stringify(D));
  d.equipos.forEach(function(t){
    t.clasificacion=t.clasificacion.filter(function(r){return String(r.equipo).trim();});
    t.partidos=t.partidos.filter(function(p){return String(p.rival).trim();});
    t.jugadores=t.jugadores.filter(function(p){return String(p.nombre).trim();});
  });
  d.noticias=(d.noticias||[]).filter(function(n){return String(n.titulo||'').trim()||String(n.texto||'').trim()||(n.fotos||[]).length;});
  return d;
}
function buildDoc(D){
  var css=document.getElementById('app-css').textContent, js=document.getElementById('app-js').textContent, logo=document.getElementById('logo-data').textContent.trim();
  var json=JSON.stringify(D,null,1).replace(/</g,'\\u003c');
  var E='</'+'script>';
  return '<!DOCTYPE html>\n<html lang="es">\n<head>\n'+HEAD+'<style id="app-css">'+css+'</style>\n</head>\n<body>\n<div id="root"></div>\n<script id="logo-data" type="text/plain">'+logo+E+'\n<script id="data" type="application/json">'+json+E+'\n<script id="app-js">'+js+E+'\n</body>\n</html>\n';
}
function save(btn){
  if(!artifactNS){toast('Para publicar, abre la web publicada en claude.ai con tu cuenta de propietario.',4500);return;}
  btn.disabled=true;btn.textContent='Publicando…';
  artifactNS.publish(buildDoc(clean(edit))).then(function(){toast('¡Publicado! Recargando…');}).catch(function(e){
    btn.disabled=false;btn.textContent='Guardar y publicar';
    var c=String((e&&(e.code||e.message))||e||'');
    if(/not_granted|not_writer/.test(c))toast('Solo el propietario o los editores pueden publicar cambios.',4500);
    else if(/conflict/.test(c))toast('Alguien publicó a la vez; la página se recargará.',4500);
    else toast('No se pudo publicar: '+c,5000);
  });
}

root.addEventListener('input',function(e){
  var el=e.target;if(!edit||!el.dataset||!el.dataset.path)return;
  var v=el.value;if('num' in el.dataset)v=v===''?'':num(v);
  setPath(edit,el.dataset.path,v);
});
root.addEventListener('change',function(e){var el=e.target;
  if(edit&&el.dataset&&el.dataset.photos&&el.files&&el.files.length){
    var arr=getPath(edit,el.dataset.photos),fs=Array.prototype.slice.call(el.files);toast('Procesando fotos…');
    Promise.all(fs.map(function(f){return shrink(f).catch(function(){return null;});})).then(function(ds){ds.forEach(function(d){if(d)arr.push(d);});render();toast(ds.filter(Boolean).length+' foto(s) añadida(s)');});
    return;
  }if(edit&&el.tagName==='SELECT'&&el.dataset.path)setPath(edit,el.dataset.path,el.value);});
root.addEventListener('click',function(e){
  var b=e.target.closest('[data-act]');if(!b)return;var a=b.dataset.act;
  if(a!=='clear')clearArmed=false;
  if(a==='sub'){sub=b.dataset.v;render();}
  else if(a==='photo'){lb.querySelector('img').src=b.dataset.src;lb.classList.add('on');}
  else if(a==='addnews'){if(!edit.noticias)edit.noticias=[];var dt=new Date(),p=function(x){return (x<10?'0':'')+x;};edit.noticias.unshift({titulo:'',fecha:dt.getFullYear()+'-'+p(dt.getMonth()+1)+'-'+p(dt.getDate()),hora:'',equipo:'',rival:'',dmp:'',riv:'',texto:'',fotos:[]});render();}
  else if(a==='delphoto'){var pp=b.dataset.path.split('.'),k=+pp.pop();getPath(edit,pp.join('.')).splice(k,1);render();}
  else if(a==='rf'){rankFilter=b.dataset.v;render();}
  else if(a==='cf'){compFilter=b.dataset.v;render();}
  else if(a==='edit'){edit=JSON.parse(JSON.stringify(DATA));render();window.scrollTo(0,0);}
  else if(a==='cancel'){edit=null;render();}
  else if(a==='save'){save(b);}
  else if(a==='add'){getPath(edit,b.dataset.path).push(JSON.parse(JSON.stringify(TPL[b.dataset.sec])));render();}
  else if(a==='del'){var ps=b.dataset.path.split('.'),i=+ps.pop();getPath(edit,ps.join('.')).splice(i,1);render();}
  else if(a==='clear'){
    if(!clearArmed){clearArmed=true;render();return;}
    clearArmed=false;edit.demo=false;
    edit.equipos.forEach(function(t){t.clasificacion=[{equipo:t.nombre,pj:0,pg:0,pp:0,sf:0,sc:0,pts:0}];t.partidos=[];t.jugadores=[];});
    render();toast('Datos de ejemplo vaciados. Pulsa «Guardar y publicar» para confirmarlo.',4500);
  }
});
var pendingSub=null;
window.addEventListener('hashchange',function(){sub=pendingSub||'clasificacion';pendingSub=null;render();window.scrollTo(0,0);});
/* ---------- asistente X3 ---------- */
var BALL='<svg class="ball" viewBox="0 0 100 100" aria-hidden="true"><defs><radialGradient id="bg3" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#f6ff9a"/><stop offset=".55" stop-color="#d4f03a"/><stop offset="1" stop-color="#93b915"/></radialGradient></defs><circle cx="50" cy="50" r="46" fill="url(#bg3)"/><g class="seam" fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round"><path d="M14 22c18 14 18 42 0 56"/><path d="M86 22c-18 14-18 42 0 56"/></g><g class="eyes"><ellipse cx="38" cy="47" rx="5.5" ry="7.5" fill="#06101f"/><ellipse cx="62" cy="47" rx="5.5" ry="7.5" fill="#06101f"/><circle cx="40" cy="44" r="2" fill="#fff"/><circle cx="64" cy="44" r="2" fill="#fff"/></g><path d="M40 63q10 9 20 0" fill="none" stroke="#06101f" stroke-width="4" stroke-linecap="round"/><circle cx="29" cy="58" r="4.5" fill="#ff8aa0" opacity=".55"/><circle cx="71" cy="58" r="4.5" fill="#ff8aa0" opacity=".55"/></svg>';
var x3=document.createElement('div');x3.className='x3';
x3.innerHTML='<div class="x3-panel" role="dialog" aria-label="Asistente X3"><div class="x3-head"><div class="x3-av">'+BALL+'</div><div><b>X3</b><small>Asistente del DMP</small></div><button class="x3-close" aria-label="Cerrar">✕</button></div><div class="x3-msgs"></div><div class="x3-chips"></div><form class="x3-form"><input type="text" placeholder="Pregúntame algo…" aria-label="Pregunta"><button type="submit" aria-label="Enviar">➤</button></form></div>'+
  '<button class="x3-fab" aria-label="Abrir asistente X3"><span class="x3-tag">X3</span>'+BALL+'<span class="x3-shadow"></span><span class="x3-hi">¿Te ayudo?</span></button>';
document.body.appendChild(x3);
var xMsgs=x3.querySelector('.x3-msgs'),xChips=x3.querySelector('.x3-chips'),xInput=x3.querySelector('input'),xOpened=false;
var CHIPS=['Cuéntame un chiste','Próximos partidos','¿Cómo vamos?','¿Cómo va la copa?','Último resultado','Mejores jugadores','Plantilla','Noticias','Instagram'];
function xAdd(html,who){var d=document.createElement('div');d.className='x3-m '+(who||'bot');d.innerHTML=html;xMsgs.appendChild(d);xMsgs.scrollTop=xMsgs.scrollHeight;return d;}
function xSetChips(list){xChips.innerHTML=(list||CHIPS).map(function(c){return '<button data-q="'+esc(c)+'">'+esc(c)+'</button>';}).join('');}
function go(view,s){return '<button class="x3-go" data-go="'+view+(s?':'+s:'')+'">'+arguments[2]+' →</button>';}
function norm(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[¿?¡!.,;:]/g,' ');}
function findTeam(q){
  if(/chica|femen|mujer|valky|neska|ellas/.test(q))return teamById(DATA,'femenino');
  if(/quinta|\b5\b|5a|5ª/.test(q))return teamById(DATA,'quinta');
  if(/sexta|\b6\b|6a|academy/.test(q))return teamById(DATA,'sexta');
  return null;
}
function findPlayer(q){
  var best=null;
  DATA.equipos.forEach(function(t){t.jugadores.forEach(function(p){
    var parts=norm(p.nombre).split(/\s+/).filter(function(w){return w.length>3;});
    var hits=parts.filter(function(w){return new RegExp('\\b'+w+'\\b').test(q);}).length;
    if(hits&&(!best||hits>best.h))best={p:p,t:t,h:hits};
  });});
  return best;
}
function byF(a,b){return String(a.fecha).localeCompare(String(b.fecha));}
function nextOf(t,list){return (list||allMatchesOf(t)).filter(function(p){return !played(p);}).sort(byF)[0]||null;}
function lastOf(t,list){var j=(list||allMatchesOf(t)).filter(played).sort(byF);return j[j.length-1]||null;}
function mLine(t,p){var o=outcome(p);return '<b>'+esc(t.nombre)+'</b> '+(o?num(p.dmp)+'–'+num(p.riv):'vs')+' '+esc(p.rival)+' · '+(p.ronda?'Copa, '+esc(rondaCorta(p.ronda)).toLowerCase():'J'+esc(p.j))+', '+fmtDate(p.fecha)+(p.hora?' '+esc(p.hora):'')+(p.sede?' · '+esc(p.sede):'')+(o?' <span class="x3-'+o+'">'+(o==='V'?'victoria':o==='D'?'derrota':'empate')+'</span>':'');}
function answer(raw){
  var q=norm(raw),t=findTeam(q),pl=findPlayer(q),teams=t?[t]:DATA.equipos;
  if(/chiste|broma|hazme reir|hazme gracia|algo gracioso|cuentame algo|me aburro/.test(q)||(lastWasJoke&&/^\s*(otro|otra|mas|uno mas|venga)\b/.test(q))){lastWasJoke=true;return joke()+'<br><small class="x3-hint">¿Otro? Escribe «otro» 😄</small>';}
  lastWasJoke=false;
  if(/^\s*(hola|buenas|kaixo|hey|ey)\b/.test(q)&&q.length<20)return '¡Hola! 🎾 Pregúntame por partidos, clasificaciones, resultados, jugadores o noticias del DMP.';
  if(/gracias|eskerrik/.test(q))return '¡A mandar! Si necesitas algo más, aquí estoy botando. 🎾';
  if(/que (puedes|sabes)|ayuda|como funciona|que haces/.test(q))return 'Te puedo decir:<br>• Cuándo y dónde juega cada categoría<br>• Cómo va la clasificación de liga y la copa<br>• Los últimos resultados, pareja a pareja<br>• Quién lleva mejor % de victorias<br>• Las últimas noticias<br>• Y chistes de pádel, si te hace falta reírte un rato 😄<br>Puedes preguntar, por ejemplo: <i>«¿cuándo juegan las chicas?»</i> o <i>«¿cómo va Jorge Negro?»</i>';
  if(pl&&!/clasif|proxim|cuando/.test(q)){var s=pstat(pl.p,/copa|kopa/.test(q)?'copa':/liga/.test(q)?'liga':'total');return '<b>'+esc(pl.p.nombre)+'</b> ('+esc(pl.t.nombre)+'): '+s.pj+(s.pj===1?' partido, ':' partidos, ')+s.pg+(s.pg===1?' ganado (':' ganados (')+s.pct+'%), sets '+s.sg+'-'+s.sp+' ('+(/copa|kopa/.test(q)?'copa':/liga/.test(q)?'liga':'liga + copa')+').'+go('ranking','','Ver ranking');}
  if(/donde|sede|pic|pista|instalacion|direccion|llegar/.test(q)&&!/proxim|cuando/.test(q)){
    return 'Los partidos en casa se juegan en <b>BamVolea PIC</b> (Padel Indoor Center). Fuera de casa depende del rival: en cada partido del calendario verás la sede. No tengo la dirección exacta guardada, así que mejor búscala en el mapa.'+go(t?t.id:'inicio',t?'partidos':'','Ver calendario');}
  if(/copa|kopa|eliminatori|cuadro|semifinal|cuartos|octavos|\bfinal\b/.test(q)&&!/jugador|mejor|ranking|top|quien/.test(q)){
    return teams.map(function(x){var ce=copaEstado(x);if(!ce)return '<b>'+esc(x.nombre)+'</b>: sin datos de copa.';var p=nextOf(x,copaPartidos(x)),l=lastOf(x,copaPartidos(x));
      return '🏆 <b>'+esc(x.nombre)+'</b>: '+esc(ce.txt)+'.'+(l?'<br>Último: '+mLine(x,l):'')+(p?'<br>Próximo: '+mLine(x,p):'');}).join('<br><br>')+(t&&t.copa?go(t.id,'copa','Ver copa'):'');}
  if(/clasif|posicion|puesto|tabla|como vamos|como va|lider|lideres|primeros|puntos/.test(q)){
    return teams.map(function(x){var st=teamStats(x);return '<b>'+esc(x.nombre)+'</b> ('+esc(x.categoria)+'): '+(st.pos?st.pos+'º de '+st.total+' con '+num(st.row.pts)+' puntos':'sin clasificación');}).join('<br>')+(t?go(t.id,'clasificacion','Ver clasificación'):'');}
  if(/resultado|ultimo|ultima|gano|ganamos|perdi|marcador|jornada pasada|como quedo|quedamos/.test(q)){
    var rows=teams.map(function(x){var p=lastOf(x);return p?mLine(x,p):'<b>'+esc(x.nombre)+'</b>: aún sin resultados.';});
    var extra='';if(t){var p=lastOf(t);if(p&&p.parejas&&p.parejas.length)extra='<div class="x3-prs">'+p.parejas.map(function(z){return (z.g?'✅ ':'❌ ')+esc(z.dmp)+' · '+esc(z.sets);}).join('<br>')+'</div>';}
    return rows.join('<br>')+extra+(t?go(t.id,'partidos','Ver partidos'):'');}
  if(/proxim|siguiente|cuando|calendario|juega|jugamos|partido|horario|hora/.test(q)){
    return teams.map(function(x){var p=nextOf(x);return p?mLine(x,p):'<b>'+esc(x.nombre)+'</b>: no hay partidos pendientes.';}).join('<br>')+(t?go(t.id,'partidos','Ver calendario'):'');}
  if(/jugador|mejor|ranking|top|quien|crack|estadistic|porcentaje/.test(q)){
    var md=/copa|kopa/.test(q)?'copa':/liga/.test(q)?'liga':'total';var all=(t?t.jugadores.map(function(p){var s=pstat(p,md);s.team=t;return s;}).sort(rankSort):allPlayers(DATA,md)).filter(function(p){return p.pj>0;}).slice(0,5);
    return all.length?'Top '+(t?esc(t.nombre):'del club')+' por % de victorias ('+(md==='total'?'liga + copa':md)+'):<br>'+all.map(function(p,i){return (i+1)+'. '+esc(p.nombre)+' — '+p.pct+'% ('+p.pg+'/'+p.pj+')';}).join('<br>')+go(t?t.id:'ranking',t?'jugadores':'',t?'Ver jugadores':'Ver ranking'):'Todavía no hay estadísticas de jugadores.';}
  if(/instagram|insta\b|redes/.test(q))return igUrl(DATA)?'Estamos en Instagram como <b>@'+esc(String(DATA.instagram).replace(/^@/,''))+'</b>: <a class="x3-go" href="'+igUrl(DATA)+'" target="_blank" rel="noopener">Abrir Instagram ↗</a>':'Todavía no tengo el Instagram del club.';
  if(/plantilla|convocad|quienes juegan|jugadores de|jugadoras de|quien juega/.test(q)&&!/mejor|ranking|top/.test(q)){
    return teams.map(function(x){var n=x.jugadores.filter(function(p){return pstat(p,'total').pj>0;}).length;return '<b>'+esc(x.nombre)+'</b>: '+n+' jugador'+(/femen/i.test(x.categoria)?'as':'es')+' han jugado esta temporada.';}).join('<br>')+go('plantilla','','Ver plantilla');}
  if(/noticia|cronica|foto|novedad/.test(q)){var ns=news(DATA);return ns.length?'Lo último: <b>'+esc(ns[0].titulo)+'</b> ('+longDate(ns[0].fecha)+').'+go('noticias','','Ver noticias'):'Aún no hay noticias publicadas.';}
  if(/equipo|categoria|cuantos/.test(q))return 'El DMP tiene '+DATA.equipos.length+' equipos en la Liga Bizkaina:<br>'+DATA.equipos.map(function(x){return '• <b>'+esc(x.nombre)+'</b> — '+esc(x.categoria);}).join('<br>');
  if(t){var st=teamStats(t),p=nextOf(t);return '<b>'+esc(t.nombre)+'</b> va '+(st.pos?st.pos+'º con '+num(st.row.pts)+' puntos':'sin clasificación')+'.'+(p?'<br>Próximo: '+mLine(t,p):'')+go(t.id,'','Ver '+esc(t.corto||t.nombre));}
  return 'Esa no me la sé 😅 y prefiero no inventármela. Prueba con partidos, clasificación, resultados, jugadores o noticias.';
}
var JOKES=["Hoy es el Día del Pádel. Felicidades a todos los pádels… y a las mádels también. 👨‍👧","—Papá, ¿qué me vas a dejar en herencia?<br>—La pala, hijo. Yo siempre he sido un buen pádel.","Pádel nuestro que estás en la pista, santificado sea tu saque, venga a nosotros tu globo…","Pádel no hay más que uno. Y a ti te encontré en la pista 3.","«Luke… yo soy tu pádel.» «¡Noooo! ¡Si tú eres de tenis!»","De tal pala, tal astilla. Mi pádel también fallaba todas las voleas.","Mi mujer dice que quiero más al pádel que a ella. Y eso que todavía no sabe lo de la pala nueva.","En mi casa manda el pádel de familia: decide él cuándo se juega… después de preguntarle a la mádel.","—Mi pareja y yo lo hacemos tres veces por semana.<br>—¡Qué envidia!<br>—Y los domingos, partido de liga.","A mí me gusta que me la pongan arriba y despacito… La bola, digo. Para rematar.","Busco pareja estable. La última me dejó por uno que tenía mejor revés.","—¿Tú de qué lado juegas?<br>—Del que me dejen, que llevo una racha muy mala.","Ayer duré tres horas con mi pareja. Tres sets, tie-break incluido. Hoy no me puedo ni mover.","Mi pareja me ha dicho que o cambio la forma de cogerla o me deja. La pala, claro: empuñadura continental.","—Cariño, ¿me engañas con otra?<br>—Solo los martes, pero es que tiene una derecha…","Con los años ya no aguanto lo de antes: ahora al segundo set pido cambio de pareja… y una silla.","Lo mío con mi pareja es amor verdadero: nos gritamos «¡tuya!» los dos a la vez y la bola se queda en medio.","Me han dicho que tengo buena mano. Lástima que la bola vaya siempre a la otra.","—¿Qué le regalas a tu pádel por su día?<br>—Un bote de bolas. Que luego dice que nunca le doy nada.","El pádel es como el matrimonio: empiezas por amor, sigues por costumbre y siempre hay un cristal de por medio.","¿Por qué la pelota de pádel nunca se aburre? Porque se pasa la vida de rebote en rebote. 🎾", "—¿Tú juegas de drive o de revés?<br>—Yo juego de milagro.", "¿Qué le dice una pala a otra antes del partido? «Nos vemos en la red».", "Soy tan malo con el globo que el último que tiré todavía está en órbita. 🚀", "¿Por qué el cristal es el mejor amigo del jugador de pádel? Porque siempre te devuelve lo que le das.", "—¿Qué tal el partido?<br>—Bien: la bola ha tocado más veces la reja que mi pala.", "¿Cuál es el colmo de un jugador de pádel? Pasarse la vida entre cristales y no romper ninguno.", "—¿Por qué llegas tan tarde?<br>—El partido fue a tres sets… y el almuerzo de después, a cinco.", "¿Qué hace una pelota de pádel en el gimnasio? Botes. Muchos botes.", "Le pregunté a mi pareja de pádel si confiaba en mí. Me dijo: «Sí, pero quédate en tu lado».", "¿Qué le dice la red a la pelota? «Hoy por aquí no pasas».", "El médico me mandó hacer cardio. Ahora corro detrás de todas las bolas que me pasan por el medio.", "¿Por qué fue la pala al psicólogo? Porque se sentía llena de agujeros.", "¿Cuántos jugadores de pádel hacen falta para cambiar una bombilla? Cuatro: uno la cambia y los otros tres le gritan «¡tuya!».", "Dicen que el pádel engancha. Yo voy por la tercera pala y sigo sin dar una.", "Yo no fallo la bandeja: es que se la sirvo directamente a la reja.", "¿Por qué las pelotas de pádel vienen en bote? Para que no se escapen antes del partido.", "Como pelota oficial del DMP os pido una cosa: no me deis tan fuerte, que yo solo vine a botar. 😅", "—Entrenador, ¿cómo puedo mejorar mi remate?<br>—Empieza por mirar la bola, no a la grada.", "¿Qué es lo más rápido del pádel? La excusa después de fallar una volea fácil."];
var jokeBag=[],lastWasJoke=false;
function joke(){if(!jokeBag.length){jokeBag=JOKES.map(function(_,i){return i;});for(var i=jokeBag.length-1;i>0;i--){var k=Math.floor(Math.random()*(i+1)),t=jokeBag[i];jokeBag[i]=jokeBag[k];jokeBag[k]=t;}}return JOKES[jokeBag.pop()];}
function ask(text){
  if(!String(text).trim())return;
  xAdd(esc(text),'me');
  var typing=xAdd('<span class="x3-typing"><i></i><i></i><i></i></span>','bot');
  x3.classList.add('talk');
  setTimeout(function(){typing.innerHTML=answer(text);xMsgs.scrollTop=xMsgs.scrollHeight;x3.classList.remove('talk');},450);
}
function x3Open(){x3.classList.add('open');if(!xOpened){xOpened=true;xAdd('¡Hola! Soy <b>X3</b> 🎾, la pelota oficial del DMP. Pregúntame lo que quieras sobre los partidos, la clasificación o los jugadores.');xSetChips();}setTimeout(function(){try{xInput.focus({preventScroll:true});}catch(e){}},200);}
x3.querySelector('.x3-fab').addEventListener('click',function(){if(x3.classList.contains('open'))x3.classList.remove('open');else x3Open();});
x3.querySelector('.x3-close').addEventListener('click',function(){x3.classList.remove('open');});
x3.querySelector('.x3-form').addEventListener('submit',function(e){e.preventDefault();var v=xInput.value;xInput.value='';ask(v);});
x3.addEventListener('click',function(e){
  var c=e.target.closest('[data-q]');if(c){ask(c.dataset.q);return;}
  var g=e.target.closest('[data-go]');if(g){var a=g.dataset.go.split(':');if(a[1])sub=a[1];if(location.hash==='#'+a[0]){render();}else{pendingSub=a[1]||null;location.hash=a[0];}if(window.innerWidth<700)x3.classList.remove('open');}
});
setTimeout(function(){x3.classList.add('hint');setTimeout(function(){x3.classList.remove('hint');},5000);},1500);
render();
})();
