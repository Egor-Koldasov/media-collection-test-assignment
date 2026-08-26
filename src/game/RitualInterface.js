import * as THREE from 'three';

const ASSET_SPECS = {
  concept: ['/assets/twentieth-bell-concept.png', 1, 1],
  roster: ['/assets/oathbound-roster.png', 5, 1],
  abilities: ['/assets/ability-codex-atlas.png', 6, 4],
  upgradesA: ['/assets/upgrade-rites-a.png', 5, 5],
  upgradesB: ['/assets/upgrade-rites-b.png', 5, 4],
  origins: ['/assets/origin-relic-atlas.png', 4, 3],
  bestiary: ['/assets/grave-archive-bestiary.png', 4, 3],
  undead: ['/assets/undead-sprites.png', 4, 3],
  ornaments: ['/assets/hud-ornaments.png', 4, 4]
};

const COLORS = {
  ink: '#07090b',
  soot: '#101114',
  parchment: '#d9cfb7',
  paperDim: '#968e7f',
  bone: '#eee4cb',
  blood: '#b84045',
  bloodBright: '#dc5a55',
  gold: '#b9955d',
  goldBright: '#e0bd75',
  ap: '#7082b4',
  hp: '#ae4147',
  ward: '#b9a66f'
};

const DIFFICULTIES = [
  { level: 1, roman: 'I', name: 'Mourner', detail: 'A gentler procession for learning the litany.' },
  { level: 2, roman: 'II', name: 'Penitent', detail: 'The dead gather with a measured hunger.' },
  { level: 3, roman: 'III', name: 'Votary', detail: 'A severe vigil, but not yet a hopeless one.' },
  { level: 4, roman: 'IV', name: 'Oathbound', detail: 'The intended rite. Every bell asks a price.' },
  { level: 5, roman: 'V', name: 'Unshriven', detail: 'A procession composed entirely of bad news.' }
];

const ARCHIVE_TABS = ['Procession', 'Bloodlines', 'Rites', 'Memory'];
const ROMAN = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'];
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const lerp = (a, b, amount) => a + (b - a) * amount;
const roman = (value) => ROMAN[value] || String(value ?? 0);
const pad = (value) => String(value).padStart(2, '0');
const formatTime = (seconds) => {
  const value = Math.max(0, Math.ceil(Number(seconds) || 0));
  return `${pad(Math.floor(value / 60))}:${pad(value % 60)}`;
};
const cleanText = (value) => String(value ?? '')
  .replace(/<[^>]*>/g, '')
  .replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"')
  .trim();
const colorString = (value, fallback = COLORS.gold) => {
  if (typeof value === 'string') return value;
  if (Number.isFinite(value)) return `#${Math.round(value).toString(16).padStart(6, '0').slice(-6)}`;
  return fallback;
};

function bellName(bell) {
  if (bell <= 3) return 'THE WAKING';
  if (bell <= 7) return 'THE MUSTER';
  if (bell <= 11) return 'THE PRESS';
  if (bell <= 15) return 'THE DARKENING';
  if (bell <= 19) return 'THE LAST VIGIL';
  return 'THE TWENTIETH BELL';
}

function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width * .5, height * .5);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function raggedPath(ctx, x, y, width, height, notch = 12) {
  ctx.beginPath();
  ctx.moveTo(x + notch, y);
  ctx.lineTo(x + width - notch * 1.8, y);
  ctx.lineTo(x + width - notch, y + notch * .62);
  ctx.lineTo(x + width, y + notch * 1.25);
  ctx.lineTo(x + width - notch * .45, y + height - notch);
  ctx.lineTo(x + width - notch * 1.35, y + height);
  ctx.lineTo(x + notch * 1.2, y + height);
  ctx.lineTo(x, y + height - notch * .8);
  ctx.lineTo(x + notch * .4, y + notch);
  ctx.closePath();
}

