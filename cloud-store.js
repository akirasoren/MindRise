(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MindRiseCloudStore = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';
  const object = v => v && typeof v === 'object' && !Array.isArray(v);
  const text = (v, max = 100) => typeof v === 'string' && v.length <= max;
  const date = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
  const time = v => typeof v === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(v);
  const list = (v, check) => Array.isArray(v) && v.length <= 10000 && v.every(check);
  const natural = v => Number.isSafeInteger(v) && v >= 0;
  const seeds = ['succulent','bonsai','cherry','cosmic'];
  const pots = ['ceramic','chrome','glass'];
  const tags = ['none','consistent','early','focus'];
  const backgrounds = ['sage','space','underwater','retro','zen','pixel'];
  const plant = p => object(p) && seeds.includes(p.seed) && list(p.days,date) && p.days.length <= 7 && natural(p.xp) && date(p.planted);
  function validState(s) {
    try {
      if (!object(s) || s.version !== 1 || !text(s.name,40) || !s.name.trim() || !text(s.school,60) || !text(s.email,100) || !text(s.theme,40) || typeof s.notifications !== 'boolean' || typeof s.calm !== 'boolean') return false;
      if (!list(s.activity,date) || !list(s.tasks,t=>object(t)&&text(t.id,100)&&text(t.title,90)&&date(t.date)&&time(t.time)&&['Academic','Wellness','Personal'].includes(t.category)&&typeof t.done==='boolean')) return false;
      if (!list(s.sleep,s=>object(s)&&date(s.date)&&time(s.bed)&&time(s.wake)&&Number.isInteger(s.minutes)&&s.minutes>0&&s.minutes<1440)) return false;
      if (!list(s.moods,m=>object(m)&&date(m.date)&&Number.isInteger(m.mood)&&m.mood>=0&&m.mood<=4&&Number.isInteger(m.energy)&&m.energy>=1&&m.energy<=5&&text(m.note,400))) return false;
      if (s.classes !== undefined && !list(s.classes,c=>object(c)&&text(c.id,100)&&text(c.subject,90)&&text(c.room,100)&&time(c.start)&&time(c.end)&&c.start<c.end&&list(c.days,d=>Number.isInteger(d)&&d>=0&&d<=6)&&c.days.length>0&&c.days.length<=7)) return false;
      if (s.garden !== undefined) {
        const g=s.garden;
        if (!object(g)||g.version!==1||!natural(g.gems)||!natural(g.xp)||!(g.active===null||plant(g.active))||!list(g.showcase,p=>plant(p)&&pots.includes(p.pot)&&tags.includes(p.tag)&&backgrounds.includes(p.background)&&date(p.harvested)&&natural(p.streak))) return false;
        if (!object(g.seeds)||!seeds.every(id=>natural(g.seeds[id]))||!object(g.owned)||!object(g.selected)) return false;
        for (const [group,allowed] of Object.entries({pots,tags,backgrounds})) if (!list(g.owned[group],id=>allowed.includes(id))||!g.owned[group].includes(g.selected[group])) return false;
        if (g.owned.appThemes!==undefined&&!list(g.owned.appThemes,id=>text(id,40))) return false;
        if (!list(g.rewardedSleep,date)||!list(g.rewardedTasks,id=>text(id,100))) return false;
      }
      return JSON.stringify(s).length <= 500000;
    } catch (_) { return false; }
  }
  class SaveController {
    constructor(write, changed = () => {}) { this.write=write; this.changed=changed; this.epoch=0; this.close(); }
    open(userId, revision) { this.epoch++; this.userId=userId; this.revision=revision; this.pending=null; this.status='saved'; this.changed(this); }
    close() { this.epoch++; this.userId=null; this.revision=0; this.pending=null; this.status='idle'; this.changed(this); }
    async save(payload) {
      if (!this.userId || !['saved'].includes(this.status)) return false;
      if (!validState(payload)) {this.status='invalid';this.changed(this);return false;}
      this.pending={userId:this.userId,expectedRevision:this.revision,mutationId:crypto.randomUUID(),payload:JSON.parse(JSON.stringify(payload))};
      return this.send();
    }
    async retry() { if (this.status!=='error'||!this.pending) return false; return this.send(); }
    async send() {
      const epoch=this.epoch, pending=this.pending;
      this.status='saving';this.changed(this);
      try {
        const result=await this.write(pending);
        if(epoch!==this.epoch)return false;
        if(!Number.isSafeInteger(result?.revision)||result.revision!==pending.expectedRevision+1)throw Error('Invalid save acknowledgement');
        this.revision=result.revision;this.pending=null;this.status='saved';this.changed(this);return true;
      } catch(error) {
        if(epoch!==this.epoch)return false;
        this.status=error?.code==='40001'?'conflict':'error';this.changed(this);return false;
      }
    }
  }
  return {SaveController,validState};
});
