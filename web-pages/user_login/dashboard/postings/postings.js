// postings.js — design-only postings page behavior
(function(){
  const MOCK = [
    { id:1, title:'Folding Kayak', img:'https://placehold.co/600x400?text=Kayak', description:'A lightweight folding kayak, great for lakes and calm rivers.', tags:['boat','outdoors'], maintenance:{ frequency:'Monthly', tasks:['Inspect hull for cracks','Lubricate hinges','Store dry and covered'] } },
    { id:2, title:'Hammer Drill', img:'https://placehold.co/600x400?text=Drill', description:'Cordless hammer drill with battery included.', tags:['tools','power'], maintenance:{ frequency:'Weekly', tasks:['Check battery charge','Inspect chuck for wear','Clean vents'] } },
    { id:3, title:'Camping Tent (4p)', img:'https://placehold.co/600x400?text=Tent', description:'Water-resistant tent for four people.', tags:['camping'], maintenance:{ frequency:'After each use', tasks:['Dry completely before storage','Wash stakes and lines','Patch seams as needed'] } },
    { id:4, title:'Acoustic Guitar', img:'https://placehold.co/600x400?text=Guitar', description:'Acoustic guitar with soft case.', tags:['music','instrument'], maintenance:{ frequency:'Monthly', tasks:['Wipe down body','Check tuning pegs','Change strings as needed'] } },
  ];
  // Utility
  function sanitizeHTML(str) {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }

  function el(tag, attrs={}, children=[]){ const e = document.createElement(tag); Object.entries(attrs).forEach(([k,v])=>{ if(k==='class') e.className=v; else if(k==='html') e.innerHTML=v; else e.setAttribute(k,v); }); (Array.isArray(children)?children:[]).forEach(c=>{ if(typeof c==='string') e.appendChild(document.createTextNode(c)); else e.appendChild(c); }); return e; }

  function makeCard(item){
    const card = el('article',{ class:'asset-card', tabindex:'0', role:'button', 'aria-expanded':'false', 'data-id':String(item.id) });
    const img = el('img',{ class:'asset-thumb', src:item.img, alt:item.title });
    const body = el('div',{ class:'asset-body' }, [
      el('div',{ class:'d-flex align-items-center justify-content-between' },
		[ el('div',{ class:'asset-title' }, [ item.title ]),
			el('div',{style:'display: flex;flex-direction: column;padding-left: 0.5em;' }, [
				el('button',{ class:'btn btn-sm btn-outline-primary edit-btn', onclick:`window.location.href='/user_login/dashboard/postings/add_item/add_item.html?assetId=${item.id}'`}, ['Edit Asset']),
				//el('button',{ class:'btn btn-sm btn-outline-primary edit-btn', onclick:`window.location.href='/user_login/dashboard/postings/add_item/add_item.html?assetId=${item.id}'`,style:'width:100%'}, ['Edit Asset']),
				el('button',{ class:'btn btn-sm btn-outline-primary delete-btn', onclick:`deleteItem('${item.id}','${item.title}')`, style:'color: var(--bs-form-invalid-color) !important;border-color: var(--bs-form-invalid-border-color) !important;'}, ['Remove Asset'])
				//el('button',{ class:'btn btn-sm btn-outline-primary delete-btn', onclick:`deleteItem('${item.id}','${item.title}')`, style:'color: var(--bs-form-invalid-color) !important;border-color: var(--bs-form-invalid-border-color) !important;width:100%;'}, ['Remove Asset'])
			])
		])//,
      //el('div',{ class:'d-flex align-items-center justify-content-between' },[ el('div',{ class:'asset-title' }, [ item.title ]), el('div',{}, [ el('button',{ class:'btn btn-sm btn-outline-primary delete-btn', onclick:`deleteItem('${item.id}')` }, ['Remove Asset']) ]) 
      ]);

    // details now include description and preventative maintenance info
    const maint = item.maintenance || {};
    //const maintList = (Array.from(maint.tasks) || []).map(t => el('li',{},[t])); Seems to not be used?
    const maintDetails = [];
    if(Array.isArray(maint.tasks) && maint.tasks.length){
      maint.tasks.forEach((t, i)=>{
        const tools = (t.tools && t.tools.length) ? t.tools : (t.requiredTools || '—');
        const materials = (t.materials && t.materials.length) ? t.materials : (t.requiredMaterials || '—');
        const freq = (t.frequency) ? sanitizeHTML(t.frequency) : ((maint.frequency) ? sanitizeHTML(maint.frequency) : 'N/A');
        maintDetails.push(el('div',{ class:'mb-2' }, [ el('strong',{},[ `Task ${i+1}: ` ]), el('div',{ class:'small-muted mt-1' }, [ t.description || '—' ]), el('div',{ class:'small-muted mt-1' }, [ `Frequency: ${freq}` ]), el('div',{ class:'small-muted mt-1' }, [ `Tools: ${tools}` ]), el('div',{ class:'small-muted mt-1' }, [ `Materials: ${materials}` ]) ]));
      });
    } else {
      const freq = (maint.frequency) ? sanitizeHTML(maint.frequency) : 'N/A';
      maintDetails.push(el('div',{ class:'mb-2' }, [ el('div',{ class:'small-muted mt-1' }, [ `Frequency: ${freq}` ]) ]));
    }

    const details = el('div',{ class:'asset-details' }, [
      el('div',{ class:'mb-2' }, [ el('strong',{},['Description: ']), el('div',{ class:'small-muted mt-1' }, [ item.description || '—' ]) ]),
      el('div',{ class:'mb-2' }, [ el('strong',{},['Preventative maintenance']) ]),
      ...maintDetails
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

  async function renderGrid(target){
    target.innerHTML='';
    // Add the special "Add an asset" card as first item
    const addCard = el('div',{ class:'asset-card add-asset-card', role:'link', tabindex:'0', onclick:"window.location.href='/user_login/dashboard/postings/add_item/add_item.html'", onkeydown:"if(event.key==='Enter'||event.key===' '){ window.location.href='/user_login/dashboard/postings/add_item/add_item.html'; }" }, [ el('div',{ html:'<i class="fa-solid fa-plus fa-2x"></i><div class="mt-2">Add an asset</div>' }) ]);
    target.appendChild(addCard);

    // Try to fetch user's items from backend (endpoint: GET /api/items/mine)
    try{
      const r = await fetch('/api/items/mine', { credentials:'include' });
      if(r.ok){
        const items = await r.json();
		// Allow for no items.
        if(Array.isArray(items) && items.length >= 0){
          items.forEach(it => target.appendChild(makeCard(it)));
          return;
        }
      }
    }catch(e){
      console.error('Failed to fetch items:', e);
      /* backend unavailable, fall back to mock */
    }

    // fallback to local MOCK data when backend not available or returns nothing
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
