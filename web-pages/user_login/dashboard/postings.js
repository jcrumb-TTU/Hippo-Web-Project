// postings.js — design-only postings page behavior
(function(){
  const MOCK = [
    { id:1, title:'Folding Kayak', img:'https://placehold.co/600x400?text=Kayak', description:'A lightweight folding kayak, great for lakes and calm rivers.', tags:['boat','outdoors'], maintenance:{ frequency:'Monthly', tasks:['Inspect hull for cracks','Lubricate hinges','Store dry and covered'] } },
    { id:2, title:'Hammer Drill', img:'https://placehold.co/600x400?text=Drill', description:'Cordless hammer drill with battery included.', tags:['tools','power'], maintenance:{ frequency:'Weekly', tasks:['Check battery charge','Inspect chuck for wear','Clean vents'] } },
    { id:3, title:'Camping Tent (4p)', img:'https://placehold.co/600x400?text=Tent', description:'Water-resistant tent for four people.', tags:['camping'], maintenance:{ frequency:'After each use', tasks:['Dry completely before storage','Wash stakes and lines','Patch seams as needed'] } },
    { id:4, title:'Acoustic Guitar', img:'https://placehold.co/600x400?text=Guitar', description:'Acoustic guitar with soft case.', tags:['music','instrument'], maintenance:{ frequency:'Monthly', tasks:['Wipe down body','Check tuning pegs','Change strings as needed'] } },
  ];

  function el(tag, attrs={}, children=[]){ const e = document.createElement(tag); Object.entries(attrs).forEach(([k,v])=>{ if(k==='class') e.className=v; else if(k==='html') e.innerHTML=v; else e.setAttribute(k,v); }); (Array.isArray(children)?children:[]).forEach(c=>{ if(typeof c==='string') e.appendChild(document.createTextNode(c)); else e.appendChild(c); }); return e; }

  function makeCard(item){
    const card = el('article',{ class:'asset-card', tabindex:'0', role:'button', 'aria-expanded':'false', 'data-id':String(item.id) });
    const img = el('img',{ class:'asset-thumb', src:item.img, alt:item.title });
    const body = el('div',{ class:'asset-body' }, [
      el('div',{ class:'asset-title' }, [ item.title ])
    ]);

    // details now include description and preventative maintenance info
    const maint = item.maintenance || {};
    const maintList = (maint.tasks || []).map(t => el('li',{},[t]));
    const details = el('div',{ class:'asset-details' }, [
      el('div',{ class:'mb-2' }, [ el('strong',{},['Description: ']), el('div',{ class:'small-muted mt-1' }, [ item.description || '—' ]) ]),
      el('div',{ class:'mb-2' }, [ el('strong',{},['Preventative maintenance']), el('div',{ class:'small-muted mt-1' }, [ `Frequency: ${maint.frequency || 'N/A'}` ]) ]),
      el('div',{ class:'mb-2' }, [ el('ul',{}, maintList) ]),
      el('div',{ class:'mt-2' }, [ el('button',{ class:'btn btn-sm btn-outline-primary', onclick:`window.location.href='add_item.html?assetId=${item.id}'` }, ['Edit this asset']) ])
    ]);

    card.appendChild(img); card.appendChild(body); card.appendChild(details);

    // click/keyboard to toggle — when expanding, collapse other cards so only one is open
    function toggle(expand){
      const currently = document.querySelectorAll('.asset-card.expanded');
      const willExpand = (typeof expand === 'boolean') ? expand : !card.classList.contains('expanded');

      if(willExpand){
        // collapse others
        currently.forEach(c=>{ if(c !== card){ c.classList.remove('expanded'); c.setAttribute('aria-expanded','false'); } });
        card.classList.add('expanded');
        card.setAttribute('aria-expanded','true');
      }else{
        card.classList.remove('expanded');
        card.setAttribute('aria-expanded','false');
      }
    }

    card.addEventListener('click', (e)=>{ e.stopPropagation(); toggle(); });
    card.addEventListener('keydown', (e)=>{
      if(e.key==='Enter' || e.key===' '){ e.preventDefault(); toggle(); }
      if(e.key==='Escape'){ toggle(false); }
    });

    return card;
  }

  function renderGrid(target){
    target.innerHTML='';
    // Add the special "Add an asset" card as first item
    const addCard = el('div',{ class:'asset-card add-asset-card', role:'link', tabindex:'0', onclick:"window.location.href='add_item.html'", onkeydown:"if(event.key==='Enter'||event.key===' '){ window.location.href='add_item.html'; }" }, [ el('div',{ html:'<i class="fa-solid fa-plus fa-2x"></i><div class="mt-2">Add an asset</div>' }) ]);
    target.appendChild(addCard);

    MOCK.forEach(m=>{ target.appendChild(makeCard(m)); });
  }

  window.addEventListener('DOMContentLoaded', ()=>{
    const grid = document.getElementById('assetGrid');
    if(!grid) return;
    renderGrid(grid);

    // close any expanded card when clicking outside
    document.addEventListener('click', (e)=>{
      const expanded = document.querySelectorAll('.asset-card.expanded');
      expanded.forEach(c=>{
        if(!c.contains(e.target)){
          c.classList.remove('expanded');
          c.setAttribute('aria-expanded','false');
        }
      });
    });
  });
})();
