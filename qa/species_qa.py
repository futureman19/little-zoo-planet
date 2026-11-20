"""Production-preview regression: python qa/species_qa.py (Playwright installed)."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
OUT = Path(__file__).parent / 'evidence'
OUT.mkdir(exist_ok=True)
checks = []
def check(name, value):
    assert value, name
    checks.append(name)
    print('PASS', name)
with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=False)
    ctx = browser.new_context(viewport={'width':1440,'height':900})
    # Only pump advances time; no racing animation-loop callbacks.
    ctx.add_init_script('window.requestAnimationFrame = () => 0;')
    page = ctx.new_page()
    errors, audio = [], {}
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('response', lambda r: audio.update({r.url.split('/')[-1]:r.status}) if '/chirp_' in r.url else None)
    page.goto('http://127.0.0.1:4183')
    page.wait_for_function('!!window.__APP')
    page.click('#playbtn')
    page.wait_for_timeout(1500)
    for sp in ['zebra','hippo','flamingo']:
        for variant in [0,1]:
            check(f'{sp} manifest fetch {variant} HTTP 200', audio.get(f'chirp_{sp}_{variant}.wav') == 200)
    page.click('[data-k="animals"]')
    check('12 adopt cards', page.locator('#shop .card').count() == 12)
    for sp,emoji in [('zebra','🦓'),('hippo','🦛'),('flamingo','🦩')]:
        card=page.locator(f'[data-id="{sp}"]')
        check(f'{sp} emoji and locked', emoji in card.inner_text() and 'locked' in card.get_attribute('class'))
    page.click('[data-k="animals"]')
    setup = page.evaluate('''() => {
      const {sim:s,world:w}=__APP; s.coins=10000; s.lifetimeCoins=1000;
      for(const [x,z] of [[1,1],[6,1],[11,1],[1,7],[6,7],[11,7]]) {const h=s.placeHabitat(x,z); w.addHabitat(h);}
      for(let i=0;i<8;i++) s.adoptAnimal('penguin',s.habitats[Math.floor(i/3)].id);
      __APP.pump(1,0); return s.happyCount()===8;
    }''')
    check('seeded eight happy animals satisfy unlocks',setup)
    for index,sp in enumerate(['zebra','hippo','flamingo']):
        check(sp+' adopt',page.evaluate('''([sp,i])=>{const s=__APP.sim; const a=s.adoptAnimal(sp,s.habitats[i+3].id); if(!a)return false; const h=s.habitats[i+3]; a.x=a.tx=-16+h.gx*2+4; a.z=a.tz=-16+h.gz*2+4; a.pauseT=9999; __APP.pump(1,0);return true;}''',[sp,index]))
    # Freeze all wander and clear adoption FX before interaction checks.
    page.evaluate('''()=>{__APP.sim.animals.forEach(a=>a.pauseT=9999);__APP.pump(120,1/60);}''')
    def focus(sp):
        return page.evaluate('''sp=>{const app=__APP,a=app.sim.animals.find(a=>a.speciesId===sp); app.controls.enableDamping=false;app.controls.minDistance=2;app.controls.target.set(a.x,0.6,a.z);app.camera.position.set(a.x+3,3.3,a.z+5);const m=app.world.animalScreenTargets().get(a.id);m.rotation.y=0;app.renderOnce();const v=m.position.clone();v.y=sp==='flamingo'?0.95:0.65;v.project(app.camera);return {x:(v.x+1)*innerWidth/2,y:(1-v.y)*innerHeight/2};}''',sp)
    for viewport in [('desktop',1440,900),('phone',390,844)]:
        label,w,h=viewport; page.set_viewport_size({'width':w,'height':h}); page.wait_for_timeout(200)
        for sp in ['zebra','hippo','flamingo']:
            xy=focus(sp)
            page.screenshot(path=str(OUT/f'{label}-{sp}.png'))
            if label=='desktop':
                page.evaluate('''sp=>{const a=__APP.sim.animals.find(a=>a.speciesId===sp);a.happiness=40;window.beforeSprites=__APP.world.scene.children.filter(o=>o.isSprite).length;}''',sp)
                page.mouse.click(xy['x'],xy['y'])
                check(sp+' feed happiness + hearts',page.evaluate('''sp=>__APP.sim.animals.find(a=>a.speciesId===sp).happiness===70 && __APP.world.scene.children.filter(o=>o.isSprite).length===window.beforeSprites+6''',sp))
                # Second pointer tap within 400ms invokes the actual double-tap handler.
                page.mouse.click(xy['x'],xy['y'])
                check(sp+' double-tap trick',page.evaluate('''sp=>__APP.sim.animals.find(a=>a.speciesId===sp).trickT===1.1''',sp))
                page.evaluate('__APP.pump(15,1/60);__APP.renderOnce()')
                check(sp+' visible spin/hop',page.evaluate('''sp=>{const a=__APP.sim.animals.find(a=>a.speciesId===sp),m=__APP.world.animalScreenTargets().get(a.id);return m.rotation.y>2 && m.position.y>0.4;}''',sp))
                page.screenshot(path=str(OUT/f'{label}-{sp}-trick.png'))
                page.evaluate('__APP.pump(100,1/60)')
            elif sp=='flamingo':
                page.evaluate('''()=>{const a=__APP.sim.animals.find(a=>a.speciesId==='flamingo');a.trickCd=0;__APP.sim.trickAnimal(a.id);__APP.pump(15,1/60);__APP.renderOnce();}''')
                page.screenshot(path=str(OUT/f'{label}-trick.png'))
        page.click('[data-k="animals"]')
        for sp in ['zebra','hippo','flamingo']:
            check(label+' '+sp+' unlocked card', 'locked' not in page.locator(f'[data-id="{sp}"]').get_attribute('class'))
        # Existing horizontal carousel: capture every card in successive scroll positions.
        for sp in ['penguin','panda','giraffe','fox','turtle','flamingo']:
            page.locator(f'[data-id="{sp}"]').scroll_into_view_if_needed()
            page.screenshot(path=str(OUT/f'{label}-menu-{sp}.png'))
        page.click('[data-k="animals"]')
    for count in [9,11,12]:
        check(f'all-species new claim threshold {count}',page.evaluate('''count=>{const s=new __APP.sim.constructor('threshold');s.coins=1000;s.animals=Array.from({length:count},(_,i)=>({id:i+1,speciesId:String(i),happiness:70}));s.feedAnimal(1);return s.milestonesDone.has('all-species')===(count>=12);}''',count))
    for sp in ['zebra','hippo','flamingo']:
        check(sp+' mesh fits fence clearance at every heading',page.evaluate('''sp=>{const a=__APP.sim.animals.find(a=>a.speciesId===sp),g=__APP.world.animalScreenTargets().get(a.id);let max=0;g.traverse(m=>{if(!m.isMesh)return;m.updateMatrix();const pos=m.geometry.attributes.position;for(let i=0;i<pos.count;i++){const v=g.position.clone().fromBufferAttribute(pos,i).applyMatrix4(m.matrix);max=Math.max(max,Math.hypot(v.x,v.z));}});return max<0.9;}''',sp))
    before=page.evaluate('''()=>{window.dispatchEvent(new Event('beforeunload'));return JSON.parse(localStorage.getItem('little-zoo-planet-v1'));}''')
    page.reload();page.wait_for_function('!!window.__APP');page.evaluate('__APP.pump(1,0)')
    check('save reload all zoo animals and habitats',page.evaluate('''snap=>JSON.stringify(__APP.sim.snapshot().animals)===JSON.stringify(snap.animals)&&JSON.stringify(__APP.sim.habitats)===JSON.stringify(snap.habitats)''',before))
    legacy={'v':1,'seed':'legacy-zoo','coins':321,'lifetimeCoins':900,'freeHabitat':False,'nextId':3,'habitats':[{'id':1,'gx':1,'gz':1}],'animals':[{'id':2,'speciesId':'penguin','habitatId':1,'happiness':70,'x':-10,'z':-10,'tx':-10,'tz':-10,'pauseT':100,'hopT':0}],'guests':[],'decor':[],'milestonesDone':['all-species']}
    # New document init overrides the prior page's unload save, like loading an old storage snapshot.
    ctx.add_init_script('localStorage.setItem("little-zoo-planet-v1", '+json.dumps(json.dumps(legacy))+');')
    page.reload();page.wait_for_function('!!window.__APP');page.evaluate('__APP.pump(5,1/60);__APP.renderOnce()')
    check('legacy v1 intact and trick fields normalized',page.evaluate('''()=>{const s=__APP.sim;return s.animals.length===1&&s.animals[0].speciesId==='penguin'&&s.animals[0].trickT===0&&s.animals[0].trickCd===0&&s.tricksDone===0&&s.coins===321&&s.habitats.length===1;}'''))
    check('legacy claimed all-species preserved',page.evaluate('__APP.sim.milestonesDone.has("all-species")'))
    check('zero runtime exceptions',not errors)
    (OUT/'results.json').write_text(json.dumps({'passed':len(checks),'checks':checks,'errors':errors,'audio':audio},indent=2),encoding='utf8')
    print(f'{len(checks)} checks passed')
    browser.close()
