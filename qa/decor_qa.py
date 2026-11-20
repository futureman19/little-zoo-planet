"""Headed production-preview pump QA; run python qa/decor_qa.py."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT = Path(__file__).parent / 'decor-evidence'
OUT.mkdir(exist_ok=True)
checks, errors, audio = [], [], {}

def check(name, value):
    checks.append({'name': name, 'passed': bool(value)})
    (OUT / 'results.json').write_text(json.dumps({'checks': checks, 'passed': sum(c['passed'] for c in checks), 'errors': errors, 'audio': audio}, indent=2), encoding='utf8')
    print('PASS' if value else 'FAIL', name)
    assert value, name

with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=False)
    ctx = browser.new_context(viewport={'width': 1440, 'height': 900})
    ctx.add_init_script('''window.requestAnimationFrame = () => 0;
      window.audioStarts=0;
      const start=AudioBufferSourceNode.prototype.start;
      AudioBufferSourceNode.prototype.start=function(...a){window.audioStarts++;return start.apply(this,a);};''')
    page = ctx.new_page()
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('response', lambda r: audio.update({r.url.split('/')[-1]: r.status}) if '/thud_' in r.url else None)
    page.goto('http://127.0.0.1:4184')
    page.wait_for_function('!!window.__APP')
    page.click('#playbtn')
    page.wait_for_timeout(1500)
    check('placement thud buffers fetched', audio.get('thud_0.wav') == 200 and audio.get('thud_1.wav') == 200)
    # Existing claimed first-decor isolates price deductions from its one-off reward.
    page.evaluate('''()=>{const a=__APP;a.sim.coins=2000;a.sim.milestonesDone.add('first-decor');
      const h=a.sim.placeHabitat(1,1);a.world.addHabitat(h);a.pump(30,1/60);}''')

    def focus(kind):
        page.evaluate('''kind=>{const a=__APP,d=a.sim.decor.find(d=>d.kind===kind),g=a.world.decorMeshes.get(d.id);
          a.controls.enableDamping=false;a.controls.minDistance=2;a.controls.target.copy(g.position);a.controls.target.y=0.5;
          a.camera.position.set(g.position.x+3,3.8,g.position.z+4);a.renderOnce();}''', kind)

    def target(gx, gz):
        return page.evaluate('''([gx,gz])=>{const a=__APP,x=-15+gx*2,z=-15+gz*2;
          a.controls.enableDamping=false;a.controls.minDistance=2;a.controls.target.set(x,0,z);
          a.camera.position.set(x+4,6,z+6);a.renderOnce();const v=a.camera.position.clone().set(x,0,z).project(a.camera);
          return {x:(v.x+1)*innerWidth/2,y:(1-v.y)*innerHeight/2};}''', [gx, gz])

    page.click('[data-k="decor"]')
    for kind, cost, gx, gz in [('pond',60,5,3),('slide',80,6,5),('fountain',90,7,6)]:
        page.click(f'[data-id="{kind}"]')
        xy=target(gx,gz)
        page.mouse.move(xy['x'],xy['y'])
        check(kind+' valid ghost', page.evaluate('''([gx,gz])=>{const t=__APP.world.ghostTile();return t.ok&&t.gx===gx&&t.gz===gz;}''',[gx,gz]))
        before=page.evaluate('({coins:__APP.sim.coins,audio:audioStarts})')
        page.mouse.click(xy['x'],xy['y'])
        check(kind+' native placement exact price', page.evaluate('''([kind,cost,b])=>__APP.sim.decor.some(d=>d.kind===kind)&&__APP.sim.coins===b-cost''',[kind,cost,before['coins']]))
        check(kind+' placement sound started', page.evaluate('audioStarts') == before['audio']+1)
        check(kind+' mesh starts pop', page.evaluate('''kind=>{const d=__APP.sim.decor.find(d=>d.kind===kind),g=__APP.world.decorMeshes.get(d.id);return g.children.length>0&&g.scale.x===0.01;}''',kind))
        page.evaluate('__APP.pump(4,1/60)')
        check(kind+' pop advances',page.evaluate('''kind=>{const d=__APP.sim.decor.find(d=>d.kind===kind),g=__APP.world.decorMeshes.get(d.id);return g.scale.x>0.01&&g.scale.x<1;}''',kind))
        if kind=='slide':
            focus(kind);page.screenshot(path=str(OUT/'desktop-mid-pop.png'))
            page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(250)
            focus(kind);page.screenshot(path=str(OUT/'phone-mid-pop.png'))
            page.set_viewport_size({'width':1440,'height':900});page.wait_for_timeout(250)
        page.evaluate('__APP.pump(30,1/60)')
        # Native retry on occupied tile, including invalid ghost and no cost/state mutation.
        xy=target(gx,gz);page.mouse.move(xy['x']+1,xy['y']);page.mouse.move(xy['x'],xy['y'])
        check(kind+' occupied ghost refused',page.evaluate('!__APP.world.ghostTile().ok'))
        state=page.evaluate('JSON.stringify(__APP.sim.snapshot())')
        page.mouse.click(xy['x'],xy['y'])
        check(kind+' occupied placement unchanged',page.evaluate('JSON.stringify(__APP.sim.snapshot())')==state)
        check(kind+' one-tile geometry and solid shadows',page.evaluate('''kind=>{const d=__APP.sim.decor.find(d=>d.kind===kind),g=__APP.world.decorMeshes.get(d.id);let ok=g.scale.x===1;
          g.traverse(m=>{if(!m.isMesh)return;m.updateMatrix();const ps=m.geometry.attributes.position;
            for(let i=0;i<ps.count;i++){const v=g.position.clone().fromBufferAttribute(ps,i).applyMatrix4(m.matrix);if(Math.abs(v.x)>0.901||Math.abs(v.z)>0.901)ok=false;}
            if(m.material.color.getHex()!==0x5db9e8&&!m.castShadow)ok=false;});return ok;}''',kind))
    page.keyboard.press('Escape');page.click('[data-k="decor"]')
    check('habitat occupancy refused by sim',page.evaluate('''()=>{const s=__APP.sim,b=s.coins;return s.placeDecor('pond',1,1)===null&&s.coins===b;}'''))
    check('insufficient funds refuse all new kinds',page.evaluate('''()=>{const s=new __APP.sim.constructor('poor');s.coins=59;return ['pond','slide','fountain'].every(k=>s.placeDecor(k,0,0)===null)&&s.decor.length===0&&s.coins===59;}'''))
    check('unknown and out-of-bounds kinds refused',page.evaluate('''()=>{const s=__APP.sim,b=s.coins;return !s.placeDecor('missing',0,0)&&!s.placeDecor('pond',-1,0)&&!s.placeDecor('slide',16,0)&&s.coins===b;}'''))
    for label,w,h in [('desktop',1440,900),('phone',390,844)]:
        page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(250)
        for kind in ['pond','slide','fountain']:
            focus(kind);page.screenshot(path=str(OUT/f'{label}-{kind}.png'))
        page.click('[data-k="decor"]')
        check(label+' exactly seven decor cards',page.locator('#shop .card').count()==7)
        for kind,name,emoji,cost in [('tree','Tree','🌳',20),('flower','Flower','🌷',10),('rock','Rock','🪨',15),('balloons','Balloons','🎈',40),('pond','Pond','💧',60),('slide','Slide','🛝',80),('fountain','Fountain','⛲',90)]:
            card=page.locator(f'[data-id="{kind}"]');card.scroll_into_view_if_needed()
            check(label+' '+kind+' visible card contents and 48px target',card.is_visible() and card.locator('.nm').inner_text()==name and card.locator('.e').inner_text()==emoji and card.locator('.pr').inner_text()==f'🪙 {cost}' and card.bounding_box()['width']>=48 and card.bounding_box()['height']>=48)
            if kind in ['tree','balloons','fountain']:
                page.screenshot(path=str(OUT/f'{label}-shop-{kind}.png'))
        page.click('[data-k="decor"]')
    # Fourth/fifth actual UI placements exercise the threshold and routed confetti.
    page.click('[data-k="decor"]');page.click('[data-id="flower"]')
    xy=target(5,6);page.mouse.move(xy['x'],xy['y']);page.mouse.click(xy['x'],xy['y']);page.evaluate('__APP.pump(1,0)')
    check('four decorations does not claim five-decor',page.evaluate('__APP.sim.decor.length===4&&!__APP.sim.milestonesDone.has("five-decor")'))
    page.click('[data-id="rock"]');xy=target(6,6);page.mouse.move(xy['x'],xy['y'])
    before=page.evaluate('({coins:__APP.sim.coins,sprites:__APP.world.scene.children.filter(x=>x.isSprite).length})')
    page.mouse.click(xy['x'],xy['y'])
    check('fifth decor claims exactly 75 coins',page.evaluate('''b=>__APP.sim.decor.length===5&&__APP.sim.milestonesDone.has('five-decor')&&__APP.sim.coins===b-15+75''',before['coins']))
    page.evaluate('__APP.pump(1,0)')
    check('milestone routes 80 confetti sprites and text',page.evaluate('''b=>__APP.world.scene.children.filter(x=>x.isSprite).length===b+80&&document.querySelector('#toast').textContent.includes('Place 5 decorations! +75')''',before['sprites']))
    page.keyboard.press('Escape');page.click('[data-k="decor"]')
    # Use the ordinary overview for confetti: the diagnostic close-up camera can intersect particles.
    page.evaluate('''()=>{const a=__APP;a.controls.target.set(0,0,0);a.camera.position.set(10,24,18);a.pump(4,1/60);a.renderOnce();}''')
    page.screenshot(path=str(OUT/'phone-mid-pop-milestone.png'))
    check('milestone not paid twice',page.evaluate('''()=>{const s=__APP.sim,b=s.coins;s.placeDecor('flower',12,12);return s.coins===b-10&&!s.events.some(e=>e.type==='milestone');}'''))
    page.evaluate('''()=>{const d=__APP.sim.decor.at(-1);__APP.world.addDecor(d);__APP.pump(30,1/60);}''')
    before=page.evaluate('''()=>{window.dispatchEvent(new Event('beforeunload'));return JSON.parse(localStorage.getItem('little-zoo-planet-v1'));}''')
    page.reload();page.wait_for_function('!!window.__APP');page.evaluate('__APP.pump(30,1/60)')
    check('v1 save/reload preserves decorations and claims',page.evaluate('''b=>{const s=__APP.sim.snapshot();return s.v===1&&JSON.stringify(s.decor)===JSON.stringify(b.decor)&&JSON.stringify(s.milestonesDone)===JSON.stringify(b.milestonesDone);}''',before))
    check('all restored decorations have meshes',page.evaluate('__APP.sim.decor.every(d=>__APP.world.decorMeshes.get(d.id)?.children.length>0)'))
    legacy={'v':1,'seed':'legacy-decor','coins':321,'lifetimeCoins':100,'freeHabitat':False,'nextId':4,'habitats':[{'id':1,'gx':1,'gz':1}],'animals':[{'id':2,'speciesId':'penguin','habitatId':1,'happiness':70,'x':-10,'z':-10,'tx':-10,'tz':-10,'pauseT':100,'hopT':0}],'guests':[],'decor':[{'id':3,'kind':'tree','gx':5,'gz':3}],'milestonesDone':['first-animal','first-decor']}
    ctx.add_init_script('localStorage.setItem("little-zoo-planet-v1", '+json.dumps(json.dumps(legacy))+');')
    page.reload();page.wait_for_function('!!window.__APP');page.evaluate('__APP.pump(30,1/60);__APP.renderOnce()')
    check('handcrafted legacy zoo intact and missing fields normalized',page.evaluate('''()=>{const s=__APP.sim;return s.coins===321&&s.animals.length===1&&s.animals[0].speciesId==='penguin'&&s.animals[0].trickT===0&&s.animals[0].trickCd===0&&s.tricksDone===0&&s.habitats.length===1&&s.decor.length===1&&s.decor[0].kind==='tree'&&__APP.world.decorMeshes.size===1;}'''))
    check('legacy first-decor retained and five-decor initially unclaimed',page.evaluate('__APP.sim.milestonesDone.has("first-decor")&&!__APP.sim.milestonesDone.has("five-decor")'))
    check('legacy claim not repaid after new decoration',page.evaluate('''()=>{const s=__APP.sim,b=s.coins;s.placeDecor('pond',6,6);return s.coins===b-60&&s.milestonesDone.has('first-decor');}'''))
    check('zero runtime exceptions',not errors)
    print(f'{len(checks)}/{len(checks)} checks passed')
    browser.close()
