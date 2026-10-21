(function () {
'use strict';
const EXT_ID = 'sticker-manager';
const STORAGE_KEY = 'sticker_manager_data_v1';
const BRIDGE_KEY = 'sticker_manager_bridge_v1';
const DEFAULT_DATA = {version:1,groups:[{id:'group-default',name:'默认分组',stickers:[]}]};
let data = loadData();
let root = null;
let activeGroupId = data.groups[0]?.id || '';
let searchText = '';
let importTarget = 'group-default';
let statusTimer = null;

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function loadData() {
    try {
        const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
        if (parsed && Array.isArray(parsed.groups)) {
            parsed.groups = parsed.groups.map((g, i) => ({id:String(g.id || `group-${i}-${Date.now()}`),name:String(g.name || '未命名分组'),stickers:Array.isArray(g.stickers) ? g.stickers.map((s,j)=>({id:String(s.id || `sticker-${i}-${j}-${Date.now()}`),name:String(s.name || '表情'),url:String(s.url || '').trim()})).filter(s=>s.url) : []}));
            if (!parsed.groups.length) parsed.groups = clone(DEFAULT_DATA.groups);
            return {version:1,groups:parsed.groups};
        }
    } catch (e) { console.warn(`[${EXT_ID}] 读取表情包数据失败`, e); }
    return clone(DEFAULT_DATA);
}
function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    publishBridge();
}
function publishBridge() {
    const payload = {version:1,updatedAt:Date.now(),groups:clone(data.groups)};
    try { localStorage.setItem(BRIDGE_KEY, JSON.stringify(payload)); } catch (e) { console.warn(`[${EXT_ID}] 发布表情包数据失败`, e); }
    try { window.stickerManagerData = payload; } catch (e) {}
    try { window.dispatchEvent(new CustomEvent('sticker-manager-updated', {detail:payload})); } catch (e) {}
}
function uid(prefix) { return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`; }
function esc(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function currentGroup() { return data.groups.find(g=>g.id===activeGroupId) || data.groups[0] || null; }
function setStatus(message, bad) {
    const el = root?.querySelector('#sm-status');
    if (!el) return;
    el.textContent = message;
    el.classList.toggle('sm-error', !!bad);
    clearTimeout(statusTimer);
    statusTimer = setTimeout(()=>{ if (el) el.textContent=''; }, 4500);
}
function parseImport(text) {
    const rows = [];
    const lines = String(text || '').split(/\r?\n/);
    for (let i=0;i<lines.length;i++) {
        const line = lines[i].trim();
        if (!line || line.startsWith('#')) continue;
        if (/^含义\s+URL$/i.test(line) || /^名称\s+URL$/i.test(line) || /^name\s+url$/i.test(line)) continue;
        let name = '', url = '';
        const tabParts = line.split(/\t+/);
        if (tabParts.length >= 2) {
            name = tabParts.shift().trim();
            url = tabParts.join(' ').trim();
        } else {
            const match = line.match(/^(.+?)\s+(https?:\/\/\S+)$/i);
            if (match) { name = match[1].trim(); url = match[2].trim(); }
            else if (/^https?:\/\//i.test(line)) { url = line; name = decodeNameFromUrl(url) || '表情'; }
        }
        if (!url || !/^https?:\/\/\S+$/i.test(url)) continue;
        rows.push({name:name || '表情',url});
    }
    return rows;
}
function decodeNameFromUrl(url) {
    try { return decodeURIComponent(new URL(url).pathname.split('/').pop().replace(/\.[^.]+$/,'')).slice(0,50); } catch (e) { return ''; }
}
function render() {
    if (!root) return;
    const group = currentGroup();
    const visibleGroups = data.groups;
    const allStickers = visibleGroups.reduce((n,g)=>n+g.stickers.length,0);
    root.innerHTML = `
    <div class="sm-app">
      <header class="sm-header">
        <div><div class="sm-eyebrow">SILLYTAVERN EXTENSION</div><h2>表情包管理</h2><p>导入图片 URL · 按文件夹分组 · 本地保存</p></div>
        <div class="sm-header-actions"><button class="sm-btn sm-secondary" data-action="import">批量导入</button><button class="sm-btn sm-primary" data-action="new-group">＋ 新建分组</button></div>
      </header>
      <div class="sm-toolbar">
        <div class="sm-stats"><span>分组 <b>${data.groups.length}</b></span><span>表情 <b>${allStickers}</b></span></div>
        <input id="sm-search" class="sm-input sm-search" placeholder="搜索表情名称或 URL…" value="${esc(searchText)}">
        <div class="sm-toolbar-actions"><button class="sm-btn sm-secondary" data-action="export">导出 JSON</button><button class="sm-btn sm-secondary" data-action="import-json">导入 JSON</button></div>
      </div>
      <div class="sm-layout">
        <aside class="sm-sidebar">
          <div class="sm-side-title">文件夹 <span>${data.groups.length}</span></div>
          <div class="sm-group-list">${data.groups.map(g=>`<button class="sm-group ${g.id===activeGroupId?'active':''}" data-group="${esc(g.id)}"><span class="sm-folder-icon">▰</span><span class="sm-group-name">${esc(g.name)}</span><span class="sm-count">${g.stickers.length}</span></button>`).join('')}</div>
          <div class="sm-side-bottom"><button class="sm-btn sm-secondary sm-wide" data-action="rename-group" ${group?'':'disabled'}>重命名分组</button><button class="sm-btn sm-danger sm-wide" data-action="delete-group" ${data.groups.length<=1?'disabled':''}>删除当前分组</button></div>
        </aside>
        <main class="sm-main">
          <div class="sm-main-head"><div><h3>${esc(group?.name || '表情包')}</h3><p>${group?.stickers.length || 0} 个表情</p></div><button class="sm-btn sm-primary" data-action="import" ${group?'':'disabled'}>＋ 导入 URL</button></div>
          <div class="sm-grid">${group ? group.stickers.filter(s=>!searchText || (s.name+' '+s.url).toLowerCase().includes(searchText.toLowerCase())).map(s=>`
            <article class="sm-card">
              <div class="sm-image-wrap"><img loading="lazy" src="${esc(s.url)}" alt="${esc(s.name)}" referrerpolicy="no-referrer"><span class="sm-image-failed">图片加载失败</span><button class="sm-card-menu" data-action="edit-sticker" data-id="${esc(s.id)}" title="编辑">⋯</button></div>
              <div class="sm-card-info"><div class="sm-card-name" title="${esc(s.name)}">${esc(s.name)}</div><div class="sm-card-url" title="${esc(s.url)}">${esc(s.url)}</div></div>
              <div class="sm-card-actions"><button data-action="edit-sticker" data-id="${esc(s.id)}">编辑</button><button data-action="copy-url" data-id="${esc(s.id)}">复制 URL</button><button class="sm-text-danger" data-action="delete-sticker" data-id="${esc(s.id)}">删除</button></div>
            </article>`).join('') : ''}
            ${group && !group.stickers.length ? '<div class="sm-empty"><div class="sm-empty-icon">▧</div><h3>这个分组还没有表情包</h3><p>粘贴“含义 URL”格式的内容即可批量导入。</p><button class="sm-btn sm-primary" data-action="import">导入表情 URL</button></div>' : ''}
            ${group && group.stickers.length && !group.stickers.some(s=>!searchText || (s.name+' '+s.url).toLowerCase().includes(searchText.toLowerCase())) ? '<div class="sm-empty"><h3>没有找到匹配的表情</h3><p>试试其他关键词。</p></div>' : ''}
          </div>
        </main>
      </div>
      <div id="sm-status" class="sm-status" role="status"></div>
      <footer class="sm-footer"><span>数据保存在当前酒馆浏览器的本地存储中。</span><span>聊天界面兼容函数：<code>findPlatformStickers()</code> / <code>renderStickerPanel()</code></span></footer>
    </div>`;
    root.querySelectorAll('.sm-image-wrap img').forEach(img=>img.addEventListener('error',()=>img.parentElement.classList.add('failed'),{once:true}));
    bindEvents();
}
function modal(title, body, onConfirm, confirmText='确定') {
    const old = document.querySelector('#sm-modal');
    if (old) old.remove();
    const el = document.createElement('div');
    el.id='sm-modal';
    el.className='sm-modal-backdrop';
    el.innerHTML=`<div class="sm-modal" role="dialog" aria-modal="true"><div class="sm-modal-head"><h3>${esc(title)}</h3><button class="sm-modal-close" type="button" aria-label="关闭">×</button></div><div class="sm-modal-body">${body}</div><div class="sm-modal-actions"><button class="sm-btn sm-secondary" data-modal-cancel>取消</button><button class="sm-btn sm-primary" data-modal-confirm>${esc(confirmText)}</button></div></div>`;
    document.body.appendChild(el);
    const close=()=>el.remove();
    el.querySelector('.sm-modal-close').onclick=close;
    el.querySelector('[data-modal-cancel]').onclick=close;
    el.addEventListener('click',e=>{if(e.target===el)close();});
    el.querySelector('[data-modal-confirm]').onclick=()=>{const result=onConfirm(el);if(result!==false)close();};
    el.querySelector('input,textarea')?.focus();
}
function openImport(jsonMode=false) {
    const group=currentGroup();
    if (!group) return;
    importTarget=group.id;
    const opts=data.groups.map(g=>`<option value="${esc(g.id)}" ${g.id===importTarget?'selected':''}>${esc(g.name)}</option>`).join('');
    if (jsonMode) {
        modal('导入 JSON',`<p class="sm-help">选择之前导出的 JSON 文件，或直接粘贴 JSON 内容。</p><textarea id="sm-json-input" class="sm-textarea" rows="10" placeholder='{"version":1,"groups":[...]}'></textarea><label class="sm-file-label">选择 JSON 文件<input id="sm-json-file" type="file" accept=".json,application/json"></label>`,el=>{
            const raw=el.querySelector('#sm-json-input').value.trim();
            if(!raw){setStatus('请粘贴 JSON 内容或选择文件。',true);return false;}
            try {
                const parsed=JSON.parse(raw);
                const groups=Array.isArray(parsed)?parsed:parsed.groups;
                if(!Array.isArray(groups))throw new Error('JSON 中没有 groups 数组');
                let count=0;
                groups.forEach(g=>{if(!g||!Array.isArray(g.stickers))return;let target=data.groups.find(x=>x.name===g.name);if(!target){target={id:uid('group'),name:String(g.name||'导入分组'),stickers:[]};data.groups.push(target);}g.stickers.forEach(s=>{if(s&&s.url){target.stickers.push({id:uid('sticker'),name:String(s.name||'表情'),url:String(s.url).trim()});count++;}});});
                if(!data.groups.length)data.groups=clone(DEFAULT_DATA.groups);
                activeGroupId=data.groups[0].id;saveData();render();setStatus(`导入完成，共导入 ${count} 个表情。`);return true;
            } catch(e){setStatus('JSON 格式错误：'+e.message,true);return false;}
        },'导入');
        el.querySelector('#sm-json-file').addEventListener('change',async e=>{const file=e.target.files?.[0];if(file)el.querySelector('#sm-json-input').value=await file.text();});
        return;
    }
    modal('批量导入表情 URL',`<label class="sm-field-label">导入到文件夹</label><select id="sm-import-group" class="sm-input">${opts}</select><p class="sm-help">每行一条：<code>含义 URL</code>。也支持用 Tab 分隔名称和 URL，或每行只填写 URL。</p><textarea id="sm-import-text" class="sm-textarea" rows="12" placeholder="含义 URL&#10;大脑宕机 https://example.com/001.png&#10;逃走 https://example.com/002.png"></textarea><div class="sm-import-note">只保存 URL，不会把图片上传到服务器。仅支持 http/https 图片链接。</div>`,el=>{
        const targetId=el.querySelector('#sm-import-group').value;
        const target=data.groups.find(g=>g.id===targetId);
        const rows=parseImport(el.querySelector('#sm-import-text').value);
        if(!target){setStatus('请先创建或选择分组。',true);return false;}
        if(!rows.length){setStatus('没有识别到有效 URL，请检查格式。',true);return false;}
        const existing=new Set(target.stickers.map(s=>s.url));
        let added=0,duplicates=0;
        rows.forEach(row=>{if(existing.has(row.url)){duplicates++;return;}existing.add(row.url);target.stickers.push({id:uid('sticker'),name:row.name,url:row.url});added++;});
        activeGroupId=target.id;saveData();render();setStatus(`导入完成：新增 ${added} 个，跳过重复 URL ${duplicates} 个。`);
    },'开始导入');
}
function bindEvents() {
    root.querySelectorAll('[data-group]').forEach(el=>el.onclick=()=>{activeGroupId=el.dataset.group;render();});
    root.querySelectorAll('[data-action]').forEach(el=>el.onclick=()=>handleAction(el.dataset.action,el.dataset.id));
    const search=root.querySelector('#sm-search');
    search?.addEventListener('input',()=>{const pos=search.selectionStart;searchText=search.value;const grid=root.querySelector('.sm-grid');const group=currentGroup();if(!grid||!group)return;render();const next=root.querySelector('#sm-search');next?.focus();next?.setSelectionRange(pos,pos);});
}
function handleAction(action,id) {
    const group=currentGroup();
    if(action==='new-group') {
        modal('新建文件夹','<label class="sm-field-label">文件夹名称</label><input id="sm-group-name" class="sm-input" maxlength="80" placeholder="例如：小猴子">',el=>{
            const name=el.querySelector('#sm-group-name').value.trim();if(!name){setStatus('请输入文件夹名称。',true);return false;}
            if(data.groups.some(g=>g.name===name)){setStatus('已经存在同名文件夹。',true);return false;}
            const g={id:uid('group'),name,stickers:[]};data.groups.push(g);activeGroupId=g.id;saveData();render();setStatus('文件夹已创建。');
        },'创建');
    } else if(action==='rename-group' && group) {
        modal('重命名文件夹',`<label class="sm-field-label">文件夹名称</label><input id="sm-group-name" class="sm-input" maxlength="80" value="${esc(group.name)}">`,el=>{
            const name=el.querySelector('#sm-group-name').value.trim();if(!name){setStatus('名称不能为空。',true);return false;}
            if(data.groups.some(g=>g.id!==group.id&&g.name===name)){setStatus('已经存在同名文件夹。',true);return false;}
            group.name=name;saveData();render();setStatus('文件夹名称已更新。');
        });
    } else if(action==='delete-group' && group) {
        modal('删除文件夹',`<p>确定删除「<b>${esc(group.name)}</b>」及其中的 ${group.stickers.length} 个表情吗？此操作无法撤销。</p>`,()=>{
            data.groups=data.groups.filter(g=>g.id!==group.id);if(!data.groups.length)data.groups=clone(DEFAULT_DATA.groups);activeGroupId=data.groups[0].id;saveData();render();setStatus('文件夹已删除。');
        },'确认删除');
    } else if(action==='import') openImport(false);
    else if(action==='import-json') openImport(true);
    else if(action==='export') exportData();
    else if(action==='edit-sticker' && group) {
        const sticker=group.stickers.find(s=>s.id===id);if(!sticker)return;
        modal('编辑表情',`<label class="sm-field-label">表情名称</label><input id="sm-sticker-name" class="sm-input" maxlength="120" value="${esc(sticker.name)}"><label class="sm-field-label">图片 URL</label><input id="sm-sticker-url" class="sm-input" value="${esc(sticker.url)}" type="url">`,el=>{
            const name=el.querySelector('#sm-sticker-name').value.trim()||'表情';const url=el.querySelector('#sm-sticker-url').value.trim();
            if(!/^https?:\/\/\S+$/i.test(url)){setStatus('请输入有效的 http/https URL。',true);return false;}
            sticker.name=name;sticker.url=url;saveData();render();setStatus('表情已更新。');
        },'保存');
    } else if(action==='delete-sticker' && group) {
        const sticker=group.stickers.find(s=>s.id===id);if(!sticker)return;
        modal('删除表情',`确定删除「<b>${esc(sticker.name)}</b>」吗？`,()=>{group.stickers=group.stickers.filter(s=>s.id!==id);saveData();render();setStatus('表情已删除。');},'确认删除');
    } else if(action==='copy-url' && group) {
        const sticker=group.stickers.find(s=>s.id===id);if(!sticker)return;
        if(navigator.clipboard?.writeText)navigator.clipboard.writeText(sticker.url).then(()=>setStatus('URL 已复制。')).catch(()=>fallbackCopy(sticker.url));
        else fallbackCopy(sticker.url);
    }
}
function fallbackCopy(value) {
    const input=document.createElement('textarea');input.value=value;input.style.position='fixed';input.style.opacity='0';document.body.appendChild(input);input.select();
    try {document.execCommand('copy');setStatus('URL 已复制。');} catch(e) {setStatus('复制失败，请手动复制。',true);}input.remove();
}
function exportData() {
    const blob=new Blob([JSON.stringify({version:1,exportedAt:new Date().toISOString(),groups:data.groups},null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='sillytavern-stickers.json';a.click();URL.revokeObjectURL(url);setStatus('已导出 JSON 备份。');
}
function createPage() {
    const container=document.createElement('div');container.id='sticker-manager-extension';
    container.innerHTML='<div class="sm-launch-panel"><div><h3>表情包管理器</h3><p>独立管理表情包 URL，并按文件夹分组。数据保存在当前酒馆浏览器中。</p></div><button id="sm-open-manager" class="menu_button">打开表情包管理</button></div>';
    const host=document.createElement('div');host.id='sm-manager-overlay';host.className='sm-overlay';host.innerHTML='<div class="sm-overlay-top"><div class="sm-overlay-title">表情包管理器</div><button id="sm-close-manager" class="sm-btn sm-secondary">关闭</button></div><div id="sm-manager-root"></div>';
    document.body.appendChild(host);
    root=host.querySelector('#sm-manager-root');
    container.querySelector('#sm-open-manager').onclick=()=>{host.classList.add('open');render();};
    host.querySelector('#sm-close-manager').onclick=()=>host.classList.remove('open');
    document.addEventListener('keydown',e=>{if(e.key==='Escape')host.classList.remove('open');});
    publishBridge();
    return container;
}
function getStickerGroups() {
    try {
        const raw=localStorage.getItem(BRIDGE_KEY);
        const parsed=raw?JSON.parse(raw):null;
        if(parsed&&Array.isArray(parsed.groups))return parsed.groups;
    } catch(e) {}
    return clone(data.groups);
}
function findPlatformStickers() {
    const groups=getStickerGroups();
    const active=groups.filter(g=>g&&Array.isArray(g.stickers)).map(g=>({id:g.id,name:g.name||'表情组',stickers:g.stickers.filter(s=>s&&s.url&&/^https?:\/\//i.test(s.url)).map(s=>({id:s.id,name:s.name||'表情',url:s.url}))})).filter(g=>g.stickers.length);
    try { window.stickerManagerLoadedGroups=active; } catch(e) {}
    return active;
}
function renderStickerPanel() {
    const loadedGroups=findPlatformStickers();
    const tabsEl=document.getElementById('stk-tabs');
    const gridEl=document.getElementById('stk-grid');
    if(!tabsEl||!gridEl)return loadedGroups;
    tabsEl.innerHTML='';gridEl.innerHTML='';
    if(!loadedGroups.length){gridEl.innerHTML='<div style="grid-column:1/-1;text-align:center;color:#8e8e93;font-size:12px;padding:30px 0;">未导入表情包</div>';return loadedGroups;}
    let idx=Number(window.stickerManagerCurGrpIdx)||0;if(idx>=loadedGroups.length)idx=0;
    loadedGroups.forEach((g,i)=>{const b=document.createElement('button');b.className='stk-tab'+(i===idx?' on':'');b.textContent=g.name;b.onclick=()=>{window.stickerManagerCurGrpIdx=i;renderStickerPanel();};tabsEl.appendChild(b);});
    loadedGroups[idx].stickers.forEach(s=>{const it=document.createElement('div');it.className='stk-item';const im=document.createElement('img');im.src=s.url;im.referrerPolicy='no-referrer';const sp=document.createElement('span');sp.textContent=s.name||'表情';it.appendChild(im);it.appendChild(sp);it.onclick=()=>{const inp=document.getElementById('ri');if(!inp)return;const tag='[表情:'+(s.name||'表情')+' '+s.url+']';inp.value=(inp.value?inp.value+' ':'')+tag;inp.dispatchEvent(new Event('input',{bubbles:true}));const panel=document.getElementById('stk-panel');if(panel)panel.classList.remove('show');};gridEl.appendChild(it);});
    return loadedGroups;
}
window.findPlatformStickers=findPlatformStickers;
window.renderStickerPanel=renderStickerPanel;
window.getStickerManagerGroups=getStickerGroups;
window.addEventListener('sticker-manager-updated',()=>{publishBridge();});
function init() {
    publishBridge();
    const settings=document.querySelector('#extensions_settings');
    const extensions=document.querySelector('#extensions_settings2');
    const target=settings||extensions||document.querySelector('#extensions_settings .inline-drawer-content');
    if(!target) {
        setTimeout(init,1000);
        return;
    }
    if(document.getElementById('sticker-manager-extension'))return;
    const page=createPage();
    target.appendChild(page);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
