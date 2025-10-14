// postings.js — design-only postings page behavior
(function(){
  const MOCK = [
    { id:1, title:'Folding Kayak', img:'https://placehold.co/600x400?text=Kayak', category:'Outdoors', condition:'Good', description:'A lightweight folding kayak, great for lakes and calm rivers.', tags:['boat','outdoors'] },
    { id:2, title:'Hammer Drill', img:'https://placehold.co/600x400?text=Drill', category:'Tools', condition:'Like new', description:'Cordless hammer drill with battery included.', tags:['tools','power'] },
    { id:3, title:'Camping Tent (4p)', img:'https://placehold.co/600x400?text=Tent', category:'Outdoors', condition:'Fair', description:'Water-resistant tent for four people.', tags:['camping'] },
    { id:4, title:'Acoustic Guitar', img:'https://placehold.co/600x400?text=Guitar', category:'Music', condition:'Good', description:'Acoustic guitar with soft case.', tags:['music','instrument'] },
  ];

  function el(tag, attrs={}, children=[]){ const e = document.createElement(tag); Object.entries(attrs).forEach(([k,v])=>{ if(k==='class') e.className=v; else if(k==='html') e.innerHTML=v; else e.setAttribute(k,v); }); (Array.isArray(children)?children:[]).forEach(c=>{ if(typeof c==='string') e.appendChild(document.createTextNode(c)); else e.appendChild(c); }); return e; }

  function makeCard(item){
    const card = el('article',{ class:'asset-card', tabindex:'0', role:'button', 'aria-expanded':'false', 'data-id':String(item.id) });
    const img = el('img',{ class:'asset-thumb', src:item.img, alt:item.title });
    const body = el('div',{ class:'asset-body' }, [
      el('div',{ class:'asset-title' }, [ item.title ]),
      el('div',{ class:'asset-meta' }, [ `${item.category} • ${item.condition}` ])
    ]);
    const details = el('div',{ class:'asset-details' }, [ el('div',{ class:'small-muted' }, [ item.description ]) , el('div',{ class:'mt-2' }, [ el('button',{ class:'btn btn-sm btn-outline-primary', onclick:`window.location.href='add_item.html'` }, ['Edit this asset']) ]) ]);

    card.appendChild(img); card.appendChild(body); card.appendChild(details);

    // click/keyboard to toggle
    function toggle(expand){
      const is = typeof expand==='boolean' ? expand : card.classList.toggle('expanded');
      if(typeof expand==='boolean'){ if(is) card.classList.add('expanded'); else card.classList.remove('expanded'); }
      const newState = card.classList.contains('expanded');
      card.setAttribute('aria-expanded', String(newState));
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
      expanded.forEach(c=>{ if(!c.contains(e.target)) c.classList.remove('expanded'); c.setAttribute('aria-expanded','false'); });
    });
  });
})();