function fitText(ctx, text, maxWidth, startSize, family, weight = 600, minimum = 9) {
  let size = startSize;
  do {
    ctx.font = `${weight} ${size}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 1;
  } while (size > minimum);
  return size;
}

function ellipsize(ctx, text, maxWidth) {
  const source = String(text ?? '');
  if (ctx.measureText(source).width <= maxWidth) return source;
  let clipped = source;
  while (clipped.length > 1 && ctx.measureText(`${clipped}…`).width > maxWidth) clipped = clipped.slice(0, -1);
  return `${clipped}…`;
}

function wrapLines(ctx, text, maxWidth, maxLines = Infinity) {
  const words = cleanText(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line);
      line = word;
      if (lines.length === maxLines) break;
    } else line = next;
  }
  if (lines.length < maxLines && line) lines.push(line);
  if (lines.length === maxLines && words.length && ctx.measureText(lines.join(' ')).width < ctx.measureText(words.join(' ')).width) {
    lines[lines.length - 1] = ellipsize(ctx, lines[lines.length - 1], maxWidth);
  }
  return lines;
}

export class RitualInterface {
  constructor(renderer, { actions = {} } = {}) {
    this.renderer = renderer;
    this.actions = actions;
    this.width = 1;
    this.height = 1;
    this.pixelScale = 1;
    this.view = 'intro';
    this.previousView = 'play';
    this.state = {
      view: 'intro',
      difficulty: 4,
      difficultyName: 'Oathbound',
      elapsed: 0,
      remaining: 1200,
      progress: 0,
      bell: 1,
      threat: 1,
      kills: 0,
      selectedId: null,
      units: [],
      graveLaws: [],
      paused: false,
      soundEnabled: true
    };
    this.canvas = document.createElement('canvas');
    this.canvas.setAttribute('aria-hidden', 'true');
    this.ctx = this.canvas.getContext('2d', { alpha: true, desynchronized: true });
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.generateMipmaps = false;
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 2);
    this.camera.position.z = 1;
    this.material = new THREE.MeshBasicMaterial({
      map: this.texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      toneMapped: false
    });
    this.plane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    this.plane.frustumCulled = false;
    this.plane.renderOrder = 10000;
    this.scene.add(this.plane);
    this.assets = {};
    this.hitRegions = [];
    this.focusRegions = [];
    this.hoveredId = null;
    this.pressedId = null;
    this.pointerPress = null;
    this.clickCandidateId = null;
    this.hitClip = null;
    this.focusIndex = -1;
    this.debugVisible = false;
    this.debugFrames = [];
    this.lastRenderAt = performance.now();
    this.lastDebugPaint = 0;
    this.lastSignature = '';
    this.dirty = true;
    this.feedItems = [];
    this.encounter = null;
    this.encounterUntil = 0;
    this.inspectedAbility = null;
    this.upgradeUnitId = null;
    this.choicePage = 0;
    this.archiveTab = 0;
    this.modalScroll = 0;
    this.pointer = { x: -1, y: -1 };
    this.destroyed = false;
    this._loadAssets();
    document.fonts?.ready?.then(() => { this.dirty = true; });
    const rect = renderer?.domElement?.getBoundingClientRect?.();
    if (rect) this.resize(rect.width, rect.height, window.devicePixelRatio || 1);
  }

  _loadAssets() {
    for (const [name, [src, columns, rows]] of Object.entries(ASSET_SPECS)) {
      const image = new Image();
      this.assets[name] = { image, columns, rows, loaded: false };
      image.decoding = 'async';
      image.onload = () => {
        this.assets[name].loaded = true;
        this.dirty = true;
      };
      image.src = src;
    }
  }

  resize(width, height, dpr = 1) {
    const nextWidth = Math.max(1, Math.round(width));
    const nextHeight = Math.max(1, Math.round(height));
    const pixelBudgetScale = Math.sqrt(6000000 / Math.max(1, nextWidth * nextHeight));
    const nextScale = clamp(Math.min(Number(dpr) || 1, pixelBudgetScale), .25, 2);
    const bitmapWidth = Math.max(1, Math.round(nextWidth * nextScale));
    const bitmapHeight = Math.max(1, Math.round(nextHeight * nextScale));
    const changed = bitmapWidth !== this.canvas.width || bitmapHeight !== this.canvas.height;
    this.width = nextWidth;
    this.height = nextHeight;
    this.pixelScale = nextScale;
    if (changed) {
      this.canvas.width = bitmapWidth;
      this.canvas.height = bitmapHeight;
      this.canvas.style.width = `${nextWidth}px`;
      this.canvas.style.height = `${nextHeight}px`;
    }
    this.dirty = true;
  }

  setActions(actions = {}) {
    this.actions = actions;
    return this;
  }

  setView(view) {
    if (view && typeof view === 'object') {
      this.update(view);
      view = view.view;
    }
    if (!view || view === this.view) return this;
    if (view === 'archive' || view === 'upgrade' || view === 'order' || view === 'outcome') this.previousView = this.view === 'intro' ? 'intro' : 'play';
    this.view = view;
    this.state.view = view;
    this.modalScroll = 0;
    this.focusIndex = -1;
    this.hoveredId = null;
    this.pressedId = null;
    this.pointerPress = null;
    this.clickCandidateId = null;
    this.inspectedAbility = null;
    this.dirty = true;
    return this;
  }

  update(nextState = {}) {
    const snapshot = nextState.snapshot || null;
    this.state = { ...this.state, ...(snapshot || {}), ...nextState };
    if (nextState.difficultyLevel !== undefined) this.state.difficulty = nextState.difficultyLevel;
    if (nextState.archiveData) this.state.chronicle = nextState.archiveData;
    if (nextState.catalogs?.origins) this.state.origins = nextState.catalogs.origins;
    if (nextState.feed) {
      this.feedItems = nextState.feed.map((item) => ({
        text: cleanText(item?.text ?? item),
        important: !!item?.important,
        born: item?.time || performance.now()
      })).slice(0, 6);
    }
    if (nextState.encounter) this.state.currentEncounter = nextState.encounter;
    if (nextState.view && nextState.view !== this.view) this.setView(nextState.view);
    if (nextState.upgradeUnitId !== undefined) this.upgradeUnitId = nextState.upgradeUnitId;
    if (nextState.archiveTab !== undefined) {
      const tabKeys = ['graveborn', 'origins', 'rites', 'memory'];
      const numeric = typeof nextState.archiveTab === 'number' ? nextState.archiveTab : tabKeys.indexOf(String(nextState.archiveTab));
      this.archiveTab = clamp(numeric < 0 ? 0 : numeric, 0, ARCHIVE_TABS.length - 1);
    }
    if (nextState.debugVisible !== undefined || nextState.debugEnabled !== undefined) this.debugVisible = !!(nextState.debugVisible ?? nextState.debugEnabled);
    if (nextState.soundEnabled !== undefined) this.state.soundEnabled = !!nextState.soundEnabled;
    const signature = this._stateSignature();
    if (signature !== this.lastSignature) {
      this.lastSignature = signature;
      this.dirty = true;
    }
    return this;
  }

  _stateSignature() {
    const s = this.state;
    const units = (s.units || []).map((unit) => [
      unit.id, unit.alive, Math.round(unit.hp || 0), Math.round(unit.maxHp || 0),
      Math.round(unit.ap || 0), Math.round(unit.maxAp || 0), unit.shield ? Math.round(unit.shield) : 0,
      unit.abilityCursor, unit.aiState, (unit.abilities || []).map((ability) => ability.id).join(',')
    ].join(':')).join('|');
    const choices = (s.upgradeChoices || s.choices || []).map((choice) => choice.id || choice.name).join('|');
    return [
      this.view, Math.floor((s.remaining || 0) * 5), Math.floor((s.progress || 0) * 500), s.bell,
      s.threat, s.kills, s.selectedId, s.paused, s.soundEnabled, s.enemyCount, s.eliteCount,
      s.meleeIntents, s.rangedIntents, s.zoneCount, s.treasureCount, s.pendingTreasureDrops,
      s.currentEncounter?.id, units, choices, this.upgradeUnitId, this.archiveTab, this.debugVisible
    ].join('~');
  }

  pushFeed(text, important = false) {
    const clean = cleanText(text);
    if (!clean) return;
    this.feedItems.unshift({ text: clean, important: !!important, born: performance.now() });
    this.feedItems = this.feedItems.slice(0, 6);
    this.dirty = true;
  }

  showEncounter(encounter) {
    if (!encounter) return;
    this.encounter = encounter;
    this.encounterUntil = performance.now() + 7000;
    this.dirty = true;
  }

  setPaused(paused) {
    this.state.paused = !!paused;
    this.dirty = true;
  }

  setSound(enabled) {
    this.state.soundEnabled = !!enabled;
    this.dirty = true;
  }

  toggleDebug(force) {
    this.debugVisible = force === undefined ? !this.debugVisible : !!force;
    this.dirty = true;
    return this.debugVisible;
  }

  _invoke(name, ...args) {
    const action = this.actions?.[name];
    if (typeof action === 'function') return action(...args);
    if (typeof this.actions?.dispatch === 'function') return this.actions.dispatch(name, ...args);
    return undefined;
  }

  _pointerFromEvent(event) {
    const rect = this.renderer?.domElement?.getBoundingClientRect?.();
    if (!rect) return { x: event.clientX || 0, y: event.clientY || 0 };
    return {
      x: (event.clientX - rect.left) * this.width / Math.max(1, rect.width),
      y: (event.clientY - rect.top) * this.height / Math.max(1, rect.height)
    };
  }

  _regionAt(x, y) {
    for (let index = this.hitRegions.length - 1; index >= 0; index -= 1) {
      const region = this.hitRegions[index];
      if (!region.disabled && x >= region.x && x <= region.x + region.width && y >= region.y && y <= region.y + region.height) return region;
    }
    return null;
  }

  handlePointerMove(event) {
    const point = this._pointerFromEvent(event);
    this.pointer = point;
    const press = this.pointerPress;
    if (press && Math.hypot(point.x - press.x, point.y - press.y) > 7) {
      press.dragged = true;
      this.pressedId = null;
      this.clickCandidateId = null;
      if (press.pointerType === 'touch' && this._isBlockingView()) {
        const delta = press.lastY - point.y;
        this.modalScroll = clamp(this.modalScroll + delta, 0, this._maxModalScroll());
        press.lastY = point.y;
        this.dirty = true;
      }
    }
    const region = this._regionAt(point.x, point.y);
    const nextId = region?.id || null;
    if (nextId !== this.hoveredId) {
      this.hoveredId = nextId;
      this.inspectedAbility = region?.ability || null;
      this.dirty = true;
    }
    if (this.renderer?.domElement) this.renderer.domElement.style.cursor = region ? (region.cursor || 'pointer') : '';
    return !!region || this._isBlockingView();
  }

  wantsPointer(event) {
    const point = this._pointerFromEvent(event);
    return !!this._regionAt(point.x, point.y) || this._isBlockingView();
  }

  setInspectedAbility(index) {
    const unit = this._selectedUnit();
    const abilityIndex = Number(index);
    const ability = unit?.abilities?.[abilityIndex];
    this.inspectedAbility = ability ? { unit, ability, index: abilityIndex } : null;
    this.dirty = true;
    return this.inspectedAbility;
  }

  handlePointerDown(event) {
    const point = this._pointerFromEvent(event);
    this.pointer = point;
    const region = this._regionAt(point.x, point.y);
    const blocking = this._isBlockingView();
    this.pressedId = region?.id || null;
    this.pointerPress = region || blocking
      ? { id: region?.id || null, x: point.x, y: point.y, lastY: point.y, pointerType: event.pointerType || 'mouse', dragged: false }
      : null;
    this.clickCandidateId = null;
    if (region) {
      this.focusIndex = this.focusRegions.findIndex((item) => item.id === region.id);
      this.dirty = true;
    }
    return !!region || this._isBlockingView();
  }

  handlePointerUp(event) {
    const point = this._pointerFromEvent(event);
    const region = this._regionAt(point.x, point.y);
    const press = this.pointerPress;
    const matched = !!press && !press.dragged && !!press.id && region?.id === press.id;
    const consumed = !!press || this._isBlockingView();
    this.clickCandidateId = matched ? press.id : null;
    this.pressedId = null;
    this.pointerPress = null;
    this.dirty = true;
    return consumed;
  }

  handlePointerCancel() {
    const consumed = !!this.pointerPress || this._isBlockingView();
    this.pressedId = null;
    this.pointerPress = null;
    this.clickCandidateId = null;
    this.dirty = true;
    return consumed;
  }

  handleClick(event) {
    const point = this._pointerFromEvent(event);
    const region = this._regionAt(point.x, point.y);
    const candidate = this.clickCandidateId;
    this.clickCandidateId = null;
    if (region && candidate === region.id) {
      event.preventDefault?.();
      region.activate?.();
      this.dirty = true;
      return true;
    }
    return this._isBlockingView();
  }

  handleWheel(event) {
    if (!this._isBlockingView()) return false;
    this.modalScroll = clamp(this.modalScroll + Math.sign(event.deltaY || 0) * 54, 0, this._maxModalScroll());
    this.dirty = true;
    event.preventDefault?.();
    return true;
  }

  _maxModalScroll() {
    return Math.max(0, this._modalContentHeight() - this.height * .72);
  }

  handleKey(event) {
    const target = event.target;
    if (target?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target?.tagName || '')) return false;
    const key = event.key;
    if (key === 'F3' || key === '`') {
      event.preventDefault();
      const visible = this.toggleDebug();
      this._invoke('toggleDebug', visible);
      return true;
    }
    if (key === 'Tab') {
      if (!this.focusRegions.length) return this._isBlockingView();
      event.preventDefault();
      this.focusIndex = (this.focusIndex + (event.shiftKey ? -1 : 1) + this.focusRegions.length) % this.focusRegions.length;
      this.hoveredId = this.focusRegions[this.focusIndex].id;
      this.inspectedAbility = this.focusRegions[this.focusIndex].ability || null;
      this.dirty = true;
      return true;
    }
    if ((key === 'Enter' || key === ' ') && this.focusIndex >= 0 && this.focusRegions[this.focusIndex]) {
      event.preventDefault();
      this.focusRegions[this.focusIndex].activate?.();
      this.dirty = true;
      return true;
    }
    if (key === 'Escape') {
      event.preventDefault();
      if (this._isBlockingView()) {
        this._invoke('closeModal', this.view);
      } else this._invoke('togglePause');
      return true;
    }
    if (this.view === 'intro' && (key === 'ArrowLeft' || key === 'ArrowRight')) {
      const difference = key === 'ArrowLeft' ? -1 : 1;
      const next = clamp((Number(this.state.difficulty) || 4) + difference, 1, 5);
      this.state.difficulty = next;
      this.state.difficultyName = DIFFICULTIES[next - 1].name;
      this._invoke('setDifficulty', next);
      this.dirty = true;
      return true;
    }
    if (key.toLowerCase() === 'p' && this.view === 'play') { this._invoke('togglePause'); return true; }
    if (key.toLowerCase() === 'm') { this._invoke('toggleSound'); return true; }
    if (key.toLowerCase() === 'g') { this._invoke('toggleArchive'); return true; }
    if (key === 'Home') { this._invoke('fitCamera'); return true; }
    if (key === '0') { this._invoke('resetCamera'); return true; }
    if (key.toLowerCase() === 'f') { this._invoke('toggleFollow'); return true; }
    return false;
  }

  _isBlockingView() {
    return this.view === 'intro' || this.view === 'upgrade' || this.view === 'order' || this.view === 'archive' || this.view === 'outcome';
  }

  _modalContentHeight() {
    if (this.view === 'archive') return 1050;
    if (this.view === 'upgrade') {
      const layout = this._layout();
      if (layout === 'portrait') return 720;
      if (layout === 'low') return 560;
      return this.height;
    }
    if (this.view === 'order') return 860;
    return this.height;
  }

  _addHit(id, x, y, width, height, activate, options = {}) {
    if (width <= 0 || height <= 0) return;
    if (this.hitClip) {
      const left = Math.max(x, this.hitClip.x);
      const top = Math.max(y, this.hitClip.y);
      const right = Math.min(x + width, this.hitClip.x + this.hitClip.width);
      const bottom = Math.min(y + height, this.hitClip.y + this.hitClip.height);
      if (right <= left || bottom <= top) return;
      x = left;
      y = top;
      width = right - left;
      height = bottom - top;
    }
    const region = { id, x, y, width, height, activate, cursor: options.cursor, disabled: options.disabled, ability: options.ability };
    this.hitRegions.push(region);
    if (options.focusable !== false && !options.disabled) this.focusRegions.push(region);
  }

  _isHot(id) {
    return id === this.hoveredId || this.focusRegions[this.focusIndex]?.id === id;
  }

  _layout() {
    const aspect = this.width / Math.max(1, this.height);
    if (aspect < 1.05) return 'portrait';
    if (this.height < 620) return 'low';
    if (this.width < 720) return 'portrait';
    if (this.width >= 1440 && this.height >= 720) return 'wide';
    return 'standard';
  }

  _prepareCanvas() {
    const ctx = this.ctx;
    ctx.setTransform(this.pixelScale, 0, 0, this.pixelScale, 0, 0);
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.textBaseline = 'alphabetic';
    this.hitRegions = [];
    this.focusRegions = [];
  }

  _paint() {
    this._prepareCanvas();
    if (this.view === 'intro') this._drawIntro();
    else if (this.view === 'upgrade') this._drawUpgrade();
    else if (this.view === 'order') this._drawOrder();
    else if (this.view === 'archive') this._drawArchive();
    else if (this.view === 'outcome') this._drawOutcome();
    else this._drawPlay();
    this._drawGlobalControls();
    if (this.debugVisible) this._drawDebugLedger();
    this._drawFocusMark();
    this.texture.needsUpdate = true;
    this.dirty = false;
  }

  _drawBackdrop(alpha = .86) {
    const ctx = this.ctx;
    const asset = this.assets.concept;
    ctx.save();
    ctx.fillStyle = COLORS.ink;
    ctx.fillRect(0, 0, this.width, this.height);
    if (asset?.loaded) {
      ctx.globalAlpha = alpha;
      this._drawImageCover(asset.image, 0, 0, this.width, this.height);
      ctx.globalAlpha = 1;
    }
    const gradient = ctx.createRadialGradient(this.width * .54, this.height * .48, 0, this.width * .54, this.height * .48, Math.max(this.width, this.height) * .72);
    gradient.addColorStop(0, 'rgba(7,8,10,.08)');
    gradient.addColorStop(.58, 'rgba(4,5,7,.38)');
    gradient.addColorStop(1, 'rgba(2,3,4,.94)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.restore();
  }

  _drawPlay() {
    const layout = this._layout();
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const edge = ctx.createRadialGradient(w * .5, h * .45, Math.min(w, h) * .18, w * .5, h * .45, Math.max(w, h) * .78);
    edge.addColorStop(0, 'rgba(0,0,0,0)');
    edge.addColorStop(.68, 'rgba(2,3,4,.04)');
    edge.addColorStop(1, 'rgba(2,3,4,.66)');
    ctx.fillStyle = edge;
    ctx.fillRect(0, 0, w, h);
    this._drawCornerFiligree();
    this._drawClock();
    this._drawThreat(layout);
    this._drawRoster(layout);
    this._drawSelectedLitany(layout);
    this._drawLaws(layout);
    this._drawFeed(layout);
    this._drawEncounter();
    if (this.state.paused) this._drawPausedSeal();
  }

  _drawClock() {
    const ctx = this.ctx;
    const compact = this.width < 720;
    const width = compact ? Math.min(this.width - 156, 300) : clamp(this.width * .34, 390, 590);
    const x = (this.width - width) * .5;
    const y = compact ? 12 : 18;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(5,6,8,.78)';
    raggedPath(ctx, x, y, width, compact ? 66 : 76, 11);
    ctx.fill();
    ctx.strokeStyle = 'rgba(185,149,93,.38)';
    ctx.lineWidth = 1;
    ctx.stroke();
    this._drawAtlas('ornaments', 2, x + width * .5 - (compact ? 20 : 25), y - 5, compact ? 40 : 50, compact ? 40 : 50, .42);
    ctx.fillStyle = COLORS.paperDim;
    ctx.font = `600 ${compact ? 9 : 10}px Cinzel, Georgia, serif`;
    ctx.letterSpacing = '2px';
    ctx.fillText(`BELL ${roman(this.state.bell || 1)} · ${bellName(this.state.bell || 1)}`, x + width * .5, y + 17);
    ctx.fillStyle = COLORS.bone;
    ctx.font = `600 ${compact ? 25 : 31}px Cinzel, Georgia, serif`;
    ctx.fillText(formatTime(this.state.remaining), x + width * .5, y + (compact ? 46 : 50));
    const trackY = y + (compact ? 56 : 64);
    ctx.fillStyle = 'rgba(230,224,205,.14)';
    ctx.fillRect(x + 18, trackY, width - 36, 2);
    const gradient = ctx.createLinearGradient(x + 18, trackY, x + width - 18, trackY);
    gradient.addColorStop(0, COLORS.blood);
    gradient.addColorStop(.72, COLORS.goldBright);
    gradient.addColorStop(1, COLORS.parchment);
    ctx.fillStyle = gradient;
    ctx.fillRect(x + 18, trackY - 1, (width - 36) * clamp(this.state.progress || 0, 0, 1), 3);
    const marker = x + 18 + (width - 36) * clamp(this.state.progress || 0, 0, 1);
    ctx.translate(marker, trackY + 1);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = COLORS.parchment;
    ctx.fillRect(-3, -3, 6, 6);
    ctx.restore();
  }

  _drawThreat(layout) {
    const ctx = this.ctx;
    const compact = this.width < 720;
    const x = compact ? 12 : 28;
    const y = layout === 'portrait' ? 92 : layout === 'low' && this.width < 600 ? 84 : 25;
    const notchWidth = compact ? 18 : 24;
    const gap = compact ? 5 : 6;
    ctx.save();
    ctx.fillStyle = COLORS.paperDim;
    ctx.font = `600 ${compact ? 8 : 9}px Cinzel, Georgia, serif`;
    ctx.letterSpacing = '1.7px';
    ctx.fillText('GRAVE PRESSURE', x, y);
    for (let i = 0; i < 7; i += 1) {
      const px = x + i * (notchWidth + gap);
      const active = i < (this.state.threat || 0);
      ctx.fillStyle = active ? `rgba(195,64,69,${.4 + i * .045})` : 'rgba(217,207,183,.13)';
      ctx.beginPath();
      ctx.moveTo(px, y + 10);
      ctx.lineTo(px + notchWidth - 4, y + 10);
      ctx.lineTo(px + notchWidth, y + 14);
      ctx.lineTo(px + notchWidth - 4, y + 18);
      ctx.lineTo(px, y + 18);
      ctx.closePath();
      ctx.fill();
      if (active) {
        ctx.strokeStyle = 'rgba(225,94,89,.58)';
        ctx.lineWidth = .75;
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  _drawRoster(layout) {
    const units = this.state.units || [];
    if (!units.length) return;
    if (layout === 'portrait' || layout === 'low') {
      const compactRail = this.width < 720 ? 64 : 0;
      const availableWidth = Math.max(180, this.width - 24 - compactRail);
      const gap = 6;
      const fittedSize = (availableWidth - gap * Math.max(0, units.length - 1)) / Math.max(1, units.length);
      const portraitSize = layout === 'portrait' ? clamp(fittedSize, 34, 58) : Math.min(48, fittedSize);
      const total = units.length * portraitSize + (units.length - 1) * gap;
      let x = Math.max(12, (this.width - compactRail - total) * .5);
      const y = layout === 'portrait' ? 124 : this.width < 600 ? 118 : 104;
      units.forEach((unit, index) => {
        this._drawRosterMedallion(unit, x, y, portraitSize, unit.id === this.state.selectedId, index);
        x += portraitSize + gap;
      });
      return;
    }
    const x = 24;
    const y = 106;
    const width = layout === 'wide' ? 272 : 218;
    const rowHeight = layout === 'wide' ? 78 : 66;
    const maxRows = Math.max(1, Math.floor((this.height - y - 150) / (rowHeight + 8)));
    units.slice(0, maxRows).forEach((unit, index) => {
      const rowY = y + index * (rowHeight + 8);
      const hot = this._isHot(`unit-${unit.id}`);
      const selected = unit.id === this.state.selectedId;
      const color = colorString(unit.color, COLORS.blood);
      this.ctx.save();
      raggedPath(this.ctx, x, rowY, width, rowHeight, 9);
      this.ctx.fillStyle = selected ? 'rgba(16,14,13,.91)' : hot ? 'rgba(12,13,15,.86)' : 'rgba(7,9,11,.71)';
      this.ctx.fill();
      this.ctx.strokeStyle = selected ? color : hot ? 'rgba(217,207,183,.48)' : 'rgba(185,149,93,.2)';
      this.ctx.lineWidth = selected ? 1.5 : 1;
      this.ctx.stroke();
      this._drawAtlasCircle('roster', unit.portrait || 0, x + 10, rowY + 9, rowHeight - 18, color, !unit.alive);
      const copyX = x + rowHeight + 1;
      this.ctx.fillStyle = unit.alive ? COLORS.bone : '#625e57';
      this.ctx.font = `600 ${layout === 'wide' ? 14 : 12}px Cinzel, Georgia, serif`;
      this.ctx.fillText(ellipsize(this.ctx, unit.name || 'Unnamed oath', width - rowHeight - 25), copyX, rowY + 19);
      this.ctx.fillStyle = unit.alive ? color : '#5d5752';
      this.ctx.font = `600 8px Cinzel, Georgia, serif`;
      this.ctx.letterSpacing = '1.3px';
      this.ctx.fillText((unit.alive ? unit.archetype : 'FALLEN').toUpperCase(), copyX, rowY + 33);
      this._drawVitalBar(copyX, rowY + rowHeight - 24, width - rowHeight - 18, 5, unit.hp, unit.maxHp, COLORS.hp, 'HP');
      this._drawVitalBar(copyX, rowY + rowHeight - 12, width - rowHeight - 18, 4, unit.ap, unit.maxAp, COLORS.ap, 'AP');
      this.ctx.restore();
      this._addHit(`unit-${unit.id}`, x, rowY, width, rowHeight, () => this._invoke('selectUnit', unit.id), { disabled: !unit.alive });
    });
  }

  _drawRosterMedallion(unit, x, y, size, selected, index) {
    const color = colorString(unit.color, COLORS.blood);
    const hot = this._isHot(`unit-${unit.id}`);
    this.ctx.save();
    this.ctx.translate(x + size * .5, y + size * .5);
    this.ctx.rotate(Math.PI / 4);
    this.ctx.strokeStyle = selected ? color : hot ? COLORS.parchment : 'rgba(185,149,93,.35)';
    this.ctx.lineWidth = selected ? 2 : 1;
    this.ctx.strokeRect(-size * .4, -size * .4, size * .8, size * .8);
    this.ctx.restore();
    this._drawAtlasCircle('roster', unit.portrait || index, x + 6, y + 6, size - 12, color, !unit.alive);
    this._drawAtlas('ornaments', 4, x - 5, y - 5, size + 10, size + 10, selected ? .88 : .52);
    this._drawVitalBar(x + 4, y + size - 5, size - 8, 3, unit.hp, unit.maxHp, COLORS.hp);
    this._drawVitalBar(x + 4, y + size, size - 8, 3, unit.ap, unit.maxAp, COLORS.ap);
    this._addHit(`unit-${unit.id}`, x, y, size, size + 6, () => this._invoke('selectUnit', unit.id), { disabled: !unit.alive });
  }

  _drawSelectedLitany(layout) {
    const unit = (this.state.units || []).find((item) => item.id === this.state.selectedId) || (this.state.units || []).find((item) => item.alive);
    if (!unit) return;
    const portrait = layout === 'portrait';
    const low = layout === 'low';
    const abilityCount = Math.max(1, unit.abilities?.length || 0);
    const panelWidth = portrait
      ? this.width - 24
      : low
        ? Math.min(this.width - 24, clamp(230 + abilityCount * 60, 340, 640))
        : clamp(270 + abilityCount * 78, 370, 760);
    const panelHeight = portrait ? 150 : low ? 112 : 154;
    const x = (this.width - panelWidth) * .5;
    const y = this.height - panelHeight - (portrait ? 12 : 18);
    const ctx = this.ctx;
    ctx.save();
    raggedPath(ctx, x, y, panelWidth, panelHeight, 13);
    const gradient = ctx.createLinearGradient(x, y, x, y + panelHeight);
    gradient.addColorStop(0, 'rgba(11,10,11,.88)');
    gradient.addColorStop(1, 'rgba(5,7,9,.94)');
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = 'rgba(185,149,93,.46)';
    ctx.lineWidth = 1;
    ctx.stroke();
    this._drawAtlas('ornaments', 13, x + 4, y + 3, panelWidth - 8, panelHeight - 6, .18);
    const titleX = x + 18;
    ctx.fillStyle = colorString(unit.color, COLORS.blood);
    ctx.font = `600 9px Cinzel, Georgia, serif`;
    ctx.letterSpacing = '1.7px';
    ctx.fillText(`${(unit.archetype || unit.role || 'OATHBOUND').toUpperCase()} · RANK ${roman(unit.level || 1)}`, titleX, y + 20);
    ctx.fillStyle = COLORS.bone;
    const nameSize = fitText(ctx, unit.name || 'The unnamed', panelWidth * .55, portrait ? 17 : 20, 'Cinzel, Georgia, serif', 700, 12);
    ctx.font = `700 ${nameSize}px Cinzel, Georgia, serif`;
    ctx.letterSpacing = '0px';
    ctx.fillText(ellipsize(ctx, unit.name || 'The unnamed', panelWidth * .55), titleX, y + 43);
    ctx.fillStyle = COLORS.paperDim;
    ctx.font = `italic ${portrait ? 10 : 11}px Georgia, serif`;
    ctx.fillText(ellipsize(ctx, unit.aiState || 'Reading the field', panelWidth * .48), titleX, y + 60);
    const abilityY = y + (portrait ? 71 : low ? 56 : 70);
    const available = panelWidth - 35;
    const count = abilityCount;
    const maxIcon = portrait ? 54 : low ? 48 : 58;
    const icon = Math.min(maxIcon, Math.max(42, (available - (count - 1) * 12) / Math.max(count, portrait ? Math.min(count, 4) : count)));
    const total = count * icon + (count - 1) * 12;
    let abilityX = x + Math.min(18, Math.max(12, (panelWidth - total) * .5));
    (unit.abilities || []).forEach((ability, index) => {
      const current = index === unit.abilityCursor;
      const id = `ability-${unit.id}-${index}`;
      const hot = this._isHot(id);
      this._drawAbilityGlyph(ability, index, abilityX, abilityY, icon, current, hot);
      this._addHit(id, abilityX, abilityY, icon, icon, () => {
        this.inspectedAbility = { unit, ability, index };
        this._invoke('inspectAbility', index);
      }, { ability: { unit, ability, index } });
      abilityX += icon + 12;
    });
    if ((unit.abilities || []).length > 1) {
      const buttonWidth = portrait ? 70 : 92;
      this._drawTextButton('reorder', 'REWRITE', x + panelWidth - buttonWidth - 13, y + 12, buttonWidth, 27, () => this._invoke('reorder', unit.id), { small: true });
    }
    ctx.restore();
    const inspected = this.inspectedAbility;
    if (inspected?.unit?.id === unit.id) this._drawAbilityInspector(inspected, x, y, panelWidth, panelHeight);
  }

  _drawAbilityGlyph(ability, index, x, y, size, current, hot) {
    const ctx = this.ctx;
    ctx.save();
    if (current || hot) {
      ctx.shadowColor = current ? colorString(ability.color, COLORS.blood) : COLORS.gold;
      ctx.shadowBlur = current ? 13 : 7;
    }
    raggedPath(ctx, x, y, size, size, 7);
    ctx.clip();
    ctx.fillStyle = 'rgba(9,9,10,.95)';
    ctx.fillRect(x, y, size, size);
    this._drawAtlas('abilities', ability.artIndex ?? 0, x, y, size, size, .92);
    const shade = ctx.createLinearGradient(x, y + size * .4, x, y + size);
    shade.addColorStop(0, 'rgba(0,0,0,0)');
    shade.addColorStop(1, 'rgba(0,0,0,.82)');
    ctx.fillStyle = shade;
    ctx.fillRect(x, y, size, size);
    ctx.restore();
    raggedPath(ctx, x, y, size, size, 7);
    ctx.strokeStyle = current ? colorString(ability.color, COLORS.blood) : hot ? COLORS.parchment : 'rgba(185,149,93,.42)';
    ctx.lineWidth = current ? 2 : 1;
    ctx.stroke();
    this._drawAtlas('ornaments', 14, x - 3, y - 3, size + 6, size + 6, current ? .76 : .42);
    ctx.fillStyle = COLORS.parchment;
    ctx.font = `700 ${Math.max(8, size * .14)}px Cinzel, Georgia, serif`;
    ctx.fillText(roman(index + 1), x + 6, y + 13);
    const affordable = this._selectedUnit()?.ap >= (ability.cost || 0) * (this._selectedUnit()?.mods?.cost || 1);
    ctx.fillStyle = affordable ? COLORS.bone : '#a34e51';
    ctx.font = `600 ${Math.max(8, size * .13)}px Cinzel, Georgia, serif`;
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.round((ability.cost || 0) * (this._selectedUnit()?.mods?.cost || 1))} AP`, x + size - 5, y + size - 6);
    ctx.textAlign = 'left';
  }

  _drawAbilityInspector(inspected, panelX, panelY, panelWidth, panelHeight) {
    const { unit, ability, index } = inspected;
    const ctx = this.ctx;
    const wideEnough = this.width > 980;
    const width = wideEnough ? 310 : Math.min(290, this.width - 24);
    const height = 142;
    let x = wideEnough ? panelX + panelWidth + 14 : this.pointer.x - width * .5;
    let y = wideEnough ? panelY + panelHeight - height : panelY - height - 8;
    x = clamp(x, 12, this.width - width - 12);
    y = clamp(y, 90, this.height - height - 10);
    ctx.save();
    raggedPath(ctx, x, y, width, height, 10);
    ctx.fillStyle = 'rgba(5,6,8,.97)';
    ctx.fill();
    ctx.strokeStyle = colorString(ability.color, COLORS.blood);
    ctx.lineWidth = 1.25;
    ctx.stroke();
    this._drawAtlas('abilities', ability.artIndex ?? 0, x + 10, y + 12, 84, 84, .94);
    ctx.fillStyle = colorString(ability.color, COLORS.blood);
    ctx.font = '600 8px Cinzel, Georgia, serif';
    ctx.letterSpacing = '1.3px';
    ctx.fillText(`${(ability.category || ability.kind || 'RITE').toUpperCase()} · VERSE ${roman(index + 1)}`, x + 106, y + 20);
    ctx.fillStyle = COLORS.bone;
    ctx.font = '700 17px Cinzel, Georgia, serif';
    ctx.letterSpacing = '0px';
    ctx.fillText(ellipsize(ctx, ability.name || 'Unnamed rite', width - 119), x + 106, y + 43);
    ctx.fillStyle = COLORS.paperDim;
    ctx.font = 'italic 11px Georgia, serif';
    const lines = wrapLines(ctx, ability.detail || '', width - 119, 3);
    lines.forEach((line, lineIndex) => ctx.fillText(line, x + 106, y + 61 + lineIndex * 14));
    ctx.strokeStyle = 'rgba(185,149,93,.28)';
    ctx.beginPath();
    ctx.moveTo(x + 12, y + 108);
    ctx.lineTo(x + width - 12, y + 108);
    ctx.stroke();
    ctx.fillStyle = COLORS.parchment;
    ctx.font = '600 9px Cinzel, Georgia, serif';
    const cost = Math.round((ability.cost || 0) * (unit.mods?.cost || 1));
    const reach = ability.range > 0 ? (ability.range + (unit.mods?.range || 0)).toFixed(1) : 'SELF';
    const recovery = ((ability.cooldown || 0) * (unit.mods?.cooldown || 1)).toFixed(2);
    ctx.fillText(`${cost} AP`, x + 13, y + 126);
    ctx.fillText(`${Math.round(ability.power || 0)} POWER`, x + 78, y + 126);
    ctx.fillText(`${reach} REACH`, x + 166, y + 126);
    ctx.fillText(`${recovery}s`, x + 247, y + 126);
    ctx.restore();
  }

  _drawLaws(layout) {
    const laws = this.state.graveLaws || [];
    if (!laws.length) return;
    const ctx = this.ctx;
    const portrait = layout === 'portrait';
    const narrowLow = layout === 'low' && this.width < 900;
    const x = portrait ? 12 : 25;
    const y = portrait ? this.height - 216 : narrowLow ? this.height - 190 : this.height - (layout === 'low' ? 62 : 101);
    laws.slice(0, 2).forEach((law, index) => {
      const width = portrait ? (this.width - 33) / 2 : layout === 'wide' ? 170 : 145;
      const height = portrait ? 42 : 48;
      const lawX = x + index * (width + (portrait ? 9 : 9));
      ctx.save();
      raggedPath(ctx, lawX, y, width, height, 7);
      ctx.fillStyle = 'rgba(6,8,10,.76)';
      ctx.fill();
      ctx.strokeStyle = `${colorString(law.color, COLORS.gold)}88`;
      ctx.stroke();
      ctx.fillStyle = colorString(law.color, COLORS.gold);
      ctx.font = `700 ${portrait ? 15 : 18}px Cinzel, Georgia, serif`;
      ctx.fillText(law.sigil || '◇', lawX + 9, y + (portrait ? 26 : 29));
      ctx.fillStyle = COLORS.paperDim;
      ctx.font = '600 7px Cinzel, Georgia, serif';
      ctx.letterSpacing = '1.2px';
      ctx.fillText('GRAVE LAW', lawX + (portrait ? 31 : 37), y + 16);
      ctx.fillStyle = COLORS.parchment;
      ctx.font = `600 ${portrait ? 8 : 9}px Cinzel, Georgia, serif`;
      ctx.fillText(ellipsize(ctx, law.shortName || law.name, width - (portrait ? 39 : 49)), lawX + (portrait ? 31 : 37), y + (portrait ? 29 : 32));
      ctx.restore();
    });
  }

  _drawFeed(layout) {
    if (!this.feedItems.length || layout === 'portrait' || (layout === 'low' && this.width < 900)) return;
    const ctx = this.ctx;
    const width = layout === 'wide' ? 320 : 250;
    const x = this.width - width - 24;
    let y = this.height - 132;
    this.feedItems.slice(0, layout === 'low' ? 2 : 4).forEach((item, index) => {
      ctx.save();
      ctx.textAlign = 'right';
      ctx.font = `${item.important ? '600' : 'italic'} ${item.important ? 10 : 11}px ${item.important ? 'Cinzel, Georgia, serif' : 'Georgia, serif'}`;
      ctx.fillStyle = item.important ? COLORS.goldBright : 'rgba(217,207,183,.72)';
      const lines = wrapLines(ctx, item.text, width, 2);
      lines.reverse().forEach((line, lineIndex) => ctx.fillText(line, x + width, y - lineIndex * 14));
      y -= lines.length * 14 + 8;
      if (index < 3) {
        ctx.strokeStyle = 'rgba(185,149,93,.18)';
        ctx.beginPath();
        ctx.moveTo(x + width * .42, y + 4);
        ctx.lineTo(x + width, y + 4);
        ctx.stroke();
      }
      ctx.restore();
    });
  }

  _drawEncounter() {
    const encounter = this.encounterUntil > performance.now() ? this.encounter : this.state.currentEncounter;
    if (!encounter) return;
    const ctx = this.ctx;
    const width = clamp(this.width * .38, 280, 560);
    const x = (this.width - width) * .5;
    const y = this.height * .19;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.shadowColor = COLORS.blood;
    ctx.shadowBlur = 18;
    ctx.fillStyle = COLORS.bloodBright;
    ctx.font = '700 28px Cinzel, Georgia, serif';
    ctx.fillText(encounter.sigil || '☠', x + width * .5, y);
    ctx.shadowBlur = 0;
    ctx.fillStyle = COLORS.bone;
    ctx.font = '700 15px Cinzel, Georgia, serif';
    ctx.letterSpacing = '2.2px';
    ctx.fillText((encounter.title || 'THE DEAD CONVENE').toUpperCase(), x + width * .5, y + 26);
    ctx.fillStyle = COLORS.paperDim;
    ctx.font = 'italic 12px Georgia, serif';
    ctx.letterSpacing = '0px';
    ctx.fillText(ellipsize(ctx, encounter.omen || '', width), x + width * .5, y + 47);
    ctx.restore();
  }

  _drawPausedSeal() {
    const ctx = this.ctx;
    const size = Math.min(180, this.width * .28);
    const x = this.width * .5;
    const y = this.height * .47;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = 'rgba(6,7,9,.86)';
    ctx.strokeStyle = 'rgba(185,149,93,.68)';
    ctx.lineWidth = 2;
    ctx.fillRect(-size * .34, -size * .34, size * .68, size * .68);
    ctx.strokeRect(-size * .34, -size * .34, size * .68, size * .68);
    ctx.rotate(-Math.PI / 4);
    ctx.textAlign = 'center';
    ctx.fillStyle = COLORS.parchment;
    ctx.font = '700 13px Cinzel, Georgia, serif';
    ctx.letterSpacing = '2px';
    ctx.fillText('THE BELL WAITS', 0, -3);
    ctx.fillStyle = COLORS.paperDim;
    ctx.font = 'italic 11px Georgia, serif';
    ctx.letterSpacing = '0px';
    ctx.fillText('Press P to resume the rite', 0, 17);
    ctx.restore();
  }

  _drawIntro() {
    this._drawBackdrop(.84);
    const ctx = this.ctx;
    const layout = this._layout();
    if (layout === 'low') {
      this._drawIntroLow();
      return;
    }
    const compact = layout === 'portrait' || layout === 'low';
    const left = compact ? 24 : clamp(this.width * .07, 54, 130);
    const top = compact ? 78 : this.height * .14;
    const titleWidth = compact ? this.width - 48 : Math.min(650, this.width * .48);
    ctx.save();
    ctx.fillStyle = COLORS.bloodBright;
    ctx.font = `600 ${compact ? 9 : 11}px Cinzel, Georgia, serif`;
    ctx.letterSpacing = compact ? '2.8px' : '4px';
    ctx.fillText('A SURVIVAL RITUAL IN TWENTY BELLS', left, top);
    ctx.fillStyle = COLORS.bone;
    const titleSize = fitText(ctx, 'THE TWENTIETH BELL', titleWidth, compact ? 35 : 58, 'Cinzel, Georgia, serif', 700, 24);
    ctx.font = `700 ${titleSize}px Cinzel, Georgia, serif`;
    ctx.letterSpacing = '-1px';
    ctx.fillText('THE TWENTIETH BELL', left, top + (compact ? 45 : 68));
    this._drawAtlas('ornaments', 2, left + titleWidth * .76, top - 28, compact ? 72 : 108, compact ? 72 : 108, .68);
    ctx.strokeStyle = 'rgba(185,149,93,.62)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(left, top + (compact ? 59 : 84));
    ctx.lineTo(left + titleWidth * .74, top + (compact ? 59 : 84));
    ctx.lineTo(left + titleWidth * .78, top + (compact ? 54 : 79));
    ctx.stroke();
    ctx.fillStyle = COLORS.paperDim;
    ctx.font = `italic ${compact ? 12 : 15}px Georgia, serif`;
    const copy = 'No command reaches the field. Prepare the company, then endure what rises.';
    wrapLines(ctx, copy, titleWidth * .78, 2).forEach((line, index) => ctx.fillText(line, left, top + (compact ? 80 : 110) + index * 20));
    ctx.restore();
    this._drawIntroDifficulty(left, compact ? top + 130 : top + 166, compact ? this.width - 48 : Math.min(570, this.width * .43), compact);
    this._drawIntroLaws(left, compact ? top + 275 : top + 308, compact ? this.width - 48 : Math.min(570, this.width * .43), compact);
    const startWidth = compact ? Math.min(310, this.width - 48) : 360;
    const startX = left;
    const startY = Math.min(this.height - (compact ? 70 : 92), compact ? top + 470 : top + 530);
    this._drawTextButton('start', 'BEGIN THE VIGIL', startX, startY, startWidth, compact ? 48 : 58, () => this._invoke('start'), { primary: true, glyph: '→' });
    this._drawAtlas('ornaments', 3, startX - 25, startY - 18, compact ? 62 : 76, compact ? 62 : 76, .76);
    ctx.save();
    ctx.fillStyle = 'rgba(217,207,183,.51)';
    ctx.font = 'italic 11px Georgia, serif';
    ctx.fillText('WASD to move the witness · wheel to draw near · Home reveals the whole grave', startX, startY + (compact ? 66 : 78));
    ctx.restore();
  }

  _drawIntroLow() {
    const ctx = this.ctx;
    const margin = clamp(this.width * .035, 18, 38);
    const controlRail = this.width < 980 ? 58 : 0;
    const gap = clamp(this.width * .026, 14, 28);
    const usableWidth = this.width - margin * 2 - controlRail;
    const columnWidth = Math.max(150, (usableWidth - gap) * .5);
    const left = margin;
    const right = left + columnWidth + gap;
    const top = clamp(this.height * .11, 34, 52);
    ctx.save();
    ctx.fillStyle = COLORS.bloodBright;
    ctx.font = '600 8px Cinzel, Georgia, serif';
    ctx.letterSpacing = '2.4px';
    ctx.fillText('A SURVIVAL RITUAL IN TWENTY BELLS', left, top);
    ctx.fillStyle = COLORS.bone;
    const titleSize = fitText(ctx, 'THE TWENTIETH BELL', columnWidth, 32, 'Cinzel, Georgia, serif', 700, 18);
    ctx.font = `700 ${titleSize}px Cinzel, Georgia, serif`;
    ctx.letterSpacing = '-.6px';
    ctx.fillText('THE TWENTIETH BELL', left, top + 38);
    ctx.strokeStyle = 'rgba(185,149,93,.62)';
    ctx.beginPath();
    ctx.moveTo(left, top + 50);
    ctx.lineTo(left + columnWidth * .88, top + 50);
    ctx.stroke();
    ctx.fillStyle = COLORS.paperDim;
    ctx.font = 'italic 10px Georgia, serif';
    wrapLines(ctx, 'Prepare the company. Endure what rises. The sequence is law.', columnWidth, 2)
      .forEach((line, index) => ctx.fillText(line, left, top + 68 + index * 14));
    ctx.restore();
    const difficultyY = Math.min(this.height - 150, Math.max(top + 94, this.height * .36));
    this._drawIntroDifficulty(left, difficultyY, columnWidth, true);
    this._drawIntroLaws(right, top + 18, columnWidth, true);
    const startY = this.height - 58;
    this._drawTextButton('start', 'BEGIN THE VIGIL', left, startY, Math.min(300, columnWidth), 44, () => this._invoke('start'), { primary: true, glyph: '→' });
    this._drawAtlas('ornaments', 3, left - 18, startY - 15, 56, 56, .72);
  }

  _drawIntroDifficulty(x, y, width, compact) {
    const ctx = this.ctx;
    const presets = this.state.difficultyPresets?.length ? this.state.difficultyPresets : DIFFICULTIES;
    const selected = clamp(Number(this.state.difficulty) || 4, 1, presets.length);
    const preset = presets[selected - 1];
    ctx.save();
    ctx.fillStyle = COLORS.paperDim;
    ctx.font = '600 9px Cinzel, Georgia, serif';
    ctx.letterSpacing = '2px';
    ctx.fillText('SEVERITY OF THE PROCESSION', x, y);
    const gap = compact ? 8 : 12;
    const sealSize = Math.min(compact ? 43 : 52, (width - gap * (presets.length - 1)) / presets.length);
    for (let index = 0; index < presets.length; index += 1) {
      const sealX = x + index * (sealSize + gap);
      const active = index + 1 === selected;
      const id = `difficulty-${index + 1}`;
      ctx.save();
      ctx.translate(sealX + sealSize * .5, y + 18 + sealSize * .5);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = active ? 'rgba(123,37,42,.84)' : this._isHot(id) ? 'rgba(55,42,36,.84)' : 'rgba(7,9,11,.65)';
      ctx.strokeStyle = active ? COLORS.bloodBright : 'rgba(185,149,93,.46)';
      ctx.lineWidth = active ? 2 : 1;
      ctx.fillRect(-sealSize * .36, -sealSize * .36, sealSize * .72, sealSize * .72);
      ctx.strokeRect(-sealSize * .36, -sealSize * .36, sealSize * .72, sealSize * .72);
      ctx.rotate(-Math.PI / 4);
      ctx.textAlign = 'center';
      ctx.fillStyle = active ? COLORS.bone : COLORS.paperDim;
      ctx.font = `700 ${compact ? 13 : 16}px Cinzel, Georgia, serif`;
      ctx.fillText(roman(index + 1), 0, 5);
      ctx.restore();
      this._addHit(id, sealX, y + 17, sealSize, sealSize, () => {
        this.state.difficulty = index + 1;
        this.state.difficultyName = presets[index].name;
        this._invoke('setDifficulty', index + 1);
      });
    }
    ctx.fillStyle = COLORS.bone;
    ctx.font = `700 ${compact ? 13 : 15}px Cinzel, Georgia, serif`;
    ctx.fillText(`${preset.roman} · ${preset.name.toUpperCase()}`, x, y + 18 + sealSize + 23);
    ctx.fillStyle = COLORS.paperDim;
    ctx.font = 'italic 11px Georgia, serif';
    ctx.fillText(ellipsize(ctx, preset.detail, width), x, y + 18 + sealSize + 41);
    ctx.restore();
  }

  _drawIntroLaws(x, y, width, compact) {
    const ctx = this.ctx;
    const laws = (this.state.graveLaws || []).slice(0, 2);
    if (!laws.length) return;
    ctx.save();
    ctx.fillStyle = COLORS.paperDim;
    ctx.font = '600 9px Cinzel, Georgia, serif';
    ctx.letterSpacing = '2px';
    ctx.fillText('THE NIGHT HAS ALREADY WRITTEN THESE LAWS', x, y);
    const rowHeight = compact ? 72 : 80;
    laws.forEach((law, index) => {
      const rowY = y + 14 + index * rowHeight;
      ctx.strokeStyle = `${colorString(law.color, COLORS.gold)}88`;
      ctx.beginPath();
      ctx.moveTo(x, rowY + 7);
      ctx.lineTo(x + 15, rowY);
      ctx.lineTo(x + width, rowY);
      ctx.stroke();
      ctx.fillStyle = colorString(law.color, COLORS.gold);
      ctx.font = `700 ${compact ? 23 : 27}px Cinzel, Georgia, serif`;
      ctx.fillText(law.sigil || '◇', x + 3, rowY + 35);
      ctx.fillStyle = COLORS.bone;
      ctx.font = `700 ${compact ? 11 : 13}px Cinzel, Georgia, serif`;
      ctx.fillText(ellipsize(ctx, law.name || law.shortName, width - 50), x + 44, rowY + 23);
      ctx.fillStyle = COLORS.paperDim;
      ctx.font = 'italic 10px Georgia, serif';
      wrapLines(ctx, law.text || '', width - 50, compact ? 2 : 3).forEach((line, lineIndex) => ctx.fillText(line, x + 44, rowY + 41 + lineIndex * 13));
    });
    ctx.restore();
  }

  _drawUpgrade() {
    this._drawBackdrop(.28);
    this._drawModalVeil();
    const layout = this._layout();
    const portrait = layout === 'portrait';
    const low = layout === 'low';
    const x = portrait ? 14 : clamp(this.width * .045, 30, 74);
    const topInset = low ? 50 : portrait ? 70 : 64;
    const width = this.width - x * 2;
    const availableHeight = this.height - topInset - 24;
    const height = portrait || low ? availableHeight : Math.min(availableHeight, clamp(this.height * .78, 590, 720));
    const y = portrait || low ? topInset : Math.max(topInset, (this.height - height) * .5);
    this._drawSheet(x, y, width, height, 'A PAGE TEARS ITSELF FREE', 'Choose one truth to make real.');
    const living = (this.state.units || []).filter((unit) => unit.alive);
    const selected = living.find((unit) => unit.id === this.upgradeUnitId) || living.find((unit) => unit.id === this.state.selectedId) || living[0];
    if (selected && this.upgradeUnitId == null) this.upgradeUnitId = selected.id;
    const choices = this.state.upgradeChoices || this.state.choices || [];
    if (portrait || low) {
      const virtualHeight = Math.max(height, portrait ? 720 : 560);
      const scroll = this.modalScroll;
      const clip = { x: x + 1, y: y + 57, width: width - 2, height: Math.max(1, height - 67) };
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.rect(clip.x, clip.y, clip.width, clip.height);
      this.ctx.clip();
      this.hitClip = clip;
      this._drawUpgradeBearerStrip(living, selected, x + 17, y + 74 - scroll, width - 34, portrait);
      const cardOffset = portrait ? 158 : 142;
      const cardY = y + cardOffset - scroll;
      const choiceIndex = this.choicePage % Math.max(1, choices.length);
      const choice = choices[choiceIndex];
      if (choice) this._drawUpgradeCard(choice, choiceIndex, x + 28, cardY, width - 56, virtualHeight - cardOffset - (portrait ? 32 : 22), selected, portrait);
      this.hitClip = null;
      this.ctx.restore();
      if (choices.length > 1) {
        const arrowY = y + Math.max(cardOffset + 48, height * .5 - 27);
        this._drawTextButton('choice-prev', '‹', x + 6, arrowY, 34, 54, () => { this.choicePage = (this.choicePage - 1 + choices.length) % choices.length; }, { small: true });
        this._drawTextButton('choice-next', '›', x + width - 40, arrowY, 34, 54, () => { this.choicePage = (this.choicePage + 1) % choices.length; }, { small: true });
      }
    } else {
      const bearerWidth = clamp(width * .25, 250, 350);
      this._drawUpgradeBearerLedger(living, selected, x + 18, y + 82, bearerWidth, height - 104);
      const cardsX = x + bearerWidth + 38;
      const cardsWidth = width - bearerWidth - 56;
      const gap = 15;
      const cardWidth = (cardsWidth - gap * Math.max(0, choices.length - 1)) / Math.max(1, choices.length);
      choices.slice(0, 3).forEach((choice, index) => this._drawUpgradeCard(choice, index, cardsX + index * (cardWidth + gap), y + 82, cardWidth, height - 104, selected, false));
    }
  }

  _drawUpgradeBearerStrip(units, selected, x, y, width, portrait) {
    const ctx = this.ctx;
    ctx.fillStyle = COLORS.paperDim;
    ctx.font = '600 8px Cinzel, Georgia, serif';
    ctx.letterSpacing = '1.5px';
    ctx.fillText('BEARER OF THE NEW TRUTH', x, y);
    const size = portrait ? 42 : 50;
    const gap = 9;
    units.forEach((unit, index) => {
      const unitX = x + index * (size + gap);
      this._drawAtlasCircle('roster', unit.portrait || 0, unitX, y + 12, size, colorString(unit.color), false);
      if (unit.id === selected?.id) {
        ctx.strokeStyle = colorString(unit.color);
        ctx.lineWidth = 2;
        ctx.strokeRect(unitX - 3, y + 9, size + 6, size + 6);
      }
      this._addHit(`upgrade-unit-${unit.id}`, unitX - 3, y + 9, size + 6, size + 7, () => {
        this.upgradeUnitId = unit.id;
        this._invoke('chooseUpgradeUnit', unit.id);
      });
    });
    if (selected) {
      ctx.fillStyle = COLORS.bone;
      ctx.font = `700 ${portrait ? 11 : 13}px Cinzel, Georgia, serif`;
      ctx.letterSpacing = '0px';
      ctx.textAlign = 'right';
      ctx.fillText(ellipsize(ctx, selected.name, Math.max(120, width - units.length * (size + gap))), x + width, y + 31);
      ctx.fillStyle = COLORS.paperDim;
      ctx.font = 'italic 10px Georgia, serif';
      ctx.fillText(`${selected.archetype} · ${selected.abilities?.length || 0} rites`, x + width, y + 48);
      ctx.textAlign = 'left';
    }
  }

  _drawUpgradeBearerLedger(units, selected, x, y, width, height) {
    const ctx = this.ctx;
    ctx.fillStyle = COLORS.paperDim;
    ctx.font = '600 8px Cinzel, Georgia, serif';
    ctx.letterSpacing = '1.6px';
    ctx.fillText('SELECT THE BEARER', x, y);
    let rowY = y + 14;
    units.forEach((unit) => {
      const id = `upgrade-unit-${unit.id}`;
      const active = unit.id === selected?.id;
      ctx.save();
      raggedPath(ctx, x, rowY, width, 55, 7);
      ctx.fillStyle = active ? 'rgba(71,39,31,.78)' : this._isHot(id) ? 'rgba(32,29,27,.76)' : 'rgba(6,8,10,.62)';
      ctx.fill();
      ctx.strokeStyle = active ? colorString(unit.color) : 'rgba(185,149,93,.22)';
      ctx.stroke();
      this._drawAtlasCircle('roster', unit.portrait || 0, x + 7, rowY + 6, 43, colorString(unit.color), false);
      ctx.fillStyle = COLORS.bone;
      ctx.font = '700 11px Cinzel, Georgia, serif';
      ctx.fillText(ellipsize(ctx, unit.name, width - 72), x + 59, rowY + 22);
      ctx.fillStyle = COLORS.paperDim;
      ctx.font = '600 8px Cinzel, Georgia, serif';
      ctx.fillText(`${unit.archetype} · ${unit.abilities?.length || 0} ${(unit.abilities?.length || 0) === 1 ? 'RITE' : 'RITES'}`.toUpperCase(), x + 59, rowY + 39);
      ctx.restore();
      this._addHit(id, x, rowY, width, 55, () => {
        this.upgradeUnitId = unit.id;
        this._invoke('chooseUpgradeUnit', unit.id);
      });
      rowY += 63;
    });
    if (selected && rowY + 45 < y + height) {
      ctx.strokeStyle = 'rgba(185,149,93,.28)';
      ctx.beginPath();
      ctx.moveTo(x, rowY + 4);
      ctx.lineTo(x + width, rowY + 4);
      ctx.stroke();
      ctx.fillStyle = colorString(selected.originColor, COLORS.gold);
      ctx.font = '600 9px Cinzel, Georgia, serif';
      ctx.fillText(`${selected.originSigil || '◇'} ${selected.origin || 'Unwritten bloodline'}`, x, rowY + 24);
      ctx.fillStyle = COLORS.paperDim;
      ctx.font = 'italic 10px Georgia, serif';
      ctx.fillText(`${Math.ceil(selected.hp || 0)}/${Math.ceil(selected.maxHp || 0)} health · ${Math.floor(selected.ap || 0)}/${Math.floor(selected.maxAp || 0)} AP`, x, rowY + 42);
    }
  }

  _drawUpgradeCard(upgrade, index, x, y, width, height, selected, portrait) {
    const ctx = this.ctx;
    const id = `upgrade-${index}`;
    const hot = this._isHot(id);
    const rarity = clamp(upgrade.rarity || upgrade.tier || 1, 1, 4);
    ctx.save();
    raggedPath(ctx, x, y, width, height, 11);
    const gradient = ctx.createLinearGradient(x, y, x, y + height);
    gradient.addColorStop(0, hot ? 'rgba(39,24,22,.97)' : 'rgba(17,14,14,.96)');
    gradient.addColorStop(1, 'rgba(5,7,9,.98)');
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = hot ? COLORS.goldBright : rarity >= 3 ? 'rgba(188,66,72,.74)' : 'rgba(185,149,93,.43)';
    ctx.lineWidth = hot ? 2 : 1;
    ctx.stroke();
    const artMargin = portrait ? 22 : 10;
    const artHeight = portrait ? Math.min(245, height * .45) : Math.min(height * .43, width * .93);
    const artX = x + artMargin;
    const artY = y + 32;
    const artWidth = width - artMargin * 2;
    const asset = (upgrade.artIndex ?? 0) < 25 ? 'upgradesA' : 'upgradesB';
    const artIndex = asset === 'upgradesA' ? (upgrade.artIndex ?? index) : (upgrade.artIndex ?? index) - 25;
    ctx.save();
    raggedPath(ctx, artX, artY, artWidth, artHeight, 8);
    ctx.clip();
    ctx.fillStyle = '#09090a';
    ctx.fillRect(artX, artY, artWidth, artHeight);
    this._drawAtlas(asset, artIndex, artX, artY, artWidth, artHeight, .94);
    const shade = ctx.createLinearGradient(artX, artY + artHeight * .5, artX, artY + artHeight);
    shade.addColorStop(0, 'rgba(5,5,6,0)');
    shade.addColorStop(1, 'rgba(5,5,6,.84)');
    ctx.fillStyle = shade;
    ctx.fillRect(artX, artY, artWidth, artHeight);
    ctx.restore();
    ctx.fillStyle = COLORS.paperDim;
    ctx.font = `600 ${width < 220 ? 7 : 8}px Cinzel, Georgia, serif`;
    ctx.letterSpacing = '1.2px';
    ctx.fillText(`${(upgrade.family || 'RITE').toUpperCase()} · ${(upgrade.inflectionLabel || 'INK').toUpperCase()}`, x + 12, y + 18);
    ctx.textAlign = 'right';
    ctx.fillStyle = rarity >= 3 ? COLORS.bloodBright : COLORS.gold;
    ctx.fillText(`${'◆'.repeat(rarity)}${'◇'.repeat(4 - rarity)}`, x + width - 12, y + 18);
    ctx.textAlign = 'left';
    const titleY = artY + artHeight + 25;
    ctx.fillStyle = COLORS.bone;
    const title = upgrade.name || upgrade.shortName || 'Unnamed rite';
    const titleSize = fitText(ctx, title, width - 24, portrait ? 20 : 15, 'Cinzel, Georgia, serif', 700, 10);
    ctx.font = `700 ${titleSize}px Cinzel, Georgia, serif`;
    ctx.fillText(ellipsize(ctx, title, width - 24), x + 12, titleY);
    ctx.fillStyle = COLORS.paperDim;
    ctx.font = `italic ${portrait ? 12 : 10}px Georgia, serif`;
    const lines = wrapLines(ctx, upgrade.description || upgrade.detail || '', width - 24, portrait ? 5 : 4);
    lines.forEach((line, lineIndex) => ctx.fillText(line, x + 12, titleY + 22 + lineIndex * (portrait ? 17 : 14)));
    ctx.strokeStyle = 'rgba(185,149,93,.28)';
    ctx.beginPath();
    ctx.moveTo(x + 12, y + height - 42);
    ctx.lineTo(x + width - 12, y + height - 42);
    ctx.stroke();
    ctx.fillStyle = hot ? COLORS.goldBright : COLORS.parchment;
    ctx.font = `600 ${portrait ? 11 : 9}px Cinzel, Georgia, serif`;
    ctx.fillText(`BIND TO ${ellipsize(ctx, selected?.name || 'THE OATHBOUND', width - 70).toUpperCase()}`, x + 12, y + height - 18);
    ctx.textAlign = 'right';
    ctx.fillText('→', x + width - 14, y + height - 18);
    ctx.restore();
    this._addHit(id, x, y, width, height, () => this._invoke('chooseUpgrade', index, this.upgradeUnitId ?? selected?.id));
  }

  _drawOrder() {
    this._drawBackdrop(.22);
    this._drawModalVeil();
    const unit = (this.state.units || []).find((item) => item.id === (this.state.orderUnitId ?? this.state.selectedId)) || this._selectedUnit();
    const portrait = this._layout() === 'portrait';
    const x = portrait ? 14 : clamp(this.width * .13, 60, 210);
    const topInset = portrait ? 70 : 65;
    const width = this.width - x * 2;
    const availableHeight = this.height - topInset - 28;
    const height = portrait ? availableHeight : Math.min(availableHeight, clamp(this.height * .78, 590, 720));
    const y = portrait ? topInset : Math.max(topInset, (this.height - height) * .5);
    this._drawSheet(x, y, width, height, 'THE LITANY REMAINS YOURS', unit ? `Rewrite ${unit.name}’s order.` : 'No living litany answers.');
    if (!unit) return;
    const ctx = this.ctx;
    ctx.fillStyle = COLORS.paperDim;
    ctx.font = 'italic 11px Georgia, serif';
    ctx.fillText('Position changes cadence and the way this oathbound reads the field.', x + 20, y + 70);
    const rowX = x + 20;
    const rowWidth = width - 40;
    const rowHeight = portrait ? 74 : 82;
    let rowY = y + 92 - this.modalScroll;
    const contentClip = { x: rowX, y: y + 74, width: rowWidth, height: Math.max(1, height - 136) };
    ctx.save();
    ctx.beginPath();
    ctx.rect(contentClip.x, contentClip.y, contentClip.width, contentClip.height);
    ctx.clip();
    this.hitClip = contentClip;
    (unit.abilities || []).forEach((ability, index) => {
      if (rowY > y + 74 && rowY < y + height - 62) {
        ctx.save();
        raggedPath(ctx, rowX, rowY, rowWidth, rowHeight, 9);
        ctx.fillStyle = index === unit.abilityCursor ? 'rgba(58,34,29,.9)' : 'rgba(7,9,11,.82)';
        ctx.fill();
        ctx.strokeStyle = index === unit.abilityCursor ? colorString(ability.color, COLORS.blood) : 'rgba(185,149,93,.27)';
        ctx.stroke();
        const artSize = rowHeight - 16;
        this._drawAtlas('abilities', ability.artIndex ?? 0, rowX + 42, rowY + 8, artSize, artSize, .94);
        ctx.fillStyle = COLORS.gold;
        ctx.font = '700 16px Cinzel, Georgia, serif';
        ctx.fillText(roman(index + 1), rowX + 12, rowY + rowHeight * .57);
        ctx.fillStyle = COLORS.bone;
        ctx.font = `700 ${portrait ? 12 : 15}px Cinzel, Georgia, serif`;
        ctx.fillText(ellipsize(ctx, ability.name, rowWidth - (portrait ? 185 : 235)), rowX + artSize + 54, rowY + 28);
        ctx.fillStyle = COLORS.paperDim;
        ctx.font = `${portrait ? 8 : 9}px Cinzel, Georgia, serif`;
        const details = `${(ability.category || ability.kind || 'rite').toUpperCase()} · ${Math.round((ability.cost || 0) * (unit.mods?.cost || 1))} AP`;
        ctx.fillText(details, rowX + artSize + 54, rowY + 47);
        if (!portrait) {
          ctx.font = 'italic 10px Georgia, serif';
          ctx.fillText(ellipsize(ctx, ability.detail || '', rowWidth - 280), rowX + artSize + 54, rowY + 65);
        }
        ctx.restore();
        const controlX = rowX + rowWidth - (portrait ? 74 : 92);
        this._drawTextButton(`move-up-${index}`, '↑', controlX, rowY + 11, portrait ? 31 : 38, rowHeight - 22, () => this._invoke('moveAbility', index, index - 1), { small: true, disabled: index === 0 });
        this._drawTextButton(`move-down-${index}`, '↓', controlX + (portrait ? 38 : 46), rowY + 11, portrait ? 31 : 38, rowHeight - 22, () => this._invoke('moveAbility', index, index + 1), { small: true, disabled: index === unit.abilities.length - 1 });
      }
      rowY += rowHeight + 10;
    });
    this.hitClip = null;
    ctx.restore();
    this._drawTextButton('close-order', 'SEAL THE LITANY', x + width - (portrait ? 190 : 240) - 20, y + height - 52, portrait ? 190 : 240, 38, () => this._invoke('closeModal', 'order'), { primary: true, glyph: '→' });
  }

  _drawArchive() {
    this._drawBackdrop(.31);
    this._drawModalVeil();
    const portrait = this._layout() === 'portrait';
    const x = portrait ? 10 : clamp(this.width * .055, 34, 92);
    const topInset = portrait ? 64 : 54;
    const width = this.width - x * 2;
    const availableHeight = this.height - topInset - 18;
    const height = portrait ? availableHeight : Math.min(availableHeight, clamp(this.height * .76, 560, 700));
    const y = portrait ? topInset : Math.max(topInset, (this.height - height) * .5);
    this._drawSheet(x, y, width, height, 'THE GRAVE ARCHIVE', 'What the dead have permitted you to remember.');
    const tabY = y + 66;
    const tabWidth = (width - 36) / ARCHIVE_TABS.length;
    ARCHIVE_TABS.forEach((tab, index) => {
      const tabX = x + 18 + index * tabWidth;
      const id = `archive-tab-${index}`;
      const active = index === this.archiveTab;
      const ctx = this.ctx;
      ctx.fillStyle = active ? COLORS.bloodBright : this._isHot(id) ? COLORS.parchment : COLORS.paperDim;
      ctx.font = `600 ${portrait ? 7 : 9}px Cinzel, Georgia, serif`;
      ctx.letterSpacing = portrait ? '.7px' : '1.2px';
      ctx.textAlign = 'center';
      ctx.fillText(portrait ? tab.slice(0, 7).toUpperCase() : tab.toUpperCase(), tabX + tabWidth * .5, tabY + 16);
      ctx.fillStyle = active ? COLORS.blood : 'rgba(185,149,93,.18)';
      ctx.fillRect(tabX + 5, tabY + 25, tabWidth - 10, active ? 2 : 1);
      ctx.textAlign = 'left';
      this._addHit(id, tabX, tabY, Math.max(1, tabWidth - 1), 34, () => {
        this.archiveTab = index;
        this.modalScroll = 0;
        this._invoke('setArchiveTab', ['graveborn', 'origins', 'rites', 'memory'][index]);
      });
    });
    const contentX = x + 22;
    const contentY = tabY + 49;
    const contentWidth = width - 44;
    const contentHeight = height - 132;
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(contentX, contentY, contentWidth, contentHeight);
    this.ctx.clip();
    if (this.archiveTab === 0) this._drawArchiveProcession(contentX, contentY - this.modalScroll, contentWidth, portrait);
    else if (this.archiveTab === 1) this._drawArchiveOrigins(contentX, contentY - this.modalScroll, contentWidth, portrait);
    else if (this.archiveTab === 2) this._drawArchiveRites(contentX, contentY - this.modalScroll, contentWidth, portrait);
    else this._drawArchiveMemory(contentX, contentY - this.modalScroll, contentWidth, portrait);
    this.ctx.restore();
    this._drawTextButton('archive-close', 'RETURN TO THE RITE', x + width - (portrait ? 170 : 220) - 18, y + height - 44, portrait ? 170 : 220, 32, () => this._invoke('toggleArchive'), { small: true, glyph: '×' });
  }

  _drawArchiveProcession(x, y, width, portrait) {
    const ctx = this.ctx;
    const chronicle = this.state.chronicle || {};
    const discovered = chronicle.discoveredEnemies || [];
    const affixes = chronicle.discoveredAffixes || [];
    ctx.fillStyle = COLORS.bone;
    ctx.font = `700 ${portrait ? 16 : 22}px Cinzel, Georgia, serif`;
    ctx.fillText('The Corrupted Dead', x, y + 24);
    ctx.fillStyle = COLORS.paperDim;
    ctx.font = 'italic 11px Georgia, serif';
    ctx.fillText(`${discovered.length}/${this.state.enemyArchetypes || 12} forms named · ${affixes.length}/${this.state.enemyAffixes || 10} corruptions witnessed`, x, y + 45);
    const columns = portrait ? 2 : Math.min(6, Math.max(3, Math.floor(width / 180)));
    const gap = 12;
    const cardWidth = (width - gap * (columns - 1)) / columns;
    const cardHeight = portrait ? 150 : 180;
    const total = Math.max(this.state.enemyArchetypes || 12, 12);
    for (let index = 0; index < total; index += 1) {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const cardX = x + column * (cardWidth + gap);
      const cardY = y + 64 + row * (cardHeight + gap);
      const known = index < discovered.length;
      ctx.save();
      raggedPath(ctx, cardX, cardY, cardWidth, cardHeight, 8);
      ctx.fillStyle = 'rgba(7,8,10,.86)';
      ctx.fill();
      ctx.strokeStyle = known ? 'rgba(185,149,93,.35)' : 'rgba(92,87,79,.2)';
      ctx.stroke();
      if (known) this._drawAtlas('bestiary', index, cardX + 8, cardY + 8, cardWidth - 16, cardHeight - 49, .9);
      else {
        ctx.fillStyle = '#302e2c';
        ctx.font = '700 34px Cinzel, Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillText('?', cardX + cardWidth * .5, cardY + cardHeight * .52);
        ctx.textAlign = 'left';
      }
      ctx.fillStyle = known ? COLORS.parchment : '#655f57';
      ctx.font = `600 ${portrait ? 8 : 9}px Cinzel, Georgia, serif`;
      ctx.fillText(known ? String(discovered[index] || `GRAVEBORN ${roman(index + 1)}`).replaceAll('-', ' ').toUpperCase() : 'UNNAMED FORM', cardX + 9, cardY + cardHeight - 16);
      ctx.restore();
    }
  }

  _drawArchiveOrigins(x, y, width, portrait) {
    const ctx = this.ctx;
    const discovered = this.state.chronicle?.discoveredOrigins || [];
    const origins = this.state.origins || [];
    ctx.fillStyle = COLORS.bone;
    ctx.font = `700 ${portrait ? 16 : 22}px Cinzel, Georgia, serif`;
    ctx.fillText('Bloodlines of the Oathbound', x, y + 24);
    ctx.fillStyle = COLORS.paperDim;
    ctx.font = 'italic 11px Georgia, serif';
    ctx.fillText(`${discovered.length}/${this.state.originCount || 12} provenances traced across all companies`, x, y + 45);
    const columns = portrait ? 1 : 3;
    const gap = 12;
    const cardWidth = (width - gap * (columns - 1)) / columns;
    const cardHeight = 106;
    const total = Math.max(this.state.originCount || 12, 12);
    for (let index = 0; index < total; index += 1) {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const cardX = x + column * (cardWidth + gap);
      const cardY = y + 64 + row * (cardHeight + gap);
      const origin = origins[index];
      const id = origin?.id || discovered[index];
      const known = !!id && (origins.length ? discovered.includes(id) : index < discovered.length);
      ctx.save();
      raggedPath(ctx, cardX, cardY, cardWidth, cardHeight, 8);
      ctx.fillStyle = 'rgba(7,8,10,.83)';
      ctx.fill();
      ctx.strokeStyle = known ? 'rgba(185,149,93,.33)' : 'rgba(92,87,79,.18)';
      ctx.stroke();
      if (known) this._drawAtlas('origins', index, cardX + 7, cardY + 7, 86, 92, .9);
      ctx.fillStyle = known ? colorString(origin?.color, COLORS.gold) : '#5d5851';
      ctx.font = '700 20px Cinzel, Georgia, serif';
      ctx.fillText(known ? (origin?.sigil || '◇') : '?', cardX + 103, cardY + 27);
      ctx.fillStyle = known ? COLORS.parchment : '#666058';
      ctx.font = `700 ${portrait ? 10 : 11}px Cinzel, Georgia, serif`;
      ctx.fillText(ellipsize(ctx, known ? (origin?.name || String(id).replaceAll('-', ' ')) : 'An untraced bloodline', cardWidth - 116), cardX + 103, cardY + 47);
      ctx.fillStyle = COLORS.paperDim;
      ctx.font = 'italic 10px Georgia, serif';
      wrapLines(ctx, known ? (origin?.detail || 'Its complete account remains among the living.') : 'No oathbound of this provenance has joined the company.', cardWidth - 116, 3).forEach((line, lineIndex) => ctx.fillText(line, cardX + 103, cardY + 66 + lineIndex * 13));
      ctx.restore();
    }
  }

  _drawArchiveRites(x, y, width, portrait) {
    const ctx = this.ctx;
    const discovered = this.state.chronicle?.discoveredRites || [];
    const total = this.state.codexSize || 48;
    const percent = clamp(discovered.length / Math.max(1, total), 0, 1);
    ctx.fillStyle = COLORS.bone;
    ctx.font = `700 ${portrait ? 16 : 22}px Cinzel, Georgia, serif`;
    ctx.fillText('The Blood Book', x, y + 24);
    ctx.fillStyle = COLORS.paperDim;
    ctx.font = 'italic 11px Georgia, serif';
    ctx.fillText(`${discovered.length}/${total} truths made real`, x, y + 45);
    ctx.fillStyle = 'rgba(217,207,183,.13)';
    ctx.fillRect(x, y + 58, width, 4);
    ctx.fillStyle = COLORS.blood;
    ctx.fillRect(x, y + 57, width * percent, 6);
    const columns = portrait ? 4 : Math.min(10, Math.max(6, Math.floor(width / 100)));
    const gap = 8;
    const cell = (width - gap * (columns - 1)) / columns;
    const shown = Math.min(total, 50);
    for (let index = 0; index < shown; index += 1) {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const cellX = x + column * (cell + gap);
      const cellY = y + 82 + row * (cell + gap);
      const known = index < discovered.length;
      ctx.save();
      raggedPath(ctx, cellX, cellY, cell, cell, 5);
      ctx.clip();
      ctx.fillStyle = '#08090a';
      ctx.fillRect(cellX, cellY, cell, cell);
      if (known) {
        const asset = index < 25 ? 'upgradesA' : 'upgradesB';
        this._drawAtlas(asset, index < 25 ? index : index - 25, cellX, cellY, cell, cell, .88);
      } else {
        ctx.fillStyle = '#201f1e';
        ctx.fillRect(cellX, cellY, cell, cell);
      }
      ctx.restore();
      ctx.strokeStyle = known ? 'rgba(185,149,93,.38)' : 'rgba(92,87,79,.18)';
      raggedPath(ctx, cellX, cellY, cell, cell, 5);
      ctx.stroke();
    }
  }

  _drawArchiveMemory(x, y, width, portrait) {
    const ctx = this.ctx;
    const chronicle = this.state.chronicle || {};
    const runs = chronicle.runs || chronicle.totalRuns || 0;
    const wins = chronicle.wins || chronicle.victories || 0;
    const bestBell = chronicle.bestBell || 0;
    const pairs = Object.values(chronicle.lawPairRecords || {});
    ctx.fillStyle = COLORS.bone;
    ctx.font = `700 ${portrait ? 16 : 22}px Cinzel, Georgia, serif`;
    ctx.fillText('Memory Outlives the Company', x, y + 24);
    ctx.fillStyle = COLORS.paperDim;
    ctx.font = 'italic 11px Georgia, serif';
    ctx.fillText('The ledger is not merciful enough to forget.', x, y + 45);
    const stats = [
      ['RITES ATTEMPTED', runs], ['DAWNS WITNESSED', wins], ['DEEPEST BELL', roman(bestBell)], ['LAW PAIRINGS', pairs.length]
    ];
    const columns = portrait ? 2 : 4;
    const gap = 12;
    const cardWidth = (width - gap * (columns - 1)) / columns;
    stats.forEach(([label, value], index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const cardX = x + column * (cardWidth + gap);
      const cardY = y + 68 + row * 94;
      ctx.strokeStyle = 'rgba(185,149,93,.3)';
      ctx.beginPath();
      ctx.moveTo(cardX, cardY);
      ctx.lineTo(cardX + cardWidth - 12, cardY);
      ctx.lineTo(cardX + cardWidth, cardY + 12);
      ctx.stroke();
      ctx.fillStyle = COLORS.goldBright;
      ctx.font = `700 ${portrait ? 24 : 32}px Cinzel, Georgia, serif`;
      ctx.fillText(String(value), cardX, cardY + 43);
      ctx.fillStyle = COLORS.paperDim;
      ctx.font = '600 8px Cinzel, Georgia, serif';
      ctx.letterSpacing = '1.2px';
      ctx.fillText(label, cardX, cardY + 63);
    });
    const ledgerY = y + (portrait ? 282 : 195);
    ctx.fillStyle = COLORS.parchment;
    ctx.font = '700 12px Cinzel, Georgia, serif';
    ctx.fillText('PAIRINGS ENDURED', x, ledgerY);
    pairs.slice(0, portrait ? 8 : 12).forEach((record, index) => {
      const rowY = ledgerY + 24 + index * 30;
      ctx.fillStyle = index % 2 ? 'rgba(217,207,183,.035)' : 'rgba(185,149,93,.055)';
      ctx.fillRect(x, rowY - 16, width, 25);
      ctx.fillStyle = COLORS.paperDim;
      ctx.font = '600 9px Cinzel, Georgia, serif';
      ctx.fillText(`PAIRING ${roman(index + 1)}`, x + 8, rowY);
      ctx.textAlign = 'right';
      ctx.fillText(`${record.runs || 0} rites · ${record.wins || 0} dawns · bell ${roman(record.bestBell || 0)}`, x + width - 8, rowY);
      ctx.textAlign = 'left';
    });
  }

  _drawOutcome() {
    this._drawBackdrop(.62);
    this._drawModalVeil();
    const result = this.state.outcome || this.state.result || this.state;
    const victory = !!result.victory;
    const ctx = this.ctx;
    const short = this.height < 520;
    const width = Math.min(this.width - 30, 670);
    const height = short ? this.height - 24 : Math.min(this.height - 40, 580);
    const x = (this.width - width) * .5;
    const y = (this.height - height) * .5;
    ctx.save();
    raggedPath(ctx, x, y, width, height, 18);
    ctx.fillStyle = 'rgba(6,7,9,.91)';
    ctx.fill();
    ctx.strokeStyle = victory ? 'rgba(224,189,117,.67)' : 'rgba(184,64,69,.73)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.shadowColor = victory ? COLORS.goldBright : COLORS.blood;
    ctx.shadowBlur = 25;
    ctx.fillStyle = victory ? COLORS.goldBright : COLORS.bloodBright;
    ctx.font = `700 ${short ? Math.min(44, width * .1) : Math.min(76, width * .12)}px Cinzel, Georgia, serif`;
    ctx.fillText(victory ? '✦' : '☠', x + width * .5, y + (short ? 52 : 101));
    ctx.shadowBlur = 0;
    ctx.fillStyle = victory ? COLORS.goldBright : COLORS.bloodBright;
    ctx.font = `600 ${short ? 8 : 10}px Cinzel, Georgia, serif`;
    ctx.letterSpacing = short ? '1.7px' : '2.5px';
    ctx.fillText(victory ? 'THE TWENTIETH BELL SOUNDS' : 'THE RITUAL IS BROKEN', x + width * .5, y + (short ? 75 : 137));
    ctx.fillStyle = COLORS.bone;
    const heading = victory ? 'Dawn remembers you.' : 'The circle is empty.';
    ctx.font = `700 ${short ? Math.min(24, width * .052) : Math.min(34, width * .06)}px Cinzel, Georgia, serif`;
    ctx.letterSpacing = '0px';
    ctx.fillText(heading, x + width * .5, y + (short ? 105 : 180));
    ctx.fillStyle = COLORS.paperDim;
    ctx.font = `italic ${short ? 10 : 13}px Georgia, serif`;
    const copy = victory ? 'For one night, the grave has learned restraint. It will forget by tomorrow.' : 'Every oathbound has fallen. The dead have nowhere else to be.';
    wrapLines(ctx, copy, width - 90, short ? 2 : 3).forEach((line, index) => ctx.fillText(line, x + width * .5, y + (short ? 128 : 210) + index * (short ? 14 : 19)));
    const stats = [['REMAINS', result.kills || 0], ['RITES BOUND', result.upgrades || result.upgradeCount || 0], ['SURVIVORS', result.units || 0]];
    const statWidth = (width - 80) / 3;
    stats.forEach(([label, value], index) => {
      const statX = x + 40 + index * statWidth;
      ctx.strokeStyle = 'rgba(185,149,93,.25)';
      ctx.beginPath();
      ctx.moveTo(statX + 10, y + (short ? 162 : 283));
      ctx.lineTo(statX + statWidth - 10, y + (short ? 162 : 283));
      ctx.stroke();
      ctx.fillStyle = COLORS.bone;
      ctx.font = `700 ${short ? 21 : 28}px Cinzel, Georgia, serif`;
      ctx.fillText(String(value), statX + statWidth * .5, y + (short ? 193 : 326));
      ctx.fillStyle = COLORS.paperDim;
      ctx.font = '600 8px Cinzel, Georgia, serif';
      ctx.letterSpacing = '1.4px';
      ctx.fillText(label, statX + statWidth * .5, y + (short ? 210 : 348));
    });
    ctx.restore();
    const buttonWidth = Math.min(330, width - 70);
    this._drawTextButton('restart', 'BEGIN ANOTHER COMPANY', x + (width - buttonWidth) * .5, y + height - (short ? 51 : 83), buttonWidth, short ? 38 : 52, () => this._invoke('restart'), { primary: true, glyph: '↻' });
  }

  _drawGlobalControls() {
    const ctx = this.ctx;
    const compact = this.width < 720;
    const vertical = this.width < 980;
    const button = compact ? 44 : 42;
    const gap = compact ? 6 : 8;
    let controlY = compact ? 13 : 22;
    const names = [];
    if (this.view === 'play') names.push(['pause', this.state.paused ? '▶' : 'Ⅱ', 8, () => this._invoke('togglePause'), 'Pause']);
    names.push(['sound', this.state.soundEnabled === false ? '×' : '♪', 9, () => this._invoke('toggleSound'), 'Sound']);
    names.push(['archive', 'G', 10, () => this._invoke('toggleArchive'), 'Archive']);
    if (this.view === 'play') names.push(['fit', '⌖', 11, () => this._invoke('fitCamera'), 'Reveal arena']);
    names.push(['debug', '†', 7, () => {
      const visible = this.toggleDebug();
      this._invoke('toggleDebug', visible);
    }, 'Debug ledger']);
    let x = this.width - 14 - button;
    names.reverse().forEach(([id, glyph, ornament, action, label]) => {
      const hot = this._isHot(`control-${id}`);
      ctx.save();
      ctx.translate(x + button * .5, controlY + button * .5);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = hot || (id === 'debug' && this.debugVisible) ? 'rgba(76,36,34,.89)' : 'rgba(5,7,9,.75)';
      ctx.strokeStyle = hot ? COLORS.goldBright : 'rgba(185,149,93,.39)';
      ctx.fillRect(-button * .34, -button * .34, button * .68, button * .68);
      ctx.strokeRect(-button * .34, -button * .34, button * .68, button * .68);
      ctx.rotate(-Math.PI / 4);
      ctx.textAlign = 'center';
      ctx.fillStyle = hot ? COLORS.bone : COLORS.parchment;
      ctx.font = `700 ${compact ? 11 : 13}px Cinzel, Georgia, serif`;
      if (!this.assets.ornaments?.loaded) ctx.fillText(glyph, 0, 5);
      ctx.restore();
      this._drawAtlas('ornaments', ornament, x + 3, controlY + 3, button - 6, button - 6, id === 'sound' && this.state.soundEnabled === false ? .35 : .88);
      this._addHit(`control-${id}`, x, controlY, button, button, action);
      if (hot && !compact && !vertical) {
        ctx.save();
        ctx.fillStyle = COLORS.paperDim;
        ctx.font = '600 7px Cinzel, Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillText(label.toUpperCase(), x + button * .5, controlY + button + 11);
        ctx.restore();
      }
      if (vertical) controlY += button + gap;
      else x -= button + gap;
    });
  }

  _drawDebugLedger() {
    const ctx = this.ctx;
    const portrait = this._layout() === 'portrait';
    const short = this.height < 620;
    const compactLedger = portrait || short;
    const width = compactLedger ? Math.min(this.width - 20, 310) : 326;
    const x = compactLedger ? 10 : this.width - width - 16;
    const y = short ? 83 : portrait ? 124 : 83;
    const selected = this._selectedUnit();
    const camera = this.state.camera || this.state.debug?.camera || {};
    const lines = [
      ['FRAME', `${this._fps()} FPS · ${this.width}×${this.height} @${this.pixelScale.toFixed(2)}`],
      ['CAMERA', `${Number(camera.x || 0).toFixed(2)}, ${Number(camera.y || 0).toFixed(2)} · ${Number(camera.zoom || 1).toFixed(2)}×`],
      ['VISIBLE', camera.visibleRect ? `${this._formatRect(camera.visibleRect)}` : 'awaiting survey'],
      ['PRESSURE', `${Math.round((this.state.pressureProgress || this.state.progress || 0) * 100)}% · notch ${this.state.threat || 0}/7`],
      ['GRAVEBORN', `${this.state.enemyCount || 0} living · ${this.state.eliteCount || 0} elite · ${this.state.supportCount || 0} support`],
      ['INTENTS', `${this.state.meleeIntents || 0} close · ${this.state.rangedIntents || 0} ranged`],
      ['FIELD', `${this.state.zoneCount || 0} zones · ${this.state.treasureCount || 0} reliquaries`],
      ['POINTER', `${this.pointer.x.toFixed(0)}, ${this.pointer.y.toFixed(0)} screen`]
    ];
    if (selected) {
      lines.push(['SELECTED', `${selected.name} · ${selected.aiState || 'reading'}`]);
      lines.push(['VITALS', `${Math.ceil(selected.hp || 0)}/${Math.ceil(selected.maxHp || 0)} HP · ${Math.floor(selected.ap || 0)}/${Math.floor(selected.maxAp || 0)} AP · ${Math.ceil(selected.shield || 0)} ward`]);
      lines.push(['CADENCE', `${roman((selected.abilityCursor || 0) + 1)}/${roman(selected.abilities?.length || 0)} · ${selected.casts || 0} casts · ${selected.kills || 0} kills`]);
    }
    const rowStep = short ? 18 : 28;
    const lineStart = short ? 39 : 54;
    const height = (short ? 46 : 58) + lines.length * rowStep;
    ctx.save();
    raggedPath(ctx, x, y, width, height, 11);
    ctx.fillStyle = 'rgba(4,7,7,.94)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(116,142,126,.68)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#9eb89f';
    ctx.font = '600 9px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.letterSpacing = '1.5px';
    ctx.fillText('FIELD LEDGER · F3 / ` TO FOLD', x + 14, y + 21);
    ctx.strokeStyle = 'rgba(116,142,126,.28)';
    ctx.beginPath();
    ctx.moveTo(x + 13, y + (short ? 29 : 32));
    ctx.lineTo(x + width - 13, y + (short ? 29 : 32));
    ctx.stroke();
    lines.forEach(([label, value], index) => {
      const lineY = y + lineStart + index * rowStep;
      ctx.fillStyle = '#647e69';
      ctx.font = '600 7px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.letterSpacing = '1px';
      ctx.fillText(label, x + 14, lineY);
      ctx.fillStyle = '#c4d1c1';
      ctx.font = `500 ${short ? 8 : 9}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      ctx.letterSpacing = '0px';
      ctx.fillText(ellipsize(ctx, value, width - 98), x + 85, lineY);
    });
    ctx.fillStyle = '#718779';
    ctx.font = `500 ${short ? 7 : 8}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    ctx.fillText('HOME fit · 0 reset · F follow · WASD pan · wheel zoom', x + 14, y + height - 13);
    ctx.restore();
  }

  _formatRect(rect) {
    if (Array.isArray(rect)) return rect.map((value) => Number(value).toFixed(1)).join(', ');
    return `${Number(rect.left ?? rect.xMin ?? 0).toFixed(1)},${Number(rect.bottom ?? rect.yMin ?? 0).toFixed(1)} → ${Number(rect.right ?? rect.xMax ?? 0).toFixed(1)},${Number(rect.top ?? rect.yMax ?? 0).toFixed(1)}`;
  }

  _fps() {
    if (this.debugFrames.length < 2) return 0;
    const span = this.debugFrames[this.debugFrames.length - 1] - this.debugFrames[0];
    return span > 0 ? Math.round((this.debugFrames.length - 1) * 1000 / span) : 0;
  }

  _drawCornerFiligree() {
    const ctx = this.ctx;
    const margin = 18;
    const reach = Math.min(115, this.width * .1);
    ctx.save();
    ctx.strokeStyle = 'rgba(185,149,93,.29)';
    ctx.lineWidth = 1;
    const corners = [[margin, margin, 1, 1], [this.width - margin, margin, -1, 1], [margin, this.height - margin, 1, -1], [this.width - margin, this.height - margin, -1, -1]];
    corners.forEach(([x, y, sx, sy]) => {
      ctx.beginPath();
      ctx.moveTo(x, y + sy * reach);
      ctx.lineTo(x, y);
      ctx.lineTo(x + sx * reach, y);
      ctx.moveTo(x + sx * 8, y + sy * reach * .55);
      ctx.lineTo(x + sx * 8, y + sy * 8);
      ctx.lineTo(x + sx * reach * .55, y + sy * 8);
      ctx.stroke();
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(sx, sy);
      this._drawAtlas('ornaments', 0, 0, 0, reach, reach, .48);
      ctx.restore();
    });
    ctx.restore();
  }

  _drawModalVeil() {
    const ctx = this.ctx;
    const gradient = ctx.createRadialGradient(this.width * .5, this.height * .48, 0, this.width * .5, this.height * .48, Math.max(this.width, this.height) * .7);
    gradient.addColorStop(0, 'rgba(4,5,7,.33)');
    gradient.addColorStop(1, 'rgba(2,3,4,.82)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  _drawSheet(x, y, width, height, chapter, heading) {
    const ctx = this.ctx;
    ctx.save();
    raggedPath(ctx, x, y, width, height, 15);
    const fill = ctx.createLinearGradient(x, y, x + width, y + height);
    fill.addColorStop(0, 'rgba(15,13,13,.96)');
    fill.addColorStop(.55, 'rgba(7,8,10,.97)');
    fill.addColorStop(1, 'rgba(12,10,10,.97)');
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = 'rgba(185,149,93,.48)';
    ctx.lineWidth = 1.25;
    ctx.stroke();
    this._drawAtlas('ornaments', 12, x + 8, y + 2, width - 16, 58, .32);
    ctx.strokeStyle = 'rgba(184,64,69,.35)';
    ctx.beginPath();
    ctx.moveTo(x + 19, y + 54);
    ctx.lineTo(x + width * .43, y + 54);
    ctx.lineTo(x + width * .45, y + 50);
    ctx.stroke();
    ctx.fillStyle = COLORS.bloodBright;
    ctx.font = '600 8px Cinzel, Georgia, serif';
    ctx.letterSpacing = '2px';
    ctx.fillText(chapter, x + 19, y + 20);
    ctx.fillStyle = COLORS.bone;
    const size = fitText(ctx, heading, width - 110, 24, 'Cinzel, Georgia, serif', 700, 13);
    ctx.font = `700 ${size}px Cinzel, Georgia, serif`;
    ctx.letterSpacing = '0px';
    ctx.fillText(heading, x + 19, y + 44);
    ctx.restore();
  }

  _drawTextButton(id, label, x, y, width, height, activate, options = {}) {
    const ctx = this.ctx;
    const hot = this._isHot(id);
    const disabled = !!options.disabled;
    ctx.save();
    raggedPath(ctx, x, y, width, height, Math.min(9, height * .22));
    if (options.primary) {
      const gradient = ctx.createLinearGradient(x, y, x + width, y);
      gradient.addColorStop(0, hot ? 'rgba(160,50,54,.96)' : 'rgba(117,35,39,.91)');
      gradient.addColorStop(1, hot ? 'rgba(103,39,35,.96)' : 'rgba(62,30,29,.94)');
      ctx.fillStyle = gradient;
    } else ctx.fillStyle = hot ? 'rgba(63,42,34,.92)' : 'rgba(8,10,12,.78)';
    if (disabled) ctx.fillStyle = 'rgba(17,17,18,.55)';
    ctx.fill();
    ctx.strokeStyle = disabled ? 'rgba(92,87,79,.2)' : hot ? COLORS.goldBright : options.primary ? 'rgba(204,97,77,.58)' : 'rgba(185,149,93,.4)';
    ctx.lineWidth = hot ? 1.5 : 1;
    ctx.stroke();
    ctx.fillStyle = disabled ? '#5a5650' : COLORS.bone;
    ctx.font = `700 ${options.small ? Math.min(12, height * .28) : Math.min(15, height * .27)}px Cinzel, Georgia, serif`;
    ctx.letterSpacing = options.small ? '1px' : '1.8px';
    ctx.textAlign = options.glyph ? 'left' : 'center';
    ctx.fillText(label, options.glyph ? x + 17 : x + width * .5, y + height * .62);
    if (options.glyph) {
      ctx.textAlign = 'right';
      ctx.fillStyle = options.primary ? COLORS.goldBright : COLORS.parchment;
      ctx.fillText(options.glyph, x + width - 16, y + height * .62);
    }
    ctx.restore();
    this._addHit(id, x, y, width, height, activate, { disabled });
  }

  _drawVitalBar(x, y, width, height, value, maximum, color, label) {
    const ctx = this.ctx;
    const fraction = clamp((Number(value) || 0) / Math.max(.0001, Number(maximum) || 1), 0, 1);
    if (label) {
      ctx.save();
      ctx.fillStyle = COLORS.paperDim;
      ctx.font = '600 6px Cinzel, Georgia, serif';
      ctx.fillText(label, x, y + height);
      x += 15;
      width -= 15;
      ctx.restore();
    }
    ctx.fillStyle = 'rgba(217,207,183,.12)';
    ctx.fillRect(x, y, width, height);
    ctx.fillStyle = color;
    ctx.fillRect(x, y, width * fraction, height);
    ctx.fillStyle = 'rgba(255,255,255,.2)';
    ctx.fillRect(x, y, width * fraction, 1);
  }

  _drawAtlas(name, index, x, y, width, height, alpha = 1) {
    const asset = this.assets[name];
    if (!asset?.loaded) return false;
    const safeIndex = Math.max(0, Number(index) || 0);
    const column = safeIndex % asset.columns;
    const row = Math.floor(safeIndex / asset.columns) % asset.rows;
    const cellWidth = asset.image.naturalWidth / asset.columns;
    const cellHeight = asset.image.naturalHeight / asset.rows;
    this.ctx.save();
    this.ctx.globalAlpha *= alpha;
    this._drawImageCellCover(asset.image, column * cellWidth, row * cellHeight, cellWidth, cellHeight, x, y, width, height);
    this.ctx.restore();
    return true;
  }

  _drawAtlasCircle(name, index, x, y, size, stroke, muted) {
    const ctx = this.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x + size * .5, y + size * .5, size * .5, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#090a0b';
    ctx.fillRect(x, y, size, size);
    this._drawAtlas(name, index, x, y, size, size, muted ? .22 : .95);
    if (muted) {
      ctx.fillStyle = 'rgba(3,4,5,.57)';
      ctx.fillRect(x, y, size, size);
    }
    ctx.restore();
    ctx.strokeStyle = muted ? '#58534c' : stroke;
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.arc(x + size * .5, y + size * .5, size * .5 - .75, 0, Math.PI * 2);
    ctx.stroke();
  }

  _drawImageCover(image, x, y, width, height) {
    this._drawImageCellCover(image, 0, 0, image.naturalWidth, image.naturalHeight, x, y, width, height);
  }

  _drawImageCellCover(image, sx, sy, sw, sh, dx, dy, dw, dh) {
    const sourceAspect = sw / sh;
    const destinationAspect = dw / dh;
    let cropX = sx;
    let cropY = sy;
    let cropWidth = sw;
    let cropHeight = sh;
    if (sourceAspect > destinationAspect) {
      cropWidth = sh * destinationAspect;
      cropX += (sw - cropWidth) * .5;
    } else {
      cropHeight = sw / destinationAspect;
      cropY += (sh - cropHeight) * .5;
    }
    this.ctx.drawImage(image, cropX, cropY, cropWidth, cropHeight, dx, dy, dw, dh);
  }

  _selectedUnit() {
    const units = this.state.units || [];
    return units.find((unit) => unit.id === this.state.selectedId) || units.find((unit) => unit.alive) || units[0];
  }

  _drawFocusMark() {
    const region = this.focusRegions[this.focusIndex];
    if (!region) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = 'rgba(238,228,203,.84)';
    ctx.setLineDash([3, 4]);
    ctx.lineWidth = 1;
    ctx.strokeRect(region.x - 3, region.y - 3, region.width + 6, region.height + 6);
    ctx.restore();
  }

  render(renderer = this.renderer, time = performance.now()) {
    if (this.destroyed || !renderer) return;
    const now = Number(time) || performance.now();
    this.debugFrames.push(now);
    while (this.debugFrames.length > 90 || (this.debugFrames.length > 2 && this.debugFrames[0] < now - 1200)) this.debugFrames.shift();
    if (this.encounter && this.encounterUntil <= now) {
      this.encounter = null;
      this.dirty = true;
    }
    if (this.debugVisible && now - this.lastDebugPaint > 250) {
      this.lastDebugPaint = now;
      this.dirty = true;
    }
    if (this.dirty) this._paint();
    renderer.clearDepth();
    renderer.render(this.scene, this.camera);
    this.lastRenderAt = now;
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    if (this.renderer?.domElement) this.renderer.domElement.style.cursor = '';
    this.texture.dispose();
    this.material.dispose();
    this.plane.geometry.dispose();
    this.scene.remove(this.plane);
    for (const asset of Object.values(this.assets)) {
      asset.image.onload = null;
      asset.image.src = '';
    }
    this.hitRegions = [];
    this.focusRegions = [];
    this.feedItems = [];
  }
}
